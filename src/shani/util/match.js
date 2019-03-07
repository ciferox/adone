const {
    is,
    error,
    util: { keys },
    shani: { util },
    lazify,
    lodash
} = adone;
const { __ } = util;

const lazy = lazify({
    deepEqual: () => __.util.deepEqual.use(util.match)
}, null, require);

const assertType = (value, type, name) => {
    const actual = __.util.typeOf(value);
    if (actual !== type) {
        throw new TypeError(`Expected type of ${name} to be ${type}, but was ${actual}`);
    }
};

const assertMethodExists = (value, method, name, methodPath) => {
    if (is.nil(value[method])) {
        throw new TypeError(`Expected ${name} to have method ${methodPath}`);
    }
};

const every = (obj, fn) => {
    let pass = true;

    try {
        obj.forEach(function (...args) {
            if (!fn.apply(this, args)) {
                // Throwing an error is the only way to break `forEach`
                throw new Error();
            }
        });
    } catch (e) {
        pass = false;
    }

    return pass;
};


const matcher = {
    toString() {
        return this.message;
    }
};

const isMatcher = (object) => matcher.isPrototypeOf(object);

const matchObject = (expectation, actual) => {
    if (is.nil(actual)) {
        return false;
    }

    return keys(expectation).every((key) => {
        const exp = expectation[key];
        const act = actual[key];

        if (isMatcher(exp)) {
            if (!exp.test(act)) {
                return false;
            }
        } else if (__.util.typeOf(exp) === "object") {
            if (!matchObject(exp, act)) {
                return false;
            }
        } else if (!lazy.deepEqual(exp, act)) { // eslint-disable-line no-use-before-define
            return false;
        }

        return true;
    });
};

const TYPE_MAP = {
    function(m, expectation, message) {
        m.test = expectation;
        m.message = message || `match(${adone.assertion.util.getName(expectation)})`;
    },
    number(m, expectation) {
        m.test = (actual) => {
            // we need type coercion here
            return expectation == actual; // eslint-disable-line eqeqeq
        };
    },
    object(m, expectation) {
        let array = [];

        if (is.function(expectation.test)) {
            m.test = (actual) => expectation.test(actual) === true;
            m.message = `match(${adone.assertion.util.getName(expectation.test)})`;
            return m;
        }

        array = keys(expectation).map((key) => `${key}: ${__.util.valueToString(expectation[key])}`);

        m.test = (actual) => matchObject(expectation, actual);
        m.message = `match(${array.join(", ")})`;

        return m;
    },
    regexp(m, expectation) {
        m.test = (actual) => is.string(actual) && expectation.test(actual);
    },
    string(m, expectation) {
        m.test = (actual) => is.string(actual) && actual.indexOf(expectation) !== -1;
        m.message = `match("${expectation}")`;
    }
};

const match = (expectation, message) => {
    const m = Object.create(matcher);
    const type = __.util.typeOf(expectation);

    if (type in TYPE_MAP) {
        TYPE_MAP[type](m, expectation, message);
    } else {
        m.test = (actual) => lazy.deepEqual(expectation, actual); // eslint-disable-line no-use-before-define
    }

    if (!m.message) {
        m.message = `match(${__.util.valueToString(expectation)})`;
    }

    return m;
};

matcher.or = function (m2) {
    if (!arguments.length) {
        throw new error.InvalidArgumentException("Matcher expected");
    } else if (!isMatcher(m2)) {
        m2 = match(m2);
    }
    const m1 = this;
    const or = Object.create(matcher);
    or.test = (actual) => m1.test(actual) || m2.test(actual);
    or.message = `${m1.message}.or(${m2.message})`;
    return or;
};

matcher.and = function (m2) {
    if (!arguments.length) {
        throw new error.InvalidArgumentException("Matcher expected");
    } else if (!isMatcher(m2)) {
        m2 = match(m2);
    }
    const m1 = this;
    const and = Object.create(matcher);
    and.test = (actual) => m1.test(actual) && m2.test(actual);
    and.message = `${m1.message}.and(${m2.message})`;
    return and;
};

match.isMatcher = isMatcher;

match.any = match(adone.truly, "any");

match.defined = match((actual) => !is.nil(actual), "defined");

match.truthy = match((actual) => Boolean(actual), "truthy");

match.falsy = match((actual) => !actual, "falsy");

match.same = (expectation) => match((actual) => expectation === actual, `same(${__.util.valueToString(expectation)})`);

match.typeOf = (type) => {
    assertType(type, "string", "type");
    return match((actual) => __.util.typeOf(actual) === type, `typeOf("${type}")`);
};

match.instanceOf = function (type) {
    assertMethodExists(type, Symbol.hasInstance, "type", "[Symbol.hasInstance]");
    return match((actual) => {
        return actual instanceof type;
    }, `instanceOf(${adone.assertion.util.getName(type) || Object.prototype.toString.call(type)})`);
};

