const {
    is
} = adone;

adone.asNamespace(exports);

export const exceptionIdMap = {};
export const stdIdMap = {};
export const stdExceptions = [];
export const adoneExceptions = [];

export class Exception extends Error {
    constructor(message, captureStackTrace = true) {
        if (message instanceof Error) {
            super(message.message);
            this.stack = message.stack;
        } else {
            super(message);
            // special case for mpak-serializer
            if (adone.is.null(message)) {
                return;
            }

            this.message = message;

            if (captureStackTrace) {
                Error.captureStackTrace(this, this.constructor);
            }

        }

        this.id = exceptionIdMap[this.constructor];
        Object.defineProperty(this, "name", {
            enumerable: true,
            value: this.constructor.name,
            writable: true
        });
        // void this.stack;
    }
}

export class Runtime extends Exception { }
export class IncompleteBufferError extends Exception { }
export class NotImplemented extends Exception { }
export class IllegalState extends Exception { }
export class NotValid extends Exception { }
export class Unknown extends Exception { }
export class NotExists extends Exception { }
export class Exists extends Exception { }
export class Empty extends Exception { }
export class InvalidAccess extends Exception { }
export class NotSupported extends Exception { }
export class InvalidArgument extends Exception { }
export class InvalidNumberOfArguments extends Exception { }
export class NotFound extends Exception { }
export class Timeout extends Exception { }
export class Incorrect extends Exception { }
export class NotAllowed extends Exception { }
export class LimitExceeded extends Exception { }
export class Encoding extends Exception { }

export class Network extends Exception { }
export class Bind extends Network { }
export class Connect extends Network { }

export class Database extends Exception { }
export class DatabaseInitialization extends Database { }
export class DatabaseOpen extends Database { }
export class DatabaseRead extends Database { }
export class DatabaseWrite extends Database { }

export class NetronIllegalState extends Exception { }
export class NetronPeerDisconnected extends Exception { }
export class NetronTimeout extends Exception { }

const extractPathRegex = /\s+at.*(?:\(|\s)(.*)\)?/;
const pathRegex = /^(?:(?:(?:node|(?:internal\/[\w/]*|.*node_modules\/babel-polyfill\/.*)?\w+)\.js:\d+:\d+)|native)/;
const homeDir = adone.std.os.homedir();

export const cleanStack = (stack, { pretty = false } = {}) => {
    return stack.replace(/\\/g, "/")
        .split("\n")
        .filter((x) => {
            const pathMatches = x.match(extractPathRegex);
            if (is.null(pathMatches) || !pathMatches[1]) {
                return true;
            }

            const match = pathMatches[1];

            // Electron
            if (match.includes(".app/Contents/Resources/electron.asar") ||
                match.includes(".app/Contents/Resources/default_app.asar")) {
                return false;
            }

            return !pathRegex.test(match);
        })
        .filter((x) => x.trim() !== "")
        .map((x) => {
            if (pretty) {
                return x.replace(extractPathRegex, (m, p1) => m.replace(p1, p1.replace(homeDir, "~")));
            }

            return x;
        })
        .join("\n");
};

const cleanInternalStack = (stack) => stack.replace(/\s+at .*aggregate-error\/index.js:\d+:\d+\)?/g, "");

export class AggregateException extends Exception {
    constructor(errors) {
        // Even though strings are iterable, we don't allow them to prevent subtle user mistakes
        if (!errors[Symbol.iterator] || is.string(errors)) {
            throw new TypeError(`Expected input to be iterable, got ${typeof errors}`);
        }

        errors = Array.from(errors).map((err) => err instanceof Error ? err : new Error(err));

        let message = errors.map((err) => cleanInternalStack(cleanStack(err.stack))).join("\n");
        message = `\n${adone.text.indent(message, 4)}`;

        super(message);
        Object.defineProperty(this, "_errors", { value: errors });
    }

    *[Symbol.iterator]() {
        for (const error of this._errors) {
            yield error;
        }
    }
}


export const idExceptionMap = {
    1: Error,
    2: SyntaxError,
    3: TypeError,
    4: ReferenceError,
    5: RangeError,
    6: EvalError,
    7: URIError,

    10: Exception,
    11: Runtime,
    12: IncompleteBufferError,
    13: NotImplemented,
    14: IllegalState,
    15: NotValid,
    16: Unknown,
    17: NotExists,
    18: Exists,
    19: Empty,
    20: InvalidAccess,
    21: NotSupported,
    22: InvalidArgument,
    23: InvalidNumberOfArguments,
    24: NotFound,
    25: Timeout,
    26: Incorrect,
    27: NotAllowed,
    28: LimitExceeded,
    29: Encoding,
    99: AggregateException,

    100: Network,
    101: Bind,
    102: Connect,

    110: Database,
    111: DatabaseInitialization,
    112: DatabaseOpen,
    113: DatabaseRead,
    114: DatabaseWrite,

    1000: NetronIllegalState,
    1001: NetronPeerDisconnected,
    1002: NetronTimeout
};

const keys = Object.keys(idExceptionMap);
for (let i = 0; i < keys.length; i++) {
    const keyName = keys[i];

    const ExceptionClass = idExceptionMap[keyName];
    exceptionIdMap[ExceptionClass] = Number.parseInt(keyName, 10);

    if (keyName < 10) {
        stdExceptions.push(ExceptionClass);
        stdIdMap[ExceptionClass.name] = keyName;
    } else if (keyName < 1000) {
        adoneExceptions.push(ExceptionClass);
    }
}

export const create = (id, message, stack) => {
    const err = new idExceptionMap[id](message);
    err.stack = stack;
    return err;
};

export const getStdId = (err) => stdIdMap[err.constructor.name];

export const captureStack = (reason) => {
    const e = new Error();
    const stack = e.stack.split("\n").slice(2).join("\n");
    if (reason) {
        return `Stack capture: ${reason}\n${stack}`;
    }
    return stack;
};
