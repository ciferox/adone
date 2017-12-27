const {
    datastore: { backend: { Memory } }
} = adone;

describe("datastore", "backend", "Memory", () => {
    describe("interface", () => {
        require("../interface")({
            setup(callback) {
                callback(null, new Memory());
            },
            teardown(callback) {
                callback();
            }
        });
    });
});
