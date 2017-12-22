import check from "../helpers/check_redis";
import MockServer from "../helpers/mock_server";

describe("database", "redis", "scanStream", { skip: check }, () => {
    const { is, stream: { core }, database: { redis: { Redis, Cluster } } } = adone;
    const { std: { stream: { Readable } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    describe("scanStream", () => {
        it("should return a readable stream", () => {
            const redis = new Redis();
            const stream = redis.scanStream();
            expect(stream instanceof Readable).to.be.true();
            redis.disconnect();
        });

        it("should iterate all keys", async () => {
            const redis = new Redis();
            await redis.mset("foo1", 1, "foo2", 1, "foo3", 1, "foo4", 1, "foo10", 1);
            const stream = redis.scanStream();
            const keys = await stream.pipe(core()).flatten();
            expect(keys.sort()).to.be.deep.equal(["foo1", "foo10", "foo2", "foo3", "foo4"]);
            redis.disconnect();
        });

        it("should recognize `MATCH`", async () => {
            const redis = new Redis();
            await redis.mset("foo1", 1, "foo2", 1, "foo3", 1, "foo4", 1, "foo10", 1);
            const stream = redis.scanStream({
                match: "foo??"
            });
            const keys = await stream.pipe(core()).flatten();
            expect(keys).to.be.deep.equal(["foo10"]);
            redis.disconnect();
        });

        it("should recognize `COUNT`", async () => {
            const redis = new Redis();
            stub(Redis.prototype, "scan").callsFake(function (..._args) {
                let count;
                const [args] = _args;
                for (let i = 0; i < args.length; ++i) {
                    if (is.string(args[i]) && args[i].toUpperCase() === "COUNT") {
                        count = args[i + 1];
                        break;
                    }
                }
                Redis.prototype.scan.restore();
                expect(count).to.be.equal(2);
                return Redis.prototype.scan.apply(this, _args);
            });
            await redis.mset("foo1", 1, "foo2", 1, "foo3", 1, "foo4", 1, "foo10", 1);
            const stream = redis.scanStream({
                count: 2
            });
            const keys = await stream.pipe(core()).flatten();
            expect(keys.sort()).to.be.deep.equal(["foo1", "foo10", "foo2", "foo3", "foo4"]);
            redis.disconnect();
        });

        it("should emit an error when connection is down", async () => {
            const redis = new Redis();
            await redis.mset("foo1", 1, "foo2", 1, "foo3", 1, "foo4", 1, "foo10", 1);
            redis.disconnect();
            const stream = redis.scanStream({ count: 1 });
            const onError = spy();
            stream.on("error", onError);
            stream.resume();
            await onError.waitForCall();
            expect(onError).to.have.been.calledWith(match((err) => err.message.includes("Connection is closed")));
        });
    });

    describe("scanBufferStream", () => {
        it("should return buffer", async () => {
            const redis = new Redis({ dropBufferSupport: false });
            await redis.mset("foo1", 1, "foo2", 1, "foo3", 1, "foo4", 1, "foo10", 1);
            const stream = redis.scanBufferStream();
            const keys = await stream.pipe(core()).flatten();
            expect(keys.sort()).to.be.deep.equal(["foo1", "foo10", "foo2", "foo3", "foo4"].map(Buffer.from));
            redis.disconnect();
        });
    });

    describe("sscanStream", () => {
        it("should iterate all values in the set", async () => {
            const redis = new Redis();
            await redis.sadd("set", "foo1", "foo2", "foo3", "foo4", "foo10");
            const stream = redis.sscanStream("set", { match: "foo??" });
            expect(await stream.pipe(core()).flatten()).to.be.deep.equal(["foo10"]);
            redis.disconnect();
        });
    });

    describe("Cluster", () => {
        it("should work in cluster mode", async () => {
            const slotTable = [
                [0, 5460, ["127.0.0.1", 30001]],
                [5461, 10922, ["127.0.0.1", 30002]],
                [10923, 16383, ["127.0.0.1", 30003]]
            ];
            const serverKeys = ["foo1", "foo2", "foo3", "foo4", "foo10"];
            const argvHandler = function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "sscan" && argv[1] === "set") {
                    const cursor = Number(argv[2]);
                    if (cursor >= serverKeys.length) {
                        return ["0", []];
                    }
                    return [String(cursor + 1), [serverKeys[cursor]]];
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);
            const node3 = new MockServer(30003, argvHandler);

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            await cluster.sadd("set", serverKeys);
            const stream = cluster.sscanStream("set");
            expect(await stream.pipe(core()).flatten()).to.be.deep.equal(serverKeys);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
            await node3.disconnect();
        });
    });
});
