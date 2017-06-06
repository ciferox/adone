const { js: { compiler: { transformation } } } = adone;

import File from "./file";

import normalizeAst from "../helpers/normalize_ast";

export default class Pipeline {
    lint(code, opts = {}) {
        opts.code = false;
        opts.mode = "lint";
        return this.transform(code, opts);
    }

    pretransform(code, opts) {
        const file = new File(opts, this);
        return file.wrap(code, () => {
            file.addCode(code);
            file.parseCode(code);
            return file;
        });
    }

    transform(code, opts) {
        const file = new File(opts, this);
        return file.wrap(code, () => {
            file.addCode(code);
            file.parseCode(code);
            return file.transform();
        });
    }

    analyse(code, opts = {}, visitor) {
        opts.code = false;
        if (visitor) {
            opts.plugins = opts.plugins || [];
            opts.plugins.push(new transformation.Plugin({ visitor }));
        }
        return this.transform(code, opts).metadata;
    }

    transformFromAst(ast, code, opts) {
        ast = normalizeAst(ast);

        const file = new File(opts, this);
        return file.wrap(code, () => {
            file.addCode(code);
            file.addAst(ast);
            return file.transform();
        });
    }
}
