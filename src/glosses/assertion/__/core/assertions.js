export default function (lib, util) {
    const { is } = adone;
    const { getAssertion, Assertion, AssertionError } = lib;
    const { flag } = util;

    /**
     * Language chains
     */
    for (const property of [
        "to", "be", "been", "is",
        "and", "has", "have", "with",
        "that", "which", "at", "of",
        "same", "but", "does"
    ]) {
        Assertion.addProperty(property);
    }

    /**
     * Negates all following assertion in the chain
     */
    Assertion.addProperty("not", function not() {
        flag(this, "negate", true);
    });

    /**
     * Causes following assertions to use deep equality
     */
    Assertion.addProperty("deep", function deep() {
        flag(this, "deep", true);
    });

    /**
     * Enables dot- and bracket-notation in following property and include assertions
     */
    Assertion.addProperty("nested", function nested() {
        flag(this, "nested", true);
    });

    /**
     * Causes following property and incude assertions to ignore inherited properties
     */
    Assertion.addProperty("own", function own() {
        flag(this, "own", true);
    });

    /**
     * Causes following members assertions to require that members be in the same order
     */
    Assertion.addProperty("ordered", function ordered() {
        flag(this, "ordered", true);
    });

    /**
     * Causes following keys assertions to only require that the target have at least one of the given keys
     */
    Assertion.addProperty("any", function any() {
        flag(this, "any", true);
        flag(this, "all", false);
    });

    /**
     * Causes following keys assertions to require that the target have all of the given keys
     */
    Assertion.addProperty("all", function all() {
        flag(this, "all", true);
        flag(this, "any", false);
    });

    const vowels = new Set(["a", "e", "i", "o", "u"]);

    /**
     * Asserts that the target's type is `type`
     */
    const an = function (type, message) {
        if (message) {
            flag(this, "message", message);
        }
        type = type.toLowerCase();
        const object = flag(this, "object");
        const article = vowels.has(type[0]) ? "an " : "a ";

        this.assert(
            type === util.type(object).toLowerCase(),
            `expected #{this} to be ${article}${type}`,
            `expected #{this} not to be ${article}${type}`
        );
    };

    Assertion.addChainableMethod("an", an);
    Assertion.addChainableMethod("a", an);

    const includeChainingBehavior = function () {
        flag(this, "contains", true);
    };

    const sameValueZero = (a, b) => (is.nan(a) && is.nan(b)) || a === b;

    /**
     * Asserts that the target includes the given value
     */
    const include = function (value, message) {
        if (message) {
            flag(this, "message", message);
        }

        const obj = flag(this, "object");
        const objType = adone.util.typeOf(obj).toLowerCase();
        let flagMsg = flag(this, "message");
        const negate = flag(this, "negate");
        const ssfi = flag(this, "ssfi");
        const isDeep = flag(this, "deep");
        const descriptor = isDeep ? "deep " : "";

        flagMsg = flagMsg ? `${flagMsg}: ` : "";

        let included = false;

        switch (objType) {
            case "string": {
                included = obj.includes(value);
                break;
            }
            case "weakset": {
                if (isDeep) {
                    throw new AssertionError(
                        `${flagMsg}unable to use .deep.include with WeakSet`,
                        undefined,
                        ssfi
                    );
                }

                included = obj.has(value);
                break;
            }
            case "map": {
                const isEql = isDeep ? is.deepEqual : sameValueZero;
                obj.forEach((item) => {
                    included = included || isEql(item, value);
                });
                break;
            }
            case "set": {
                if (isDeep) {
                    obj.forEach((item) => {
                        included = included || is.deepEqual(item, value);
                    });
                } else {
                    included = obj.has(value);
                }
                break;
            }
            case "array": {
                if (isDeep) {
                    included = obj.some((item) => {
                        return is.deepEqual(item, value);
                    });
                } else {
                    included = obj.includes(value);
                }
                break;
            }
            default: {
                // This block is for asserting a subset of properties in an object.
                // `_.expectTypes` isn't used here because `.include` should work with
                // objects with a custom `@@toStringTag`.
                if (value !== Object(value)) {
                    throw new AssertionError(
                        `${flagMsg}object tested must be an array, a map, an object,`
                      + ` a set, a string, or a weakset, but ${objType} given`,
                        undefined,
                        ssfi
                    );
                }

                const props = Object.keys(value);
                let firstErr = null;
                let numErrs = 0;

                props.forEach(function (prop) {
                    const propAssertion = new Assertion(obj);
                    util.transferFlags(this, propAssertion, true);
                    flag(propAssertion, "lockSsfi", true);

                    if (!negate || props.length === 1) {
                        propAssertion.property(prop, value[prop]);
                        return;
                    }

                    try {
                        propAssertion.property(prop, value[prop]);
                    } catch (err) {
                        if (!util.checkError.compatibleConstructor(err, AssertionError)) {
                            throw err;
                        }
                        if (is.null(firstErr)) {
                            firstErr = err;
                        }
                        numErrs++;
                    }
                }, this);

                // When validating .not.include with multiple properties, we only want
                // to throw an assertion error if all of the properties are included,
                // in which case we throw the first property assertion error that we
                // encountered.
                if (negate && props.length > 1 && numErrs === props.length) {
                    throw firstErr;
                }
                return;
            }
        }

        // Assert inclusion in collection or substring in a string.
        this.assert(
            included,
            `expected #{this} to ${descriptor}include ${util.inspect(value)}`,
            `expected #{this} to not ${descriptor}include ${util.inspect(value)}`
        );
    };

    Assertion.addChainableMethod("include", include, includeChainingBehavior);
    Assertion.addChainableMethod("contain", include, includeChainingBehavior);
    Assertion.addChainableMethod("contains", include, includeChainingBehavior);
    Assertion.addChainableMethod("includes", include, includeChainingBehavior);

    /**
     * Asserts that the target is non-strictly equal to true
     */
    Assertion.addProperty("ok", function ok() {
        this.assert(
            flag(this, "object"),
            "expected #{this} to be truthy",
            "expected #{this} to be falsy"
        );
    });

    /**
     * Asserts that the target is true
     */
    Assertion.addProperty("true", function _true() {
        this.assert(
            flag(this, "object") === true,
            "expected #{this} to be true",
            "expected #{this} to be false",
            flag(this, "negate") ? false : true
        );
    });

    /**
     * Asserts that the target is false
     */
    Assertion.addProperty("false", function _false() {
        this.assert(
            flag(this, "object") === false,
            "expected #{this} to be false",
            "expected #{this} to be true",
            flag(this, "negate") ? true : false
        );
    });

    /**
     * Asserts that the target is null
     */
    Assertion.addProperty("null", function _null() {
        this.assert(
            is.null(flag(this, "object")),
            "expected #{this} to be null",
            "expected #{this} not to be null"
        );
    });

    /**
     * Asserts that the target is undefined
     */
    Assertion.addProperty("undefined", function _undefined() {
        this.assert(
            is.undefined(flag(this, "object")),
            "expected #{this} to be undefined",
            "expected #{this} not to be undefined"
        );
    });

    /**
     * Asserts that the target is NaN
     */
    Assertion.addProperty("NaN", function NaN() {
        this.assert(
            is.nan(flag(this, "object")),
            "expected #{this} to be NaN",
            "expected #{this} not to be NaN"
        );
    });

    /**
     * Asserts that the target is neither null nor undefined
     */
    Assertion.addProperty("exist", function exist() {
        const val = flag(this, "object");
        this.assert(
            !is.nil(val),
            "expected #{this} to exist",
            "expected #{this} to not exist"
        );
    });


    /**
     * Asserts that the target is empty
     */
    Assertion.addProperty("empty", function empty() {
        const value = flag(this, "object");
        const ssfi = flag(this, "ssfi");
        let flagMsg = flag(this, "message");
        flagMsg = flagMsg ? `${flagMsg}: ` : "";
        let itemsCount;

        switch (util.type(value).toLowerCase()) {
            case "array":
            case "string": {
                itemsCount = value.length;
                break;
            }
            case "map":
            case "set": {
                itemsCount = value.size;
                break;
            }
            case "weakmap":
            case "weakset": {
                throw new AssertionError(`${flagMsg}.empty was passed a weak collection`, undefined, ssfi);
            }
            case "function": {
                const msg = `${flagMsg}.empty was passed a function ${util.getName(value)}`;
                throw new AssertionError(msg.trim(), undefined, ssfi);
            }
            default: {
                if (value !== Object(value)) {
                    throw new TypeError(`${flagMsg}.empty was passed non-string primitive ${util.inspect(value)}`);
                }
                itemsCount = adone.util.keys(value).length;
            }
        }

        this.assert(
            itemsCount === 0,
            "expected #{this} to be empty",
            "expected #{this} not to be empty"
        );
    });

    /**
     * Asserts that the target is an arguments object
     */
    const checkArguments = function () {
        const obj = flag(this, "object");
        const type = util.type(obj);
        this.assert(
            type === "Arguments"
            , `expected #{this} to be arguments but got ${type}`
            , "expected #{this} to not be arguments"
        );
    };

    Assertion.addProperty("arguments", checkArguments);
    Assertion.addProperty("Arguments", checkArguments);

    /**
     * Asserts that the target is strictly equal to value
     */
    const assertEqual = function (value, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        if (flag(this, "deep")) {
            return this.eql(value);
        }
        this.assert(
            value === object,
            "expected #{this} to equal #{exp}",
            "expected #{this} to not equal #{exp}",
            value,
            this._obj,
            true
        );
    };

    Assertion.addMethod("equal", assertEqual);
    Assertion.addMethod("equals", assertEqual);
    Assertion.addMethod("eq", assertEqual);

    /**
     * Asserts that the target is deeply equal to object
     */
    const assertEql = function (object, message) {
        if (message) {
            flag(this, "message", message);
        }
        this.assert(
            util.eql(object, flag(this, "object")),
            "expected #{this} to deeply equal #{exp}",
            "expected #{this} to not deeply equal #{exp}",
            object,
            this._obj,
            true
        );
    };

    Assertion.addMethod("eql", assertEql);
    Assertion.addMethod("eqls", assertEql);

    /**
     * Asserts that the target has the same length length and elements as array in the same order
     */
    Assertion.addMethod("eqlArray", function (object, message) {
        if (message) {
            flag(this, "message", message);
        }
        this.assert(
            util.eqlArray(object, flag(this, "object")),
            "expected #{this} to deeply equal #{exp}",
            "expected #{this} to not deeply equal #{exp}",
            object,
            this._obj,
            true
        );
    });

    /**
     * Asserts that target > n
     */
    const assertAbove = function (n, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const doLength = flag(this, "doLength");
        const flagMsg = flag(this, "message");
        const msgPrefix = ((flagMsg) ? `${flagMsg}: ` : "");
        const ssfi = flag(this, "ssfi");
        const objectType = adone.util.typeOf(object).toLowerCase();
        const nType = adone.util.typeOf(n).toLowerCase();
        let shouldThrow = true;
        let errorMessage;

        if (doLength) {
            new Assertion(object, flagMsg, ssfi, true).to.have.property("length");
        }
        if (!doLength && (objectType === "date" && nType !== "date")) {
            errorMessage = `${msgPrefix}the argument to above must be a date`;
        } else if (nType !== "number" && (doLength || objectType === "number")) {
            errorMessage = `${msgPrefix}the argument to above must be a number`;
        } else if (!doLength && (objectType !== "date" && objectType !== "number")) {
            const printObj = (objectType === "string") ? `'${object}'` : object;
            errorMessage = `${msgPrefix}expected ${printObj} to be a number or a date`;
        } else {
            shouldThrow = false;
        }

        if (shouldThrow) {
            throw new AssertionError(errorMessage, undefined, ssfi);
        }

        if (doLength) {
            const len = object.length;
            this.assert(
                len > n,
                "expected #{this} to have a length above #{exp} but got #{act}",
                "expected #{this} to not have a length above #{exp}",
                n,
                len
            );
        } else {
            this.assert(
                object > n,
                "expected #{this} to be above #{exp}",
                "expected #{this} to be at most #{exp}",
                n
            );
        }
    };

    Assertion.addMethod("above", assertAbove);
    Assertion.addMethod("gt", assertAbove);
    Assertion.addMethod("greaterThan", assertAbove);

    /**
     * Asserts that target >= n
     */
    const assertLeast = function (n, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const doLength = flag(this, "doLength");
        const flagMsg = flag(this, "message");
        const msgPrefix = ((flagMsg) ? `${flagMsg}: ` : "");
        const ssfi = flag(this, "ssfi");
        const objectType = adone.util.typeOf(object).toLowerCase();
        const nType = adone.util.typeOf(n).toLowerCase();
        let shouldThrow = true;

        if (doLength) {
            new Assertion(object, flagMsg, ssfi, true).to.have.property("length");
        }

        let errorMessage;

        if (!doLength && (objectType === "date" && nType !== "date")) {
            errorMessage = `${msgPrefix}the argument to least must be a date`;
        } else if (nType !== "number" && (doLength || objectType === "number")) {
            errorMessage = `${msgPrefix}the argument to least must be a number`;
        } else if (!doLength && (objectType !== "date" && objectType !== "number")) {
            const printObj = (objectType === "string") ? `'${object}'` : object;
            errorMessage = `${msgPrefix}expected ${printObj} to be a number or a date`;
        } else {
            shouldThrow = false;
        }

        if (shouldThrow) {
            throw new AssertionError(errorMessage, undefined, ssfi);
        }

        if (doLength) {
            const len = object.length;
            this.assert(
                len >= n,
                "expected #{this} to have a length at least #{exp} but got #{act}",
                "expected #{this} to have a length below #{exp}",
                n,
                len
            );
        } else {
            this.assert(
                object >= n,
                "expected #{this} to be at least #{exp}",
                "expected #{this} to be below #{exp}",
                n
            );
        }
    };

    Assertion.addMethod("least", assertLeast);
    Assertion.addMethod("gte", assertLeast);

    /**
     * Asserts that target < n
     */
    const assertBelow = function (n, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const doLength = flag(this, "doLength");
        const flagMsg = flag(this, "message");
        const msgPrefix = ((flagMsg) ? `${flagMsg}: ` : "");
        const ssfi = flag(this, "ssfi");
        const objectType = adone.util.typeOf(object).toLowerCase();
        const nType = adone.util.typeOf(n).toLowerCase();
        let shouldThrow = true;

        if (doLength) {
            new Assertion(object, flagMsg, ssfi, true).to.have.property("length");
        }

        let errorMessage;

        if (!doLength && (objectType === "date" && nType !== "date")) {
            errorMessage = `${msgPrefix}the argument to below must be a date`;
        } else if (nType !== "number" && (doLength || objectType === "number")) {
            errorMessage = `${msgPrefix}the argument to below must be a number`;
        } else if (!doLength && (objectType !== "date" && objectType !== "number")) {
            const printObj = (objectType === "string") ? `'${object}'` : object;
            errorMessage = `${msgPrefix}expected ${printObj} to be a number or a date`;
        } else {
            shouldThrow = false;
        }

        if (shouldThrow) {
            throw new AssertionError(errorMessage, undefined, ssfi);
        }

        if (doLength) {
            const len = object.length;
            this.assert(
                len < n,
                "expected #{this} to have a length below #{exp} but got #{act}",
                "expected #{this} to not have a length below #{exp}",
                n,
                len
            );
        } else {
            this.assert(
                object < n,
                "expected #{this} to be below #{exp}",
                "expected #{this} to be at least #{exp}",
                n
            );
        }
    };

    Assertion.addMethod("below", assertBelow);
    Assertion.addMethod("lt", assertBelow);
    Assertion.addMethod("lessThan", assertBelow);

    /**
     * Asserts that target <= n
     */
    const assertMost = function (n, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const doLength = flag(this, "doLength");
        const flagMsg = flag(this, "message");
        const msgPrefix = ((flagMsg) ? `${flagMsg}: ` : "");
        const ssfi = flag(this, "ssfi");
        const objectType = adone.util.typeOf(object).toLowerCase();
        const nType = adone.util.typeOf(n).toLowerCase();
        let shouldThrow = true;

        if (doLength) {
            new Assertion(object, flagMsg, ssfi, true).to.have.property("length");
        }

        let errorMessage;

        if (!doLength && (objectType === "date" && nType !== "date")) {
            errorMessage = `${msgPrefix}the argument to most must be a date`;
        } else if (nType !== "number" && (doLength || objectType === "number")) {
            errorMessage = `${msgPrefix}the argument to most must be a number`;
        } else if (!doLength && (objectType !== "date" && objectType !== "number")) {
            const printObj = (objectType === "string") ? `'${object}'` : object;
            errorMessage = `${msgPrefix}expected ${printObj} to be a number or a date`;
        } else {
            shouldThrow = false;
        }

        if (shouldThrow) {
            throw new AssertionError(errorMessage, undefined, ssfi);
        }

        if (doLength) {
            const len = object.length;
            this.assert(
                len <= n,
                "expected #{this} to have a length at most #{exp} but got #{act}",
                "expected #{this} to have a length above #{exp}",
                n,
                len
            );
        } else {
            this.assert(
                object <= n,
                "expected #{this} to be at most #{exp}",
                "expected #{this} to be above #{exp}",
                n
            );
        }
    };

    Assertion.addMethod("most", assertMost);
    Assertion.addMethod("lte", assertMost);

    /**
     * Asserts that start <= target <= end
     */
    Assertion.addMethod("within", function (start, finish, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const doLength = flag(this, "doLength");
        const flagMsg = flag(this, "message");
        const msgPrefix = ((flagMsg) ? `${flagMsg}: ` : "");
        const ssfi = flag(this, "ssfi");
        const objectType = adone.util.typeOf(object).toLowerCase();
        const startType = adone.util.typeOf(start).toLowerCase();
        const finishType = adone.util.typeOf(finish).toLowerCase();
        let shouldThrow = true;
        const range = (startType === "date" && finishType === "date")
            ? `${start.toUTCString()}..${finish.toUTCString()}`
            : `${start}..${finish}`;

        if (doLength) {
            new Assertion(object, flagMsg, ssfi, true).to.have.property("length");
        }

        let errorMessage;

        if (!doLength && (objectType === "date" && (startType !== "date" || finishType !== "date"))) {
            errorMessage = `${msgPrefix}the arguments to within must be dates`;
        } else if ((startType !== "number" || finishType !== "number") && (doLength || objectType === "number")) {
            errorMessage = `${msgPrefix}the arguments to within must be numbers`;
        } else if (!doLength && (objectType !== "date" && objectType !== "number")) {
            const printObj = (objectType === "string") ? `'${object}'` : object;
            errorMessage = `${msgPrefix}expected ${printObj} to be a number or a date`;
        } else {
            shouldThrow = false;
        }

        if (shouldThrow) {
            throw new AssertionError(errorMessage, undefined, ssfi);
        }

        if (doLength) {
            const len = object.length;
            this.assert(
                len >= start && len <= finish,
                `expected #{this} to have a length within ${range}`,
                `expected #{this} to not have a length within ${range}`
            );
        } else {
            this.assert(
                object >= start && object <= finish,
                `expected #{this} to be within ${range}`,
                `expected #{this} to not be within ${range}`
            );
        }
    });

    /**
     * Asserts that the target is an instance of constructor
     */
    const assertInstanceOf = function (constructor, message) {
        if (message) {
            flag(this, "message", message);
        }

        const target = flag(this, "object");
        const ssfi = flag(this, "ssfi");
        let flagMsg = flag(this, "message");
        let isInstanceOf;
        try {
            isInstanceOf = target instanceof constructor;
        } catch (err) {
            if (err instanceof TypeError) {
                flagMsg = flagMsg ? `${flagMsg}: ` : "";
                throw new AssertionError(
                    `${flagMsg}The instanceof assertion needs a constructor but ${adone.util.typeOf(constructor).toLowerCase()} was given.`,
                    undefined,
                    ssfi
                );
            }
            throw err;
        }

        let name = util.getName(constructor);
        if (is.null(name)) {
            name = "an unnamed constructor";
        }

        this.assert(
            isInstanceOf, `expected #{this} to be an instance of ${name}`, `expected #{this} to not be an instance of ${name}`
        );
    };

    Assertion.addMethod("instanceof", assertInstanceOf);
    Assertion.addMethod("instanceOf", assertInstanceOf);

    /**
     * Asserts that the target has a property name `name` with value `value`
     */
    const assertProperty = function (name, value, message) {
        if (message) {
            flag(this, "message", message);
        }

        const isNested = flag(this, "nested");
        const isOwn = flag(this, "own");
        let flagMsg = flag(this, "message");
        const object = flag(this, "object");
        const ssfi = flag(this, "ssfi");

        if (isNested && isOwn) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            throw new AssertionError(`${flagMsg}The "nested" and "own" flags cannot be combined.`, undefined, ssfi);
        }

        if (is.nil(object)) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            throw new AssertionError(
                `${flagMsg}Target cannot be null or undefined.`,
                undefined,
                ssfi
            );
        }

        const isDeep = flag(this, "deep");
        const negate = flag(this, "negate");
        const pathInfo = isNested ? util.getPathInfo(object, name) : null;
        const actualValue = isNested ? pathInfo.value : object[name];

        let descriptor = "";
        if (isDeep) {
            descriptor += "deep ";
        }
        if (isOwn) {
            descriptor += "own ";
        }
        if (isNested) {
            descriptor += "nested ";
        }
        descriptor += "property ";

        let hasProperty;
        if (isOwn) {
            hasProperty = is.propertyOwned(object, name);
        } else if (isNested) {
            hasProperty = pathInfo.exists;
        } else {
            hasProperty = util.hasProperty(object, name);
        }

        // When performing a negated assertion for both name and val, merely having
        // a property with the given name isn't enough to cause the assertion to
        // fail. It must both have a property with the given name, and the value of
        // that property must equal the given val. Therefore, skip this assertion in
        // favor of the next.
        if (!negate || arguments.length === 1) {
            this.assert(
                hasProperty,
                `expected #{this} to have ${descriptor}${util.inspect(name)}`,
                `expected #{this} to not have ${descriptor}${util.inspect(name)}`);
        }

        if (arguments.length > 1) {
            this.assert(
                hasProperty && (isDeep ? util.eql(value, actualValue) : value === actualValue),
                `expected #{this} to have ${descriptor}${util.inspect(name)} of #{exp}, but got #{act}`,
                `expected #{this} to not have ${descriptor}${util.inspect(name)} of #{act}`,
                value,
                actualValue
            );
        }

        flag(this, "object", actualValue);
    };

    Assertion.addMethod("property", assertProperty);

    /**
     * Asserts that the target has its own property name `name` with value `value`
     */
    const assertOwnProperty = function (...args) {
        flag(this, "own", true);
        assertProperty.apply(this, args);
    };

    Assertion.addMethod("ownProperty", assertOwnProperty);
    Assertion.addMethod("haveOwnProperty", assertOwnProperty);

    /**
     * Asserts that the target has its own property descriptor with name `name` and value `value`
     */
    const assertOwnPropertyDescriptor = function (name, descriptor, message) {
        if (is.string(descriptor)) {
            message = descriptor;
            descriptor = null;
        }
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const actualDescriptor = Object.getOwnPropertyDescriptor(Object(object), name);
        if (actualDescriptor && descriptor) {
            this.assert(
                util.eql(descriptor, actualDescriptor),
                `expected the own property descriptor for ${util.inspect(name)} on #{this} to match ${util.inspect(descriptor)}, got ${util.inspect(actualDescriptor)}`,
                `expected the own property descriptor for ${util.inspect(name)} on #{this} to not match ${util.inspect(descriptor)}`,
                descriptor,
                actualDescriptor,
                true
            );
        } else {
            this.assert(
                actualDescriptor,
                `expected #{this} to have an own property descriptor for ${util.inspect(name)}`,
                `expected #{this} to not have an own property descriptor for ${util.inspect(name)}`
            );
        }
        flag(this, "object", actualDescriptor);
    };

    Assertion.addMethod("ownPropertyDescriptor", assertOwnPropertyDescriptor);
    Assertion.addMethod("haveOwnPropertyDescriptor", assertOwnPropertyDescriptor);

    const assertLengthChain = function () {
        flag(this, "doLength", true);
    };

    /**
     * Asserts that the target's property length equal to n
     */
    const assertLength = function (n, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");
        getAssertion(object, flagMsg, ssfi, true).to.have.property("length");
        const len = object.length;

        this.assert(
            len === n,
            "expected #{this} to have a length of #{exp} but got #{act}",
            "expected #{this} to not have a length of #{act}",
            n,
            len
        );
    };

    Assertion.addChainableMethod("length", assertLength, assertLengthChain);
    Assertion.addChainableMethod("lengthOf", assertLength, assertLengthChain);

    /**
     * Asserts that the target matches the regular expression regExp
     */
    const assertMatch = function (regExp, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        this.assert(
            regExp.exec(object),
            `expected #{this} to match ${regExp}`,
            `expected #{this} not to match ${regExp}`
        );
    };

    Assertion.addMethod("match", assertMatch);
    Assertion.addMethod("matches", assertMatch);

    /**
     * Asserts that the target contains str as a substring
     */
    Assertion.addMethod("string", function string(str, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");
        getAssertion(object, flagMsg, ssfi, true).is.a("string");

        this.assert(
            object.includes(str),
            `expected #{this} to contain ${util.inspect(str)}`,
            `expected #{this} to not contain ${util.inspect(str)}`
        );
    });

    /**
     * Assert that the target has the given keys
     */
    const assertKeys = function (...args) {
        let [keys] = args;
        const object = flag(this, "object");
        const objectType = util.type(object);
        const keysType = util.type(keys);
        const ssfi = flag(this, "ssfi");
        const isDeep = flag(this, "deep");
        let str;
        let deepStr = "";
        let ok = true;
        let actual;
        let flagMsg = flag(this, "message");
        flagMsg = flagMsg ? `${flagMsg}: ` : "";
        const mixedArgsMsg = `${flagMsg}when testing keys against an object or an array you must give a single Array|Object|String argument or multiple String arguments`;

        if (objectType === "Map" || objectType === "Set") {
            deepStr = isDeep ? "deeply " : "";
            actual = [];

            object.forEach((val, key) => {
                actual.push(key);
            });

            if (keysType !== "Array") {
                keys = args;
            }

        } else {
            actual = util.getOwnEnumerableProperties(object);

            switch (keysType) {
                case "Array": {
                    if (args.length > 1) {
                        throw new AssertionError(mixedArgsMsg, undefined, ssfi);
                    }
                    break;
                }
                case "Object": {
                    if (args.length > 1) {
                        throw new AssertionError(mixedArgsMsg, undefined, ssfi);
                    }
                    keys = adone.util.keys(keys);
                    break;
                }
                default: {
                    keys = args;
                }
            }

            // Only stringify non-Symbols because Symbols would become "Symbol()"
            keys = keys.map((val) => is.symbol(val) ? val : String(val));
        }

        if (!keys.length) {
            throw new AssertionError(`${flagMsg}keys required`, undefined, ssfi);
        }

        const { length } = keys;
        const any = flag(this, "any");
        let all = flag(this, "all");
        const expected = keys;

        if (!any && !all) {
            all = true;
        }

        // Has any
        if (any) {
            ok = expected.some((expectedKey) => actual.some((actualKey) => {
                return isDeep ? util.eql(expectedKey, actualKey) : expectedKey === actualKey;
            }));
        }

        // Has all
        if (all) {
            ok = expected.every((expectedKey) => actual.some((actualKey) => {
                return isDeep ? util.eql(expectedKey, actualKey) : expectedKey === actualKey;
            }));

            if (!flag(this, "contains")) {
                ok = ok && keys.length === actual.length;
            }
        }

        // Key string
        if (length > 1) {
            keys = keys.map((key) => util.inspect(key));
            const last = keys.pop();
            if (all) {
                str = `${keys.join(", ")}, and ${last}`;
            }
            if (any) {
                str = `${keys.join(", ")}, or ${last}`;
            }
        } else {
            str = util.inspect(keys[0]);
        }

        // Form
        str = (length > 1 ? "keys " : "key ") + str;

        // Have / include
        str = (flag(this, "contains") ? "contain " : "have ") + str;

        // Assertion
        this.assert(
            ok,
            `expected #{this} to ${deepStr}${str}`,
            `expected #{this} to not ${deepStr}${str}`,
            expected.slice(0).sort(util.compareByInspect),
            actual.sort(util.compareByInspect),
            true
        );
    };

    Assertion.addMethod("keys", assertKeys);
    Assertion.addMethod("key", assertKeys);

    /**
     * Assert that the target throws an error
     */
    const assertThrows = function (errorLike, errMsgMatcher, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const ssfi = flag(this, "ssfi");
        const negate = flag(this, "negate") || false;
        const flagMsg = flag(this, "message");
        getAssertion(object, flagMsg, ssfi, true).is.a("function");

        if (is.regexp(errorLike) || is.string(errorLike)) {
            errMsgMatcher = errorLike;
            errorLike = null;
        }

        const handle = (caughtErr) => {
            // If we have the negate flag enabled and at least one valid argument it means we do expect an error
            // but we want it to match a given set of criteria
            const everyArgIsUndefined = is.undefined(errorLike) && is.undefined(errMsgMatcher);

            // If we've got the negate flag enabled and both args, we should only fail if both aren't compatible
            const everyArgIsDefined = Boolean(errorLike && errMsgMatcher);
            let errorLikeFail = false;
            let errMsgMatcherFail = false;

            // Checking if error was thrown
            if (everyArgIsUndefined || !everyArgIsUndefined && !negate) {
                // We need this to display results correctly according to their types
                let errorLikeString = "an error";
                if (errorLike instanceof Error) {
                    errorLikeString = "#{exp}";
                } else if (errorLike) {
                    errorLikeString = util.checkError.getConstructorName(errorLike);
                }

                this.assert(
                    caughtErr,
                    `expected #{this} to throw ${errorLikeString}`,
                    "expected #{this} to not throw an error but #{act} was thrown",
                    errorLike && errorLike.toString(),
                    (caughtErr instanceof Error
                        ? caughtErr.toString()
                        : (is.string(caughtErr)
                            ? caughtErr
                            : caughtErr && util.checkError.getConstructorName(caughtErr)))
                );
            }

            if (errorLike && caughtErr) {
                // We should compare instances only if `errorLike` is an instance of `Error`
                if (errorLike instanceof Error) {
                    const isCompatibleInstance = util.checkError.compatibleInstance(
                        caughtErr,
                        errorLike
                    );

                    if (isCompatibleInstance === negate) {
                        // These checks were created to ensure we won't fail too soon when we've got both args and a negate
                        if (everyArgIsDefined && negate) {
                            errorLikeFail = true;
                        } else {
                            this.assert(
                                negate,
                                "expected #{this} to throw #{exp} but #{act} was thrown",
                                `expected #{this} to not throw #{exp}${caughtErr && !negate ? " but #{act} was thrown" : ""}`,
                                errorLike.toString(),
                                caughtErr.toString()
                            );
                        }
                    }
                }

                const isCompatibleConstructor = util.checkError.compatibleConstructor(
                    caughtErr,
                    errorLike
                );
                if (isCompatibleConstructor === negate) {
                    if (everyArgIsDefined && negate) {
                        errorLikeFail = true;
                    } else {
                        this.assert(
                            negate,
                            "expected #{this} to throw #{exp} but #{act} was thrown",
                            `expected #{this} to not throw #{exp}${caughtErr ? " but #{act} was thrown" : ""}`,
                            (errorLike instanceof Error ? errorLike.toString() :
                                errorLike && util.checkError.getConstructorName(errorLike)),
                            (caughtErr instanceof Error ? caughtErr.toString() :
                                caughtErr && util.checkError.getConstructorName(caughtErr))
                        );
                    }
                }
            }
            if (caughtErr && !is.nil(errMsgMatcher)) {
                // Here we check compatible messages
                let placeholder = "including";
                if (is.regexp(errMsgMatcher)) {
                    placeholder = "matching";
                }

                const isCompatibleMessage = util.checkError.compatibleMessage(
                    caughtErr,
                    errMsgMatcher
                );
                if (isCompatibleMessage === negate) {
                    if (everyArgIsDefined && negate) {
                        errMsgMatcherFail = true;
                    } else {
                        this.assert(
                            negate,
                            `expected #{this} to throw error ${placeholder} #{exp} but got #{act}`,
                            `expected #{this} to throw error not ${placeholder} #{exp}`,
                            errMsgMatcher,
                            util.checkError.getMessage(caughtErr)
                        );
                    }
                }
            }
            // If both assertions failed and both should've matched we throw an error
            if (errorLikeFail && errMsgMatcherFail) {
                this.assert(
                    negate,
                    "expected #{this} to throw #{exp} but #{act} was thrown",
                    `expected #{this} to not throw #{exp}${caughtErr ? " but #{act} was thrown" : ""}`,
                    (errorLike instanceof Error ? errorLike.toString() :
                        errorLike && util.checkError.getConstructorName(errorLike)),
                    (caughtErr instanceof Error ? caughtErr.toString() :
                        caughtErr && util.checkError.getConstructorName(caughtErr))
                );
            }


            flag(this, "object", caughtErr);
        };

        if (is.asyncFunction(object)) {
            this._obj = object().then(() => null, (e) => e).then(handle).then(() => flag(this, "object"));
        } else {
            let caughtErr = null;
            try {
                object();
            } catch (err) {
                caughtErr = err;
            }
            handle(caughtErr);
        }
    };

    Assertion.addMethod("throw", assertThrows);
    Assertion.addMethod("throws", assertThrows);
    Assertion.addMethod("Throw", assertThrows);

    /**
     * Assert that the target has a method with name `method`. For functions checks the prototype
     */
    const respondTo = function (method, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const itself = flag(this, "itself");
        const context = is.function(object) && !itself ? object.prototype[method] : object[method];

        this.assert(
            is.function(context),
            `expected #{this} to respond to ${util.inspect(method)}`,
            `expected #{this} to not respond to ${util.inspect(method)}`
        );
    };

    Assertion.addMethod("respondTo", respondTo);
    Assertion.addMethod("respondsTo", respondTo);

    /**
     * Makes respondsTo behave like the target is not a function
     */
    Assertion.addProperty("itself", function itself() {
        flag(this, "itself", true);
    });

    /**
     * Asserts that matches returns a truthy value with the target as the first argument
     */
    const satisfy = function (matcher, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const result = matcher(object);
        this.assert(
            result,
            `expected #{this} to satisfy ${util.objDisplay(matcher)}`,
            `expected #{this} to not satisfy${util.objDisplay(matcher)}`,
            flag(this, "negate") ? false : true,
            result
        );
    };

    Assertion.addMethod("satisfy", satisfy);
    Assertion.addMethod("satisfies", satisfy);

    /**
     * Asserts that the target is expected +/- delta
     */
    const closeTo = function (expected, delta, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        let flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");

        getAssertion(object, flagMsg, ssfi, true).is.a("number");
        if (!is.number(expected) || !is.number(delta)) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            throw new AssertionError(`${flagMsg}the arguments to closeTo or approximately must be numbers`, undefined, ssfi);
        }

        this.assert(
            Math.abs(object - expected) <= delta,
            `expected #{this} to be close to ${expected} +/- ${delta}`,
            `expected #{this} not to be close to ${expected} +/- ${delta}`
        );
    };

    Assertion.addMethod("closeTo", closeTo);
    Assertion.addMethod("approximately", closeTo);

    const isSubsetOf = (subset, superset, cmp, contains, ordered) => {
        if (!contains) {
            if (subset.length !== superset.length) {
                return false;
            }
            superset = superset.slice();
        }

        return subset.every((elem, idx) => {
            if (ordered) {
                return cmp ? cmp(elem, superset[idx]) : elem === superset[idx];
            }

            if (!cmp) {
                const matchIdx = superset.indexOf(elem);
                if (matchIdx === -1) {
                    return false;
                }

                // Remove match from superset so not counted twice if duplicate in subset.
                if (!contains) {
                    superset.splice(matchIdx, 1);
                }
                return true;
            }

            return superset.some((elem2, matchIdx) => {
                if (!cmp(elem, elem2)) {
                    return false;
                }

                // Remove match from superset so not counted twice if duplicate in subset.
                if (!contains) {
                    superset.splice(matchIdx, 1);
                }
                return true;
            });
        });
    };

    /**
     * Asserts that the target array has the same members as the given
     */
    Assertion.addMethod("members", function members(subset, message) {
        if (message) {
            flag(this, "message", message);
        }
        const object = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");

        getAssertion(object, flagMsg, ssfi, true).to.be.an("array");
        getAssertion(subset, flagMsg, ssfi, true).to.be.an("array");

        const contains = flag(this, "contains");
        const ordered = flag(this, "ordered");

        let subject;
        let failMsg;
        let failNegateMsg;

        if (contains) {
            subject = ordered ? "an ordered superset" : "a superset";
            failMsg = `expected #{this} to be ${subject} of #{exp}`;
            failNegateMsg = `expected #{this} to not be ${subject} of #{exp}`;
        } else {
            subject = ordered ? "ordered members" : "members";
            failMsg = `expected #{this} to have the same ${subject} as #{exp}`;
            failNegateMsg = `expected #{this} to not have the same ${subject} as #{exp}`;
        }

        const cmp = flag(this, "deep") ? util.eql : undefined;

        this.assert(
            isSubsetOf(subset, object, cmp, contains, ordered),
            failMsg,
            failNegateMsg,
            subset,
            object,
            true
        );
    });

    /**
     * Asserts that the target is the member of list
     */
    const oneOf = function (list, message) {
        if (message) {
            flag(this, "message", message);
        }
        const expected = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");
        getAssertion(list, flagMsg, ssfi, true).to.be.an("array");

        this.assert(
            list.includes(expected),
            "expected #{this} to be one of #{exp}",
            "expected #{this} to not be one of #{exp}",
            list,
            expected
        );
    };

    Assertion.addMethod("oneOf", oneOf);


    /**
     * With no property asserts that fn returns a different value after the target's invokation than before
     * With property asserts that the target's invokation changes subject's property
     */
    const assertChanges = function (subject, property, message) {
        if (message) {
            flag(this, "message", message);
        }
        const fn = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");
        getAssertion(fn, flagMsg, ssfi, true).is.a("function");

        let initial;
        if (!property) {
            getAssertion(subject, flagMsg, ssfi, true).is.a("function");
            initial = subject();
        } else {
            getAssertion(subject, flagMsg, ssfi, true).to.have.property(property);
            initial = subject[property];
        }

        fn();

        const final = is.nil(property) ? subject() : subject[property];
        const msgObj = is.nil(property) ? initial : `.${property}`;

        // This gets flagged because of the .by(delta) assertion
        flag(this, "deltaMsgObj", msgObj);
        flag(this, "initialDeltaValue", initial);
        flag(this, "finalDeltaValue", final);
        flag(this, "deltaBehavior", "change");
        flag(this, "realDelta", final !== initial);

        this.assert(
            initial !== final
            , `expected ${msgObj} to change`
            , `expected ${msgObj} to not change`
        );
    };

    Assertion.addMethod("change", assertChanges);
    Assertion.addMethod("changes", assertChanges);

    /**
     * With no property asserts that fn returns a greater number after the target's invokation than before
     * With property asserts that the target's invokation increases subject's property
     */
    const assertIncreases = function (subject, property, message) {
        if (message) {
            flag(this, "message", message);
        }
        const fn = flag(this, "object");
        const ssfi = flag(this, "ssfi");
        const flagMsg = flag(this, "message");
        getAssertion(fn, flagMsg, ssfi, true).is.a("function");

        let initial;
        if (!property) {
            getAssertion(subject, flagMsg, ssfi, true).is.a("function");
            initial = subject();
        } else {
            getAssertion(subject, flagMsg, ssfi, true).to.have.property(property);
            initial = subject[property];
        }

        // Make sure that the target is a number
        getAssertion(initial, flagMsg, ssfi, true).is.a("number");

        fn();

        const final = is.nil(property) ? subject() : subject[property];
        const msgObj = is.nil(property) ? initial : `.${property}`;

        flag(this, "deltaMsgObj", msgObj);
        flag(this, "initialDeltaValue", initial);
        flag(this, "finalDeltaValue", final);
        flag(this, "deltaBehavior", "increase");
        flag(this, "realDelta", final - initial);

        this.assert(
            final - initial > 0,
            `expected ${msgObj} to increase`,
            `expected ${msgObj} to not increase`
        );
    };

    Assertion.addMethod("increase", assertIncreases);
    Assertion.addMethod("increases", assertIncreases);

    /**
     * With no property asserts that fn returns a lesser number after the target's invokation than before
     * With property asserts that the target's invokation decreases subject's property
     */
    const assertDecreases = function (subject, property, message) {
        if (message) {
            flag(this, "message", message);
        }
        const fn = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");
        getAssertion(fn, flagMsg, ssfi, true).is.a("function");

        let initial;
        if (!property) {
            getAssertion(subject, flagMsg, ssfi, true).is.a("function");
            initial = subject();
        } else {
            getAssertion(subject, flagMsg, ssfi, true).to.have.property(property);
            initial = subject[property];
        }

        // Make sure that the target is a number
        getAssertion(initial, flagMsg, ssfi, true).is.a("number");

        fn();

        const final = is.nil(property) ? subject() : subject[property];
        const msgObj = is.nil(property) ? initial : `.${property}`;

        flag(this, "deltaMsgObj", msgObj);
        flag(this, "initialDeltaValue", initial);
        flag(this, "finalDeltaValue", final);
        flag(this, "deltaBehavior", "decrease");
        flag(this, "realDelta", initial - final);

        this.assert(
            final - initial < 0,
            `expected ${msgObj} to decrease`,
            `expected ${msgObj} to not decrease`
        );
    };

    Assertion.addMethod("decrease", assertDecreases);
    Assertion.addMethod("decreases", assertDecreases);

    /**
     * Asserts that the value was decreased/increased by delta
     */
    const assertDelta = function (delta, message) {
        if (message) {
            flag(this, "message", message);
        }
        const msgObj = flag(this, "deltaMsgObj");
        const initial = flag(this, "initialDeltaValue");
        const final = flag(this, "finalDeltaValue");
        const behavior = flag(this, "deltaBehavior");
        const realDelta = flag(this, "realDelta");

        let expression;
        if (behavior === "change") {
            expression = Math.abs(final - initial) === Math.abs(delta);
        } else {
            expression = realDelta === Math.abs(delta);
        }

        this.assert(
            expression,
            `expected ${msgObj} to ${behavior} by ${delta}`,
            `expected ${msgObj} to not ${behavior} by ${delta}`
        );
    };

    Assertion.addMethod("by", assertDelta);

    /**
     * Asserts that the target is extensible
     */
    Assertion.addProperty("extensible", function extensible() {
        const obj = flag(this, "object");

        this.assert(
            Object.isExtensible(obj),
            "expected #{this} to be extensible",
            "expected #{this} to not be extensible"
        );
    });

    /**
     * Asserts that the target is sealed
     */
    Assertion.addProperty("sealed", function sealed() {
        const obj = flag(this, "object");

        this.assert(
            Object.isSealed(obj),
            "expected #{this} to be sealed",
            "expected #{this} to not be sealed"
        );
    });

    /**
     * Asserts that the target is frozen
     */
    Assertion.addProperty("frozen", function frozen() {
        const obj = flag(this, "object");

        this.assert(
            Object.isFrozen(obj),
            "expected #{this} to be frozen",
            "expected #{this} to not be frozen"
        );
    });

    /**
     * Asserts that the target is a finite number
     */
    Assertion.addProperty("finite", function finite() {
        const obj = flag(this, "object");

        this.assert(
            is.finite(obj),
            "expected #{this} to be a finite number",
            "expected #{this} to not be a finite number"
        );
    });
}
