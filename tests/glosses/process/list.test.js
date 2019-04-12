const {
    is
} = adone;

describe("system", "process", "list processes", () => {
    const {
        process: { list }
    } = adone;

    it("list()", async () => {
        const binName = is.windows ? "node.exe" : "node";
        const result = await list();

        assert.isTrue(result.some((x) => x.name.includes(binName)));
        assert.isTrue(result.every((x) => is.number(x.pid) && is.string(x.name) && is.string(x.cmd)));

        (!is.windows) && assert.isTrue(result.every((x) => is.string(x.cpu)));
    });
});
