Object.defineProperty(exports, "__esModule", {
    value: true
});

if (!Object.prototype.hasOwnProperty.call(global, "adone")) {
    const NAMESPACE_SYMBOL = Symbol.for("adone:namespace");
    const PRIVATE_SYMBOL = Symbol.for("adone:private");

    const asNamespace = (obj) => {
        obj[NAMESPACE_SYMBOL] = true;
        return obj;
    };

    const TAG_MARKER = 777;
    const tag = {
        add(Class, tagName) {
            Class.prototype[this[tagName]] = TAG_MARKER;
        },
        has(obj, tagName) {
            return obj != null && typeof obj === "object" && this[tagName] !== undefined && obj[this[tagName]] === TAG_MARKER;
        },
        define(tagName) {
            this[tagName] = Symbol();
        },

        // Common tags
        EMITTER: Symbol(),
        ASYNC_EMITTER: Symbol(),
        SUBSYSTEM: Symbol(),
        APPLICATION: Symbol(),
        CONFIGURATION: Symbol(),
        CORE_STREAM: Symbol(),
        BYTE_ARRAY: Symbol(),
        LONG: Symbol(),
        BIGNUMBER: Symbol(),
        DATETIME: Symbol(),
        MULTI_ADDRESS: Symbol()
    };

    const adone = Object.create({
        [NAMESPACE_SYMBOL]: true,
        null: Symbol.for("adone::null"),
        noop: () => { },
        identity: (x) => x,
        truly: () => true,
        falsely: () => false,
        ok: "ok",
        bad: "bad",
        o: (...props) => props.length > 0 ? Object.assign({}, ...props) : {},
        Date: global.Date,
        hrtime: process.hrtime,
        setTimeout: global.setTimeout,
        clearTimeout: global.clearTimeout,
        setInterval: global.setInterval,
        clearInterval: global.clearInterval,
        setImmediate: global.setImmediate,
        clearImmediate: global.clearImmediate,
        lazify: (modules, _obj, _require = require, {
            configurable = false,
            enumerable = true,
            writable = false,
            mapper = (key, mod) => ((mod !== null && typeof mod === "object" && mod.__esModule === true && "default" in mod) ? mod.default : mod)
        } = {}) => {
            const obj = _obj || {};
            Object.keys(modules).forEach((key) => {
                Object.defineProperty(obj, key, {
                    configurable: true,
                    enumerable,
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

                        mod = mapper(key, mod);

                        Object.defineProperty(obj, key, {
                            configurable,
                            enumerable,
                            writable,
                            value: mod
                        });

                        return mod;
                    }
                });
            });

            return obj;
        },
        lazifyPrivate: (modules, obj, _require = require, options) => {
            if (adone.is.plainObject(obj[PRIVATE_SYMBOL])) {
                return adone.lazify(modules, obj[PRIVATE_SYMBOL], _require, options);
            }

            obj[PRIVATE_SYMBOL] = adone.lazify(modules, null, _require, options);
            return obj[PRIVATE_SYMBOL];
        },
        definePrivate: (modules, obj) => {
            if (adone.is.plainObject(obj[PRIVATE_SYMBOL])) {
                Object.assign(obj[PRIVATE_SYMBOL], modules);
            } else {
                obj[PRIVATE_SYMBOL] = modules;
            }

            return obj;
        },
        definePredicate: (name, tagName) => {
            Object.defineProperty(adone.is, name, {
                enumerable: true,
                value: (obj) => tag.has(obj, tagName)
            });
            tag.define(tagName);
        },
        definePredicates: (obj) => {
            const entries = Object.entries(obj);
            for (const [name, tagName] of entries) {
                adone.definePredicate(name, tagName);
            }
        },
        defineCustomPredicate: (name, value) => {
            Object.defineProperty(adone.is, name, {
                enumerable: true,
                value
            });
        },
        private: (obj) => obj[PRIVATE_SYMBOL],
        asNamespace,
        tag,
        // TODO: allow only absolute path
        nativeAddon: (path) => {
            return require(adone.std.path.isAbsolute(path) ? path : adone.std.path.resolve(__dirname, "./native", path));
        },
        loadAsset: (path) => {
            const extName = adone.std.path.extname(path);
            const buf = adone.std.fs.readFileSync(adone.std.path.normalize(path));
            switch (extName) {
                case ".json": {
                    return JSON.parse(buf.toString("utf8"));
                }
                default:
                    return buf;
            }
        }
    });

    exports.adone = adone;

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
            value: asNamespace(global)
        }
    });

    adone.lazify({
        // es2015 require
        require: () => {
            const plugins = [
                "syntax.asyncGenerators",
                "transform.flowStripTypes",
                ["transform.decorators", {
                    legacy: true
                }],
                ["transform.classProperties", { loose: true }],
                "transform.modulesCommonjs",
                "transform.functionBind",
                "transform.objectRestSpread",
                "transform.numericSeparator",
                "transform.exponentiationOperator",
                "transform.exportNamespaceFrom"
            ];
            if (process.env.ADONE_COVERAGE) {
                plugins.unshift(
                    "syntax.flow",
                    "syntax.decorators",
                    "syntax.classProperties",
                    "syntax.objectRestSpread",
                    "syntax.functionBind",
                    "syntax.numericSeparator",
                    "syntax.exponentiationOperator",
                    "syntax.exportNamespaceFrom",
                    adone.js.coverage.plugin
                );
            }
            const options = {
                compact: false,
                only: [/\.js$/],
                sourceMaps: "inline",
                plugins
            };
            const module = new adone.js.Module(require.main ? require.main.filename : adone.std.path.join(process.cwd(), "index.js"), {
                transform: adone.js.Module.transforms.transpile(options)
            });
            const $require = (path, { transpile = true, cache = true } = {}) => module.require(path, {
                transform: transpile ? module.transform : null,
                cache
            });
            $require.cache = module.cache;
            $require.main = module;
            $require.options = options;
            $require.resolve = (request) => adone.js.Module._resolveFilename(request, module);
            $require.unref = module.cache.unref.bind(module.cache);
            return $require;
        },

        // Adone info/package
        package: "../package.json",
        // Runtime stuff
        runtime: () => {
            const runtime = Object.create(null, {
                // Main application instance
                app: {
                    enumerable: true,
                    writable: true,
                    value: null
                },
                // Realm instance
                realm: {
                    enumerable: true,
                    writable: true,
                    value: {}
                },
                // true - if omnitron process
                isOmnitron: {
                    enumerable: true,
                    writable: true,
                    value: false
                }
            });

            adone.lazify({
                term: () => new adone.terminal.Terminal(),
                logger: () => {
                    const defaultLogger = adone.app.logger.create({
                        level: "info"
                    });

                    return defaultLogger;
                },
                // netron: () => new adone.netron.Netron(),
                netron: () => {
                    const peerInfo = adone.runtime.isOmnitron
                        ? adone.omnitron.LOCAL_PEER_INFO
                        : adone.net.p2p.PeerInfo.create(adone.runtime.realm.identity.client);
                    return new adone.netron.Netron(peerInfo);
                }
            }, runtime);

            return runtime;
        },
        ROOT_PATH: () => adone.std.path.join(__dirname, ".."),
        EMPTY_BUFFER: () => Buffer.allocUnsafe(0),
        LOGO: () => adone.fs.readFileSync(adone.std.path.join(adone.runtime.realm.env.SHARE_PATH, "media", "adone.txt"), { encoding: "utf8" }),

        assert: () => adone.assertion.loadAssertInterface().assert,
        expect: () => adone.assertion.loadExpectInterface().expect,

        // Namespaces

        // NodeJS
        std: () => asNamespace(adone.lazify({
            assert: "assert",
            async_hooks: "async_hooks", // eslint-disable-line
            buffer: "buffer",
            child_process: "child_process", // eslint-disable-line
            cluster: "cluster",
            console: "console",
            constants: "constants",
            crypto: "crypto",
            dgram: "dgram",
            dns: "dns",
            domain: "domain",
            events: "events",
            fs: "fs",
            http: "http",
            http2: "http2",
            https: "https",
            inspector: "inspector",
            module: "module",
            net: "net",
            os: "os",
            path: "path",
            perf_hooks: "perf_hooks", // eslint-disable-line
            process: "process",
            punycode: "punycode",
            querystring: "querystring",
            readline: "readline",
            repl: "repl",
            stream: "stream",
            string_decoder: "string_decoder",  // eslint-disable-line
            timers: "timers",
            tls: "tls",
            tty: "tty",
            url: "url",
            util: "util",
            v8: "v8",
            vm: "vm",
            zlib: "zlib"
        })),

        // glosses
        app: "./glosses/app",
        archive: "./glosses/archives",
        assertion: "./glosses/assertion",
        collection: "./glosses/collections",
        compressor: "./glosses/compressors",
        configuration: "./glosses/configurations",
        crypto: "./glosses/crypto",
        data: "./glosses/data",
        database: "./glosses/databases",
        datastore: "./glosses/datastores",
        datetime: "./glosses/datetime",
        diff: "./glosses/diff",
        error: "./glosses/errors",
        event: "./glosses/events",
        fake: "./glosses/fake",
        fs: "./glosses/fs",
        geoip: "./glosses/geoip",
        git: "./glosses/git",
        globals: "./glosses/globals",
        hardware: "./glosses/hardware",
        is: "./glosses/is",
        js: "./glosses/js",
        math: "./glosses/math",
        meta: "./glosses/meta",
        metrics: "./glosses/metrics",
        model: "./glosses/models",
        multi: "./glosses/multi",
        net: "./glosses/net",
        netron: "./glosses/netron",
        notifier: "./glosses/notifier",
        p2p: "./glosses/p2p",
        pretty: "./glosses/pretty",
        promise: "./glosses/promise",
        punycode: "./glosses/punycode",
        regex: "./glosses/regex",
        schema: "./glosses/schema",
        semver: "./glosses/semver",
        shell: "./glosses/shell",
        sourcemap: "./glosses/sourcemap",
        sprintf: "./glosses/text/sprintf",
        stream: "./glosses/streams",
        system: "./glosses/system",
        task: "./glosses/tasks",
        templating: "./glosses/templating",
        terminal: "./glosses/terminal",
        text: "./glosses/text",
        uri: "./glosses/uri",
        util: "./glosses/utils",
        vault: "./glosses/vault",
        web: "./glosses/web",

        // components
        // bundle: "./bundle",
        cli: "./cli",
        cmake: "./cmake",
        fast: "./fast",
        ipfs: "./ipfs",
        isolatedVm: "./isolated_vm",
        gyp: "./gyp",
        // napa: "./napa",
        omnitron: "./omnitron",
        realm: "./realm",
        shani: "./shani",
        specter: "./specter",

        // Third party libraries
        async: "./vendor/async",
        benchmark: "./vendor/benchmark",
        lodash: "./vendor/lodash",

        // third parties
        dev: () => {
            let mounts;
            if (adone.fs.existsSync(adone.runtime.config.devmntPath)) {
                mounts = require(adone.runtime.config.devmntPath);
            } else {
                mounts = {};
            }

            return adone.asNamespace(adone.lazify(mounts, null));
        }
    }, adone);
    if (process.env.ADONE_SOURCEMAPS) {
        adone.sourcemap.support(Error).install();
    }
} else {
    exports.adone = global.adone;
}
