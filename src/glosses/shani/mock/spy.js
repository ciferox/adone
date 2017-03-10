/**
  * Spy functions
  *
  * @author Christian Johansen (christian@cjohansen.no)
  * @license BSD
  *
  * Copyright (c) 2010-2013 Christian Johansen
  */
import adone from "adone";
import getPropertyDescriptor from "./util/get-property-descriptor";
import extend from "./util/extend";
import functionName from "./util/function-name";
import functionToString from "./util/function-to-string";
import match from "./match";
import deepEqual from "./util/deep-equal";
import spyCall from "./call";
import timesInWords from "./util/times-in-words";
import wrapMethod from "./util/wrap-method";
import format from "./util/format";
import valueToString from "./util/value-to-string";

const push = Array.prototype.push;
const slice = Array.prototype.slice;
let callId = 0;
const ErrorConstructor = Error.prototype.constructor;

function spy(object, property, types) {
    if (!property && typeof object === "function") {
        return spy.create(object);
    }

    if (!object && !property) {
        return spy.create(function () { });
    }

    if (types) {
        const descriptor = {};
        const methodDesc = getPropertyDescriptor(object, property);

        for (let i = 0; i < types.length; i++) {
            descriptor[types[i]] = spy.create(methodDesc[types[i]]);
        }
        return wrapMethod(object, property, descriptor);
    }

    return wrapMethod(object, property, spy.create(object[property]));
}

function matchingFake(fakes, args, strict) {
    if (!fakes) {
        return undefined;
    }

    const matchingFakes = fakes.filter(function (fake) {
        return fake.matches(args, strict);
    });

    return matchingFakes.pop();
}

function incrementCallCount() {
    this.called = true;
    this.callCount += 1;
    this.notCalled = false;
    this.calledOnce = this.callCount === 1;
    this.calledTwice = this.callCount === 2;
    this.calledThrice = this.callCount === 3;
}

function createCallProperties() {
    this.firstCall = this.getCall(0);
    this.secondCall = this.getCall(1);
    this.thirdCall = this.getCall(2);
    this.lastCall = this.getCall(this.callCount - 1);
}

const mockProxy = Symbol.for("shani:mock:proxy");

