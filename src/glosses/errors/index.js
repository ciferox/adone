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

export class RuntimeException extends Exception { }
export class IncompleteBufferException extends Exception { }
export class NotImplementedException extends Exception { }
export class IllegalStateException extends Exception { }
export class NotValidException extends Exception { }
export class UnknownException extends Exception { }
export class NotExistsException extends Exception { }
export class ExistsException extends Exception { }
export class EmptyException extends Exception { }
export class InvalidAccessException extends Exception { }
export class NotSupportedException extends Exception { }
export class InvalidArgumentException extends Exception { }
export class InvalidNumberOfArgumentsException extends Exception { }
export class NotFoundException extends Exception { }
export class TimeoutException extends Exception { }
export class IncorrectException extends Exception { }
export class NotAllowedException extends Exception { }
export class LimitExceededException extends Exception { }
export class EncodingException extends Exception { }
export class ImmutableException extends Exception { }

export class NetworkException extends Exception { }
export class BindException extends NetworkException { }
export class ConnectException extends NetworkException { }

export class DatabaseException extends Exception { }
export class DatabaseInitializationException extends DatabaseException { }
export class DatabaseOpenException extends DatabaseException { }
export class DatabaseReadException extends DatabaseException { }
export class DatabaseWriteException extends DatabaseException { }


export class NetronIllegalStateException extends Exception { }
export class NetronPeerDisconnectedException extends Exception { }
export class NetronTimeoutException extends Exception { }

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
    11: RuntimeException,
    12: IncompleteBufferException,
    13: NotImplementedException,
    14: IllegalStateException,
    15: NotValidException,
    16: UnknownException,
    17: NotExistsException,
    18: ExistsException,
    19: EmptyException,
    20: InvalidAccessException,
    21: NotSupportedException,
    22: InvalidArgumentException,
    23: InvalidNumberOfArgumentsException,
    24: NotFoundException,
    25: TimeoutException,
    26: IncorrectException,
    27: NotAllowedException,
    28: LimitExceededException,
    29: EncodingException,
    30: ImmutableException,
    99: AggregateException,

    100: NetworkException,
    101: BindException,
    102: ConnectException,

    110: DatabaseException,
    111: DatabaseInitializationException,
    112: DatabaseOpenException,
    113: DatabaseReadException,
    114: DatabaseWriteException,

    1000: NetronIllegalStateException,
    1001: NetronPeerDisconnectedException,
    1002: NetronTimeoutException
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


adone.lazify({
    stack: "./stack"
}, exports, require);
