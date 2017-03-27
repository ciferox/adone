/* global describe it */

const { BSON } = adone.data.bson;
const { assert } = adone.std;

function createBSON() {
    return new BSON();
}

describe("bson", () => {
    describe("detect cyclic dependency", () => {
        it("Should correctly detect cyclic dependency in nested objects", function () {
            // Force cyclic dependency
            const a = { b: {} };
            a.b.c = a;
            try {
                // Attempt to serialize cyclic dependency
                const serialized_data = createBSON().serialize(a);
            } catch (err) {
                assert.equal("cyclic dependency detected", err.message);
            }
        });

        /**
         * @ignore
         */
        it("Should correctly detect cyclic dependency in deeploy nested objects", function () {
            // Force cyclic dependency
            const a = { b: { c: [{ d: {} }] } };
            a.b.c[0].d.a = a;

            try {
                // Attempt to serialize cyclic dependency
                const serialized_data = createBSON().serialize(a);
            } catch (err) {
                assert.equal("cyclic dependency detected", err.message);
            }
        });

        /**
         * @ignore
         */
        it("Should correctly detect cyclic dependency in nested array", function () {
            // Force cyclic dependency
            const a = { b: {} };
            a.b.c = [a];
            try {
                // Attempt to serialize cyclic dependency
                const serialized_data = createBSON().serialize(a);
            } catch (err) {
                assert.equal("cyclic dependency detected", err.message);
            }
        });
    });
});