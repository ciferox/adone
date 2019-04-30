const {
    error,
    is,
    fs,
    path: aPath
} = adone;

const compileModule = (path, content, transpile) => {
    const m = new adone.module.Module(path, {
        transforms: transpile ? [adone.module.transform.compiler()] : []
    });
    m._compile(content.toString(), path);
    const conf = m.exports;
    return (conf.__esModule)
        ? conf.default
        : conf;
};

export default class GenericConfig extends adone.configuration.BaseConfig {
    #serializer;

    constructor({ cwd = process.cwd() } = {}) {
        super();
        this.cwd = aPath.resolve(cwd);
        this.#serializer = adone.lazify({
            ".js": () => ({
                encode: null,
                decode: (buf, { path, transpile = false } = {}) => compileModule(path, buf, transpile),
                ext: ".js"
            }),
            ".mjs": () => ({
                encode: null,
                decode: (buf, { path } = {}) => compileModule(path, buf, true),
                ext: ".mjs"
            }),
            ".json": () => ({
                encode: adone.data.json.encode,
                decode: adone.data.json.decode,
                ext: ".json"
            }),
            ".bson": () => ({
                encode: adone.data.bson.encode,
                decode: adone.data.bson.decode,
                ext: ".bson"
            }),
            ".json5": () => ({
                encode: adone.data.json5.encode,
                decode: adone.data.json5.decode,
                ext: ".json5"
            }),
            ".mpak": () => ({
                encode: adone.data.mpak.encode,
                decode: adone.data.mpak.decode,
                ext: ".mpak"
            }),
            ".yaml": () => ({
                encode: adone.data.yaml.encode,
                decode: adone.data.yaml.decode,
                ext: ".yaml"
            })
        }, {});
    }

    registerExtension(ext, decode, encode) {
        if (!is.function(encode)) {
            throw new error.InvalidArgumentException(`Invalid encode function for '${ext}'`);
        }

        if (!is.function(decode)) {
            throw new error.InvalidArgumentException(`Invalid decode function for '${ext}'`);
        }
        this.#serializer[ext] = {
            decode,
            encode
        };
    }

    getSupportedExtensions() {
        return Object.keys(this.#serializer);
    }

    async load(confPath, options) {
        const info = this._checkPath(confPath, true);
        this.raw = info.serializer.decode(await fs.readFile(info.path), {
            ...options,
            path: info.path
        });
    }

    loadSync(confPath, options) {
        const info = this._checkPath(confPath, true);
        this.raw = info.serializer.decode(fs.readFileSync(info.path), {
            ...options,
            path: info.path
        });
    }

    async save(confPath, { ext, ...options } = {}) {
        const info = this._checkPath(confPath, false, ext);
        if (!is.function(info.serializer.encode)) {
            throw new error.NotSupportedException(`Unsupported operation for '${info.serializer.ext}'`);
        }
        await fs.mkdirp(aPath.dirname(info.path));
        await fs.writeFile(info.path, await info.serializer.encode(this.raw, options));
    }

    _checkPath(confPath, checkExists, ext) {
        let path = (aPath.isAbsolute(confPath))
            ? confPath
            : aPath.resolve(this.cwd, confPath);

        let origExt = aPath.extname(path);
        let serializer = null;

        if (checkExists && origExt.length === 0) {
            path = adone.module.resolve(path, {
                basedir: aPath.dirname(path),
                extensions: Object.keys(this.#serializer)
            });
            origExt = aPath.extname(path);
        }

        if (ext && ext !== origExt) {
            const basename = aPath.basename(path, origExt);
            path = `${aPath.join(aPath.dirname(path), basename)}${ext}`;
        } else {
            ext = origExt;
        }

        serializer = this.#serializer[ext];
        if (!serializer) {
            throw new error.NotSupportedException(`Unsupported format: ${ext}`);
        }

        let st;
        if (checkExists) {
            st = fs.statSync(path);
        }

        return {
            path,
            ext,
            serializer,
            st
        };
    }
}
