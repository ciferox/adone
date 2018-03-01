const {
    datastore: { backend: { Memory } }
} = adone;

describe("datastore", "backend", "Memory", () => {
    describe("interface", () => {
        require("../interface")({
            setup() {
                return new Memory();
            },
            teardown() {
            }
        });
    });
});