const createPropertyMatcher = (propertyTest, messagePrefix) => {
    return (...args) => {
        const [property, value] = args;
        assertType(property, "string", "property");
        const onlyProperty = args.length === 1;
        let message = `${messagePrefix}("${property}"`;
        if (!onlyProperty) {
            message += `, ${__.util.valueToString(value)}`;
        }
        message += ")";
        return match((actual) => {
            if (is.nil(actual) || !propertyTest(actual, property)) {
                return false;
            }
            return onlyProperty || lazy.deepEqual(value, actual[property]);
        }, message);
    };
};

match.has = createPropertyMatcher((actual, property) => {
    if (is.object(actual)) {
        return property in actual;
    }
    return !is.undefined(actual[property]);
}, "has");

match.hasOwn = createPropertyMatcher((actual, property) => actual.hasOwnProperty(property), "hasOwn");

match.hasNested = (...args) => {
    const [property, value] = args;
    assertType(property, "string", "property");
    const onlyProperty = args.length === 1;
    let message = `hasNested("${property}"`;
    if (!onlyProperty) {
        message += `, ${__.util.valueToString(value)}`;
    }
    message += ")";
    return match((actual) => {
        if (is.nil(actual) || is.undefined(lodash.get(actual, property))) {
            return false;
        }
        return onlyProperty || lazy.deepEqual(value, lodash.get(actual, property));
    }, message);
};

match.every = function (predicate) {
    if (!isMatcher(predicate)) {
        throw new TypeError("Matcher expected");
    }

    return match((actual) => {
        if (__.util.typeOf(actual) === "object") {
            return every(Object.keys(actual), (key) => {
                return predicate.test(actual[key]);
            });
        }

        return Boolean(actual) && __.util.typeOf(actual.forEach) === "function" && every(actual, (element) => {
            return predicate.test(element);
        });
    }, `every(${predicate.message})`);
};

match.some = function (predicate) {
    if (!isMatcher(predicate)) {
        throw new TypeError("Matcher expected");
    }

    return match((actual) => {
        if (__.util.typeOf(actual) === "object") {
            return !every(Object.keys(actual), (key) => {
                return !predicate.test(actual[key]);
            });
        }

        return Boolean(actual) && adone.typeOf(actual.forEach) === "function" && !every(actual, (element) => {
            return !predicate.test(element);
        });
    }, `some(${predicate.message})`);
};

match.array = match.typeOf("array");

match.array.deepEquals = (expectation) => match((actual) => {
    // Comparing lengths is the fastest way to spot a difference before iterating through every item
    const sameLength = actual.length === expectation.length;
    return __.util.typeOf(actual) === "array" && sameLength && every(actual, (element, index) => expectation[index] === element);
}, `deepEquals([${__.util.iterableToString(expectation)}])`);

match.array.startsWith = (expectation) => match((actual) => {
    return __.util.typeOf(actual) === "array" && every(expectation, (expectedElement, index) => actual[index] === expectedElement);
}, `startsWith([${__.util.iterableToString(expectation)}])`);

match.array.endsWith = (expectation) => match((actual) => {
    // This indicates the index in which we should start matching
    const offset = actual.length - expectation.length;
    return __.util.typeOf(actual) === "array" && every(expectation, (expectedElement, index) => actual[offset + index] === expectedElement);
}, `endsWith([${__.util.iterableToString(expectation)}])`);

match.array.contains = (expectation) => match((actual) => {
    return __.util.typeOf(actual) === "array" && every(expectation, (expectedElement) => actual.indexOf(expectedElement) !== -1);
}, `contains([${__.util.iterableToString(expectation)}])`);

match.map = match.typeOf("map");

match.map.deepEquals = (expectation) => match((actual) => {
    // Comparing lengths is the fastest way to spot a difference before iterating through every item
    const sameLength = actual.size === expectation.size;
    return __.util.typeOf(actual) === "map" && sameLength && every(actual, (element, key) => {
        return expectation.has(key) && expectation.get(key) === element;
    });
}, `deepEquals(Map[${__.util.iterableToString(expectation)}])`);

match.map.contains = (expectation) => match((actual) => {
    return __.util.typeOf(actual) === "map" && every(expectation, (element, key) => {
        return actual.has(key) && actual.get(key) === element;
    });
}, `contains(Map[${__.util.iterableToString(expectation)}])`);

match.set = match.typeOf("set");

match.set.deepEquals = (expectation) => match((actual) => {
    // Comparing lengths is the fastest way to spot a difference before iterating through every item
    const sameLength = actual.size === expectation.size;
    return __.util.typeOf(actual) === "set" && sameLength && every(actual, (element) => expectation.has(element));
}, `deepEquals(Set[${__.util.iterableToString(expectation)}])`);

match.set.contains = (expectation) => match((actual) => {
    return __.util.typeOf(actual) === "set" && every(expectation, (element) => actual.has(element));
}, `contains(Set[${__.util.iterableToString(expectation)}])`);

match.bool = match.typeOf("boolean");
match.number = match.typeOf("number");
match.string = match.typeOf("string");
match.object = match.typeOf("object");
match.func = match.typeOf("function");
match.regexp = match.typeOf("regexp");
match.date = match.typeOf("date");
match.symbol = match.typeOf("symbol");

export default match;
