export default function (lib, util) {
    const { is, x } = adone;
    const { getAssertion, Assertion, AssertionError } = lib;
    const { flag } = util;

    for (const chain of [
        "to", "be", "been", "is",
        "and", "has", "have", "with",
        "that", "which", "at", "of",
        "same", "but", "does"
    ]) {
        Assertion.addProperty(chain);
    }

    Assertion.addProperty("not", function not() {
        flag(this, "negate", true);
    });

    Assertion.addProperty("deep", function deep() {
        flag(this, "deep", true);
    });

    Assertion.addProperty("nested", function nested() {
        flag(this, "nested", true);
    });

    Assertion.addProperty("own", function own() {
        flag(this, "own", true);
    });

    Assertion.addProperty("ordered", function ordered() {
        flag(this, "ordered", true);
    });

    Assertion.addProperty("any", function any() {
        flag(this, "any", true);
        flag(this, "all", false);
    });


    Assertion.addProperty("all", function all() {
        flag(this, "all", true);
        flag(this, "any", false);
    });

    const vowels = new Set(["a", "e", "i", "o", "u"]);

    const an = function (type, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        type = type.toLowerCase();
        const obj = flag(this, "object");
        const article = vowels.has(type.charAt(0)) ? "an " : "a ";

        this.assert(
            type === util.type(obj).toLowerCase(),
            `expected #{this} to be ${article}${type}`,
            `expected #{this} not to be ${article}${type}`
        );
    };

    Assertion.addChainableMethod("an", an);
    Assertion.addChainableMethod("a", an);

    const includeChainingBehavior = function () {
        flag(this, "contains", true);
    };

    const isDeepIncluded = (arr, val) => arr.some((arrVal) => util.eql(arrVal, val));

    const include = function (val, msg) {
        if (msg) {
            flag(this, "message", msg);
        }

        util.expectTypes(this, ["array", "object", "string"]);

        const obj = flag(this, "object");
        const objType = util.type(obj).toLowerCase();
        const isDeep = flag(this, "deep");
        const descriptor = isDeep ? "deep " : "";

        // This block is for asserting a subset of properties in an object.
        if (objType === "object") {
            const props = adone.util.keys(val);
            const negate = flag(this, "negate");
            let firstErr = null;
            let numErrs = 0;


            for (const prop of props) {
                const propAssertion = getAssertion(obj);
                util.transferFlags(this, propAssertion, true);
                flag(propAssertion, "lockSsfi", true);

                if (!negate || props.length === 1) {
                    propAssertion.property(prop, val[prop]);
                    continue;
                }

                try {
                    propAssertion.property(prop, val[prop]);
                } catch (err) {
                    if (!util.checkError.compatibleConstructor(err, AssertionError)) {
                        throw err;
                    }
                    if (is.null(firstErr)) {
                        firstErr = err;
                    }
                    numErrs++;
                }
            }

            // When validating .not.include with multiple properties, we only want
            // to throw an assertion error if all of the properties are included,
            // in which case we throw the first property assertion error that we
            // encountered.
            if (negate && props.length > 1 && numErrs === props.length) {
                throw firstErr;
            }

            return;
        }

        // Assert inclusion in an array or substring in a string.
        this.assert(
            objType === "string" || !isDeep ? obj.includes(val) : isDeepIncluded(obj, val),
            `expected #{this} to ${descriptor}include ${util.inspect(val)}`,
            `expected #{this} to not ${descriptor}include ${util.inspect(val)}`);
    };

    Assertion.addChainableMethod("include", include, includeChainingBehavior);
    Assertion.addChainableMethod("contain", include, includeChainingBehavior);
    Assertion.addChainableMethod("contains", include, includeChainingBehavior);
    Assertion.addChainableMethod("includes", include, includeChainingBehavior);

    Assertion.addProperty("ok", function ok() {
        this.assert(
            flag(this, "object")
            , "expected #{this} to be truthy"
            , "expected #{this} to be falsy");
    });

    Assertion.addProperty("true", function _true() {
        this.assert(
            flag(this, "object") === true,
            "expected #{this} to be true",
            "expected #{this} to be false",
            flag(this, "negate") ? false : true
        );
    });

    Assertion.addProperty("false", function _false() {
        this.assert(
            flag(this, "object") === false,
            "expected #{this} to be false",
            "expected #{this} to be true",
            flag(this, "negate") ? true : false
        );
    });

    Assertion.addProperty("null", function _null() {
        this.assert(
            is.null(flag(this, "object")),
            "expected #{this} to be null",
            "expected #{this} not to be null"
        );
    });

    Assertion.addProperty("undefined", function _undefined() {
        this.assert(
            is.undefined(flag(this, "object")),
            "expected #{this} to be undefined",
            "expected #{this} not to be undefined"
        );
    });

    Assertion.addProperty("NaN", function NaN() {
        this.assert(
            is.nan(flag(this, "object")),
            "expected #{this} to be NaN",
            "expected #{this} not to be NaN"
        );
    });

    Assertion.addProperty("exist", function exist() {
        const val = flag(this, "object");
        this.assert(
            !is.nil(val),
            "expected #{this} to exist",
            "expected #{this} to not exist"
        );
    });


    Assertion.addProperty("empty", function empty() {
        const val = flag(this, "object");
        const ssfi = flag(this, "ssfi");
        let flagMsg = flag(this, "message");
        flagMsg = flagMsg ? `${flagMsg}: ` : "";
        let itemsCount;

        switch (util.type(val).toLowerCase()) {
            case "array":
            case "string": {
                itemsCount = val.length;
                break;
            }
            case "map":
            case "set": {
                itemsCount = val.size;
                break;
            }
            case "weakmap":
            case "weakset": {
                throw new AssertionError(`${flagMsg}.empty was passed a weak collection`, undefined, ssfi);
            }
            case "function": {
                const msg = `${flagMsg}.empty was passed a function ${util.getName(val)}`;
                throw new AssertionError(msg.trim(), undefined, ssfi);
            }
            default: {
                if (val !== Object(val)) {
                    throw new TypeError(`${flagMsg}.empty was passed non-string primitive ${util.inspect(val)}`);
                }
                itemsCount = adone.util.keys(val).length;
            }
        }

        this.assert(
            itemsCount === 0,
            "expected #{this} to be empty",
            "expected #{this} not to be empty"
        );
    });

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

    const assertEqual = function (val, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        if (flag(this, "deep")) {
            return this.eql(val);
        }
        this.assert(
            val === obj,
            "expected #{this} to equal #{exp}",
            "expected #{this} to not equal #{exp}",
            val,
            this._obj,
            true
        );
    };

    Assertion.addMethod("equal", assertEqual);
    Assertion.addMethod("equals", assertEqual);
    Assertion.addMethod("eq", assertEqual);

    const assertEql = function (obj, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        this.assert(
            util.eql(obj, flag(this, "object")),
            "expected #{this} to deeply equal #{exp}",
            "expected #{this} to not deeply equal #{exp}",
            obj,
            this._obj,
            true
        );
    };

    Assertion.addMethod("eql", assertEql);
    Assertion.addMethod("eqls", assertEql);

    const assertAbove = function (n, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const doLength = flag(this, "doLength");
        let flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");

        if (doLength) {
            getAssertion(obj, flagMsg, ssfi, true).to.have.property("length");
        } else {
            getAssertion(obj, flagMsg, ssfi, true).is.a("number");
        }

        if (!is.number(n)) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            throw new AssertionError(`${flagMsg}the argument to above must be a number`, undefined, ssfi);
        }

        if (doLength) {
            const { length } = obj;
            this.assert(
                length > n,
                "expected #{this} to have a length above #{exp} but got #{act}",
                "expected #{this} to not have a length above #{exp}",
                n,
                length
            );
        } else {
            this.assert(
                obj > n,
                `expected #{this} to be above ${n}`,
                `expected #{this} to be at most ${n}`
            );
        }
    };

    Assertion.addMethod("above", assertAbove);
    Assertion.addMethod("gt", assertAbove);
    Assertion.addMethod("greaterThan", assertAbove);

    const assertLeast = function (n, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const doLength = flag(this, "doLength");
        let flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");

        if (doLength) {
            getAssertion(obj, flagMsg, ssfi, true).to.have.property("length");
        } else {
            getAssertion(obj, flagMsg, ssfi, true).is.a("number");
        }

        if (!is.number(n)) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            throw new AssertionError(`${flagMsg}the argument to least must be a number`, undefined, ssfi);
        }

        if (doLength) {
            const len = obj.length;
            this.assert(
                len >= n,
                "expected #{this} to have a length at least #{exp} but got #{act}",
                "expected #{this} to have a length below #{exp}",
                n,
                len
            );
        } else {
            this.assert(
                obj >= n,
                `expected #{this} to be at least ${n}`,
                `expected #{this} to be below ${n}`
            );
        }
    };

    Assertion.addMethod("least", assertLeast);
    Assertion.addMethod("gte", assertLeast);

    const assertBelow = function (n, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const doLength = flag(this, "doLength");
        let flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");

        if (doLength) {
            getAssertion(obj, flagMsg, ssfi, true).to.have.property("length");
        } else {
            getAssertion(obj, flagMsg, ssfi, true).is.a("number");
        }

        if (!is.number(n)) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            throw new AssertionError(`${flagMsg}the argument to below must be a number`, undefined, ssfi);
        }

        if (doLength) {
            const len = obj.length;
            this.assert(
                len < n,
                "expected #{this} to have a length below #{exp} but got #{act}",
                "expected #{this} to not have a length below #{exp}",
                n,
                len
            );
        } else {
            this.assert(
                obj < n,
                `expected #{this} to be below ${n}`,
                `expected #{this} to be at least ${n}`
            );
        }
    };

    Assertion.addMethod("below", assertBelow);
    Assertion.addMethod("lt", assertBelow);
    Assertion.addMethod("lessThan", assertBelow);

    const assertMost = function (n, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const doLength = flag(this, "doLength");
        let flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");

        if (doLength) {
            getAssertion(obj, flagMsg, ssfi, true).to.have.property("length");
        } else {
            getAssertion(obj, flagMsg, ssfi, true).is.a("number");
        }

        if (!is.number(n)) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            throw new x.InvalidArgument(`${flagMsg}the argument to most must be a number`);
        }

        if (doLength) {
            const len = obj.length;
            this.assert(
                len <= n,
                "expected #{this} to have a length at most #{exp} but got #{act}",
                "expected #{this} to have a length above #{exp}",
                n,
                len
            );
        } else {
            this.assert(
                obj <= n,
                `expected #{this} to be at most ${n}`,
                `expected #{this} to be above ${n}`
            );
        }
    };

    Assertion.addMethod("most", assertMost);
    Assertion.addMethod("lte", assertMost);

    Assertion.addMethod("within", function (start, finish, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const range = `${start}..${finish}`;
        const doLength = flag(this, "doLength");
        let flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");

        if (doLength) {
            getAssertion(obj, flagMsg, ssfi, true).to.have.property("length");
        } else {
            getAssertion(obj, flagMsg, ssfi, true).is.a("number");
        }

        if (!is.number(start) || !is.number(finish)) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            throw new AssertionError(
                `${flagMsg}the arguments to within must be numbers`,
                undefined,
                ssfi
            );
        }

        if (doLength) {
            const len = obj.length;
            this.assert(
                len >= start && len <= finish
                , `expected #{this} to have a length within ${range}`
                , `expected #{this} to not have a length within ${range}`
            );
        } else {
            this.assert(
                obj >= start && obj <= finish
                , `expected #{this} to be within ${range}`
                , `expected #{this} to not be within ${range}`
            );
        }
    });

    const assertInstanceOf = function (constructor, msg) {
        if (msg) {
            flag(this, "message", msg);
        }

        const target = flag(this, "object");
        const ssfi = flag(this, "ssfi");
        let flagMsg = flag(this, "message");
        const validInstanceOfTarget =
            constructor === Object(constructor) &&
            (is.function(constructor) || Symbol.hasInstance in constructor);

        if (!validInstanceOfTarget) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            const constructorType = is.null(constructor) ? "null" : typeof constructor;
            throw new AssertionError(
                `${flagMsg}The instanceof assertion needs a constructor but ${constructorType} was given.`,
                undefined,
                ssfi
            );
        }
        const isInstanceOf = target instanceof constructor;

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

    const assertProperty = function (name, val, msg) {
        if (msg) {
            flag(this, "message", msg);
        }

        const isNested = flag(this, "nested");
        const isOwn = flag(this, "own");
        let flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");

        if (isNested && isOwn) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            throw new AssertionError(`${flagMsg}The "nested" and "own" flags cannot be combined.`, undefined, ssfi);
        }

        const isDeep = flag(this, "deep");
        const negate = flag(this, "negate");
        const obj = flag(this, "object");
        const pathInfo = isNested ? util.getPathInfo(obj, name) : null;
        const value = isNested ? pathInfo.value : obj[name];

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
            hasProperty = is.propertyOwned(obj, name);
        } else if (isNested) {
            hasProperty = pathInfo.exists;
        } else {
            hasProperty = util.hasProperty(obj, name);
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
                hasProperty && (isDeep ? util.eql(val, value) : val === value),
                `expected #{this} to have ${descriptor}${util.inspect(name)} of #{exp}, but got #{act}`,
                `expected #{this} to not have ${descriptor}${util.inspect(name)} of #{act}`,
                val,
                value
            );
        }

        flag(this, "object", value);
    };

    Assertion.addMethod("property", assertProperty);

    const assertOwnProperty = function (...args) {
        flag(this, "own", true);
        assertProperty.apply(this, args);
    };

    Assertion.addMethod("ownProperty", assertOwnProperty);
    Assertion.addMethod("haveOwnProperty", assertOwnProperty);

    const assertOwnPropertyDescriptor = function (name, descriptor, msg) {
        if (is.string(descriptor)) {
            msg = descriptor;
            descriptor = null;
        }
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const actualDescriptor = Object.getOwnPropertyDescriptor(Object(obj), name);
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

    const assertLength = function (n, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");
        getAssertion(obj, flagMsg, ssfi, true).to.have.property("length");
        const len = obj.length;

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

    const assertMatch = function (re, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        this.assert(
            re.exec(obj),
            `expected #{this} to match ${re}`,
            `expected #{this} not to match ${re}`
        );
    };

    Assertion.addMethod("match", assertMatch);
    Assertion.addMethod("matches", assertMatch);

    Assertion.addMethod("string", function string(str, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");
        getAssertion(obj, flagMsg, ssfi, true).is.a("string");

        this.assert(
            obj.includes(str),
            `expected #{this} to contain ${util.inspect(str)}`,
            `expected #{this} to not contain ${util.inspect(str)}`
        );
    });

    const assertKeys = function (...args) {
        let [keys] = args;
        const obj = flag(this, "object");
        const objType = util.type(obj);
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

        if (objType === "Map" || objType === "Set") {
            deepStr = isDeep ? "deeply " : "";
            actual = [];

            obj.forEach((val, key) => {
                actual.push(key);
            });

            if (keysType !== "Array") {
                keys = args;
            }

        } else {
            actual = util.getOwnEnumerableProperties(obj);

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

    const assertThrows = function (errorLike, errMsgMatcher, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const ssfi = flag(this, "ssfi");
        const negate = flag(this, "negate") || false;
        const flagMsg = flag(this, "message");
        getAssertion(obj, flagMsg, ssfi, true).is.a("function");

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

        if (is.asyncFunction(obj)) {
            this._obj = obj().then(() => null, (e) => e).then(handle).then(() => flag(this, "object"));
        } else {
            let caughtErr = null;
            try {
                obj();
            } catch (err) {
                caughtErr = err;
            }
            handle(caughtErr);
        }
    };

    Assertion.addMethod("throw", assertThrows);
    Assertion.addMethod("throws", assertThrows);
    Assertion.addMethod("Throw", assertThrows);

    const respondTo = function (method, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const itself = flag(this, "itself");
        const context = is.function(obj) && !itself ? obj.prototype[method] : obj[method];

        this.assert(
            is.function(context),
            `expected #{this} to respond to ${util.inspect(method)}`,
            `expected #{this} to not respond to ${util.inspect(method)}`
        );
    };

    Assertion.addMethod("respondTo", respondTo);
    Assertion.addMethod("respondsTo", respondTo);

    Assertion.addProperty("itself", function itself() {
        flag(this, "itself", true);
    });

    const satisfy = function (matcher, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const result = matcher(obj);
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

    const closeTo = function (expected, delta, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        let flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");

        getAssertion(obj, flagMsg, ssfi, true).is.a("number");
        if (!is.number(expected) || !is.number(delta)) {
            flagMsg = flagMsg ? `${flagMsg}: ` : "";
            throw new AssertionError(`${flagMsg}the arguments to closeTo or approximately must be numbers`, undefined, ssfi);
        }

        this.assert(
            Math.abs(obj - expected) <= delta,
            `expected #{this} to be close to ${expected} +/- ${delta}`,
            `expected #{this} not to be close to ${expected} +/- ${delta}`
        );
    };

    Assertion.addMethod("closeTo", closeTo);
    Assertion.addMethod("approximately", closeTo);

    // Note: Duplicates are ignored if testing for inclusion instead of sameness.
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

    Assertion.addMethod("members", function members(subset, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const obj = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");

        getAssertion(obj, flagMsg, ssfi, true).to.be.an("array");
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
            isSubsetOf(subset, obj, cmp, contains, ordered),
            failMsg,
            failNegateMsg,
            subset,
            obj,
            true
        );
    });

    const oneOf = function (list, msg) {
        if (msg) {
            flag(this, "message", msg);
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


    const assertChanges = function (subject, prop, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const fn = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");
        getAssertion(fn, flagMsg, ssfi, true).is.a("function");

        let initial;
        if (!prop) {
            getAssertion(subject, flagMsg, ssfi, true).is.a("function");
            initial = subject();
        } else {
            getAssertion(subject, flagMsg, ssfi, true).to.have.property(prop);
            initial = subject[prop];
        }

        fn();

        const final = is.nil(prop) ? subject() : subject[prop];
        const msgObj = is.nil(prop) ? initial : `.${prop}`;

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

    const assertIncreases = function (subject, prop, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const fn = flag(this, "object");
        const ssfi = flag(this, "ssfi");
        const flagMsg = flag(this, "message");
        getAssertion(fn, flagMsg, ssfi, true).is.a("function");

        let initial;
        if (!prop) {
            getAssertion(subject, flagMsg, ssfi, true).is.a("function");
            initial = subject();
        } else {
            getAssertion(subject, flagMsg, ssfi, true).to.have.property(prop);
            initial = subject[prop];
        }

        // Make sure that the target is a number
        getAssertion(initial, flagMsg, ssfi, true).is.a("number");

        fn();

        const final = is.nil(prop) ? subject() : subject[prop];
        const msgObj = is.nil(prop) ? initial : `.${prop}`;

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

    const assertDecreases = function (subject, prop, msg) {
        if (msg) {
            flag(this, "message", msg);
        }
        const fn = flag(this, "object");
        const flagMsg = flag(this, "message");
        const ssfi = flag(this, "ssfi");
        getAssertion(fn, flagMsg, ssfi, true).is.a("function");

        let initial;
        if (!prop) {
            getAssertion(subject, flagMsg, ssfi, true).is.a("function");
            initial = subject();
        } else {
            getAssertion(subject, flagMsg, ssfi, true).to.have.property(prop);
            initial = subject[prop];
        }

        // Make sure that the target is a number
        getAssertion(initial, flagMsg, ssfi, true).is.a("number");

        fn();

        const final = is.nil(prop) ? subject() : subject[prop];
        const msgObj = is.nil(prop) ? initial : `.${prop}`;

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

    const assertDelta = function (delta, msg) {
        if (msg) {
            flag(this, "message", msg);
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

    Assertion.addProperty("extensible", function extensible() {
        const obj = flag(this, "object");

        this.assert(
            Object.isExtensible(obj),
            "expected #{this} to be extensible",
            "expected #{this} to not be extensible"
        );
    });

    Assertion.addProperty("sealed", function sealed() {
        const obj = flag(this, "object");

        this.assert(
            Object.isSealed(obj),
            "expected #{this} to be sealed",
            "expected #{this} to not be sealed"
        );
    });

    Assertion.addProperty("frozen", function frozen() {
        const obj = flag(this, "object");

        this.assert(
            Object.isFrozen(obj),
            "expected #{this} to be frozen",
            "expected #{this} to not be frozen"
        );
    });

    Assertion.addProperty("finite", function finite() {
        const obj = flag(this, "object");

        this.assert(
            is.finite(obj),
            "expected #{this} to be a finite number",
            "expected #{this} to not be a finite number"
        );
    });
}
