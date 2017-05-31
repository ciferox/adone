const { is, x, shani: { util: sutil } } = adone;
const {
    __: {
        util: {
            timesInWords,
            format,
            valueToString
        },
        SpyCall: { toString: SpyCallToString }
    },
    spy: { invoke: spyInvoke },
    match,
    stub,
    assert
} = sutil;
const deepEqual = sutil.__.util.deepEqual.use(match);

const callCountInWords = (callCount) => {
    if (callCount === 0) {
        return "never called";
    }

    return `called ${timesInWords(callCount)}`;
};

const expectedCallCountInWords = (expectation) => {
    const min = expectation.minCalls;
    const max = expectation.maxCalls;

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
    const isMatcher = match && match.isMatcher(possibleMatcher);

    return isMatcher && possibleMatcher.test(arg) || true;
};

const expectation = {
    minCalls: 1,
    maxCalls: 1,
    create(methodName) {
        const e = Object.assign(stub.create(), expectation);
        delete e.create;
        e.method = methodName;

        return e;
    },
    invoke(...args) {
        const [, thisValue, _args] = args;
        this.verifyCallAllowed(thisValue, _args);

        return spyInvoke.apply(this, args);
    },
    atLeast(num) {
        if (!is.number(num)) {
            throw new x.InvalidArgument(`'${valueToString(num)}' is not number`);
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
            throw new x.InvalidArgument(`'${valueToString(num)}' is not number`);
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
            throw new x.InvalidArgument(`'${valueToString(num)}' is not a number`);
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
            expectation.fail(`${this.method} already called ${timesInWords(this.maxCalls)}`);
        }

        if ("expectedThis" in this && this.expectedThis !== thisValue) {
            expectation.fail(`${this.method} called with ${valueToString(thisValue)} as thisValue, expected ${valueToString(this.expectedThis)}`);
        }

        if (!("expectedArguments" in this)) {
            return;
        }

        if (!args) {
            expectation.fail(`${this.method} received no arguments, expected ${format(expectedArguments)}`);
        }

        if (args.length < expectedArguments.length) {
            expectation.fail(`${this.method} received too few arguments (${format(args)}), expected ${format(expectedArguments)}`);
        }

        if (this.expectsExactArgCount &&
            args.length !== expectedArguments.length) {
            expectation.fail(`${this.method} received too many arguments (${format(args)}), expected ${format(expectedArguments)}`);
        }

        expectedArguments.forEach(function (expectedArgument, i) {
            if (!verifyMatcher(expectedArgument, args[i])) {
                expectation.fail(`${this.method} received wrong arguments ${format(args)}, didn't match ${expectedArguments.toString()}`);
            }

            if (!deepEqual(expectedArgument, args[i])) {
                expectation.fail(`${this.method} received wrong arguments ${format(args)}, expected ${format(expectedArguments)}`);
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

            if (!deepEqual(expectedArgument, args[i])) {
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

        const callStr = SpyCallToString.call({
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
        assert.pass(message);
    },
    fail(message) {
        const exception = new x.Exception(message);
        exception.name = "ExpectationError";

        throw exception;
    }
};

export default expectation;
