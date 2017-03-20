const { assertion } = adone;

assertion.loadExpectInterface();

describe("plugins", function () {

    function plugin(assertion) {
        if (assertion.Assertion.prototype.testing) return;

        Object.defineProperty(assertion.Assertion.prototype, "testing", {
            get() {
                return "successful";
            }
        });
    }

    it("basic usage", function () {
        assertion.use(plugin);
        const expect = assertion.expect;
        expect(expect("").testing).to.equal("successful");
    });

    it("double plugin", function () {
        assertion.expect(function () {
            assertion.use(plugin);
        }).to.not.throw();
    });

    it(".use detached from assertion object", function () {
        function anotherPlugin(assertion) {
            Object.defineProperty(assertion.Assertion.prototype, "moreTesting", {
                get() {
                    return "more success";
                }
            });
        }

        const use = assertion.use;
        use(anotherPlugin);

        const expect = assertion.expect;
        expect(expect("").moreTesting).to.equal("more success");
    });
});
