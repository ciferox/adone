/**
 * Match functions
 *
 * @author Maximilian Antoni (mail@maxantoni.de)
 * @license BSD
 *
 * Copyright (c) 2012 Maximilian Antoni
 */
import deepEqual from "./util/deep-equal";
import functionName from "./util/function-name";
import iterableToString from "./util/iterable-to-string";
import typeOf from "./util/type-of";
import valueToString from "./util/value-to-string";

const indexOf = Array.prototype.indexOf;

function assertType(value, type, name) {
    const actual = typeOf(value);
    if (actual !== type) {
        throw new TypeError("Expected type of " + name + " to be " +
            type + ", but was " + actual);
    }
}

function every(obj, fn) {
    let pass = true;

    try {
        obj.forEach(function () {
            if (!fn.apply(this, arguments)) {
                // Throwing an error is the only way to break `forEach`
                throw new Error();
            }
        });
    } catch (e) {
        pass = false;
    }

    return pass;
}

function matchObject(expectation, actual) {
    if (actual === null || actual === undefined) {
        return false;
    }
    for (const key in expectation) {
        if (expectation.hasOwnProperty(key)) {
            const exp = expectation[key];
            const act = actual[key];
            if (isMatcher(exp)) {
                if (!exp.test(act)) {
                    return false;
                }
            } else if (typeOf(exp) === "object") {
                if (!matchObject(exp, act)) {
                    return false;
                }
            } else if (!deepEqual(exp, act)) {
                return false;
            }
        }
    }
    return true;
}

const TYPE_MAP = {
    "function": function (m, expectation, message) {
        m.test = expectation;
        m.message = message || "match(" + functionName(expectation) + ")";
    },
    number: function (m, expectation) {
        m.test = function (actual) {
            // we need type coercion here
            return expectation == actual; // eslint-disable-line eqeqeq
        };
    },
    object: function (m, expectation) {
        const array = [];
        let key;

        if (typeof expectation.test === "function") {
            m.test = function (actual) {
                return expectation.test(actual) === true;
            };
            m.message = "match(" + functionName(expectation.test) + ")";
            return m;
        }

        for (key in expectation) {
            if (expectation.hasOwnProperty(key)) {
                array.push(key + ": " + valueToString(expectation[key]));
            }
        }
        m.test = function (actual) {
            return matchObject(expectation, actual);
        };
        m.message = "match(" + array.join(", ") + ")";

        return m;
    },
    regexp: function (m, expectation) {
        m.test = function (actual) {
            return typeof actual === "string" && expectation.test(actual);
        };
    },
    string: function (m, expectation) {
        m.test = function (actual) {
            return typeof actual === "string" && actual.indexOf(expectation) !== -1;
        };
        m.message = "match(\"" + expectation + "\")";
    }
};

class Matcher
{
    toString() {
        return this.message;
    }

    or(m2) {
        if (!arguments.length) {
            throw new TypeError("Matcher expected");
        } else if (!isMatcher(m2)) {
            m2 = match(m2);
        }
        const m1 = this;
        const or = new Matcher;
        or.test = function (actual) {
            return m1.test(actual) || m2.test(actual);
        };
        or.message = m1.message + ".or(" + m2.message + ")";
        return or;
    }

    and(m2) {
        if (!arguments.length) {
            throw new TypeError("Matcher expected");
        } else if (!isMatcher(m2)) {
            m2 = match(m2);
        }
        const m1 = this;
        const and = new Matcher;
        and.test = function (actual) {
            return m1.test(actual) && m2.test(actual);
        };
        and.message = m1.message + ".and(" + m2.message + ")";
        return and;
    }
}

function isMatcher(object) {
    return object instanceof Matcher;
}

function match(expectation, message) {
    const m = new Matcher;
    const type = typeOf(expectation);

    if (type in TYPE_MAP) {
        TYPE_MAP[type](m, expectation, message);
    } else {
        m.test = function (actual) {
            return deepEqual(expectation, actual);
        };
    }

    if (!m.message) {
        m.message = "match(" + valueToString(expectation) + ")";
    }

    return m;
}

match.isMatcher = isMatcher;

