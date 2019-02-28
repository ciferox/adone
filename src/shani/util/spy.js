const {
    is,
    error,
    shani: { util },
    lazify
} = adone;
const { __ } = util;

const lazy = lazify({
    deepEqual: () => __.util.deepEqual.use(util.match)
}, null, require);

const filter = Array.prototype.filter;

let callId = 0;
const ErrorConstructor = Error.prototype.constructor;
const bind = Function.prototype.bind;

const incrementCallCount = function () {
    this.called = true;
    this.callCount += 1;
    this.notCalled = false;
    this.calledOnce = this.callCount === 1;
    this.calledTwice = this.callCount === 2;
    this.calledThrice = this.callCount === 3;
};

const createCallProperties = function () {
    this.firstCall = this.getCall(0);
    this.secondCall = this.getCall(1);
    this.thirdCall = this.getCall(2);
    this.lastCall = this.getCall(this.callCount - 1);
};

const isProxy = Symbol.for("shani:isProxy");

const createProxy = (func, proxyLength) => {
    // Retain the function length:
    let proxy;
    if (proxyLength) {
        switch (proxyLength) {
            case 1: {
                proxy = function proxy(a, ...args) {
                    return proxy.invoke(func, this, [a, ...args]);
                };
                break;
            }
            case 2: {
                proxy = function proxy(a, b, ...args) {
                    return proxy.invoke(func, this, [a, b, ...args]);
                }; break;
            }
            case 3: {
                proxy = function proxy(a, b, c, ...args) {
                    return proxy.invoke(func, this, [a, b, c, ...args]);
                };
                break;
            }
            case 4: {
                proxy = function proxy(a, b, c, d, ...args) {
                    return proxy.invoke(func, this, [a, b, c, d, ...args]);
                };
                break;
            }
            case 5: {
                proxy = function proxy(a, b, c, d, e, ...args) {
                    return proxy.invoke(func, this, [a, b, c, d, e, ...args]);
                };
                break;
            }
            case 6: {
                proxy = function proxy(a, b, c, d, e, f, ...args) {
                    return proxy.invoke(func, this, [a, b, c, d, e, f, ...args]);
                };
                break;
            }
            case 7: {
                proxy = function proxy(a, b, c, d, e, f, g, ...args) {
                    return proxy.invoke(func, this, [a, b, c, d, e, f, g, ...args]);
                };
                break;
            }
            case 8: {
                proxy = function proxy(a, b, c, d, e, f, g, h, ...args) {
                    return proxy.invoke(func, this, [a, b, c, d, e, f, g, h, ...args]);
                };
                break;
            }
            case 9: {
                proxy = function proxy(a, b, c, d, e, f, g, h, i, ...args) {
                    return proxy.invoke(func, this, [a, b, c, d, e, f, g, h, i, ...args]);
                };
                break;
            }
            case 10: {
                proxy = function proxy(a, b, c, d, e, f, g, h, i, j, ...args) {
                    return proxy.invoke(func, this, [a, b, c, d, e, f, g, h, i, j, ...args]);
                };
                break;
            }
            case 11: {
                proxy = function proxy(a, b, c, d, e, f, g, h, i, j, k, ...args) {
                    return proxy.invoke(func, this, [a, b, c, d, e, f, g, h, i, j, k, ...args]);
                };
                break;
            }
            case 12: {
                proxy = function proxy(a, b, c, d, e, f, g, h, i, j, k, l, ...args) {
                    return proxy.invoke(func, this, [a, b, c, d, e, f, g, h, i, j, k, l, ...args]);
                };
                break;
            }
            default: {
                proxy = function proxy(...args) {
                    return proxy.invoke(func, this, args);
                };
                break;
            }
        }
    } else {
        proxy = function proxy(...args) {
            return proxy.invoke(func, this, args);
        };
    }
    proxy[isProxy] = true;
    return proxy;
};

let uuid = 0;

