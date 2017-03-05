/**
  * Spy calls
  *
  * @author Christian Johansen (christian@cjohansen.no)
  * @author Maximilian Antoni (mail@maxantoni.de)
  * @license BSD
  *
  * Copyright (c) 2010-2013 Christian Johansen
  * Copyright (c) 2013 Maximilian Antoni
  */
import match from "./match";
import deepEqual from "./util/deep-equal";
import functionName from "./util/function-name";
import format from "./util/format";
import valueToString from "./util/value-to-string";
const slice = Array.prototype.slice;

function throwYieldError(proxy, text, args) {
    let msg = functionName(proxy) + text;
    if (args.length) {
        msg += " Received [" + slice.call(args).join(", ") + "]";
    }
    throw new Error(msg);
}

class ProxyCall
{
    calledOn(thisValue) {
        if (match && match.isMatcher(thisValue)) {
            return thisValue.test(this.thisValue);
        }
        return this.thisValue === thisValue;
    }

    calledWith() {
        const l = arguments.length;
        if (l > this.args.length) {
            return false;
        }
        for (let i = 0; i < l; i += 1) {
            if (!deepEqual(arguments[i], this.args[i])) {
                return false;
            }
        }

        return true;
    }

    calledWithMatch() {
        const l = arguments.length;
        if (l > this.args.length) {
            return false;
        }
        for (let i = 0; i < l; i += 1) {
            const actual = this.args[i];
            const expectation = arguments[i];
            if (!match || !match(expectation).test(actual)) {
                return false;
            }
        }
        return true;
    }

    calledWithExactly() {
        return arguments.length === this.args.length &&
            this.calledWith.apply(this, arguments);
    }

    notCalledWith() {
        return !this.calledWith.apply(this, arguments);
    }

    notCalledWithMatch() {
        return !this.calledWithMatch.apply(this, arguments);
    }

    returned(value) {
        return deepEqual(value, this.returnValue);
    }

    threw(error) {
        if (typeof error === "undefined" || !this.exception) {
            return !!this.exception;
        }

        return this.exception === error || this.exception.name === error;
    }

    calledWithNew() {
        return this.proxy.prototype && this.thisValue instanceof this.proxy;
    }

    calledBefore(other) {
        return this.callId < other.callId;
    }

    calledAfter(other) {
        return this.callId > other.callId;
    }

    callArg(pos) {
        this.args[pos]();
    }

    callArgOn(pos, thisValue) {
        this.args[pos].apply(thisValue);
    }

    callArgWith(pos) {
        this.callArgOnWith.apply(this, [pos, null].concat(slice.call(arguments, 1)));
    }

    callArgOnWith(pos, thisValue) {
        const args = slice.call(arguments, 2);
        this.args[pos].apply(thisValue, args);
    }

    "yield"() {
        this.yieldOn.apply(this, [null].concat(slice.call(arguments, 0)));
    }

    yieldOn(thisValue) {
        const args = this.args;
        for (let i = 0, l = args.length; i < l; ++i) {
            if (typeof args[i] === "function") {
                args[i].apply(thisValue, slice.call(arguments, 1));
                return;
            }
        }
        throwYieldError(this.proxy, " cannot yield since no callback was passed.", args);
    }

    yieldTo(prop) {
        this.yieldToOn.apply(this, [prop, null].concat(slice.call(arguments, 1)));
    }

    yieldToOn(prop, thisValue) {
        const args = this.args;
        for (let i = 0, l = args.length; i < l; ++i) {
            if (args[i] && typeof args[i][prop] === "function") {
                args[i][prop].apply(thisValue, slice.call(arguments, 2));
                return;
            }
        }
        throwYieldError(this.proxy, " cannot yield to '" + valueToString(prop) +
            "' since no callback was passed.", args);
    }

    toString() {
        let callStr = this.proxy ? this.proxy.toString() + "(" : "";
        const args = [];

        if (!this.args) {
            return ":(";
        }

        for (let i = 0, l = this.args.length; i < l; ++i) {
            args.push(format(this.args[i]));
        }

        callStr = callStr + args.join(", ") + ")";

        if (typeof this.returnValue !== "undefined") {
            callStr += " => " + format(this.returnValue);
        }

        if (this.exception) {
            callStr += " !" + this.exception.name;

            if (this.exception.message) {
                callStr += "(" + this.exception.message + ")";
            }
        }
        if (this.stack) {
            // Omit the error message and the two top stack frames in mock itself:
            callStr += this.stack.split("\n")[3].replace(/^\s*(?:at\s+|@)?/, " at ");
        }

        return callStr;
    }
}

ProxyCall.prototype.invokeCallback = ProxyCall.prototype.yield;

function createSpyCall(spy, thisValue, args, returnValue, exception, id, stack) {
    if (typeof id !== "number") {
        throw new TypeError("Call id is not a number");
    }
    const proxyCall = new ProxyCall();
    proxyCall.proxy = spy;
    proxyCall.thisValue = thisValue;
    proxyCall.args = args;
    proxyCall.returnValue = returnValue;
    proxyCall.exception = exception;
    proxyCall.callId = id;
    proxyCall.stack = stack;

    return proxyCall;
}

export default createSpyCall;
export const toString = ProxyCall.prototype.toString; // used by mocks
