namespace adone {
    const is = {
        null: (obj: any) => Boolean,
        undefined: (obj: any) => Boolean,
        exist: (obj: any) => Boolean,
        nil: (obj: any) => Boolean,
        number: (obj: any) => Boolean,
        numeral: (obj: any) => Boolean,
        infinite: (obj: any) => Boolean,
        odd: (obj: any) => Boolean,
        even: (obj: any) => Boolean,
        float: (obj: any) => Boolean,
        negativeZero: (obj: any) => Boolean,
        string: (obj: any) => Boolean,
        emptyString: (obj: any) => Boolean,
        substring: (substring: string, string: string, offset?: number = 0) => Boolean,
        prefix: (prefix: string, string: string) => Boolean,
        suffix: (suffix: string, string: string) => Boolean,
        Boolean: (obj: any) => Boolean,
        json: (obj: any) => Boolean,
        object: (obj: any) => Boolean,
        plainObject: (obj: any) => Boolean,
        class: (obj: any) => Boolean,
        emptyObject: (obj: any) => Boolean,
        propertyOwned: (obj: any, field: string) => Boolean,
        propertyDefined: (obj: any, field: string) => Boolean,
        conforms: (obj: object, schema: object, strict: Boolean) => Boolean,
        arrayLikeObject: (obj: any) => Boolean,
        inArray: (value: any, array: any[], offset?: number = 0, comparator?: Function) => Boolean,
        sameType: (value: any, other: any) => Boolean,
        primitive: (obj: any) => Boolean,
        equalArrays: (left: any[], right: any[]) => Boolean,
        deepEqual: (left: any, right: any) => Boolean,
        shallowEqual: (left: any, right: any) => Boolean,
        stream: (obj: any) => Boolean,
        writableStream: (obj: any) => Boolean,
        readableStream: (obj: any) => Boolean,
        duplexStream: (obj: any) => Boolean,
        transformStream: (obj: any) => Boolean,
        utf8: (obj: Buffer) => Boolean,
        win32PathAbsolute: (path: string) => Boolean,
        posixPathAbsolute: (path: string) => Boolean,
        pathAbsolute: (path: string) => Boolean,
        glob: (str: string) => Boolean,
        dotfile: (str: string) => Boolean,
        function: (obj: any) => Boolean,
        asyncFunction: (obj: any) => Boolean,
        promise: (obj: any) => Boolean,
        validDate: (str: string) => Boolean,
        buffer: (obj: any) => Boolean,
        callback: (obj: any) => Boolean,
        generator: (obj: any) => Boolean,
        nan: (obj: any) => Boolean,
        finite: (obj: any) => Boolean,
        integer: (obj: any) => Boolean,
        safeInteger: (obj: any) => Boolean,
        array: (obj: any) => Boolean,
        uint8Array: (obj: any) => Boolean,
        configuration: (obj: any) => Boolean,
        long: (obj: any) => Boolean,
        bigNumber: (obj: any) => Boolean,
        exbuffer: (obj: any) => Boolean,
        exdate: (obj: any) => Boolean,
        transform: (obj: any) => Boolean,
        subsystem: (obj: any) => Boolean,
        application: (obj: any) => Boolean,
        logger: (obj: any) => Boolean,
        coreStream: (obj: any) => Boolean,
        fastStream: (obj: any) => Boolean,
        fastFSStream: (obj: any) => Boolean,
        fastFSMapStream: (obj: any) => Boolean,
        genesisNetron: (obj: any) => Boolean,
        genesisPeer: (obj: any) => Boolean,
        netronAdapter: (obj: any) => Boolean,
        netron: (obj: any) => Boolean,
        netronPeer: (obj: any) => Boolean,
        netronDefinition: (obj: any) => Boolean,
        netronDefinitions: (obj: any) => Boolean,
        netronReference: (obj: any) => Boolean,
        netronInterface: (obj: any) => Boolean,
        netronContext: (obj: any) => Boolean,
        netronIMethod: (netronInterface: object, name: string) => Boolean,
        netronIProperty: (netronInterface: any, name: stirng) => Boolean,
        netronStub: (obj: any) => Boolean,
        netronRemoteStub: (obj: any) => Boolean,
        netronStream: (obj: any) => Boolean,
        iterable: (obj: any) => Boolean,
        windows: Boolean,
        linux: Boolean,
        freebsd: Boolean,
        darwin: Boolean,
        sunos: Boolean,
        uppercase: (str: string) => Boolean,
        lowercase: (str: string) => Boolean,
        digits: (str: string) => Boolean,
        identifier: (str: string) => Boolean,
        binaryExtension: (str: string) => Boolean,
        binaryPath: (str: string) => Boolean,
        ip4: (str: string) => Boolean,
        ip6: (str: string) => Boolean,
        arrayBuffer: (obj: any) => Boolean,
        arrayBufferView: (obj: any) => Boolean,
        date: (obj: any) => Boolean,
        error: (obj: any) => Boolean,
        map: (obj: any) => Boolean,
        regexp: (obj: any) => Boolean,
        set: (obj: any) => Boolean,
        symbol: (obj: any) => Boolean,
        validUTF8: (obj: any) => Boolean
    }

    namespace x {
        class Exception extends Error { }
        class Runtime extends Exception { }
        class IncompleteBufferError extends Exception { }
        class NotImplemented extends Exception { }
        class IllegalState extends Exception { }
        class NotValid extends Exception { }
        class Unknown extends Exception { }
        class NotExists extends Exception { }
        class Exists extends Exception { }
        class Empty extends Exception { }
        class InvalidAccess extends Exception { }
        class NotSupported extends Exception { }
        class InvalidArgument extends Exception { }
        class InvalidNumberOfArguments extends Exception { }
        class NotFound extends Exception { }
        class Timeout extends Exception { }
        class Incorrect extends Exception { }
        class NotAllowed extends Exception { }
        class LimitExceeded extends Exception { }
        class Encoding extends Exception { }
        class Network extends Exception { }
        class Bind extends Exception { }
        class Connect extends Exception { }
        class Database extends Exception { }
        class DatabaseInitialization extends Exception { }
        class DatabaseOpen extends Exception { }
        class DatabaseRead extends Exception { }
        class DatabaseWrite extends Exception { }
        class NetronIllegalState extends Exception { }
        class NetronPeerDisconnected extends Exception { }
        class NetronTimeout extends Exception { }
    }

    namespace std {
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

    const truly = () => true;
    const falsely = () => false;
}

module "adone" {
    export = adone;
}
