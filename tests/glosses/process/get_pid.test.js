const {
    is
} = adone;

describe("process", "pids by ports", () => {
    const {
        net: { util: { getPort } },
        process: { getPidByPort, getPidsByPorts, getAllPidsByPorts },
        std: { http }
    } = adone;

    const srv = () => http.createServer((req, res) => {
        res.end();
    });

    it("success", async () => {
        const port = await getPort();
        const server = srv().listen(port);
        assert.ok(await getPidByPort(port));
        server.close();
    });

    it("fail", async () => {
        await assert.throws(async () => getPidByPort(0));
        await assert.throws(async () => getPidsByPorts([0]));
    });

    it("accepts a number", async () => {
        await assert.throws(async () => getPidByPort("foo"), "Expected a number, got string");
    });

    it("all", async () => {
        const [p1, p2] = await Promise.all([getPort(), getPort()]);
        const [s1, s2] = [srv().listen(p1), srv().listen(p2)];
        const ports = await getPidsByPorts([p1, p2]);

        assert.isTrue(ports instanceof Map);

        for (const x of ports.values()) {
            assert.equal(typeof x, "number");
        }

        s1.close();
        s2.close();
    });

    it("list", async () => {
        const list = await getAllPidsByPorts();
        assert.isTrue(list instanceof Map);
        await getPidsByPorts(Array.from(list.keys()));
    });
});
