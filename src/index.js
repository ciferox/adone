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
        EventEmitter: "./glosses/events/event_emitter",
        AsyncEmitter: "./glosses/events/async_emitter",
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
                Prompt: "./glosses/terminal/ui/prompt"
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
        netron: "./glosses/netron",
        shell: "./glosses/shell"
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
        ConfigManager: "./omnitron/config_manager",
        Omnitron: "./omnitron",
        Dispatcher: "./omnitron/dispatcher"
    });

    adone.collection = lazify({
        Dict: "./glosses/collections/dict",
        Iterator: "./glosses/collections/iterator",
        Set: "./glosses/collections/set",
        Map: "./glosses/collections/map",
        MultiMap: "./glosses/collections/multi_map",
        TimedoutMap: "./glosses/collections/timedout_map",
        DefaultMap: "./glosses/collections/default_map",
        Heap: "./glosses/collections/heap",
        FastSet: "./glosses/collections/fast_set",
        FastMap: "./glosses/collections/fast_map",
        LRU: "./glosses/collections/lru",
        LruSet: "./glosses/collections/lru_set",
        LruMap: "./glosses/collections/lru_map",
        LfuSet: "./glosses/collections/lfu_set",
        LfuMap: "./glosses/collections/lfu_map",
        Deque: "./glosses/collections/deque",
        List: "./glosses/collections/list",
        LinkedList: "./glosses/collections/linked_list",
        SortedArray: "./glosses/collections/sorted_array",
        SortedArraySet: "./glosses/collections/sorted_array_set",
        SortedArrayMap: "./glosses/collections/sorted_array_map",
        SortedSet: "./glosses/collections/sorted_set",
        SortedMap: "./glosses/collections/sorted_map",
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
        buffer: () => {
            return lazify({
                DEFAULT_INITIAL_SIZE: ["./glosses/streams/buffer_stream", (mod) => mod.DEFAULT_INITIAL_SIZE],
                DEFAULT_INCREMENT_AMOUNT: ["./glosses/streams/buffer_stream", (mod) => mod.DEFAULT_INCREMENT_AMOUNT],
                DEFAULT_FREQUENCY: ["./glosses/streams/buffer_stream", (mod) => mod.DEFAULT_FREQUENCY],
                DEFAULT_CHUNK_SIZE: ["./glosses/streams/buffer_stream", (mod) => mod.DEFAULT_CHUNK_SIZE],
                ReadableStream: ["./glosses/streams/buffer_stream", (mod) => mod.ReadableStream],
                WritableStream: ["./glosses/streams/buffer_stream", (mod) => mod.WritableStream]
            });
        },

        ConcatStream: "./glosses/streams/concat_stream",
        concat: () => (opts) => new adone.stream.ConcatStream(opts),
        MuteStream: "./glosses/streams/mute_stream",
        iconv: "./glosses/streams/iconv"
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
        native: () => {
            return lazify({
                system: () => adone.bind("metrics.node").System
            });
        },
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
        bson: () => (lazify({
            BSON: "./glosses/data/bson",
            serializer: () => {
                const { BSON } = adone.data.bson;
                return new BSON([
                    BSON.Binary, BSON.Code, BSON.DBRef,
                    BSON.Decimal128, BSON.Double, BSON.Int32,
                    BSON.Long, BSON.Map, BSON.MaxKey,
                    BSON.MinKey, BSON.ObjectId, BSON.BSONRegExp,
                    BSON.Symbol, BSON.Timestamp
                ]);
            },
            encode: () => (obj) => adone.data.bson.serializer.serialize(obj),
            decode: () => (buf) => adone.data.bson.serializer.deserialize(buf)
        })),
        base64: "./glosses/data/base64"
    });

    adone.database = lazify({
        local: "./glosses/databases/local",
        mysql: "./glosses/databases/mysql/promise",
        redis: "./glosses/databases/redis",
        mongo: "./glosses/databases/mongo"
    });

    adone.net = lazify({
        util: "./glosses/net/util",
        Socket: "./glosses/net/socket",
        Server: "./glosses/net/server",
        ssh: "./glosses/net/ssh"
    });

    adone.net.http = adone.lazify({
        Application: "./glosses/net/http",
        Middleware: "./glosses/net/http/middleware",
        helper: "./glosses/net/http/helpers",
        x: "./glosses/net/http/x",
        Server: "./glosses/net/http/server",
        client: "./glosses/net/http/client"
    });

    adone.net.http.middleware = lazify({
        router: "./glosses/net/http/middlewares/router",
        renderer: ["./glosses/net/http/middlewares/renderer", (mod) => lazify({
            Engine: ["./glosses/net/http/middlewares/renderer/engine", (mod) => {
                mod.default.compile = mod.compile;
                mod.default.render = mod.render;
                return mod.default;
            }]
        }, mod.default)],
        cookies: "./glosses/net/http/middlewares/cookies",
        body: ["./glosses/net/http/middlewares/body", (mod) => lazify({
            buffer: "./glosses/net/http/middlewares/body/buffer",
            json: "./glosses/net/http/middlewares/body/json",
            multipart: "./glosses/net/http/middlewares/body/multipart",
            text: "./glosses/net/http/middlewares/body/text",
            urlencoded: "./glosses/net/http/middlewares/body/urlencoded"
        }, mod.default)],
        session: ["./glosses/net/http/middlewares/session", (mod) => {
            mod.default.Store = mod.Store;
            return mod.default;
        }],
        static: "./glosses/net/http/middlewares/static",
        favicon: "./glosses/net/http/middlewares/favicon",
        logger: "./glosses/net/http/middlewares/logger",
        useragent: "./glosses/net/http/middlewares/useragent",
        geoip: "./glosses/net/http/middlewares/geoip",
        rewrite: "./glosses/net/http/middlewares/rewrite"
    });

    adone.templating = lazify({
        nunjucks: "./glosses/templating/nunjucks"
    });

    adone.net.ws = lazify({
        WebSocket: "./glosses/net/ws/webSocket",
        WebSocketServer: "./glosses/net/ws/webSocketServer",
        Sender: "./glosses/net/ws/sender",
        Receiver: "./glosses/net/ws/receiver",
        PerMessageDeflate: "./glosses/net/ws/perMessageDeflate",
        exts: "./glosses/net/ws/extensions",
        buildHostHeader: ["./glosses/net/ws/webSocket", (mod) => mod.buildHostHeader],
        bufferutil: "./glosses/net/ws/bufferutil"
    });

    adone.net.address = lazify({
        IP4: ["./glosses/net/address", (mod) => mod.IP4],
        IP6: ["./glosses/net/address", (mod) => mod.IP6],
        v6helpers: "./glosses/net/address/v6helpers"
    });

    adone.net.proxy = lazify({
        socks: "./glosses/net/proxies/socks"
    });

    adone.net.mail = lazify({
        assign: "./glosses/net/mail/assign",
        shared: "./glosses/net/mail/shared",
        cookies: "./glosses/net/mail/cookies",
        fetch: "./glosses/net/mail/fetch",
        base64: "./glosses/net/mail/base64",
        qp: "./glosses/net/mail/qp",
        mime: "./glosses/net/mail/mime",
        mimetypes: "./glosses/net/mail/mimetypes",
        charset: "./glosses/net/mail/charset",
        addressparser: "./glosses/net/mail/addressparser",
        wellknown: "./glosses/net/mail/wellknown",
        httpProxy: "./glosses/net/mail/http_proxy",
        templateSender: "./glosses/net/mail/template_sender",
        buildmail: "./glosses/net/mail/buildmail",
        dataStream: "./glosses/net/mail/data_stream",
        composer: "./glosses/net/mail/composer",
        poolResource: "./glosses/net/mail/pool_resource",
        stubTransport: "./glosses/net/mail/stub_transport",
        directTransport: "./glosses/net/mail/direct_transport",
        smtpTransport: "./glosses/net/mail/smtp_transport",
        messageQueue: "./glosses/net/mail/message_queue",
        smtpConnection: "./glosses/net/mail/smtp_connection",
        smtpPool: "./glosses/net/mail/smtp_pool",
        mailer: "./glosses/net/mail/mailer"
    });

    adone.netron.ws = lazify({
        Adapter: "./glosses/netron/ws/adapter",
        Netron: "./glosses/netron/ws/netron",
        Peer: "./glosses/netron/ws/peer"
    });

    adone.crypto = lazify({
        stringCompare: "./glosses/crypto/string_compare",
        Keygrip: "./glosses/crypto/keygrip",
        password: "./glosses/crypto/password",
        asn1: "./glosses/crypto/asn1"
    });

    adone.compressor = lazify({
        gzip: "./glosses/compressors/gzip",
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

    // Shim object
    const hashMap = new WeakMap();
    const owns = Object.prototype.hasOwnProperty;

    Object.isObject = function (object) {
        return Object(object) === object;
    };

    Object.getValueOf = function (value) {
        if (value && typeof value.valueOf === "function") {
            value = value.valueOf();
        }
        return value;
    };


    Object.hash = function (object) {
        if (object && typeof object.hash === "function") {
            return String(object.hash());
        } else if (Object(object) === object) {
            if (!hashMap.has(object)) {
                hashMap.set(object, Math.random().toString(36).slice(2));
            }
            return hashMap.get(object);
        } else {
            return `${object}`;
        }
    };

    Object.owns = function (object, key) {
        return owns.call(object, key);
    };

    Object.has = function (object, key) {
        if (typeof object !== "object") {
            throw new Error(`Object.has can't accept non-object: ${typeof object}`);
        }
        // forward to mapped collections that implement "has"
        if (object && typeof object.has === "function") {
            return object.has(key);
            // otherwise report whether the key is on the prototype chain,
            // as long as it is not one of the methods on object.prototype
        } else if (typeof key === "string") {
            return key in object && object[key] !== Object.prototype[key];
        } else {
            throw new Error("Key must be a string for Object.has on plain objects");
        }
    };

    Object.get = function (object, key, value) {
        if (typeof object !== "object") {
            throw new Error(`Object.get can't accept non-object: ${typeof object}`);
        }
        // forward to mapped collections that implement "get"
        if (object && typeof object.get === "function") {
            return object.get(key, value);
        } else if (Object.has(object, key)) {
            return object[key];
        } else {
            return value;
        }
    };

    Object.set = function (object, key, value) {
        if (object && typeof object.set === "function") {
            object.set(key, value);
        } else {
            object[key] = value;
        }
    };

    Object.addEach = function (target, source, overrides) {
        const overridesExistingProperty = arguments.length === 3 ? overrides : true;
        if (!source) {
            //
        } else if (typeof source.forEach === "function" && !source.hasOwnProperty("forEach")) {
            // copy map-alikes
            if (source.isMap === true) {
                source.forEach((value, key) => {
                    target[key] = value;
                });
                // iterate key value pairs of other iterables
            } else {
                source.forEach((pair) => {
                    target[pair[0]] = pair[1];
                });
            }
        } else if (typeof source.length === "number") {
            // arguments, strings
            for (let index = 0; index < source.length; index++) {
                target[index] = source[index];
            }
        } else {
            // copy other objects as map-alikes
            for (let keys = Object.keys(source), i = 0, key; (key = keys[i]); i++) {
                if (overridesExistingProperty || !Object.owns(target, key)) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    };

    Object.defineEach = function (target, source, overrides, configurable, enumerable, writable) {
        const overridesExistingProperty = arguments.length === 3 ? overrides : true;
        if (!source) {
            //
        } else if (typeof source.forEach === "function" && !source.hasOwnProperty("forEach")) {
            // copy map-alikes
            if (source.isMap === true) {
                source.forEach((value, key) => {
                    Object.defineProperty(target, key, {
                        value,
                        writable,
                        configurable,
                        enumerable
                    });
                });
                // iterate key value pairs of other iterables
            } else {
                source.forEach((pair) => {
                    Object.defineProperty(target, pair[0], {
                        value: pair[1],
                        writable,
                        configurable,
                        enumerable
                    });

                });
            }
        } else if (typeof source.length === "number") {
            // arguments, strings
            for (let index = 0; index < source.length; index++) {
                Object.defineProperty(target, index, {
                    value: source[index],
                    writable,
                    configurable,
                    enumerable
                });

            }
        } else {
            // copy other objects as map-alikes
            for (let keys = Object.keys(source), i = 0, key; (key = keys[i]); i++) {
                if (overridesExistingProperty || !Object.owns(target, key)) {
                    Object.defineProperty(target, key, {
                        value: source[key],
                        writable,
                        configurable,
                        enumerable
                    });
                }
            }
        }
        return target;
    };

    Object.forEach = function (object, callback, thisp) {
        const keys = Object.keys(object);
        let i = 0;
        let iKey;
        for (; (iKey = keys[i]); i++) {
            callback.call(thisp, object[iKey], iKey, object);
        }
    };

    Object.map = function (object, callback, thisp) {
        const keys = Object.keys(object);
        let i = 0;
        const result = [];
        let iKey;
        for (; (iKey = keys[i]); i++) {
            result.push(callback.call(thisp, object[iKey], iKey, object));
        }
        return result;
    };

    Object.concat = function () {
        const object = {};
        for (let i = 0; i < arguments.length; i++) {
            Object.addEach(object, arguments[i]);
        }
        return object;
    };

    Object.is = function (x, y) {
        if (x === y) {
            // 0 === -0, but they are not identical
            return x !== 0 || 1 / x === 1 / y;
        }
        // NaN !== NaN, but they are identical.
        // NaNs are the only non-reflexive value, i.e., if x !== x,
        // then x is a NaN.
        // isNaN is broken: it converts its argument to number, so
        // isNaN("foo") => true
        return x !== x && y !== y;
    };

    Object.equals = function (a, b, equals, memo) {
        equals = equals || Object.equals;
        //console.log("Object.equals: a:",a, "b:",b, "equals:",equals);
        // unbox objects, but do not confuse object literals
        a = Object.getValueOf(a);
        b = Object.getValueOf(b);
        if (a === b) {
            return true;
        }
        if (Object.isObject(a)) {
            memo = memo || new WeakMap();
            if (memo.has(a)) {
                return true;
            }
            memo.set(a, true);
        }
        if (Object.isObject(a) && typeof a.equals === "function") {
            return a.equals(b, equals, memo);
        }
        // commutative
        if (Object.isObject(b) && typeof b.equals === "function") {
            return b.equals(a, equals, memo);
        }
        if (Object.isObject(a) && Object.isObject(b)) {
            if (Object.getPrototypeOf(a) === Object.prototype && Object.getPrototypeOf(b) === Object.prototype) {
                for (const name in a) {
                    if (!equals(a[name], b[name], equals, memo)) {
                        return false;
                    }
                }
                for (const name in b) {
                    if (!(name in a) || !equals(b[name], a[name], equals, memo)) {
                        return false;
                    }
                }
                return true;
            }
        }
        // NaN !== NaN, but they are equal.
        // NaNs are the only non-reflexive value, i.e., if x !== x,
        // then x is a NaN.
        // isNaN is broken: it converts its argument to number, so
        // isNaN("foo") => true
        // We have established that a !== b, but if a !== a && b !== b, they are
        // both NaN.
        if (a !== a && b !== b) {
            return true;
        }
        if (!a || !b) {
            return a === b;
        }
        return false;
    };

    Object.compare = function (a, b) {
        // unbox objects, but do not confuse object literals
        // mercifully handles the Date case
        a = Object.getValueOf(a);
        b = Object.getValueOf(b);
        if (a === b) {
            return 0;
        }
        const aType = typeof a;
        const bType = typeof b;
        if (aType === "number" && bType === "number") {
            return a - b;
        }
        if (aType === "string" && bType === "string") {
            return a < b ? -Infinity : Infinity;
        }
        // the possibility of equality elimiated above
        if (a && typeof a.compare === "function") {
            return a.compare(b);
        }
        // not commutative, the relationship is reversed
        if (b && typeof b.compare === "function") {
            return -b.compare(a);
        }
        return 0;
    };

    Object.clone = function (value, depth, memo) {
        value = Object.getValueOf(value);
        memo = memo || new WeakMap();
        if (depth === undefined) {
            depth = Infinity;
        } else if (depth === 0) {
            return value;
        }
        if (Object.isObject(value)) {
            if (!memo.has(value)) {
                if (value && typeof value.clone === "function") {
                    memo.set(value, value.clone(depth, memo));
                } else {
                    const prototype = Object.getPrototypeOf(value);
                    if (prototype === null || prototype === Object.prototype) {
                        const clone = Object.create(prototype);
                        memo.set(value, clone);
                        for (const key in value) {
                            clone[key] = Object.clone(value[key], depth - 1, memo);
                        }
                    } else {
                        throw new Error(`Can't clone ${value}`);
                    }
                }
            }
            return memo.get(value);
        }
        return value;
    };

    Object.clear = function (object) {
        if (object && typeof object.clear === "function") {
            object.clear();
        } else {
            const keys = Object.keys(object);
            let i = keys.length;
            while (i) {
                i--;
                delete object[keys[i]];
            }
        }
        return object;
    };

    Object.empty = Object.freeze(Object.create(null));
    Object.from = Object.concat;
}
