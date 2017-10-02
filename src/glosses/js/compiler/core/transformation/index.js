/* global BabelFileResult */
import File from "./file";
import loadConfig from "../config";

const {
    is,
    std: { fs },
    js: { compiler: { types: t } }
} = adone;

export const transform = (code: string, opts?: Object): BabelFileResult => {
    const config = loadConfig(opts);
    if (is.null(config)) {
        return null;
    }

    const file = new File(config);
    return file.wrap(code, () => {
        file.addCode(code);
        file.parseCode(code);
        return file.transform();
    });
};

export const transformFromAst = (ast: Object, code: string, opts: Object): BabelFileResult => {
    const config = loadConfig(opts);
    if (is.null(config)) {
        return null;
    }

    if (ast && ast.type === "Program") {
        ast = t.file(ast, [], []);
    } else if (!ast || ast.type !== "File") {
        throw new Error("Not a valid ast?");
    }

    const file = new File(config);
    return file.wrap(code, () => {
        file.addCode(code);
        file.addAst(ast);
        return file.transform();
    });
};

export const transformFile = (filename: string, opts?: Object, callback: Function) => {
    if (is.function(opts)) {
        callback = opts;
        opts = {};
    }

    opts.filename = filename;
    const config = loadConfig(opts);
    if (is.null(config)) {
        return callback(null, null);
    }

    fs.readFile(filename, (err, code) => {
        let result;

        if (!err) {
            try {
                const file = new File(config);
                result = file.wrap(code, () => {
                    file.addCode(code);
                    file.parseCode(code);
                    return file.transform();
                });
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
    const config = loadConfig(opts);
    if (is.null(config)) {
        return null;
    }

    const code = fs.readFileSync(filename, "utf8");
    const file = new File(config);

    return file.wrap(code, () => {
        file.addCode(code);
        file.parseCode(code);
        return file.transform();
    });
};
