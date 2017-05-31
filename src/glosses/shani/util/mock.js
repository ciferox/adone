const { is, x, shani: { util: sutil } } = adone;
const { __: { util: { wrapMethod }, SpyCall: { toString: SpyCallToString } }, expectation, match } = sutil;


const deepEqual = sutil.__.util.deepEqual.use(match);

const arrayEquals = (arr1, arr2, compareLength) => {
    if (compareLength && (arr1.length !== arr2.length)) {
        return false;
    }

    return arr1.every((element, i) => {
        return deepEqual(element, arr2[i]);

    });
};


class Mock {
    constructor(object) {
        if (!object) {
            throw new x.InvalidArgument("object is falsy");
        }
        this.object = object;
    }

    expects(method) {
        if (!method) {
            throw new x.InvalidArgument("method is falsy");
        }

        if (!this.expectations) {
            this.expectations = {};
            this.proxies = [];
            this.failures = [];
        }

        if (!this.expectations[method]) {
            this.expectations[method] = [];
            const mockObject = this;

            wrapMethod(this.object, method, function (...args) {
                return mockObject.invokeMethod(method, this, args);
            });

            this.proxies.push(method);
        }

        const e = expectation.create(method);
        this.expectations[method].push(e);

        return e;
    }

    restore() {
        const object = this.object;
        if (this.proxies) {
            for (const proxy of this.proxies) {
                if (is.function(object[proxy].restore)) {
                    object[proxy].restore();
                }
            }
        }
    }

    verify() {
        const expectations = this.expectations || {};
        const messages = this.failures ? this.failures.slice() : [];
        const met = [];

        if (this.proxies) {
            for (const proxy of this.proxies) {
                if (expectations[proxy]) {
                    for (const expectation of this.expectations[proxy]) {
                        if (!expectation.met()) {
                            messages.push(expectation.toString());
                        } else {
                            met.push(expectation.toString());
                        }
                    }
                }
            }
        }

        this.restore();

        if (messages.length > 0) {
            expectation.fail(messages.concat(met).join("\n"));
        } else if (met.length > 0) {
            expectation.pass(messages.concat(met).join("\n"));
        }

        return true;
    }

    invokeMethod(method, thisValue, args) {
        /* if we cannot find any matching files we will explicitly call mockExpection#fail with error messages */
        const expectations = this.expectations && this.expectations[method] ? this.expectations[method] : [];
        const currentArgs = args || [];
        let available;

        const expectationsWithMatchingArgs = expectations.filter((expectation) => {
            const expectedArgs = expectation.expectedArguments || [];

            return arrayEquals(expectedArgs, currentArgs, expectation.expectsExactArgCount);
        });

        const expectationsToApply = expectationsWithMatchingArgs.filter((expectation) => {
            return !expectation.met() && expectation.allowsCall(thisValue, args);
        });

        if (expectationsToApply.length > 0) {
            return expectationsToApply[0].apply(thisValue, args);
        }

        const messages = [];
        let exhausted = 0;

        expectationsWithMatchingArgs.forEach((expectation) => {
            if (expectation.allowsCall(thisValue, args)) {
                available = available || expectation;
            } else {
                exhausted += 1;
            }
        });

        if (available && exhausted === 0) {
            return available.apply(thisValue, args);
        }

        expectations.forEach((expectation) => {
            messages.push(`    ${expectation.toString()}`);
        });

        messages.unshift(`Unexpected call: ${SpyCallToString.call({
            proxy: method,
            args
        })}`);

        const err = new Error();
        this.failures.push(`Unexpected call: ${SpyCallToString.call({
            proxy: method,
            args,
            stack: err.stack
        })}`);

        expectation.fail(messages.join("\n"));
    }
}

export default function mock(object) {
    if (!object) {
        return expectation.create("Anonymous mock");
    }
    return mock.create(object);
}

mock.create = (object) => new Mock(object);
