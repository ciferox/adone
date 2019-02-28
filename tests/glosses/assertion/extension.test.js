import "./bootstrap";

const {
    assertion
} = adone;

describe("assertion", "extension", () => {
    const ext = function (lib) {
        if (lib.Assertion.prototype.testing) {
            return;
        }

        Object.defineProperty(lib.Assertion.prototype, "testing", {
            get() {
                return "successful";
            }
        });
    };

    it("basic usage", () => {
        assertion.use(ext);
        const expect = assertion.expect;
        expect(expect("").testing).to.equal("successful");
    });

    it("double plugin", () => {
        assertion.expect(() => {
            assertion.use(ext);
        }).to.not.throw();
    });

    it(".use detached from assertion object", () => {
        const anotherExt = function (lib) {
            Object.defineProperty(lib.Assertion.prototype, "moreTesting", {
                get() {
                    return "more success";
                }
            });
        };

        const use = assertion.use;
        use(anotherExt);

        const expect = assertion.expect;
        expect(expect("").moreTesting).to.equal("more success");
    });
});
