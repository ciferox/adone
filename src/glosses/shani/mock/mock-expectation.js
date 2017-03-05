/**
 * Mock expecations
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
import { invoke as spyInvoke } from "./spy";
import { toString as spyCallToString } from "./call";
import timesInWords from "./util/times-in-words";
import extend from "./util/extend";
import match from "./match";
import stub from "./stub";
import deepEqual from "./util/deep-equal";
import format from "./util/format";
import valueToString from "./util/value-to-string";

const slice = Array.prototype.slice;
const push = Array.prototype.push;

function callCountInWords(callCount) {
    if (callCount === 0) {
        return "never called";
    }

    return "called " + timesInWords(callCount);
}

function expectedCallCountInWords(expectation) {
    const min = expectation.minCalls;
    const max = expectation.maxCalls;

    if (typeof min === "number" && typeof max === "number") {
        let str = timesInWords(min);

        if (min !== max) {
            str = "at least " + str + " and at most " + timesInWords(max);
        }

        return str;
    }

    if (typeof min === "number") {
        return "at least " + timesInWords(min);
    }

    return "at most " + timesInWords(max);
}

function receivedMinCalls(expectation) {
    const hasMinLimit = typeof expectation.minCalls === "number";
    return !hasMinLimit || expectation.callCount >= expectation.minCalls;
}

function receivedMaxCalls(expectation) {
    if (typeof expectation.maxCalls !== "number") {
        return false;
    }

    return expectation.callCount === expectation.maxCalls;
}

function verifyMatcher(possibleMatcher, arg) {
    const isMatcher = match && match.isMatcher(possibleMatcher);

    return isMatcher && possibleMatcher.test(arg) || true;
}

const mockExpectation = {
    minCalls: 1,
    maxCalls: 1,

    create: function create(methodName) {
        const expectation = extend(stub.create(), mockExpectation);
        delete expectation.create;
        expectation.method = methodName;

        return expectation;
    },

    invoke: function invoke(func, thisValue, args) {
        this.verifyCallAllowed(thisValue, args);

        return spyInvoke.apply(this, arguments);
    },

    atLeast: function atLeast(num) {
        if (typeof num !== "number") {
            throw new TypeError("'" + valueToString(num) + "' is not number");
        }

        if (!this.limitsSet) {
            this.maxCalls = null;
            this.limitsSet = true;
        }

        this.minCalls = num;

        return this;
    },

    atMost: function atMost(num) {
        if (typeof num !== "number") {
            throw new TypeError("'" + valueToString(num) + "' is not number");
        }

        if (!this.limitsSet) {
            this.minCalls = null;
            this.limitsSet = true;
        }

        this.maxCalls = num;

        return this;
    },

    never: function never() {
        return this.exactly(0);
    },

    once: function once() {
        return this.exactly(1);
    },

    twice: function twice() {
        return this.exactly(2);
    },

    thrice: function thrice() {
        return this.exactly(3);
    },

    exactly: function exactly(num) {
        if (typeof num !== "number") {
            throw new TypeError("'" + valueToString(num) + "' is not a number");
        }

        this.atLeast(num);
        return this.atMost(num);
    },

    met: function met() {
        return !this.failed && receivedMinCalls(this);
    },

    verifyCallAllowed: function verifyCallAllowed(thisValue, args) {
        if (receivedMaxCalls(this)) {
            this.failed = true;
            mockExpectation.fail(this.method + " already called " + timesInWords(this.maxCalls));
        }

        if ("expectedThis" in this && this.expectedThis !== thisValue) {
            mockExpectation.fail(this.method + " called with " + valueToString(thisValue) +
                " as thisValue, expected " + valueToString(this.expectedThis));
        }

        if (!("expectedArguments" in this)) {
            return;
        }

        if (!args) {
            mockExpectation.fail(this.method + " received no arguments, expected " +
                format(this.expectedArguments));
        }

        if (args.length < this.expectedArguments.length) {
            mockExpectation.fail(this.method + " received too few arguments (" + format(args) +
                "), expected " + format(this.expectedArguments));
        }

        if (this.expectsExactArgCount &&
            args.length !== this.expectedArguments.length) {
            mockExpectation.fail(this.method + " received too many arguments (" + format(args) +
                "), expected " + format(this.expectedArguments));
        }

        for (let i = 0, l = this.expectedArguments.length; i < l; i += 1) {

            if (!verifyMatcher(this.expectedArguments[i], args[i])) {
                mockExpectation.fail(this.method + " received wrong arguments " + format(args) +
                    ", didn't match " + this.expectedArguments.toString());
            }

            if (!deepEqual(this.expectedArguments[i], args[i])) {
                mockExpectation.fail(this.method + " received wrong arguments " + format(args) +
                    ", expected " + format(this.expectedArguments));
            }
        }
    },

    allowsCall: function allowsCall(thisValue, args) {
        if (this.met() && receivedMaxCalls(this)) {
            return false;
        }

        if ("expectedThis" in this && this.expectedThis !== thisValue) {
            return false;
        }

        if (!("expectedArguments" in this)) {
            return true;
        }

        args = args || [];

        if (args.length < this.expectedArguments.length) {
            return false;
        }

        if (this.expectsExactArgCount &&
            args.length !== this.expectedArguments.length) {
            return false;
        }

        for (let i = 0, l = this.expectedArguments.length; i < l; i += 1) {
            if (!verifyMatcher(this.expectedArguments[i], args[i])) {
                return false;
            }

            if (!deepEqual(this.expectedArguments[i], args[i])) {
                return false;
            }
        }

        return true;
    },

    withArgs: function withArgs() {
        this.expectedArguments = slice.call(arguments);
        return this;
    },

    withExactArgs: function withExactArgs() {
        this.withArgs.apply(this, arguments);
        this.expectsExactArgCount = true;
        return this;
    },

    on: function on(thisValue) {
        this.expectedThis = thisValue;
        return this;
    },

    toString: function () {
        const args = (this.expectedArguments || []).slice();

        if (!this.expectsExactArgCount) {
            push.call(args, "[...]");
        }

        const callStr = spyCallToString.call({
            proxy: this.method || "anonymous mock expectation",
            args: args
        });

        const message = callStr.replace(", [...", "[, ...") + " " +
            expectedCallCountInWords(this);

        if (this.met()) {
            return "Expectation met: " + message;
        }

        return "Expected " + message + " (" +
            callCountInWords(this.callCount) + ")";
    },

    verify: function verify() {
        if (!this.met()) {
            mockExpectation.fail(this.toString());
        } else {
            mockExpectation.pass(this.toString());
        }

        return true;
    },

    pass: function pass() {},

    fail: function fail(message) {
        const exception = new Error(message);
        exception.name = "ExpectationError";

        throw exception;
    }
};

export default mockExpectation;
