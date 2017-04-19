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
        exts: [".js", ".tjs", ".ajs"], // .js - es6 js; .tjs - transpiled js, .ajs - adone-specific js
        log: (...args) => adone.defaultLogger.stdoutLogNoFmt(...args),
        fatal: (...args) => adone.defaultLogger.fatal(...args),
        error: (...args) => adone.defaultLogger.error(...args),
        warn: (...args) => adone.defaultLogger.warn(...args),
        info: (...args) => adone.defaultLogger.info(...args),
        debug: (...args) => adone.defaultLogger.debug(...args),
        trace: (...args) => adone.defaultLogger.trace(...args),
        o: (...props) => Object.assign.apply(null, [Object.create(null)].concat(props)),
        lazify: (modules, _obj, _require = require, { configurable = false } = {}) => {
            const obj = _obj || {};
            Object.keys(modules).forEach((key) => {
                Object.defineProperty(obj, key, {
                    configurable: true,
                    get() {
                        const value = modules[key];


                        let mod;
                        if (typeof value === "function") {
                            mod = value(key);
                        } else if (typeof value === "string") {
                            mod = _require(value);
                        } else if (Array.isArray(value) && value.length >= 1 && typeof value[0] === "string") {
                            mod = value.reduce((mod, entry, i) => {
                                if (typeof entry === "function") {
                                    return entry(mod);
                                } else if (typeof entry === "string") {
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

                        if (typeof mod === "object" && "default" in mod) {
                            mod = mod.default;
                        }

                        Object.defineProperty(obj, key, {
                            configurable,
                            value: mod
                        });

                        return mod;
                    }
                });
            });

            return obj;
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
        run: () => (App) => (new App()).run(),
        package: "../package.json",
        assertion: "./glosses/assertion",
        assert: () => adone.assertion.loadAssertInterface().assert,
        expect: () => adone.assertion.loadExpectInterface().expect,
        is: "./glosses/common/is",
        bind: () => (libName) => require(adone.std.path.resolve(__dirname, "./native", libName)),
        application: "./glosses/application",
        configuration: "./glosses/configurations",
        collection: "./glosses/collections",
        compressor: "./glosses/compressors",
        archive: "./glosses/archives",
        crypto: "./glosses/crypto",
        data: "./glosses/data",
        database: "./glosses/databases",
        util: "./glosses/utils",
        date: "./glosses/dates/exdate",
        fs: "./glosses/fs",
        js: "./glosses/js",
        sourcemap: "./glosses/sourcemap",
        Benchmark: "./glosses/common/benchmark",
        ExBuffer: "./glosses/common/exbuffer",
        x: "./glosses/common/x",
        URI: "./glosses/uri",
        Hooker: "./glosses/common/hooker",
        File: "./glosses/common/file",
        semver: "./glosses/semver",
        EventEmitter: "./glosses/common/event_emitter",
        AsyncEmitter: "./glosses/common/async_emitter",
        format: "./glosses/text/format",
        sprintf: ["./glosses/text/sprintf", (mod) => mod.sprintf],
        vsprintf: ["./glosses/text/sprintf", (mod) => mod.vsprintf],
        core: "./glosses/core",
        Transform: "./glosses/core/transform",
        WebApplication: "./glosses/webapplication",
        WebMiddleware: "./glosses/webapplication/middleware",
        LoggerWebMiddleware: "./glosses/webapplication/middlewares/logger",
        ProcessManager: "./glosses/process_manager",
        defaultLogger: () => adone.application.Logger.default(),
        text: "./glosses/text",
        terminal: "./glosses/terminal",
        fsevents: "fsevents",
        require: () => {
            const options = {
                compact: false,
                only: /\.js$/,
                sourceMaps: "inline",
                plugins: [
                    "transform.flowStripTypes",
                    "transform.decoratorsLegacy",
                    "transform.classProperties",
                    "transform.ESModules",
                    "transform.functionBind",
                    "transform.objectRestSpread"
                ]
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
        shell: "./glosses/shell",
        vendor: "./glosses/vendor",
        virt: "./glosses/virt",
        vault: "./glosses/vault",
        specter: "./glosses/specter",
        tag: () => ({
            set(Class, tag) {
                Class.prototype[tag] = 1;
            },
            has(obj, tag) {
                if (obj != null && typeof obj === "object") {
                    for (; (obj = obj.__proto__) != null;) {
                        if (obj[tag] === 1) {
                            return true;
                        }
                    }
                }
                return false;
            },
            define(tag, predicate) {
                adone.tag[tag] = Symbol();
                if (typeof (predicate) === "string") {
                    Object.defineProperty(adone.is, predicate, {
                        enumerable: true,
                        value: (obj) => adone.tag.has(obj, tag)
                    });
                }
            },
            SUBSYSTEM: Symbol(),
            APPLICATION: Symbol(),
            WEBAPPLICATION: Symbol(),
            WEBMIDDLEWARE: Symbol(),
            TRANSFORM: Symbol(),
            CORE_STREAM: Symbol(),
            LOGGER: Symbol(),
            LONG: Symbol(),
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
        }),
        omnitron: () => adone.lazify({
            const: "./omnitron/consts",
            GateManager: "./omnitron/gate_manager",
            HostManager: "./omnitron/host_manager",
            Configurator: "./omnitron/configurator",
            Omnitron: "./omnitron",
            Dispatcher: "./omnitron/dispatcher"
        })
    }, adone);
} else {
    exports.default = global.adone;
}
