const {
    is,
    std
} = adone;

const DONT_TRANSPILE_COMMENT = Buffer.from("//adone-dont-transpile");
const DONT_TRANSPILE_COMMENT_S = Buffer.from("// adone-dont-transpile");

export default class FileConfiguration extends adone.configuration.Configuration {
    constructor({ base = process.cwd() } = {}) {
        super();
        this._.base = base;
        this._.serializer = {};
        this.registerFormat(".js", (buf, filePath, key) => {
            let transform;

            const content = buf.toString();

            if (content.includes(DONT_TRANSPILE_COMMENT_S) || content.includes(DONT_TRANSPILE_COMMENT)) {
                transform = null;
            } else {
                transform = adone.js.Module.transforms.transpile(adone.require.options);
            }

            const m = new adone.js.Module(filePath, {
                transform
            });

            m._compile(content, filePath);
            let confObj = m.exports;
            if (confObj.__esModule) {
                confObj = confObj.default;
            }

            let hasFunctions = false;

            const bindFunctions = (nestedConfig) => {
                const keys = Object.getOwnPropertyNames(nestedConfig);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    const value = nestedConfig[key];
                    if (is.function(value)) {
                        hasFunctions = true;
                        nestedConfig[key] = (...args) => value.apply(this.getObject(this._.paths[confObj]), args);
                    } else if (is.object(value)) {
                        bindFunctions(value);
                    }
                }
            };

            bindFunctions(confObj);

            if (hasFunctions) {
                if (is.undefined(this._.paths)) {
                    this._.paths = {};
                }
                this._.paths[confObj] = key;
            }

            return confObj;
        });

        adone.lazify({
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
        }, this._.serializer);
    }

    registerFormat(ext, decode, encode) {
        this._.serializer[ext] = {
            decode,
            encode
        };
    }

    supportedExts() {
        return Object.keys(this._.serializer);
    }

    async load(confPath, name) {
        const conf = await this._checkPath(confPath, true);
        if (conf.st.isDirectory()) {
            conf.path = adone.util.globize(conf.path, { exts: `{${Object.keys(this._.serializer).join(",")}}` });
            await adone.fs.glob(conf.path).map((p) => {
                return this.load(p, name === true ? name : null);
            });
        } else if (conf.st.isFile()) {
            let confObj = {};

            const correctName = (name === true ? std.path.basename(conf.path, conf.ext) : (is.string(name) ? name : ""));

            try {
                const content = await adone.fs.readFile(conf.path);
                confObj = await conf.serializer.decode(content, conf.path, correctName);
            } catch (err) {
                //
            }

            if (!is.object(confObj)) {
                throw new adone.x.NotValid(`'${conf.path}' is not valid ${conf.ext}-configuration file`);
            }

            if (correctName !== "") {
                this.merge(correctName, confObj);
            } else {
                this.merge(confObj);
            }
        } else {
            throw new adone.x.NotFound(`${conf.path} not exists`);
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
        await adone.fs.writeFile(conf.path, await conf.serializer.encode(obj, options));
    }

    async _checkPath(confPath, checkExists) {
        let path;
        if (!std.path.isAbsolute(confPath)) {
            path = std.path.resolve(this._.base, confPath);
        } else {
            path = confPath;
        }

        let ext = null;
        let serializer = null;
        ext = std.path.extname(path);
        if (ext !== "") {
            if (!is.propertyOwned(this._.serializer, ext)) {
                throw new adone.x.NotSupported(`Unsupported format: ${ext}`);
            }
            serializer = this._.serializer[ext];
            if (!checkExists && !is.function(serializer.encode)) {
                throw new adone.x.NotSupported(`Format '${ext}' is not saveable`);
            }
        }

        if (checkExists) {
            let st;
            try {
                st = await adone.fs.stat(path);
            } catch (err) {
                throw new adone.x.NotFound(`${path} not exists`);
            }

            return { path, ext, serializer, st };
        }

        return { path, ext, serializer };
    }
}
