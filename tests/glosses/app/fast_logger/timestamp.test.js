const { sink, once } = require("./helper");

const {
    app: { fastLogger }
} = adone;

describe("fastLogger", "timestamp", () => {
    it("pino exposes standard time functions", async () => {
        assert.ok(fastLogger.stdTimeFunctions);
        assert.ok(fastLogger.stdTimeFunctions.epochTime);
        assert.ok(fastLogger.stdTimeFunctions.unixTime);
        assert.ok(fastLogger.stdTimeFunctions.nullTime);
    });
    
    it("pino accepts external time functions", async () => {
        const opts = {
            timestamp: () => ',"time":"none"'
        };
        const stream = sink();
        const instance = fastLogger(opts, stream);
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.true(result.hasOwnProperty("time"));
        assert.equal(result.time, "none");
    });
    
    it("inserts timestamp by default", async () => {
        const stream = sink();
        const instance = fastLogger(stream);
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.true(result.hasOwnProperty("time"));
        assert.ok(new Date(result.time) <= new Date(), "time is greater than timestamp");
        assert.equal(result.msg, "foobar");
    });
    
    it("omits timestamp when timestamp option is false", async () => {
        const stream = sink();
        const instance = fastLogger({ timestamp: false }, stream);
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.false(result.hasOwnProperty("time"));
        assert.equal(result.msg, "foobar");
    });
    
    it("inserts timestamp when timestamp option is true", async () => {
        const stream = sink();
        const instance = fastLogger({ timestamp: true }, stream);
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.true(result.hasOwnProperty("time"));
        assert.ok(new Date(result.time) <= new Date(), "time is greater than timestamp");
        assert.equal(result.msg, "foobar");
    });
    
    it("child inserts timestamp by default", async () => {
        const stream = sink();
        const logger = fastLogger(stream);
        const instance = logger.child({ component: "child" });
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.true(result.hasOwnProperty("time"));
        assert.ok(new Date(result.time) <= new Date(), "time is greater than timestamp");
        assert.equal(result.msg, "foobar");
    });
    
    it("child omits timestamp with option", async () => {
        const stream = sink();
        const logger = fastLogger({ timestamp: false }, stream);
        const instance = logger.child({ component: "child" });
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.false(result.hasOwnProperty("time"));
        assert.equal(result.msg, "foobar");
    });
    
    it("fastLogger.stdTimeFunctions.unixTime returns seconds based timestamps", async () => {
        const opts = {
            timestamp: fastLogger.stdTimeFunctions.unixTime
        };
        const stream = sink();
        const instance = fastLogger(opts, stream);
        const now = Date.now;
        Date.now = () => 1531069919686;
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.true(result.hasOwnProperty("time"));
        assert.equal(result.time, 1531069920);
        Date.now = now;
    });    
});
