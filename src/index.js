Object.defineProperty(exports, "__esModule", {
    value: true
});

if (Object.prototype.hasOwnProperty.call(global, "adone")) {
    exports.default = global.adone;
} else {
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

    Object.defineProperty(adone, "adone", {
        enumerable: true,
        value: adone
    });

    Object.defineProperty(adone, "global", {
        enumerable: true,
        value: global
    });

    const lazify = adone.lazify;

    adone.std = lazify({
        assert: "assert",
        fs: () => adone.promise.promisifyAll(require("fs")),
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
    });

    lazify({
        run: () => (App) => (new App()).run(),
        package: "../package.json",
        assertion: "./glosses/assertion",
        assert: () => adone.assertion.loadAssertInterface().assert,
        expect: () => adone.assertion.loadExpectInterface().expect,
        is: "./glosses/common/is",
        bind: () => (libName) => require(adone.std.path.resolve(__dirname, "./native", libName)),
        util: "./glosses/utils",
        date: "./glosses/dates/exdate",
        fs: "./glosses/fs",
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
        Terminal: "./glosses/terminal",
        terminal: () => {
            const Terminal = require("./glosses/terminal").default;
            const term = new Terminal();

            lazify({
                style: "./glosses/terminal/styles",
                Node: "./glosses/terminal/ui/node",
                Screen: "./glosses/terminal/ui/screen",
                GridLayout: "./glosses/terminal/ui/layout/grid",
                CarouselLayout: "./glosses/terminal/ui/layout/carousel",
                Separator: "./glosses/terminal/ui/prompt/separator",
                Prompt: "./glosses/terminal/ui/prompt",
                Progress: "./glosses/terminal/ui/progress"
            }, term);

            term.layout = lazify({
                Grid: "./glosses/terminal/ui/layout/grid",
                Carousel: "./glosses/terminal/ui/layout/carousel"
            });

            term.widget = lazify({
                Element: "./glosses/terminal/ui/widgets/element",
                Text: "./glosses/terminal/ui/widgets/text",
                Line: "./glosses/terminal/ui/widgets/line",
                ScrollableBox: "./glosses/terminal/ui/widgets/scrollablebox",
                ScrollableText: "./glosses/terminal/ui/widgets/scrollabletext",
                BigText: "./glosses/terminal/ui/widgets/bigtext",
                List: "./glosses/terminal/ui/widgets/list",
                Form: "./glosses/terminal/ui/widgets/form",
                Input: "./glosses/terminal/ui/widgets/input",
                TextArea: "./glosses/terminal/ui/widgets/textarea",
                TextBox: "./glosses/terminal/ui/widgets/textbox",
                Button: "./glosses/terminal/ui/widgets/button",
                ProgressBar: "./glosses/terminal/ui/widgets/progressbar",
                FileManager: "./glosses/terminal/ui/widgets/filemanager",
                CheckBox: "./glosses/terminal/ui/widgets/checkbox",
                RadioSet: "./glosses/terminal/ui/widgets/radioset",
                RadioButton: "./glosses/terminal/ui/widgets/radiobutton",
                Prompt: "./glosses/terminal/ui/widgets/prompt",
                Question: "./glosses/terminal/ui/widgets/question",
                Message: "./glosses/terminal/ui/widgets/message",
                Loading: "./glosses/terminal/ui/widgets/loading",
                ListBar: "./glosses/terminal/ui/widgets/listbar",
                Log: "./glosses/terminal/ui/widgets/log",
                Table: "./glosses/terminal/ui/widgets/table",
                ListTable: "./glosses/terminal/ui/widgets/listtable",
                Terminal: "./glosses/widgets/Terminal",
                ANSIImage: "./glosses/terminal/ui/widgets/ansiimage",
                OverlayImage: "./glosses/terminal/ui/widgets/overlayimage",
                Video: "./glosses/terminal/ui/widgets/video",
                Layout: "./glosses/terminal/ui/widgets/layout",
                Grid: "./glosses/terminal/ui/widgets/grid",
                MultiPage: "./glosses/terminal/ui/widgets/multipage",
                TabBar: "./glosses/terminal/ui/widgets/tabbar",
                Canvas: "./glosses/terminal/ui/widgets/canvas",
                Map: "./glosses/terminal/ui/widgets/map",
                Donut: "./glosses/terminal/ui/widgets/donut",
                Gauge: "./glosses/terminal/ui/widgets/gauge",
                GaugeList: "./glosses/terminal/ui/widgets/gaugelist",
                SparkLine: "./glosses/terminal/ui/widgets/sparkline",
                ExTable: "./glosses/terminal/ui/widgets/extable",
                LCD: "./glosses/terminal/ui/widgets/lcd",
                ExLog: "./glosses/terminal/ui/widgets/exlog",
                Tree: "./glosses/terminal/ui/widgets/tree",
                Markdown: "./glosses/terminal/ui/widgets/markdown",
                Picture: "./glosses/terminal/ui/widgets/picture",
                BarChart: "./glosses/terminal/ui/widgets/charts/bar",
                LineChart: "./glosses/terminal/ui/widgets/charts/line",
                StackedBarChart: "./glosses/terminal/ui/widgets/charts/stackedbar",
                chart: () => {
                    return lazify({
                        Bar: "./glosses/terminal/ui/widgets/charts/bar",
                        StackedBar: "./glosses/terminal/ui/widgets/charts/stackedbar",
                        Line: "./glosses/terminal/ui/widgets/charts/line"
                    });
                }
            });

            term.unicode = require("./glosses/terminal/ui/unicode");
            term.helpers = require("./glosses/terminal/ui/helpers");
            term.helpers.merge(term, term.helpers);

            term.prompt = (questions) => {
                const ui = new term.Prompt(lazify({
                    list: "./glosses/terminal/ui/prompt/species/list",
                    input: "./glosses/terminal/ui/prompt/species/input",
                    confirm: "./glosses/terminal/ui/prompt/species/confirm",
                    rawlist: "./glosses/terminal/ui/prompt/species/rawlist",
                    expand: "./glosses/terminal/ui/prompt/species/expand",
                    checkbox: "./glosses/terminal/ui/prompt/species/checkbox",
                    password: "./glosses/terminal/ui/prompt/species/password",
                    editor: "./glosses/terminal/ui/prompt/species/editor",
                    autocomplete: "./glosses/terminal/ui/prompt/species/autocomplete",
                    directory: "./glosses/terminal/ui/prompt/species/directory"
                }));
                const promise = ui.run(questions);
                promise.ui = ui;
                return promise;
            };

            return term;
        },
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
        fast: "./glosses/fast",
        shani: "./glosses/shani",
        promise: "./glosses/promise",
        math: "./glosses/math",
        meta: "./glosses/meta",
        net: "./glosses/net",
        netron: "./glosses/netron",
        shell: "./glosses/shell",
        native: () => lazify({
            terminal: () => adone.bind("terminal.node").Terminal,
            system: () => adone.bind("metrics.node").System,
            leveldown: () => adone.bind("leveldown.node").leveldown
        })
    }, adone);

    adone.application = lazify({
        Subsystem: "./glosses/application/subsystem",
        Application: "./glosses/application",
        Logger: "./glosses/application/logger"
    });

    adone.configuration = lazify({
        Configuration: "./glosses/configurations/configuration",
        FileConfiguration: "./glosses/configurations/file_configuration",
        JSConfiguration: "./glosses/configurations/js_configuration",
        JSONConfiguration: "./glosses/configurations/json_configuration"
    });

    adone.archive = lazify({
        tar: () => lazify({
            RawPackStream: "./glosses/archives/tar/raw/pack",
            RawExtractStream: "./glosses/archives/tar/raw/extract",
            packStream: ["./glosses/archives/tar", (mod) => mod.packStream],
            extractStream: ["./glosses/archives/tar", (mod) => mod.extractStream]
        })
    });

    adone.omnitron = lazify({
        const: "./omnitron/consts",
        ConfigurationManager: "./omnitron/configuration_manager",
        Omnitron: "./omnitron",
        Dispatcher: "./omnitron/dispatcher"
    });

    adone.collection = lazify({
        Set: "./glosses/collections/set",
        TimedoutMap: "./glosses/collections/timedout_map",
        DefaultMap: "./glosses/collections/default_map",
        Heap: "./glosses/collections/heap",
        LRU: "./glosses/collections/lru",
        LinkedList: "./glosses/collections/linked_list",
        BQueue: "./glosses/collections/bqueue",
        BinarySearchTree: "./glosses/collections/bst",
        AVLTree: "./glosses/collections/avl_tree",
        Stack: "./glosses/collections/stack",
        BufferList: "./glosses/collections/buffer_list",
        ArraySet: "./glosses/collections/array_set"
    });

    adone.sourcemap = lazify({
        convert: "./glosses/sourcemap/convert",
        support: "./glosses/sourcemap/support",
        createConsumer: ["./glosses/sourcemap/consumer", (x) => x.createConsumer],
        Consumer: ["./glosses/sourcemap/consumer", (x) => x.SourceMapConsumer],
        IndexedConsumer: ["./glosses/sourcemap/consumer", (x) => x.IndexedSourceMapConsumer],
        BasicConsumer: ["./glosses/sourcemap/consumer", (x) => x.BasicSourceMapConsumer],
        createGenerator: ["./glosses/sourcemap/generator", (x) => x.createGenerator],
        Generator: ["./glosses/sourcemap/generator", (x) => x.SourceMapGenerator],
        Node: "./glosses/sourcemap/node",
        MappingList: "./glosses/sourcemap/mapping_list",
        util: "./glosses/sourcemap/util"
    }, null);

    adone.js = lazify({
        Module: "./glosses/js/module"
    });

    adone.js.compiler = lazify({
        parse: ["./glosses/js/compiler/parser", (mod) => mod.parse],
        parseExpression: ["./glosses/js/compiler/parser", (mod) => mod.parseExpression],
        jsTokens: "./glosses/js/compiler/js-tokens",
        matchToToken: ["./glosses/js/compiler/js-tokens", (mod) => mod.matchToToken],
        esutils: "./glosses/js/compiler/esutils",
        codeFrame: "./glosses/js/compiler/code-frame",
        messages: "./glosses/js/compiler/messages",
        types: "./glosses/js/compiler/types",
        helpers: "./glosses/js/compiler/helpers",
        traverse: "./glosses/js/compiler/traverse",
        Printer: "./glosses/js/compiler/generator/printer",
        Whitespace: "./glosses/js/compiler/generator/whitespace",
        generate: "./glosses/js/compiler/generator",
        template: "./glosses/js/compiler/template",
        core: "./glosses/js/compiler/core",
        plugin: "./glosses/js/compiler/plugins"
    });

    adone.js.compiler.tools = lazify({
        buildExternalHelpers: "./glosses/js/compiler/core/tools/build-external-helpers"
    });
    adone.js.compiler.transformation = lazify({
        Plugin: "./glosses/js/compiler/core/transformation/plugin"
    });
    adone.js.compiler.transformation.file = lazify({
        buildConfigChain: "./glosses/js/compiler/core/transformation/file/options/build-config-chain",
        OptionManager: "./glosses/js/compiler/core/transformation/file/options/option-manager",
        Logger: "./glosses/js/compiler/core/transformation/file/logger"
    });

    adone.stream = lazify({
        buffer: () => lazify({
            DEFAULT_INITIAL_SIZE: ["./glosses/streams/buffer_stream", (mod) => mod.DEFAULT_INITIAL_SIZE],
            DEFAULT_INCREMENT_AMOUNT: ["./glosses/streams/buffer_stream", (mod) => mod.DEFAULT_INCREMENT_AMOUNT],
            DEFAULT_FREQUENCY: ["./glosses/streams/buffer_stream", (mod) => mod.DEFAULT_FREQUENCY],
            DEFAULT_CHUNK_SIZE: ["./glosses/streams/buffer_stream", (mod) => mod.DEFAULT_CHUNK_SIZE],
            ReadableStream: ["./glosses/streams/buffer_stream", (mod) => mod.ReadableStream],
            WritableStream: ["./glosses/streams/buffer_stream", (mod) => mod.WritableStream]
        }),
        ConcatStream: "./glosses/streams/concat_stream",
        concat: () => (opts) => new adone.stream.ConcatStream(opts),
        MuteStream: "./glosses/streams/mute_stream",
        iconv: "./glosses/streams/iconv",
        CountingStream: "./glosses/streams/counting_stream"
    });

    adone.metrics = lazify({
        OS: "./glosses/metrics/system/operating_system",
        HAL: "./glosses/metrics/hardware/hal",
        FileSystem: "./glosses/metrics/system/file_system",
        FileStore: "./glosses/metrics/system/file_store",
        Process: "./glosses/metrics/system/process",
        // LinuxUtils: "./glosses/shi/system/linux/utils",
        // LinuxFS: "./glosses/shi/system/linux/file_system",
        // LinuxProcess: "./glosses/shi/system/linux/process",
        // WindowsFS: "./glosses/shi/system/windows/file_system",
        // WindowsProcess: "./glosses/shi/system/windows/process",
        // WindowsHAL: "./glosses/shi/hardware/windows",
        // FreebsdProcess: "./glosses/shi/system/freebsd/process",
        // FreebsdHAL: "./glosses/shi/hardware/freebsd"

        sloc: "./glosses/metrics/sloc",
        system: () => {
            let OperatingSystem;
            switch (process.platform) {
                case "linux": OperatingSystem = require("./glosses/metrics/system/linux").default; break;
                case "win32": OperatingSystem = require("./glosses/metrics/system/windows").default; break;
                case "freebsd": OperatingSystem = require("./glosses/metrics/system/freebsd").default; break;
                case "darwin": OperatingSystem = require("./glosses/metrics/system/darwin").default; break;
                case "sunos": OperatingSystem = require("./glosses/metrics/system/sunos").default; break;
                default: throw new adone.x.NotSupported(`Unsupported operating system: ${process.platform}`);
            }
            return new OperatingSystem();
        },
        hardware: () => {
            let Hardware;
            switch (process.platform) {
                case "linux": Hardware = require("./glosses/metrics/hardware/linux").default; break;
                case "win32": Hardware = require("./glosses/metrics/hardware/windows").default; break;
                case "freebsd": Hardware = require("./glosses/metrics/hardware/freebsd").default; break;
                case "darwin": Hardware = require("./glosses/metrics/hardware/darwin").default; break;
                case "sunos": Hardware = require("./glosses/metrics/hardware/sunos").default; break;
                default: throw new adone.x.NotSupported(`Unsupported operating system: ${Hardware.platform}`);
            }
            return new Hardware();
        }
    });

    adone.data = lazify({
        json: () => (lazify({
            encode: () => (obj, { space } = {}) => Buffer.from(JSON.stringify(obj, null, space), "utf8"),
            decode: () => (buf) => JSON.parse(buf.toString())
        })),
        json5: "./glosses/data/json5",
        mpak: () => (lazify({
            Encoder: "./glosses/data/mpak/encoder",
            Decoder: "./glosses/data/mpak/decoder",
            Serializer: "./glosses/data/mpak",
            serializer: () => {
                // Reserved custom type ids:
                // 127 - adone exceptions
                // 126 - standart errors
                // 89 - adone.Long
                // 88 - adon.netron.Definition
                // 87 - adone.netron.Reference
                // 86 - adone.netron.Definitions

                const s = new adone.data.mpak.Serializer();

                // Here we register custom types for default serializer

                const decodeException = (buf) => {
                    const id = buf.readUInt16BE();
                    const message = s.decode(buf);
                    const stack = s.decode(buf);
                    return adone.x.create(id, message, stack);
                };

                // Adone exceptions encoders/decoders
                s.register(127, adone.x.Exception, (obj, buf) => {
                    buf.writeUInt16BE(obj.id);
                    s.encode(obj.message, buf);
                    s.encode(obj.stack, buf);
                }, decodeException);

                // Std exceptions encoders/decoders
                s.register(126, Error, (obj, buf) => {
                    buf.writeUInt16BE(adone.x.getStdId(obj));
                    s.encode(obj.message, buf);
                    s.encode(obj.stack, buf);
                }, decodeException);

                // Long encoder/decoder
                s.register(125, adone.math.Long, (obj, buf) => {
                    buf.writeInt8(obj.unsigned ? 1 : 0);
                    if (obj.unsigned) {
                        buf.writeUInt64BE(obj);
                    } else {
                        buf.writeInt64BE(obj);
                    }
                }, (buf) => {
                    const unsigned = Boolean(buf.readInt8());
                    return (unsigned ? buf.readUInt64BE() : buf.readInt64BE());
                });

                return s;
            },
            encode: () => (obj) => adone.data.mpak.serializer.encode(obj).flip().toBuffer(),
            decode: () => (buf) => adone.data.mpak.serializer.decode(buf),
            tryDecode: () => (buf) => adone.data.mpak.serializer.decoder.tryDecode(buf)
        })),
        bson: "./glosses/data/bson",
        base64: "./glosses/data/base64",
        yaml: "./glosses/data/yaml"
    });

    adone.database = lazify({
        local: "./glosses/databases/local",
        level: "./glosses/databases/level",
        mysql: "./glosses/databases/mysql/promise",
        redis: "./glosses/databases/redis",
        mongo: "./glosses/databases/mongo"
    });

    adone.templating = lazify({
        nunjucks: "./glosses/templating/nunjucks"
    });

    adone.crypto = lazify({
        stringCompare: "./glosses/crypto/string_compare",
        Keygrip: "./glosses/crypto/keygrip",
        password: "./glosses/crypto/password",
        asn1: "./glosses/crypto/asn1",
        crc32: "./glosses/crypto/crc32"
    });

    adone.compressor = lazify({
        gz: "./glosses/compressors/gzip",
        deflate: "./glosses/compressors/deflate",
        brotli: "./glosses/compressors/brotli",
        lzma: "./glosses/compressors/lzma",
        xz: "./glosses/compressors/xz"
    });

    adone.transform = lazify({
        Any2Buffer: "./glosses/core/transforms/any2buffer",
        Destination: "./glosses/core/transforms/destination",
        Each: "./glosses/core/transforms/each",
        Filter: "./glosses/core/transforms/filter",
        Map: "./glosses/core/transforms/map",
        Pluck: "./glosses/core/transforms/pluck",
        Reduce: "./glosses/core/transforms/reduce",
        Throttle: "./glosses/core/transforms/throttle",
        Encode: "./glosses/core/transforms/encode",
        Decode: "./glosses/core/transforms/decode",
        buffer: "./glosses/core/transforms/buffer"
    });

    adone.virt = lazify({
        virtualbox: "./glosses/virt/virtualbox"
    });

    adone.vendor = lazify({
        lodash: "./glosses/vendor/lodash",
        Benchmark: "./glosses/vendor/benchmark"
    });

    adone.tag = {
        set(Class, tag) {
            Class.prototype[tag] = 1;
        },
        has(obj, tag) {
            if (obj != null && typeof obj === "object") {
                for ( ; (obj = obj.__proto__) != null; ) {
                    if (obj[tag] === 1) {
                        return true;
                    }
                }
            }
            return false;
        },
        define(tag) {
            adone.tag[tag] = Symbol();
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
    };
}
