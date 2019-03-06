const {
    datastore2: { backend: { MemoryDatastore } }
} = adone;

describe("datastore", "backend", "MemoryDatastore", () => {
    describe("interface", () => {
        require("./interface")({
            setup(callback) {
                callback(null, new MemoryDatastore());
            },
            teardown(callback) {
                callback();
            }
        });
    });
});
