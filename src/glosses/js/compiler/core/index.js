// @flow

import adone from "adone";

const { fs } = adone.std;

export { default as File } from "./transformation/file";
export { default as options } from "./transformation/file/options/config";
export { default as buildExternalHelpers } from "./tools/build-external-helpers";

import * as util from "./util";
export { util };

const { messages, types, traverse, template } = adone.js.compiler;
export { messages };
export { types };
export { traverse };
export { template };

import OptionManager from "./transformation/file/options/option-manager";
export { OptionManager };

export function Plugin(alias) {
    throw new Error(`The (${alias}) Babel 5 plugin is being run with Babel 6.`);
}

import Pipeline from "./transformation/pipeline";
export { Pipeline };

const pipeline = new Pipeline;
export const analyse = pipeline.analyse.bind(pipeline);
export const transform = pipeline.transform.bind(pipeline);
export const transformFromAst = pipeline.transformFromAst.bind(pipeline);

export function transformFile(filename: string, opts?: Object, callback: Function) {
    if (adone.is.function(opts)) {
        callback = opts;
        opts = {};
    }

    opts.filename = filename;

    fs.readFile(filename, function (err, code) {
        let result;

        if (!err) {
            try {
                result = transform(code, opts);
            } catch (_err) {
                err = _err;
            }
        }

        if (err) {
            callback(err);
        } else {
            callback(null, result);
        }
    });
}

export function transformFileSync(filename: string, opts?: Object = {}): string {
    opts.filename = filename;
    return transform(fs.readFileSync(filename, "utf8"), opts);
}
