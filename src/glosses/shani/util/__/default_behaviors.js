const { is, util, x } = adone;

const useLeftMostCallback = -1;
const useRightMostCallback = -2;

const throwsException = (fake, error, message) => {
    if (is.string(error)) {
        fake.exception = new x.Exception(message || "");
        fake.exception.name = error;
    } else if (!error) {
        fake.exception = new x.Exception("Error");
    } else if (is.function(error)) {
        fake.exception = new error(message);
    } else {
        fake.exception = error;
    }
};

const behaviors = {
    callsFake(fake, fn) {
        fake.fakeFn = fn;
    },
    callsArg(fake, pos) {
        if (!is.number(pos)) {
            throw new x.InvalidArgument("argument index is not number");
        }

        fake.callArgAt = pos;
        fake.callbackArguments = [];
        fake.callbackContext = undefined;
        fake.callArgProp = undefined;
        fake.callbackAsync = false;
    },
    callsArgOn(fake, pos, context) {
        if (!is.number(pos)) {
            throw new x.InvalidArgument("argument index is not number");
        }

        fake.callArgAt = pos;
        fake.callbackArguments = [];
        fake.callbackContext = context;
        fake.callArgProp = undefined;
        fake.callbackAsync = false;
    },
    callsArgWith(fake, pos, ...callbackArguments) {
        if (!is.number(pos)) {
            throw new x.InvalidArgument("argument index is not number");
        }

        fake.callArgAt = pos;
        fake.callbackArguments = callbackArguments;
        fake.callbackContext = undefined;
        fake.callArgProp = undefined;
        fake.callbackAsync = false;
    },
    callsArgOnWith(fake, pos, context, ...callbackArguments) {
        if (!is.number(pos)) {
            throw new x.InvalidArgument("argument index is not number");
        }

        fake.callArgAt = pos;
        fake.callbackArguments = callbackArguments;
        fake.callbackContext = context;
        fake.callArgProp = undefined;
        fake.callbackAsync = false;
    },
    usingPromise(fake, promiseLibrary) {
        fake.promiseLibrary = promiseLibrary;
    },
    yields(fake, ...callbackArguments) {
        fake.callArgAt = useLeftMostCallback;
        fake.callbackArguments = callbackArguments;
        fake.callbackContext = undefined;
        fake.callArgProp = undefined;
        fake.callbackAsync = false;
    },
    yieldsRight(fake, ...callbackArguments) {
        fake.callArgAt = useRightMostCallback;
        fake.callbackArguments = callbackArguments;
        fake.callbackContext = undefined;
        fake.callArgProp = undefined;
        fake.callbackAsync = false;
    },
    yieldsOn(fake, context, ...callbackArguments) {
        if (!context) {
            throw new x.InvalidArgument("context is falsy");
        }
        fake.callArgAt = useLeftMostCallback;
        fake.callbackArguments = callbackArguments;
        fake.callbackContext = context;
        fake.callArgProp = undefined;
        fake.callbackAsync = false;
    },
    yieldsTo(fake, prop, ...callbackArguments) {
        fake.callArgAt = useLeftMostCallback;
        fake.callbackArguments = callbackArguments;
        fake.callbackContext = undefined;
        fake.callArgProp = prop;
        fake.callbackAsync = false;
    },
    yieldsToOn(fake, prop, context, ...callbackArguments) {
        fake.callArgAt = useLeftMostCallback;
        fake.callbackArguments = callbackArguments;
        fake.callbackContext = context;
        fake.callArgProp = prop;
        fake.callbackAsync = false;
    },
    throws: throwsException,
    throwsException,
    returns(fake, value) {
        fake.returnValue = value;
        fake.resolve = false;
        fake.reject = false;
        fake.returnValueDefined = true;
        fake.exception = undefined;
        fake.fakeFn = undefined;
    },
    returnsArg(fake, pos) {
        if (!is.number(pos)) {
            throw new x.InvalidArgument("argument index is not number");
        }

        fake.returnArgAt = pos;
    },
    throwsArg(fake, pos) {
        if (!is.number(pos)) {
            throw new x.InvalidArgument("argument index is not number");
        }

        fake.throwArgAt = pos;
    },
    returnsThis(fake) {
        fake.returnThis = true;
    },
    resolves(fake, value) {
        fake.returnValue = value;
        fake.resolve = true;
        fake.reject = false;
        fake.returnValueDefined = true;
        fake.exception = undefined;
        fake.fakeFn = undefined;
    },
    rejects(fake, error, message) {
        let reason;
        if (is.string(error)) {
            reason = new x.Exception(message || "");
            reason.name = error;
        } else if (!error) {
            reason = new x.Exception("Error");
        } else {
            reason = error;
        }
        fake.returnValue = reason;
        fake.resolve = false;
        fake.reject = true;
        fake.returnValueDefined = true;
        fake.exception = undefined;
        fake.fakeFn = undefined;

        return fake;
    },
    callThrough(fake) {
        fake.callsThrough = true;
    },
    get(fake, getterFunction) {
        const rootStub = fake.stub || fake;

        Object.defineProperty(rootStub.rootObj, rootStub.propName, {
            get: getterFunction,
            configurable: true
        });

        return fake;
    },
    set(fake, setterFunction) {
        const rootStub = fake.stub || fake;

        Object.defineProperty(rootStub.rootObj, rootStub.propName, {
            set: setterFunction,
            configurable: true
        });

        return fake;
    },
    value(fake, newVal) {
        const rootStub = fake.stub || fake;

        Object.defineProperty(rootStub.rootObj, rootStub.propName, {
            value: newVal,
            enumerable: true,
            configurable: true
        });

        return fake;
    }
};

const createAsyncVersion = (syncFnName) => function (...args) {
    const result = behaviors[syncFnName].apply(this, args);
    this.callbackAsync = true;
    return result;
};

// create asynchronous versions of callsArg* and yields* methods
for (const name of util.keys(behaviors)) {
    // need to avoid creating anotherasync versions of the newly added async methods
    if (name.match(/^(callsArg|yields)/) && !name.match(/Async/)) {
        behaviors[`${name}Async`] = createAsyncVersion(name);
    }
}

export default behaviors;
