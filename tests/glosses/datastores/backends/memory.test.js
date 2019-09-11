const {
    datastore: { backend: { MemoryDatastore } }
} = adone;

describe("datastore", "backend", "MemoryDatastore", () => {
    describe("interface", () => {
        require("./interface")({
            setup() {
                return new MemoryDatastore();
            },
            teardown() {
            }
        });
    });
});
