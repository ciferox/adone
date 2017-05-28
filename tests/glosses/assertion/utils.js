const { assertion } = adone;
assertion.loadExpectInterface();
const { __: { util }, expect, AssertionError } = assertion;

export function err(fn, val) {
    if (util.type(fn) !== "function") {
        throw new AssertionError("Invalid fn");
    }

    try {
        fn();
    } catch (err) {
        switch (util.type(val).toLowerCase()) {
            case "undefined": return;
            case "string": return expect(err.message).to.equal(val);
            case "regexp": return expect(err.message).to.match(val);
            case "object": return Object.keys(val).forEach((key) => {
                expect(err).to.have.property(key).and.to.deep.equal(val[key]);
            });
        }

        throw new AssertionError("Invalid val");
    }

    throw new AssertionError("Expected an error");
}
