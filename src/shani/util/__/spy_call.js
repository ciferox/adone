const {
    is,
    error,
    shani: { util }, lazify
} = adone;
const { __ } = util;

const lazy = lazify({
    deepEqual: () => __.util.deepEqual.use(util.match)
}, null, require);

const throwYieldError = (proxy, text, args) => {
    let msg = adone.assertion.util.getName(proxy) + text;
    if (args.length) {
        msg += ` Received [${args.join(", ")}]`;
    }
    throw new error.Exception(msg);
};

export default class SpyCall {
    constructor(spy, thisValue, args, returnValue, error, id, errorWithCallStack) {
        if (!is.number(id)) {
            throw new error.InvalidArgumentException("Call id is not a number");
        }
        this.proxy = spy;
        this.thisValue = thisValue;
        this.args = args;
        this.returnValue = returnValue;
        this.error = error;
        this.callId = id;
        this.errorWithCallStack = errorWithCallStack;
    }

    get stack() {
        return this.errorWithCallStack && this.errorWithCallStack.stack || "";
    }

    calledOn(thisValue) {
        if (util.match && util.match.isMatcher(thisValue)) {
            return thisValue.test(this.thisValue);
        }
        return this.thisValue === thisValue;
    }

    calledWith(...calledWithArgs) {
        if (calledWithArgs.length > this.args.length) {
            return false;
        }

        return calledWithArgs.reduce((prev, arg, i) => {
            return prev && lazy.deepEqual(arg, this.args[i]);
        }, true);
    }

    calledWithMatch(...calledWithMatchArgs) {
        if (calledWithMatchArgs.length > this.args.length) {
            return false;
        }

        return calledWithMatchArgs.reduce((prev, expectation, i) => {
            const actual = this.args[i];

            return prev && (util.match && util.match(expectation).test(actual));
        }, true);
    }

    calledWithExactly(...args) {
        return arguments.length === this.args.length && this.calledWith(...args);
    }

    notCalledWith(...args) {
        return !this.calledWith(...args);
    }

    notCalledWithMatch(...args) {
        return !this.calledWithMatch(...args);
    }

    returned(value) {
        return lazy.deepEqual(value, this.returnValue);
    }

    threw(error) {
        if (is.undefined(error) || !this.error) {
            return Boolean(this.error);
        }

        return this.error === error || this.error.name === error;
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

    calledImmediatelyBefore(other) {
        return this.callId === other.callId - 1;
    }

    calledImmediatelyAfter(other) {
        return this.callId === other.callId + 1;
    }

    callArg(pos) {
        this.args[pos]();
    }

    callArgOn(pos, thisValue) {
        this.args[pos].apply(thisValue);
    }

    callArgWith(pos, ...args) {
        this.callArgOnWith(pos, null, ...args);
    }

    callArgOnWith(pos, thisValue, ...args) {
        this.args[pos].apply(thisValue, args);
    }

    throwArg(pos) {
        if (pos > this.args.length) {
            throw new error.InvalidArgumentException(`Not enough arguments: ${pos} required but only ${this.args.length} present`);
        }

        throw this.args[pos];
    }

    yield(...args) {
        this.yieldOn(null, ...args);
    }

    yieldOn(thisValue, ...args) {
        const yieldFn = [...this.args].filter(is.function)[0];

        if (!yieldFn) {
            throwYieldError(this.proxy, " cannot yield since no callback was passed.", [...this.args]);
        }

        yieldFn.apply(thisValue, args);
    }

    yieldTo(prop, ...args) {
        this.yieldToOn(prop, null, ...args);
    }

    yieldToOn(prop, thisValue, ...args) {
        const yieldArg = [...this.args].filter((arg) => {
            return arg && is.function(arg[prop]);
        })[0];
        const yieldFn = yieldArg && yieldArg[prop];

        if (!yieldFn) {
            throwYieldError(this.proxy, ` cannot yield to '${__.util.valueToString(prop)}' since no callback was passed.`, [...this.args]);
        }
        yieldFn.apply(thisValue, args);
    }

    toString() {
        let callStr = this.proxy ? `${this.proxy.toString()}(` : "";

        if (!this.args) {
            return ":(";
        }

        const formattedArgs = [...this.args].map((arg) => __.util.format(arg));

        callStr = `${callStr + formattedArgs.join(", ")})`;

        if (!is.undefined(this.returnValue)) {
            callStr += ` => ${__.util.format(this.returnValue)}`;
        }

        if (this.error) {
            callStr += ` !${this.error.name}`;

            if (this.error.message) {
                callStr += `(${this.error.message})`;
            }
        }
        if (this.stack) {
            // Omit the error message and the two top stack frames:
            callStr += (this.stack.split("\n")[3] || "unknown").replace(/^\s*(?:at\s+|@)?/, " at ");
        }

        return callStr;
    }
}

SpyCall.prototype.invokeCallback = SpyCall.prototype.yield;
SpyCall.toString = SpyCall.prototype.toString;  // used by mocks
