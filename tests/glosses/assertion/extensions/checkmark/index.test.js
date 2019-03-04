const {
    assertion
} = adone;

describe("assertion", "extension", "checkmark", () => {
    const {
        expect,
        Assertion,
        AssertionError,
        extension: { checkmark }
    } = assertion;

    assertion.use(checkmark);

    it("should add a method to Assertion", () => {
        expect(Assertion).to.respondTo("check");
        expect(Assertion).to.respondTo("checks");
    });

    describe("Assertion#Check()", () => {
        it("should return a function with methods", () => {
            const subject = expect(1).check();

            expect(subject).to.be.a("function");

            expect(subject).itself.to.respondTo("getCount");
        });

        it("should accept only numbers greater than 0", () => {
            const subject = function (value) {
                return function () {
                    return expect(value).check();
                };
            };

            expect(subject(-1)).to.throw(AssertionError);
            expect(subject(0)).to.throw(AssertionError);
            expect(subject("wat")).to.throw(AssertionError);
            expect(subject(NaN)).to.throw(AssertionError);

            subject(1)();
            subject(10)();
            subject(100)();
        });

        it("should allow a callback function to be passed in", () => {
            const subject = function (callback) {
                return function () {
                    return expect(1).check(callback);
                };
            };

            expect(subject("wat")).to.throw(AssertionError);

            subject(() => { })();
        });
    });

    describe("Assertion#Mark()", () => {
        it("should increment the count", () => {
            const mark = expect(2).checks();

            expect(mark.getCount()).to.equal(0).mark();
            expect(mark.getCount()).to.equal(1).mark();
            expect(mark.getCount()).to.equal(2);
        });

        it("should throw an error if too many checks happened", () => {
            const subject = function () {
                return expect().mark();
            };

            expect(1).check();

            subject();
            expect(subject).to.throw(AssertionError);
        });
    });
});
