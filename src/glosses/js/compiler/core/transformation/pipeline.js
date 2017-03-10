/* global BabelFileResult, BabelFileMetadata */
// @flow
import adone from "adone";
import File from "./file";

import normalizeAst from "../helpers/normalize-ast";

export default class Pipeline {
    lint(code: string, opts?: Object = {}): BabelFileResult {
        opts.code = false;
        opts.mode = "lint";
        return this.transform(code, opts);
    }

    pretransform(code: string, opts?: Object): BabelFileResult {
        const file = new File(opts, this);
        return file.wrap(code, () => {
            file.addCode(code);
            file.parseCode(code);
            return file;
        });
    }

    transform(code: string, opts?: Object): BabelFileResult {
        const file = new File(opts, this);
        return file.wrap(code, () => {
            file.addCode(code);
            file.parseCode(code);
            return file.transform();
        });
    }

    analyse(code: string, opts: Object = {}, visitor?: Object): ?BabelFileMetadata {
        opts.code = false;
        if (visitor) {
            opts.plugins = opts.plugins || [];
            opts.plugins.push(new adone.js.compiler.transformation.Plugin({ visitor }));
        }
        return this.transform(code, opts).metadata;
    }

    transformFromAst(ast: Object, code: string, opts: Object): BabelFileResult {
        ast = normalizeAst(ast);

        const file = new File(opts, this);
        return file.wrap(code, () => {
            file.addCode(code);
            file.addAst(ast);
            return file.transform();
        });
    }
}
