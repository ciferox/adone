const tests = require("../interface_stream_muxer");

const {
    p2p: { multiplex }
} = adone;

describe("compliance", () => {
    tests({
        setup(cb) {
            cb(null, multiplex);
        },
        teardown(cb) {
            cb();
        }
    });
});