function createProxy(func, proxyLength) {
    // Retain the function length:
    let p;
    if (proxyLength) {
        switch (proxyLength) {
            /*eslint-disable no-unused-vars, max-len*/
            case 1: p = function proxy(a) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 2: p = function proxy(a, b) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 3: p = function proxy(a, b, c) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 4: p = function proxy(a, b, c, d) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 5: p = function proxy(a, b, c, d, e) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 6: p = function proxy(a, b, c, d, e, f) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 7: p = function proxy(a, b, c, d, e, f, g) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 8: p = function proxy(a, b, c, d, e, f, g, h) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 9: p = function proxy(a, b, c, d, e, f, g, h, i) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 10: p = function proxy(a, b, c, d, e, f, g, h, i, j) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 11: p = function proxy(a, b, c, d, e, f, g, h, i, j, k) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            case 12: p = function proxy(a, b, c, d, e, f, g, h, i, j, k, l) {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            default: p = function proxy() {
                return p.invoke(func, this, slice.call(arguments));
            }; break;
            /*eslint-enable*/
        }
    } else {
        p = function proxy() {
            return p.invoke(func, this, slice.call(arguments));
        };
    }
    p[mockProxy] = true;
    return p;
}

let uuid = 0;

// Public API
const spyApi = {
    reset() {
        if (this.invoking) {
            const err = new Error("Cannot reset a function while invoking it. " +
                                "Move the call to .reset outside of the callback.");
            err.name = "InvalidResetException";
            throw err;
        }

        this.called = false;
        this.notCalled = true;
        this.calledOnce = false;
        this.calledTwice = false;
        this.calledThrice = false;
        this.callCount = 0;
        this.firstCall = null;
        this.secondCall = null;
        this.thirdCall = null;
        this.lastCall = null;
        this.args = [];
        this.returnValues = [];
        this.thisValues = [];
        this.exceptions = [];
        this.callIds = [];
        this.stacks = [];
        this.callAwaiters = [];
        if (this.fakes) {
            for (let i = 0; i < this.fakes.length; i++) {
                this.fakes[i].reset();
            }
        }

        return this;
    },

    create: function create(func, spyLength) {
        let name;

        if (typeof func !== "function") {
            func = function () { };
        } else {
            name = functionName(func);
        }

        if (!spyLength) {
            spyLength = func.length;
        }

        const proxy = createProxy(func, spyLength);

        extend(proxy, spy);
        delete proxy.create;
        extend(proxy, func);

        proxy.reset();
        proxy.prototype = func.prototype;
        proxy.displayName = name || "spy";
        proxy.toString = functionToString;
        proxy.instantiateFake = spy.create;
        proxy.id = "spy#" + uuid++;

        return proxy;
    },

    invoke: function invoke(func, thisValue, args) {
        const matching = matchingFake(this.fakes, args);
        let exception;
        let returnValue;

        incrementCallCount.call(this);
        push.call(this.thisValues, thisValue);
        push.call(this.args, args);
        push.call(this.callIds, callId++);

        // Make call properties available from within the spied function:
        createCallProperties.call(this);

        try {
            this.invoking = true;

            if (matching) {
                returnValue = matching.invoke(func, thisValue, args);
            } else {
                returnValue = (this.func || func).apply(thisValue, args);
            }

            const thisCall = this.getCall(this.callCount - 1);
            if (thisCall.calledWithNew() && typeof returnValue !== "object") {
                returnValue = thisValue;
            }
        } catch (e) {
            exception = e;
        } finally {
            delete this.invoking;
        }

        push.call(this.exceptions, exception);
        push.call(this.returnValues, returnValue);
        const err = new ErrorConstructor();
        const stack = err.stack;
        if (!stack) {
            // PhantomJS does not serialize the stack trace until the error has been thrown:
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack
            try {
                throw err;
            } catch (e) { /* empty */ }
        }
        push.call(this.stacks, err.stack);

        // Make return value and exception available in the calls:
        createCallProperties.call(this);

        const call = this.getCall(this.callCount - 1);
        for (let i = 0; i < this.callAwaiters.length; ++i) {
            const awaiter = this.callAwaiters[i];
            if (awaiter.match(call)) {
                awaiter.resolve(call);
                this.callAwaiters.splice(i--, 1);
            }
        }

        if (exception !== undefined) {
            throw exception;
        }

        return returnValue;
    },

    waitFor(match, ret = adone.identity) {
        return new Promise((resolve) => {
            this.callAwaiters.push({
                match,
                resolve: (call) => resolve(ret(call))
            });
        });
    },

    waitForCall() {
        return this.waitFor(adone.truly);
    },

    waitForNCalls(n) {
        const calls = [];
        return this.waitFor((call) => {
            calls.push(call);
            return calls.length === n;
        }, () => calls);
    },

    waitForArg(index, value) {
        return this.waitFor((call) => deepEqual(call.args[index], value));
    },

    waitForArgs(...args) {
        return this.waitFor((call) => {
            for (let i = 0; i < args.length; ++i) {
                if (!deepEqual(args[i], call.args[i])) {
                    return false;
                }
            }
            return true;
        });
    },

    named: function named(name) {
        this.displayName = name;
        return this;
    },

    getCall: function getCall(i) {
        if (i < 0 || i >= this.callCount) {
            return null;
        }

        return spyCall(this, this.thisValues[i], this.args[i],
                                this.returnValues[i], this.exceptions[i],
                                this.callIds[i], this.stacks[i]);
    },

    getCalls() {
        const calls = [];
        let i;

        for (i = 0; i < this.callCount; i++) {
            calls.push(this.getCall(i));
        }

        return calls;
    },

    calledBefore: function calledBefore(spyFn) {
        if (!this.called) {
            return false;
        }

        if (!spyFn.called) {
            return true;
        }

        return this.callIds[0] < spyFn.callIds[spyFn.callIds.length - 1];
    },

    calledAfter: function calledAfter(spyFn) {
        if (!this.called || !spyFn.called) {
            return false;
        }

        return this.callIds[this.callCount - 1] > spyFn.callIds[spyFn.callCount - 1];
    },

    withArgs() {
        const args = slice.call(arguments);

        if (this.fakes) {
            const match = matchingFake(this.fakes, args, true);

            if (match) {
                return match;
            }
        } else {
            this.fakes = [];
        }

        const original = this;
        const fake = this.instantiateFake();
        fake.matchingArguments = args;
        fake.parent = this;
        push.call(this.fakes, fake);

        fake.withArgs = function () {
            return original.withArgs.apply(original, arguments);
        };

        for (let i = 0; i < this.args.length; i++) {
            if (fake.matches(this.args[i])) {
                incrementCallCount.call(fake);
                push.call(fake.thisValues, this.thisValues[i]);
                push.call(fake.args, this.args[i]);
                push.call(fake.returnValues, this.returnValues[i]);
                push.call(fake.exceptions, this.exceptions[i]);
                push.call(fake.callIds, this.callIds[i]);
            }
        }
        createCallProperties.call(fake);

        return fake;
    },

    matches(args, strict) {
        const margs = this.matchingArguments;

        if (margs.length <= args.length &&
            deepEqual(margs, args.slice(0, margs.length))) {
            return !strict || margs.length === args.length;
        }

        return undefined;
    },

    printf(format) {
        const spyInstance = this;
        const args = slice.call(arguments, 1);
        let formatter;

        return (format || "").replace(/%(.)/g, function (match, specifyer) {
            formatter = spyApi.formatters[specifyer];

            if (typeof formatter === "function") {
                return formatter.call(null, spyInstance, args);
            } else if (!isNaN(parseInt(specifyer, 10))) {
                return format(args[specifyer - 1]);
            }

            return "%" + specifyer;
        });
    }
};

function delegateToCalls(method, matchAny, actual, notCalled) {
    spyApi[method] = function () {
        if (!this.called) {
            if (notCalled) {
                return notCalled.apply(this, arguments);
            }
            return false;
        }

        let currentCall;
        let matches = 0;

        for (let i = 0, l = this.callCount; i < l; i += 1) {
            currentCall = this.getCall(i);

            if (currentCall[actual || method].apply(currentCall, arguments)) {
                matches += 1;

                if (matchAny) {
                    return true;
                }
            }
        }

        return matches === this.callCount;
    };
}

delegateToCalls("calledOn", true);
delegateToCalls("alwaysCalledOn", false, "calledOn");
delegateToCalls("calledWith", true);
delegateToCalls("calledWithMatch", true);
delegateToCalls("alwaysCalledWith", false, "calledWith");
delegateToCalls("alwaysCalledWithMatch", false, "calledWithMatch");
delegateToCalls("calledWithExactly", true);
delegateToCalls("alwaysCalledWithExactly", false, "calledWithExactly");
delegateToCalls("neverCalledWith", false, "notCalledWith", function () {
    return true;
});
delegateToCalls("neverCalledWithMatch", false, "notCalledWithMatch", function () {
    return true;
});
delegateToCalls("threw", true);
delegateToCalls("alwaysThrew", false, "threw");
delegateToCalls("returned", true);
delegateToCalls("alwaysReturned", false, "returned");
delegateToCalls("calledWithNew", true);
delegateToCalls("alwaysCalledWithNew", false, "calledWithNew");
delegateToCalls("callArg", false, "callArgWith", function () {
    throw new Error(this.toString() + " cannot call arg since it was not yet invoked.");
});
spyApi.callArgWith = spyApi.callArg;
delegateToCalls("callArgOn", false, "callArgOnWith", function () {
    throw new Error(this.toString() + " cannot call arg since it was not yet invoked.");
});
spyApi.callArgOnWith = spyApi.callArgOn;
delegateToCalls("yield", false, "yield", function () {
    throw new Error(this.toString() + " cannot yield since it was not yet invoked.");
});
// "invokeCallback" is an alias for "yield" since "yield" is invalid in strict mode.
spyApi.invokeCallback = spyApi.yield;
delegateToCalls("yieldOn", false, "yieldOn", function () {
    throw new Error(this.toString() + " cannot yield since it was not yet invoked.");
});
delegateToCalls("yieldTo", false, "yieldTo", function (property) {
    throw new Error(this.toString() + " cannot yield to '" + valueToString(property) +
        "' since it was not yet invoked.");
});
delegateToCalls("yieldToOn", false, "yieldToOn", function (property) {
    throw new Error(this.toString() + " cannot yield to '" + valueToString(property) +
        "' since it was not yet invoked.");
});

function colorDiffText(diff) {
    const objects = diff.map((part) => {
        let text = part.value;
        if (part.added) {
            text = adone.terminal.parse(`{green-fg}${text}{/}`);
        } else if (part.removed) {
            text = adone.terminal.parse(`{red-fg}${text}{/}`);
        }
        if (diff.length === 2) {
            text += " "; // format simple diffs
        }
        return text;
    });
    return objects.join("");
}

function colorMatchText(matcher, calledArg, calledArgMessage) {
    if (!matcher.test(calledArg)) {
        matcher.message = adone.terminal.parse(`{red-fg}${matcher.message}{/}`);
        if (calledArgMessage) {
            calledArgMessage = adone.terminal.parse(`{green-fg}${calledArgMessage}{/}`);
        }
    }
    return calledArgMessage + " " + matcher.message;
}

spyApi.formatters = {
    c(spyInstance) {
        return timesInWords(spyInstance.callCount);
    },

    n(spyInstance) {
        return spyInstance.toString();
    },

    D(spyInstance, args) {
        let message = "";

        for (let i = 0, l = spyInstance.callCount; i < l; ++i) {
            // describe multiple calls
            if (l > 1) {
                if (i > 0) {
                    message += "\n";
                }
                message += "Call " + (i + 1) + ":";
            }
            const calledArgs = spyInstance.getCall(i).args;
            for (let j = 0; j < calledArgs.length || j < args.length; ++j) {
                message += "\n";
                const calledArgMessage = j < calledArgs.length ? format(calledArgs[j]) : "";
                if (match.isMatcher(args[j])) {
                    message += colorMatchText(args[j], calledArgs[j], calledArgMessage);
                } else {
                    const expectedArgMessage = j < args.length ? format(args[j]) : "";
                    const diff = adone.util.diff.object(calledArgMessage, expectedArgMessage);
                    message += colorDiffText(diff);
                }
            }
        }

        return message;
    },

    C(spyInstance) {
        const calls = [];

        for (let i = 0, l = spyInstance.callCount; i < l; ++i) {
            let stringifiedCall = "    " + spyInstance.getCall(i).toString();
            if (/\n/.test(calls[i - 1])) {
                stringifiedCall = "\n" + stringifiedCall;
            }
            push.call(calls, stringifiedCall);
        }

        return calls.length > 0 ? "\n" + calls.join("\n") : "";
    },

    t(spyInstance) {
        const objects = [];

        for (let i = 0, l = spyInstance.callCount; i < l; ++i) {
            push.call(objects, format(spyInstance.thisValues[i]));
        }

        return objects.join(", ");
    },

    ["*"](spyInstance, args) {
        const formatted = [];

        for (let i = 0, l = args.length; i < l; ++i) {
            push.call(formatted, format(args[i]));
        }

        return formatted.join(", ");
    }
};

extend(spy, spyApi);

spy.spyCall = spyCall;

export default spy;
export const invoke = spy.invoke;
