const ErrorStackParser = require("error-stack-parser");

const {
    error: { errno }
} = adone;

describe("error", "errno", () => {
    it("sanity checks", () => {
        assert.ok(errno.all, "errno.all not found");
        assert.ok(errno.errno, "errno.errno not found");
        assert.ok(errno.code, "errno.code not found");

        assert.equal(errno.all.length, 60, `found ${errno.all.length}, expected 60`);
        assert.equal(errno.errno["-1"], errno.all[1], "errno -1 not second element");

        assert.equal(errno.code.UNKNOWN, errno.all[1], "code UNKNOWN not second element");

        assert.equal(errno.errno[1], errno.all[3], "errno 1 not fourth element");

        assert.equal(errno.code.EOF, errno.all[3], "code EOF not fourth element");
    });
});
