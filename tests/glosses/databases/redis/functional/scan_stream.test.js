import check from "../helpers/check_redis";
import MockServer from "../helpers/mock_server";

describe("database", "redis", "scanStream", { skip: check }, () => {
    const { database: { redis: { Redis, Cluster } } } = adone;
    const { std: { stream: { Readable } } } = adone;

    afterEach((done) => {
        const redis = new Redis();
        redis.flushall(() => {
            redis.script("flush", () => {
                redis.disconnect();
                done();
            });
        });
    });

    describe("scanStream", () => {
        it("should return a readable stream", () => {
            const redis = new Redis();
            const stream = redis.scanStream();
            expect(stream instanceof Readable).to.eql(true);
            redis.disconnect();
        });

        it("should iterate all keys", (done) => {
            let keys = [];
            const redis = new Redis();
            redis.mset("foo1", 1, "foo2", 1, "foo3", 1, "foo4", 1, "foo10", 1, () => {
                const stream = redis.scanStream();
                stream.on("data", (data) => {
                    keys = keys.concat(data);
                });
                stream.on("end", () => {
                    expect(keys.sort()).to.eql(["foo1", "foo10", "foo2", "foo3", "foo4"]);
                    redis.disconnect();
                    done();
                });
            });
        });

        it("should recognize `MATCH`", (done) => {
            let keys = [];
            const redis = new Redis();
            redis.mset("foo1", 1, "foo2", 1, "foo3", 1, "foo4", 1, "foo10", 1, () => {
                const stream = redis.scanStream({
                    match: "foo??"
                });
                stream.on("data", (data) => {
                    keys = keys.concat(data);
                });
                stream.on("end", () => {
                    expect(keys).to.eql(["foo10"]);
                    redis.disconnect();
                    done();
                });
            });
        });

        it("should recognize `COUNT`", (done) => {
            let keys = [];
            const redis = new Redis();
            stub(Redis.prototype, "scan").callsFake(function (..._args) {
                let count;
                const [args] = _args;
                for (let i = 0; i < args.length; ++i) {
                    if (typeof args[i] === "string" && args[i].toUpperCase() === "COUNT") {
                        count = args[i + 1];
                        break;
                    }
                }
                Redis.prototype.scan.restore();
                Redis.prototype.scan.apply(this, _args);
                expect(count).to.eql(2);
            });
            redis.mset("foo1", 1, "foo2", 1, "foo3", 1, "foo4", 1, "foo10", 1, () => {
                const stream = redis.scanStream({
                    count: 2
                });
                stream.on("data", (data) => {
                    keys = keys.concat(data);
                });
                stream.on("end", () => {
                    expect(keys.sort()).to.eql(["foo1", "foo10", "foo2", "foo3", "foo4"]);
                    redis.disconnect();
                    done();
                });
            });
        });

        it("should emit an error when connection is down", (done) => {
            let keys = [];
            const redis = new Redis();
            redis.mset("foo1", 1, "foo2", 1, "foo3", 1, "foo4", 1, "foo10", 1, () => {
                redis.disconnect();
                const stream = redis.scanStream({ count: 1 });
                stream.on("data", (data) => {
                    keys = keys.concat(data);
                });
                stream.on("error", (err) => {
                    expect(err.message).to.eql("Connection is closed.");
                    redis.disconnect();
                    done();
                });
            });
        });
    });

    describe("scanBufferStream", () => {
        it("should return buffer", (done) => {
            let keys = [];
            const redis = new Redis({ dropBufferSupport: false });
            redis.mset("foo1", 1, "foo2", 1, "foo3", 1, "foo4", 1, "foo10", 1, () => {
                const stream = redis.scanBufferStream();
                stream.on("data", (data) => {
                    keys = keys.concat(data);
                });
                stream.on("end", () => {
                    expect(keys.sort()).to.eql([new Buffer("foo1"), new Buffer("foo10"),
                        new Buffer("foo2"), new Buffer("foo3"), new Buffer("foo4")]);
                    redis.disconnect();
                    done();
                });
            });
        });
    });

    describe("sscanStream", () => {
        it("should iterate all values in the set", (done) => {
            let keys = [];
            const redis = new Redis();
            redis.sadd("set", "foo1", "foo2", "foo3", "foo4", "foo10", () => {
                const stream = redis.sscanStream("set", { match: "foo??" });
                stream.on("data", (data) => {
                    keys = keys.concat(data);
                });
                stream.on("end", () => {
                    expect(keys).to.eql(["foo10"]);
                    redis.disconnect();
                    done();
                });
            });
        });
    });

    describe("Cluster", () => {
        it("should work in cluster mode", (done) => {
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

            let keys = [];
            cluster.sadd("set", serverKeys, () => {
                const stream = cluster.sscanStream("set");
                stream.on("data", (data) => {
                    keys = keys.concat(data);
                });
                stream.on("end", () => {
                    expect(keys).to.eql(serverKeys);
                    cluster.disconnect();
                    disconnect([node1, node2, node3], done);
                });
            });

        });
    });
});

function disconnect(clients, callback) {
    let pending = 0;

    for (let i = 0; i < clients.length; ++i) {
        pending += 1;
        clients[i].disconnect(check);
    }

    function check() {
        if (!--pending && callback) {
            callback();
        }
    }
}
