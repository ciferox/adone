const {
    is,
    error,
    util: { keys },
    shani: { util }
} = adone;
const { __ } = util;

const isProxy = Symbol.for("shani:isProxy");

const verifyIsStub = (...args) => {
    args.forEach((method) => {
        if (!method) {
            // eslint-disable-next-line no-use-before-define
            assert.fail("fake is not a spy");
        }

        if (method.proxy && method.proxy[isProxy]) {
            verifyIsStub(method.proxy);
        } else {
            if (!is.function(method)) {
                // eslint-disable-next-line no-use-before-define
                assert.fail(`${method} is not a function`);
            }

            if (!is.function(method.getCall)) {
                // eslint-disable-next-line no-use-before-define
                assert.fail(`${method} is not stubbed`);
            }
        }
    });
};

const verifyIsValidAssertion = (assertionMethod, assertionArgs) => {
    switch (assertionMethod) {
        case "notCalled":
        case "called":
        case "calledOnce":
        case "calledTwice":
        case "calledThrice": {
            if (assertionArgs.length !== 0) {
                // eslint-disable-next-line no-use-before-define
                assert.fail(`${assertionMethod} takes 1 argument but was called with ${assertionArgs.length + 1} arguments`);
            }
            break;
        }
        default: {
            break;
        }
    }
};

const failAssertion = (object, msg) => {
    object = object || global;
    // eslint-disable-next-line no-use-before-define
    const failMethod = object.fail || assert.fail;
    failMethod.call(object, msg);
};

const exposedName = (prefix, prop) => !prefix || /^fail/.test(prop)
    ? prop
    : prefix + prop.slice(0, 1).toUpperCase() + prop.slice(1);

const assert = {
    failException: "AssertError",
    fail(message) {
        const error = new Error(message);
        error.name = this.failException || assert.failException;

        throw error;
    },
    pass() {},
    callOrder(...args) {
        verifyIsStub(...args);
        let expected = "";
        let actual = "";

        if (!__.util.calledInOrder(args)) {
            try {
                expected = args.join(", ");
                const calls = args.slice();
                let i = calls.length;
                while (i) {
                    if (!calls[--i].called) {
                        calls.splice(i, 1);
                    }
                }
                actual = __.util.orderByFirstCall(calls).join(", ");
            } catch (e) {
                // If this fails, we'll just fall back to the blank string
            }

            failAssertion(this, `expected ${expected} to be called in order but were called as ${actual}`);
        } else {
            assert.pass("callOrder");
        }
    },
    callCount(method, count) {
        verifyIsStub(method);

        if (method.callCount !== count) {
            const msg = `expected %n to be called ${__.util.timesInWords(count)} but was called %c%C`;
            failAssertion(this, method.printf(msg));
        } else {
            assert.pass("callCount");
        }
    },
    expose(target, options) {
        if (!target) {
            throw new error.InvalidArgumentException("target is null or undefined");
        }

        const o = options || {};
        const prefix = is.undefined(o.prefix) ? "assert" : o.prefix;
        const includeFail = is.undefined(o.includeFail) || Boolean(o.includeFail);
        const instance = this;

        for (const name of keys(instance)) {
            if (name !== "expose" && (includeFail || !/^(fail)/.test(name))) {
                target[exposedName(prefix, name)] = instance[name];
            }
        }

        return target;
    },
    match(actual, expectation) {
        const matcher = util.match(expectation);
        if (matcher.test(actual)) {
            assert.pass("match");
        } else {
            const formatted = [
                "expected value to match",
                `    expected = ${__.util.format(expectation)}`,
                `    actual = ${__.util.format(actual)}`
            ];

            failAssertion(this, formatted.join("\n"));
        }
    }
};

const mirrorPropAsAssertion = (...args) => {
    const [name] = args;
    let [, method, message] = args;
    if (args.length === 2) {
        message = method;
        method = name;
    }

    assert[name] = (fake, ...args) => {
        verifyIsStub(fake);

        let failed = false;

        verifyIsValidAssertion(name, args);
        if (is.function(method)) {
            failed = !method(fake);
        } else {
            failed = is.function(fake[method])
                ? !fake[method].apply(fake, args)
                : !fake[method];
        }

        if (failed) {
            failAssertion(this, (fake.printf || fake.proxy.printf).apply(fake, [message].concat(args)));
        } else {
            assert.pass(name);
        }
    };
};

mirrorPropAsAssertion("called", "expected %n to have been called at least once but was never called");
mirrorPropAsAssertion("notCalled", (spy) => !spy.called, "expected %n to not have been called but was called %c%C");
mirrorPropAsAssertion("calledOnce", "expected %n to be called once but was called %c%C");
mirrorPropAsAssertion("calledTwice", "expected %n to be called twice but was called %c%C");
mirrorPropAsAssertion("calledThrice", "expected %n to be called thrice but was called %c%C");
mirrorPropAsAssertion("calledOn", "expected %n to be called with %1 as this but was called with %t");
mirrorPropAsAssertion("alwaysCalledOn", "expected %n to always be called with %1 as this but was called with %t");
mirrorPropAsAssertion("calledWithNew", "expected %n to be called with new");
mirrorPropAsAssertion("alwaysCalledWithNew", "expected %n to always be called with new");
mirrorPropAsAssertion("calledWith", "expected %n to be called with arguments %D");
mirrorPropAsAssertion("calledWithMatch", "expected %n to be called with match %D");
mirrorPropAsAssertion("alwaysCalledWith", "expected %n to always be called with arguments %D");
mirrorPropAsAssertion("alwaysCalledWithMatch", "expected %n to always be called with match %D");
mirrorPropAsAssertion("calledWithExactly", "expected %n to be called with exact arguments %D");
mirrorPropAsAssertion("alwaysCalledWithExactly", "expected %n to always be called with exact arguments %D");
mirrorPropAsAssertion("neverCalledWith", "expected %n to never be called with arguments %*%C");
mirrorPropAsAssertion("neverCalledWithMatch", "expected %n to never be called with match %*%C");
mirrorPropAsAssertion("threw", "%n did not throw error%C");
mirrorPropAsAssertion("alwaysThrew", "%n did not always throw error%C");

export default assert;
