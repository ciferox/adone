const {
    data: { bson2 }
} = adone;

describe("data", "bson", "Cyclic Dependencies", () => {
    it("Should correctly detect cyclic dependency in nested objects", (done) => {
        // Force cyclic dependency
        const a = { b: {} };
        a.b.c = a;
        try {
            // Attempt to serialize cyclic dependency
            bson2.encode(a);
        } catch (err) {
            expect("cyclic dependency detected").to.equal(err.message);
        }

        done();
    });

    it("Should correctly detect cyclic dependency in deeploy nested objects", (done) => {
        // Force cyclic dependency
        const a = { b: { c: [{ d: {} }] } };
        a.b.c[0].d.a = a;

        try {
            // Attempt to serialize cyclic dependency
            bson2.encode(a);
        } catch (err) {
            expect("cyclic dependency detected").to.equal(err.message);
        }

        done();
    });

    it("Should correctly detect cyclic dependency in nested array", (done) => {
        // Force cyclic dependency
        const a = { b: {} };
        a.b.c = [a];
        try {
            // Attempt to serialize cyclic dependency
            bson2.encode(a);
        } catch (err) {
            expect("cyclic dependency detected").to.equal(err.message);
        }

        done();
    });
});
