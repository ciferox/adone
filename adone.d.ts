declare namespace adone {
    interface IS {
        null: (obj: any) => boolean;
        undefined: (obj: any) => boolean;
        exist: (obj: any) => boolean;
        nil: (obj: any) => boolean;
        number: (obj: any) => boolean;
        numeral: (obj: any) => boolean;
        infinite: (obj: any) => boolean;
        odd: (obj: any) => boolean;
        even: (obj: any) => boolean;
        float: (obj: any) => boolean;
        negativeZero: (obj: any) => boolean;
        string: (obj: any) => boolean;
        emptyString: (obj: any) => boolean;
        substring: (substring: string, string: string, offset?: number) => boolean;
        prefix: (prefix: string, string: string) => boolean;
        suffix: (suffix: string, string: string) => boolean;
        boolean: (obj: any) => boolean;
        json: (obj: any) => boolean;
        object: (obj: any) => boolean;
        plainObject: (obj: any) => boolean;
        class: (obj: any) => boolean;
        emptyObject: (obj: any) => boolean;
        propertyOwned: (obj: any, field: string) => boolean;
        propertyDefined: (obj: any, field: string) => boolean;
        conforms: (obj: object, schema: object, strict: boolean) => boolean;
        arrayLikeObject: (obj: any) => boolean;
        inArray: (value: any, array: any[], offset?: number, comparator?: Function) => boolean;
        sameType: (value: any, other: any) => boolean;
        primitive: (obj: any) => boolean;
        equalArrays: (left: any[], right: any[]) => boolean;
        deepEqual: (left: any, right: any) => boolean;
        shallowEqual: (left: any, right: any) => boolean;
        stream: (obj: any) => boolean;
        writableStream: (obj: any) => boolean;
        readableStream: (obj: any) => boolean;
        duplexStream: (obj: any) => boolean;
        transformStream: (obj: any) => boolean;
        utf8: (obj: Buffer) => boolean;
        win32PathAbsolute: (path: string) => boolean;
        posixPathAbsolute: (path: string) => boolean;
        pathAbsolute: (path: string) => boolean;
        glob: (str: string) => boolean;
        dotfile: (str: string) => boolean;
        function: (obj: any) => boolean;
        asyncFunction: (obj: any) => boolean;
        promise: (obj: any) => boolean;
        validDate: (str: string) => boolean;
        buffer: (obj: any) => boolean;
        callback: (obj: any) => boolean;
        generator: (obj: any) => boolean;
        nan: (obj: any) => boolean;
        finite: (obj: any) => boolean;
        integer: (obj: any) => boolean;
        safeInteger: (obj: any) => boolean;
        array: (obj: any) => boolean;
        uint8Array: (obj: any) => boolean;
        configuration: (obj: any) => boolean;
        long: (obj: any) => boolean;
        bigNumber: (obj: any) => boolean;
        exbuffer: (obj: any) => boolean;
        exdate: (obj: any) => boolean;
        transform: (obj: any) => boolean;
        subsystem: (obj: any) => boolean;
        application: (obj: any) => boolean;
        logger: (obj: any) => boolean;
        coreStream: (obj: any) => boolean;
        fastStream: (obj: any) => boolean;
        fastFSStream: (obj: any) => boolean;
        fastFSMapStream: (obj: any) => boolean;
        genesisNetron: (obj: any) => boolean;
        genesisPeer: (obj: any) => boolean;
        netronAdapter: (obj: any) => boolean;
        netron: (obj: any) => boolean;
        netronPeer: (obj: any) => boolean;
        netronDefinition: (obj: any) => boolean;
        netronDefinitions: (obj: any) => boolean;
        netronReference: (obj: any) => boolean;
        netronInterface: (obj: any) => boolean;
        netronContext: (obj: any) => boolean;
        netronIMethod: (netronInterface: object, name: string) => boolean;
        netronIProperty: (netronInterface: any, name: string) => boolean;
        netronStub: (obj: any) => boolean;
        netronRemoteStub: (obj: any) => boolean;
        netronStream: (obj: any) => boolean;
        iterable: (obj: any) => boolean;
        windows: boolean;
        linux: boolean;
        freebsd: boolean;
        darwin: boolean;
        sunos: boolean;
        uppercase: (str: string) => boolean;
        lowercase: (str: string) => boolean;
        digits: (str: string) => boolean;
        identifier: (str: string) => boolean;
        binaryExtension: (str: string) => boolean;
        binaryPath: (str: string) => boolean;
        ip4: (str: string) => boolean;
        ip6: (str: string) => boolean;
        arrayBuffer: (obj: any) => boolean;
        arrayBufferView: (obj: any) => boolean;
        date: (obj: any) => boolean;
        error: (obj: any) => boolean;
        map: (obj: any) => boolean;
        regexp: (obj: any) => boolean;
        set: (obj: any) => boolean;
        symbol: (obj: any) => boolean;
        validUTF8: (obj: any) => boolean;
    }

    export var is: IS;

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

    export var truly: () => boolean;
    export var falsely: () => boolean;
}

module "adone" {
    export = adone;
}