// Public API
const proto = {
    formatters: __.spyFormatters,
    resetHistory() {
        if (this.invoking) {
            const err = new Error("Cannot reset Sinon function while invoking it. " +
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
        this.callAwaiters = [];
        this.errorsWithCallStack = [];
        if (this.fakes) {
            this.fakes.forEach((fake) => {
                if (fake.resetHistory) {
                    fake.resetHistory();
                } else {
                    fake.reset();
                }
            });
        }

        return this;
    },
    create(func, spyLength) {
        let name;

        if (!is.function(func)) {
            func = function () { };
        } else {
            name = adone.assertion.util.getName(func);
        }

        if (!spyLength) {
            spyLength = func.length;
        }

        const proxy = createProxy(func, spyLength);

        Object.assign(proxy, spy);
        delete proxy.create;
        Object.assign(proxy, func);

        proxy.resetHistory();
        proxy.prototype = func.prototype;
        proxy.displayName = name || "spy";
        proxy.toString = __.util.functionToString;
        proxy.instantiateFake = spy.create;
        proxy.id = `spy#${uuid++}`;

        return proxy;
    },
    invoke(func, thisValue, args) {
        const matchings = this.matchingFakes(args);
        const currentCallId = callId++;
        incrementCallCount.call(this);
        this.thisValues.push(thisValue);
        this.args.push(args);
        this.callIds.push(currentCallId);
        matchings.forEach((matching) => {
            incrementCallCount.call(matching);
            matching.thisValues.push(thisValue);
            matching.args.push(args);
            matching.callIds.push(currentCallId);
        });

        // Make call properties available from within the spied function:
        createCallProperties.call(this);
        let error;
        let returnValue;
        try {
            this.invoking = true;

            const thisCall = this.getCall(this.callCount - 1);

            if (thisCall.calledWithNew()) {
                // Call through with `new`
                returnValue = new (bind.apply(this.func || func, [thisValue].concat(args)))();

                if (is.primitive(returnValue)) {
                    returnValue = thisValue;
                }
            } else {
                returnValue = (this.func || func).apply(thisValue, args);
            }
        } catch (e) {
            error = e;
        } finally {
            delete this.invoking;
        }

        this.exceptions.push(error);
        this.returnValues.push(returnValue);
        matchings.forEach((matching) => {
            matching.exceptions.push(error);
            matching.returnValues.push(returnValue);
        });

        const err = new ErrorConstructor();
        // 1. Please do not get stack at this point. It's may be so very slow, and not actually used
        // 2. PhantomJS does not serialize the stack trace until the error has been thrown:
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack
        try {
            throw err;
        } catch (e) { /* empty */ }
        this.errorsWithCallStack.push(err);
        matchings.forEach((matching) => {
            matching.errorsWithCallStack.push(err);
        });

        // Make return value and error available in the calls:
        createCallProperties.call(this);
        matchings.forEach((matching) => {
            createCallProperties.call(matching);
        });

        const call = this.getCall(this.callCount - 1);
        for (let i = 0; i < this.callAwaiters.length; ++i) {
            const awaiter = this.callAwaiters[i];
            if (awaiter.match(call)) {
                awaiter.resolve(call);
                this.callAwaiters.splice(i--, 1);
            }
        }

        if (!is.undefined(error)) {
            throw error;
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
        return this.waitFor((call) => lazy.deepEqual(call.args[index], value));
    },
    waitForArgs(...args) {
        return this.waitFor((call) => {
            for (let i = 0; i < args.length; ++i) {
                if (!lazy.deepEqual(args[i], call.args[i])) {
                    return false;
                }
            }
            return true;
        });
    },
    named(name) {
        this.displayName = name;
        return this;
    },
    getCall(i) {
        if (i < 0 || i >= this.callCount) {
            return null;
        }

        return new __.SpyCall(
            this,
            this.thisValues[i],
            this.args[i],
            this.returnValues[i],
            this.exceptions[i],
            this.callIds[i],
            this.errorsWithCallStack[i]
        );
    },
    getCalls() {
        const calls = [];
        let i;

        for (i = 0; i < this.callCount; i++) {
            calls.push(this.getCall(i));
        }

        return calls;
    },
    calledBefore(spyFn) {
        if (!this.called) {
            return false;
        }

        if (!spyFn.called) {
            return true;
        }

        return this.callIds[0] < spyFn.callIds[spyFn.callIds.length - 1];
    },
    calledAfter(spyFn) {
        if (!this.called || !spyFn.called) {
            return false;
        }

        return this.callIds[this.callCount - 1] > spyFn.callIds[0];
    },
    calledImmediatelyBefore(spyFn) {
        if (!this.called || !spyFn.called) {
            return false;
        }

        return this.callIds[this.callCount - 1] === spyFn.callIds[spyFn.callCount - 1] - 1;
    },
    calledImmediatelyAfter(spyFn) {
        if (!this.called || !spyFn.called) {
            return false;
        }

        return this.callIds[this.callCount - 1] === spyFn.callIds[spyFn.callCount - 1] + 1;
    },
    withArgs(...args) {
        if (this.fakes) {
            const matching = this.matchingFakes(args, true).pop();

            if (matching) {
                return matching;
            }
        } else {
            this.fakes = [];
        }

        const original = this;
        const fake = this.instantiateFake();
        fake.matchingArguments = args;
        fake.parent = this;
        this.fakes.push(fake);

        if (original.defaultBehavior && original.defaultBehavior.promiseLibrary) {
            fake.defaultBehavior = fake.defaultBehavior || __.behavior.create(fake);
            fake.defaultBehavior.promiseLibrary = original.defaultBehavior.promiseLibrary;
        }

        fake.withArgs = function (...args) {
            return original.withArgs(...args);
        };

        original.args.forEach((arg, i) => {
            if (!fake.matches(arg)) {
                return;
            }

            incrementCallCount.call(fake);
            fake.thisValues.push(original.thisValues[i]);
            fake.args.push(arg);
            fake.returnValues.push(original.returnValues[i]);
            fake.exceptions.push(original.exceptions[i]);
            fake.callIds.push(original.callIds[i]);
        });

        createCallProperties.call(fake);

        return fake;
    },
    matchingFakes(args, strict) {
        return filter.call(this.fakes || [], (fake) => fake.matches(args, strict));
    },
    matches(args, strict) {
        const margs = this.matchingArguments;

        if (margs.length <= args.length &&
            lazy.deepEqual(margs, args.slice(0, margs.length))) {
            return !strict || margs.length === args.length;
        }

        return undefined;
    },
    printf(format, ...args) {
        const spyInstance = this;
        let formatter;

        return (format || "").replace(/%(.)/g, (match, specifyer) => {
            formatter = proto.formatters[specifyer];

            if (is.function(formatter)) {
                return String(formatter(spyInstance, args));
            } else if (!is.nan(parseInt(specifyer, 10))) {
                return __.util.format(args[specifyer - 1]);
            }

            return `%${specifyer}`;
        });
    }
};

const delegateToCalls = (method, matchAny, actual, notCalled) => {
    proto[method] = function (...args) {
        if (!this.called) {
            if (notCalled) {
                return notCalled.apply(this, args);
            }
            return false;
        }
        let currentCall;
        let matches = 0;

        for (let i = 0, l = this.callCount; i < l; i += 1) {
            currentCall = this.getCall(i);

            if (currentCall[actual || method].apply(currentCall, args)) {
                matches += 1;

                if (matchAny) {
                    return true;
                }
            }
        }

        return matches === this.callCount;
    };
};

delegateToCalls("calledOn", true);
delegateToCalls("alwaysCalledOn", false, "calledOn");
delegateToCalls("calledWith", true);
delegateToCalls("calledWithMatch", true);
delegateToCalls("alwaysCalledWith", false, "calledWith");
delegateToCalls("alwaysCalledWithMatch", false, "calledWithMatch");
delegateToCalls("calledWithExactly", true);
delegateToCalls("alwaysCalledWithExactly", false, "calledWithExactly");
delegateToCalls("neverCalledWith", false, "notCalledWith", adone.truly);
delegateToCalls("neverCalledWithMatch", false, "notCalledWithMatch", adone.truly);
delegateToCalls("threw", true);
delegateToCalls("alwaysThrew", false, "threw");
delegateToCalls("returned", true);
delegateToCalls("alwaysReturned", false, "returned");
delegateToCalls("calledWithNew", true);
delegateToCalls("alwaysCalledWithNew", false, "calledWithNew");
delegateToCalls("callArg", false, "callArgWith", function () {
    throw new error.IllegalStateException(`${this.toString()} cannot call arg since it was not yet invoked.`);
});
proto.callArgWith = proto.callArg;
delegateToCalls("callArgOn", false, "callArgOnWith", function () {
    throw new error.IllegalStateException(`${this.toString()} cannot call arg since it was not yet invoked.`);
});
proto.callArgOnWith = proto.callArgOn;
delegateToCalls("throwArg", false, "throwArg", function () {
    throw new error.IllegalStateException(`${this.toString()} cannot throw arg since it was not yet invoked.`);
});
delegateToCalls("yield", false, "yield", function () {
    throw new error.IllegalStateException(`${this.toString()} cannot yield since it was not yet invoked.`);
});
// "invokeCallback" is an alias for "yield" since "yield" is invalid in strict mode.
proto.invokeCallback = proto.yield;
delegateToCalls("yieldOn", false, "yieldOn", function () {
    throw new error.IllegalStateException(`${this.toString()} cannot yield since it was not yet invoked.`);
});
delegateToCalls("yieldTo", false, "yieldTo", function (property) {
    throw new error.IllegalStateException(`${this.toString()} cannot yield to '${__.util.valueToString(property)}' since it was not yet invoked.`);
});
delegateToCalls("yieldToOn", false, "yieldToOn", function (property) {
    throw new error.IllegalStateException(`${this.toString()} cannot yield to '${__.util.valueToString(property)}' since it was not yet invoked.`);
});

export default function spy(object, property, types) {
    if (!property && is.function(object)) {
        return spy.create(object);
    }

    if (!object && !property) {
        // eslint-disable-next-line prefer-arrow-callback
        return spy.create(function () { }); // to have a context
    }

    if (!types) {
        return __.util.wrapMethod(object, property, spy.create(object[property]));
    }

    const descriptor = {};
    const methodDesc = __.util.getPropertyDescriptor(object, property);

    types.forEach((type) => {
        descriptor[type] = spy.create(methodDesc[type]);
    });

    return __.util.wrapMethod(object, property, descriptor);
}

Object.assign(spy, proto);
lazify({
    SpyCall: () => __.SpyCall
}, spy);

