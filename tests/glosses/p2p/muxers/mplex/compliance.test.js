const tests = require("../interface");

describe("compliance", () => {
    tests({
        setup: () => adone.p2p.muxer.mplex,
        teardown() { }
    });
});
