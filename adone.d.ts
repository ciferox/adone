namespace adone {
    interface is {  // has to be an interface
        function: (obj: any) => Boolean
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
        substring: (obj: any) => Boolean,
        prefix: (obj: any) => Boolean,
        suffix: (obj: any) => Boolean,
        boolean: (obj: any) => Boolean,
        json: (obj: any) => Boolean,
        object: (obj: any) => Boolean,
        plainObject: (obj: any) => Boolean,
        class: (obj: any) => Boolean,
        emptyObject: (obj: any) => Boolean,
        propertyOwned: (obj: any) => Boolean,
        propertyDefined: (obj: any) => Boolean,
        conforms: (obj: any) => Boolean,
        arrayLikeObject: (obj: any) => Boolean,
        inArray: (obj: any) => Boolean,
        sameType: (obj: any) => Boolean,
        primitive: (obj: any) => Boolean,
        deepEqual: (obj: any) => Boolean,
        shallowEqual: (obj: any) => Boolean,
        stream: (obj: any) => Boolean,
        writableStream: (obj: any) => Boolean,
        readableStream: (obj: any) => Boolean,
        duplexStream: (obj: any) => Boolean,
        transformStream: (obj: any) => Boolean,
        utf8: (obj: any) => Boolean,
        win32PathAbsolute: (obj: any) => Boolean,
        posixPathAbsolute: (obj: any) => Boolean,
        pathAbsolute: (obj: any) => Boolean,
        glob: (obj: any) => Boolean,
        dotfile: (obj: any) => Boolean,
        function: (obj: any) => Boolean,
        asyncFunction: (obj: any) => Boolean,
        promise: (obj: any) => Boolean,
        validDate: (obj: any) => Boolean,
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
        netronIMethod: (obj: any) => Boolean,
        netronIProperty: (obj: any) => Boolean,
        netronStub: (obj: any) => Boolean,
        netronRemoteStub: (obj: any) => Boolean,
        netronStream: (obj: any) => Boolean,
        iterable: (obj: any) => Boolean,
        win32: (obj: any) => Boolean,
        linux: (obj: any) => Boolean,
        freebsd: (obj: any) => Boolean,
        darwin: (obj: any) => Boolean,
        sunos: (obj: any) => Boolean,
        uppercase: (obj: any) => Boolean,
        lowercase: (obj: any) => Boolean,
        digits: (obj: any) => Boolean,
        identifier: (obj: any) => Boolean,
        binaryExtension: (obj: any) => Boolean,
        binaryPath: (obj: any) => Boolean,
        ip4: (obj: any) => Boolean,
        ip6: (obj: any) => Boolean,
        arrayBuffer: (obj: any) => Boolean,
        arrayBufferView: (obj: any) => Boolean,
        date: (obj: any) => Boolean,
        error: (obj: any) => Boolean,
        map: (obj: any) => Boolean,
        regexp: (obj: any) => Boolean,
        set: (obj: any) => Boolean,
        symbol: (obj: any) => Boolean,
        validUTF8: (obj: any) => Boolean,
    }
    const is: is;

    namespace x {
        interface Exception extends Error { }
        interface Runtime extends Exception { }
        interface IncompleteBufferError extends Exception { }
        interface NotImplemented extends Exception { }
        interface IllegalState extends Exception { }
        interface NotValid extends Exception { }
        interface Unknown extends Exception { }
        interface NotExists extends Exception { }
        interface Exists extends Exception { }
        interface Empty extends Exception { }
        interface InvalidAccess extends Exception { }
        interface NotSupported extends Exception { }
        interface InvalidArgument extends Exception { }
        interface InvalidNumberOfArguments extends Exception { }
        interface NotFound extends Exception { }
        interface Timeout extends Exception { }
        interface Incorrect extends Exception { }
        interface NotAllowed extends Exception { }
        interface LimitExceeded extends Exception { }
        interface Encoding extends Exception { }
        interface Network extends Exception { }
        interface Bind extends Exception { }
        interface Connect extends Exception { }
        interface Database extends Exception { }
        interface DatabaseInitialization extends Exception { }
        interface DatabaseOpen extends Exception { }
        interface DatabaseRead extends Exception { }
        interface DatabaseWrite extends Exception { }
        interface NetronIllegalState extends Exception { }
        interface NetronPeerDisconnected extends Exception { }
        interface NetronTimeout extends Exception { }

        const Exception: Exception;
        const Runtime: Runtime;
        const IncompleteBufferError: IncompleteBufferError;
        const NotImplemented: NotImplemented;
        const IllegalState: IllegalState;
        const NotValid: NotValid;
        const Unknown: Unknown;
        const NotExists: NotExists;
        const Exists: Exists;
        const Empty: Empty;
        const InvalidAccess: InvalidAccess;
        const NotSupported: NotSupported;
        const InvalidArgument: InvalidArgument;
        const InvalidNumberOfArguments: InvalidNumberOfArguments;
        const NotFound: NotFound;
        const Timeout: Timeout;
        const Incorrect: Incorrect;
        const NotAllowed: NotAllowed;
        const LimitExceeded: LimitExceeded;
        const Encoding: Encoding;
        const Network: Network;
        const Bind: Bind;
        const Connect: Connect;
        const Database: Database;
        const DatabaseInitialization: DatabaseInitialization;
        const DatabaseOpen: DatabaseOpen;
        const DatabaseRead: DatabaseRead;
        const DatabaseWrite: DatabaseWrite;
        const NetronIllegalState: NetronIllegalState;
        const NetronPeerDisconnected: NetronPeerDisconnected;
        const NetronTimeout: NetronTimeout;
    }
}
