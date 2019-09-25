/**
 * eslint-env mocha
 */


const tests = require("interface-stream-muxer");
const multiplex = require("../src");

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
