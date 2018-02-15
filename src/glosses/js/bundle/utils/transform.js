import { decode } from "sourcemap-codec";
import { locate } from "locate-character";
import error from "./error";
import getCodeFrame from "./getCodeFrame";
import { defaultAcornOptions } from "../module";

const {
    is
} = adone;

export default async function transform(graph, source, id, plugins) {
    const sourcemapChain = [];
    const originalSourcemap = is.string(source.map) ? JSON.parse(source.map) : source.map;
    if (originalSourcemap && is.string(originalSourcemap.mappings)) {
        originalSourcemap.mappings = decode(originalSourcemap.mappings);
    }
    const originalCode = source.code;
    let ast = source.ast;
    let promise = Promise.resolve(source.code);
    plugins.forEach((plugin) => {
        if (!plugin.transform) {
            return;
        }
        promise = promise.then((previous) => {
            const augment = function (object, pos, code) {
                const outObject = is.string(object) ? { message: object } : object;
                if (outObject.code) {
                    outObject.pluginCode = outObject.code;
                }
                outObject.code = code;
                if (!is.undefined(pos)) {
                    if (!is.undefined(pos.line) && !is.undefined(pos.column)) {
                        const { line, column } = pos;
                        outObject.loc = { file: id, line, column };
                        outObject.frame = getCodeFrame(previous, line, column);
                    } else {
                        outObject.pos = pos;
                        const { line, column } = locate(previous, pos, { offsetLine: 1 });
                        outObject.loc = { file: id, line, column };
                        outObject.frame = getCodeFrame(previous, line, column);
                    }
                }
                outObject.plugin = plugin.name;
                outObject.id = id;
                return outObject;
            };
            let throwing;
            const context = {
                parse(code, options = {}) {
                    return graph.acornParse(code, Object.assign({}, defaultAcornOptions, options, graph.acornOptions));
                },
                warn(warning, pos) {
                    warning = augment(warning, pos, "PLUGIN_WARNING");
                    graph.warn(warning);
                },
                error(err, pos) {
                    err = augment(err, pos, "PLUGIN_ERROR");
                    throwing = true;
                    error(err);
                }
            };
            let transformed;
            try {
                transformed = plugin.transform.call(context, previous, id);
            } catch (err) {
                if (!throwing) {
                    context.error(err);
                }
                error(err);
            }
            return Promise.resolve(transformed)
                .then((result) => {
                    if (is.nil(result)) {
                        return previous;
                    }
                    if (is.string(result)) {
                        result = {
                            code: result,
                            ast: undefined,
                            map: undefined
                        };
                    } else if (is.string(result.map)) {
                        // `result.map` can only be a string if `result` isn't
                        result.map = JSON.parse(result.map);
                    }
                    if (result.map && is.string(result.map.mappings)) {
                        result.map.mappings = decode(result.map.mappings);
                    }
                    // strict null check allows 'null' maps to not be pushed to the chain, while 'undefined' gets the missing map warning
                    if (!is.null(result.map)) {
                        sourcemapChain.push(result.map || { missing: true, plugin: plugin.name });
                    }
                    ast = result.ast;
                    return result.code;
                })
                .catch((err) => {
                    err = augment(err, undefined, "PLUGIN_ERROR");
                    error(err);
                });
        });
    });

    const code = await promise;
    return {
        code,
        originalCode,
        originalSourcemap,
        ast,
        sourcemapChain
    };
}
