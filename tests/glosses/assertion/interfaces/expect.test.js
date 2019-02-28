import "../bootstrap";

const {
    is,
    assertion
} = adone;
const { expect } = assertion;

describe("assertion", "expect", () => {
    it("assertion", () => {
        expect("test").to.be.a("string");
        expect("foo").to.equal("foo");
    });

    describe("safeguards", () => {
        before(() => {
            assertion.util.addProperty(assertion.Assertion.prototype, "tmpProperty", () => {
                new assertion.Assertion(42).equal(42);
            });
            assertion.util.overwriteProperty(assertion.Assertion.prototype, "tmpProperty", (_super) => {
                return function () {
                    _super.call(this);
                };
            });

            assertion.util.addMethod(assertion.Assertion.prototype, "tmpMethod", () => {
                new assertion.Assertion(42).equal(42);
            });
            assertion.util.overwriteMethod(assertion.Assertion.prototype, "tmpMethod", (_super) => {
                return function () {
                    _super.call(this);
                };
            });

            assertion.util.addChainableMethod(assertion.Assertion.prototype, "tmpChainableMethod", () => {
                new assertion.Assertion(42).equal(42);
            }, () => {
                new assertion.Assertion(42).equal(42);
            });
            assertion.util.overwriteChainableMethod(assertion.Assertion.prototype, "tmpChainableMethod", (_super) => {
                return function () {
                    _super.call(this);
                };
            }, (_super) => {
                return function () {
                    _super.call(this);
                };
            });
        });

        after(() => {
            delete assertion.Assertion.prototype.tmpProperty;
            delete assertion.Assertion.prototype.tmpMethod;
            delete assertion.Assertion.prototype.tmpChainableMethod;
        });

        describe("proxify", () => {
            if (is.undefined(Proxy) || is.undefined(Reflect)) {
                return;
            }

            it("throws when invalid property follows expect", () => {
                err(() => {
                    expect(42).pizza;
                }, "Invalid Chai property: pizza", true);
            });

            it("throws when invalid property follows language chain", () => {
                err(() => {
                    expect(42).to.pizza;
                }, "Invalid Chai property: pizza", true);
            });

            it("throws when invalid property follows property assertion", () => {
                err(() => {
                    expect(42).ok.pizza;
                }, "Invalid Chai property: pizza", true);
            });

            it("throws when invalid property follows overwritten property assertion", () => {
                err(() => {
                    expect(42).tmpProperty.pizza;
                }, "Invalid Chai property: pizza", true);
            });

            it("throws when invalid property follows uncalled method assertion", () => {
                err(() => {
                    expect(42).equal.pizza;
                }, 'Invalid Chai property: equal.pizza. See docs for proper usage of "equal".', true);
            });

            it("throws when invalid property follows called method assertion", () => {
                err(() => {
                    expect(42).equal(42).pizza;
                }, "Invalid Chai property: pizza", true);
            });

            it("throws when invalid property follows uncalled overwritten method assertion", () => {
                err(() => {
                    expect(42).tmpMethod.pizza;
                }, 'Invalid Chai property: tmpMethod.pizza. See docs for proper usage of "tmpMethod".', true);
            });

            it("throws when invalid property follows called overwritten method assertion", () => {
                err(() => {
                    expect(42).tmpMethod().pizza;
                }, "Invalid Chai property: pizza", true);
            });

            it("throws when invalid property follows uncalled chainable method assertion", () => {
                err(() => {
                    expect(42).a.pizza;
                }, "Invalid Chai property: pizza", true);
            });

            it("throws when invalid property follows called chainable method assertion", () => {
                err(() => {
                    expect(42).a("number").pizza;
                }, "Invalid Chai property: pizza", true);
            });

            it("throws when invalid property follows uncalled overwritten chainable method assertion", () => {
                err(() => {
                    expect(42).tmpChainableMethod.pizza;
                }, "Invalid Chai property: pizza", true);
            });

            it("throws when invalid property follows called overwritten chainable method assertion", () => {
                err(() => {
                    expect(42).tmpChainableMethod().pizza;
                }, "Invalid Chai property: pizza", true);
            });

            it("doesn't throw if invalid property is excluded via config", () => {
                expect(() => {
                    expect(42).then;
                }).to.not.throw();
            });
        });

        describe("length guard", () => {
            const fnLengthDesc = Object.getOwnPropertyDescriptor(() => { }, "length");
            if (!fnLengthDesc.configurable) {
                return;
            }

            it("doesn't throw when `.length` follows `.expect`", () => {
                expect(() => {
                    expect("foo").length;
                }).to.not.throw();
            });

            it("doesn't throw when `.length` follows language chain", () => {
                expect(() => {
                    expect("foo").to.length;
                }).to.not.throw();
            });

            it("doesn't throw when `.length` follows property assertion", () => {
                expect(() => {
                    expect("foo").ok.length;
                }).to.not.throw();
            });

            it("doesn't throw when `.length` follows overwritten property assertion", () => {
                expect(() => {
                    expect("foo").tmpProperty.length;
                }).to.not.throw();
            });

            it("throws when `.length` follows uncalled method assertion", () => {
                err(() => {
                    expect("foo").equal.length;
                }, 'Invalid Chai property: equal.length. See docs for proper usage of "equal".', true);
            });

            it("doesn't throw when `.length` follows called method assertion", () => {
                expect(() => {
                    expect("foo").equal("foo").length;
                }).to.not.throw();
            });

            it("throws when `.length` follows uncalled overwritten method assertion", () => {
                err(() => {
                    expect("foo").tmpMethod.length;
                }, 'Invalid Chai property: tmpMethod.length. See docs for proper usage of "tmpMethod".', true);
            });

            it("doesn't throw when `.length` follows called overwritten method assertion", () => {
                expect(() => {
                    expect("foo").tmpMethod().length;
                }).to.not.throw();
            });

            it("throws when `.length` follows uncalled chainable method assertion", () => {
                err(() => {
                    expect("foo").a.length;
                }, 'Invalid Chai property: a.length. Due to a compatibility issue, "length" cannot directly follow "a". Use "a.lengthOf" instead.', true);
            });

            it("doesn't throw when `.length` follows called chainable method assertion", () => {
                expect(() => {
                    expect("foo").a("string").length;
                }).to.not.throw();
            });

            it("throws when `.length` follows uncalled overwritten chainable method assertion", () => {
                err(() => {
                    expect("foo").tmpChainableMethod.length;
                }, 'Invalid Chai property: tmpChainableMethod.length. Due to a compatibility issue, "length" cannot directly follow "tmpChainableMethod". Use "tmpChainableMethod.lengthOf" instead.', true);
            });

            it("doesn't throw when `.length` follows called overwritten chainable method assertion", () => {
                expect(() => {
                    expect("foo").tmpChainableMethod().length;
                }).to.not.throw();
            });
        });
    });

    it("no-op chains", () => {
        const test = function (chain) {
            // tests that chain exists
            expect(expect(1)[chain]).not.undefined;

            // tests methods
            expect(1)[chain].equal(1);

            // tests properties that assert
            expect(false)[chain].false;

            // tests not
            expect(false)[chain].not.true;

            // tests chainable methods
            expect([1, 2, 3])[chain].contains(1);
        };

        ["to", "be", "been", "is",
            "and", "has", "have", "with",
            "that", "which", "at", "of",
            "same", "but", "does", "still"].forEach(test);
    });

    describe("fail", () => {
        it("should accept a message as the 3rd argument", () => {
            err(() => {
                expect.fail(0, 1, "this has failed");
            }, /this has failed/);
        });

        it("should accept a message as the only argument", () => {
            err(() => {
                expect.fail("this has failed");
            }, /this has failed/);
        });

        it("should produce a default message when called without any arguments", () => {
            err(() => {
                expect.fail();
            }, /expect\.fail()/);
        });
    });

    it("true", () => {
        expect(true).to.be.true;
        expect(false).to.not.be.true;
        expect(1).to.not.be.true;

        err(() => {
            expect("test", "blah").to.be.true;
        }, "blah: expected 'test' to be true");
    });

    it("ok", () => {
        expect(true).to.be.ok;
        expect(false).to.not.be.ok;
        expect(1).to.be.ok;
        expect(0).to.not.be.ok;

        err(() => {
            expect("", "blah").to.be.ok;
        }, "blah: expected '' to be truthy");

        err(() => {
            expect("test").to.not.be.ok;
        }, "expected 'test' to be falsy");
    });

    it("false", () => {
        expect(false).to.be.false;
        expect(true).to.not.be.false;
        expect(0).to.not.be.false;

        err(() => {
            expect("", "blah").to.be.false;
        }, "blah: expected '' to be false");
    });

    it("null", () => {
        expect(null).to.be.null;
        expect(false).to.not.be.null;

        err(() => {
            expect("", "blah").to.be.null;
        }, "blah: expected '' to be null");

    });

    it("undefined", () => {
        expect(undefined).to.be.undefined;
        expect(null).to.not.be.undefined;

        err(() => {
            expect("", "blah").to.be.undefined;
        }, "blah: expected '' to be undefined");
    });

    it("exist", () => {
        const foo = "bar";
        let bar;
        expect(foo).to.exist;
        expect(bar).to.not.exist;
        expect(0).to.exist;
        expect(false).to.exist;
        expect("").to.exist;

        err(() => {
            expect(bar, "blah").to.exist;
        }, "blah: expected undefined to exist");

        err(() => {
            expect(foo).to.not.exist(foo);
        }, "expected 'bar' to not exist");
    });

    it("arguments", () => {
        const args = (function () {
            return arguments;
        })(1, 2, 3);
        expect(args).to.be.arguments;
        expect([]).to.not.be.arguments;
        expect(args).to.be.an("arguments").and.be.arguments;
        expect([]).to.be.an("array").and.not.be.Arguments;

        err(() => {
            expect([], "blah").to.be.arguments;
        }, "blah: expected [] to be arguments but got Array");
    });

    it(".equal()", () => {
        let foo;
        expect(undefined).to.equal(foo);

        err(() => {
            expect(undefined).to.equal(null);
        }, "expected undefined to equal null");
    });

    it("typeof", () => {
        expect("test").to.be.a("string");

        err(() => {
            expect("test").to.not.be.a("string");
        }, "expected 'test' not to be a string");

        (function () {
            expect(arguments).to.be.an("arguments");
        })(1, 2);

        expect(5).to.be.a("number");
        expect(new Number(1)).to.be.a("number");
        expect(Number(1)).to.be.a("number");
        expect(true).to.be.a("boolean");
        expect(new Array()).to.be.a("array");
        expect(new Object()).to.be.a("object");
        expect({}).to.be.a("object");
        expect([]).to.be.a("array");
        expect(() => { }).to.be.a("function");
        expect(null).to.be.a("null");

        if (is.function(Symbol)) {
            expect(Symbol()).to.be.a("symbol");
        }

        err(() => {
            expect(5).to.not.be.a("number", "blah");
        }, "blah: expected 5 not to be a number");

        err(() => {
            expect(5, "blah").to.not.be.a("number");
        }, "blah: expected 5 not to be a number");
    });

    it("instanceof", () => {
        function Foo() { }
        expect(new Foo()).to.be.an.instanceof(Foo);

        // Normally, `instanceof` requires that the constructor be a function or an
        // object with a callable `@@hasInstance`. But in some older browsers such
        // as IE11, `instanceof` also accepts DOM-related interfaces such as
        // `HTMLElement`, despite being non-callable objects in those browsers.
        // See: https://github.com/chaijs/chai/issues/1000.
        // eslint-disable-next-line adone/no-typeof
        if (typeof document !== "undefined" && !is.undefined(document.createElement) && typeof HTMLElement !== "undefined") {
            expect(document.createElement("div")).to.be.an.instanceof(HTMLElement);
        }

        err(() => {
            expect(new Foo()).to.an.instanceof(1, "blah");
        }, "blah: The instanceof assertion needs a constructor but number was given.");

        err(() => {
            expect(new Foo(), "blah").to.an.instanceof(1);
        }, "blah: The instanceof assertion needs a constructor but number was given.");

        err(() => {
            expect(new Foo()).to.an.instanceof("batman");
        }, "The instanceof assertion needs a constructor but string was given.");

        err(() => {
            expect(new Foo()).to.an.instanceof({});
        }, "The instanceof assertion needs a constructor but Object was given.");

        err(() => {
            expect(new Foo()).to.an.instanceof(true);
        }, "The instanceof assertion needs a constructor but boolean was given.");

        err(() => {
            expect(new Foo()).to.an.instanceof(null);
        }, "The instanceof assertion needs a constructor but null was given.");

        err(() => {
            expect(new Foo()).to.an.instanceof(undefined);
        }, "The instanceof assertion needs a constructor but undefined was given.");

        err(() => {
            function Thing() { }
            const t = new Thing();
            Thing.prototype = 1337;
            expect(t).to.an.instanceof(Thing);
        }, "The instanceof assertion needs a constructor but function was given.", true);

        if (!is.undefined(Symbol) && !is.undefined(Symbol.hasInstance)) {
            err(() => {
                expect(new Foo()).to.an.instanceof(Symbol());
            }, "The instanceof assertion needs a constructor but symbol was given.");

            err(() => {
                const FakeConstructor = {};
                const fakeInstanceB = 4;
                FakeConstructor[Symbol.hasInstance] = function (val) {
                    return val === 3;
                };

                expect(fakeInstanceB).to.be.an.instanceof(FakeConstructor);
            }, "expected 4 to be an instance of an unnamed constructor");

            err(() => {
                const FakeConstructor = {};
                const fakeInstanceB = 4;
                FakeConstructor[Symbol.hasInstance] = function (val) {
                    return val === 4;
                };

                expect(fakeInstanceB).to.not.be.an.instanceof(FakeConstructor);
            }, "expected 4 to not be an instance of an unnamed constructor");
        }

        err(() => {
            expect(3).to.an.instanceof(Foo, "blah");
        }, "blah: expected 3 to be an instance of Foo");

        err(() => {
            expect(3, "blah").to.an.instanceof(Foo);
        }, "blah: expected 3 to be an instance of Foo");
    });

    it("within(start, finish)", () => {
        expect(5).to.be.within(5, 10);
        expect(5).to.be.within(3, 6);
        expect(5).to.be.within(3, 5);
        expect(5).to.not.be.within(1, 3);
        expect("foo").to.have.length.within(2, 4);
        expect("foo").to.have.lengthOf.within(2, 4);
        expect([1, 2, 3]).to.have.length.within(2, 4);
        expect([1, 2, 3]).to.have.lengthOf.within(2, 4);

        err(() => {
            expect(5).to.not.be.within(4, 6, "blah");
        }, "blah: expected 5 to not be within 4..6");

        err(() => {
            expect(5, "blah").to.not.be.within(4, 6);
        }, "blah: expected 5 to not be within 4..6");

        err(() => {
            expect(10).to.be.within(50, 100, "blah");
        }, "blah: expected 10 to be within 50..100");

        err(() => {
            expect("foo").to.have.length.within(5, 7, "blah");
        }, "blah: expected \'foo\' to have a length within 5..7");

        err(() => {
            expect("foo", "blah").to.have.length.within(5, 7);
        }, "blah: expected \'foo\' to have a length within 5..7");

        err(() => {
            expect("foo").to.have.lengthOf.within(5, 7, "blah");
        }, "blah: expected \'foo\' to have a length within 5..7");

        err(() => {
            expect([1, 2, 3]).to.have.length.within(5, 7, "blah");
        }, "blah: expected [ 1, 2, 3 ] to have a length within 5..7");

        err(() => {
            expect([1, 2, 3]).to.have.lengthOf.within(5, 7, "blah");
        }, "blah: expected [ 1, 2, 3 ] to have a length within 5..7");

        err(() => {
            expect(null).to.be.within(0, 1, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(null, "blah").to.be.within(0, 1);
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.be.within(null, 1, "blah");
        }, "blah: the arguments to within must be numbers");

        err(() => {
            expect(1, "blah").to.be.within(null, 1);
        }, "blah: the arguments to within must be numbers");

        err(() => {
            expect(1).to.be.within(0, null, "blah");
        }, "blah: the arguments to within must be numbers");

        err(() => {
            expect(1, "blah").to.be.within(0, null);
        }, "blah: the arguments to within must be numbers");

        err(() => {
            expect(null).to.not.be.within(0, 1, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.not.be.within(null, 1, "blah");
        }, "blah: the arguments to within must be numbers");

        err(() => {
            expect(1).to.not.be.within(0, null, "blah");
        }, "blah: the arguments to within must be numbers");

        err(() => {
            expect(1).to.have.length.within(5, 7, "blah");
        }, "blah: expected 1 to have property 'length'");

        err(() => {
            expect(1, "blah").to.have.length.within(5, 7);
        }, "blah: expected 1 to have property 'length'");

        err(() => {
            expect(1).to.have.lengthOf.within(5, 7, "blah");
        }, "blah: expected 1 to have property 'length'");

        if (is.function(Map)) {
            expect(new Map()).to.have.length.within(0, 0);
            expect(new Map()).to.have.lengthOf.within(0, 0);

            const map = new Map();
            map.set("a", 1);
            map.set("b", 2);
            map.set("c", 3);

            expect(map).to.have.length.within(2, 4);
            expect(map).to.have.lengthOf.within(2, 4);

            err(() => {
                expect(map).to.have.length.within(5, 7, "blah");
            }, "blah: expected {} to have a size within 5..7");

            err(() => {
                expect(map).to.have.lengthOf.within(5, 7, "blah");
            }, "blah: expected {} to have a size within 5..7");
        }

        if (is.function(Set)) {
            expect(new Set()).to.have.length.within(0, 0);
            expect(new Set()).to.have.lengthOf.within(0, 0);

            const set = new Set();
            set.add(1);
            set.add(2);
            set.add(3);

            expect(set).to.have.length.within(2, 4);
            expect(set).to.have.lengthOf.within(2, 4);

            err(() => {
                expect(set).to.have.length.within(5, 7, "blah");
            }, "blah: expected {} to have a size within 5..7");

            err(() => {
                expect(set).to.have.lengthOf.within(5, 7, "blah");
            }, "blah: expected {} to have a size within 5..7");
        }
    });

    it("within(start, finish) (dates)", () => {
        const now = new Date();
        const oneSecondAgo = new Date(now.getTime() - 1000);
        const oneSecondAfter = new Date(now.getTime() + 1000);
        const nowUTC = now.toUTCString();
        const beforeUTC = oneSecondAgo.toUTCString();
        const afterUTC = oneSecondAfter.toUTCString();

        expect(now).to.be.within(oneSecondAgo, oneSecondAfter);
        expect(now).to.be.within(now, oneSecondAfter);
        expect(now).to.be.within(now, now);
        expect(oneSecondAgo).to.not.be.within(now, oneSecondAfter);

        err(() => {
            expect(now).to.not.be.within(now, oneSecondAfter, "blah");
        }, `blah: expected ${nowUTC} to not be within ${nowUTC}..${afterUTC}`);

        err(() => {
            expect(now, "blah").to.not.be.within(oneSecondAgo, oneSecondAfter);
        }, `blah: expected ${nowUTC} to not be within ${beforeUTC}..${afterUTC}`);

        err(() => {
            expect(now).to.have.length.within(5, 7, "blah");
        }, `blah: expected ${nowUTC} to have property 'length'`);

        err(() => {
            expect("foo").to.have.lengthOf.within(now, 7, "blah");
        }, "blah: the arguments to within must be numbers");

        err(() => {
            expect(now).to.be.within(now, 1, "blah");
        }, "blah: the arguments to within must be dates");

        err(() => {
            expect(now).to.be.within(null, now, "blah");
        }, "blah: the arguments to within must be dates");

        err(() => {
            expect(now).to.be.within(now, undefined, "blah");
        }, "blah: the arguments to within must be dates");

        err(() => {
            expect(now, "blah").to.be.within(1, now);
        }, "blah: the arguments to within must be dates");

        err(() => {
            expect(now, "blah").to.be.within(now, 1);
        }, "blah: the arguments to within must be dates");

        err(() => {
            expect(null).to.not.be.within(now, oneSecondAfter, "blah");
        }, "blah: expected null to be a number or a date");
    });

    it("above(n)", () => {
        expect(5).to.be.above(2);
        expect(5).to.be.greaterThan(2);
        expect(5).to.not.be.above(5);
        expect(5).to.not.be.above(6);
        expect("foo").to.have.length.above(2);
        expect("foo").to.have.lengthOf.above(2);
        expect([1, 2, 3]).to.have.length.above(2);
        expect([1, 2, 3]).to.have.lengthOf.above(2);

        err(() => {
            expect(5).to.be.above(6, "blah");
        }, "blah: expected 5 to be above 6");

        err(() => {
            expect(5, "blah").to.be.above(6);
        }, "blah: expected 5 to be above 6");

        err(() => {
            expect(10).to.not.be.above(6, "blah");
        }, "blah: expected 10 to be at most 6");

        err(() => {
            expect("foo").to.have.length.above(4, "blah");
        }, "blah: expected \'foo\' to have a length above 4 but got 3");

        err(() => {
            expect("foo", "blah").to.have.length.above(4);
        }, "blah: expected \'foo\' to have a length above 4 but got 3");

        err(() => {
            expect("foo").to.have.lengthOf.above(4, "blah");
        }, "blah: expected \'foo\' to have a length above 4 but got 3");

        err(() => {
            expect([1, 2, 3]).to.have.length.above(4, "blah");
        }, "blah: expected [ 1, 2, 3 ] to have a length above 4 but got 3");

        err(() => {
            expect([1, 2, 3]).to.have.lengthOf.above(4, "blah");
        }, "blah: expected [ 1, 2, 3 ] to have a length above 4 but got 3");

        err(() => {
            expect(null).to.be.above(0, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(null, "blah").to.be.above(0);
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.be.above(null, "blah");
        }, "blah: the argument to above must be a number");

        err(() => {
            expect(1, "blah").to.be.above(null);
        }, "blah: the argument to above must be a number");

        err(() => {
            expect(null).to.not.be.above(0, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.not.be.above(null, "blah");
        }, "blah: the argument to above must be a number");

        err(() => {
            expect(1).to.have.length.above(0, "blah");
        }, "blah: expected 1 to have property 'length'");

        err(() => {
            expect(1, "blah").to.have.length.above(0);
        }, "blah: expected 1 to have property 'length'");

        err(() => {
            expect(1).to.have.lengthOf.above(0, "blah");
        }, "blah: expected 1 to have property 'length'");

        if (is.function(Map)) {
            expect(new Map()).to.have.length.above(-1);
            expect(new Map()).to.have.lengthOf.above(-1);

            const map = new Map();
            map.set("a", 1);
            map.set("b", 2);
            map.set("c", 3);

            expect(map).to.have.length.above(2);
            expect(map).to.have.lengthOf.above(2);

            err(() => {
                expect(map).to.have.length.above(5, "blah");
            }, "blah: expected {} to have a size above 5 but got 3");

            err(() => {
                expect(map).to.have.lengthOf.above(5, "blah");
            }, "blah: expected {} to have a size above 5 but got 3");
        }

        if (is.function(Set)) {
            expect(new Set()).to.have.length.above(-1);
            expect(new Set()).to.have.lengthOf.above(-1);

            const set = new Set();
            set.add(1);
            set.add(2);
            set.add(3);

            expect(set).to.have.length.above(2);
            expect(set).to.have.lengthOf.above(2);

            err(() => {
                expect(set).to.have.length.above(5, "blah");
            }, "blah: expected {} to have a size above 5 but got 3");

            err(() => {
                expect(set).to.have.lengthOf.above(5, "blah");
            }, "blah: expected {} to have a size above 5 but got 3");
        }
    });

    it("above(n) (dates)", () => {
        const now = new Date();
        const oneSecondAgo = new Date(now.getTime() - 1000);
        const oneSecondAfter = new Date(now.getTime() + 1000);

        expect(now).to.be.above(oneSecondAgo);
        expect(now).to.be.greaterThan(oneSecondAgo);
        expect(now).to.not.be.above(now);
        expect(now).to.not.be.above(oneSecondAfter);

        err(() => {
            expect(now).to.be.above(oneSecondAfter, "blah");
        }, `blah: expected ${now.toUTCString()} to be above ${oneSecondAfter.toUTCString()}`);

        err(() => {
            expect(10).to.not.be.above(6, "blah");
        }, "blah: expected 10 to be at most 6");

        err(() => {
            expect(now).to.have.length.above(4, "blah");
        }, `blah: expected ${now.toUTCString()} to have property 'length'`);

        err(() => {
            expect([1, 2, 3]).to.have.length.above(now, "blah");
        }, "blah: the argument to above must be a number");

        err(() => {
            expect(null).to.be.above(now, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(now).to.be.above(null, "blah");
        }, "blah: the argument to above must be a date");

        err(() => {
            expect(null).to.have.length.above(0, "blah");
        }, "blah: Target cannot be null or undefined.");
    });

    it("least(n)", () => {
        expect(5).to.be.at.least(2);
        expect(5).to.be.at.least(5);
        expect(5).to.not.be.at.least(6);
        expect("foo").to.have.length.of.at.least(2);
        expect("foo").to.have.lengthOf.at.least(2);
        expect([1, 2, 3]).to.have.length.of.at.least(2);
        expect([1, 2, 3]).to.have.lengthOf.at.least(2);

        err(() => {
            expect(5).to.be.at.least(6, "blah");
        }, "blah: expected 5 to be at least 6");

        err(() => {
            expect(5, "blah").to.be.at.least(6);
        }, "blah: expected 5 to be at least 6");

        err(() => {
            expect(10).to.not.be.at.least(6, "blah");
        }, "blah: expected 10 to be below 6");

        err(() => {
            expect("foo").to.have.length.of.at.least(4, "blah");
        }, "blah: expected \'foo\' to have a length at least 4 but got 3");

        err(() => {
            expect("foo", "blah").to.have.length.of.at.least(4);
        }, "blah: expected \'foo\' to have a length at least 4 but got 3");

        err(() => {
            expect("foo").to.have.lengthOf.at.least(4, "blah");
        }, "blah: expected \'foo\' to have a length at least 4 but got 3");

        err(() => {
            expect([1, 2, 3]).to.have.length.of.at.least(4, "blah");
        }, "blah: expected [ 1, 2, 3 ] to have a length at least 4 but got 3");

        err(() => {
            expect([1, 2, 3]).to.have.lengthOf.at.least(4, "blah");
        }, "blah: expected [ 1, 2, 3 ] to have a length at least 4 but got 3");

        err(() => {
            expect([1, 2, 3, 4]).to.not.have.length.of.at.least(4, "blah");
        }, "blah: expected [ 1, 2, 3, 4 ] to have a length below 4");

        err(() => {
            expect([1, 2, 3, 4]).to.not.have.lengthOf.at.least(4, "blah");
        }, "blah: expected [ 1, 2, 3, 4 ] to have a length below 4");

        err(() => {
            expect(null).to.be.at.least(0, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(null, "blah").to.be.at.least(0);
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.be.at.least(null, "blah");
        }, "blah: the argument to least must be a number");

        err(() => {
            expect(1, "blah").to.be.at.least(null);
        }, "blah: the argument to least must be a number");

        err(() => {
            expect(null).to.not.be.at.least(0, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.not.be.at.least(null, "blah");
        }, "blah: the argument to least must be a number");

        err(() => {
            expect(1).to.have.length.at.least(0, "blah");
        }, "blah: expected 1 to have property 'length'");

        err(() => {
            expect(1, "blah").to.have.length.at.least(0);
        }, "blah: expected 1 to have property 'length'");

        err(() => {
            expect(1).to.have.lengthOf.at.least(0, "blah");
        }, "blah: expected 1 to have property 'length'");

        if (is.function(Map)) {
            expect(new Map()).to.have.length.of.at.least(0);
            expect(new Map()).to.have.lengthOf.at.least(0);

            const map = new Map();
            map.set("a", 1);
            map.set("b", 2);
            map.set("c", 3);

            expect(map).to.have.length.of.at.least(3);
            expect(map).to.have.lengthOf.at.least(3);

            err(() => {
                expect(map).to.have.length.of.at.least(4, "blah");
            }, "blah: expected {} to have a size at least 4 but got 3");

            err(() => {
                expect(map).to.have.lengthOf.at.least(4, "blah");
            }, "blah: expected {} to have a size at least 4 but got 3");
        }

        if (is.function(Set)) {
            expect(new Set()).to.have.length.of.at.least(0);
            expect(new Set()).to.have.lengthOf.at.least(0);

            const set = new Set();
            set.add(1);
            set.add(2);
            set.add(3);

            expect(set).to.have.length.of.at.least(3);
            expect(set).to.have.lengthOf.at.least(3);

            err(() => {
                expect(set).to.have.length.of.at.least(4, "blah");
            }, "blah: expected {} to have a size at least 4 but got 3");

            err(() => {
                expect(set).to.have.lengthOf.at.least(4, "blah");
            }, "blah: expected {} to have a size at least 4 but got 3");
        }
    });

    it("below(n)", () => {
        expect(2).to.be.below(5);
        expect(2).to.be.lessThan(5);
        expect(2).to.not.be.below(2);
        expect(2).to.not.be.below(1);
        expect("foo").to.have.length.below(4);
        expect("foo").to.have.lengthOf.below(4);
        expect([1, 2, 3]).to.have.length.below(4);
        expect([1, 2, 3]).to.have.lengthOf.below(4);

        err(() => {
            expect(6).to.be.below(5, "blah");
        }, "blah: expected 6 to be below 5");

        err(() => {
            expect(6, "blah").to.be.below(5);
        }, "blah: expected 6 to be below 5");

        err(() => {
            expect(6).to.not.be.below(10, "blah");
        }, "blah: expected 6 to be at least 10");

        err(() => {
            expect("foo").to.have.length.below(2, "blah");
        }, "blah: expected \'foo\' to have a length below 2 but got 3");

        err(() => {
            expect("foo", "blah").to.have.length.below(2);
        }, "blah: expected \'foo\' to have a length below 2 but got 3");

        err(() => {
            expect("foo").to.have.lengthOf.below(2, "blah");
        }, "blah: expected \'foo\' to have a length below 2 but got 3");

        err(() => {
            expect([1, 2, 3]).to.have.length.below(2, "blah");
        }, "blah: expected [ 1, 2, 3 ] to have a length below 2 but got 3");

        err(() => {
            expect([1, 2, 3]).to.have.lengthOf.below(2, "blah");
        }, "blah: expected [ 1, 2, 3 ] to have a length below 2 but got 3");

        err(() => {
            expect(null).to.be.below(0, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(null, "blah").to.be.below(0);
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.be.below(null, "blah");
        }, "blah: the argument to below must be a number");

        err(() => {
            expect(1, "blah").to.be.below(null);
        }, "blah: the argument to below must be a number");

        err(() => {
            expect(null).to.not.be.below(0, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.not.be.below(null, "blah");
        }, "blah: the argument to below must be a number");

        err(() => {
            expect(1).to.have.length.below(0, "blah");
        }, "blah: expected 1 to have property 'length'");

        err(() => {
            expect(1, "blah").to.have.length.below(0);
        }, "blah: expected 1 to have property 'length'");

        err(() => {
            expect(1).to.have.lengthOf.below(0, "blah");
        }, "blah: expected 1 to have property 'length'");

        if (is.function(Map)) {
            expect(new Map()).to.have.length.below(1);
            expect(new Map()).to.have.lengthOf.below(1);

            const map = new Map();
            map.set("a", 1);
            map.set("b", 2);
            map.set("c", 3);

            expect(map).to.have.length.below(4);
            expect(map).to.have.lengthOf.below(4);

            err(() => {
                expect(map).to.have.length.below(2, "blah");
            }, "blah: expected {} to have a size below 2 but got 3");

            err(() => {
                expect(map).to.have.lengthOf.below(2, "blah");
            }, "blah: expected {} to have a size below 2 but got 3");
        }

        if (is.function(Set)) {
            expect(new Set()).to.have.length.below(1);
            expect(new Set()).to.have.lengthOf.below(1);

            const set = new Set();
            set.add(1);
            set.add(2);
            set.add(3);

            expect(set).to.have.length.below(4);
            expect(set).to.have.lengthOf.below(4);

            err(() => {
                expect(set).to.have.length.below(2, "blah");
            }, "blah: expected {} to have a size below 2 but got 3");

            err(() => {
                expect(set).to.have.lengthOf.below(2, "blah");
            }, "blah: expected {} to have a size below 2 but got 3");
        }
    });

    it("below(n) (dates)", () => {
        const now = new Date();
        const oneSecondAgo = new Date(now.getTime() - 1000);
        const oneSecondAfter = new Date(now.getTime() + 1000);

        expect(now).to.be.below(oneSecondAfter);
        expect(oneSecondAgo).to.be.lessThan(now);
        expect(now).to.not.be.below(oneSecondAgo);
        expect(oneSecondAfter).to.not.be.below(oneSecondAgo);

        err(() => {
            expect(now).to.be.below(oneSecondAgo, "blah");
        }, `blah: expected ${now.toUTCString()} to be below ${oneSecondAgo.toUTCString()}`);

        err(() => {
            expect(now).to.not.be.below(oneSecondAfter, "blah");
        }, `blah: expected ${now.toUTCString()} to be at least ${oneSecondAfter.toUTCString()}`);

        err(() => {
            expect("foo").to.have.length.below(2, "blah");
        }, "blah: expected \'foo\' to have a length below 2 but got 3");

        err(() => {
            expect(null).to.be.below(now, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.be.below(null, "blah");
        }, "blah: the argument to below must be a number");

        err(() => {
            expect(now).to.not.be.below(null, "blah");
        }, "blah: the argument to below must be a date");

        err(() => {
            expect(now).to.have.length.below(0, "blah");
        }, `blah: expected ${now.toUTCString()} to have property 'length'`);

        err(() => {
            expect("asdasd").to.have.length.below(now, "blah");
        }, "blah: the argument to below must be a number");
    });

    it("most(n)", () => {
        expect(2).to.be.at.most(5);
        expect(2).to.be.at.most(2);
        expect(2).to.not.be.at.most(1);
        expect("foo").to.have.length.of.at.most(4);
        expect("foo").to.have.lengthOf.at.most(4);
        expect([1, 2, 3]).to.have.length.of.at.most(4);
        expect([1, 2, 3]).to.have.lengthOf.at.most(4);

        err(() => {
            expect(6).to.be.at.most(5, "blah");
        }, "blah: expected 6 to be at most 5");

        err(() => {
            expect(6, "blah").to.be.at.most(5);
        }, "blah: expected 6 to be at most 5");

        err(() => {
            expect(6).to.not.be.at.most(10, "blah");
        }, "blah: expected 6 to be above 10");

        err(() => {
            expect("foo").to.have.length.of.at.most(2, "blah");
        }, "blah: expected \'foo\' to have a length at most 2 but got 3");

        err(() => {
            expect("foo", "blah").to.have.length.of.at.most(2);
        }, "blah: expected \'foo\' to have a length at most 2 but got 3");

        err(() => {
            expect("foo").to.have.lengthOf.at.most(2, "blah");
        }, "blah: expected \'foo\' to have a length at most 2 but got 3");

        err(() => {
            expect([1, 2, 3]).to.have.length.of.at.most(2, "blah");
        }, "blah: expected [ 1, 2, 3 ] to have a length at most 2 but got 3");

        err(() => {
            expect([1, 2, 3]).to.have.lengthOf.at.most(2, "blah");
        }, "blah: expected [ 1, 2, 3 ] to have a length at most 2 but got 3");

        err(() => {
            expect([1, 2]).to.not.have.length.of.at.most(2, "blah");
        }, "blah: expected [ 1, 2 ] to have a length above 2");

        err(() => {
            expect([1, 2]).to.not.have.lengthOf.at.most(2, "blah");
        }, "blah: expected [ 1, 2 ] to have a length above 2");

        err(() => {
            expect(null).to.be.at.most(0, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(null, "blah").to.be.at.most(0);
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.be.at.most(null, "blah");
        }, "blah: the argument to most must be a number");

        err(() => {
            expect(1, "blah").to.be.at.most(null);
        }, "blah: the argument to most must be a number");

        err(() => {
            expect(null).to.not.be.at.most(0, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(1).to.not.be.at.most(null, "blah");
        }, "blah: the argument to most must be a number");

        err(() => {
            expect(1).to.have.length.of.at.most(0, "blah");
        }, "blah: expected 1 to have property 'length'");

        err(() => {
            expect(1, "blah").to.have.length.of.at.most(0);
        }, "blah: expected 1 to have property 'length'");

        err(() => {
            expect(1).to.have.lengthOf.at.most(0, "blah");
        }, "blah: expected 1 to have property 'length'");

        if (is.function(Map)) {
            expect(new Map()).to.have.length.of.at.most(0);
            expect(new Map()).to.have.lengthOf.at.most(0);

            const map = new Map();
            map.set("a", 1);
            map.set("b", 2);
            map.set("c", 3);

            expect(map).to.have.length.of.at.most(3);
            expect(map).to.have.lengthOf.at.most(3);

            err(() => {
                expect(map).to.have.length.of.at.most(2, "blah");
            }, "blah: expected {} to have a size at most 2 but got 3");

            err(() => {
                expect(map).to.have.lengthOf.at.most(2, "blah");
            }, "blah: expected {} to have a size at most 2 but got 3");
        }

        if (is.function(Set)) {
            expect(new Set()).to.have.length.of.at.most(0);
            expect(new Set()).to.have.lengthOf.at.most(0);

            const set = new Set();
            set.add(1);
            set.add(2);
            set.add(3);

            expect(set).to.have.length.of.at.most(3);
            expect(set).to.have.lengthOf.at.most(3);

            err(() => {
                expect(set).to.have.length.of.at.most(2, "blah");
            }, "blah: expected {} to have a size at most 2 but got 3");

            err(() => {
                expect(set).to.have.lengthOf.at.most(2, "blah");
            }, "blah: expected {} to have a size at most 2 but got 3");
        }
    });

    it("most(n) (dates)", () => {
        const now = new Date();
        const oneSecondBefore = new Date(now.getTime() - 1000);
        const oneSecondAfter = new Date(now.getTime() + 1000);
        const nowUTC = now.toUTCString();
        const beforeUTC = oneSecondBefore.toUTCString();
        const afterUTC = oneSecondAfter.toUTCString();

        expect(now).to.be.at.most(oneSecondAfter);
        expect(now).to.be.at.most(now);
        expect(now).to.not.be.at.most(oneSecondBefore);

        err(() => {
            expect(now).to.be.at.most(oneSecondBefore, "blah");
        }, `blah: expected ${nowUTC} to be at most ${beforeUTC}`);

        err(() => {
            expect(now).to.not.be.at.most(now, "blah");
        }, `blah: expected ${nowUTC} to be above ${nowUTC}`);

        err(() => {
            expect(now).to.have.length.of.at.most(2, "blah");
        }, `blah: expected ${nowUTC} to have property 'length'`);

        err(() => {
            expect("foo", "blah").to.have.length.of.at.most(now);
        }, "blah: the argument to most must be a number");

        err(() => {
            expect([1, 2, 3]).to.not.have.length.of.at.most(now, "blah");
        }, "blah: the argument to most must be a number");

        err(() => {
            expect(null).to.be.at.most(now, "blah");
        }, "blah: expected null to be a number or a date");

        err(() => {
            expect(now, "blah").to.be.at.most(null);
        }, "blah: the argument to most must be a date");

        err(() => {
            expect(1).to.be.at.most(now, "blah");
        }, "blah: the argument to most must be a number");

        err(() => {
            expect(now, "blah").to.be.at.most(1);
        }, "blah: the argument to most must be a date");

        err(() => {
            expect(now).to.not.be.at.most(undefined, "blah");
        }, "blah: the argument to most must be a date");
    });

    it("match(regexp)", () => {
        expect("foobar").to.match(/^foo/);
        expect("foobar").to.matches(/^foo/);
        expect("foobar").to.not.match(/^bar/);

        err(() => {
            expect("foobar").to.match(/^bar/i, "blah");
        }, "blah: expected 'foobar' to match /^bar/i");

        err(() => {
            expect("foobar", "blah").to.match(/^bar/i);
        }, "blah: expected 'foobar' to match /^bar/i");

        err(() => {
            expect("foobar").to.matches(/^bar/i, "blah");
        }, "blah: expected 'foobar' to match /^bar/i");

        err(() => {
            expect("foobar").to.not.match(/^foo/i, "blah");
        }, "blah: expected 'foobar' not to match /^foo/i");
    });

    it("lengthOf(n)", () => {
        expect("test").to.have.length(4);
        expect("test").to.have.lengthOf(4);
        expect("test").to.not.have.length(3);
        expect("test").to.not.have.lengthOf(3);
        expect([1, 2, 3]).to.have.length(3);
        expect([1, 2, 3]).to.have.lengthOf(3);

        err(() => {
            expect(4).to.have.length(3, "blah");
        }, "blah: expected 4 to have property 'length'");

        err(() => {
            expect(4, "blah").to.have.length(3);
        }, "blah: expected 4 to have property 'length'");

        err(() => {
            expect(4).to.have.lengthOf(3, "blah");
        }, "blah: expected 4 to have property 'length'");

        err(() => {
            expect("asd").to.not.have.length(3, "blah");
        }, "blah: expected 'asd' to not have a length of 3");

        err(() => {
            expect("asd").to.not.have.lengthOf(3, "blah");
        }, "blah: expected 'asd' to not have a length of 3");

        if (is.function(Map)) {
            expect(new Map()).to.have.length(0);
            expect(new Map()).to.have.lengthOf(0);

            const map = new Map();
            map.set("a", 1);
            map.set("b", 2);
            map.set("c", 3);

            expect(map).to.have.length(3);
            expect(map).to.have.lengthOf(3);

            err(() => {
                expect(map).to.not.have.length(3, "blah");
            }, "blah: expected {} to not have a size of 3");

            err(() => {
                expect(map).to.not.have.lengthOf(3, "blah");
            }, "blah: expected {} to not have a size of 3");
        }

        if (is.function(Set)) {
            expect(new Set()).to.have.length(0);
            expect(new Set()).to.have.lengthOf(0);

            const set = new Set();
            set.add(1);
            set.add(2);
            set.add(3);

            expect(set).to.have.length(3);
            expect(set).to.have.lengthOf(3);

            err(() => {
                expect(set).to.not.have.length(3, "blah");
            }, "blah: expected {} to not have a size of 3");

            err(() => {
                expect(set).to.not.have.lengthOf(3, "blah");
            }, "blah: expected {} to not have a size of 3");
        }
    });

    it("eql(val)", () => {
        expect("test").to.eql("test");
        expect({ foo: "bar" }).to.eql({ foo: "bar" });
        expect(1).to.eql(1);
        expect("4").to.not.eql(4);

        if (is.function(Symbol)) {
            const sym = Symbol();
            expect(sym).to.eql(sym);
        }

        err(() => {
            expect(4).to.eql(3, "blah");
        }, "blah: expected 4 to deeply equal 3");
    });

    if (!is.undefined(Buffer)) {
        it("Buffer eql()", () => {
            expect(new Buffer([1])).to.eql(new Buffer([1]));

            err(() => {
                expect(new Buffer([0])).to.eql(new Buffer([1]));
            }, "expected <Buffer 00> to deeply equal <Buffer 01>");
        });
    }

    it("equal(val)", () => {
        expect("test").to.equal("test");
        expect(1).to.equal(1);

        if (is.function(Symbol)) {
            const sym = Symbol();
            expect(sym).to.equal(sym);
        }

        err(() => {
            expect(4).to.equal(3, "blah");
        }, "blah: expected 4 to equal 3");

        err(() => {
            expect(4, "blah").to.equal(3);
        }, "blah: expected 4 to equal 3");

        err(() => {
            expect("4").to.equal(4, "blah");
        }, "blah: expected '4' to equal 4");
    });

    it("deep.equal(val)", () => {
        expect({ foo: "bar" }).to.deep.equal({ foo: "bar" });
        expect({ foo: "bar" }).not.to.deep.equal({ foo: "baz" });

        err(() => {
            expect({ foo: "bar" }).to.deep.equal({ foo: "baz" }, "blah");
        }, "blah: expected { foo: 'bar' } to deeply equal { foo: 'baz' }");

        err(() => {
            expect({ foo: "bar" }, "blah").to.deep.equal({ foo: "baz" });
        }, "blah: expected { foo: 'bar' } to deeply equal { foo: 'baz' }");

        err(() => {
            expect({ foo: "bar" }).to.not.deep.equal({ foo: "bar" }, "blah");
        }, "blah: expected { foo: 'bar' } to not deeply equal { foo: 'bar' }");

        err(() => {
            expect({ foo: "bar" }, "blah").to.not.deep.equal({ foo: "bar" });
        }, "blah: expected { foo: 'bar' } to not deeply equal { foo: 'bar' }");
    });

    it("deep.equal(/regexp/)", () => {
        expect(/a/).to.deep.equal(/a/);
        expect(/a/).not.to.deep.equal(/b/);
        expect(/a/).not.to.deep.equal({});
        expect(/a/g).to.deep.equal(/a/g);
        expect(/a/g).not.to.deep.equal(/b/g);
        expect(/a/i).to.deep.equal(/a/i);
        expect(/a/i).not.to.deep.equal(/b/i);
        expect(/a/m).to.deep.equal(/a/m);
        expect(/a/m).not.to.deep.equal(/b/m);
    });

    it("deep.equal(Date)", () => {
        const a = new Date(1, 2, 3);
        const b = new Date(4, 5, 6);
        expect(a).to.deep.equal(a);
        expect(a).not.to.deep.equal(b);
        expect(a).not.to.deep.equal({});
    });

    it("empty", () => {
        function FakeArgs() { }
        FakeArgs.prototype.length = 0;

        expect("").to.be.empty;
        expect("foo").not.to.be.empty;
        expect([]).to.be.empty;
        expect(["foo"]).not.to.be.empty;
        expect(new FakeArgs()).to.be.empty;
        expect({ arguments: 0 }).not.to.be.empty;
        expect({}).to.be.empty;
        expect({ foo: "bar" }).not.to.be.empty;

        if (is.function(WeakMap)) {
            err(() => {
                expect(new WeakMap(), "blah").not.to.be.empty;
            }, "blah: .empty was passed a weak collection");
        }

        if (is.function(WeakSet)) {
            err(() => {
                expect(new WeakSet(), "blah").not.to.be.empty;
            }, "blah: .empty was passed a weak collection");
        }

        if (is.function(Map)) {
            expect(new Map()).to.be.empty;

            // Not using Map constructor args because not supported in IE 11.
            let map = new Map();
            map.set("a", 1);
            expect(map).not.to.be.empty;

            err(() => {
                expect(new Map()).not.to.be.empty;
            }, "expected {} not to be empty");

            map = new Map();
            map.key = "val";
            expect(map).to.be.empty;

            err(() => {
                expect(map).not.to.be.empty;
            }, "expected { key: 'val' } not to be empty");
        }

        if (is.function(Set)) {
            expect(new Set()).to.be.empty;

            // Not using Set constructor args because not supported in IE 11.
            let set = new Set();
            set.add(1);
            expect(set).not.to.be.empty;

            err(() => {
                expect(new Set()).not.to.be.empty;
            }, "expected {} not to be empty");

            set = new Set();
            set.key = "val";
            expect(set).to.be.empty;

            err(() => {
                expect(set).not.to.be.empty;
            }, "expected { key: 'val' } not to be empty");
        }

        err(() => {
            expect("", "blah").not.to.be.empty;
        }, "blah: expected \'\' not to be empty");

        err(() => {
            expect("foo").to.be.empty;
        }, "expected \'foo\' to be empty");

        err(() => {
            expect([]).not.to.be.empty;
        }, "expected [] not to be empty");

        err(() => {
            expect(["foo"]).to.be.empty;
        }, "expected [ \'foo\' ] to be empty");

        err(() => {
            expect(new FakeArgs()).not.to.be.empty;
        }, "expected { length: 0 } not to be empty");

        err(() => {
            expect({ arguments: 0 }).to.be.empty;
        }, "expected { arguments: 0 } to be empty");

        err(() => {
            expect({}).not.to.be.empty;
        }, "expected {} not to be empty");

        err(() => {
            expect({ foo: "bar" }).to.be.empty;
        }, "expected { foo: \'bar\' } to be empty");

        err(() => {
            expect(null, "blah").to.be.empty;
        }, "blah: .empty was passed non-string primitive null");

        err(() => {
            expect(undefined).to.be.empty;
        }, ".empty was passed non-string primitive undefined");

        err(() => {
            expect().to.be.empty;
        }, ".empty was passed non-string primitive undefined");

        err(() => {
            expect(null).to.not.be.empty;
        }, ".empty was passed non-string primitive null");

        err(() => {
            expect(undefined).to.not.be.empty;
        }, ".empty was passed non-string primitive undefined");

        err(() => {
            expect().to.not.be.empty;
        }, ".empty was passed non-string primitive undefined");

        err(() => {
            expect(0).to.be.empty;
        }, ".empty was passed non-string primitive 0");

        err(() => {
            expect(1).to.be.empty;
        }, ".empty was passed non-string primitive 1");

        err(() => {
            expect(true).to.be.empty;
        }, ".empty was passed non-string primitive true");

        err(() => {
            expect(false).to.be.empty;
        }, ".empty was passed non-string primitive false");

        if (!is.undefined(Symbol)) {
            err(() => {
                expect(Symbol()).to.be.empty;
            }, ".empty was passed non-string primitive Symbol()");

            err(() => {
                expect(Symbol.iterator).to.be.empty;
            }, ".empty was passed non-string primitive Symbol(Symbol.iterator)");
        }

        err(() => {
            expect(() => { }, "blah").to.be.empty;
        }, "blah: .empty was passed a function");

        if (FakeArgs.name === "FakeArgs") {
            err(() => {
                expect(FakeArgs).to.be.empty;
            }, ".empty was passed a function FakeArgs");
        }
    });

    it("NaN", () => {
        expect(NaN).to.be.NaN;

        expect(undefined).not.to.be.NaN;
        expect(Infinity).not.to.be.NaN;
        expect("foo").not.to.be.NaN;
        expect({}).not.to.be.NaN;
        expect(4).not.to.be.NaN;
        expect([]).not.to.be.NaN;

        err(() => {
            expect(NaN, "blah").not.to.be.NaN;
        }, "blah: expected NaN not to be NaN");

        err(() => {
            expect(undefined).to.be.NaN;
        }, "expected undefined to be NaN");

        err(() => {
            expect(Infinity).to.be.NaN;
        }, "expected Infinity to be NaN");

        err(() => {
            expect("foo").to.be.NaN;
        }, "expected 'foo' to be NaN");

        err(() => {
            expect({}).to.be.NaN;
        }, "expected {} to be NaN");

        err(() => {
            expect(4).to.be.NaN;
        }, "expected 4 to be NaN");

        err(() => {
            expect([]).to.be.NaN;
        }, "expected [] to be NaN");
    });

    it("finite", () => {
        expect(4).to.be.finite;
        expect(-10).to.be.finite;

        err(() => {
            expect(NaN, "blah").to.be.finite;
        }, "blah: expected NaN to be a finite number");

        err(() => {
            expect(Infinity).to.be.finite;
        }, "expected Infinity to be a finite number");

        err(() => {
            expect("foo").to.be.finite;
        }, "expected \'foo\' to be a finite number");

        err(() => {
            expect([]).to.be.finite;
        }, "expected [] to be a finite number");

        err(() => {
            expect({}).to.be.finite;
        }, "expected {} to be a finite number");
    });

    it("property(name)", () => {
        expect("test").to.have.property("length");
        expect({ a: 1 }).to.have.property("toString");
        expect(4).to.not.have.property("length");

        expect({ "foo.bar": "baz" })
            .to.have.property("foo.bar");
        expect({ foo: { bar: "baz" } })
            .to.not.have.property("foo.bar");

        // Properties with the value 'undefined' are still properties
        const obj = { foo: undefined };
        Object.defineProperty(obj, "bar", {
            get() { }
        });
        expect(obj).to.have.property("foo");
        expect(obj).to.have.property("bar");

        expect({ "foo.bar[]": "baz" })
            .to.have.property("foo.bar[]");

        err(() => {
            expect("asd").to.have.property("foo");
        }, "expected 'asd' to have property 'foo'");

        err(() => {
            expect("asd", "blah").to.have.property("foo");
        }, "blah: expected 'asd' to have property 'foo'");

        err(() => {
            expect({ foo: { bar: "baz" } })
                .to.have.property("foo.bar");
        }, "expected { foo: { bar: 'baz' } } to have property 'foo.bar'");

        err(() => {
            expect({ a: { b: 1 } }).to.have.own.nested.property("a.b");
        }, "The \"nested\" and \"own\" flags cannot be combined.");

        err(() => {
            expect({ a: { b: 1 } }, "blah").to.have.own.nested.property("a.b");
        }, "blah: The \"nested\" and \"own\" flags cannot be combined.");

        err(() => {
            expect(null, "blah").to.have.property("a");
        }, "blah: Target cannot be null or undefined.");

        err(() => {
            expect(undefined, "blah").to.have.property("a");
        }, "blah: Target cannot be null or undefined.");

        err(() => {
            expect({ a: 1 }, "blah").to.have.property(null);
        }, "blah: the argument to property must be a string, number, or symbol");
    });

    it("property(name, val)", () => {
        expect("test").to.have.property("length", 4);
        expect("asd").to.have.property("constructor", String);
        expect({ a: 1 }).to.have.property("toString", Object.prototype.toString);
        expect("test").to.not.have.property("length", 3);
        expect("test").to.not.have.property("foo", 4);
        expect({ a: { b: 1 } }).to.not.have.property("a", { b: 1 });

        const deepObj = {
            green: { tea: "matcha" },
            teas: ["chai", "matcha", { tea: "konacha" }]
        };
        expect(deepObj).to.have.nested.property("green.tea", "matcha");
        expect(deepObj).to.have.nested.property("teas[1]", "matcha");
        expect(deepObj).to.have.nested.property("teas[2].tea", "konacha");

        expect(deepObj).to.have.property("teas")
            .that.is.an("array")
            .with.nested.property("[2]")
            .that.deep.equals({ tea: "konacha" });

        err(() => {
            expect(deepObj).to.have.nested.property("teas[3]");
        }, "expected { Object (green, teas) } to have nested property 'teas[3]'");
        err(() => {
            expect(deepObj).to.have.nested.property("teas[3]", "bar");
        }, "expected { Object (green, teas) } to have nested property 'teas[3]'");
        err(() => {
            expect(deepObj).to.have.nested.property("teas[3].tea", "bar");
        }, "expected { Object (green, teas) } to have nested property 'teas[3].tea'");

        const arr = [
            ["chai", "matcha", "konacha"],
            [{ tea: "chai" },
            { tea: "matcha" },
            { tea: "konacha" }]
        ];
        expect(arr).to.have.nested.property("[0][1]", "matcha");
        expect(arr).to.have.nested.property("[1][2].tea", "konacha");
        err(() => {
            expect(arr).to.have.nested.property("[2][1]");
        }, "expected [ Array(2) ] to have nested property '[2][1]'");
        err(() => {
            expect(arr).to.have.nested.property("[2][1]", "none");
        }, "expected [ Array(2) ] to have nested property '[2][1]'");
        err(() => {
            expect(arr).to.have.nested.property("[0][3]", "none");
        }, "expected [ Array(2) ] to have nested property '[0][3]'");

        err(() => {
            expect("asd").to.have.property("length", 4, "blah");
        }, "blah: expected 'asd' to have property 'length' of 4, but got 3");

        err(() => {
            expect("asd", "blah").to.have.property("length", 4);
        }, "blah: expected 'asd' to have property 'length' of 4, but got 3");

        err(() => {
            expect("asd").to.not.have.property("length", 3, "blah");
        }, "blah: expected 'asd' to not have property 'length' of 3");

        err(() => {
            expect("asd").to.have.property("constructor", Number, "blah");
        }, "blah: expected 'asd' to have property 'constructor' of [Function: Number], but got [Function: String]");

        err(() => {
            expect({ a: { b: 1 } }).to.have.own.nested.property("a.b", 1, "blah");
        }, "blah: The \"nested\" and \"own\" flags cannot be combined.");

        err(() => {
            expect({ a: { b: 1 } }, "blah").to.have.own.nested.property("a.b", 1);
        }, "blah: The \"nested\" and \"own\" flags cannot be combined.");
    });

    it("deep.property(name, val)", () => {
        const obj = { a: { b: 1 } };
        expect(obj).to.have.deep.property("a", { b: 1 });
        expect(obj).to.not.have.deep.property("a", { b: 7 });
        expect(obj).to.not.have.deep.property("a", { z: 1 });
        expect(obj).to.not.have.deep.property("z", { b: 1 });

        err(() => {
            expect(obj).to.have.deep.property("a", { b: 7 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep property 'a' of { b: 7 }, but got { b: 1 }");

        err(() => {
            expect(obj).to.have.deep.property("z", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep property 'z'");

        err(() => {
            expect(obj).to.not.have.deep.property("a", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to not have deep property 'a' of { b: 1 }");
    });

    it("own.property(name)", () => {
        expect("test").to.have.own.property("length");
        expect("test").to.have.ownProperty("length");
        expect("test").to.haveOwnProperty("length");
        expect("test").to.not.have.own.property("iDontExist");
        expect("test").to.not.have.ownProperty("iDontExist");
        expect("test").to.not.haveOwnProperty("iDontExist");
        expect({ a: 1 }).to.not.have.own.property("toString");
        expect({ a: 1 }).to.not.have.ownProperty("toString");
        expect({ a: 1 }).to.not.haveOwnProperty("toString");

        expect({ length: 12 }).to.have.own.property("length");
        expect({ length: 12 }).to.have.ownProperty("length");
        expect({ length: 12 }).to.haveOwnProperty("length");
        expect({ length: 12 }).to.not.have.own.property("iDontExist");
        expect({ length: 12 }).to.not.have.ownProperty("iDontExist");
        expect({ length: 12 }).to.not.haveOwnProperty("iDontExist");

        // Chaining property's value
        expect("test").to.have.own.property("length").that.is.a("number");
        expect("test").to.have.ownProperty("length").that.is.a("number");
        expect("test").to.haveOwnProperty("length").that.is.a("number");

        err(() => {
            expect({ length: 12 }, "blah").to.have.own.property("iDontExist");
        }, "blah: expected { length: 12 } to have own property 'iDontExist'");

        err(() => {
            expect({ length: 12 }).to.not.have.own.property("length");
        }, "expected { length: 12 } to not have own property 'length'");

        err(() => {
            expect({ length: 12 }, "blah").to.have.ownProperty("iDontExist");
        }, "blah: expected { length: 12 } to have own property 'iDontExist'");

        err(() => {
            expect({ length: 12 }).to.not.have.ownProperty("length");
        }, "expected { length: 12 } to not have own property 'length'");

        err(() => {
            expect({ length: 12 }, "blah").to.haveOwnProperty("iDontExist");
        }, "blah: expected { length: 12 } to have own property 'iDontExist'");

        err(() => {
            expect({ length: 12 }).to.not.haveOwnProperty("length");
        }, "expected { length: 12 } to not have own property 'length'");
    });

    it("own.property(name, value)", () => {
        expect("test").to.have.own.property("length", 4);
        expect("test").to.have.ownProperty("length", 4);
        expect("test").to.haveOwnProperty("length", 4);
        expect("test").to.not.have.own.property("length", 1337);
        expect("test").to.not.have.ownProperty("length", 1337);
        expect("test").to.not.haveOwnProperty("length", 1337);
        expect({ a: 1 }).to.not.have.own.property("toString", Object.prototype.toString);
        expect({ a: 1 }).to.not.have.ownProperty("toString", Object.prototype.toString);
        expect({ a: 1 }).to.not.haveOwnProperty("toString", Object.prototype.toString);
        expect({ a: { b: 1 } }).to.not.have.own.property("a", { b: 1 });
        expect({ a: { b: 1 } }).to.not.have.ownProperty("a", { b: 1 });
        expect({ a: { b: 1 } }).to.not.haveOwnProperty("a", { b: 1 });

        expect({ length: 12 }).to.have.own.property("length", 12);
        expect({ length: 12 }).to.have.ownProperty("length", 12);
        expect({ length: 12 }).to.haveOwnProperty("length", 12);
        expect({ length: 12 }).to.not.have.own.property("length", 15);
        expect({ length: 12 }).to.not.have.ownProperty("length", 15);
        expect({ length: 12 }).to.not.haveOwnProperty("length", 15);

        // Chaining property's value
        expect("test").to.have.own.property("length", 4).that.is.a("number");
        expect("test").to.have.ownProperty("length", 4).that.is.a("number");
        expect("test").to.haveOwnProperty("length", 4).that.is.a("number");

        const objNoProto = Object.create(null);
        objNoProto.a = "a";
        expect(objNoProto).to.have.own.property("a");
        expect(objNoProto).to.have.ownProperty("a");
        expect(objNoProto).to.haveOwnProperty("a");

        err(() => {
            expect({ length: 12 }).to.have.own.property("iDontExist", 12, "blah");
        }, "blah: expected { length: 12 } to have own property 'iDontExist'");

        err(() => {
            expect({ length: 12 }, "blah").to.have.own.property("iDontExist", 12);
        }, "blah: expected { length: 12 } to have own property 'iDontExist'");

        err(() => {
            expect({ length: 12 }).to.not.have.own.property("length", 12);
        }, "expected { length: 12 } to not have own property 'length' of 12");

        err(() => {
            expect({ length: 12 }).to.have.own.property("length", 15);
        }, "expected { length: 12 } to have own property 'length' of 15, but got 12");

        err(() => {
            expect({ length: 12 }).to.have.ownProperty("iDontExist", 12, "blah");
        }, "blah: expected { length: 12 } to have own property 'iDontExist'");

        err(() => {
            expect({ length: 12 }, "blah").to.have.ownProperty("iDontExist", 12);
        }, "blah: expected { length: 12 } to have own property 'iDontExist'");

        err(() => {
            expect({ length: 12 }).to.not.have.ownProperty("length", 12);
        }, "expected { length: 12 } to not have own property 'length' of 12");

        err(() => {
            expect({ length: 12 }).to.have.ownProperty("length", 15);
        }, "expected { length: 12 } to have own property 'length' of 15, but got 12");

        err(() => {
            expect({ length: 12 }).to.haveOwnProperty("iDontExist", 12, "blah");
        }, "blah: expected { length: 12 } to have own property 'iDontExist'");

        err(() => {
            expect({ length: 12 }, "blah").to.haveOwnProperty("iDontExist", 12);
        }, "blah: expected { length: 12 } to have own property 'iDontExist'");

        err(() => {
            expect({ length: 12 }).to.not.haveOwnProperty("length", 12);
        }, "expected { length: 12 } to not have own property 'length' of 12");

        err(() => {
            expect({ length: 12 }).to.haveOwnProperty("length", 15);
        }, "expected { length: 12 } to have own property 'length' of 15, but got 12");
    });

    it("deep.own.property(name, val)", () => {
        const obj = { a: { b: 1 } };
        expect(obj).to.have.deep.own.property("a", { b: 1 });
        expect(obj).to.have.deep.ownProperty("a", { b: 1 });
        expect(obj).to.deep.haveOwnProperty("a", { b: 1 });
        expect(obj).to.not.have.deep.own.property("a", { z: 1 });
        expect(obj).to.not.have.deep.ownProperty("a", { z: 1 });
        expect(obj).to.not.deep.haveOwnProperty("a", { z: 1 });
        expect(obj).to.not.have.deep.own.property("a", { b: 7 });
        expect(obj).to.not.have.deep.ownProperty("a", { b: 7 });
        expect(obj).to.not.deep.haveOwnProperty("a", { b: 7 });
        expect(obj).to.not.have.deep.own.property("toString", Object.prototype.toString);
        expect(obj).to.not.have.deep.ownProperty("toString", Object.prototype.toString);
        expect(obj).to.not.deep.haveOwnProperty("toString", Object.prototype.toString);

        err(() => {
            expect(obj).to.have.deep.own.property("a", { z: 7 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep own property 'a' of { z: 7 }, but got { b: 1 }");

        err(() => {
            expect(obj).to.have.deep.own.property("z", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep own property 'z'");

        err(() => {
            expect(obj).to.not.have.deep.own.property("a", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to not have deep own property 'a' of { b: 1 }");

        err(() => {
            expect(obj).to.have.deep.ownProperty("a", { z: 7 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep own property 'a' of { z: 7 }, but got { b: 1 }");

        err(() => {
            expect(obj).to.have.deep.ownProperty("z", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep own property 'z'");

        err(() => {
            expect(obj).to.not.have.deep.ownProperty("a", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to not have deep own property 'a' of { b: 1 }");

        err(() => {
            expect(obj).to.deep.haveOwnProperty("a", { z: 7 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep own property 'a' of { z: 7 }, but got { b: 1 }");

        err(() => {
            expect(obj).to.deep.haveOwnProperty("z", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to have deep own property 'z'");

        err(() => {
            expect(obj).to.not.deep.haveOwnProperty("a", { b: 1 }, "blah");
        }, "blah: expected { a: { b: 1 } } to not have deep own property 'a' of { b: 1 }");
    });

    it("nested.property(name)", () => {
        expect({ "foo.bar": "baz" })
            .to.not.have.nested.property("foo.bar");
        expect({ foo: { bar: "baz" } })
            .to.have.nested.property("foo.bar");

        expect({ foo: [1, 2, 3] })
            .to.have.nested.property("foo[1]");

        expect({ "foo.bar[]": "baz" })
            .to.have.nested.property("foo\\.bar\\[\\]");

        err(() => {
            expect({ "foo.bar": "baz" })
                .to.have.nested.property("foo.bar");
        }, "expected { 'foo.bar': 'baz' } to have nested property 'foo.bar'");

        err(() => {
            expect({ a: 1 }, "blah").to.have.nested.property({ a: "1" });
        }, "blah: the argument to property must be a string when using nested syntax");
    });

    it("nested.property(name, val)", () => {
        expect({ foo: { bar: "baz" } })
            .to.have.nested.property("foo.bar", "baz");
        expect({ foo: { bar: "baz" } })
            .to.not.have.nested.property("foo.bar", "quux");
        expect({ foo: { bar: "baz" } })
            .to.not.have.nested.property("foo.quux", "baz");
        expect({ a: { b: { c: 1 } } }).to.not.have.nested.property("a.b", { c: 1 });

        err(() => {
            expect({ foo: { bar: "baz" } })
                .to.have.nested.property("foo.bar", "quux", "blah");
        }, "blah: expected { foo: { bar: 'baz' } } to have nested property 'foo.bar' of 'quux', but got 'baz'");
        err(() => {
            expect({ foo: { bar: "baz" } })
                .to.not.have.nested.property("foo.bar", "baz", "blah");
        }, "blah: expected { foo: { bar: 'baz' } } to not have nested property 'foo.bar' of 'baz'");
    });

    it("deep.nested.property(name, val)", () => {
        const obj = { a: { b: { c: 1 } } };
        expect(obj).to.have.deep.nested.property("a.b", { c: 1 });
        expect(obj).to.not.have.deep.nested.property("a.b", { c: 7 });
        expect(obj).to.not.have.deep.nested.property("a.b", { z: 1 });
        expect(obj).to.not.have.deep.nested.property("a.z", { c: 1 });

        err(() => {
            expect(obj).to.have.deep.nested.property("a.b", { c: 7 }, "blah");
        }, "blah: expected { a: { b: { c: 1 } } } to have deep nested property 'a.b' of { c: 7 }, but got { c: 1 }");

        err(() => {
            expect(obj).to.have.deep.nested.property("a.z", { c: 1 }, "blah");
        }, "blah: expected { a: { b: { c: 1 } } } to have deep nested property 'a.z'");

        err(() => {
            expect(obj).to.not.have.deep.nested.property("a.b", { c: 1 }, "blah");
        }, "blah: expected { a: { b: { c: 1 } } } to not have deep nested property 'a.b' of { c: 1 }");
    });

    it("ownPropertyDescriptor(name)", () => {
        expect("test").to.have.ownPropertyDescriptor("length");
        expect("test").to.haveOwnPropertyDescriptor("length");
        expect("test").not.to.have.ownPropertyDescriptor("foo");

        const obj = {};
        const descriptor = {
            configurable: false,
            enumerable: true,
            writable: true,
            value: NaN
        };
        Object.defineProperty(obj, "test", descriptor);
        expect(obj).to.have.ownPropertyDescriptor("test", descriptor);

        err(() => {
            expect(obj).not.to.have.ownPropertyDescriptor("test", descriptor, "blah");
        }, /^blah: expected the own property descriptor for 'test' on \{ test: NaN \} to not match \{ [^\}]+ \}$/);

        err(() => {
            expect(obj, "blah").not.to.have.ownPropertyDescriptor("test", descriptor);
        }, /^blah: expected the own property descriptor for 'test' on \{ test: NaN \} to not match \{ [^\}]+ \}$/);

        err(() => {
            const wrongDescriptor = {
                configurable: false,
                enumerable: true,
                writable: false,
                value: NaN
            };
            expect(obj).to.have.ownPropertyDescriptor("test", wrongDescriptor, "blah");
        }, /^blah: expected the own property descriptor for 'test' on \{ test: NaN \} to match \{ [^\}]+ \}, got \{ [^\}]+ \}$/);

        err(() => {
            expect(obj).to.have.ownPropertyDescriptor("test2", "blah");
        }, "blah: expected { test: NaN } to have an own property descriptor for 'test2'");

        err(() => {
            expect(obj, "blah").to.have.ownPropertyDescriptor("test2");
        }, "blah: expected { test: NaN } to have an own property descriptor for 'test2'");

        expect(obj).to.have.ownPropertyDescriptor("test").and.have.property("enumerable", true);
    });

    it("string()", () => {
        expect("foobar").to.have.string("bar");
        expect("foobar").to.have.string("foo");
        expect("foobar").to.not.have.string("baz");

        err(() => {
            expect(3).to.have.string("baz", "blah");
        }, "blah: expected 3 to be a string");

        err(() => {
            expect(3, "blah").to.have.string("baz");
        }, "blah: expected 3 to be a string");

        err(() => {
            expect("foobar").to.have.string("baz", "blah");
        }, "blah: expected 'foobar' to contain 'baz'");

        err(() => {
            expect("foobar", "blah").to.have.string("baz");
        }, "blah: expected 'foobar' to contain 'baz'");

        err(() => {
            expect("foobar").to.not.have.string("bar", "blah");
        }, "blah: expected 'foobar' to not contain 'bar'");
    });

    it("include()", () => {
        expect(["foo", "bar"]).to.include("foo");
        expect(["foo", "bar"]).to.include("foo");
        expect(["foo", "bar"]).to.include("bar");
        expect([1, 2]).to.include(1);
        expect(["foo", "bar"]).to.not.include("baz");
        expect(["foo", "bar"]).to.not.include(1);

        expect({ a: 1 }).to.include({ toString: Object.prototype.toString });

        // .include should work with Error objects and objects with a custom
        // `@@toStringTag`.
        expect(new Error("foo")).to.include({ message: "foo" });
        if (!is.undefined(Symbol)
            && !is.undefined(Symbol.toStringTag)) {
            const customObj = { a: 1 };
            customObj[Symbol.toStringTag] = "foo";

            expect(customObj).to.include({ a: 1 });
        }

        const obj1 = { a: 1 };
        const obj2 = { b: 2 };
        expect([obj1, obj2]).to.include(obj1);
        expect([obj1, obj2]).to.not.include({ a: 1 });
        expect({ foo: obj1, bar: obj2 }).to.include({ foo: obj1 });
        expect({ foo: obj1, bar: obj2 }).to.include({ foo: obj1, bar: obj2 });
        expect({ foo: obj1, bar: obj2 }).to.not.include({ foo: { a: 1 } });
        expect({ foo: obj1, bar: obj2 }).to.not.include({ foo: obj1, bar: { b: 2 } });

        if (is.function(Map)) {
            const map = new Map();
            var val = [{ a: 1 }];
            map.set("a", val);
            map.set("b", 2);
            map.set("c", -0);
            map.set("d", NaN);

            expect(map).to.include(val);
            expect(map).to.not.include([{ a: 1 }]);
            expect(map).to.include(2);
            expect(map).to.not.include(3);
            expect(map).to.include(0);
            expect(map).to.include(NaN);
        }

        if (is.function(Set)) {
            const set = new Set();
            var val = [{ a: 1 }];
            set.add(val);
            set.add(2);
            set.add(-0);
            set.add(NaN);

            expect(set).to.include(val);
            expect(set).to.not.include([{ a: 1 }]);
            expect(set).to.include(2);
            expect(set).to.not.include(3);
            if (set.has(0)) {
                // This test is skipped in IE11 because (contrary to spec) IE11 uses
                // SameValue instead of SameValueZero equality for sets.
                expect(set).to.include(0);
            }
            expect(set).to.include(NaN);
        }

        if (is.function(WeakSet)) {
            const ws = new WeakSet();
            var val = [{ a: 1 }];
            ws.add(val);

            expect(ws).to.include(val);
            expect(ws).to.not.include([{ a: 1 }]);
            expect(ws).to.not.include({});
        }

        if (is.function(Symbol)) {
            const sym1 = Symbol();
            const sym2 = Symbol();
            const sym3 = Symbol();
            expect([sym1, sym2]).to.include(sym1);
            expect([sym1, sym2]).to.not.include(sym3);
        }

        err(() => {
            expect(["foo"]).to.include("bar", "blah");
        }, "blah: expected [ 'foo' ] to include 'bar'");

        err(() => {
            expect(["foo"], "blah").to.include("bar");
        }, "blah: expected [ 'foo' ] to include 'bar'");

        err(() => {
            expect(["bar", "foo"]).to.not.include("foo", "blah");
        }, "blah: expected [ 'bar', 'foo' ] to not include 'foo'");

        err(() => {
            expect({ a: 1 }).to.include({ b: 2 }, "blah");
        }, "blah: expected { a: 1 } to have property 'b'");

        err(() => {
            expect({ a: 1 }, "blah").to.include({ b: 2 });
        }, "blah: expected { a: 1 } to have property 'b'");

        err(() => {
            expect({ a: 1, b: 2 }).to.not.include({ b: 2 });
        }, "expected { a: 1, b: 2 } to not have property 'b' of 2");

        err(() => {
            expect([{ a: 1 }, { b: 2 }]).to.include({ a: 1 });
        }, "expected [ { a: 1 }, { b: 2 } ] to include { a: 1 }");

        err(() => {
            const obj1 = { a: 1 };
            const obj2 = { b: 2 };
            expect([obj1, obj2]).to.not.include(obj1);
        }, "expected [ { a: 1 }, { b: 2 } ] to not include { a: 1 }");

        err(() => {
            expect({ foo: { a: 1 }, bar: { b: 2 } }).to.include({ foo: { a: 1 } });
        }, "expected { foo: { a: 1 }, bar: { b: 2 } } to have property 'foo' of { a: 1 }, but got { a: 1 }");

        err(() => {
            const obj1 = { a: 1 };
            const obj2 = { b: 2 };
            expect({ foo: obj1, bar: obj2 }).to.not.include({ foo: obj1, bar: obj2 });
        }, "expected { foo: { a: 1 }, bar: { b: 2 } } to not have property 'foo' of { a: 1 }");

        err(() => {
            expect(true).to.include(true, "blah");
        }, "blah: object tested must be an array, a map, an object, a set, a string, or a weakset, but boolean given");

        err(() => {
            expect(true, "blah").to.include(true);
        }, "blah: object tested must be an array, a map, an object, a set, a string, or a weakset, but boolean given");

        err(() => {
            expect(42.0).to.include(42);
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but number given");

        err(() => {
            expect(null).to.include(42);
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but null given");

        err(() => {
            expect(undefined).to.include(42);
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but undefined given");

        err(() => {
            expect(true).to.not.include(true);
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but boolean given");

        err(() => {
            expect(42.0).to.not.include(42);
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but number given");

        err(() => {
            expect(null).to.not.include(42);
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but null given");

        err(() => {
            expect(undefined).to.not.include(42);
        }, "object tested must be an array, a map, an object, a set, a string, or a weakset, but undefined given");
    });

    it("deep.include()", () => {
        const obj1 = { a: 1 };
        const obj2 = { b: 2 };
        expect([obj1, obj2]).to.deep.include({ a: 1 });
        expect([obj1, obj2]).to.not.deep.include({ a: 9 });
        expect([obj1, obj2]).to.not.deep.include({ z: 1 });
        expect({ foo: obj1, bar: obj2 }).to.deep.include({ foo: { a: 1 } });
        expect({ foo: obj1, bar: obj2 }).to.deep.include({ foo: { a: 1 }, bar: { b: 2 } });
        expect({ foo: obj1, bar: obj2 }).to.not.deep.include({ foo: { a: 9 } });
        expect({ foo: obj1, bar: obj2 }).to.not.deep.include({ foo: { z: 1 } });
        expect({ foo: obj1, bar: obj2 }).to.not.deep.include({ baz: { a: 1 } });
        expect({ foo: obj1, bar: obj2 }).to.not.deep.include({ foo: { a: 1 }, bar: { b: 9 } });

        if (is.function(Map)) {
            const map = new Map();
            map.set(1, [{ a: 1 }]);

            expect(map).to.deep.include([{ a: 1 }]);
        }

        if (is.function(Set)) {
            const set = new Set();
            set.add([{ a: 1 }]);

            expect(set).to.deep.include([{ a: 1 }]);
        }

        if (is.function(WeakSet)) {
            err(() => {
                expect(new WeakSet()).to.deep.include({}, "foo");
            }, "foo: unable to use .deep.include with WeakSet");
        }

        err(() => {
            expect([obj1, obj2]).to.deep.include({ a: 9 }, "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 } ] to deep include { a: 9 }");

        err(() => {
            expect([obj1, obj2], "blah").to.deep.include({ a: 9 });
        }, "blah: expected [ { a: 1 }, { b: 2 } ] to deep include { a: 9 }");

        err(() => {
            expect([obj1, obj2], "blah").to.not.deep.include({ a: 1 });
        }, "blah: expected [ { a: 1 }, { b: 2 } ] to not deep include { a: 1 }");

        err(() => {
            expect({ foo: obj1, bar: obj2 }).to.deep.include({ foo: { a: 1 }, bar: { b: 9 } });
        }, "expected { foo: { a: 1 }, bar: { b: 2 } } to have deep property 'bar' of { b: 9 }, but got { b: 2 }");

        err(() => {
            expect({ foo: obj1, bar: obj2 }).to.not.deep.include({ foo: { a: 1 }, bar: { b: 2 } }, "blah");
        }, "blah: expected { foo: { a: 1 }, bar: { b: 2 } } to not have deep property 'foo' of { a: 1 }");
    });

    it("nested.include()", () => {
        expect({ a: { b: ["x", "y"] } }).to.nested.include({ "a.b[1]": "y" });
        expect({ a: { b: ["x", "y"] } }).to.not.nested.include({ "a.b[1]": "x" });
        expect({ a: { b: ["x", "y"] } }).to.not.nested.include({ "a.c": "y" });

        expect({ a: { b: [{ x: 1 }] } }).to.not.nested.include({ "a.b[0]": { x: 1 } });

        expect({ ".a": { "[b]": "x" } }).to.nested.include({ "\\.a.\\[b\\]": "x" });
        expect({ ".a": { "[b]": "x" } }).to.not.nested.include({ "\\.a.\\[b\\]": "y" });

        err(() => {
            expect({ a: { b: ["x", "y"] } }).to.nested.include({ "a.b[1]": "x" }, "blah");
        }, "blah: expected { a: { b: [ 'x', 'y' ] } } to have nested property 'a.b[1]' of 'x', but got 'y'");

        err(() => {
            expect({ a: { b: ["x", "y"] } }, "blah").to.nested.include({ "a.b[1]": "x" });
        }, "blah: expected { a: { b: [ 'x', 'y' ] } } to have nested property 'a.b[1]' of 'x', but got 'y'");

        err(() => {
            expect({ a: { b: ["x", "y"] } }).to.nested.include({ "a.c": "y" });
        }, "expected { a: { b: [ 'x', 'y' ] } } to have nested property 'a.c'");

        err(() => {
            expect({ a: { b: ["x", "y"] } }).to.not.nested.include({ "a.b[1]": "y" }, "blah");
        }, "blah: expected { a: { b: [ 'x', 'y' ] } } to not have nested property 'a.b[1]' of 'y'");

        err(() => {
            expect({ a: { b: ["x", "y"] } }, "blah").to.not.nested.include({ "a.b[1]": "y" });
        }, "blah: expected { a: { b: [ 'x', 'y' ] } } to not have nested property 'a.b[1]' of 'y'");
    });

    it("deep.nested.include()", () => {
        expect({ a: { b: [{ x: 1 }] } }).to.deep.nested.include({ "a.b[0]": { x: 1 } });
        expect({ a: { b: [{ x: 1 }] } }).to.not.deep.nested.include({ "a.b[0]": { y: 2 } });
        expect({ a: { b: [{ x: 1 }] } }).to.not.deep.nested.include({ "a.c": { x: 1 } });

        expect({ ".a": { "[b]": { x: 1 } } })
            .to.deep.nested.include({ "\\.a.\\[b\\]": { x: 1 } });
        expect({ ".a": { "[b]": { x: 1 } } })
            .to.not.deep.nested.include({ "\\.a.\\[b\\]": { y: 2 } });

        err(() => {
            expect({ a: { b: [{ x: 1 }] } }).to.deep.nested.include({ "a.b[0]": { y: 2 } }, "blah");
        }, "blah: expected { a: { b: [ [Object] ] } } to have deep nested property 'a.b[0]' of { y: 2 }, but got { x: 1 }");

        err(() => {
            expect({ a: { b: [{ x: 1 }] } }, "blah").to.deep.nested.include({ "a.b[0]": { y: 2 } });
        }, "blah: expected { a: { b: [ [Object] ] } } to have deep nested property 'a.b[0]' of { y: 2 }, but got { x: 1 }");

        err(() => {
            expect({ a: { b: [{ x: 1 }] } }).to.deep.nested.include({ "a.c": { x: 1 } });
        }, "expected { a: { b: [ [Object] ] } } to have deep nested property 'a.c'");

        err(() => {
            expect({ a: { b: [{ x: 1 }] } }).to.not.deep.nested.include({ "a.b[0]": { x: 1 } }, "blah");
        }, "blah: expected { a: { b: [ [Object] ] } } to not have deep nested property 'a.b[0]' of { x: 1 }");

        err(() => {
            expect({ a: { b: [{ x: 1 }] } }, "blah").to.not.deep.nested.include({ "a.b[0]": { x: 1 } });
        }, "blah: expected { a: { b: [ [Object] ] } } to not have deep nested property 'a.b[0]' of { x: 1 }");
    });

    it("own.include()", () => {
        expect({ a: 1 }).to.own.include({ a: 1 });
        expect({ a: 1 }).to.not.own.include({ a: 3 });
        expect({ a: 1 }).to.not.own.include({ toString: Object.prototype.toString });

        expect({ a: { b: 2 } }).to.not.own.include({ a: { b: 2 } });

        err(() => {
            expect({ a: 1 }).to.own.include({ a: 3 }, "blah");
        }, "blah: expected { a: 1 } to have own property 'a' of 3, but got 1");

        err(() => {
            expect({ a: 1 }, "blah").to.own.include({ a: 3 });
        }, "blah: expected { a: 1 } to have own property 'a' of 3, but got 1");

        err(() => {
            expect({ a: 1 }).to.own.include({ toString: Object.prototype.toString });
        }, "expected { a: 1 } to have own property 'toString'");

        err(() => {
            expect({ a: 1 }).to.not.own.include({ a: 1 }, "blah");
        }, "blah: expected { a: 1 } to not have own property 'a' of 1");

        err(() => {
            expect({ a: 1 }, "blah").to.not.own.include({ a: 1 });
        }, "blah: expected { a: 1 } to not have own property 'a' of 1");
    });

    it("deep.own.include()", () => {
        expect({ a: { b: 2 } }).to.deep.own.include({ a: { b: 2 } });
        expect({ a: { b: 2 } }).to.not.deep.own.include({ a: { c: 3 } });
        expect({ a: { b: 2 } })
            .to.not.deep.own.include({ toString: Object.prototype.toString });

        err(() => {
            expect({ a: { b: 2 } }).to.deep.own.include({ a: { c: 3 } }, "blah");
        }, "blah: expected { a: { b: 2 } } to have deep own property 'a' of { c: 3 }, but got { b: 2 }");

        err(() => {
            expect({ a: { b: 2 } }, "blah").to.deep.own.include({ a: { c: 3 } });
        }, "blah: expected { a: { b: 2 } } to have deep own property 'a' of { c: 3 }, but got { b: 2 }");

        err(() => {
            expect({ a: { b: 2 } }).to.deep.own.include({ toString: Object.prototype.toString });
        }, "expected { a: { b: 2 } } to have deep own property 'toString'");

        err(() => {
            expect({ a: { b: 2 } }).to.not.deep.own.include({ a: { b: 2 } }, "blah");
        }, "blah: expected { a: { b: 2 } } to not have deep own property 'a' of { b: 2 }");

        err(() => {
            expect({ a: { b: 2 } }, "blah").to.not.deep.own.include({ a: { b: 2 } });
        }, "blah: expected { a: { b: 2 } } to not have deep own property 'a' of { b: 2 }");
    });

    it("keys(array|Object|arguments)", () => {
        expect({ foo: 1 }).to.have.keys(["foo"]);
        expect({ foo: 1 }).have.keys({ foo: 6 });
        expect({ foo: 1, bar: 2 }).to.have.keys(["foo", "bar"]);
        expect({ foo: 1, bar: 2 }).to.have.keys("foo", "bar");
        expect({ foo: 1, bar: 2 }).have.keys({ foo: 6, bar: 7 });
        expect({ foo: 1, bar: 2, baz: 3 }).to.contain.keys("foo", "bar");
        expect({ foo: 1, bar: 2, baz: 3 }).to.contain.keys("bar", "foo");
        expect({ foo: 1, bar: 2, baz: 3 }).to.contain.keys("baz");
        expect({ foo: 1, bar: 2 }).contain.keys({ foo: 6 });
        expect({ foo: 1, bar: 2 }).contain.keys({ bar: 7 });
        expect({ foo: 1, bar: 2 }).contain.keys({ foo: 6 });

        expect({ foo: 1, bar: 2 }).to.contain.keys("foo");
        expect({ foo: 1, bar: 2 }).to.contain.keys("bar", "foo");
        expect({ foo: 1, bar: 2 }).to.contain.keys(["foo"]);
        expect({ foo: 1, bar: 2 }).to.contain.keys(["bar"]);
        expect({ foo: 1, bar: 2 }).to.contain.keys(["bar", "foo"]);
        expect({ foo: 1, bar: 2, baz: 3 }).to.contain.all.keys(["bar", "foo"]);

        expect({ foo: 1, bar: 2 }).to.not.have.keys("baz");
        expect({ foo: 1, bar: 2 }).to.not.have.keys("foo");
        expect({ foo: 1, bar: 2 }).to.not.have.keys("foo", "baz");
        expect({ foo: 1, bar: 2 }).to.not.contain.keys("baz");
        expect({ foo: 1, bar: 2 }).to.not.contain.keys("foo", "baz");
        expect({ foo: 1, bar: 2 }).to.not.contain.keys("baz", "foo");

        expect({ foo: 1, bar: 2 }).to.have.any.keys("foo", "baz");
        expect({ foo: 1, bar: 2 }).to.have.any.keys("foo");
        expect({ foo: 1, bar: 2 }).to.contain.any.keys("bar", "baz");
        expect({ foo: 1, bar: 2 }).to.contain.any.keys(["foo"]);
        expect({ foo: 1, bar: 2 }).to.have.all.keys(["bar", "foo"]);
        expect({ foo: 1, bar: 2 }).to.contain.all.keys(["bar", "foo"]);
        expect({ foo: 1, bar: 2 }).contain.any.keys({ foo: 6 });
        expect({ foo: 1, bar: 2 }).have.all.keys({ foo: 6, bar: 7 });
        expect({ foo: 1, bar: 2 }).contain.all.keys({ bar: 7, foo: 6 });

        expect({ foo: 1, bar: 2 }).to.not.have.any.keys("baz", "abc", "def");
        expect({ foo: 1, bar: 2 }).to.not.have.any.keys("baz");
        expect({ foo: 1, bar: 2 }).to.not.contain.any.keys("baz");
        expect({ foo: 1, bar: 2 }).to.not.have.all.keys(["baz", "foo"]);
        expect({ foo: 1, bar: 2 }).to.not.contain.all.keys(["baz", "foo"]);
        expect({ foo: 1, bar: 2 }).not.have.all.keys({ baz: 8, foo: 7 });
        expect({ foo: 1, bar: 2 }).not.contain.all.keys({ baz: 8, foo: 7 });

        var enumProp1 = "enumProp1",
            enumProp2 = "enumProp2",
            nonEnumProp = "nonEnumProp",
            obj = {};

        obj[enumProp1] = "enumProp1";
        obj[enumProp2] = "enumProp2";

        Object.defineProperty(obj, nonEnumProp, {
            enumerable: false,
            value: "nonEnumProp"
        });

        expect(obj).to.have.all.keys([enumProp1, enumProp2]);
        expect(obj).to.not.have.all.keys([enumProp1, enumProp2, nonEnumProp]);

        if (is.function(Symbol)) {
            var sym1 = Symbol("sym1"),
                sym2 = Symbol("sym2"),
                sym3 = Symbol("sym3"),
                str = "str",
                obj = {};

            obj[sym1] = "sym1";
            obj[sym2] = "sym2";
            obj[str] = "str";

            Object.defineProperty(obj, sym3, {
                enumerable: false,
                value: "sym3"
            });

            expect(obj).to.have.all.keys([sym1, sym2, str]);
            expect(obj).to.not.have.all.keys([sym1, sym2, sym3, str]);
        }

        if (!is.undefined(Map)) {
            // Not using Map constructor args because not supported in IE 11.
            var aKey = { thisIs: "anExampleObject" },
                anotherKey = { doingThisBecauseOf: "referential equality" },
                testMap = new Map();

            testMap.set(aKey, "aValue");
            testMap.set(anotherKey, "anotherValue");

            expect(testMap).to.have.any.keys(aKey);
            expect(testMap).to.have.any.keys("thisDoesNotExist", "thisToo", aKey);
            expect(testMap).to.have.all.keys(aKey, anotherKey);

            expect(testMap).to.contain.all.keys(aKey);
            expect(testMap).to.not.contain.all.keys(aKey, "thisDoesNotExist");

            expect(testMap).to.not.have.any.keys({ iDoNot: "exist" });
            expect(testMap).to.not.have.any.keys("thisIsNotAkey", { iDoNot: "exist" }, { 33: 20 });
            expect(testMap).to.not.have.all.keys("thisDoesNotExist", "thisToo", anotherKey);

            expect(testMap).to.have.any.keys([aKey]);
            expect(testMap).to.have.any.keys([20, 1, aKey]);
            expect(testMap).to.have.all.keys([aKey, anotherKey]);

            expect(testMap).to.not.have.any.keys([{ 13: 37 }, "thisDoesNotExist", "thisToo"]);
            expect(testMap).to.not.have.any.keys([20, 1, { 13: 37 }]);
            expect(testMap).to.not.have.all.keys([aKey, { iDoNot: "exist" }]);

            // Ensure the assertions above use strict equality
            err(() => {
                expect(testMap).to.have.any.keys({ thisIs: "anExampleObject" });
            });

            err(() => {
                expect(testMap).to.have.all.keys({ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" });
            });

            err(() => {
                expect(testMap).to.contain.all.keys({ thisIs: "anExampleObject" });
            });

            err(() => {
                expect(testMap).to.have.any.keys([{ thisIs: "anExampleObject" }]);
            });

            err(() => {
                expect(testMap).to.have.all.keys([{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);
            });

            // Using the same assertions as above but with `.deep` flag instead of using referential equality
            expect(testMap).to.have.any.deep.keys({ thisIs: "anExampleObject" });
            expect(testMap).to.have.any.deep.keys("thisDoesNotExist", "thisToo", { thisIs: "anExampleObject" });

            expect(testMap).to.contain.all.deep.keys({ thisIs: "anExampleObject" });
            expect(testMap).to.not.contain.all.deep.keys({ thisIs: "anExampleObject" }, "thisDoesNotExist");

            expect(testMap).to.not.have.any.deep.keys({ iDoNot: "exist" });
            expect(testMap).to.not.have.any.deep.keys("thisIsNotAkey", { iDoNot: "exist" }, { 33: 20 });
            expect(testMap).to.not.have.all.deep.keys("thisDoesNotExist", "thisToo", { doingThisBecauseOf: "referential equality" });

            expect(testMap).to.have.any.deep.keys([{ thisIs: "anExampleObject" }]);
            expect(testMap).to.have.any.deep.keys([20, 1, { thisIs: "anExampleObject" }]);

            expect(testMap).to.have.all.deep.keys({ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" });

            expect(testMap).to.not.have.any.deep.keys([{ 13: 37 }, "thisDoesNotExist", "thisToo"]);
            expect(testMap).to.not.have.any.deep.keys([20, 1, { 13: 37 }]);
            expect(testMap).to.not.have.all.deep.keys([{ thisIs: "anExampleObject" }, { iDoNot: "exist" }]);

            const weirdMapKey1 = Object.create(null);
            const weirdMapKey2 = { toString: NaN };
            const weirdMapKey3 = [];
            const weirdMap = new Map();

            weirdMap.set(weirdMapKey1, "val1");
            weirdMap.set(weirdMapKey2, "val2");

            expect(weirdMap).to.have.all.keys([weirdMapKey1, weirdMapKey2]);
            expect(weirdMap).to.not.have.all.keys([weirdMapKey1, weirdMapKey3]);

            if (is.function(Symbol)) {
                const symMapKey1 = Symbol();
                const symMapKey2 = Symbol();
                const symMapKey3 = Symbol();
                const symMap = new Map();

                symMap.set(symMapKey1, "val1");
                symMap.set(symMapKey2, "val2");

                expect(symMap).to.have.all.keys(symMapKey1, symMapKey2);
                expect(symMap).to.have.any.keys(symMapKey1, symMapKey3);
                expect(symMap).to.contain.all.keys(symMapKey2, symMapKey1);
                expect(symMap).to.contain.any.keys(symMapKey3, symMapKey1);

                expect(symMap).to.not.have.all.keys(symMapKey1, symMapKey3);
                expect(symMap).to.not.have.any.keys(symMapKey3);
                expect(symMap).to.not.contain.all.keys(symMapKey3, symMapKey1);
                expect(symMap).to.not.contain.any.keys(symMapKey3);
            }

            const errMap = new Map();

            errMap.set({ foo: 1 });

            err(() => {
                expect(errMap, "blah").to.have.keys();
            }, "blah: keys required");

            err(() => {
                expect(errMap).to.have.keys([]);
            }, "keys required");

            err(() => {
                expect(errMap).to.contain.keys();
            }, "keys required");

            err(() => {
                expect(errMap).to.contain.keys([]);
            }, "keys required");

            // Uncomment this after solving https://github.com/chaijs/chai/issues/662
            // This should fail because of referential equality (this is a strict comparison)
            // err(function(){
            //   expect(new Map([[{foo: 1}, 'bar']])).to.contain.keys({ foo: 1 });
            // }, 'expected [ [ { foo: 1 }, 'bar' ] ] to contain key { foo: 1 }');

            // err(function(){
            //   expect(new Map([[{foo: 1}, 'bar']])).to.contain.deep.keys({ iDoNotExist: 0 })
            // }, 'expected [ { foo: 1 } ] to deeply contain key { iDoNotExist: 0 }');
        }

        if (!is.undefined(Set)) {
            // Not using Set constructor args because not supported in IE 11.
            var aKey = { thisIs: "anExampleObject" },
                anotherKey = { doingThisBecauseOf: "referential equality" },
                testSet = new Set();

            testSet.add(aKey);
            testSet.add(anotherKey);

            expect(testSet).to.have.any.keys(aKey);
            expect(testSet).to.have.any.keys("thisDoesNotExist", "thisToo", aKey);
            expect(testSet).to.have.all.keys(aKey, anotherKey);

            expect(testSet).to.contain.all.keys(aKey);
            expect(testSet).to.not.contain.all.keys(aKey, "thisDoesNotExist");

            expect(testSet).to.not.have.any.keys({ iDoNot: "exist" });
            expect(testSet).to.not.have.any.keys("thisIsNotAkey", { iDoNot: "exist" }, { 33: 20 });
            expect(testSet).to.not.have.all.keys("thisDoesNotExist", "thisToo", anotherKey);

            expect(testSet).to.have.any.keys([aKey]);
            expect(testSet).to.have.any.keys([20, 1, aKey]);
            expect(testSet).to.have.all.keys([aKey, anotherKey]);

            expect(testSet).to.not.have.any.keys([{ 13: 37 }, "thisDoesNotExist", "thisToo"]);
            expect(testSet).to.not.have.any.keys([20, 1, { 13: 37 }]);
            expect(testSet).to.not.have.all.keys([aKey, { iDoNot: "exist" }]);

            // Ensure the assertions above use strict equality
            err(() => {
                expect(testSet).to.have.any.keys({ thisIs: "anExampleObject" });
            });

            err(() => {
                expect(testSet).to.have.all.keys({ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" });
            });

            err(() => {
                expect(testSet).to.contain.all.keys({ thisIs: "anExampleObject" });
            });

            err(() => {
                expect(testSet).to.have.any.keys([{ thisIs: "anExampleObject" }]);
            });

            err(() => {
                expect(testSet).to.have.all.keys([{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);
            });

            // Using the same assertions as above but with `.deep` flag instead of using referential equality
            expect(testSet).to.have.any.deep.keys({ thisIs: "anExampleObject" });
            expect(testSet).to.have.any.deep.keys("thisDoesNotExist", "thisToo", { thisIs: "anExampleObject" });

            expect(testSet).to.contain.all.deep.keys({ thisIs: "anExampleObject" });
            expect(testSet).to.not.contain.all.deep.keys({ thisIs: "anExampleObject" }, "thisDoesNotExist");

            expect(testSet).to.not.have.any.deep.keys({ iDoNot: "exist" });
            expect(testSet).to.not.have.any.deep.keys("thisIsNotAkey", { iDoNot: "exist" }, { 33: 20 });
            expect(testSet).to.not.have.all.deep.keys("thisDoesNotExist", "thisToo", { doingThisBecauseOf: "referential equality" });

            expect(testSet).to.have.any.deep.keys([{ thisIs: "anExampleObject" }]);
            expect(testSet).to.have.any.deep.keys([20, 1, { thisIs: "anExampleObject" }]);

            expect(testSet).to.have.all.deep.keys([{ thisIs: "anExampleObject" }, { doingThisBecauseOf: "referential equality" }]);

            expect(testSet).to.not.have.any.deep.keys([{ 13: 37 }, "thisDoesNotExist", "thisToo"]);
            expect(testSet).to.not.have.any.deep.keys([20, 1, { 13: 37 }]);
            expect(testSet).to.not.have.all.deep.keys([{ thisIs: "anExampleObject" }, { iDoNot: "exist" }]);

            const weirdSetKey1 = Object.create(null);
            const weirdSetKey2 = { toString: NaN };
            const weirdSetKey3 = [];
            const weirdSet = new Set();

            weirdSet.add(weirdSetKey1);
            weirdSet.add(weirdSetKey2);

            expect(weirdSet).to.have.all.keys([weirdSetKey1, weirdSetKey2]);
            expect(weirdSet).to.not.have.all.keys([weirdSetKey1, weirdSetKey3]);

            if (is.function(Symbol)) {
                const symSetKey1 = Symbol();
                const symSetKey2 = Symbol();
                const symSetKey3 = Symbol();
                const symSet = new Set();

                symSet.add(symSetKey1);
                symSet.add(symSetKey2);

                expect(symSet).to.have.all.keys(symSetKey1, symSetKey2);
                expect(symSet).to.have.any.keys(symSetKey1, symSetKey3);
                expect(symSet).to.contain.all.keys(symSetKey2, symSetKey1);
                expect(symSet).to.contain.any.keys(symSetKey3, symSetKey1);

                expect(symSet).to.not.have.all.keys(symSetKey1, symSetKey3);
                expect(symSet).to.not.have.any.keys(symSetKey3);
                expect(symSet).to.not.contain.all.keys(symSetKey3, symSetKey1);
                expect(symSet).to.not.contain.any.keys(symSetKey3);
            }

            const errSet = new Set();
            errSet.add({ foo: 1 });

            err(() => {
                expect(errSet, "blah").to.have.keys();
            }, "blah: keys required");

            err(() => {
                expect(errSet).to.have.keys([]);
            }, "keys required");

            err(() => {
                expect(errSet).to.contain.keys();
            }, "keys required");

            err(() => {
                expect(errSet).to.contain.keys([]);
            }, "keys required");

            // Uncomment this after solving https://github.com/chaijs/chai/issues/662
            // This should fail because of referential equality (this is a strict comparison)
            // err(function(){
            //   expect(new Set([{foo: 1}])).to.contain.keys({ foo: 1 });
            // }, 'expected [ { foo: 1 } ] to deeply contain key { foo: 1 }');

            // err(function(){
            //   expect(new Set([{foo: 1}])).to.contain.deep.keys({ iDoNotExist: 0 });
            // }, 'expected [ { foo: 1 } ] to deeply contain key { iDoNotExist: 0 }');
        }

        err(() => {
            expect({ foo: 1 }, "blah").to.have.keys();
        }, "blah: keys required");

        err(() => {
            expect({ foo: 1 }).to.have.keys([]);
        }, "keys required");

        err(() => {
            expect({ foo: 1 }).to.not.have.keys([]);
        }, "keys required");

        err(() => {
            expect({ foo: 1 }).to.contain.keys([]);
        }, "keys required");

        const mixedArgsMsg = "blah: when testing keys against an object or an array you must give a single Array|Object|String argument or multiple String arguments";

        err(() => {
            expect({}, "blah").contain.keys(["a"], "b");
        }, mixedArgsMsg);

        err(() => {
            expect({}, "blah").contain.keys({ a: 1 }, "b");
        }, mixedArgsMsg);

        err(() => {
            expect({ foo: 1 }, "blah").to.have.keys(["bar"]);
        }, "blah: expected { foo: 1 } to have key 'bar'");

        err(() => {
            expect({ foo: 1 }).to.have.keys(["bar", "baz"]);
        }, "expected { foo: 1 } to have keys 'bar', and 'baz'");

        err(() => {
            expect({ foo: 1 }).to.have.keys(["foo", "bar", "baz"]);
        }, "expected { foo: 1 } to have keys 'foo', 'bar', and 'baz'");

        err(() => {
            expect({ foo: 1 }).to.not.have.keys(["foo"]);
        }, "expected { foo: 1 } to not have key 'foo'");

        err(() => {
            expect({ foo: 1 }).to.not.have.keys(["foo"]);
        }, "expected { foo: 1 } to not have key 'foo'");

        err(() => {
            expect({ foo: 1, bar: 2 }).to.not.have.keys(["foo", "bar"]);
        }, "expected { foo: 1, bar: 2 } to not have keys 'foo', and 'bar'");

        err(() => {
            expect({ foo: 1, bar: 2 }).to.have.all.keys("foo");
        }, "expected { foo: 1, bar: 2 } to have key 'foo'");

        err(() => {
            expect({ foo: 1 }).to.not.contain.keys(["foo"]);
        }, "expected { foo: 1 } to not contain key 'foo'");

        err(() => {
            expect({ foo: 1 }).to.contain.keys("foo", "bar");
        }, "expected { foo: 1 } to contain keys 'foo', and 'bar'");

        err(() => {
            expect({ foo: 1 }).to.have.any.keys("baz");
        }, "expected { foo: 1 } to have key 'baz'");

        err(() => {
            expect({ foo: 1, bar: 2 }).to.not.have.all.keys(["foo", "bar"]);
        }, "expected { foo: 1, bar: 2 } to not have keys 'foo', and 'bar'");

        err(() => {
            expect({ foo: 1, bar: 2 }).to.not.have.any.keys(["foo", "baz"]);
        }, "expected { foo: 1, bar: 2 } to not have keys 'foo', or 'baz'");

        // repeat previous tests with Object as arg.
        err(() => {
            expect({ foo: 1 }, "blah").have.keys({ bar: 1 });
        }, "blah: expected { foo: 1 } to have key 'bar'");

        err(() => {
            expect({ foo: 1 }).have.keys({ bar: 1, baz: 1 });
        }, "expected { foo: 1 } to have keys 'bar', and 'baz'");

        err(() => {
            expect({ foo: 1 }).have.keys({ foo: 1, bar: 1, baz: 1 });
        }, "expected { foo: 1 } to have keys 'foo', 'bar', and 'baz'");

        err(() => {
            expect({ foo: 1 }).not.have.keys({ foo: 1 });
        }, "expected { foo: 1 } to not have key 'foo'");

        err(() => {
            expect({ foo: 1 }).not.have.keys({ foo: 1 });
        }, "expected { foo: 1 } to not have key 'foo'");

        err(() => {
            expect({ foo: 1, bar: 2 }).not.have.keys({ foo: 1, bar: 1 });
        }, "expected { foo: 1, bar: 2 } to not have keys 'foo', and 'bar'");

        err(() => {
            expect({ foo: 1 }).not.contain.keys({ foo: 1 });
        }, "expected { foo: 1 } to not contain key 'foo'");

        err(() => {
            expect({ foo: 1 }).contain.keys("foo", "bar");
        }, "expected { foo: 1 } to contain keys 'foo', and 'bar'");

        err(() => {
            expect({ foo: 1 }).have.any.keys("baz");
        }, "expected { foo: 1 } to have key 'baz'");

        err(() => {
            expect({ foo: 1, bar: 2 }).not.have.all.keys({ foo: 1, bar: 1 });
        }, "expected { foo: 1, bar: 2 } to not have keys 'foo', and 'bar'");

        err(() => {
            expect({ foo: 1, bar: 2 }).not.have.any.keys({ foo: 1, baz: 1 });
        }, "expected { foo: 1, bar: 2 } to not have keys 'foo', or 'baz'");

    });

    it("keys(array) will not mutate array (#359)", () => {
        const expected = ["b", "a"];
        const original_order = ["b", "a"];
        const obj = { b: 1, a: 1 };
        expect(expected).deep.equal(original_order);
        expect(obj).keys(original_order);
        expect(expected).deep.equal(original_order);
    });

    it("chaining", () => {
        const tea = { name: "chai", extras: ["milk", "sugar", "smile"] };
        expect(tea).to.have.property("extras").with.lengthOf(3);

        expect(tea).to.have.property("extras").which.contains("smile");

        err(() => {
            expect(tea).to.have.property("extras").with.lengthOf(4);
        }, "expected [ 'milk', 'sugar', 'smile' ] to have a length of 4 but got 3");

        expect(tea).to.be.a("object").and.have.property("name", "chai");

        const badFn = function () {
            throw new Error("testing");
        };

        expect(badFn).to.throw(Error).with.property("message", "testing");
    });

    it("throw", () => {
        // See GH-45: some poorly-constructed custom errors don't have useful names
        // on either their constructor or their constructor prototype, but instead
        // only set the name inside the constructor itself.
        const PoorlyConstructedError = function () {
            this.name = "PoorlyConstructedError";
        };
        PoorlyConstructedError.prototype = Object.create(Error.prototype);

        function CustomError(message) {
            this.name = "CustomError";
            this.message = message;
        }
        CustomError.prototype = Error.prototype;

        const specificError = new RangeError("boo");

        const goodFn = function () {
            1 === 1;
        };
        const badFn = function () {
            throw new Error("testing");
        };
        const refErrFn = function () {
            throw new ReferenceError("hello");
        };
        const ickyErrFn = function () {
            throw new PoorlyConstructedError();
        };
        const specificErrFn = function () {
            throw specificError;
        };
        const customErrFn = function () {
            throw new CustomError("foo");
        };
        const emptyErrFn = function () {
            throw new Error();
        };
        const emptyStringErrFn = function () {
            throw new Error("");
        };

        expect(goodFn).to.not.throw();
        expect(goodFn).to.not.throw(Error);
        expect(goodFn).to.not.throw(specificError);
        expect(badFn).to.throw();
        expect(badFn).to.throw(Error);
        expect(badFn).to.not.throw(ReferenceError);
        expect(badFn).to.not.throw(specificError);
        expect(refErrFn).to.throw();
        expect(refErrFn).to.throw(ReferenceError);
        expect(refErrFn).to.throw(Error);
        expect(refErrFn).to.not.throw(TypeError);
        expect(refErrFn).to.not.throw(specificError);
        expect(ickyErrFn).to.throw();
        expect(ickyErrFn).to.throw(PoorlyConstructedError);
        expect(ickyErrFn).to.throw(Error);
        expect(ickyErrFn).to.not.throw(specificError);
        expect(specificErrFn).to.throw(specificError);

        expect(goodFn).to.not.throw("testing");
        expect(goodFn).to.not.throw(/testing/);
        expect(badFn).to.throw(/testing/);
        expect(badFn).to.not.throw(/hello/);
        expect(badFn).to.throw("testing");
        expect(badFn).to.not.throw("hello");
        expect(emptyStringErrFn).to.throw("");
        expect(emptyStringErrFn).to.not.throw("testing");
        expect(badFn).to.throw("");

        expect(badFn).to.throw(Error, /testing/);
        expect(badFn).to.throw(Error, "testing");
        expect(emptyErrFn).to.not.throw(Error, "testing");

        expect(badFn).to.not.throw(Error, "I am the wrong error message");
        expect(badFn).to.not.throw(TypeError, "testing");

        err(() => {
            expect(goodFn, "blah").to.throw();
        }, /^blah: expected \[Function(: goodFn)*\] to throw an error$/);

        err(() => {
            expect(goodFn, "blah").to.throw(ReferenceError);
        }, /^blah: expected \[Function(: goodFn)*\] to throw ReferenceError$/);

        err(() => {
            expect(goodFn, "blah").to.throw(specificError);
        }, /^blah: expected \[Function(: goodFn)*\] to throw 'RangeError: boo'$/);

        err(() => {
            expect(badFn, "blah").to.not.throw();
        }, /^blah: expected \[Function(: badFn)*\] to not throw an error but 'Error: testing' was thrown$/);

        err(() => {
            expect(badFn, "blah").to.throw(ReferenceError);
        }, /^blah: expected \[Function(: badFn)*\] to throw 'ReferenceError' but 'Error: testing' was thrown$/);

        err(() => {
            expect(badFn, "blah").to.throw(specificError);
        }, /^blah: expected \[Function(: badFn)*\] to throw 'RangeError: boo' but 'Error: testing' was thrown$/);

        err(() => {
            expect(badFn, "blah").to.not.throw(Error);
        }, /^blah: expected \[Function(: badFn)*\] to not throw 'Error' but 'Error: testing' was thrown$/);

        err(() => {
            expect(refErrFn, "blah").to.not.throw(ReferenceError);
        }, /^blah: expected \[Function(: refErrFn)*\] to not throw 'ReferenceError' but 'ReferenceError: hello' was thrown$/);

        err(() => {
            expect(badFn, "blah").to.throw(PoorlyConstructedError);
        }, /^blah: expected \[Function(: badFn)*\] to throw 'PoorlyConstructedError' but 'Error: testing' was thrown$/);

        err(() => {
            expect(ickyErrFn, "blah").to.not.throw(PoorlyConstructedError);
        }, /^blah: (expected \[Function(: ickyErrFn)*\] to not throw 'PoorlyConstructedError' but)(.*)(PoorlyConstructedError|\{ Object \()(.*)(was thrown)$/);

        err(() => {
            expect(ickyErrFn, "blah").to.throw(ReferenceError);
        }, /^blah: (expected \[Function(: ickyErrFn)*\] to throw 'ReferenceError' but)(.*)(PoorlyConstructedError|\{ Object \()(.*)(was thrown)$/);

        err(() => {
            expect(specificErrFn, "blah").to.throw(new ReferenceError("eek"));
        }, /^blah: expected \[Function(: specificErrFn)*\] to throw 'ReferenceError: eek' but 'RangeError: boo' was thrown$/);

        err(() => {
            expect(specificErrFn, "blah").to.not.throw(specificError);
        }, /^blah: expected \[Function(: specificErrFn)*\] to not throw 'RangeError: boo'$/);

        err(() => {
            expect(badFn, "blah").to.not.throw(/testing/);
        }, /^blah: expected \[Function(: badFn)*\] to throw error not matching \/testing\/$/);

        err(() => {
            expect(badFn, "blah").to.throw(/hello/);
        }, /^blah: expected \[Function(: badFn)*\] to throw error matching \/hello\/ but got 'testing'$/);

        err(() => {
            expect(badFn).to.throw(Error, /hello/, "blah");
        }, /^blah: expected \[Function(: badFn)*\] to throw error matching \/hello\/ but got 'testing'$/);

        err(() => {
            expect(badFn, "blah").to.throw(Error, /hello/);
        }, /^blah: expected \[Function(: badFn)*\] to throw error matching \/hello\/ but got 'testing'$/);

        err(() => {
            expect(badFn).to.throw(Error, "hello", "blah");
        }, /^blah: expected \[Function(: badFn)*\] to throw error including 'hello' but got 'testing'$/);

        err(() => {
            expect(badFn, "blah").to.throw(Error, "hello");
        }, /^blah: expected \[Function(: badFn)*\] to throw error including 'hello' but got 'testing'$/);

        err(() => {
            expect(customErrFn, "blah").to.not.throw();
        }, /^blah: expected \[Function(: customErrFn)*\] to not throw an error but 'CustomError: foo' was thrown$/);

        err(() => {
            expect(badFn).to.not.throw(Error, "testing", "blah");
        }, /^blah: expected \[Function(: badFn)*\] to not throw 'Error' but 'Error: testing' was thrown$/);

        err(() => {
            expect(badFn, "blah").to.not.throw(Error, "testing");
        }, /^blah: expected \[Function(: badFn)*\] to not throw 'Error' but 'Error: testing' was thrown$/);

        err(() => {
            expect(emptyStringErrFn).to.not.throw(Error, "", "blah");
        }, /^blah: expected \[Function(: emptyStringErrFn)*\] to not throw 'Error' but 'Error' was thrown$/);

        err(() => {
            expect(emptyStringErrFn, "blah").to.not.throw(Error, "");
        }, /^blah: expected \[Function(: emptyStringErrFn)*\] to not throw 'Error' but 'Error' was thrown$/);

        err(() => {
            expect(emptyStringErrFn, "blah").to.not.throw("");
        }, /^blah: expected \[Function(: emptyStringErrFn)*\] to throw error not including ''$/);

        err(() => {
            expect({}, "blah").to.throw();
        }, "blah: expected {} to be a function");

        err(() => {
            expect({}).to.throw(Error, "testing", "blah");
        }, "blah: expected {} to be a function");
    });

    it("respondTo", () => {
        function Foo() { }
        Foo.prototype.bar = function () { };
        Foo.func = function () { };

        const bar = {};
        bar.foo = function () { };

        expect(Foo).to.respondTo("bar");
        expect(Foo).to.not.respondTo("foo");
        expect(Foo).itself.to.respondTo("func");
        expect(Foo).itself.not.to.respondTo("bar");

        expect(bar).to.respondTo("foo");

        err(() => {
            expect(Foo).to.respondTo("baz", "constructor");
        }, /^(constructor: expected)(.*)(\[Function: Foo\])(.*)(to respond to \'baz\')$/);

        err(() => {
            expect(Foo, "constructor").to.respondTo("baz");
        }, /^(constructor: expected)(.*)(\[Function: Foo\])(.*)(to respond to \'baz\')$/);

        err(() => {
            expect(bar).to.respondTo("baz", "object");
        }, /^(object: expected)(.*)(\{ foo: \[Function\] \}|\{ Object \()(.*)(to respond to \'baz\')$/);

        err(() => {
            expect(bar, "object").to.respondTo("baz");
        }, /^(object: expected)(.*)(\{ foo: \[Function\] \}|\{ Object \()(.*)(to respond to \'baz\')$/);
    });

    it("satisfy", () => {
        const matcher = function (num) {
            return num === 1;
        };

        expect(1).to.satisfy(matcher);

        err(() => {
            expect(2).to.satisfy(matcher, "blah");
        }, /^blah: expected 2 to satisfy \[Function(: matcher)*\]$/);

        err(() => {
            expect(2, "blah").to.satisfy(matcher);
        }, /^blah: expected 2 to satisfy \[Function(: matcher)*\]$/);
    });

    it("closeTo", () => {
        expect(1.5).to.be.closeTo(1.0, 0.5);
        expect(10).to.be.closeTo(20, 20);
        expect(-10).to.be.closeTo(20, 30);

        err(() => {
            expect(2).to.be.closeTo(1.0, 0.5, "blah");
        }, "blah: expected 2 to be close to 1 +/- 0.5");

        err(() => {
            expect(2, "blah").to.be.closeTo(1.0, 0.5);
        }, "blah: expected 2 to be close to 1 +/- 0.5");

        err(() => {
            expect(-10).to.be.closeTo(20, 29, "blah");
        }, "blah: expected -10 to be close to 20 +/- 29");

        err(() => {
            expect([1.5]).to.be.closeTo(1.0, 0.5, "blah");
        }, "blah: expected [ 1.5 ] to be a number");

        err(() => {
            expect([1.5], "blah").to.be.closeTo(1.0, 0.5);
        }, "blah: expected [ 1.5 ] to be a number");

        err(() => {
            expect(1.5).to.be.closeTo("1.0", 0.5, "blah");
        }, "blah: the arguments to closeTo or approximately must be numbers");

        err(() => {
            expect(1.5, "blah").to.be.closeTo("1.0", 0.5);
        }, "blah: the arguments to closeTo or approximately must be numbers");

        err(() => {
            expect(1.5).to.be.closeTo(1.0, true, "blah");
        }, "blah: the arguments to closeTo or approximately must be numbers");

        err(() => {
            expect(1.5, "blah").to.be.closeTo(1.0, true);
        }, "blah: the arguments to closeTo or approximately must be numbers");
    });

    it("approximately", () => {
        expect(1.5).to.be.approximately(1.0, 0.5);
        expect(10).to.be.approximately(20, 20);
        expect(-10).to.be.approximately(20, 30);

        err(() => {
            expect(2).to.be.approximately(1.0, 0.5, "blah");
        }, "blah: expected 2 to be close to 1 +/- 0.5");

        err(() => {
            expect(-10).to.be.approximately(20, 29, "blah");
        }, "blah: expected -10 to be close to 20 +/- 29");

        err(() => {
            expect([1.5]).to.be.approximately(1.0, 0.5);
        }, "expected [ 1.5 ] to be a number");

        err(() => {
            expect(1.5).to.be.approximately("1.0", 0.5);
        }, "the arguments to closeTo or approximately must be numbers");

        err(() => {
            expect(1.5).to.be.approximately(1.0, true);
        }, "the arguments to closeTo or approximately must be numbers");
    });

    it("oneOf", () => {
        expect(1).to.be.oneOf([1, 2, 3]);
        expect("1").to.not.be.oneOf([1, 2, 3]);
        expect([3, [4]]).to.not.be.oneOf([1, 2, [3, 4]]);
        const threeFour = [3, [4]];
        expect(threeFour).to.be.oneOf([1, 2, threeFour]);

        err(() => {
            expect(1).to.be.oneOf([2, 3], "blah");
        }, "blah: expected 1 to be one of [ 2, 3 ]");

        err(() => {
            expect(1, "blah").to.be.oneOf([2, 3]);
        }, "blah: expected 1 to be one of [ 2, 3 ]");

        err(() => {
            expect(1).to.not.be.oneOf([1, 2, 3], "blah");
        }, "blah: expected 1 to not be one of [ 1, 2, 3 ]");

        err(() => {
            expect(1, "blah").to.not.be.oneOf([1, 2, 3]);
        }, "blah: expected 1 to not be one of [ 1, 2, 3 ]");

        err(() => {
            expect(1).to.be.oneOf({}, "blah");
        }, "blah: expected {} to be an array");

        err(() => {
            expect(1, "blah").to.be.oneOf({});
        }, "blah: expected {} to be an array");
    });

    it("include.members", () => {
        expect([1, 2, 3]).to.include.members([]);
        expect([1, 2, 3]).to.include.members([3, 2]);
        expect([1, 2, 3]).to.include.members([3, 2, 2]);
        expect([1, 2, 3]).to.not.include.members([8, 4]);
        expect([1, 2, 3]).to.not.include.members([1, 2, 3, 4]);
        expect([{ a: 1 }]).to.not.include.members([{ a: 1 }]);

        err(() => {
            expect([1, 2, 3]).to.include.members([2, 5], "blah");
        }, "blah: expected [ 1, 2, 3 ] to be a superset of [ 2, 5 ]");

        err(() => {
            expect([1, 2, 3], "blah").to.include.members([2, 5]);
        }, "blah: expected [ 1, 2, 3 ] to be a superset of [ 2, 5 ]");

        err(() => {
            expect([1, 2, 3]).to.not.include.members([2, 1]);
        }, "expected [ 1, 2, 3 ] to not be a superset of [ 2, 1 ]");
    });

    it("same.members", () => {
        expect([5, 4]).to.have.same.members([4, 5]);
        expect([5, 4]).to.have.same.members([5, 4]);
        expect([5, 4, 4]).to.have.same.members([5, 4, 4]);
        expect([5, 4]).to.not.have.same.members([]);
        expect([5, 4]).to.not.have.same.members([6, 3]);
        expect([5, 4]).to.not.have.same.members([5, 4, 2]);
        expect([5, 4]).to.not.have.same.members([5, 4, 4]);
        expect([5, 4, 4]).to.not.have.same.members([5, 4]);
        expect([5, 4, 4]).to.not.have.same.members([5, 4, 3]);
        expect([5, 4, 3]).to.not.have.same.members([5, 4, 4]);
    });

    it("members", () => {
        expect([5, 4]).members([4, 5]);
        expect([5, 4]).members([5, 4]);
        expect([5, 4, 4]).members([5, 4, 4]);
        expect([5, 4]).not.members([]);
        expect([5, 4]).not.members([6, 3]);
        expect([5, 4]).not.members([5, 4, 2]);
        expect([5, 4]).not.members([5, 4, 4]);
        expect([5, 4, 4]).not.members([5, 4]);
        expect([5, 4, 4]).not.members([5, 4, 3]);
        expect([5, 4, 3]).not.members([5, 4, 4]);
        expect([{ id: 1 }]).not.members([{ id: 1 }]);

        err(() => {
            expect([1, 2, 3]).members([2, 1, 5], "blah");
        }, "blah: expected [ 1, 2, 3 ] to have the same members as [ 2, 1, 5 ]");

        err(() => {
            expect([1, 2, 3], "blah").members([2, 1, 5]);
        }, "blah: expected [ 1, 2, 3 ] to have the same members as [ 2, 1, 5 ]");

        err(() => {
            expect([1, 2, 3]).not.members([2, 1, 3]);
        }, "expected [ 1, 2, 3 ] to not have the same members as [ 2, 1, 3 ]");

        err(() => {
            expect({}).members([], "blah");
        }, "blah: expected {} to be an array");

        err(() => {
            expect({}, "blah").members([]);
        }, "blah: expected {} to be an array");

        err(() => {
            expect([]).members({}, "blah");
        }, "blah: expected {} to be an array");

        err(() => {
            expect([], "blah").members({});
        }, "blah: expected {} to be an array");
    });

    it("deep.members", () => {
        expect([{ id: 1 }]).deep.members([{ id: 1 }]);
        expect([{ a: 1 }, { b: 2 }, { b: 2 }]).deep.members([{ a: 1 }, { b: 2 }, { b: 2 }]);

        expect([{ id: 2 }]).not.deep.members([{ id: 1 }]);
        expect([{ a: 1 }, { b: 2 }]).not.deep.members([{ a: 1 }, { b: 2 }, { b: 2 }]);
        expect([{ a: 1 }, { b: 2 }, { b: 2 }]).not.deep.members([{ a: 1 }, { b: 2 }]);
        expect([{ a: 1 }, { b: 2 }, { b: 2 }]).not.deep.members([{ a: 1 }, { b: 2 }, { c: 3 }]);
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).not.deep.members([{ a: 1 }, { b: 2 }, { b: 2 }]);

        err(() => {
            expect([{ id: 1 }]).deep.members([{ id: 2 }], "blah");
        }, "blah: expected [ { id: 1 } ] to have the same members as [ { id: 2 } ]");

        err(() => {
            expect([{ id: 1 }], "blah").deep.members([{ id: 2 }]);
        }, "blah: expected [ { id: 1 } ] to have the same members as [ { id: 2 } ]");
    });

    it("include.deep.members", () => {
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).include.deep.members([{ b: 2 }, { a: 1 }]);
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).include.deep.members([{ b: 2 }, { a: 1 }, { a: 1 }]);
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).not.include.deep.members([{ b: 2 }, { a: 1 }, { f: 5 }]);

        err(() => {
            expect([{ a: 1 }, { b: 2 }, { c: 3 }]).include.deep.members([{ b: 2 }, { a: 1 }, { f: 5 }], "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to be a superset of [ { b: 2 }, { a: 1 }, { f: 5 } ]");

        err(() => {
            expect([{ a: 1 }, { b: 2 }, { c: 3 }], "blah").include.deep.members([{ b: 2 }, { a: 1 }, { f: 5 }]);
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to be a superset of [ { b: 2 }, { a: 1 }, { f: 5 } ]");
    });

    it("ordered.members", () => {
        expect([1, 2, 3]).ordered.members([1, 2, 3]);
        expect([1, 2, 2]).ordered.members([1, 2, 2]);

        expect([1, 2, 3]).not.ordered.members([2, 1, 3]);
        expect([1, 2, 3]).not.ordered.members([1, 2]);
        expect([1, 2]).not.ordered.members([1, 2, 2]);
        expect([1, 2, 2]).not.ordered.members([1, 2]);
        expect([1, 2, 2]).not.ordered.members([1, 2, 3]);
        expect([1, 2, 3]).not.ordered.members([1, 2, 2]);

        err(() => {
            expect([1, 2, 3]).ordered.members([2, 1, 3], "blah");
        }, "blah: expected [ 1, 2, 3 ] to have the same ordered members as [ 2, 1, 3 ]");

        err(() => {
            expect([1, 2, 3], "blah").ordered.members([2, 1, 3]);
        }, "blah: expected [ 1, 2, 3 ] to have the same ordered members as [ 2, 1, 3 ]");

        err(() => {
            expect([1, 2, 3]).not.ordered.members([1, 2, 3]);
        }, "expected [ 1, 2, 3 ] to not have the same ordered members as [ 1, 2, 3 ]");
    });

    it("include.ordered.members", () => {
        expect([1, 2, 3]).include.ordered.members([1, 2]);
        expect([1, 2, 3]).not.include.ordered.members([2, 1]);
        expect([1, 2, 3]).not.include.ordered.members([2, 3]);
        expect([1, 2, 3]).not.include.ordered.members([1, 2, 2]);

        err(() => {
            expect([1, 2, 3]).include.ordered.members([2, 1], "blah");
        }, "blah: expected [ 1, 2, 3 ] to be an ordered superset of [ 2, 1 ]");

        err(() => {
            expect([1, 2, 3], "blah").include.ordered.members([2, 1]);
        }, "blah: expected [ 1, 2, 3 ] to be an ordered superset of [ 2, 1 ]");

        err(() => {
            expect([1, 2, 3]).not.include.ordered.members([1, 2]);
        }, "expected [ 1, 2, 3 ] to not be an ordered superset of [ 1, 2 ]");
    });

    it("deep.ordered.members", () => {
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).deep.ordered.members([{ a: 1 }, { b: 2 }, { c: 3 }]);
        expect([{ a: 1 }, { b: 2 }, { b: 2 }]).deep.ordered.members([{ a: 1 }, { b: 2 }, { b: 2 }]);

        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).not.deep.ordered.members([{ b: 2 }, { a: 1 }, { c: 3 }]);
        expect([{ a: 1 }, { b: 2 }]).not.deep.ordered.members([{ a: 1 }, { b: 2 }, { b: 2 }]);
        expect([{ a: 1 }, { b: 2 }, { b: 2 }]).not.deep.ordered.members([{ a: 1 }, { b: 2 }]);
        expect([{ a: 1 }, { b: 2 }, { b: 2 }]).not.deep.ordered.members([{ a: 1 }, { b: 2 }, { c: 3 }]);
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).not.deep.ordered.members([{ a: 1 }, { b: 2 }, { b: 2 }]);

        err(() => {
            expect([{ a: 1 }, { b: 2 }, { c: 3 }]).deep.ordered.members([{ b: 2 }, { a: 1 }, { c: 3 }], "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to have the same ordered members as [ { b: 2 }, { a: 1 }, { c: 3 } ]");

        err(() => {
            expect([{ a: 1 }, { b: 2 }, { c: 3 }], "blah").deep.ordered.members([{ b: 2 }, { a: 1 }, { c: 3 }]);
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to have the same ordered members as [ { b: 2 }, { a: 1 }, { c: 3 } ]");

        err(() => {
            expect([{ a: 1 }, { b: 2 }, { c: 3 }]).not.deep.ordered.members([{ a: 1 }, { b: 2 }, { c: 3 }]);
        }, "expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to not have the same ordered members as [ { a: 1 }, { b: 2 }, { c: 3 } ]");
    });

    it("include.deep.ordered.members", () => {
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).include.deep.ordered.members([{ a: 1 }, { b: 2 }]);
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).not.include.deep.ordered.members([{ b: 2 }, { a: 1 }]);
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).not.include.deep.ordered.members([{ b: 2 }, { c: 3 }]);
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).not.include.deep.ordered.members([{ a: 1 }, { b: 2 }, { b: 2 }]);

        err(() => {
            expect([{ a: 1 }, { b: 2 }, { c: 3 }]).include.deep.ordered.members([{ b: 2 }, { a: 1 }], "blah");
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to be an ordered superset of [ { b: 2 }, { a: 1 } ]");

        err(() => {
            expect([{ a: 1 }, { b: 2 }, { c: 3 }], "blah").include.deep.ordered.members([{ b: 2 }, { a: 1 }]);
        }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to be an ordered superset of [ { b: 2 }, { a: 1 } ]");

        err(() => {
            expect([{ a: 1 }, { b: 2 }, { c: 3 }]).not.include.deep.ordered.members([{ a: 1 }, { b: 2 }]);
        }, "expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to not be an ordered superset of [ { a: 1 }, { b: 2 } ]");
    });

    it("change", () => {
        const obj = { value: 10, str: "foo" };
        const heroes = ["spiderman", "superman"];
        const fn = function () {
            obj.value += 5;
        };
        const decFn = function () {
            obj.value -= 20;
        };
        const sameFn = function () {
            "foo" + "bar";
        };
        const bangFn = function () {
            obj.str += "!";
        };
        const batFn = function () {
            heroes.push("batman");
        };
        const lenFn = function () {
            return heroes.length;
        };

        expect(fn).to.change(obj, "value");
        expect(fn).to.change(obj, "value").by(5);
        expect(fn).to.change(obj, "value").by(-5);

        expect(decFn).to.change(obj, "value").by(20);
        expect(decFn).to.change(obj, "value").but.not.by(21);

        expect(sameFn).to.not.change(obj, "value");

        expect(sameFn).to.not.change(obj, "str");
        expect(bangFn).to.change(obj, "str");

        expect(batFn).to.change(lenFn).by(1);
        expect(batFn).to.change(lenFn).but.not.by(2);

        err(() => {
            expect(sameFn).to.change(obj, "value", "blah");
        }, "blah: expected .value to change");

        err(() => {
            expect(sameFn, "blah").to.change(obj, "value");
        }, "blah: expected .value to change");

        err(() => {
            expect(fn).to.not.change(obj, "value", "blah");
        }, "blah: expected .value to not change");

        err(() => {
            expect({}).to.change(obj, "value", "blah");
        }, "blah: expected {} to be a function");

        err(() => {
            expect({}, "blah").to.change(obj, "value");
        }, "blah: expected {} to be a function");

        err(() => {
            expect(fn).to.change({}, "badprop", "blah");
        }, "blah: expected {} to have property 'badprop'");

        err(() => {
            expect(fn, "blah").to.change({}, "badprop");
        }, "blah: expected {} to have property 'badprop'");

        err(() => {
            expect(fn, "blah").to.change({});
        }, "blah: expected {} to be a function");

        err(() => {
            expect(fn).to.change(obj, "value").by(10, "blah");
        }, "blah: expected .value to change by 10");

        err(() => {
            expect(fn, "blah").to.change(obj, "value").by(10);
        }, "blah: expected .value to change by 10");

        err(() => {
            expect(fn).to.change(obj, "value").but.not.by(5, "blah");
        }, "blah: expected .value to not change by 5");
    });

    it("increase, decrease", () => {
        const obj = { value: 10, noop: null };
        const arr = ["one", "two"];
        const pFn = function () {
            arr.push("three");
        };
        const popFn = function () {
            arr.pop();
        };
        const nFn = function () {
            return null;
        };
        const lenFn = function () {
            return arr.length;
        };
        const incFn = function () {
            obj.value += 2;
        };
        const decFn = function () {
            obj.value -= 3;
        };
        const smFn = function () {
            obj.value += 0;
        };

        expect(smFn).to.not.increase(obj, "value");
        expect(decFn).to.not.increase(obj, "value");
        expect(incFn).to.increase(obj, "value");
        expect(incFn).to.increase(obj, "value").by(2);
        expect(incFn).to.increase(obj, "value").but.not.by(1);

        expect(smFn).to.not.decrease(obj, "value");
        expect(incFn).to.not.decrease(obj, "value");
        expect(decFn).to.decrease(obj, "value");
        expect(decFn).to.decrease(obj, "value").by(3);
        expect(decFn).to.decrease(obj, "value").but.not.by(2);

        expect(popFn).to.not.increase(lenFn);
        expect(nFn).to.not.increase(lenFn);
        expect(pFn).to.increase(lenFn);
        expect(pFn).to.increase(lenFn).by(1);
        expect(pFn).to.increase(lenFn).but.not.by(2);

        expect(popFn).to.decrease(lenFn);
        expect(popFn).to.decrease(lenFn).by(1);
        expect(popFn).to.decrease(lenFn).but.not.by(2);
        expect(nFn).to.not.decrease(lenFn);
        expect(pFn).to.not.decrease(lenFn);

        err(() => {
            expect(smFn).to.increase(obj, "value", "blah");
        }, "blah: expected .value to increase");

        err(() => {
            expect(smFn, "blah").to.increase(obj, "value");
        }, "blah: expected .value to increase");

        err(() => {
            expect(incFn).to.not.increase(obj, "value", "blah");
        }, "blah: expected .value to not increase");

        err(() => {
            expect({}).to.increase(obj, "value", "blah");
        }, "blah: expected {} to be a function");

        err(() => {
            expect({}, "blah").to.increase(obj, "value");
        }, "blah: expected {} to be a function");

        err(() => {
            expect(incFn).to.increase({}, "badprop", "blah");
        }, "blah: expected {} to have property 'badprop'");

        err(() => {
            expect(incFn, "blah").to.increase({}, "badprop");
        }, "blah: expected {} to have property 'badprop'");

        err(() => {
            expect(incFn, "blah").to.increase({});
        }, "blah: expected {} to be a function");

        err(() => {
            expect(incFn).to.increase(obj, "noop", "blah");
        }, "blah: expected null to be a number");

        err(() => {
            expect(incFn, "blah").to.increase(obj, "noop");
        }, "blah: expected null to be a number");

        err(() => {
            expect(incFn).to.increase(obj, "value").by(10, "blah");
        }, "blah: expected .value to increase by 10");

        err(() => {
            expect(incFn, "blah").to.increase(obj, "value").by(10);
        }, "blah: expected .value to increase by 10");

        err(() => {
            expect(incFn).to.increase(obj, "value").but.not.by(2, "blah");
        }, "blah: expected .value to not increase by 2");

        err(() => {
            expect(smFn).to.decrease(obj, "value", "blah");
        }, "blah: expected .value to decrease");

        err(() => {
            expect(smFn, "blah").to.decrease(obj, "value");
        }, "blah: expected .value to decrease");

        err(() => {
            expect(decFn).to.not.decrease(obj, "value", "blah");
        }, "blah: expected .value to not decrease");

        err(() => {
            expect({}).to.decrease(obj, "value", "blah");
        }, "blah: expected {} to be a function");

        err(() => {
            expect({}, "blah").to.decrease(obj, "value");
        }, "blah: expected {} to be a function");

        err(() => {
            expect(decFn).to.decrease({}, "badprop", "blah");
        }, "blah: expected {} to have property 'badprop'");

        err(() => {
            expect(decFn, "blah").to.decrease({}, "badprop");
        }, "blah: expected {} to have property 'badprop'");

        err(() => {
            expect(decFn, "blah").to.decrease({});
        }, "blah: expected {} to be a function");

        err(() => {
            expect(decFn).to.decrease(obj, "noop", "blah");
        }, "blah: expected null to be a number");

        err(() => {
            expect(decFn, "blah").to.decrease(obj, "noop");
        }, "blah: expected null to be a number");

        err(() => {
            expect(decFn).to.decrease(obj, "value").by(10, "blah");
        }, "blah: expected .value to decrease by 10");

        err(() => {
            expect(decFn, "blah").to.decrease(obj, "value").by(10);
        }, "blah: expected .value to decrease by 10");

        err(() => {
            expect(decFn).to.decrease(obj, "value").but.not.by(3, "blah");
        }, "blah: expected .value to not decrease by 3");
    });

    it("extensible", () => {
        const nonExtensibleObject = Object.preventExtensions({});

        expect({}).to.be.extensible;
        expect(nonExtensibleObject).to.not.be.extensible;

        err(() => {
            expect(nonExtensibleObject, "blah").to.be.extensible;
        }, "blah: expected {} to be extensible");

        err(() => {
            expect({}).to.not.be.extensible;
        }, "expected {} to not be extensible");

        // Making sure ES6-like Object.isExtensible response is respected for all primitive types

        expect(42).to.not.be.extensible;
        expect(null).to.not.be.extensible;
        expect("foo").to.not.be.extensible;
        expect(false).to.not.be.extensible;
        expect(undefined).to.not.be.extensible;

        if (is.function(Symbol)) {
            expect(Symbol()).to.not.be.extensible;
        }

        err(() => {
            expect(42).to.be.extensible;
        }, "expected 42 to be extensible");

        err(() => {
            expect(null).to.be.extensible;
        }, "expected null to be extensible");

        err(() => {
            expect("foo").to.be.extensible;
        }, "expected 'foo' to be extensible");

        err(() => {
            expect(false).to.be.extensible;
        }, "expected false to be extensible");

        err(() => {
            expect(undefined).to.be.extensible;
        }, "expected undefined to be extensible");

        if (is.function(Proxy)) {
            const proxy = new Proxy({}, {
                isExtensible() {
                    throw new TypeError();
                }
            });

            err(() => {
                // .extensible should not suppress errors, thrown in proxy traps
                expect(proxy).to.be.extensible;
            }, { name: "TypeError" }, true);
        }
    });

    it("sealed", () => {
        const sealedObject = Object.seal({});

        expect(sealedObject).to.be.sealed;
        expect({}).to.not.be.sealed;

        err(() => {
            expect({}, "blah").to.be.sealed;
        }, "blah: expected {} to be sealed");

        err(() => {
            expect(sealedObject).to.not.be.sealed;
        }, "expected {} to not be sealed");

        // Making sure ES6-like Object.isSealed response is respected for all primitive types

        expect(42).to.be.sealed;
        expect(null).to.be.sealed;
        expect("foo").to.be.sealed;
        expect(false).to.be.sealed;
        expect(undefined).to.be.sealed;

        if (is.function(Symbol)) {
            expect(Symbol()).to.be.sealed;
        }

        err(() => {
            expect(42).to.not.be.sealed;
        }, "expected 42 to not be sealed");

        err(() => {
            expect(null).to.not.be.sealed;
        }, "expected null to not be sealed");

        err(() => {
            expect("foo").to.not.be.sealed;
        }, "expected 'foo' to not be sealed");

        err(() => {
            expect(false).to.not.be.sealed;
        }, "expected false to not be sealed");

        err(() => {
            expect(undefined).to.not.be.sealed;
        }, "expected undefined to not be sealed");

        if (is.function(Proxy)) {
            const proxy = new Proxy({}, {
                ownKeys() {
                    throw new TypeError();
                }
            });

            // Object.isSealed will call ownKeys trap only if object is not extensible
            Object.preventExtensions(proxy);

            err(() => {
                // .sealed should not suppress errors, thrown in proxy traps
                expect(proxy).to.be.sealed;
            }, { name: "TypeError" }, true);
        }
    });

    it("frozen", () => {
        const frozenObject = Object.freeze({});

        expect(frozenObject).to.be.frozen;
        expect({}).to.not.be.frozen;

        err(() => {
            expect({}, "blah").to.be.frozen;
        }, "blah: expected {} to be frozen");

        err(() => {
            expect(frozenObject).to.not.be.frozen;
        }, "expected {} to not be frozen");

        // Making sure ES6-like Object.isFrozen response is respected for all primitive types

        expect(42).to.be.frozen;
        expect(null).to.be.frozen;
        expect("foo").to.be.frozen;
        expect(false).to.be.frozen;
        expect(undefined).to.be.frozen;

        if (is.function(Symbol)) {
            expect(Symbol()).to.be.frozen;
        }

        err(() => {
            expect(42).to.not.be.frozen;
        }, "expected 42 to not be frozen");

        err(() => {
            expect(null).to.not.be.frozen;
        }, "expected null to not be frozen");

        err(() => {
            expect("foo").to.not.be.frozen;
        }, "expected 'foo' to not be frozen");

        err(() => {
            expect(false).to.not.be.frozen;
        }, "expected false to not be frozen");

        err(() => {
            expect(undefined).to.not.be.frozen;
        }, "expected undefined to not be frozen");

        if (is.function(Proxy)) {
            const proxy = new Proxy({}, {
                ownKeys() {
                    throw new TypeError();
                }
            });

            // Object.isFrozen will call ownKeys trap only if object is not extensible
            Object.preventExtensions(proxy);

            err(() => {
                // .frozen should not suppress errors, thrown in proxy traps
                expect(proxy).to.be.frozen;
            }, { name: "TypeError" }, true);
        }
    });
});
