const sinon = require("sinon");
const { assertion } = adone;
const { expect, AssertionError } = assertion;
import { swallow } from "./common";

describe("Throwing", () => {
    describe("thrown()", () => {
        it("should throw an assertion error if the spy does not throw at all", () => {
            const spy = sinon.spy(() => { /* Contents don't matter */ });

            spy();

            expect(() => {
                expect(spy).to.have.thrown();
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown();
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy throws", () => {
            const spy = sinon.spy(() => {
                throw new Error();
            });

            swallow(spy);

            expect(() => {
                expect(spy).to.have.thrown();
            }).to.not.throw();
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown();
            }).to.not.throw();
        });

        it("should not throw if the spy throws once but not the next time", () => {
            var spy = sinon.spy(() => {
                if (!(spy.callCount > 1)) {
                    throw new Error();
                }
            });

            swallow(spy);
            swallow(spy);

            expect(() => {
                expect(spy).to.have.thrown();
            }).to.not.throw();
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown();
            }).to.not.throw();
        });
    });

    describe("thrown(errorObject)", () => {
        let error = null;

        beforeEach(() => {
            error = new Error("boo!");
        });

        it("should throw an assertion error if the spy does not throw at all", () => {
            const spy = sinon.spy(() => { /* Contents don't matter */ });

            spy();

            expect(() => {
                expect(spy).to.have.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown(error);
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy throws the wrong error", () => {
            const spy = sinon.spy(() => {
                return new Error("eek!");
            });

            swallow(spy);

            expect(() => {
                expect(spy).to.have.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown(error);
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy throws", () => {
            const spy = sinon.spy(() => {
                throw error;
            });

            swallow(spy);

            expect(() => {
                expect(spy).to.have.thrown(error);
            }).to.not.throw();
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown(error);
            }).to.not.throw();
        });

        it("should not throw if the spy throws once but not the next time", () => {
            var spy = sinon.spy(() => {
                if (!(spy.callCount > 1)) {
                    throw error;
                }
            });

            swallow(spy);
            swallow(spy);

            expect(() => {
                expect(spy).to.have.thrown(error);
            }).to.not.throw();
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown(error);
            }).to.not.throw();
        });
    });

    describe("thrown(errorTypeString)", () => {
        let error = null;

        beforeEach(() => {
            error = new TypeError("boo!");
        });

        it("should throw an assertion error if the spy does not throw at all", () => {
            const spy = sinon.spy(() => { /* Contents don't matter */ });

            spy();

            expect(() => {
                expect(spy).to.have.thrown("TypeError");
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown("TypeError");
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy throws the wrong type of error", () => {
            const spy = sinon.spy(() => {
                throw new Error("boo!");
            });

            swallow(spy);

            expect(() => {
                expect(spy).to.have.thrown("TypeError");
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown("TypeError");
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy throws the correct type of error", () => {
            const spy = sinon.spy(() => {
                throw new TypeError("eek!");
            });

            swallow(spy);

            expect(() => {
                expect(spy).to.have.thrown("TypeError");
            }).to.not.throw();
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown("TypeError");
            }).to.not.throw();
        });

        it("should not throw if the spy throws once but not the next time", () => {
            var spy = sinon.spy(() => {
                if (!(spy.callCount > 1)) {
                    throw error;
                }
            });

            swallow(spy);
            swallow(spy);

            expect(() => {
                expect(spy).to.have.thrown("TypeError");
            }).to.not.throw();
            expect(() => {
                expect(spy.getCall(0)).to.have.thrown("TypeError");
            }).to.not.throw();
        });
    });

    describe("always thrown", () => {
        let error = null;

        beforeEach(() => {
            error = new TypeError("boo!");
        });

        it("should throw an assertion error if the spy throws once but not the next time", () => {
            var spy = sinon.spy(() => {
                if (!(spy.callCount > 1)) {
                    throw error;
                }
            });

            swallow(spy);
            swallow(spy);

            expect(() => {
                expect(spy).to.have.always.thrown();
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.always.have.thrown();
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.always.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.always.have.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.always.thrown("TypeError");
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.always.have.thrown("TypeError");
            }).to.throw(AssertionError);
        });

        it("should throw an assertion error if the spy throws the wrong error the second time", () => {
            var spy = sinon.spy(() => {
                if (spy.callCount === 1) {
                    throw error;
                } else {
                    throw new Error();
                }
            });

            swallow(spy);
            swallow(spy);

            expect(() => {
                expect(spy).to.have.always.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.always.have.thrown(error);
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.have.always.thrown("TypeError");
            }).to.throw(AssertionError);
            expect(() => {
                expect(spy).to.always.have.thrown("TypeError");
            }).to.throw(AssertionError);
        });

        it("should not throw if the spy always throws the right error", () => {
            const spy = sinon.spy(() => {
                throw error;
            });

            swallow(spy);
            swallow(spy);

            expect(() => {
                expect(spy).to.have.always.thrown(error);
            }).to.not.throw();
            expect(() => {
                expect(spy).to.always.have.thrown(error);
            }).to.not.throw();
            expect(() => {
                expect(spy).to.have.always.thrown("TypeError");
            }).to.not.throw();
            expect(() => {
                expect(spy).to.always.have.thrown("TypeError");
            }).to.not.throw();
        });
    });
});
