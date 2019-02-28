import "./bootstrap";

const {
    is,
    assertion
} = adone;
const { assert, expect } = assertion;


describe("assertion", "configuration", () => {
    let origConfig;

    beforeEach(() => {
        // backup current config
        const clone = function (o) {
            return JSON.parse(JSON.stringify(o));
        };
        origConfig = clone(assertion.config);
    });

    afterEach(() => {
        // restore config
        Object.keys(origConfig).forEach((key) => {
            assertion.config[key] = origConfig[key];
        });
    });

    describe("includeStack", () => {
        // Skip tests if `Error.captureStackTrace` is unsupported
        if (is.undefined(Error.captureStackTrace)) {
            return;
        }

        try {
            throw Error();
        } catch (err) {
            // Skip tests if `err.stack` is unsupported
            if (is.undefined(err.stack)) {
                return;
            }
        }

        // Create overwritten assertions that always fail
        before(() => {
            assertion.util.addProperty(assertion.Assertion.prototype, "tmpProperty", () => { });
            assertion.util.overwriteProperty(assertion.Assertion.prototype, "tmpProperty", () => {
                return function () {
                    this.assert(false);
                };
            });

            assertion.util.addMethod(assertion.Assertion.prototype, "tmpMethod", () => { });
            assertion.util.overwriteMethod(assertion.Assertion.prototype, "tmpMethod", () => {
                return function () {
                    this.assert(false);
                };
            });

            assertion.util.addChainableMethod(assertion.Assertion.prototype, "tmpChainableMethod", () => { }, () => { });
            assertion.util.overwriteChainableMethod(assertion.Assertion.prototype, "tmpChainableMethod", (_super) => {
                return function () {
                    this.assert(false);
                };
            }, () => {
                return function () { };
            });
        });

        // Delete overwritten assertions
        after(() => {
            delete assertion.Assertion.prototype.tmpProperty;
            delete assertion.Assertion.prototype.tmpMethod;
            delete assertion.Assertion.prototype.tmpChainableMethod;
        });

        describe("expect interface", () => {
            // Functions that always throw an error
            const badPropertyAssertion = function () {
                expect(42).to.be.false;
            };
            const badOverwrittenPropertyAssertion = function () {
                expect(42).tmpProperty;
            };
            const badMethodAssertion = function () {
                expect(42).to.equal(false);
            };
            const badOverwrittenMethodAssertion = function () {
                expect(42).tmpMethod();
            };
            const badChainableMethodAssertion = function () {
                expect(42).to.be.a("string");
            };
            const badOverwrittenChainableMethodAssertion = function () {
                expect(42).tmpChainableMethod();
            };

            describe("when true", () => {
                describe("failed property assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = true;

                        try {
                            badPropertyAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("propertyGetter");

                        if (!is.undefined(Proxy) && !is.undefined(Reflect)) {
                            expect(caughtErr.stack).to.contain("proxyGetter");
                        }
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badPropertyAssertion");
                    });
                });

                describe("failed overwritten property assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = true;

                        try {
                            badOverwrittenPropertyAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("overwritingPropertyGetter");

                        if (!is.undefined(Proxy) && !is.undefined(Reflect)) {
                            expect(caughtErr.stack).to.contain("proxyGetter");
                        }
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badOverwrittenPropertyAssertion");
                    });
                });

                describe("failed method assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = true;

                        try {
                            badMethodAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("methodWrapper");
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badMethodAssertion");
                    });
                });

                describe("failed overwritten method assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = true;

                        try {
                            badOverwrittenMethodAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("overwritingMethodWrapper");
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badOverwrittenMethodAssertion");
                    });
                });

                describe("failed chainable method assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = true;

                        try {
                            badChainableMethodAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("chainableMethodWrapper");
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badChainableMethodAssertion");
                    });
                });

                describe("failed overwritten chainable method assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = true;

                        try {
                            badOverwrittenChainableMethodAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("overwritingChainableMethodWrapper");
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badOverwrittenChainableMethodAssertion");
                    });
                });
            });

            describe("when false", () => {
                describe("failed property assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = false;

                        try {
                            badPropertyAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should not include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.not.contain("propertyGetter");

                        if (!is.undefined(Proxy) && !is.undefined(Reflect)) {
                            expect(caughtErr.stack).to.not.contain("proxyGetter");
                        }
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badPropertyAssertion");
                    });
                });

                describe("failed overwritten property assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = false;

                        try {
                            badOverwrittenPropertyAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should not include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.not.contain("overwritingPropertyGetter");

                        if (!is.undefined(Proxy) && !is.undefined(Reflect)) {
                            expect(caughtErr.stack).to.not.contain("proxyGetter");
                        }
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badOverwrittenPropertyAssertion");
                    });
                });

                describe("failed method assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = false;

                        try {
                            badMethodAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should not include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.not.contain("methodWrapper");
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badMethodAssertion");
                    });
                });

                describe("failed overwritten method assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = false;

                        try {
                            badOverwrittenMethodAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should not include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.not.contain("overwritingMethodWrapper");
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badOverwrittenMethodAssertion");
                    });
                });

                describe("failed chainable method assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = false;

                        try {
                            badChainableMethodAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should not include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.not.contain("chainableMethodWrapper");
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badChainableMethodAssertion");
                    });
                });

                describe("failed overwritten chainable method assertions", () => {
                    let caughtErr = "__PRETEST__";

                    before(() => {
                        assertion.config.includeStack = false;

                        try {
                            badOverwrittenChainableMethodAssertion();
                        } catch (err) {
                            caughtErr = err;
                        }
                    });

                    it("should not include Chai frames in stack trace", () => {
                        expect(caughtErr.stack).to.not.contain("overwritingChainableMethodWrapper");
                    });

                    it("should include user frames in stack trace", () => {
                        expect(caughtErr.stack).to.contain("badOverwrittenChainableMethodAssertion");
                    });
                });
            });
        });
    });

    describe("truncateThreshold", () => {
        it("is 20", () => {
            assertion.config.truncateThreshold = 20;

            err(() => {
                assert.deepEqual({ v: "something longer than 20" }, { v: "x" });
            }, "expected { Object (v) } to deeply equal { v: 'x' }");
        });

        it("is 0", () => {
            assertion.config.truncateThreshold = 0;

            err(() => {
                assert.deepEqual({ v: "something longer than 20" }, { v: "x" });
            }, "expected { v: 'something longer than 20' } to deeply equal { v: 'x' }");
        });
    });

    describe("deprecated properties", () => {
        let origWarnFn;
        let warnings;

        beforeEach(() => {
            origWarnFn = console.warn;
            warnings = [];
            console.warn = function (message) {
                warnings.push(message);
            };
        });

        afterEach(() => {
            console.warn = origWarnFn;
        });

        it("Assertion.includeStack warns that it is deprecated", () => {
            assertion.Assertion.includeStack;

            assert.equal(warnings.length, 1);
            assert.equal(warnings[0], "Assertion.includeStack is deprecated, use assertion.config.includeStack instead.");

            assertion.Assertion.includeStack = true;

            assert.equal(warnings.length, 2);
            assert.equal(warnings[1], "Assertion.includeStack is deprecated, use assertion.config.includeStack instead.");
        });

        it("Assertion.includeStack is kept in sync with config.includeStack", () => {
            assert.equal(assertion.Assertion.includeStack, assertion.config.includeStack);
            assertion.Assertion.includeStack = !assertion.Assertion.includeStack;
            assert.equal(assertion.Assertion.includeStack, assertion.config.includeStack);
            assertion.config.includeStack = !assertion.config.includeStack;
            assert.equal(assertion.Assertion.includeStack, assertion.config.includeStack);
        });

        it("Assertion.showDiff warns that it is deprecated", () => {
            assertion.Assertion.showDiff;

            assert.equal(warnings.length, 1);
            assert.equal(warnings[0], "Assertion.showDiff is deprecated, use assertion.config.showDiff instead.");

            assertion.Assertion.showDiff = true;

            assert.equal(warnings.length, 2);
            assert.equal(warnings[1], "Assertion.showDiff is deprecated, use assertion.config.showDiff instead.");
        });

        it("Assertion.showDiff is kept in sync with config.showDiff", () => {
            assert.equal(assertion.Assertion.showDiff, assertion.config.showDiff);
            assertion.Assertion.showDiff = !assertion.Assertion.showDiff;
            assert.equal(assertion.Assertion.showDiff, assertion.config.showDiff);
            assertion.config.showDiff = !assertion.config.showDiff;
            assert.equal(assertion.Assertion.showDiff, assertion.config.showDiff);
        });
    });

    describe("useProxy", () => {
        const readNoExistentProperty = function () {
            expect(false).to.be.tue; // typo: tue should be true
        };

        it("should have default value equal to true", () => {
            expect(assertion.config.useProxy).to.be.true;
        });

        describe("when true", () => {
            it("should use proxy unless user's environment doesn't support", () => {
                if (!is.undefined(Proxy) && !is.undefined(Reflect)) {
                    expect(readNoExistentProperty).to.throw("Invalid Chai property: tue");
                } else {
                    expect(readNoExistentProperty).to.not.throw("Invalid Chai property: tue");
                }
            });
        });

        describe("when false", () => {
            it("should not use proxy", () => {
                assertion.config.useProxy = false;

                expect(readNoExistentProperty).to.not.throw("Invalid Chai property: tue");
            });
        });
    });

    describe("proxyExcludedKeys", () => {
        const readNoExistentProperty = function (prop) {
            return function () {
                const assertion = expect(false);
                expect(assertion).to.not.have.key(prop);
                assertion[prop];
            };
        };

        it("should have default value equal to `['then', 'catch', 'inspect', 'toJSON']`", () => {
            expect(assertion.config.proxyExcludedKeys).to.be.deep.equal(["then", "catch", "inspect", "toJSON"]);
        });

        it("should not throw when accessing non-existing `then` and `inspect` in an environment with proxy support", () => {
            // Since these will not throw if the environment does not support proxies we don't need any `if` clause here
            expect(readNoExistentProperty("then")).to.not.throw();
            expect(readNoExistentProperty("inspect")).to.not.throw();
        });

        it("should throw for properties which are not on the `proxyExcludedKeys` Array in an environment with proxy support", () => {
            assertion.config.proxyExcludedKeys = [];

            if (!is.undefined(Proxy) && !is.undefined(Reflect)) {
                expect(readNoExistentProperty("then")).to.throw("Invalid Chai property: then");
                expect(readNoExistentProperty("inspect")).to.throw("Invalid Chai property: inspect");
            } else {
                expect(readNoExistentProperty("then")).to.not.throw();
                expect(readNoExistentProperty("inspect")).to.not.throw();
            }
        });
    });
});
