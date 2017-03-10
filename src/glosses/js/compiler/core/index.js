// @flow



const { fs } = adone.std;

import File from "./transformation/file";
import options from "./transformation/file/options/config";
import buildExternalHelpers from "./tools/build-external-helpers";
export { File, options, buildExternalHelpers };

import * as util from "./util";
export { util };

const { messages, types, traverse, template } = adone.js.compiler;
export { messages, types, traverse, template };

import OptionManager from "./transformation/file/options/option-manager";
export { OptionManager };

export class Plugin {
    constructor(alias) {
        throw new Error(`The (${alias}) Babel 5 plugin is being run with Babel 6.`);
    }
}

import Pipeline from "./transformation/pipeline";
export { Pipeline };

const pipeline = new Pipeline();
export const analyse = pipeline.analyse.bind(pipeline);
export const transform = pipeline.transform.bind(pipeline);
export const transformFromAst = pipeline.transformFromAst.bind(pipeline);

export const transformFile = (filename: string, opts?: Object, callback: Function) => {
    if (adone.is.function(opts)) {
        callback = opts;
        opts = {};
    }

    opts.filename = filename;

    fs.readFile(filename, (err, code) => {
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
};

export const transformFileSync = (filename: string, opts?: Object = {}): string => {
    opts.filename = filename;
    return transform(fs.readFileSync(filename, "utf8"), opts);
};