match.any = match(function () {
    return true;
}, "any");

match.defined = match(function (actual) {
    return actual !== null && actual !== undefined;
}, "defined");

match.truthy = match(function (actual) {
    return !!actual;
}, "truthy");

match.falsy = match(function (actual) {
    return !actual;
}, "falsy");

match.same = function (expectation) {
    return match(function (actual) {
        return expectation === actual;
    }, "same(" + valueToString(expectation) + ")");
};

match.typeOf = function (type) {
    assertType(type, "string", "type");
    return match(function (actual) {
        return typeOf(actual) === type;
    }, "typeOf(\"" + type + "\")");
};

match.instanceOf = function (type) {
    assertType(type, "function", "type");
    return match(function (actual) {
        return actual instanceof type;
    }, "instanceOf(" + functionName(type) + ")");
};

function createPropertyMatcher(propertyTest, messagePrefix) {
    return function (property, value) {
        assertType(property, "string", "property");
        const onlyProperty = arguments.length === 1;
        let message = messagePrefix + "(\"" + property + "\"";
        if (!onlyProperty) {
            message += ", " + valueToString(value);
        }
        message += ")";
        return match(function (actual) {
            if (actual === undefined || actual === null ||
                    !propertyTest(actual, property)) {
                return false;
            }
            return onlyProperty || deepEqual(value, actual[property]);
        }, message);
    };
}

match.has = createPropertyMatcher(function (actual, property) {
    if (typeof actual === "object") {
        return property in actual;
    }
    return actual[property] !== undefined;
}, "has");

match.hasOwn = createPropertyMatcher(function (actual, property) {
    return actual.hasOwnProperty(property);
}, "hasOwn");

match.array = match.typeOf("array");

match.array.deepEquals = function (expectation) {
    return match(function (actual) {
        // Comparing lengths is the fastest way to spot a difference before iterating through every item
        const sameLength = actual.length === expectation.length;
        return typeOf(actual) === "array" && sameLength && every(actual, function (element, index) {
            return expectation[index] === element;
        });
    }, "deepEquals([" + iterableToString(expectation) + "])");
};

match.array.startsWith = function (expectation) {
    return match(function (actual) {
        return typeOf(actual) === "array" && every(expectation, function (expectedElement, index) {
            return actual[index] === expectedElement;
        });
    }, "startsWith([" + iterableToString(expectation) + "])");
};

match.array.endsWith = function (expectation) {
    return match(function (actual) {
        // This indicates the index in which we should start matching
        const offset = actual.length - expectation.length;

        return typeOf(actual) === "array" && every(expectation, function (expectedElement, index) {
            return actual[offset + index] === expectedElement;
        });
    }, "endsWith([" + iterableToString(expectation) + "])");
};

match.array.contains = function (expectation) {
    return match(function (actual) {
        return typeOf(actual) === "array" && every(expectation, function (expectedElement) {
            return indexOf.call(actual, expectedElement) !== -1;
        });
    }, "contains([" + iterableToString(expectation) + "])");
};

match.map = match.typeOf("map");

match.map.deepEquals = function mapDeepEquals(expectation) {
    return match(function (actual) {
        // Comparing lengths is the fastest way to spot a difference before iterating through every item
        const sameLength = actual.size === expectation.size;
        return typeOf(actual) === "map" && sameLength && every(actual, function (element, key) {
            return expectation.has(key) && expectation.get(key) === element;
        });
    }, "deepEquals(Map[" + iterableToString(expectation) + "])");
};

match.map.contains = function mapContains(expectation) {
    return match(function (actual) {
        return typeOf(actual) === "map" && every(expectation, function (element, key) {
            return actual.has(key) && actual.get(key) === element;
        });
    }, "contains(Map[" + iterableToString(expectation) + "])");
};

match.bool = match.typeOf("boolean");
match.number = match.typeOf("number");
match.string = match.typeOf("string");
match.object = match.typeOf("object");
match.func = match.typeOf("function");
match.regexp = match.typeOf("regexp");
match.date = match.typeOf("date");
match.symbol = match.typeOf("symbol");

export default match;
