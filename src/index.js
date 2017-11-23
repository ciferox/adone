Object.defineProperty(exports, "__esModule", {
    value: true
});

if (!Object.prototype.hasOwnProperty.call(global, "adone")) {
    const namespaceSymbol = Symbol.for("adone::namespace");
    const privateSymbol = Symbol.for("adone::private");

    const asNamespace = (obj) => {
        obj[namespaceSymbol] = true;
        return obj;
    };

    const TAG_MARKER = 777;
    const tag = {
        add(Class, tagName) {
            Class.prototype[this[tagName]] = TAG_MARKER;
        },
        has(obj, tagName) {
            return obj != null && typeof obj === "object" && obj[this[tagName]] === TAG_MARKER;
        },
        define(tagName, predicate) {
            this[tagName] = Symbol();
        },

        // Common tags
        SUBSYSTEM: Symbol(),
        APPLICATION: Symbol(),
        CLI_APPLICATION: Symbol(),
        CONFIGURATION: Symbol(),
        CORE_STREAM: Symbol(),
        BYTE_ARRAY: Symbol(),
        LONG: Symbol(),
        BIGNUMBER: Symbol(),
        DATETIME: Symbol()
    };

    const adone = Object.create({
        [namespaceSymbol]: true,
        null: Symbol.for("adone::null"),
        noop: () => { },
        identity: (x) => x,
        truly: () => true,
        falsely: () => false,
        ok: "ok",
        bad: "bad",
        log: (...args) => adone.runtime.logger.stdoutLogNoFmt(...args),
        fatal: (...args) => adone.runtime.logger.fatal(...args),
        error: (...args) => adone.runtime.logger.error(...args),
        warn: (...args) => adone.runtime.logger.warn(...args),
        info: (...args) => adone.runtime.logger.info(...args),
        debug: (...args) => adone.runtime.logger.debug(...args),
        trace: (...args) => adone.runtime.logger.trace(...args),
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
            writable = false,
            mapper = (key, mod) => ((mod !== null && typeof mod === "object" && mod.__esModule === true && "default" in mod) ? mod.default : mod)
        } = {}) => {
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

                        mod = mapper(key, mod);

                        Object.defineProperty(obj, key, {
                            configurable,
                            enumerable: true,
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
            if (adone.is.plainObject(obj[privateSymbol])) {
                return adone.lazify(modules, obj[privateSymbol], _require, options);
            }

            obj[privateSymbol] = adone.lazify(modules, null, _require, options);
            return obj;
        },
        definePrivate: (modules, obj) => {
            if (adone.is.plainObject(obj[privateSymbol])) {
                Object.assign(obj[privateSymbol], modules);
            } else {
                obj[privateSymbol] = modules;
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
        private: (obj) => obj[privateSymbol],
        asNamespace,
        tag,
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
                "transform.decorators",
                ["transform.classProperties", { loose: true }],
                "transform.modulesCommonjs",
                "transform.functionBind",
                "transform.objectRestSpread",
                "transform.numericSeparator",
                "transform.exponentiationOperator"
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

        // Adone package
        package: "../package.json",

        // Runtime stuff
        runtime: () => {
            const runtime = Object.create(null, {
                app: {
                    enumerable: true,
                    writable: true,
                    value: null
                },
                realm: {
                    enumerable: true,
                    writable: true,
                    value: null
                }
            });

            adone.lazify({
                term: () => new adone.terminal.Terminal(),
                logger: () => adone.application.Logger.default(),
                netron: () => new adone.netron.Netron()
            }, runtime);

            return runtime;
        },
        rootPath: () => adone.std.path.join(__dirname, ".."),
        etcPath: () => adone.std.path.join(adone.rootPath, "etc"),

        emptyBuffer: () => Buffer.allocUnsafe(0),
        assert: () => adone.assertion.loadAssertInterface().assert,
        expect: () => adone.assertion.loadExpectInterface().expect,

        // Namespaces

        // NodeJS
        std: () => asNamespace(adone.lazify({
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
            dgram: "dgram",
            perf_hooks: "perf_hooks"
        })),

        native: () => adone.bind("common.node"),

        // glosses
        assertion: "./glosses/assertion",
        event: "./glosses/events",
        is: "./glosses/is",
        x: "./glosses/exceptions",
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
        URI: "./glosses/uri",
        semver: "./glosses/semver",
        sprintf: "./glosses/text/sprintf",
        text: "./glosses/text",
        terminal: "./glosses/terminal",
        stream: "./glosses/streams",
        templating: "./glosses/templating",
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
        netscan: "./glosses/netscan",
        schema: "./glosses/schema",
        geoip: "./glosses/geoip",
        notifier: "./glosses/notifier",
        vcs: "./glosses/vcs",
        regex: "./glosses/regex",
        task: "./glosses/tasks",
        odm: "./glosses/odm",
        orm: "./glosses/orm",

        // components
        project: "./project",
        realm: "./realm",
        cli: "./cli",
        omnitron: "./omnitron",
        fast: "./fast",
        shani: "./shani",
        specter: "./specter",

        // thrid parties
        vendor: "./vendor",
        npm: "./npm"
    }, adone);
    if (process.env.ADONE_SOURCEMAPS) {
        adone.sourcemap.support(Error).install();
    }
} else {
    exports.adone = global.adone;
}
