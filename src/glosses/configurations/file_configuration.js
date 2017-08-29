const {
    x,
    is,
    std,
    fs,
    js
} = adone;

const BASE_PATH = Symbol();
const SERIALIZER = Symbol();
const PATHS = Symbol();

export default class FileConfiguration extends adone.configuration.Configuration {
    constructor({ base = process.cwd() } = {}) {
        super();
        this[BASE_PATH] = base;
        this[SERIALIZER] = adone.lazify({
            ".js": () => ({
                encode: null,
                decode: (buf, { path, key, transpile = false } = {}) => {
                    const content = buf.toString();
                    const transform = transpile ? js.Module.transforms.transpile(adone.require.options) : null;
        
                    const m = new js.Module(path, {
                        transform
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
        const conf = await this._checkPath(confPath, true);
        if (conf.st.isDirectory()) {
            conf.path = adone.util.globize(conf.path, { exts: `{${Object.keys(this[SERIALIZER]).join(",")}}` });
            await fs.glob(conf.path).map((p) => {
                return this.load(p, name, options);
            });
        } else if (conf.st.isFile()) {
            let confObj = {};

            const correctName = (name === true ? std.path.basename(conf.path, conf.ext) : (is.string(name) ? name : ""));

            try {
                const content = await fs.readFile(conf.path);
                confObj = await conf.serializer.decode(content, Object.assign({
                    path: conf.path,
                    key: correctName
                }, options));
            } catch (err) {
                if (err instanceof SyntaxError) {
                    throw new x.NotValid("Config is not valid");
                }
            }

            if (!is.object(confObj)) {
                throw new x.NotValid(`'${conf.path}' is not valid ${conf.ext}-configuration file`);
            }

            if (correctName !== "") {
                this.merge(correctName, confObj);
            } else {
                this.merge(confObj);
            }
        } else {
            throw new x.NotExists(`${conf.path} not exists`);
        }
    }

    async save(confPath, name, options) {
        const conf = await this._checkPath(confPath, false);

        let obj;
        if (is.nil(name)) {
            obj = Object.assign({}, this);
        } else {
            obj = this.get(name);
        }
        await fs.writeFile(conf.path, await conf.serializer.encode(obj, options));
    }

    async _checkPath(confPath, checkExists) {
        let path;
        if (!std.path.isAbsolute(confPath)) {
            path = std.path.resolve(this[BASE_PATH], confPath);
        } else {
            path = confPath;
        }

        let ext = null;
        let serializer = null;
        ext = std.path.extname(path);
        if (ext !== "") {
            if (!is.propertyOwned(this[SERIALIZER], ext)) {
                throw new x.NotSupported(`Unsupported format: ${ext}`);
            }
            serializer = this[SERIALIZER][ext];
            if (!checkExists && !is.function(serializer.encode)) {
                throw new x.NotSupported(`Format '${ext}' is not saveable`);
            }
        }

        if (checkExists) {
            let st;
            try {
                st = await fs.stat(path);
            } catch (err) {
                throw new x.NotExists(`${path} not exists`);
            }

            return { path, ext, serializer, st };
        }

        return { path, ext, serializer };
    }
}
