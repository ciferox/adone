const logLine = '{"level":30,"time":1522431328992,"msg":"hello world","pid":42,"hostname":"foo","v":1}\n';

describe("pretty", "crlf", () => {
    it("uses LF by default", () => {
        const pretty = adone.logger.pretty();
        const formatted = pretty(logLine);
        assert.equal(formatted.substr(-2), "d\n");
    });

    it("can use CRLF", () => {
        const pretty = adone.logger.pretty({ crlf: true });
        const formatted = pretty(logLine);
        assert.equal(formatted.substr(-3), "d\r\n");
    });
});
