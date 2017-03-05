export class Exception extends Error {
    constructor(message) {
        super(message);

        // special case for mpak-serializer
        if (message === null) {
            return;
        }
        // eslint-disable-next-line
        this.id = exceptionIdMap[this.constructor];
        this.message = message;

        Error.captureStackTrace(this, this.constructor);
        void this.stack;
    }
}
Exception.prototype.name = "Exception";

export class Runtime extends Exception { }
Runtime.prototype.name = "Runtime";
export class IncompleteBufferError extends Exception { }
IncompleteBufferError.prototype.name = "IncompleteBufferError";
export class NotImplemented extends Exception { }
NotImplemented.prototype.name = "NotImplemented";
export class IllegalState extends Exception { }
IllegalState.prototype.name = "IllegalState";
export class NotValid extends Exception { }
NotValid.prototype.name = "NotValid";
export class Unknown extends Exception { }
Unknown.prototype.name = "Unknown";
export class NotExists extends Exception { }
NotExists.prototype.name = "NotExists";
export class Exists extends Exception { }
Exists.prototype.name = "Exists";
export class Empty extends Exception { }
Empty.prototype.name = "Empty";
export class InvalidAccess extends Exception { }
InvalidAccess.prototype.name = "InvalidAccess";
export class NotSupported extends Exception { }
NotSupported.prototype.name = "NotSupported";
export class InvalidArgument extends Exception { }
InvalidArgument.prototype.name = "InvalidArgument";
export class InvalidNumberOfArguments extends Exception { }
InvalidNumberOfArguments.prototype.name = "InvalidNumberOfArguments";
export class NotFound extends Exception { }
NotFound.prototype.name = "NotFound";
export class Timeout extends Exception { }
Timeout.prototype.name = "Timeout";
export class Incorrect extends Exception { }
Incorrect.prototype.name = "Incorrect";
export class NotAllowed extends Exception { }
NotAllowed.prototype.name = "NotAllowed";
export class LimitExceeded extends Exception { }
LimitExceeded.prototype.name = "LimitExceeded";

export class Network extends Exception { }
Network.prototype.name = "Network";
export class Bind extends Network { }
Bind.prototype.name = "Bind";
export class Connect extends Network { }
Connect.prototype.name = "Connect";

export class NetronIllegalState extends Exception { }
NetronIllegalState.prototype.name = "NetronIllegalState";
export class NetronPeerDisconnected extends Exception {}
NetronPeerDisconnected.prototype.name = "NetronPeerDisconnected";
export class NetronTimeout extends Exception {}
NetronTimeout.prototype.name = "NetronTimeout";

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

    100: Network,
    101: Bind,
    102: Connect,

    1000: NetronIllegalState,
    1001: NetronPeerDisconnected,
    1002: NetronTimeout
};

export const exceptionIdMap = {};
export const stdIdMap = {};
export const stdExceptions = [];
export const adoneExceptions = [];

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

export default function create(id, { args, stack }) {
    const err = new idExceptionMap[id](...args);
    err.stack = stack;
    return err;
}

export const createException = (id, message, stack) => {
    const err = new idExceptionMap[id](message);
    err.stack = stack;
    return err;
};

export const getStdId = (err) => stdIdMap[err.constructor.name];

export const wrap = (err, { name = false } = {}) => {
    if (err instanceof Exception) {
        return err;
    }
    const e = new Exception(name ? `${err.name}: ${err.message}` : err.message);
    e.stack = err.stack;
    return e;
};
