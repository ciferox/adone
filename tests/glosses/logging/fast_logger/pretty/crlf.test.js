const {
    app: { fastLogger: { pretty } }
} = adone;

const logLine = '{"level":30,"time":1522431328992,"msg":"hello world","pid":42,"hostname":"foo","v":1}\n';

describe("app", "fastLogger", "pretty", "crlf", () => {
    it("uses LF by default", () => {
        const p = pretty();
        const formatted = p(logLine);
        assert.equal(formatted.substr(-2), "d\n");
    });

    it("can use CRLF", () => {
        const p = pretty({ crlf: true });
        const formatted = p(logLine);
        assert.equal(formatted.substr(-3), "d\r\n");
    });
});
