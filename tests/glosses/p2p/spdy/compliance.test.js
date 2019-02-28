const tests = require("../interface_stream_muxer");

const {
    p2p: { spdy }
} = adone;

describe("compliance", () => {
    tests({
        setup(cb) {
            cb(null, spdy);
        },
        teardown(cb) {
            cb();
        }
    });
});
