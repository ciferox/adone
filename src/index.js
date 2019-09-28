// Be here until it appears in the official implementation
require("./reflect");

const common = require("./common");
const { lazify } = common;

const adone = Object.create({
    __app__: null, // root application instance
    common: common.asNamespace(common),
    // expose some useful commons
    null: common.null,
    undefined: common.undefined,
    noop: common.noop,
    identity: common.identity,
    truly: common.truly,
    falsely: common.falsely,
    o: common.o,
    lazify,
    lazifyp: common.lazifyp,
    definep: common.definep,
    getPrivate: common.getPrivate,
    asNamespace: common.asNamespace,
    setTimeout: common.setTimeout,
    clearTimeout: common.clearTimeout,
    setInterval: common.setInterval,
    clearInterval: common.clearInterval,
    setImmediate: common.setImmediate,
    clearImmediate: common.clearImmediate,
    EMPTY_BUFFER: common.EMPTY_BUFFER
});

// Mark some globals as namespaces
[
    adone,
    global,
    global.process,
    global.console
].forEach((mod) => {
    adone.asNamespace(mod);
});

Object.defineProperty(global, "adone", {
    enumerable: true,
    value: adone
});

Object.defineProperty(adone, "adone", {
    enumerable: true,
    value: adone
});

lazify({
    package: "../package.json",

    cwd: () => adone.path.join(__dirname, ".."),
    getPath: () => (...args) => adone.path.join(adone.cwd, ...args),
    LOGO: () => adone.fs.readFileSync(adone.getPath("share", "media", "adone.txt"), { encoding: "utf8" }),

    assert: () => adone.assertion.assert,

    // Namespaces

    // NodeJS
    std: () => adone.asNamespace(lazify({
        assert: "assert",
        asyncHooks: "async_hooks",
        buffer: "buffer",
        childProcess: "child_process",
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
        perfHooks: "perf_hooks",
        process: "process",
        punycode: "punycode",
        querystring: "querystring",
        readline: "readline",
        repl: "repl",
        stream: "stream",
        stringDecoder: "string_decoder",
        timers: "timers",
        tls: "tls",
        tty: "tty",
        url: "url",
        util: "util",
        v8: "v8",
        vm: "vm",
        workerThreads: "worker_threads",
        zlib: "zlib"
    }, null, require, { asNamespace: true })),

    // glosses
    acorn: "./glosses/acorn",
    app: "./glosses/app",
    archive: "./glosses/archives",
    assertion: "./glosses/assertion",
    buffer: "./glosses/buffer",
    cli: "./glosses/cli",
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
    fast: "./glosses/fast",
    fs: "./glosses/fs",
    fsm: "./glosses/fsm",
    git: "./glosses/git",
    github: "./glosses/github",
    glob: "./glosses/glob",
    globals: "./glosses/globals",
    http: "./glosses/http",
    inspect: "./glosses/inspect",
    ipfs: "./glosses/ipfs",
    is: "./glosses/is",
    js: "./glosses/js",
    lockfile: "./glosses/lockfile",
    logger: "./glosses/logger",
    math: "./glosses/math",
    model: "./glosses/models",
    module: "./glosses/module",
    multiformat: "./glosses/multiformats",
    net: "./glosses/net",
    netron: "./glosses/netron",
    nodejs: "./glosses/nodejs",
    notifier: "./glosses/notifier",
    omnitron: "./glosses/omnitron",
    p2p: "./glosses/p2p",
    path: "./glosses/path",
    pretty: "./glosses/pretty",
    process: "./glosses/process",
    promise: "./glosses/promise",
    punycode: "./glosses/punycode",
    puppeteer: "./glosses/puppeteer",
    realm: "./glosses/realm",
    regex: "./glosses/regex",
    rollup: "./glosses/rollup",
    semver: "./glosses/semver",
    sourcemap: "./glosses/sourcemap",
    stream: "./glosses/streams",
    system: "./glosses/system",
    task: "./glosses/tasks",
    templating: "./glosses/templating",
    text: "./glosses/text",
    typeOf: "./glosses/typeof",
    typescript: "./glosses/typescript",
    uri: "./glosses/uri",
    util: "./glosses/utils",
    validation: "./glosses/validation",
    vault: "./glosses/vault",
    web: "./glosses/web"
}, adone);

// mappings
lazify({
    require: "./glosses/module/require",
    requireAddon: "./glosses/module/require_addon",
    sprintf: "./glosses/text/sprintf"
}, adone);

// lazify non-extendable objects in std
lazify({
    constants: "constants"
}, adone.std);

// lazify third-party libraries
lazify({
    async: "./glosses/async",
    lodash: "./glosses/lodash"
}, adone, require, {
    asNamespace: true
});

common.setLazifyErrorHandler((err) => {
    if (adone.__app__ !== null) {
        adone.__app__.fireException(err);
        return;
    }
    console.error(adone.pretty.error(err));
});

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.adone = adone;
