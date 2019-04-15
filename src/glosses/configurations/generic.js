const {
    error,
    is,
    std,
    fs,
    module: { Module }
} = adone;

const CWD_PATH = Symbol();
const SERIALIZER = Symbol();
const PATHS = Symbol();

export default class Generic extends adone.configuration.Base {
    constructor({ cwd = process.cwd() } = {}) {
        super();
        this[CWD_PATH] = std.path.resolve(cwd);
        this[SERIALIZER] = adone.lazify({
            ".js": () => ({
                encode: null,
                decode: (buf, { path, key, transpile = false } = {}) => {
                    const content = buf.toString();

                    const m = new Module(path, {
                        transforms: transpile ? [adone.module.transform.compiler()] : []
                    });

                    m._compile(content, path);
                    let confObj = m.exports;
                    if (confObj.__esModule) {
                        confObj = confObj.default;
                    }

                    let hasFunctions = false;

                    const bindFunctions = (nestedConfig) => {
                        const keys = Object.getOwnPropertyNames(nestedConfig);
                        for (let i = 0; i < keys.length; i++) {
                            const k = keys[i];
                            const value = nestedConfig[k];
                            if (is.function(value)) {
                                hasFunctions = true;
                                nestedConfig[k] = (...args) => value.apply(this.getObject(this[PATHS][confObj]), args);
                            } else if (is.object(value)) {
                                bindFunctions(value);
                            }
                        }
                    };

                    bindFunctions(confObj);

                    if (hasFunctions) {
                        if (is.undefined(this[PATHS])) {
                            this[PATHS] = {};
                        }
                        this[PATHS][confObj] = key;
                    }

                    return confObj;
                }
            }),
            ".json": () => ({
                encode: adone.data.json.encode,
                decode: adone.data.json.decode
            }),
            ".bson": () => ({
                encode: adone.data.bson.encode,
                decode: adone.data.bson.decode
            }),
            ".json5": () => ({
                encode: adone.data.json5.encode,
                decode: adone.data.json5.decode
            }),
            ".mpak": () => ({
                encode: adone.data.mpak.encode,
                decode: adone.data.mpak.decode
            })
        }, {});
    }

    getCwd() {
        return this[CWD_PATH];
    }

    setCwd(cwd) {
        this[CWD_PATH] = cwd;
    }

    registerFormat(ext, decode, encode) {
        this[SERIALIZER][ext] = {
            decode,
            encode
        };
    }

    supportedExts() {
        return Object.keys(this[SERIALIZER]);
    }

    async load(confPath, name, options) {
        const conf = this._checkPath(confPath, true);
        if (conf.st.isDirectory()) {
            conf.path = adone.util.globize(conf.path, { ext: Object.keys(this[SERIALIZER]) });
            await fs.glob(conf.path).map(async (p) => this.load(p, name, options));
        } else if (conf.st.isFile()) {
            let confObj = {};

            const correctName = name === true ? std.path.basename(conf.path, conf.ext) : is.string(name) ? name : "";

            try {
                const content = await fs.readFile(conf.path);
                confObj = conf.serializer.decode(content, Object.assign({
                    path: conf.path,
                    key: correctName
                }, options));
            } catch (err) {
                console.error(err);
                if (err instanceof SyntaxError) {
                    throw new error.NotValidException("Config is not valid");
                }
            }

            if (!is.object(confObj)) {
                throw new error.NotValidException(`'${conf.path}' is not valid ${conf.ext}-configuration file`);
            }

            if (correctName !== "") {
                this.set(correctName, confObj);
            } else {
                this.clear();
                this.assign(confObj);
            }
        } else {
            throw new error.NotExistsException(`${conf.path} not exists`);
        }
    }

    loadSync(confPath, name, options) {
        const conf = this._checkPath(confPath, true);
        if (conf.st.isDirectory()) {
            throw new adone.error.NotSupportedException("Load directory is not supported in sync mode");
        } else if (conf.st.isFile()) {
            let confObj = {};

            const correctName = name === true ? std.path.basename(conf.path, conf.ext) : is.string(name) ? name : "";

            try {
                const content = fs.readFileSync(conf.path);
                confObj = conf.serializer.decode(content, Object.assign({
                    path: conf.path,
                    key: correctName
                }, options));
            } catch (err) {
                if (err instanceof SyntaxError) {
                    throw new error.NotValidException("Config is not valid");
                }
            }

            if (!is.object(confObj)) {
                throw new error.NotValidException(`'${conf.path}' is not valid ${conf.ext}-configuration file`);
            }

            if (correctName !== "") {
                this.set(correctName, confObj);
            } else {
                this.clear();
                this.assign(confObj);
            }
        } else {
            throw new error.NotExistsException(`${conf.path} not exists`);
        }
    }

    async save(confPath, name, options) {
        const conf = this._checkPath(confPath, false);

        let obj;
        if (is.nil(name)) {
            obj = Object.assign({}, this.raw);
        } else if (name === true) {
            obj = this.get(std.path.basename(conf.path, conf.ext));
        } else if (is.string(name) || is.array(name)) {
            obj = this.get(name);
        }
        await fs.mkdirp(std.path.dirname(conf.path));
        await fs.writeFile(conf.path, await conf.serializer.encode(obj, options));
    }

    _checkPath(confPath, checkExists) {
        let path;
        if (std.path.isAbsolute(confPath)) {
            path = confPath;
        } else {
            path = std.path.resolve(this[CWD_PATH], confPath);
        }

        let ext = null;
        let serializer = null;
        ext = std.path.extname(path);

        if (ext.length > 0) {
            if (!is.propertyOwned(this[SERIALIZER], ext)) {
                throw new error.NotSupportedException(`Unsupported format: ${ext}`);
            }
            serializer = this[SERIALIZER][ext];
            if (!checkExists && !is.function(serializer.encode)) {
                throw new error.NotSupportedException(`Format '${ext}' is not saveable`);
            }
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
