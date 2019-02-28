const {
    is,
    error,
    util,
    shani: { util: { __ } }
} = adone;

const useLeftMostCallback = -1;
const useRightMostCallback = -2;

const getCallback = (behavior, args) => {
    const callArgAt = behavior.callArgAt;

    if (callArgAt >= 0) {
        return args[callArgAt];
    }

    let argumentList;

    if (callArgAt === useLeftMostCallback) {
        argumentList = args;
    }

    if (callArgAt === useRightMostCallback) {
        argumentList = [...args].reverse();
    }

    const callArgProp = behavior.callArgProp;

    for (let i = 0, l = argumentList.length; i < l; ++i) {
        if (!callArgProp && is.function(argumentList[i])) {
            return argumentList[i];
        }

        if (callArgProp && argumentList[i] && is.function(argumentList[i][callArgProp])) {
            return argumentList[i][callArgProp];
        }
    }

    return null;
};

const { prototype: { join } } = Array;

const getCallbackError = (behavior, func, args) => {
    if (behavior.callArgAt < 0) {
        let msg;

        if (behavior.callArgProp) {
            msg = `${adone.assertion.util.getName(behavior.stub)} expected to yield to '${__.util.valueToString(behavior.callArgProp)}', but no object with such a property was passed.`;
        } else {
            msg = `${adone.assertion.util.getName(behavior.stub)} expected to yield, but no callback was passed.`;
        }

        if (args.length > 0) {
            msg += ` Received [${join.call(args, ", ")}]`;
        }

        return msg;
    }

    return `argument at index ${behavior.callArgAt} is not a function: ${func}`;
};

const callCallback = (behavior, args) => {
    if (is.number(behavior.callArgAt)) {
        const func = getCallback(behavior, args);

        if (!is.function(func)) {
            throw new error.InvalidArgumentException(getCallbackError(behavior, func, args));
        }

        if (behavior.callbackAsync) {
            process.nextTick(() => {
                func.apply(behavior.callbackContext, behavior.callbackArguments);
            });
        } else {
            func.apply(behavior.callbackContext, behavior.callbackArguments);
        }
    }
};

export const proto = {
    create(stub) {
        const behavior = Object.assign({}, proto);
        delete behavior.create;
        delete behavior.addBehavior;
        delete behavior.createBehavior;
        behavior.stub = stub;

        if (stub.defaultBehavior && stub.defaultBehavior.promiseLibrary) {
            behavior.promiseLibrary = stub.defaultBehavior.promiseLibrary;
        }

        return behavior;
    },
    isPresent() {
        return is.number(this.callArgAt)
            || this.error
            || this.exceptionCreator
            || is.number(this.returnArgAt)
            || this.returnThis
            || this.resolveThis
            || is.number(this.throwArgAt)
            || this.fakeFn
            || this.returnValueDefined;
    },
    invoke(context, args) {
        callCallback(this, args);

        if (this.error) {
            throw this.error;
        } else if (this.exceptionCreator) {
            this.error = this.exceptionCreator();
            this.exceptionCreator = undefined;
            throw this.error;
        } else if (is.number(this.returnArgAt)) {
            return args[this.returnArgAt];
        } else if (this.returnThis) {
            return context;
        } else if (is.number(this.throwArgAt)) {
            if (args.length < this.throwArgAt) {
                throw new error.InvalidArgumentException(`throwArgs failed: ${this.throwArgAt} arguments required but only ${args.length} present`);
            }
            throw args[this.throwArgAt];
        } else if (this.fakeFn) {
            return this.fakeFn.apply(context, args);
        } else if (this.resolveThis) {
            return (this.promiseLibrary || Promise).resolve(context);
        } else if (this.resolve) {
            return (this.promiseLibrary || Promise).resolve(this.returnValue);
        } else if (this.reject) {
            return (this.promiseLibrary || Promise).reject(this.returnValue);
        } else if (this.callsThrough) {
            return this.stub.wrappedMethod.apply(context, args);
        }
        return this.returnValue;
    },
    onCall(index) {
        return this.stub.onCall(index);
    },
    onFirstCall() {
        return this.stub.onFirstCall();
    },
    onSecondCall() {
        return this.stub.onSecondCall();
    },
    onThirdCall() {
        return this.stub.onThirdCall();
    },
    withArgs(/* arguments */) {
        throw new Error(
            "Defining a stub by invoking \"stub.onCall(...).withArgs(...)\" " +
            "is not supported. Use \"stub.withArgs(...).onCall(...)\" " +
            "to define sequential behavior for calls with certain arguments."
        );
    }
};

const createAsyncVersion = (syncFnName) => function (...args) {
    const result = this[syncFnName].apply(this, args);
    this.callbackAsync = true;
    return result;
};

// create asynchronous versions of callsArg* and yields* methods
for (const name of util.keys(proto)) {
    // need to avoid creating anotherasync versions of the newly added async methods
    if (name.match(/^(callsArg|yields)/) && !name.match(/Async/)) {
        proto[`${name}Async`] = createAsyncVersion(name);
    }
}

const createBehavior = (behaviorMethod) => function (...args) {
    this.defaultBehavior = this.defaultBehavior || proto.create(this);
    this.defaultBehavior[behaviorMethod].apply(this.defaultBehavior, args);
    return this;
};

const addBehavior = (stub, name, fn) => {
    proto[name] = function (...args) {
        fn.call(this, this, ...args);
        return this.stub || this;
    };

    stub[name] = createBehavior(name);
};

proto.addBehavior = addBehavior;
proto.createBehavior = createBehavior;
module.exports = proto;
