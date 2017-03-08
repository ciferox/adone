import adone from "adone";
const { is } = adone;

const DONT_TRANSPILE_COMMENT = Buffer.from("//adone-dont-transpile");
const DONT_TRANSPILE_COMMENT_S = Buffer.from("// adone-dont-transpile");

export default class FileConfiguration extends adone.configuration.Configuration {
    constructor({ base  = process.cwd() } = {}) {
        super();
        this._.base = base;
        this._.serializer = {};
        this.registerFormat(".js", (buf, filePath, key) => {
            let transform;

            const content = buf.toString();

            if (content.indexOf(DONT_TRANSPILE_COMMENT_S) >= 0 || content.indexOf(DONT_TRANSPILE_COMMENT) >= 0) {
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

        this.registerFormat(".json", adone.data.json.decode, adone.data.json.encode);
        this.registerFormat(".bson", adone.data.bson.decode, adone.data.bson.encode);
        this.registerFormat(".json5", adone.data.json5.decode, adone.data.json5.encode);
        this.registerFormat(".mpak", adone.data.mpak.decode, adone.data.mpak.encode);
    }

    registerFormat(ext, decode, encode) {
        this._.serializer[ext] = {
            decode,
            encode
        };
    }

    async load(confPath, name) {
        const conf = await this._checkPath(confPath, true);
        if (conf.st.isDirectory()) {
            conf.path = adone.util.globize(conf.path, `{${Object.keys(this._.serializer).map((ext) => ext.substring(1)).join(",")}}`, false);
            await adone.fs.glob(conf.path).map((p) => {
                return this.load(p, name === true ? name : null);
            });
        } else if (conf.st.isFile()) {
            let confObj = {};

            const correctName = (name === true ? adone.std.path.basename(conf.path, conf.ext) : (is.string(name) ? name : ""));

            try {
                const content = await adone.fs.readFile(conf.path);
                confObj = await conf.serializer.decode(content, conf.path, correctName);
            } catch (err) { }

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
        await adone.std.fs.writeFileAsync(conf.path, await conf.serializer.encode(obj, options));
    }

    async _checkPath(confPath, checkExists) {
        let path;
        if (!adone.std.path.isAbsolute(confPath)) {
            path = adone.std.path.resolve(this._.base, confPath);
        } else {
            path = confPath;
        }

        let ext = null;
        let serializer = null;
        ext = adone.std.path.extname(path);
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
                st = await adone.std.fs.statAsync(path);
            } catch (err) {
                throw new adone.x.NotFound(`${path} not exists`);
            }

            return { path, ext, serializer, st };
        }

        return { path, ext, serializer };
    }
}
