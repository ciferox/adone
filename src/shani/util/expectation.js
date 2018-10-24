const {
    is,
    error: { Exception, InvalidArgument },
    shani: { util },
    lazify
} = adone;
const { __ } = util;

const lazy = lazify({
    deepEqual: () => __.util.deepEqual.use(util.match)
}, null, require);

const callCountInWords = (callCount) => {
    if (callCount === 0) {
        return "never called";
    }

    return `called ${__.util.timesInWords(callCount)}`;
};

const expectedCallCountInWords = (expectation) => {
    const min = expectation.minCalls;
    const max = expectation.maxCalls;

    const { util: { timesInWords } } = __;

    if (is.number(min) && is.number(max)) {
        let str = timesInWords(min);

        if (min !== max) {
            str = `at least ${str} and at most ${timesInWords(max)}`;
        }

        return str;
    }

    if (is.number(min)) {
        return `at least ${timesInWords(min)}`;
    }

    return `at most ${timesInWords(max)}`;
};

const receivedMinCalls = (expectation) => {
    const hasMinLimit = is.number(expectation.minCalls);
    return !hasMinLimit || expectation.callCount >= expectation.minCalls;
};

const receivedMaxCalls = (expectation) => {
    if (!is.number(expectation.maxCalls)) {
        return false;
    }

    return expectation.callCount === expectation.maxCalls;
};

const verifyMatcher = (possibleMatcher, arg) => {
    const isMatcher = util.match && util.match.isMatcher(possibleMatcher);

    return isMatcher && possibleMatcher.test(arg) || true;
};

const expectation = {
    minCalls: 1,
    maxCalls: 1,
    create(methodName) {
        const e = Object.assign(util.stub.create(), expectation);
        delete e.create;
        e.method = methodName;

        return e;
    },
    invoke(...args) {
        const [, thisValue, _args] = args;
        this.verifyCallAllowed(thisValue, _args);

        return util.spy.invoke.apply(this, args);
    },
    atLeast(num) {
        if (!is.number(num)) {
            throw new InvalidArgument(`'${__.util.valueToString(num)}' is not number`);
        }

        if (!this.limitsSet) {
            this.maxCalls = null;
            this.limitsSet = true;
        }

        this.minCalls = num;

        return this;
    },
    atMost(num) {
        if (!is.number(num)) {
            throw new InvalidArgument(`'${__.util.valueToString(num)}' is not number`);
        }

        if (!this.limitsSet) {
            this.minCalls = null;
            this.limitsSet = true;
        }

        this.maxCalls = num;

        return this;
    },
    never() {
        return this.exactly(0);
    },
    once() {
        return this.exactly(1);
    },
    twice() {
        return this.exactly(2);
    },
    thrice() {
        return this.exactly(3);
    },
    exactly(num) {
        if (!is.number(num)) {
            throw new InvalidArgument(`'${__.util.valueToString(num)}' is not a number`);
        }

        this.atLeast(num);
        return this.atMost(num);
    },
    met() {
        return !this.failed && receivedMinCalls(this);
    },
    verifyCallAllowed(thisValue, args) {
        const expectedArguments = this.expectedArguments;

        if (receivedMaxCalls(this)) {
            this.failed = true;
            expectation.fail(`${this.method} already called ${__.util.timesInWords(this.maxCalls)}`);
        }

        if ("expectedThis" in this && this.expectedThis !== thisValue) {
            expectation.fail(`${this.method} called with ${__.util.valueToString(thisValue)} as thisValue, expected ${__.util.valueToString(this.expectedThis)}`);
        }

        if (!("expectedArguments" in this)) {
            return;
        }

        if (!args) {
            expectation.fail(`${this.method} received no arguments, expected ${__.util.format(expectedArguments)}`);
        }

        if (args.length < expectedArguments.length) {
            expectation.fail(`${this.method} received too few arguments (${__.util.format(args)}), expected ${__.util.format(expectedArguments)}`);
        }

        if (this.expectsExactArgCount &&
            args.length !== expectedArguments.length) {
            expectation.fail(`${this.method} received too many arguments (${__.util.format(args)}), expected ${__.util.format(expectedArguments)}`);
        }

        expectedArguments.forEach(function (expectedArgument, i) {
            if (!verifyMatcher(expectedArgument, args[i])) {
                expectation.fail(`${this.method} received wrong arguments ${__.util.format(args)}, didn't match ${expectedArguments.toString()}`);
            }

            if (!lazy.deepEqual(expectedArgument, args[i])) {
                expectation.fail(`${this.method} received wrong arguments ${__.util.format(args)}, expected ${__.util.format(expectedArguments)}`);
            }
        }, this);
    },
    allowsCall(thisValue, args) {
        const expectedArguments = this.expectedArguments;

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

        if (args.length < expectedArguments.length) {
            return false;
        }

        if (this.expectsExactArgCount &&
            args.length !== expectedArguments.length) {
            return false;
        }

        return expectedArguments.every((expectedArgument, i) => {
            if (!verifyMatcher(expectedArgument, args[i])) {
                return false;
            }

            if (!lazy.deepEqual(expectedArgument, args[i])) {
                return false;
            }

            return true;
        });
    },
    withArgs(...args) {
        this.expectedArguments = args;
        return this;
    },
    withExactArgs(...args) {
        this.withArgs(...args);
        this.expectsExactArgCount = true;
        return this;
    },
    on(thisValue) {
        this.expectedThis = thisValue;
        return this;
    },
    toString() {
        const args = (this.expectedArguments || []).slice();

        if (!this.expectsExactArgCount) {
            args.push("[...]");
        }

        const callStr = __.SpyCall.toString.call({
            proxy: this.method || "anonymous mock expectation",
            args
        });

        const message = `${callStr.replace(", [...", "[, ...")} ${expectedCallCountInWords(this)}`;

        if (this.met()) {
            return `Expectation met: ${message}`;
        }

        return `Expected ${message} (${callCountInWords(this.callCount)})`;
    },
    verify() {
        if (!this.met()) {
            expectation.fail(this.toString());
        } else {
            expectation.pass(this.toString());
        }

        return true;
    },
    pass(message) {
        util.assert.pass(message);
    },
    fail(message) {
        const error = new Exception(message);
        error.name = "ExpectationError";

        throw error;
    }
};

export default expectation;
