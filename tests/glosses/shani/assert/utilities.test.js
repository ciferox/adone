import * as pathval from "adone/glosses/shani/assert/lib/utils/pathval";

const { assertion: shaniAssertion } = adone.shani.utils;

describe("utilities", function () {
    const flags = Symbol.for("shani:assert:flags");
    const expect = shaniAssertion.expect;

    after(function () {
        // Some clean-up so we can run tests in a --watch
        delete shaniAssertion.Assertion.prototype.eqqqual;
        delete shaniAssertion.Assertion.prototype.result;
        delete shaniAssertion.Assertion.prototype.doesnotexist;
    });

    it("_obj", function () {
        const foo = "bar";
        const test = expect(foo);

        expect(test).to.have.property("_obj", foo);

        const bar = "baz";
        test._obj = bar;

        expect(test).to.have.property("_obj", bar);
        test.equal(bar);
    });

    it("transferFlags", function () {
        const foo = "bar";
        const test = expect(foo).not;

        shaniAssertion.use(function (_shaniAssertion, utils) {
            const obj = {};
            utils.transferFlags(test, obj);
            expect(utils.flag(obj, "object")).to.equal(foo);
            expect(utils.flag(obj, "negate")).to.equal(true);
        });
    });

    it("transferFlags, includeAll = false", function () {
        shaniAssertion.use(function (_shaniAssertion, utils) {
            const obj = {};
            const test = function () { };

            const flag = {};
            utils.flag(obj, "flagMe", flag);
            utils.flag(obj, "negate", true);
            utils.transferFlags(test, obj, false);

            expect(utils.flag(obj, "object")).to.equal(undefined);
            expect(utils.flag(obj, "message")).to.equal(undefined);
            expect(utils.flag(obj, "ssfi")).to.equal(undefined);
            expect(utils.flag(obj, "negate")).to.equal(true);
            expect(utils.flag(obj, "flagMe")).to.equal(flag);
        });
    });

    describe("addMethod", function () {
        let assertionConstructor;

        before(function () {
            shaniAssertion.use(function (_shaniAssertion, utils) {
                assertionConstructor = _shaniAssertion.Assertion;

                expect(_shaniAssertion.Assertion).to.not.respondTo("eqqqual");
                _shaniAssertion.Assertion.addMethod("eqqqual", function (str) {
                    const object = utils.flag(this, "object");
                    new _shaniAssertion.Assertion(object).to.be.eql(str);
                });

                _shaniAssertion.Assertion.addMethod("result", function () {
                    return "result";
                });

                _shaniAssertion.Assertion.addMethod("returnNewAssertion", function () {
                    utils.flag(this, "mySpecificFlag", "value1");
                    utils.flag(this, "ultraSpecificFlag", "value2");
                });

                _shaniAssertion.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(function () {
            delete shaniAssertion.Assertion.prototype.eqqqual;

            delete shaniAssertion.Assertion.prototype.result;

            delete shaniAssertion.Assertion.prototype.returnNewAssertion;
            delete shaniAssertion.Assertion.prototype.checkFlags;
        });

        it("addMethod", function () {
            expect(shaniAssertion.Assertion).to.respondTo("eqqqual");
            expect("spec").to.eqqqual("spec");
        });

        it("addMethod returning result", function () {
            expect(expect("foo").result()).to.equal("result");
        });

        it("addMethod returns new assertion with flags copied over", function () {
            const assertion1 = expect("foo");
            const assertion2 = assertion1.to.returnNewAssertion();

            // Checking if a new assertion was returned
            expect(assertion1).to.not.be.equal(assertion2);

            // Check if flags were copied
            assertion2.checkFlags();

            // Checking if it's really an instance of an Assertion
            expect(assertion2).to.be.instanceOf(assertionConstructor);

            // Test shaniAssertionning `.length` after a method to guarantee it's not a function's
            // `length`. Note: 'instanceof' cannot be used here because the test will
            // fail in IE 10 due to how addAssertionnableMethod works without __proto__
            // support. Therefore, test the constructor property of length instead.
            const anAssertion = expect([1, 2, 3]).to.be.an.instanceof(Array);
            expect(anAssertion.length.constructor).to.equal(assertionConstructor);

            const anotherAssertion = expect([1, 2, 3]).to.have.a.lengthOf(3).and.to.be.ok;
            expect(anotherAssertion.length.constructor).to.equal(assertionConstructor);
        });
    });

    describe("overwriteMethod", function () {
        let assertionConstructor;

        before(function () {
            shaniAssertion.config.includeStack = false;

            shaniAssertion.use(function (_shaniAssertion, utils) {
                assertionConstructor = _shaniAssertion.Assertion;

                _shaniAssertion.Assertion.addMethod("four", function () {
                    this.assert(this._obj === 4, "expected #{this} to be 4", "expected #{this} to not be 4", 4);
                });

                _shaniAssertion.Assertion.overwriteMethod("four", function (_super) {
                    return function () {
                        utils.flag(this, "mySpecificFlag", "value1");
                        utils.flag(this, "ultraSpecificFlag", "value2");

                        if (typeof this._obj === "string") {
                            this.assert(this._obj === "four", "expected #{this} to be 'four'", "expected #{this} to not be 'four'", "four");
                        } else {
                            _super.call(this);
                        }
                    };
                });

                _shaniAssertion.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(function () {
            delete shaniAssertion.Assertion.prototype.four;
            delete shaniAssertion.Assertion.prototype.checkFlags;
            delete shaniAssertion.Assertion.prototype.eqqqual;
            delete shaniAssertion.Assertion.prototype.doesnotexist;
            delete shaniAssertion.Assertion.prototype.doesnotexistfail;
        });

        it("overwriteMethod", function () {
            shaniAssertion.use(function (_shaniAssertion, utils) {
                _shaniAssertion.Assertion.addMethod("eqqqual", function (str) {
                    const object = utils.flag(this, "object");
                    new _shaniAssertion.Assertion(object).to.be.eql(str);
                });

                _shaniAssertion.Assertion.overwriteMethod("eqqqual", function (_super) {
                    return function (str) {
                        const object = utils.flag(this, "object");
                        if (object === "cucumber" && str === "cuke") {
                            utils.flag(this, "cucumber", true);
                        } else {
                            _super.apply(this, arguments);
                        }
                    };
                });
            });

            const vege = expect("cucumber").to.eqqqual("cucumber");
            expect(vege[flags]).to.not.have.property("cucumber");
            const cuke = expect("cucumber").to.eqqqual("cuke");
            expect(cuke[flags]).to.have.property("cucumber");

            shaniAssertion.use(function (_shaniAssertion, _) {
                expect(_shaniAssertion.Assertion).to.not.respondTo("doesnotexist");
                _shaniAssertion.Assertion.overwriteMethod("doesnotexist", function (_super) {
                    expect(_super).to.be.a("function");
                    return function () {
                        _.flag(this, "doesnt", true);
                    };
                });
            });

            const dne = expect("something").to.doesnotexist();
            expect(dne[flags]).to.have.property("doesnt");

            shaniAssertion.use(function (_shaniAssertion, _) {
                expect(_shaniAssertion.Assertion).to.not.respondTo("doesnotexistfail");
                _shaniAssertion.Assertion.overwriteMethod("doesnotexistfail", function (_super) {
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
            expect(dneFail[flags]).to.have.property("doesnt");
            expect(dneError.message).to.eql("doesnotexistfail is not a function");
        });

        it("overwriteMethod returning result", function () {
            shaniAssertion.use(function (_shaniAssertion) {
                _shaniAssertion.Assertion.overwriteMethod("result", function () {
                    return function () {
                        return "result";
                    };
                });
            });

            expect(expect("foo").result()).to.equal("result");
        });

        it("calling _super has correct stack trace", function () {
            try {
                expect(5).to.be.four();
                expect(false, "should not get here because error thrown").to.be.ok;
            } catch (err) {
                // not all browsers support err.stack
                // Phantom does not include function names for getter exec
                if ("undefined" !== typeof err.stack && "undefined" !== typeof Error.captureStackTrace) {
                    expect(err.stack).to.include("utilities.test.js");
                    expect(err.stack).to.not.include("overwriteMethod");
                }
            }
        });

        it("overwritten behavior has correct stack trace", function () {
            try {
                expect("five").to.be.four();
                expect(false, "should not get here because error thrown").to.be.ok;
            } catch (err) {
                // not all browsers support err.stack
                // Phantom does not include function names for getter exec
                if ("undefined" !== typeof err.stack && "undefined" !== typeof Error.captureStackTrace) {
                    expect(err.stack).to.include("utilities.test.js");
                    expect(err.stack).to.not.include("overwriteMethod");
                }
            }
        });

        it("should return a new assertion with flags copied over", function () {
            const assertion1 = expect("four");
            const assertion2 = assertion1.four();

            // Checking if a new assertion was returned
            expect(assertion1).to.not.be.equal(assertion2);

            // Check if flags were copied
            assertion2.checkFlags();

            // Checking if it's really an instance of an Assertion
            expect(assertion2).to.be.instanceOf(assertionConstructor);

            // Test shaniAssertionning `.length` after a method to guarantee it is not a function's `length`
            expect("four").to.be.a.four().length.above(2);

            // Ensure that foo returns an Assertion (not a function)
            expect(expect("four").four()).to.be.an.instanceOf(assertionConstructor);
        });
    });

    describe("addProperty", function () {
        let assertionConstructor = shaniAssertion.Assertion;

        before(function () {
            shaniAssertion.use(function (_shaniAssertion, utils) {
                assertionConstructor = _shaniAssertion.Assertion;

                _shaniAssertion.Assertion.addProperty("tea", function () {
                    utils.flag(this, "tea", "shaniAssertion");
                });

                _shaniAssertion.Assertion.addProperty("result", function () {
                    return "result";
                });

                _shaniAssertion.Assertion.addProperty("thing", function () {
                    utils.flag(this, "mySpecificFlag", "value1");
                    utils.flag(this, "ultraSpecificFlag", "value2");
                });

                _shaniAssertion.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(function () {
            delete shaniAssertion.Assertion.prototype.tea;
            delete shaniAssertion.Assertion.prototype.thing;
            delete shaniAssertion.Assertion.prototype.checkFlags;
            delete shaniAssertion.Assertion.prototype.result;
        });

        it("addProperty", function () {
            const assert = expect("shaniAssertion").to.be.tea;
            expect(assert[flags].tea).to.equal("shaniAssertion");
        });

        it("addProperty returning result", function () {
            expect(expect("foo").result).to.equal("result");
        });

        it("addProperty returns a new assertion with flags copied over", function () {
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

            // Test shaniAssertionning `.length` after a property to guarantee it is not a function's `length`
            expect([1, 2, 3]).to.be.a.thing.with.length.above(2);
            expect([1, 2, 3]).to.be.an.instanceOf(Array).and.have.length.below(4);

            expect(expect([1, 2, 3]).be).to.be.an.instanceOf(assertionConstructor);
            expect(expect([1, 2, 3]).thing).to.be.an.instanceOf(assertionConstructor);
        });
    });

    describe("overwriteProperty", function () {
        let assertionConstructor;

        before(function () {
            shaniAssertion.config.includeStack = false;

            shaniAssertion.use(function (_shaniAssertion, utils) {
                assertionConstructor = _shaniAssertion.Assertion;

                _shaniAssertion.Assertion.addProperty("tea", function () {
                    utils.flag(this, "tea", "shaniAssertion");
                });

                _shaniAssertion.Assertion.overwriteProperty("tea", function (_super) {
                    return function () {
                        const act = utils.flag(this, "object");
                        if (act === "matcha") {
                            utils.flag(this, "tea", "matcha");
                        } else {
                            _super.call(this);
                        }
                    };
                });

                _shaniAssertion.Assertion.overwriteProperty("result", function () {
                    return function () {
                        return "result";
                    };
                });

                _shaniAssertion.Assertion.addProperty("four", function () {
                    this.assert(this._obj === 4, "expected #{this} to be 4", "expected #{this} to not be 4", 4);
                });

                _shaniAssertion.Assertion.overwriteProperty("four", function (_super) {
                    return function () {
                        if (typeof this._obj === "string") {
                            this.assert(this._obj === "four", "expected #{this} to be 'four'", "expected #{this} to not be 'four'", "four");
                        } else {
                            _super.call(this);
                        }
                    };
                });

                _shaniAssertion.Assertion.addProperty("foo");

                _shaniAssertion.Assertion.overwriteProperty("foo", function (_super) {
                    return function blah() {
                        utils.flag(this, "mySpecificFlag", "value1");
                        utils.flag(this, "ultraSpecificFlag", "value2");
                        _super.call(this);
                    };
                });

                _shaniAssertion.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(function () {
            delete shaniAssertion.Assertion.prototype.tea;
            delete shaniAssertion.Assertion.prototype.four;
            delete shaniAssertion.Assertion.prototype.result;
            delete shaniAssertion.Assertion.prototype.foo;
            delete shaniAssertion.Assertion.prototype.checkFlags;
        });

        it("overwriteProperty", function () {
            const matcha = expect("matcha").to.be.tea;
            expect(matcha[flags].tea).to.equal("matcha");
            const assert = expect("something").to.be.tea;
            expect(assert[flags].tea).to.equal("shaniAssertion");
        });

        it("overwriteProperty returning result", function () {
            expect(expect("foo").result).to.equal("result");
        });

        it("calling _super has correct stack trace", function () {
            try {
                expect(5).to.be.four;
                expect(false, "should not get here because error thrown").to.be.ok;
            } catch (err) {
                // not all browsers support err.stack
                // Phantom does not include function names for getter exec
                if ("undefined" !== typeof err.stack && "undefined" !== typeof Error.captureStackTrace) {
                    expect(err.stack).to.include("utilities.test.js");
                    expect(err.stack).to.not.include("overwriteProperty");
                }
            }
        });

        it("overwritten behavior has correct stack trace", function () {
            try {
                expect("five").to.be.four;
                expect(false, "should not get here because error thrown").to.be.ok;
            } catch (err) {
                // not all browsers support err.stack
                // Phantom does not include function names for getter exec
                if ("undefined" !== typeof err.stack && "undefined" !== typeof Error.captureStackTrace) {
                    expect(err.stack).to.include("utilities.test.js");
                    expect(err.stack).to.not.include("overwriteProperty");
                }
            }
        });

        it("should return new assertion with flags copied over", function () {
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

            // Test shaniAssertionning `.length` after a property to guarantee it is not a function's `length`
            expect([1, 2, 3]).to.be.a.foo.with.length.above(2);
            expect([1, 2, 3]).to.be.an.instanceOf(Array).and.have.length.below(4);

            expect(expect([1, 2, 3]).be).to.be.an.instanceOf(assertionConstructor);
            expect(expect([1, 2, 3]).foo).to.be.an.instanceOf(assertionConstructor);
        });
    });

    it("getMessage", function () {
        shaniAssertion.use(function (_shaniAssertion, _) {
            expect(_.getMessage({}, [])).to.equal("");
            expect(_.getMessage({}, [null, null, null])).to.equal("");

            const obj = {};
            _.flag(obj, "message", "foo");
            expect(_.getMessage(obj, [])).to.contain("foo");
        });
    });

    it("getMessage passed message as function", function () {
        shaniAssertion.use(function (_shaniAssertion, _) {
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

    it("getMessage template tag substitution", function () {
        shaniAssertion.use(function (_shaniAssertion, _) {
            const objName = "trojan horse";
            const actualValue = "an actual value";
            const expectedValue = "an expected value";
            [
                // known template tags
                {
                    template: "one #{this} two",
                    expected: "one '" + objName + "' two"
                },
                {
                    template: "one #{act} two",
                    expected: "one '" + actualValue + "' two"
                },
                {
                    template: "one #{exp} two",
                    expected: "one '" + expectedValue + "' two"
                },
                // unknown template tag
                {
                    template: "one #{unknown} two",
                    expected: "one #{unknown} two"
                },
                // repeated template tag
                {
                    template: "#{this}#{this}",
                    expected: "'" + objName + "''" + objName + "'"
                },
                // multiple template tags in different order
                {
                    template: "#{this}#{act}#{exp}#{act}#{this}",
                    expected: "'" + objName + "''" + actualValue + "''" + expectedValue + "''" + actualValue + "''" + objName + "'"
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
            ].forEach(function (config) {
                config.objName = config.objName || objName;
                config.actualValue = config.actualValue || actualValue;
                config.expectedValue = config.expectedValue || expectedValue;
                const obj = { _obj: config.actualValue };
                _.flag(obj, "object", config.objName);
                expect(_.getMessage(obj, [null, config.template, null, config.expectedValue])).to.equal(config.expected);
            });
        });
    });

    it("inspect with custom stylize-calling inspect()s", function () {
        shaniAssertion.use(function (_shaniAssertion, _) {
            const obj = {
                outer: {
                    inspect (depth, options) {
                        return options.stylize("Object content", "string");
                    }
                }
            };
            expect(_.inspect(obj)).to.equal("{ outer: Object content }");
        });
    });

    it("inspect with custom object-returning inspect()s", function () {
        shaniAssertion.use(function (_shaniAssertion, _) {
            const obj = {
                outer: {
                    inspect () {
                        return { foo: "bar" };
                    }
                }
            };

            expect(_.inspect(obj)).to.equal("{ outer: { foo: 'bar' } }");
        });
    });

    it("inspect negative zero", function () {
        shaniAssertion.use(function (_shaniAssertion, _) {
            expect(_.inspect(-0)).to.equal("-0");
            expect(_.inspect([-0])).to.equal("[ -0 ]");
            expect(_.inspect({ hp: -0 })).to.equal("{ hp: -0 }");
        });
    });

    it("inspect Symbol", function () {
        if (typeof Symbol !== "function") return;

        shaniAssertion.use(function (_shaniAssertion, _) {
            expect(_.inspect(Symbol())).to.equal("Symbol()");
            expect(_.inspect(Symbol("cat"))).to.equal("Symbol(cat)");
        });
    });

    it.skip("inspect an assertion", function () {
        shaniAssertion.use(function (_shaniAssertion, _) {
            const assertion = expect(1);
            const anInspectFn = function () {
                return _.inspect(assertion);
            };

            expect(anInspectFn).to.not.throw();
        });
    });

    describe("addChainableMethod", function () {
        let assertionConstructor;

        before(function () {
            shaniAssertion.use(function (_shaniAssertion, utils) {
                assertionConstructor = _shaniAssertion.Assertion;
                _shaniAssertion.Assertion.addChainableMethod("x",
                    function () {
                        _shaniAssertion.getAssertion(this._obj).to.be.deep.equal({ a: "x", __x: "X!" });
                    }
                    , function () {
                        this._obj = this._obj || {};
                        this._obj.__x = "X!";
                    }
                );

                _shaniAssertion.Assertion.addChainableMethod("foo", function (str) {
                    utils.flag(this, "mySpecificFlag", "value1");
                    utils.flag(this, "ultraSpecificFlag", "value2");

                    const obj = utils.flag(this, "object");
                    _shaniAssertion.getAssertion(obj).to.be.equal(str);
                });

                _shaniAssertion.Assertion.addMethod("checkFlags", function () {
                    this.assert(
                        utils.flag(this, "mySpecificFlag") === "value1" &&
                        utils.flag(this, "ultraSpecificFlag") === "value2"
                        , "expected assertion to have specific flags"
                        , "this doesn't matter"
                    );
                });
            });
        });

        after(function () {
            delete shaniAssertion.Assertion.prototype.x;
            delete shaniAssertion.Assertion.prototype.foo;
            delete shaniAssertion.Assertion.prototype.checkFlags;
        });

        it("addChainableMethod", function () {
            expect({ a: "foo" }).to.deep.equal({ a: "foo" });
            expect({ a: "x" }).x();

            expect(function () {
                expect({ a: "foo" }).x();
            }).to.throw(shaniAssertion.AssertionError);

            // Verify whether the original Function properties are present.
            // see https://github.com/shaniAssertionjs/shaniAssertion/commit/514dd6ce4#commitcomment-2593383
            const propertyDescriptor = Object.getOwnPropertyDescriptor(shaniAssertion.Assertion.prototype, "x");
            expect(propertyDescriptor.get).to.have.property("call", Function.prototype.call);
            expect(propertyDescriptor.get).to.have.property("apply", Function.prototype.apply);
            expect(propertyDescriptor.get()).to.have.property("call", Function.prototype.call);
            expect(propertyDescriptor.get()).to.have.property("apply", Function.prototype.apply);

            const obj = {};
            expect(obj).x.to.be.ok;
            expect(obj).to.have.property("__x", "X!");
        });

        it("addChainableMethod should return a new assertion with flags copied over", function () {
            shaniAssertion.config.proxyExcludedKeys.push("nodeType");

            const assertion1 = expect("bar");
            const assertion2 = assertion1.foo("bar");

            // Checking if a new assertion was returned
            expect(assertion1).to.not.be.equal(assertion2);

            // Check if flags were copied
            assertion2.checkFlags();

            // Checking if it's really an instance of an Assertion
            expect(assertion2).to.be.instanceOf(assertionConstructor);

            // Test shaniAssertionning `.length` after a method to guarantee it is not a function's `length`
            expect("bar").to.be.a.foo("bar").length.above(2);

            // Ensure that foo returns an Assertion (not a function)
            expect(expect("bar").foo("bar")).to.be.an.instanceOf(assertionConstructor);
        });
    });

    describe("overwriteshaniAssertionnableMethod", function () {
        let assertionConstructor;
        let utils;

        before(function () {
            shaniAssertion.use(function (_shaniAssertion, _utils) {
                assertionConstructor = _shaniAssertion.Assertion;
                utils = _utils;

                _shaniAssertion.Assertion.addChainableMethod("x",
                    function () {
                        shaniAssertion.getAssertion(this._obj).to.be.deep.equal({ a: "x", __x: "X!" });
                    }
                    , function () {
                        this._obj = this._obj || {};
                        this._obj.__x = "X!";
                    }
                );

                _shaniAssertion.Assertion.overwriteChainableMethod("x",
                    function (_super) {
                        return function () {
                            utils.flag(this, "mySpecificFlag", "value1");
                            utils.flag(this, "ultraSpecificFlag", "value2");

                            if (utils.flag(this, "marked")) {
                                shaniAssertion.getAssertion(this._obj).to.be.equal("spot");
                            } else {
                                _super.apply(this, arguments);
                            }
                        };
                    }
                    , function (_super) {
                        return function () {
                            utils.flag(this, "message", "x marks the spot");
                            _super.apply(this, arguments);
                        };
                    }
                );

                _shaniAssertion.Assertion.addMethod("checkFlags", function () {
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

        after(function () {
            delete shaniAssertion.Assertion.prototype.x;
            delete shaniAssertion.Assertion.prototype.checkFlags;
        });

        it("overwriteChainableMethod", function () {
            // Make sure the original behavior of 'x' remains the same
            expect({ a: "foo" }).x.to.deep.equal({ a: "foo", __x: "X!" });
            expect({ a: "x" }).x();
            expect(function () {
                expect({ a: "foo" }).x();
            }).to.throw(shaniAssertion.AssertionError);
            const obj = {};
            expect(obj).x.to.be.ok;
            expect(obj).to.have.property("__x", "X!");

            // Test the new behavior of 'x'
            const assertion = expect({ a: "foo" }).x.to.be.ok;
            expect(utils.flag(assertion, "message")).to.equal("x marks the spot");
            expect(function () {
                const assertion = expect({ a: "x" });
                utils.flag(assertion, "marked", true);
                assertion.x();
            }).to.throw(shaniAssertion.AssertionError);
        });

        it("should return a new assertion with flags copied over", function () {
            const assertion1 = expect({ a: "x" });
            const assertion2 = assertion1.x();

            shaniAssertion.config.proxyExcludedKeys.push("nodeType");

            // Checking if a new assertion was returned
            expect(assertion1).to.not.be.equal(assertion2);

            // Check if flags were copied
            assertion2.checkFlags();

            // Checking if it's really an instance of an Assertion
            expect(assertion2).to.be.instanceOf(assertionConstructor);

            // Ensure that foo returns an Assertion (not a function)
            expect(expect({ a: "x" }).x()).to.be.an.instanceOf(assertionConstructor);

            const hasProtoSupport = "__proto__" in Object;
            if (hasProtoSupport) {
                expect(expect({ a: "x" }).x).to.be.an.instanceOf(assertionConstructor);
            }
        });
    });

    it("compareByInspect", function () {
        shaniAssertion.use(function (_shaniAssertion, _) {
            const cbi = _.compareByInspect;

            // "'c" is less than "'d"
            expect(cbi("cat", "dog")).to.equal(-1);
            expect(cbi("dog", "cat")).to.equal(1);
            expect(cbi("cat", "cat")).to.equal(1);

            // "{ cat: [ [ 'dog', 1" is less than "{ cat [ [ 'dog', 2"
            expect(cbi({ "cat": [["dog", 1]] }, { "cat": [["dog", 2]] })).to.equal(-1);
            expect(cbi({ "cat": [["dog", 2]] }, { "cat": [["dog", 1]] })).to.equal(1);

            if (typeof Symbol === "function") {
                // "Symbol(c" is less than "Symbol(d"
                expect(cbi(Symbol("cat"), Symbol("dog"))).to.equal(-1);
                expect(cbi(Symbol("dog"), Symbol("cat"))).to.equal(1);
            }
        });
    });

    describe("getOwnEnumerablePropertySymbols", function () {
        let gettem;

        beforeEach(function () {
            shaniAssertion.use(function (_shaniAssertion, _) {
                gettem = _.getOwnEnumerablePropertySymbols;
            });
        });

        it("returns an empty array if no symbols", function () {
            const obj = {};
            const cat = "cat";

            obj[cat] = 42;

            expect(gettem(obj)).to.not.include(cat);
        });

        it("returns enumerable symbols only", function () {
            if (typeof Symbol !== "function") return;

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

    describe("getOwnEnumerableProperties", function () {
        let gettem;

        beforeEach(function () {
            shaniAssertion.use(function (_shaniAssertion, _) {
                gettem = _.getOwnEnumerableProperties;
            });
        });

        it("returns enumerable property names if no symbols", function () {
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

        it("returns enumerable property names and symbols", function () {
            if (typeof Symbol !== "function") return;

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

    describe("proxified object", function () {
        if (typeof Proxy === "undefined" || typeof Reflect === "undefined") return;

        let proxify;

        beforeEach(function () {
            shaniAssertion.use(function (_shaniAssertion, _) {
                proxify = _.proxify;
            });
        });

        it("returns property value if an existing property is read", function () {
            const pizza = proxify({ mushrooms: 42 });

            expect(pizza.mushrooms).to.equal(42);
        });

        it("returns property value if an existing property is read when nonChainableMethodName is set", function () {
            const bake = function () { };
            bake.numPizzas = 2;

            const bakeProxy = proxify(bake, "bake");

            expect(bakeProxy.numPizzas).to.equal(2);
        });

        it("throws invalid property error if a non-existent property is read", function () {
            const pizza = proxify({});

            expect(function () {
                pizza.mushrooms;
            }).to.throw("Invalid property: mushrooms");
        });

        it("throws invalid use error if a non-existent property is read when nonChainableMethodName is set", function () {
            const bake = proxify(function () { }, "bake");

            expect(function () {
                bake.numPizzas;
            }).to.throw("Invalid property: bake.numPizzas. See docs for proper usage of \"bake\".");
        });

        it("suggests a fix if a non-existent prop looks like a typo", function () {
            const pizza = proxify({ foo: 1, bar: 2, baz: 3 });

            expect(function () {
                pizza.phoo;
            }).to.throw("Invalid property: phoo. Did you mean \"foo\"?");
        });

        it("doesn't take exponential time to find string distances", function () {
            const pizza = proxify({ veryLongPropertyNameWithLotsOfLetters: 1 });

            expect(function () {
                pizza.extremelyLongPropertyNameWithManyLetters;
            }).to.throw(
                "Invalid property: extremelyLongPropertyNameWithManyLetters"
                );
        });

        it("doesn't suggest properties from Object.prototype", function () {
            const pizza = proxify({ string: 5 });
            expect(function () {
                pizza.tostring;
            }).to.throw("Invalid property: tostring. Did you mean \"string\"?");
        });

        // .then is excluded from property validation for promise support
        it("doesn't throw error if non-existent `then` is read", function () {
            const pizza = proxify({});

            expect(function () {
                pizza.then;
            }).to.not.throw();
        });
    });

    describe("pathval", () => {
        const assert = shaniAssertion.assert;

        describe("hasProperty", function () {
            it("should handle array index", function () {
                const arr = [1, 2, "cheeseburger"];
                assert(pathval.hasProperty(arr, 1) === true);
                assert(pathval.hasProperty(arr, 3) === false);
            });

            it("should handle primitives", function () {
                const exampleString = "string literal";
                assert(pathval.hasProperty(exampleString, "length") === true);
                assert(pathval.hasProperty(exampleString, 3) === true);
                assert(pathval.hasProperty(exampleString, 14) === false);

                assert(pathval.hasProperty(1, "foo") === false);
                assert(pathval.hasProperty(false, "bar") === false);
                assert(pathval.hasProperty(true, "toString") === true);

                if (typeof Symbol === "function") {
                    assert(pathval.hasProperty(Symbol(), 1) === false);
                    assert(pathval.hasProperty(Symbol.iterator, "valueOf") === true);
                }
            });

            it("should handle objects", function () {
                const exampleObj = {
                    foo: "bar"
                };
                assert(pathval.hasProperty(exampleObj, "foo") === true);
                assert(pathval.hasProperty(exampleObj, "baz") === false);
                assert(pathval.hasProperty(exampleObj, 0) === false);
            });

            it("should handle undefined", function () {
                assert(pathval.hasProperty(undefined, "foo") === false);
            });

            it("should handle null", function () {
                assert(pathval.hasProperty(null, "foo") === false);
            });
        });

        describe("getPathInfo", function () {
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
            it("should handle simple property", function () {
                const info = gpi(obj, "dimensions.units");
                assert(info.parent === obj.dimensions);
                assert(info.value === obj.dimensions.units);
                assert(info.name === "units");
                assert(info.exists === true);
            });

            it("should handle non-existent property", function () {
                const info = gpi(obj, "dimensions.size");
                assert(info.parent === obj.dimensions);
                assert(info.value === undefined);
                assert(info.name === "size");
                assert(info.exists === false);
            });

            it("should handle array index", function () {
                const info = gpi(obj, "primes[2]");
                assert(info.parent === obj.primes);
                assert(info.value === obj.primes[2]);
                assert(info.name === 2);
                assert(info.exists === true);
            });

            it("should handle dimensional array", function () {
                const info = gpi(obj, "dimensions.lengths[2][1]");
                assert(info.parent === obj.dimensions.lengths[2]);
                assert(info.value === obj.dimensions.lengths[2][1]);
                assert(info.name === 1);
                assert(info.exists === true);
            });

            it("should handle out of bounds array index", function () {
                const info = gpi(obj, "dimensions.lengths[3]");
                assert(info.parent === obj.dimensions.lengths);
                assert(info.value === undefined);
                assert(info.name === 3);
                assert(info.exists === false);
            });

            it("should handle out of bounds dimensional array index", function () {
                const info = gpi(obj, "dimensions.lengths[2][5]");
                assert(info.parent === obj.dimensions.lengths[2]);
                assert(info.value === undefined);
                assert(info.name === 5);
                assert(info.exists === false);
            });

            it("should handle backslash-escaping for .[]", function () {
                const info = gpi(obj, "dimensions\\.lengths.\\[2\\][1]");
                assert(info.parent === obj["dimensions.lengths"]["[2]"]);
                assert(info.value === obj["dimensions.lengths"]["[2]"][1]);
                assert(info.name === 1);
                assert(info.exists === true);
            });
        });

        describe("getPathValue", function () {
            it("returns the correct value", function () {
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

            it("handles undefined objects and properties", function () {
                const object = {};
                assert(pathval.getPathValue(undefined, "this.should.work") === null);
                assert(pathval.getPathValue(object, "this.should.work") === null);
                assert(pathval.getPathValue("word", "length") === 4);
            });
        });

        describe("setPathValue", function () {
            it("allows value to be set in simple object", function () {
                const obj = {};
                pathval.setPathValue(obj, "hello", "universe");
                assert(obj.hello === "universe");
            });

            it("allows nested object value to be set", function () {
                const obj = {};
                pathval.setPathValue(obj, "hello.universe", "properties");
                assert(obj.hello.universe === "properties");
            });

            it("allows nested array value to be set", function () {
                const obj = {};
                pathval.setPathValue(obj, "hello.universe[1].properties", "galaxy");
                assert(obj.hello.universe[1].properties === "galaxy");
            });

            it("allows value to be REset in simple object", function () {
                const obj = { hello: "world" };
                pathval.setPathValue(obj, "hello", "universe");
                assert(obj.hello === "universe");
            });

            it("allows value to be set in complex object", function () {
                const obj = { hello: {} };
                pathval.setPathValue(obj, "hello.universe", 42);
                assert(obj.hello.universe === 42);
            });

            it("allows value to be REset in complex object", function () {
                const obj = { hello: { universe: 100 } };
                pathval.setPathValue(obj, "hello.universe", 42);
                assert(obj.hello.universe === 42);
            });

            it("allows for value to be set in array", function () {
                const obj = { hello: [] };
                pathval.setPathValue(obj, "hello[0]", 1);
                pathval.setPathValue(obj, "hello[2]", 3);

                assert(obj.hello[0] === 1);
                assert(obj.hello[1] === undefined);
                assert(obj.hello[2] === 3);
            });

            it("allows setting a value into an object inside an array", function () {
                const obj = { hello: [{ anObject: "obj" }] };
                pathval.setPathValue(obj, "hello[0].anotherKey", "anotherValue");

                assert(obj.hello[0].anotherKey === "anotherValue");
            });

            it("allows for value to be REset in array", function () {
                const obj = { hello: [1, 2, 4] };
                pathval.setPathValue(obj, "hello[2]", 3);

                assert(obj.hello[0] === 1);
                assert(obj.hello[1] === 2);
                assert(obj.hello[2] === 3);
            });

            it("allows for value to be REset in array", function () {
                const obj = { hello: [1, 2, 4] };
                pathval.setPathValue(obj, "hello[2]", 3);

                assert(obj.hello[0] === 1);
                assert(obj.hello[1] === 2);
                assert(obj.hello[2] === 3);
            });

            it("returns the object in which the value was set", function () {
                const obj = { hello: [1, 2, 4] };
                const valueReturned = pathval.setPathValue(obj, "hello[2]", 3);
                assert(obj === valueReturned);
            });
        });
    });
});
