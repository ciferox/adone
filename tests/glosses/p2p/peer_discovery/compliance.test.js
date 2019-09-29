const tests = require("./interface");
const MockDiscovery = require("./mock_discovery");

describe("compliance tests", () => {
    tests({
        async setup() {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return new MockDiscovery();
        },
        async teardown() {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    });
});
