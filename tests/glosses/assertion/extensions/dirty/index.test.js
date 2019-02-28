const {
    assertion
} = adone;
const { expect, extension } = assertion;

describe("assertion", "interface", "dirty", () => {
    assertion
        .use(extension.promise)
        .use(extension.dirty);
    
    const shouldFail = (func, msg) => {
        expect(func).to.throw(msg);
    };

    describe("ok", () => {
        describe("when true expression", () => {
            it("should not assert function", () => {
                expect(true).to.be.ok();
            });

            it("should not assert property", () => {
                expect(true).to.be.ok.and.not.equal(false);
            });

            it("should not assert another chain conversion", () => {
                expect(true).to.be.ok.and.not.false();
            });

            it("should not assert with ensure", () => {
                expect(true).to.be.ok.ensure();
                expect(true).to.be.ok.not.ensure();
            });

            it("should work with should", () => {
                expect(true).to.be.true.and.not.false();
            });
        });


        describe("when false expression", () => {
            it("should assert non-function at chain end", () => {
                const assertion = expect(true).to.not.be.ok.and.not;
                shouldFail(() => {
                    assertion.equal.call(assertion, false);
                }, /expected true to be falsy/);
            });

            it("should assert with custom message at chain end", () => {
                expect(() => {
                    expect(true).to.not.be.false.and.be.ok("true is not ok");
                }).to.throw(/true is not ok/);
            });

            it("should assert function mid-chain", () => {
                expect(() => {
                    expect(true).to.not.be.ok().and.not.equal(false);
                }).to.throw(/expected true to be falsy/);
            });

            it("should assert with custom message mid-chain", () => {
                expect(() => {
                    expect(true).to.not.be.ok("true is not ok").and.not.equal(false);
                }).to.throw(/true is not ok/);
            });

            it("should assert with custom message of terminating assert", () => {
                expect(() => {
                    expect(true).to.be.ok.and.not.equal(true, "true is not ok");
                }).to.throw(/true is not ok/);
            });

            it("should assert with ensure", () => {
                expect(() => {
                    expect(true).to.not.be.ok.ensure();
                }).to.throw(/expected true to be falsy/);
            });
        });

    });

    describe("immutable properties", () => {
        describe("length", () => {
            it("should successfully assert length early in the chain", () => {
                expect([1]).to.have.length(1);
            });

            it("should assert wrong length", () => {
                expect(() => {
                    expect([1, 1, 2, 3, 5]).to.have.length(33);
                }).to.throw();
            });
        });

        describe("arguments", () => {
            it("should successfully assert arguments early in the chain", () => {
                // eslint-disable-next-line func-style
                function testFunc() {
                    expect(arguments).to.be.arguments();
                }
                testFunc("Err, param!");
            });

            it("should assert on non-arguments", () => {
                expect(() => {
                    let o = {};
                    expect(o).to.be.arguments();
                }).to.throw();
            });
        });

    });

    describe("when plugin creates new property", () => {
        let stubCalled;

        beforeEach(() => {
            stubCalled = false;

            assertion.use((lib, util) => {
                lib.Assertion.addProperty("neverFail", function () {
                    this.assert(true === true); stubCalled = true;
                });
                lib.Assertion.addProperty("flagelate", function () {
                    util.flag(this, "legfree", true);
                });
            });
        });

        it("should convert property to a chainable method", () => {
            const prop = Object.getOwnPropertyDescriptor(assertion.Assertion.prototype, "neverFail");
            expect(new assertion.Assertion({})).to.have.a.property("neverFail").and.be.a("function");
            expect(prop).to.have.property("get").and.be.a("function");
            expect((new assertion.Assertion({}).neverFail)).to.be.a("function");
        });

        it("should call assertion", () => {
            expect(true).to.neverFail();

            expect(stubCalled).to.be.true();
        });
    });

    describe("compatibility with chai-as-promised", () => {
        it("should pass with resolved promise", () => {
            return expect(Promise.resolve(true)).to.eventually.be.true();
        });

        it("should pass with rejected promise", () => {
            const err = new Error("foo");
            err.name = "bar";
            return expect(Promise.reject(err)).to.eventually
                .be.rejectedWith(Error)
                .and.to.have.property("name", "bar");
        });
    });
});
