const {
    data: { bson: BSON }
} = adone;

describe("Cyclic Dependencies", () => {
    /**
     * @ignore
     */
    it("Should correctly detect cyclic dependency in nested objects", (done) => {
        // Force cyclic dependency
        const a = { b: {} };
        a.b.c = a;
        try {
            // Attempt to serialize cyclic dependency
            BSON.serialize(a);
        } catch (err) {
            expect("cyclic dependency detected").to.equal(err.message);
        }

        done();
    });

    /**
     * @ignore
     */
    it("Should correctly detect cyclic dependency in deeploy nested objects", (done) => {
        // Force cyclic dependency
        const a = { b: { c: [{ d: {} }] } };
        a.b.c[0].d.a = a;

        try {
            // Attempt to serialize cyclic dependency
            BSON.serialize(a);
        } catch (err) {
            expect("cyclic dependency detected").to.equal(err.message);
        }

        done();
    });

    /**
     * @ignore
     */
    it("Should correctly detect cyclic dependency in nested array", (done) => {
        // Force cyclic dependency
        const a = { b: {} };
        a.b.c = [a];
        try {
            // Attempt to serialize cyclic dependency
            BSON.serialize(a);
        } catch (err) {
            expect("cyclic dependency detected").to.equal(err.message);
        }

        done();
    });
});
