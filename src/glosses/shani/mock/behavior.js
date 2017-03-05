/**
 * Stub behavior
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @author Tim Fischbach (mail@timfischbach.de)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
import extend from "./util/extend";
import functionName from "./util/function-name";
import valueToString from "./util/value-to-string";

const slice = Array.prototype.slice;
const join = Array.prototype.join;
const useLeftMostCallback = -1;
const useRightMostCallback = -2;

function throwsException(error, message) {
    if (typeof error === "string") {
        this.exception = new Error(message || "");
        this.exception.name = error;
    } else if (!error) {
        this.exception = new Error("Error");
    } else {
        this.exception = error;
    }

    return this;
}

function getCallback(behavior, args) {
    const callArgAt = behavior.callArgAt;

    if (callArgAt >= 0) {
        return args[callArgAt];
    }

    let argumentList;

    if (callArgAt === useLeftMostCallback) {
        argumentList = args;
    }

    if (callArgAt === useRightMostCallback) {
        argumentList = slice.call(args).reverse();
    }

    const callArgProp = behavior.callArgProp;

    for (let i = 0, l = argumentList.length; i < l; ++i) {
        if (!callArgProp && typeof argumentList[i] === "function") {
            return argumentList[i];
        }

        if (callArgProp && argumentList[i] &&
            typeof argumentList[i][callArgProp] === "function") {
            return argumentList[i][callArgProp];
        }
    }

    return null;
}

function getCallbackError(behavior, func, args) {
    if (behavior.callArgAt < 0) {
        let msg;

        if (behavior.callArgProp) {
            msg = functionName(behavior.stub) +
                " expected to yield to '" + valueToString(behavior.callArgProp) +
                "', but no object with such a property was passed.";
        } else {
            msg = functionName(behavior.stub) +
                " expected to yield, but no callback was passed.";
        }

        if (args.length > 0) {
            msg += " Received [" + join.call(args, ", ") + "]";
        }

        return msg;
    }

    return "argument at index " + behavior.callArgAt + " is not a function: " + func;
}

function callCallback(behavior, args) {
    if (typeof behavior.callArgAt === "number") {
        const func = getCallback(behavior, args);

        if (typeof func !== "function") {
            throw new TypeError(getCallbackError(behavior, func, args));
        }

        if (behavior.callbackAsync) {
            process.nextTick(function () {
                func.apply(behavior.callbackContext, behavior.callbackArguments);
            });
        } else {
            func.apply(behavior.callbackContext, behavior.callbackArguments);
        }
    }
}

const proto = {
    create: function create(stub) {
        const behavior = extend({}, proto);
        delete behavior.create;
        behavior.stub = stub;

        return behavior;
    },

    isPresent: function isPresent() {
        return (typeof this.callArgAt === "number" ||
                this.exception ||
                typeof this.returnArgAt === "number" ||
                this.returnThis ||
                this.fakeFn ||
                this.returnValueDefined);
    },

    invoke: function invoke(context, args) {
        callCallback(this, args);

        if (this.exception) {
            throw this.exception;
        } else if (typeof this.returnArgAt === "number") {
            return args[this.returnArgAt];
        } else if (this.returnThis) {
            return context;
        } else if (this.fakeFn) {
            return this.fakeFn.apply(context, args);
        } else if (this.resolve) {
            return Promise.resolve(this.returnValue);
        } else if (this.reject) {
            return Promise.reject(this.returnValue);
        }
        return this.returnValue;
    },

    onCall: function onCall(index) {
        return this.stub.onCall(index);
    },

    onFirstCall: function onFirstCall() {
        return this.stub.onFirstCall();
    },

    onSecondCall: function onSecondCall() {
        return this.stub.onSecondCall();
    },

    onThirdCall: function onThirdCall() {
        return this.stub.onThirdCall();
    },

    withArgs: function withArgs(/* arguments */) {
        throw new Error(
            "Defining a stub by invoking \"stub.onCall(...).withArgs(...)\" " +
            "is not supported. Use \"stub.withArgs(...).onCall(...)\" " +
            "to define sequential behavior for calls with certain arguments."
        );
    },

    callsFake: function callsFake(fn) {
        this.fakeFn = fn;
        return this;
    },

    callsArg: function callsArg(pos) {
        if (typeof pos !== "number") {
            throw new TypeError("argument index is not number");
        }

        this.callArgAt = pos;
        this.callbackArguments = [];
        this.callbackContext = undefined;
        this.callArgProp = undefined;
        this.callbackAsync = false;

        return this;
    },

    callsArgOn: function callsArgOn(pos, context) {
        if (typeof pos !== "number") {
            throw new TypeError("argument index is not number");
        }

        this.callArgAt = pos;
        this.callbackArguments = [];
        this.callbackContext = context;
        this.callArgProp = undefined;
        this.callbackAsync = false;

        return this;
    },

    callsArgWith: function callsArgWith(pos) {
        if (typeof pos !== "number") {
            throw new TypeError("argument index is not number");
        }

        this.callArgAt = pos;
        this.callbackArguments = slice.call(arguments, 1);
        this.callbackContext = undefined;
        this.callArgProp = undefined;
        this.callbackAsync = false;

        return this;
    },

    callsArgOnWith: function callsArgWith(pos, context) {
        if (typeof pos !== "number") {
            throw new TypeError("argument index is not number");
        }

        this.callArgAt = pos;
        this.callbackArguments = slice.call(arguments, 2);
        this.callbackContext = context;
        this.callArgProp = undefined;
        this.callbackAsync = false;

        return this;
    },

    yields: function () {
        this.callArgAt = useLeftMostCallback;
        this.callbackArguments = slice.call(arguments, 0);
        this.callbackContext = undefined;
        this.callArgProp = undefined;
        this.callbackAsync = false;

        return this;
    },

    yieldsRight: function () {
        this.callArgAt = useRightMostCallback;
        this.callbackArguments = slice.call(arguments, 0);
        this.callbackContext = undefined;
        this.callArgProp = undefined;
        this.callbackAsync = false;

        return this;
    },

    yieldsOn: function (context) {
        if (!context){
            throw new TypeError("No context is specified");
        }
        this.callArgAt = useLeftMostCallback;
        this.callbackArguments = slice.call(arguments, 1);
        this.callbackContext = context;
        this.callArgProp = undefined;
        this.callbackAsync = false;

        return this;
    },

    yieldsTo: function (prop) {
        this.callArgAt = useLeftMostCallback;
        this.callbackArguments = slice.call(arguments, 1);
        this.callbackContext = undefined;
        this.callArgProp = prop;
        this.callbackAsync = false;

        return this;
    },

    yieldsToOn: function (prop, context) {
        this.callArgAt = useLeftMostCallback;
        this.callbackArguments = slice.call(arguments, 2);
        this.callbackContext = context;
        this.callArgProp = prop;
        this.callbackAsync = false;

        return this;
    },

    throws: throwsException,
    throwsException: throwsException,

    returns: function returns(value) {
        this.returnValue = value;
        this.resolve = false;
        this.reject = false;
        this.returnValueDefined = true;
        this.exception = undefined;
        this.fakeFn = undefined;

        return this;
    },

    returnsArg: function returnsArg(pos) {
        if (typeof pos !== "number") {
            throw new TypeError("argument index is not number");
        }

        this.returnArgAt = pos;

        return this;
    },

    returnsThis: function returnsThis() {
        this.returnThis = true;

        return this;
    },

    resolves: function resolves(value) {
        this.returnValue = value;
        this.resolve = true;
        this.reject = false;
        this.returnValueDefined = true;
        this.exception = undefined;
        this.fakeFn = undefined;

        return this;
    },

    rejects: function rejects(error, message) {
        let reason;
        if (typeof error === "string") {
            reason = new Error(message || "");
            reason.name = error;
        } else if (!error) {
            reason = new Error("Error");
        } else {
            reason = error;
        }
        this.returnValue = reason;
        this.resolve = false;
        this.reject = true;
        this.returnValueDefined = true;
        this.exception = undefined;
        this.fakeFn = undefined;

        return this;
    }
};

function createAsyncVersion(syncFnName) {
    return function () {
        const result = this[syncFnName].apply(this, arguments);
        this.callbackAsync = true;
        return result;
    };
}

// create asynchronous versions of callsArg* and yields* methods
for (const method in proto) {
    // need to avoid creating anotherasync versions of the newly added async methods
    if (proto.hasOwnProperty(method) && method.match(/^(callsArg|yields)/) && !method.match(/Async/)) {
        proto[method + "Async"] = createAsyncVersion(method);
    }
}

export default proto;
