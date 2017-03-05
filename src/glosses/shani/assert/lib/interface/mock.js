import adone from "adone";

const { is } = adone;

export default function mock(chai, utils) {
    function isSpy(putativeSpy) {
        return is.function(putativeSpy) &&
            is.function(putativeSpy.getCall) &&
            is.function(putativeSpy.calledWithExactly);
    }

    function timesInWords(count) {
        if (count === 1) {
            return "once";
        }
        if (count === 2) {
            return "twice";
        }
        if (count === 3) {
            return "thrice";
        }
        return `${count || 0} times`;
    }

    function isCall(putativeCall) {
        return putativeCall && isSpy(putativeCall.proxy);
    }

    function assertCanWorkWith(assertion) {
        if (!isSpy(assertion._obj) && !isCall(assertion._obj)) {
            throw new TypeError(`${utils.inspect(assertion._obj)} is not a spy or a call to a spy!`);
        }
    }

    function getMessages(spy, action, nonNegatedSuffix, always, args) {
        const verbPhrase = always ? "always have " : "have ";
        nonNegatedSuffix = nonNegatedSuffix || "";
        if (isSpy(spy.proxy)) {
            spy = spy.proxy;
        }

        function printfArray(array) {
            return spy.printf.apply(spy, array);
        }

        return {
            affirmative() {
                return printfArray([`expected %n to ${verbPhrase}${action}${nonNegatedSuffix}`].concat(args));
            },
            negative() {
                return printfArray([`expected %n to not ${verbPhrase}${action}`].concat(args));
            }
        };
    }

    function mockProperty(name, action, nonNegatedSuffix) {
        utils.addProperty(chai.Assertion.prototype, name, function () {
            assertCanWorkWith(this);

            const messages = getMessages(this._obj, action, nonNegatedSuffix, false);
            this.assert(this._obj[name], messages.affirmative, messages.negative);
        });
    }

    function mockPropertyAsBooleanMethod(name, action, nonNegatedSuffix) {
        utils.addMethod(chai.Assertion.prototype, name, function (arg) {
            assertCanWorkWith(this);

            const messages = getMessages(this._obj, action, nonNegatedSuffix, false, [timesInWords(arg)]);
            this.assert(this._obj[name] === arg, messages.affirmative, messages.negative);
        });
    }

    function createMockMethodHandler(mockName, action, nonNegatedSuffix) {
        return function (...args) {
            assertCanWorkWith(this);

            const alwaysMockMethod = `always${mockName[0].toUpperCase()}${mockName.substring(1)}`;
            const shouldBeAlways = utils.flag(this, "always") && is.function(this._obj[alwaysMockMethod]);
            const mockMethod = shouldBeAlways ? alwaysMockMethod : mockName;

            const messages = getMessages(this._obj, action, nonNegatedSuffix, shouldBeAlways, args);
            this.assert(this._obj[mockMethod].apply(this._obj, args), messages.affirmative, messages.negative);
        };
    }

    function mockMethodAsProperty(name, action, nonNegatedSuffix) {
        const handler = createMockMethodHandler(name, action, nonNegatedSuffix);
        utils.addProperty(chai.Assertion.prototype, name, handler);
    }

    function exceptionalMockMethod(chaiName, mockName, action, nonNegatedSuffix) {
        const handler = createMockMethodHandler(mockName, action, nonNegatedSuffix);
        utils.addMethod(chai.Assertion.prototype, chaiName, handler);
    }

    function mockMethod(name, action, nonNegatedSuffix) {
        exceptionalMockMethod(name, name, action, nonNegatedSuffix);
    }

    utils.addProperty(chai.Assertion.prototype, "always", function () {
        utils.flag(this, "always", true);
    });

    mockProperty("called", "been called", " at least once, but it was never called");
    mockPropertyAsBooleanMethod("callCount", "been called exactly %1", ", but it was called %c%C");
    mockProperty("calledOnce", "been called exactly once", ", but it was called %c%C");
    mockProperty("calledTwice", "been called exactly twice", ", but it was called %c%C");
    mockProperty("calledThrice", "been called exactly thrice", ", but it was called %c%C");
    mockMethodAsProperty("calledWithNew", "been called with new");
    mockMethod("calledBefore", "been called before %1");
    mockMethod("calledAfter", "been called after %1");
    mockMethod("calledOn", "been called with %1 as this", ", but it was called with %t instead");
    mockMethod("calledWith", "been called with arguments %*", "%C");
    mockMethod("calledWithExactly", "been called with exact arguments %*", "%C");
    mockMethod("calledWithMatch", "been called with arguments matching %*", "%C");
    mockMethod("returned", "returned %1");
    exceptionalMockMethod("thrown", "threw", "thrown %1");
}
