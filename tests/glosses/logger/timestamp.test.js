const { sink, once } = require("./helper");

describe("timestamp", () => {
    it("pino exposes standard time functions", async () => {
        assert.ok(adone.logger.stdTimeFunctions);
        assert.ok(adone.logger.stdTimeFunctions.epochTime);
        assert.ok(adone.logger.stdTimeFunctions.unixTime);
        assert.ok(adone.logger.stdTimeFunctions.nullTime);
    });
    
    it("pino accepts external time functions", async () => {
        const opts = {
            timestamp: () => ',"time":"none"'
        };
        const stream = sink();
        const instance = adone.logger(opts, stream);
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.equal(result.hasOwnProperty("time"), true);
        assert.equal(result.time, "none");
    });
    
    it("inserts timestamp by default", async () => {
        const stream = sink();
        const instance = adone.logger(stream);
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.equal(result.hasOwnProperty("time"), true);
        assert.ok(new Date(result.time) <= new Date(), "time is greater than timestamp");
        assert.equal(result.msg, "foobar");
    });
    
    it("omits timestamp when timestamp option is false", async () => {
        const stream = sink();
        const instance = adone.logger({ timestamp: false }, stream);
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.equal(result.hasOwnProperty("time"), false);
        assert.equal(result.msg, "foobar");
    });
    
    it("inserts timestamp when timestamp option is true", async () => {
        const stream = sink();
        const instance = adone.logger({ timestamp: true }, stream);
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.equal(result.hasOwnProperty("time"), true);
        assert.ok(new Date(result.time) <= new Date(), "time is greater than timestamp");
        assert.equal(result.msg, "foobar");
    });
    
    it("child inserts timestamp by default", async () => {
        const stream = sink();
        const logger = adone.logger(stream);
        const instance = logger.child({ component: "child" });
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.equal(result.hasOwnProperty("time"), true);
        assert.ok(new Date(result.time) <= new Date(), "time is greater than timestamp");
        assert.equal(result.msg, "foobar");
    });
    
    it("child omits timestamp with option", async () => {
        const stream = sink();
        const logger = adone.logger({ timestamp: false }, stream);
        const instance = logger.child({ component: "child" });
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.equal(result.hasOwnProperty("time"), false);
        assert.equal(result.msg, "foobar");
    });
    
    it("adone.logger.stdTimeFunctions.unixTime returns seconds based timestamps", async () => {
        const opts = {
            timestamp: adone.logger.stdTimeFunctions.unixTime
        };
        const stream = sink();
        const instance = adone.logger(opts, stream);
        const now = Date.now;
        Date.now = () => 1531069919686;
        instance.info("foobar");
        const result = await once(stream, "data");
        assert.equal(result.hasOwnProperty("time"), true);
        assert.equal(result.time, 1531069920);
        Date.now = now;
    });    
});
