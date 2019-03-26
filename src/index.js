/* eslint-disable camelcase */
/* eslint-disable adone/no-array-isarray */
/* eslint-disable adone/no-null-comp */
/* eslint-disable adone/no-typeof */

Object.defineProperty(exports, "__esModule", {
    value: true
});

const NAMESPACE_SYMBOL = Symbol.for("adone:namespace");
const PRIVATE_SYMBOL = Symbol.for("adone:private");

const asNamespace = (obj) => {
    obj[NAMESPACE_SYMBOL] = true;
    return obj;
};

const adone = Object.create({
    null: Symbol.for("adone:null"),
    noop: () => { },
    identity: (x) => x,
    truly: () => true,
    falsely: () => false,
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
        asNamespace = false,
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
                    if (typeof value === "function") {
                        mod = value(key);
                    } else if (typeof value === "string") {
                        try {
                            mod = _require(value);
                        } catch (err) {
                            // console.log(adone.inspect(err, { asObject: true }));
                            if (err.code !== "MODULE_NOT_FOUND") {
                                throw err;
                            }
                            adone.app.runtime.app.fireException(err);
                        }
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

                    mod = mapper(key, mod);

                    Object.defineProperty(obj, key, {
                        configurable,
                        enumerable,
                        writable,
                        value: mod
                    });

                    try {
                        return asNamespace
                            ? adone.asNamespace(mod)
                            : mod;
                    } catch (err) {
                        return mod;
                    }
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
    private: (obj) => obj[PRIVATE_SYMBOL],
    asNamespace,
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

// Mark adone as namespace
asNamespace(adone);

// Mark global as namespace
asNamespace(global);

// Mark some globals as namespaces
asNamespace(global.process);
asNamespace(global.console);

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
    package: "../package.json",

    ROOT_PATH: () => adone.std.path.join(__dirname, ".."),
    BIN_PATH: () => adone.std.path.join(adone.ROOT_PATH, "bin"),
    RUNTIME_PATH: () => adone.std.path.join(adone.ROOT_PATH, "run"),
    ETC_PATH: () => adone.std.path.join(adone.ROOT_PATH, "etc"),
    OPT_PATH: () => adone.std.path.join(adone.ROOT_PATH, "opt"),
    VAR_PATH: () => adone.std.path.join(adone.ROOT_PATH, "var"),
    PACKAGES_PATH: () => adone.std.path.join(adone.ROOT_PATH, "node_modules"),
    SHARE_PATH: () => adone.std.path.join(adone.ROOT_PATH, "share"),
    LIB_PATH: () => adone.std.path.join(adone.ROOT_PATH, "lib"),
    LOGS_PATH: () => adone.std.path.join(adone.VAR_PATH, "logs"),
    SPECIAL_PATH: () => adone.std.path.join(adone.ROOT_PATH, ".adone"),
    SRC_PATH: () => adone.std.path.join(adone.ROOT_PATH, "src"),
    EMPTY_BUFFER: () => Buffer.allocUnsafe(0),
    LOGO: () => adone.fs.readFileSync(adone.std.path.join(adone.SHARE_PATH, "media", "adone.txt"), { encoding: "utf8" }),

    assert: () => adone.assertion.assert,

    // Namespaces

    // NodeJS
    std: () => asNamespace(adone.lazify({
        assert: "assert",
        async_hooks: "async_hooks",
        buffer: "buffer",
        child_process: "child_process",
        cluster: "cluster",
        console: "console",
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
        perf_hooks: "perf_hooks",
        process: "process",
        punycode: "punycode",
        querystring: "querystring",
        readline: "readline",
        repl: "repl",
        stream: "stream",
        string_decoder: "string_decoder", 
        timers: "timers",
        tls: "tls",
        tty: "tty",
        url: "url",
        util: "util",
        v8: "v8",
        vm: "vm",
        worker_threads: "worker_threads",
        zlib: "zlib"
    }, null, require, { asNamespace: true })),

    // glosses
    app: "./glosses/app",
    archive: "./glosses/archives",
    assertion: "./glosses/assertion",
    cli: "./glosses/cli",
    collection: "./glosses/collections",
    compressor: "./glosses/compressors",
    configuration: "./glosses/configurations",
    crypto: "./glosses/crypto",
    crypto2: "./glosses/crypto2",
    data: "./glosses/data",
    database: "./glosses/databases",
    datastore: "./glosses/datastores",
    datetime: "./glosses/datetime",
    diff: "./glosses/diff",
    error: "./glosses/errors",
    event: "./glosses/events",
    fake: "./glosses/fake",
    fast: "./glosses/fast",
    fs: "./glosses/fs",
    fsm: "./glosses/fsm",
    geoip: "./glosses/geoip",
    git: "./glosses/git",
    globals: "./glosses/globals",
    hardware: "./glosses/hardware",
    inspect: "./glosses/inspect",
    ipfs: "./glosses/ipfs",
    is: "./glosses/is",
    js: "./glosses/js",
    math: "./glosses/math",
    metrics: "./glosses/metrics",
    model: "./glosses/models",
    multiformat: "./glosses/multiformats",
    multi: "./glosses/multi",
    net: "./glosses/net",
    netron: "./glosses/netron",
    notifier: "./glosses/notifier",
    p2p: "./glosses/p2p",
    pretty: "./glosses/pretty",
    promise: "./glosses/promise",
    punycode: "./glosses/punycode",
    realm: "./glosses/realm",
    regex: "./glosses/regex",
    require: "./glosses/require",
    schema: "./glosses/schema",
    semver: "./glosses/semver",
    shell: "./glosses/shell",
    sourcemap: "./glosses/sourcemap",
    sprintf: "./glosses/text/sprintf",
    stream: "./glosses/streams",
    system: "./glosses/system",
    task: "./glosses/tasks",
    templating: "./glosses/templating",
    text: "./glosses/text",
    typeOf: "./glosses/typeof",
    uri: "./glosses/uri",
    util: "./glosses/utils",
    vault: "./glosses/vault",
    web: "./glosses/web",

    benchmark: "./benchmark", // temporary here

    // components
    // bundle: "./bundle",
    cmake: "./cmake",
    gyp: "./gyp",
    shani: "./shani"
    // specter: "./specter"
}, adone);

// lazify non-extendable objects in std
adone.lazify({
    constants: "constants"
}, adone.std);

// lazify third-party libraries
adone.lazify({
    async: "./glosses/async",
    lodash: "./glosses/lodash"
}, adone, require, {
    asNamespace: true
});

// Be here until it appears in the official implementation
require("./glosses/reflect");

if (process.env.ADONE_SOURCEMAPS) {
    adone.sourcemap.support(Error).install();
}

exports.adone = adone;
