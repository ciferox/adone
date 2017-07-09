import check from "../helpers/check_redis";
import MockServer from "../helpers/mock_server";

describe("database", "redis", "sentinel", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    describe("connect", () => {
        it("should connect to sentinel successfully", (done) => {
            const sentinel = new MockServer(27379);
            sentinel.once("connect", () => {
                redis.disconnect(); // eslint-disable-line no-use-before-define
                sentinel.disconnect().then(() => done());
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master"
            });

        });

        it("should default to the default sentinel port", (done) => {
            const sentinel = new MockServer(26379);
            sentinel.once("connect", () => {
                redis.disconnect(); // eslint-disable-line no-use-before-define
                sentinel.disconnect(done);
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1" }
                ],
                name: "master"
            });

        });

        it("should try to connect to all sentinel", (done) => {
            const sentinel = new MockServer(27380);
            sentinel.once("connect", () => {
                redis.disconnect(); // eslint-disable-line no-use-before-define
                sentinel.disconnect(done);
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" },
                    { host: "127.0.0.1", port: "27380" }
                ],
                name: "master"
            });
        });

        it("should call sentinelRetryStrategy when all sentinels are unreachable", (done) => {
            let t = 0;
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" },
                    { host: "127.0.0.1", port: "27380" }
                ],
                sentinelRetryStrategy(times) {
                    expect(times).to.be.equal(++t);
                    const sentinel = new MockServer(27380);
                    sentinel.once("connect", () => {
                        redis.disconnect();
                        sentinel.disconnect(done);
                    });
                    return 0;
                },
                name: "master"
            });
        });

        it("should raise error when all sentinel are unreachable and retry is disabled", async () => {
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" },
                    { host: "127.0.0.1", port: "27380" }
                ],
                sentinelRetryStrategy: null,
                name: "master"
            });
            const onError = spy();
            redis.on("error", onError);
            await assert.throws(async () => {
                await redis.get("foo");
            }, "are unreachable");
            expect(onError).to.have.been.calledOnce;
            expect(onError).to.have.been.calledWith(match((err) => err.message.includes("are unreachable")));
            redis.disconnect();
            await waitFor(redis, "end");
        });

        it("should close the connection to the sentinel when resolving successfully", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name") {
                    return ["127.0.0.1", "17380"];
                }
            });
            const master = new MockServer(17380);
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master"
            });
            await waitFor(sentinel, "disconnect");
            redis.disconnect();
            await master.disconnect();
            await sentinel.disconnect();
        });
    });

    describe("master", () => {
        it("should connect to the master successfully", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name") {
                    return ["127.0.0.1", "17380"];
                }
            });
            const master = new MockServer(17380);
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master"
            });
            await waitFor(master, "connect");
            redis.disconnect();
            await sentinel.disconnect();
            await master.disconnect();
        });

        it("should reject when sentinel is rejected", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name") {
                    return new Error("just rejected");
                }
            });
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master",
                sentinelRetryStrategy: null,
                lazyConnect: true
            });
            await assert.throws(async () => {
                await redis.connect();
            }, "All sentinels are unreachable and retry is disabled. Last error: just rejected");
            redis.disconnect();
            await sentinel.disconnect();
        });

        it("should connect to the next sentinel if getting master failed", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name") {
                    return null;
                }
            });
            const sentinel2 = new MockServer(27380);
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" },
                    { host: "127.0.0.1", port: "27380" }
                ],
                name: "master"
            });
            await waitFor(sentinel2, "connect");
            await redis.disconnect();
            await sentinel.disconnect();
            await sentinel2.disconnect();
        });

        it("should connect to the next sentinel if the role is wrong", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name" && argv[2] === "master") {
                    return ["127.0.0.1", "17380"];
                }
            });
            const sentinel2 = new MockServer(27380);
            const master = new MockServer(17380, (argv) => {
                if (argv[0] === "info") {
                    return "role:slave";
                }
            });
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" },
                    { host: "127.0.0.1", port: "27380" }
                ],
                name: "master"
            });
            await waitFor(sentinel2, "connect");
            redis.disconnect();
            await sentinel.disconnect();
            await master.disconnect();
            await sentinel2.disconnect();
        });
    });

    describe("slave", () => {
        it("should connect to the slave successfully", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "slaves" && argv[2] === "master") {
                    return [["ip", "127.0.0.1", "port", "17381", "flags", "slave"]];
                }
            });
            const slave = new MockServer(17381);
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master",
                role: "slave",
                preferredSlaves: [{ ip: "127.0.0.1", port: "17381", prio: 10 }]
            });
            await waitFor(slave, "connect");
            redis.disconnect();
            await sentinel.disconnect();
            await slave.disconnect();
        });

        it("should connect to the slave successfully based on preferred slave priority", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "slaves" && argv[2] === "master") {
                    return [
                        ["ip", "127.0.0.1", "port", "44444", "flags", "slave"],
                        ["ip", "127.0.0.1", "port", "17381", "flags", "slave"],
                        ["ip", "127.0.0.1", "port", "55555", "flags", "slave"]
                    ];
                }
            });
            const slave = new MockServer(17381);
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master",
                role: "slave",
                // for code coverage (sorting, etc), use multiple valid values that resolve to prio 1
                preferredSlaves: [
                    { ip: "127.0.0.1", port: "11111", prio: 100 },
                    { ip: "127.0.0.1", port: "17381", prio: 1 },
                    { ip: "127.0.0.1", port: "22222", prio: 100 },
                    { ip: "127.0.0.1", port: "17381" },
                    { ip: "127.0.0.1", port: "17381" }
                ]
            });
            await waitFor(slave, "connect");
            redis.disconnect();
            await sentinel.disconnect();
            await slave.disconnect();
        });

        it("should connect to the slave successfully based on preferred slave filter function", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "slaves" && argv[2] === "master") {
                    return [["ip", "127.0.0.1", "port", "17381", "flags", "slave"]];
                }
            });
            // only one running slave, which we will prefer
            const slave = new MockServer(17381);
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master",
                role: "slave",
                preferredSlaves(slaves) {
                    for (let i = 0; i < slaves.length; i++) {
                        const slave = slaves[i];
                        if (slave.ip === "127.0.0.1" && slave.port === "17381") {
                            return slave;
                        }
                    }
                    return false;
                }
            });
            await waitFor(slave, "connect");
            redis.disconnect();
            await sentinel.disconnect();
            await slave.disconnect();
        });

        it("should connect to the next sentinel if getting slave failed", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "slaves" && argv[2] === "master") {
                    return [];
                }
            });
            const sentinel2 = new MockServer(27380);
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" },
                    { host: "127.0.0.1", port: "27380" }
                ],
                name: "master",
                role: "slave"
            });
            await waitFor(sentinel2, "connect");
            redis.disconnect();
            await sentinel.disconnect();
            await sentinel2.disconnect();
        });

        it("should connect to the next sentinel if the role is wrong", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "slaves" && argv[2] === "master") {
                    return [["ip", "127.0.0.1", "port", "17381", "flags", "slave"]];
                }
            });
            const sentinel2 = new MockServer(27380);
            const slave = new MockServer(17381, (argv) => {
                if (argv[0] === "info") {
                    return "role:master";
                }
            });
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" },
                    { host: "127.0.0.1", port: "27380" }
                ],
                name: "master",
                role: "slave"
            });
            await waitFor(sentinel2, "connect");
            redis.disconnect();
            await sentinel.disconnect();
            await slave.disconnect();
            await sentinel2.disconnect();
        });
    });

    describe("failover", () => {
        it("should switch to new master automatically without any commands being lost", async () => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name") {
                    return ["127.0.0.1", "17380"];
                }
            });
            const master = new MockServer(17380);
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master"
            });
            const c = await waitFor(master, "connect");
            c.destroy();
            master.disconnect();
            const newMaster = new MockServer(17381, (argv) => {
                if (argv[0] === "get" && argv[1] === "foo") {
                    return "bar";
                }
            });
            sentinel.handler = function (argv) {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name") {
                    return ["127.0.0.1", "17381"];
                }
            };
            expect(await redis.get("foo")).to.be.equal("bar");
            redis.disconnect();
            await newMaster.disconnect();
            await sentinel.disconnect();
        });
    });
});
