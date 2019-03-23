const {
    js: { compiler: { types: t } }
} = adone;

describe("asserts", () => {
    const consoleTrace = console.trace;

    beforeEach(() => {
        console.trace = () => { };
    });

    afterEach(() => {
        console.trace = consoleTrace;
    });

    Object.keys(t).forEach((k) => {
        if (k.startsWith("assert") && k !== "assertNode") {
            const nodeType = k.replace("assert", "");

            it(nodeType, () => {
                expect(() => {
                    t[k]({ type: "FlavorTownDeclaration" }, {});
                }).to.throw(
                    `Expected type "${nodeType}" with option {}, but instead got "FlavorTownDeclaration".`,
                );
            });
        }
    });
});
