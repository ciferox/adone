const writer = require("flush-write-stream");

const {
    app: { fastLogger }
} = adone;

const capture = function () {
    const ws = writer((chunk, enc, cb) => {
        ws.data += chunk.toString();
        cb();
    });
    ws.data = "";
    return ws;
};

describe("app", "fast logger", "crlf", () => {
    it("pino uses LF by default", async () => {
        const stream = capture();
        const logger = fastLogger(stream);
        logger.info("foo");
        logger.error("bar");
        assert.ok(/foo[^\r\n]+\n[^\r\n]+bar[^\r\n]+\n/.test(stream.data));
    });
    
    it("pino can log CRLF", async () => {
        const stream = capture();
        const logger = fastLogger({
            crlf: true
        }, stream);
        logger.info("foo");
        logger.error("bar");
        assert.ok(/foo[^\n]+\r\n[^\n]+bar[^\n]+\r\n/.test(stream.data));
    });    
});
