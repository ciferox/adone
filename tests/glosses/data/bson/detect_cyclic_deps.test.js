describe("data", "bson", "detect cyclic dependency", () => {
    const { data: { bson: { BSON } } } = adone;

    it("should correctly detect cyclic dependency in nested objects", () => {
        // Force cyclic dependency
        const a = { b: {} };
        a.b.c = a;
        try {
            // Attempt to serialize cyclic dependency
            new BSON().serialize(a);
            throw new Error();
        } catch (err) {
            assert.equal("cyclic dependency detected", err.message);
        }
    });

    /**
     * @ignore
     */
    it("should correctly detect cyclic dependency in deeploy nested objects", () => {
        // Force cyclic dependency
        const a = { b: { c: [{ d: {} }] } };
        a.b.c[0].d.a = a;

        try {
            // Attempt to serialize cyclic dependency
            new BSON().serialize(a);
            throw new Error();
        } catch (err) {
            assert.equal("cyclic dependency detected", err.message);
        }
    });

    /**
     * @ignore
     */
    it("should correctly detect cyclic dependency in nested array", () => {
        // Force cyclic dependency
        const a = { b: {} };
        a.b.c = [a];
        try {
            // Attempt to serialize cyclic dependency
            new BSON().serialize(a);
            throw new Error();
        } catch (err) {
            assert.equal("cyclic dependency detected", err.message);
        }
    });
});
