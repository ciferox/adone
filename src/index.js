Object.defineProperty(exports, "__esModule", {
    value: true
});

if (!Object.prototype.hasOwnProperty.call(global, "adone")) {
    const adone = Object.create({
        null: Symbol(),
        noop: () => { },
        identity: (x) => x,
        truly: () => true,
        falsely: () => false,
        ok: "OK",
        bad: "BAD",
        exts: [".js", ".tjs", ".ajs"], // .js - es6 js; .tjs - transpiled js, .ajs - adone-specific js
        log: (...args) => adone.defaultLogger.stdoutLogNoFmt(...args),
        fatal: (...args) => adone.defaultLogger.fatal(...args),
        error: (...args) => adone.defaultLogger.error(...args),
        warn: (...args) => adone.defaultLogger.warn(...args),
        info: (...args) => adone.defaultLogger.info(...args),
        debug: (...args) => adone.defaultLogger.debug(...args),
        trace: (...args) => adone.defaultLogger.trace(...args),
        o: (...props) => Object.assign.apply(null, [Object.create(null)].concat(props)),
        Date: global.Date,
        hrtime: process.hrtime,
        setTimeout: global.setTimeout,
        clearTimeout: global.clearTimeout,
        setInterval: global.setInterval,
        clearInterval: global.clearInterval,
        setImmediate: global.setImmediate,
        clearImmediate: global.clearImmediate,
        lazify: (modules, _obj, _require = require, { configurable = false } = {}) => {
            const obj = _obj || {};
            Object.keys(modules).forEach((key) => {
                Object.defineProperty(obj, key, {
                    configurable: true,
                    enumerable: true,
                    get() {
                        const value = modules[key];

                        let mod;
                        if (typeof value === "function") { // eslint-disable-line
                            mod = value(key);
                        } else if (typeof value === "string") { // eslint-disable-line
                            mod = _require(value);
                        } else if (Array.isArray(value) && value.length >= 1 && typeof value[0] === "string") { // eslint-disable-line
                            mod = value.reduce((mod, entry, i) => {
                                if (typeof entry === "function") { // eslint-disable-line
                                    return entry(mod);
                                } else if (typeof entry === "string") { // eslint-disable-line
                                    if (!(entry in mod)) {
                                        throw new Error(`Invalid parameter name in ${key}[${i + 1}]`);
                                    }
                                    return mod[entry];
                                }
                                throw new TypeError(`Invalid type at ${key}[${i + 1}]`);
                            }, _require(value.shift()));
                        } else {
                            throw new TypeError(`Invalid module type of ${key}`);
                        }

                        if (typeof mod === "object" && mod.__esModule === true && "default" in mod) { // eslint-disable-line
                            mod = mod.default;
                        }

                        Object.defineProperty(obj, key, {
                            configurable,
                            enumerable: true,
                            value: mod
                        });

                        return mod;
                    }
                });
            });

            return obj;
        },
        tag: {
            set(Class, tag) {
                Class.prototype[tag] = 1;
            },
            has(obj, tag) {
                if (obj != null && typeof obj === "object") { // eslint-disable-line
                    for (; (obj = obj.__proto__) != null;) { // eslint-disable-line
                        if (obj[tag] === 1) {
                            return true;
                        }
                    }
                }
                return false;
            },
            define(tag, predicate) {
                adone.tag[tag] = Symbol();
                if (typeof (predicate) === "string") { // eslint-disable-line
                    Object.defineProperty(adone.is, predicate, {
                        enumerable: true,
                        value: (obj) => adone.tag.has(obj, tag)
                    });
                }
            },
            SUBSYSTEM: Symbol(),
            APPLICATION: Symbol(),
            TRANSFORM: Symbol(),
            CORE_STREAM: Symbol(),
            LOGGER: Symbol(),
            LONG: Symbol(),
            BIGNUMBER: Symbol(),
            EXBUFFER: Symbol(),
            EXDATE: Symbol(),
            CONFIGURATION: Symbol(),

            GENESIS_NETRON: Symbol(),
            GENESIS_PEER: Symbol(),
            NETRON: Symbol(),
            NETRON_PEER: Symbol(),
            NETRON_ADAPTER: Symbol(),
            NETRON_DEFINITION: Symbol(),
            NETRON_DEFINITIONS: Symbol(),
            NETRON_REFERENCE: Symbol(),
            NETRON_INTERFACE: Symbol(),
            NETRON_STUB: Symbol(),
            NETRON_REMOTESTUB: Symbol(),
            NETRON_STREAM: Symbol(),

            FAST_STREAM: Symbol(),
            FAST_FS_STREAM: Symbol(),
            FAST_FS_MAP_STREAM: Symbol()
        },
        bind: (libName) => require(adone.std.path.resolve(__dirname, "./native", libName)),
        getAssetAbsolutePath: (relPath) => adone.std.path.resolve(__dirname, "..", "etc", adone.std.path.normalize(relPath)),
        loadAsset: (relPath) => {
            const extName = adone.std.path.extname(relPath);
            const buf = adone.std.fs.readFileSync(adone.getAssetAbsolutePath(relPath));
            switch (extName) {
                case ".json": {
                    return JSON.parse(buf.toString("utf8"));
                }
                default:
                    return buf;
            }
        }
    });

    exports.default = adone;

    Object.defineProperty(global, "adone", {
        enumerable: true,
        value: adone
    });

    Object.defineProperties(adone, {
        adone: {
            enumerable: true,
            value: adone
        },
        global: {
            enumerable: true,
            value: global
        }
    });

    adone.lazify({
        // NodeJS embedded modules
        std: () => adone.lazify({
            assert: "assert",
            fs: "fs",
            path: "path",
            util: "util",
            events: "events",
            stream: "stream",
            url: "url",
            net: "net",
            http: "http",
            https: "https",
            child_process: "child_process", // eslint-disable-line
            os: "os",
            cluster: "cluster",
            repl: "repl",
            punycode: "punycode",
            readline: "readline",
            string_decoder: "string_decoder",  // eslint-disable-line
            querystring: "querystring",
            crypto: "crypto",
            vm: "vm",
            v8: "v8",
            domain: "domain",
            module: "module",
            tty: "tty",
            buffer: "buffer",
            constants: "constants",
            zlib: "zlib",
            tls: "tls",
            console: "console",
            dns: "dns",
            timers: "timers",
            dgram: "dgram"
        }),

        // Glosses
        require: () => {
            const plugins = [
                "transform.flowStripTypes",
                "transform.decoratorsLegacy",
                "transform.classProperties",
                "transform.ESModules",
                "transform.functionBind",
                "transform.objectRestSpread"
            ];
            if (process.env.ADONE_COVERAGE) {
                plugins.unshift(
                    "syntax.decorators",
                    "syntax.objectRestSpread",
                    "syntax.functionBind",
                    "syntax.classProperties",
                    "syntax.flow",
                    adone.js.coverage.plugin
                );
            }
            const options = {
                compact: false,
                only: /\.js$/,
                sourceMaps: "inline",
                plugins
            };
            const module = new adone.js.Module(require.main ? require.main.filename : adone.std.path.join(process.cwd(), "index.js"), {
                transform: adone.js.Module.transforms.transpile(options)
            });
            const $require = (path) => module.require(path);
            $require.cache = module.cache;
            $require.main = module;
            $require.options = options;
            $require.resolve = (request) => adone.js.Module._resolveFilename(request, module);
            return $require;
        },
        package: "../package.json",
        native: () => adone.bind("common.node"),
        assertion: "./glosses/assertion",
        assert: () => adone.assertion.loadAssertInterface().assert,
        expect: () => adone.assertion.loadExpectInterface().expect,
        defaultLogger: () => adone.application.Logger.default(),
        emptyBuffer: () => Buffer.allocUnsafe(0),
        is: "./glosses/common/is",
        cui: "./glosses/cui",
        application: "./glosses/application",
        configuration: "./glosses/configurations",
        collection: "./glosses/collections",
        compressor: "./glosses/compressors",
        archive: "./glosses/archives",
        crypto: "./glosses/crypto",
        data: "./glosses/data",
        database: "./glosses/databases",
        diff: "./glosses/diff",
        util: "./glosses/utils",
        datetime: "./glosses/datetime",
        fs: "./glosses/fs",
        js: "./glosses/js",
        punycode: "./glosses/punycode",
        sourcemap: "./glosses/sourcemap",
        ExBuffer: "./glosses/common/exbuffer",
        x: "./glosses/common/x",
        URI: "./glosses/uri",
        semver: "./glosses/semver",
        EventEmitter: "./glosses/common/event_emitter",
        AsyncEmitter: "./glosses/common/async_emitter",
        sprintf: "./glosses/text/sprintf",
        core: "./glosses/core",
        Transform: "./glosses/core/transform",
        text: "./glosses/text",
        Terminal: "./glosses/terminal",
        terminal: () => new adone.Terminal(),
        stream: "./glosses/streams",
        transform: "./glosses/core/transforms",
        templating: "./glosses/templating",
        fast: "./glosses/fast",
        shani: "./glosses/shani",
        promise: "./glosses/promise",
        math: "./glosses/math",
        meta: "./glosses/meta",
        net: "./glosses/net",
        netron: "./glosses/netron",
        metrics: "./glosses/metrics",
        system: "./glosses/system",
        hardware: "./glosses/hardware",
        shell: "./glosses/shell",
        virtualization: "./glosses/virtualization",
        vault: "./glosses/vault",
        specter: "./glosses/specter",
        netscan: "./glosses/netscan",
        timing: () => ({
            now: adone.native.Common.now,
            nowDouble: adone.native.Common.nowDouble,
            nowStruct: adone.native.Common.nowStruct
        }),
        schema: "./glosses/schema",
        geoip: "./glosses/geoip",
        notifier: "./glosses/notifier",
        vcs: "./glosses/vcs",
        regex: "./glosses/regex",

        // Omnitron
        omnitron: () => adone.lazify({
            const: "./omnitron/consts",
            HostManager: "./omnitron/host_manager",
            Configuration: "./omnitron/configuration",
            Omnitron: "./omnitron",
            Dispatcher: "./omnitron/dispatcher"
        }),

        // Vendor
        vendor: "./vendor",
        // Npm
        npm: "./npm"
    }, adone);
    if (process.env.ADONE_SOURCEMAPS) {
        adone.sourcemap.support(Error).install();
    }
} else {
    exports.default = global.adone;
}
