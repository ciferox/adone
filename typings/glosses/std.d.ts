declare namespace adone.std {
    import Assert from "assert";
    const assert = Assert;

    namespace fs { export * from "fs"; }
    namespace path { export * from "path"; }
    namespace util { export * from "util"; }

    import EventEmitter from "events";
    const events = EventEmitter;

    import Stream from "stream";
    const stream = Stream;

    namespace url { export * from "url"; }
    namespace net { export * from "net"; }
    namespace http { export * from "http"; }
    namespace https { export * from "https"; }
    namespace child_process { export * from "child_process"; }
    namespace os { export * from "os"; }

    import Cluster from "cluster";
    const cluster = Cluster;

    namespace repl { export * from "repl"; }
    namespace punycode { export * from "punycode"; }
    namespace readline { export * from "readline"; }
    namespace string_decoder { export * from "string_decoder"; }
    namespace querystring { export * from "querystring"; }
    namespace crypto { export * from "crypto"; }
    namespace vm { export * from "vm"; }
    namespace v8 { export * from "v8"; }
    namespace domain { export * from "domain"; }

    import Module from "module";
    const module = Module;

    namespace tty { export * from "tty"; }
    namespace buffer { export * from "buffer"; }
    namespace constants { export * from "constants"; }
    namespace zlib { export * from "zlib"; }
    namespace tls { export * from "tls"; }

    import Console from "console";
    const console = Console;

    namespace dns { export * from "dns"; }
    namespace timers { export * from "timers"; }
    namespace dgram { export * from "dgram"; }
}