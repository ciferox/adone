import "../bootstrap";

const {
    is,
    assertion
} = adone;
const { expect } = assertion;

describe("assertion", "utilities", () => {
    after(() => {
        // Some clean-up so we can run tests in a --watch
        delete assertion.Assertion.prototype.eqqqual;
        delete assertion.Assertion.prototype.result;
        delete assertion.Assertion.prototype.doesnotexist;
    });

    it("_obj", () => {
        const foo = "bar";
        const test = expect(foo);

        expect(test).to.have.property("_obj", foo);

        const bar = "baz";
        test._obj = bar;

        expect(test).to.have.property("_obj", bar);
        test.equal(bar);
    });

    it("transferFlags", () => {
        const foo = "bar";
        const test = expect(foo).not;

        assertion.use((_chai, utils) => {
            const obj = {};
            utils.transferFlags(test, obj);
            expect(utils.flag(obj, "object")).to.equal(foo);
            expect(utils.flag(obj, "negate")).to.equal(true);
        });
    });

    it("transferFlags, includeAll = false", () => {
        const foo = "bar";

        assertion.use((_chai, utils) => {
            const target = {};
            const test = function () { };

            const assertion_ = new assertion.Assertion(target, "message", test, true);
            const flag = {};
            utils.flag(assertion_, "flagMe", flag);
            utils.flag(assertion_, "negate", true);
            const obj = {};
            utils.transferFlags(assertion_, obj, false);

            expect(utils.flag(obj, "object")).to.equal(undefined);
            expect(utils.flag(obj, "message")).to.equal(undefined);
            expect(utils.flag(obj, "ssfi")).to.equal(undefined);
            expect(utils.flag(obj, "lockSsfi")).to.equal(undefined);
            expect(utils.flag(obj, "negate")).to.equal(true);
            expect(utils.flag(obj, "flagMe")).to.equal(flag);
        });
    });

    it("transferFlags, includeAll = true", () => {
        const foo = "bar";

        assertion.use((_chai, utils) => {
            const target = {};
            const test = function () { };

            const assertion_ = new assertion.Assertion(target, "message", test, true);
            const flag = {};
            utils.flag(assertion_, "flagMe", flag);
            utils.flag(assertion_, "negate", true);
            const obj = {};
            utils.transferFlags(assertion_, obj, true);

            expect(utils.flag(obj, "object")).to.equal(target);
            expect(utils.flag(obj, "message")).to.equal("message");
            expect(utils.flag(obj, "ssfi")).to.equal(test);
            expect(utils.flag(obj, "lockSsfi")).to.equal(true);
            expect(utils.flag(obj, "negate")).to.equal(true);
            expect(utils.flag(obj, "flagMe")).to.equal(flag);
        });
    });

    describe("addMethod", () => {
        let assertionConstructor; let utils;

        before(() => {
            assertion.use((_chai, _utils) => {
                utils = _utils;
                assertionConstructor = _chai.Assertion;

                expect(_chai.Assertion).to.not.respondTo("eqqqual");
                _chai.Assertion.addMethod("eqqqual", function (str) {
                    const object = utils.flag(this, "object");
                    new _chai.Assertion(object).to.be.eql(str);
                });

                _chai.Assertion.addMethod("result", () => {
                    return "result";
                });

                _chai.Assertion.addMethod("returnNewAssertion", function () {
                    utils.flag(this, "mySpecificFlag", "value1");
                    utils.flag(this, "ultraSpecificFlag", "value2");
                });

                _chai.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(() => {
            delete assertion.Assertion.prototype.eqqqual;

            delete assertion.Assertion.prototype.result;

            delete assertion.Assertion.prototype.returnNewAssertion;
            delete assertion.Assertion.prototype.checkFlags;
        });

        it("addMethod", () => {
            expect(assertion.Assertion).to.respondTo("eqqqual");
            expect("spec").to.eqqqual("spec");
        });

        it("addMethod returning result", () => {
            expect(expect("foo").result()).to.equal("result");
        });

        it("addMethod returns new assertion with flags copied over", () => {
            const assertion1 = expect("foo");
            const assertion2 = assertion1.to.returnNewAssertion();

            // Checking if a new assertion was returned
            expect(assertion1).to.not.be.equal(assertion2);

            // Check if flags were copied
            assertion2.checkFlags();

            // Checking if it's really an instance of an Assertion
            expect(assertion2).to.be.instanceOf(assertionConstructor);

            // Test chaining `.length` after a method to guarantee it's not a function's
            // `length`. Note: 'instanceof' cannot be used here because the test will
            // fail in IE 10 due to how addChainableMethod works without __proto__
            // support. Therefore, test the constructor property of length instead.
            const anAssertion = expect([1, 2, 3]).to.be.an.instanceof(Array);
            expect(anAssertion.length.constructor).to.equal(assertionConstructor);

            const anotherAssertion = expect([1, 2, 3]).to.have.a.lengthOf(3).and.to.be.ok;
            expect(anotherAssertion.length.constructor).to.equal(assertionConstructor);
        });

        it("addMethod sets `ssfi` when `lockSsfi` isn't set", () => {
            const origAssertion = expect(1);
            const origSsfi = utils.flag(origAssertion, "ssfi");

            const newAssertion = origAssertion.eqqqual(1);
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.not.equal(newSsfi);
        });

        it("addMethod doesn't set `ssfi` when `lockSsfi` is set", () => {
            const origAssertion = expect(1);
            const origSsfi = utils.flag(origAssertion, "ssfi");

            utils.flag(origAssertion, "lockSsfi", true);

            const newAssertion = origAssertion.eqqqual(1);
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.equal(newSsfi);
        });
    });

    describe("overwriteMethod", () => {
        let assertionConstructor; let utils;

        before(() => {
            assertion.config.includeStack = false;

            assertion.use((_chai, _utils) => {
                assertionConstructor = _chai.Assertion;
                utils = _utils;

                _chai.Assertion.addMethod("four", function () {
                    this.assert(this._obj === 4, "expected #{this} to be 4", "expected #{this} to not be 4", 4);
                });

                _chai.Assertion.overwriteMethod("four", (_super) => {
                    return function () {
                        utils.flag(this, "mySpecificFlag", "value1");
                        utils.flag(this, "ultraSpecificFlag", "value2");

                        if (is.string(this._obj)) {
                            this.assert(this._obj === "four", "expected #{this} to be 'four'", "expected #{this} to not be 'four'", "four");
                        } else {
                            _super.call(this);
                        }
                    };
                });

                _chai.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(() => {
            delete assertion.Assertion.prototype.four;
            delete assertion.Assertion.prototype.checkFlags;
            delete assertion.Assertion.prototype.eqqqual;
            delete assertion.Assertion.prototype.doesnotexist;
            delete assertion.Assertion.prototype.doesnotexistfail;
        });

        it("overwriteMethod", () => {
            assertion.use((_chai, utils) => {
                _chai.Assertion.addMethod("eqqqual", function (str) {
                    const object = utils.flag(this, "object");
                    new _chai.Assertion(object).to.be.eql(str);
                });

                _chai.Assertion.overwriteMethod("eqqqual", (_super) => {
                    return function (str) {
                        const object = utils.flag(this, "object");
                        if (object == "cucumber" && str == "cuke") {
                            utils.flag(this, "cucumber", true);
                        } else {
                            _super.apply(this, arguments);
                        }
                    };
                });
            });

            const vege = expect("cucumber").to.eqqqual("cucumber");
            expect(vege.__flags).to.not.have.property("cucumber");
            const cuke = expect("cucumber").to.eqqqual("cuke");
            expect(cuke.__flags).to.have.property("cucumber");

            assertion.use((_chai, _) => {
                expect(_chai.Assertion).to.not.respondTo("doesnotexist");
                _chai.Assertion.overwriteMethod("doesnotexist", (_super) => {
                    expect(_super).to.be.a("function");
                    return function () {
                        _.flag(this, "doesnt", true);
                    };
                });
            });

            const dne = expect("something").to.doesnotexist();
            expect(dne.__flags).to.have.property("doesnt");

            assertion.use((_chai, _) => {
                expect(_chai.Assertion).to.not.respondTo("doesnotexistfail");
                _chai.Assertion.overwriteMethod("doesnotexistfail", (_super) => {
                    expect(_super).to.be.a("function");
                    return function () {
                        _.flag(this, "doesnt", true);
                        _super.apply(this, arguments);
                    };
                });
            });

            const dneFail = expect("something");
            let dneError;
            try {
                dneFail.doesnotexistfail();
            } catch (e) {
                dneError = e;
            }
            expect(dneFail.__flags).to.have.property("doesnt");
            expect(dneError.message).to.eql("doesnotexistfail is not a function");
        });

        it("overwriteMethod returning result", () => {
            assertion.use((_chai, _) => {
                _chai.Assertion.overwriteMethod("result", (_super) => {
                    return function () {
                        return "result";
                    };
                });
            });

            expect(expect("foo").result()).to.equal("result");
        });

        it("calling _super has correct stack trace", () => {
            try {
                expect(5).to.be.four();
                expect(false, "should not get here because error thrown").to.be.ok;
            } catch (err) {
                // not all browsers support err.stack
                // Phantom does not include function names for getter exec
                if (!is.undefined(err.stack) && !is.undefined(Error.captureStackTrace)) {
                    expect(err.stack).to.include("index.test.js");
                    expect(err.stack).to.not.include("overwriteMethod");
                }
            }
        });

        it("overwritten behavior has correct stack trace", () => {
            try {
                expect("five").to.be.four();
                expect(false, "should not get here because error thrown").to.be.ok;
            } catch (err) {
                // not all browsers support err.stack
                // Phantom does not include function names for getter exec
                if (!is.undefined(err.stack) && !is.undefined(Error.captureStackTrace)) {
                    expect(err.stack).to.include("index.test.js");
                    expect(err.stack).to.not.include("overwriteMethod");
                }
            }
        });

        it("should return a new assertion with flags copied over", () => {
            const assertion1 = expect("four");
            const assertion2 = assertion1.four();

            // Checking if a new assertion was returned
            expect(assertion1).to.not.be.equal(assertion2);

            // Check if flags were copied
            assertion2.checkFlags();

            // Checking if it's really an instance of an Assertion
            expect(assertion2).to.be.instanceOf(assertionConstructor);

            // Test chaining `.length` after a method to guarantee it is not a function's `length`
            expect("four").to.be.a.four().length.above(2);

            // Ensure that foo returns an Assertion (not a function)
            expect(expect("four").four()).to.be.an.instanceOf(assertionConstructor);
        });

        it("overwriteMethod sets `ssfi` when `lockSsfi` isn't set", () => {
            const origAssertion = expect(4);
            const origSsfi = utils.flag(origAssertion, "ssfi");

            const newAssertion = origAssertion.four();
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.not.equal(newSsfi);
        });

        it("overwriteMethod doesn't set `ssfi` when `lockSsfi` is set", () => {
            const origAssertion = expect(4);
            const origSsfi = utils.flag(origAssertion, "ssfi");

            utils.flag(origAssertion, "lockSsfi", true);

            const newAssertion = origAssertion.four();
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.equal(newSsfi);
        });
    });

    describe("addProperty", () => {
        let assertionConstructor = assertion.Assertion;
        let utils;

        before(() => {
            assertion.use((_chai, _utils) => {
                utils = _utils;
                assertionConstructor = _chai.Assertion;

                _chai.Assertion.addProperty("tea", function () {
                    utils.flag(this, "tea", "chai");
                });

                _chai.Assertion.addProperty("result", () => {
                    return "result";
                });

                _chai.Assertion.addProperty("thing", function () {
                    utils.flag(this, "mySpecificFlag", "value1");
                    utils.flag(this, "ultraSpecificFlag", "value2");
                });

                _chai.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(() => {
            delete assertion.Assertion.prototype.tea;
            delete assertion.Assertion.prototype.thing;
            delete assertion.Assertion.prototype.checkFlags;
            delete assertion.Assertion.prototype.result;
        });

        it("addProperty", () => {
            const assert = expect("chai").to.be.tea;
            expect(assert.__flags.tea).to.equal("chai");
        });

        it("addProperty returning result", () => {
            expect(expect("foo").result).to.equal("result");
        });

        it("addProperty returns a new assertion with flags copied over", () => {
            const assertion1 = expect("foo");
            const assertion2 = assertion1.is.thing;

            // Checking if a new assertion was returned
            expect(assertion1).to.not.be.equal(assertion2);

            // Check if flags were copied
            assertion2.checkFlags();

            // If it is, calling length on it should return an assertion, not a function
            expect([1, 2, 3]).to.be.an.instanceof(Array);

            // Checking if it's really an instance of an Assertion
            expect(assertion2).to.be.instanceOf(assertionConstructor);

            // Test chaining `.length` after a property to guarantee it is not a function's `length`
            expect([1, 2, 3]).to.be.a.thing.with.length.above(2);
            expect([1, 2, 3]).to.be.an.instanceOf(Array).and.have.length.below(4);

            expect(expect([1, 2, 3]).be).to.be.an.instanceOf(assertionConstructor);
            expect(expect([1, 2, 3]).thing).to.be.an.instanceOf(assertionConstructor);
        });

        it("addProperty sets `ssfi` when `lockSsfi` isn't set", () => {
            const origAssertion = expect(1);
            const origSsfi = utils.flag(origAssertion, "ssfi");

            const newAssertion = origAssertion.to.be.tea;
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.not.equal(newSsfi);
        });

        it("addProperty doesn't set `ssfi` when `lockSsfi` is set", () => {
            const origAssertion = expect(1);
            const origSsfi = utils.flag(origAssertion, "ssfi");

            utils.flag(origAssertion, "lockSsfi", true);

            const newAssertion = origAssertion.to.be.tea;
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.equal(newSsfi);
        });
    });

    describe("overwriteProperty", () => {
        let assertionConstructor; let utils;

        before(() => {
            assertion.config.includeStack = false;

            assertion.use((_chai, _utils) => {
                assertionConstructor = _chai.Assertion;
                utils = _utils;

                _chai.Assertion.addProperty("tea", function () {
                    utils.flag(this, "tea", "chai");
                });

                _chai.Assertion.overwriteProperty("tea", (_super) => {
                    return function () {
                        const act = utils.flag(this, "object");
                        if (act === "matcha") {
                            utils.flag(this, "tea", "matcha");
                        } else {
                            _super.call(this);
                        }
                    };
                });

                _chai.Assertion.overwriteProperty("result", (_super) => {
                    return function () {
                        return "result";
                    };
                });

                _chai.Assertion.addProperty("four", function () {
                    this.assert(this._obj === 4, "expected #{this} to be 4", "expected #{this} to not be 4", 4);
                });

                _chai.Assertion.overwriteProperty("four", (_super) => {
                    return function () {
                        if (is.string(this._obj)) {
                            this.assert(this._obj === "four", "expected #{this} to be 'four'", "expected #{this} to not be 'four'", "four");
                        } else {
                            _super.call(this);
                        }
                    };
                });

                _chai.Assertion.addProperty("foo");

                _chai.Assertion.overwriteProperty("foo", (_super) => {
                    return function blah() {
                        utils.flag(this, "mySpecificFlag", "value1");
                        utils.flag(this, "ultraSpecificFlag", "value2");
                        _super.call(this);
                    };
                });

                _chai.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(() => {
            delete assertion.Assertion.prototype.tea;
            delete assertion.Assertion.prototype.four;
            delete assertion.Assertion.prototype.result;
            delete assertion.Assertion.prototype.foo;
            delete assertion.Assertion.prototype.checkFlags;
        });

        it("overwriteProperty", () => {
            const matcha = expect("matcha").to.be.tea;
            expect(matcha.__flags.tea).to.equal("matcha");
            const assert = expect("something").to.be.tea;
            expect(assert.__flags.tea).to.equal("chai");
        });

        it("overwriteProperty returning result", () => {
            expect(expect("foo").result).to.equal("result");
        });

        it("calling _super has correct stack trace", () => {
            try {
                expect(5).to.be.four;
                expect(false, "should not get here because error thrown").to.be.ok;
            } catch (err) {
                // not all browsers support err.stack
                // Phantom does not include function names for getter exec
                if (!is.undefined(err.stack) && !is.undefined(Error.captureStackTrace)) {
                    expect(err.stack).to.include("index.test.js");
                    expect(err.stack).to.not.include("overwriteProperty");
                }
            }
        });

        it("overwritten behavior has correct stack trace", () => {
            try {
                expect("five").to.be.four;
                expect(false, "should not get here because error thrown").to.be.ok;
            } catch (err) {
                // not all browsers support err.stack
                // Phantom does not include function names for getter exec
                if (!is.undefined(err.stack) && !is.undefined(Error.captureStackTrace)) {
                    expect(err.stack).to.include("index.test.js");
                    expect(err.stack).to.not.include("overwriteProperty");
                }
            }
        });

        it("should return new assertion with flags copied over", () => {
            const assertion1 = expect("foo");
            const assertion2 = assertion1.is.foo;

            // Checking if a new assertion was returned
            expect(assertion1).to.not.be.equal(assertion2);

            // Check if flags were copied
            assertion2.checkFlags();

            // If it is, calling length on it should return an assertion, not a function
            expect([1, 2, 3]).to.be.an.foo.length.below(1000);

            // Checking if it's really an instance of an Assertion
            expect(assertion2).to.be.instanceOf(assertionConstructor);

            // Test chaining `.length` after a property to guarantee it is not a function's `length`
            expect([1, 2, 3]).to.be.a.foo.with.length.above(2);
            expect([1, 2, 3]).to.be.an.instanceOf(Array).and.have.length.below(4);

            expect(expect([1, 2, 3]).be).to.be.an.instanceOf(assertionConstructor);
            expect(expect([1, 2, 3]).foo).to.be.an.instanceOf(assertionConstructor);
        });

        it("overwriteProperty sets `ssfi` when `lockSsfi` isn't set", () => {
            const origAssertion = expect(4);
            const origSsfi = utils.flag(origAssertion, "ssfi");

            const newAssertion = origAssertion.to.be.four;
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.not.equal(newSsfi);
        });

        it("overwriteProperty doesn't set `ssfi` when `lockSsfi` is set", () => {
            const origAssertion = expect(4);
            const origSsfi = utils.flag(origAssertion, "ssfi");

            utils.flag(origAssertion, "lockSsfi", true);

            const newAssertion = origAssertion.to.be.four;
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.equal(newSsfi);
        });
    });

    it("getMessage", () => {
        assertion.use((_chai, _) => {
            expect(_.getMessage({}, [])).to.equal("");
            expect(_.getMessage({}, [null, null, null])).to.equal("");

            const obj = {};
            _.flag(obj, "message", "foo");
            expect(_.getMessage(obj, [])).to.contain("foo");
        });
    });

    it("getMessage passed message as function", () => {
        assertion.use((_chai, _) => {
            const obj = {};
            const msg = function () {
                return "expected a to eql b";
            };
            const negateMsg = function () {
                return "expected a not to eql b";
            };
            expect(_.getMessage(obj, [null, msg, negateMsg])).to.equal("expected a to eql b");
            _.flag(obj, "negate", true);
            expect(_.getMessage(obj, [null, msg, negateMsg])).to.equal("expected a not to eql b");
        });
    });

    it("getMessage template tag substitution", () => {
        assertion.use((_chai, _) => {
            const objName = "trojan horse";
            const actualValue = "an actual value";
            const expectedValue = "an expected value";
            [
                // known template tags
                {
                    template: "one #{this} two",
                    expected: `one '${objName}' two`
                },
                {
                    template: "one #{act} two",
                    expected: `one '${actualValue}' two`
                },
                {
                    template: "one #{exp} two",
                    expected: `one '${expectedValue}' two`
                },
                // unknown template tag
                {
                    template: "one #{unknown} two",
                    expected: "one #{unknown} two"
                },
                // repeated template tag
                {
                    template: "#{this}#{this}",
                    expected: `'${objName}''${objName}'`
                },
                // multiple template tags in different order
                {
                    template: "#{this}#{act}#{exp}#{act}#{this}",
                    expected: `'${objName}''${actualValue}''${expectedValue}''${actualValue}''${objName}'`
                },
                // immune to string.prototype.replace() `$` substitution
                {
                    objName: "-$$-",
                    template: "#{this}",
                    expected: "'-$$-'"
                },
                {
                    actualValue: "-$$-",
                    template: "#{act}",
                    expected: "'-$$-'"
                },
                {
                    expectedValue: "-$$-",
                    template: "#{exp}",
                    expected: "'-$$-'"
                }
            ].forEach((config) => {
                config.objName = config.objName || objName;
                config.actualValue = config.actualValue || actualValue;
                config.expectedValue = config.expectedValue || expectedValue;
                const obj = { _obj: config.actualValue };
                _.flag(obj, "object", config.objName);
                expect(_.getMessage(obj, [null, config.template, null, config.expectedValue])).to.equal(config.expected);
            });
        });
    });

    it("inspect with custom stylize-calling inspect()s", () => {
        assertion.use((_chai, _) => {
            const obj = {
                outer: {
                    inspect(depth, options) {
                        return options.stylize("Object content", "string");
                    }
                }
            };
            expect(_.inspect(obj)).to.equal("{ outer: Object content }");
        });
    });

    it("inspect with custom object-returning inspect()s", () => {
        assertion.use((_chai, _) => {
            const obj = {
                outer: {
                    inspect() {
                        return { foo: "bar" };
                    }
                }
            };

            expect(_.inspect(obj)).to.equal("{ outer: { foo: 'bar' } }");
        });
    });

    it("inspect negative zero", () => {
        assertion.use((_chai, _) => {
            expect(_.inspect(-0)).to.equal("-0");
            expect(_.inspect([-0])).to.equal("[ -0 ]");
            expect(_.inspect({ hp: -0 })).to.equal("{ hp: -0 }");
        });
    });

    it("inspect Symbol", () => {
        if (!is.function(Symbol)) {
            return;
        }

        assertion.use((_chai, _) => {
            expect(_.inspect(Symbol())).to.equal("Symbol()");
            expect(_.inspect(Symbol("cat"))).to.equal("Symbol(cat)");
        });
    });

    it("inspect every kind of available TypedArray", () => {
        assertion.use((_chai, _) => {
            const arr = [1, 2, 3];
            const exp = "[ 1, 2, 3 ]";
            let isNode = true;

            // eslint-disable-next-line adone/no-typeof
            if (typeof window !== "undefined") {
                isNode = false;
            }

            // Checks if engine supports common TypedArrays
            if ((!isNode && "Int8Array" in window) ||
                isNode && !is.undefined(typeof "Int8Array")) {
                // Typed array inspections should work as array inspections do
                expect(_.inspect(new Int8Array(arr))).to.equal(exp);
                expect(_.inspect(new Uint8Array(arr))).to.equal(exp);
                expect(_.inspect(new Int16Array(arr))).to.equal(exp);
                expect(_.inspect(new Uint16Array(arr))).to.equal(exp);
                expect(_.inspect(new Int32Array(arr))).to.equal(exp);
                expect(_.inspect(new Uint32Array(arr))).to.equal(exp);
                expect(_.inspect(new Float32Array(arr))).to.equal(exp);
            }

            // These ones may not be available alongside the others above
            if ((!isNode && "Uint8ClampedArray" in window) ||
                isNode && !is.undefined(typeof "Uint8ClampedArray")) {
                expect(_.inspect(new Uint8ClampedArray(arr))).to.equal(exp);
            }

            if ((!isNode && "Float64Array" in window) ||
                isNode && !is.undefined(typeof "Float64Array")) {
                expect(_.inspect(new Float64Array(arr))).to.equal(exp);
            }
        });
    });

    it("inspect an assertion", () => {
        assertion.use((_chai, _) => {
            const assertion_ = expect(1);
            const anInspectFn = function () {
                return _.inspect(assertion_);
            };

            expect(anInspectFn).to.not.throw();
        });
    });

    it("truncate long TypedArray", () => {
        assertion.use((_chai, _) => {

            const arr = [];
            const exp = "[ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ... ]";
            let isNode = true;

            // Filling arr with lots of elements
            for (let i = 1; i <= 1000; i++) {
                arr.push(i);
            }

            // eslint-disable-next-line adone/no-typeof
            if (typeof window !== "undefined") {
                isNode = false;
            }

            if ((!isNode && "Int8Array" in window) ||
                isNode && !is.undefined(typeof "Int8Array")) {
                expect(_.inspect(new Int8Array(arr))).to.equal(exp);
            }
        });
    });

    describe("addChainableMethod", () => {
        let assertionConstructor; let utils;

        before(() => {
            assertion.use((_chai, _utils) => {
                assertionConstructor = _chai.Assertion;
                utils = _utils;

                _chai.Assertion.addChainableMethod("x",
                    function () {
                        new assertion.Assertion(this._obj).to.be.equal("x");
                    }
                    , function () {
                        if (this._obj === Object(this._obj)) {
                            this._obj.__x = "X!";
                        }
                    }
                );

                _chai.Assertion.addChainableMethod("foo", function (str) {
                    utils.flag(this, "mySpecificFlag", "value1");
                    utils.flag(this, "ultraSpecificFlag", "value2");

                    const obj = utils.flag(this, "object");
                    new _chai.Assertion(obj).to.be.equal(str);
                });

                _chai.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(() => {
            delete assertion.Assertion.prototype.x;
            delete assertion.Assertion.prototype.foo;
            delete assertion.Assertion.prototype.checkFlags;
        });

        it("addChainableMethod", () => {
            expect("foo").x.to.equal("foo");
            expect("x").x();

            expect(() => {
                expect("foo").x();
            }).to.throw(assertion.AssertionError);

            // Verify whether the original Function properties are present.
            // see https://github.com/chaijs/chai/commit/514dd6ce4#commitcomment-2593383
            const propertyDescriptor = Object.getOwnPropertyDescriptor(assertion.Assertion.prototype, "x");
            expect(propertyDescriptor.get).to.have.property("call", Function.prototype.call);
            expect(propertyDescriptor.get).to.have.property("apply", Function.prototype.apply);
            expect(propertyDescriptor.get()).to.have.property("call", Function.prototype.call);
            expect(propertyDescriptor.get()).to.have.property("apply", Function.prototype.apply);

            const obj = {};
            expect(obj).x.to.be.ok;
            expect(obj).to.have.property("__x", "X!");
        });

        it("addChainableMethod should return a new assertion with flags copied over", () => {
            assertion.config.proxyExcludedKeys.push("nodeType");

            const assertion1 = expect("bar");
            const assertion2_ = assertion1.foo("bar");

            // Checking if a new assertion was returned
            expect(assertion1).to.not.be.equal(assertion2_);

            // Check if flags were copied
            assertion2_.checkFlags();

            // Checking if it's really an instance of an Assertion
            expect(assertion2_).to.be.instanceOf(assertionConstructor);

            // Test chaining `.length` after a method to guarantee it is not a function's `length`
            expect("bar").to.be.a.foo("bar").length.above(2);

            // Ensure that foo returns an Assertion (not a function)
            expect(expect("bar").foo("bar")).to.be.an.instanceOf(assertionConstructor);
        });

        it("addChainableMethod sets `ssfi` when `lockSsfi` isn't set", () => {
            const origAssertion = expect("x");
            const origSsfi = utils.flag(origAssertion, "ssfi");

            const newAssertion = origAssertion.to.be.x();
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.not.equal(newSsfi);
        });

        it("addChainableMethod doesn't set `ssfi` when `lockSsfi` is set", () => {
            const origAssertion = expect("x");
            const origSsfi = utils.flag(origAssertion, "ssfi");

            utils.flag(origAssertion, "lockSsfi", true);

            const newAssertion = origAssertion.to.be.x();
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.equal(newSsfi);
        });
    });

    describe("overwriteChainableMethod", () => {
        let assertionConstructor;
        let utils;

        before(() => {
            assertion.use((_chai, _utils) => {
                assertionConstructor = _chai.Assertion;
                utils = _utils;

                _chai.Assertion.addChainableMethod("x",
                    function () {
                        new assertion.Assertion(this._obj).to.be.equal("x");
                    }
                    , function () {
                        if (this._obj === Object(this._obj)) {
                            this._obj.__x = "X!";
                        }
                    }
                );

                _chai.Assertion.overwriteChainableMethod("x",
                    (_super) => {
                        return function () {
                            utils.flag(this, "mySpecificFlag", "value1");
                            utils.flag(this, "ultraSpecificFlag", "value2");

                            if (utils.flag(this, "marked")) {
                                new assertion.Assertion(this._obj).to.be.equal("spot");
                            } else {
                                _super.apply(this, arguments);
                            }
                        };
                    }
                    , (_super) => {
                        return function () {
                            utils.flag(this, "message", "x marks the spot");
                            _super.apply(this, arguments);
                        };
                    }
                );

                _chai.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2" &&
                        utils.flag(this, "message") === "x marks the spot"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(() => {
            delete assertion.Assertion.prototype.x;
            delete assertion.Assertion.prototype.checkFlags;
        });

        it("overwriteChainableMethod", () => {
            // Make sure the original behavior of 'x' remains the same
            expect("foo").x.to.equal("foo");
            expect("x").x();
            expect(() => {
                expect("foo").x();
            }).to.throw(assertion.AssertionError);
            const obj = {};
            expect(obj).x.to.be.ok;
            expect(obj).to.have.property("__x", "X!");

            // Test the new behavior of 'x'
            const assertion_ = expect("foo").x.to.be.ok;
            expect(utils.flag(assertion_, "message")).to.equal("x marks the spot");
            expect(() => {
                const assertion_ = expect("x");
                utils.flag(assertion_, "marked", true);
                assertion_.x();
            }).to.throw(assertion.AssertionError);
        });

        it("should return a new assertion with flags copied over", () => {
            const assertion1 = expect("x");
            const assertion2_ = assertion1.x();

            assertion.config.proxyExcludedKeys.push("nodeType");

            // Checking if a new assertion was returned
            expect(assertion1).to.not.be.equal(assertion2_);

            // Check if flags were copied
            assertion2_.checkFlags();

            // Checking if it's really an instance of an Assertion
            expect(assertion2_).to.be.instanceOf(assertionConstructor);

            // Test chaining `.length` after a method to guarantee it is not a function's `length`
            expect("x").to.be.x().length.above(0);

            // Ensure that foo returns an Assertion (not a function)
            expect(expect("x").x()).to.be.an.instanceOf(assertionConstructor);

            if (is.function(Object.setPrototypeOf)) {
                expect(expect("x").x).to.be.an.instanceOf(assertionConstructor);
            }
        });

        it("overwriteChainableMethod sets `ssfi` when `lockSsfi` isn't set", () => {
            const origAssertion = expect("x");
            const origSsfi = utils.flag(origAssertion, "ssfi");

            const newAssertion = origAssertion.to.be.x();
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.not.equal(newSsfi);
        });

        it("overwriteChainableMethod doesn't set `ssfi` when `lockSsfi` is set", () => {
            const origAssertion = expect("x");
            const origSsfi = utils.flag(origAssertion, "ssfi");

            utils.flag(origAssertion, "lockSsfi", true);

            const newAssertion = origAssertion.to.be.x();
            const newSsfi = utils.flag(newAssertion, "ssfi");

            expect(origSsfi).to.equal(newSsfi);
        });
    });

    it("compareByInspect", () => {
        assertion.use((_chai, _) => {
            const cbi = _.compareByInspect;

            // "'c" is less than "'d"
            expect(cbi("cat", "dog")).to.equal(-1);
            expect(cbi("dog", "cat")).to.equal(1);
            expect(cbi("cat", "cat")).to.equal(1);

            // "{ cat: [ [ 'dog', 1" is less than "{ cat [ [ 'dog', 2"
            expect(cbi({ cat: [["dog", 1]] }, { cat: [["dog", 2]] })).to.equal(-1);
            expect(cbi({ cat: [["dog", 2]] }, { cat: [["dog", 1]] })).to.equal(1);

            if (is.function(Symbol)) {
                // "Symbol(c" is less than "Symbol(d"
                expect(cbi(Symbol("cat"), Symbol("dog"))).to.equal(-1);
                expect(cbi(Symbol("dog"), Symbol("cat"))).to.equal(1);
            }
        });
    });

    describe("getOwnEnumerablePropertySymbols", () => {
        let gettem;

        beforeEach(() => {
            assertion.use((_chai, _) => {
                gettem = _.getOwnEnumerablePropertySymbols;
            });
        });

        it("returns an empty array if no symbols", () => {
            const obj = {};
            const cat = "cat";

            obj[cat] = 42;

            expect(gettem(obj)).to.not.include(cat);
        });

        it("returns enumerable symbols only", () => {
            if (!is.function(Symbol)) {
                return;
            }

            const cat = Symbol("cat");
            const dog = Symbol("dog");
            const frog = Symbol("frog");
            const cow = "cow";
            const obj = {};

            obj[cat] = "meow";
            obj[dog] = "woof";

            Object.defineProperty(obj, frog, {
                enumerable: false,
                value: "ribbit"
            });

            obj[cow] = "moo";

            expect(gettem(obj)).to.have.same.members([cat, dog]);
        });
    });

    describe("getOwnEnumerableProperties", () => {
        let gettem;

        beforeEach(() => {
            assertion.use((_chai, _) => {
                gettem = _.getOwnEnumerableProperties;
            });
        });

        it("returns enumerable property names if no symbols", () => {
            const cat = "cat";
            const dog = "dog";
            const frog = "frog";
            const obj = {};

            obj[cat] = "meow";
            obj[dog] = "woof";

            Object.defineProperty(obj, frog, {
                enumerable: false,
                value: "ribbit"
            });

            expect(gettem(obj)).to.have.same.members([cat, dog]);
        });

        it("returns enumerable property names and symbols", () => {
            if (!is.function(Symbol)) {
                return;
            }

            const cat = Symbol("cat");
            const dog = Symbol("dog");
            const frog = Symbol("frog");
            const bird = "bird";
            const cow = "cow";
            const obj = {};

            obj[cat] = "meow";
            obj[dog] = "woof";
            obj[bird] = "chirp";

            Object.defineProperty(obj, frog, {
                enumerable: false,
                value: "ribbit"
            });

            Object.defineProperty(obj, cow, {
                enumerable: false,
                value: "moo"
            });

            expect(gettem(obj)).to.have.same.members([cat, dog, bird]);
        });
    });

    describe("proxified object", () => {
        if (is.undefined(Proxy) || is.undefined(Reflect)) {
            return;
        }

        let proxify;

        beforeEach(() => {
            assertion.use((_chai, _) => {
                proxify = _.proxify;
            });
        });

        it("returns property value if an existing property is read", () => {
            const pizza = proxify({ mushrooms: 42 });

            expect(pizza.mushrooms).to.equal(42);
        });

        it("returns property value if an existing property is read when nonChainableMethodName is set", () => {
            const bake = function () { };
            bake.numPizzas = 2;

            const bakeProxy = proxify(bake, "bake");

            expect(bakeProxy.numPizzas).to.equal(2);
        });

        it("throws invalid property error if a non-existent property is read", () => {
            const pizza = proxify({});

            expect(() => {
                pizza.mushrooms;
            }).to.throw("Invalid Chai property: mushrooms");
        });

        it("throws invalid use error if a non-existent property is read when nonChainableMethodName is set", () => {
            const bake = proxify(() => { }, "bake");

            expect(() => {
                bake.numPizzas;
            }).to.throw('Invalid Chai property: bake.numPizzas. See docs for proper usage of "bake".');
        });

        it("suggests a fix if a non-existent prop looks like a typo", () => {
            const pizza = proxify({ foo: 1, bar: 2, baz: 3 });

            expect(() => {
                pizza.phoo;
            }).to.throw('Invalid Chai property: phoo. Did you mean "foo"?');
        });

        it("doesn't take exponential time to find string distances", () => {
            const pizza = proxify({ veryLongPropertyNameWithLotsOfLetters: 1 });

            expect(() => {
                pizza.extremelyLongPropertyNameWithManyLetters;
            }).to.throw(
                "Invalid Chai property: extremelyLongPropertyNameWithManyLetters"
            );
        });

        it("doesn't suggest properties from Object.prototype", () => {
            const pizza = proxify({ string: 5 });
            expect(() => {
                pizza.tostring;
            }).to.throw('Invalid Chai property: tostring. Did you mean "string"?');
        });

        it("doesn't suggest internally properties", () => {
            const pizza = proxify({ flags: 5, __flags: 6 });
            expect(() => {
                pizza.___flags; // 3 underscores; closer to '__flags' than 'flags'
            }).to.throw('Invalid Chai property: ___flags. Did you mean "flags"?');
        });

        // .then is excluded from property validation for promise support
        it("doesn't throw error if non-existent `then` is read", () => {
            const pizza = proxify({});

            expect(() => {
                pizza.then;
            }).to.not.throw();
        });
    });

    describe("addLengthGuard", () => {
        const fnLengthDesc = Object.getOwnPropertyDescriptor(() => { }, "length");
        if (!fnLengthDesc.configurable) {
            return;
        }

        let addLengthGuard;

        beforeEach(() => {
            assertion.use((_chai, _) => {
                addLengthGuard = _.addLengthGuard;
            });
        });

        it("throws invalid use error if `.length` is read when `methodName` is defined and `isChainable` is false", () => {
            const hoagie = addLengthGuard({}, "hoagie", false);

            expect(() => {
                hoagie.length;
            }).to.throw('Invalid Chai property: hoagie.length. See docs for proper usage of "hoagie".');
        });

        it("throws incompatible `.length` error if `.length` is read when `methodName` is defined and `isChainable` is true", () => {
            const hoagie = addLengthGuard({}, "hoagie", true);

            expect(() => {
                hoagie.length;
            }).to.throw('Invalid Chai property: hoagie.length. Due to a compatibility issue, "length" cannot directly follow "hoagie". Use "hoagie.lengthOf" instead.');
        });
    });

    describe("isProxyEnabled", () => {
        let origUseProxy; let isProxyEnabled;

        before(() => {
            assertion.use((_chai, _) => {
                isProxyEnabled = _.isProxyEnabled;
            });

            origUseProxy = assertion.config.useProxy;
        });

        beforeEach(() => {
            assertion.config.useProxy = true;
        });

        after(() => {
            assertion.config.useProxy = origUseProxy;
        });

        if (!is.undefined(Proxy) && !is.undefined(Reflect)) {
            it("returns true if Proxy and Reflect are defined, and useProxy is true", () => {
                expect(isProxyEnabled()).to.be.true;
            });

            it("returns false if Proxy and Reflect are defined, and useProxy is false", () => {
                assertion.config.useProxy = false;

                expect(isProxyEnabled()).to.be.false;
            });
        } else {
            it("returns false if Proxy and/or Reflect are undefined, and useProxy is true", () => {
                expect(isProxyEnabled()).to.be.false;
            });

            it("returns false if Proxy and/or Reflect are undefined, and useProxy is false", () => {
                assertion.config.useProxy = false;

                expect(isProxyEnabled()).to.be.false;
            });
        }
    });

    describe("checkError", () => {
        const { checkError } = assertion.util;

        it("compatibleInstance", () => {
            const errorInstance = new Error("I am an instance");
            const sameInstance = errorInstance;
            const otherInstance = new Error("I an another instance");
            const aNumber = 1337;
            assert(checkError.compatibleInstance(errorInstance, sameInstance) === true);
            assert(checkError.compatibleInstance(errorInstance, otherInstance) === false);
            assert(checkError.compatibleInstance(errorInstance, Error) === false);
            assert(checkError.compatibleInstance(errorInstance, aNumber) === false);
        });

        it("compatibleConstructor", () => {
            const errorInstance = new Error("I am an instance");
            const sameInstance = errorInstance;
            const otherInstance = new Error("I an another instance");
            const derivedInstance = new TypeError("I inherit from Error");
            const anObject = {};
            const aNumber = 1337;
            assert(checkError.compatibleConstructor(errorInstance, sameInstance) === true);
            assert(checkError.compatibleConstructor(errorInstance, otherInstance) === true);
            assert(checkError.compatibleConstructor(derivedInstance, errorInstance) === true);
            assert(checkError.compatibleConstructor(errorInstance, derivedInstance) === false);

            assert(checkError.compatibleConstructor(errorInstance, Error) === true);
            assert(checkError.compatibleConstructor(derivedInstance, TypeError) === true);
            assert(checkError.compatibleConstructor(errorInstance, TypeError) === false);

            assert(checkError.compatibleConstructor(errorInstance, anObject) === false);
            assert(checkError.compatibleConstructor(errorInstance, aNumber) === false);
        });

        it("compatibleMessage", () => {
            const errorInstance = new Error("I am an instance");
            const derivedInstance = new TypeError("I inherit from Error");
            const thrownMessage = "Imagine I have been thrown";
            assert(checkError.compatibleMessage(errorInstance, /instance$/) === true);
            assert(checkError.compatibleMessage(derivedInstance, /Error$/) === true);
            assert(checkError.compatibleMessage(errorInstance, /unicorn$/) === false);
            assert(checkError.compatibleMessage(derivedInstance, /dinosaur$/) === false);

            assert(checkError.compatibleMessage(errorInstance, "instance") === true);
            assert(checkError.compatibleMessage(derivedInstance, "Error") === true);
            assert(checkError.compatibleMessage(errorInstance, "unicorn") === false);
            assert(checkError.compatibleMessage(derivedInstance, "dinosaur") === false);

            assert(checkError.compatibleMessage(thrownMessage, /thrown$/) === true);
            assert(checkError.compatibleMessage(thrownMessage, /^Imagine/) === true);
            assert(checkError.compatibleMessage(thrownMessage, /unicorn$/) === false);
            assert(checkError.compatibleMessage(thrownMessage, /dinosaur$/) === false);

            assert(checkError.compatibleMessage(thrownMessage, "Imagine") === true);
            assert(checkError.compatibleMessage(thrownMessage, "thrown") === true);
            assert(checkError.compatibleMessage(thrownMessage, "unicorn") === false);
            assert(checkError.compatibleMessage(thrownMessage, "dinosaur") === false);

            assert(checkError.compatibleMessage(thrownMessage, undefined) === false);
            assert(checkError.compatibleMessage(thrownMessage, null) === false);
        });

        it("constructorName", () => {
            const errorInstance = new Error("I am an instance");
            const derivedInstance = new TypeError("I inherit from Error");
            const thrownMessage = "Imagine I have been thrown";
            assert(checkError.getConstructorName(errorInstance) === "Error");
            assert(checkError.getConstructorName(derivedInstance) === "TypeError");

            assert(checkError.getConstructorName(thrownMessage) === "Imagine I have been thrown");

            assert(checkError.getConstructorName(Error) === "Error");
            assert(checkError.getConstructorName(TypeError) === "TypeError");

            assert(is.null(checkError.getConstructorName(null)));
            assert(is.undefined(checkError.getConstructorName(undefined)));

            // Asserting that `getName` behaves correctly
            function /*one*/correctName/*two*/() { // eslint-disable-line no-inline-comments, spaced-comment
                return 0;
            }

            function withoutComments() {
                return 1;
            }

            const anonymousFunc = (function () {
                return function () { // eslint-disable-line func-style
                    return 2;
                };
            }());

            // See chaijs/chai/issues/45: some poorly-constructed custom errors don't have useful names
            // on either their constructor or their constructor prototype, but instead
            // only set the name inside the constructor itself.
            const PoorlyConstructedError = function () { // eslint-disable-line func-style
                this.name = "PoorlyConstructedError"; // eslint-disable-line no-invalid-this
            };
            PoorlyConstructedError.prototype = Object.create(Error.prototype);

            assert(checkError.getConstructorName(correctName) === "correctName");
            assert(checkError.getConstructorName(withoutComments) === "withoutComments");
            assert(checkError.getConstructorName(anonymousFunc) === "");
            assert(checkError.getConstructorName(PoorlyConstructedError) === "PoorlyConstructedError");
        });

        it("getMessage", () => {
            const errorInstance = new Error("I am an instance");
            const derivedInstance = new TypeError("I inherit from Error");
            const thrownMessage = "Imagine I have been thrown";
            const errorExpMsg = errorInstance.message;
            const derivedExpMsg = derivedInstance.message;
            assert(checkError.getMessage(errorInstance) === errorExpMsg);
            assert(checkError.getMessage(derivedInstance) === derivedExpMsg);

            assert(checkError.getMessage(thrownMessage) === "Imagine I have been thrown");

            assert(checkError.getMessage(Error) === "");
            assert(checkError.getMessage(TypeError) === "");

            assert(checkError.getMessage(null) === "");
            assert(checkError.getMessage(undefined) === "");
        });
    });

    describe("pathval", () => {
        const { pathval } = assertion.util;

        describe("hasProperty", () => {
            it("should handle array index", () => {
                const arr = [1, 2, "cheeseburger"];
                assert(pathval.hasProperty(arr, 1) === true);
                assert(pathval.hasProperty(arr, 3) === false);
            });

            it("should handle primitives", () => {
                const exampleString = "string literal";
                assert(pathval.hasProperty(exampleString, "length") === true);
                assert(pathval.hasProperty(exampleString, 3) === true);
                assert(pathval.hasProperty(exampleString, 14) === false);

                assert(pathval.hasProperty(1, "foo") === false);
                assert(pathval.hasProperty(false, "bar") === false);
                assert(pathval.hasProperty(true, "toString") === true);

                if (is.function(Symbol)) {
                    assert(pathval.hasProperty(Symbol(), 1) === false);
                    assert(pathval.hasProperty(Symbol.iterator, "valueOf") === true);
                }
            });

            it("should handle objects", () => {
                const exampleObj = {
                    foo: "bar"
                };
                assert(pathval.hasProperty(exampleObj, "foo") === true);
                assert(pathval.hasProperty(exampleObj, "baz") === false);
                assert(pathval.hasProperty(exampleObj, 0) === false);
            });

            it("should handle undefined", () => {
                assert(pathval.hasProperty(undefined, "foo") === false);
            });

            it("should handle null", () => {
                assert(pathval.hasProperty(null, "foo") === false);
            });
        });

        describe("getPathInfo", () => {
            const obj = {
                id: "10702S300W",
                primes: [2, 3, 5, 7, 11],
                dimensions: {
                    units: "mm",
                    lengths: [[1.2, 3.5], [2.2, 1.5], [5, 7]]
                },
                "dimensions.lengths": {
                    "[2]": [1.2, 3.5]
                }
            };
            const gpi = pathval.getPathInfo;
            it("should handle simple property", () => {
                const info = gpi(obj, "dimensions.units");
                assert(info.parent === obj.dimensions);
                assert(info.value === obj.dimensions.units);
                assert(info.name === "units");
                assert(info.exists === true);
            });

            it("should handle non-existent property", () => {
                const info = gpi(obj, "dimensions.size");
                assert(info.parent === obj.dimensions);
                assert(is.undefined(info.value));
                assert(info.name === "size");
                assert(info.exists === false);
            });

            it("should handle array index", () => {
                const info = gpi(obj, "primes[2]");
                assert(info.parent === obj.primes);
                assert(info.value === obj.primes[2]);
                assert(info.name === 2);
                assert(info.exists === true);
            });

            it("should handle dimensional array", () => {
                const info = gpi(obj, "dimensions.lengths[2][1]");
                assert(info.parent === obj.dimensions.lengths[2]);
                assert(info.value === obj.dimensions.lengths[2][1]);
                assert(info.name === 1);
                assert(info.exists === true);
            });

            it("should handle out of bounds array index", () => {
                const info = gpi(obj, "dimensions.lengths[3]");
                assert(info.parent === obj.dimensions.lengths);
                assert(is.undefined(info.value));
                assert(info.name === 3);
                assert(info.exists === false);
            });

            it("should handle out of bounds dimensional array index", () => {
                const info = gpi(obj, "dimensions.lengths[2][5]");
                assert(info.parent === obj.dimensions.lengths[2]);
                assert(is.undefined(info.value));
                assert(info.name === 5);
                assert(info.exists === false);
            });

            it("should handle backslash-escaping for .[]", () => {
                const info = gpi(obj, "dimensions\\.lengths.\\[2\\][1]");
                assert(info.parent === obj["dimensions.lengths"]["[2]"]);
                assert(info.value === obj["dimensions.lengths"]["[2]"][1]);
                assert(info.name === 1);
                assert(info.exists === true);
            });
        });

        describe("getPathValue", () => {
            it("returns the correct value", () => {
                const object = {
                    hello: "universe",
                    universe: {
                        hello: "world"
                    },
                    world: ["hello", "universe"],
                    complex: [
                        { hello: "universe" },
                        { universe: "world" },
                        [{ hello: "world" }]
                    ]
                };

                const arr = [[true]];
                assert(pathval.getPathValue(object, "hello") === "universe");
                assert(pathval.getPathValue(object, "universe.hello") === "world");
                assert(pathval.getPathValue(object, "world[1]") === "universe");
                assert(pathval.getPathValue(object, "complex[1].universe") === "world");
                assert(pathval.getPathValue(object, "complex[2][0].hello") === "world");
                assert(pathval.getPathValue(arr, "[0][0]") === true);
            });

            it("handles undefined objects and properties", () => {
                const object = {};
                assert(is.null(pathval.getPathValue(undefined, "this.should.work")));
                assert(is.null(pathval.getPathValue(object, "this.should.work")));
                assert(pathval.getPathValue("word", "length") === 4);
            });
        });

        describe("setPathValue", () => {
            it("allows value to be set in simple object", () => {
                const obj = {};
                pathval.setPathValue(obj, "hello", "universe");
                assert(obj.hello === "universe");
            });

            it("allows nested object value to be set", () => {
                const obj = {};
                pathval.setPathValue(obj, "hello.universe", "properties");
                assert(obj.hello.universe === "properties");
            });

            it("allows nested array value to be set", () => {
                const obj = {};
                pathval.setPathValue(obj, "hello.universe[1].properties", "galaxy");
                assert(obj.hello.universe[1].properties === "galaxy");
            });

            it("allows value to be REset in simple object", () => {
                const obj = { hello: "world" };
                pathval.setPathValue(obj, "hello", "universe");
                assert(obj.hello === "universe");
            });

            it("allows value to be set in complex object", () => {
                const obj = { hello: {} };
                pathval.setPathValue(obj, "hello.universe", 42);
                assert(obj.hello.universe === 42);
            });

            it("allows value to be REset in complex object", () => {
                const obj = { hello: { universe: 100 } };
                pathval.setPathValue(obj, "hello.universe", 42);
                assert(obj.hello.universe === 42);
            });

            it("allows for value to be set in array", () => {
                const obj = { hello: [] };
                pathval.setPathValue(obj, "hello[0]", 1);
                pathval.setPathValue(obj, "hello[2]", 3);

                assert(obj.hello[0] === 1);
                assert(is.undefined(obj.hello[1]));
                assert(obj.hello[2] === 3);
            });

            it("allows setting a value into an object inside an array", () => {
                const obj = { hello: [{ anObject: "obj" }] };
                pathval.setPathValue(obj, "hello[0].anotherKey", "anotherValue");

                assert(obj.hello[0].anotherKey === "anotherValue");
            });

            it("allows for value to be REset in array", () => {
                const obj = { hello: [1, 2, 4] };
                pathval.setPathValue(obj, "hello[2]", 3);

                assert(obj.hello[0] === 1);
                assert(obj.hello[1] === 2);
                assert(obj.hello[2] === 3);
            });

            it("allows for value to be REset in array", () => {
                const obj = { hello: [1, 2, 4] };
                pathval.setPathValue(obj, "hello[2]", 3);

                assert(obj.hello[0] === 1);
                assert(obj.hello[1] === 2);
                assert(obj.hello[2] === 3);
            });

            it("returns the object in which the value was set", () => {
                const obj = { hello: [1, 2, 4] };
                const valueReturned = pathval.setPathValue(obj, "hello[2]", 3);
                assert(obj === valueReturned);
            });
        });
    });

    describe("getName", () => {
        const { getName } = assertion.util;

        it("should get the function name", () => {
            function normalFunction() {
                return 1;
            }

            assert(getName(normalFunction) === "normalFunction");
        });

        it("should get correct name when function is surrounded by comments", () => {
            function /*one*/correctName/*two*/() { // eslint-disable-line no-inline-comments, spaced-comment
                return 0;
            }

            assert(getName(correctName) === "correctName");
        });

        it("should return empty string for anonymous functions", () => {
            const anonymousFunc = (function () {
                return function () { // eslint-disable-line func-style
                    return 2;
                };
            }());
            assert(getName(anonymousFunc) === "");
        });

        it("should return `null` when passed a String as argument", () => {
            assert(is.null(getName("")));
        });

        it("should return `null` when passed a Number as argument", () => {
            assert(is.null(getName(1)));
        });

        it("should return `null` when passed a Boolean as argument", () => {
            assert(is.null(getName(true)));
        });

        it("should return `null` when passed `null` as argument", () => {
            assert(is.null(getName(null)));
        });

        it("should return `null` when passed `undefined` as argument", () => {
            assert(is.null(getName(undefined)));
        });

        it("should return `null` when passed a Symbol as argument", () => {
            if (!is.undefined(Symbol)) {
                assert(is.null(getName(Symbol())));
            }
        });

        it("should return `null` when passed an Object as argument", () => {
            assert(is.null(getName({})));
        });
    });
});
