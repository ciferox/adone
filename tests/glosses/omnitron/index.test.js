const {
    omnitron,
    std: { path }
} = adone;

const fixture = (...args) => path.join(__dirname, "fixtures", ...args);

describe("omnitron", () => {
    it("omni-application cannot be execute directly", async () => {
        const err = await assert.throws(async () => forkProcess(fixture("direct_run")));
        assert.equal(err.code, 1);
        assert.match(err.stderr, /Omni-application cannot be launched directly/);
    });

    it.todo("run omni-application multiple times is not allowed", async () => {
        const err = await assert.throws(async () => forkProcess(fixture("multiple_run")));
        console.log(err.stderr);
        assert.equal(err.code, 2);
        assert.match(err.stderr, /Only one omni-application is allowed per process/);
    });
});
