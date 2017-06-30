import check from "../helpers/check_redis";
import MockServer from "../helpers/mock_server";

describe("database", "redis", "sentinel", { skip: check }, () => {
    const { database: { redis: { Redis } } } = adone;

    afterEach((done) => {
        const redis = new Redis();
        redis.flushall(() => {
            redis.script("flush", () => {
                redis.disconnect();
                done();
            });
        });
    });

    describe("connect", () => {
        it("should connect to sentinel successfully", (done) => {
            const sentinel = new MockServer(27379);
            sentinel.once("connect", () => {
                redis.disconnect();
                sentinel.disconnect(done);
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
                redis.disconnect();
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
                redis.disconnect();
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
                    expect(times).to.eql(++t);
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

        it("should raise error when all sentinel are unreachable and retry is disabled", (done) => {
            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" },
                    { host: "127.0.0.1", port: "27380" }
                ],
                sentinelRetryStrategy: null,
                name: "master"
            });

            redis.get("foo", (error) => {
                finish();
                expect(error.message).to.match(/are unreachable/);
            });

            redis.on("error", (error) => {
                expect(error.message).to.match(/are unreachable/);
                finish();
            });

            redis.on("end", () => {
                finish();
            });

            let pending = 3;
            function finish() {
                if (!--pending) {
                    redis.disconnect();
                    done();
                }
            }
        });

        it("should close the connection to the sentinel when resolving successfully", (done) => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name") {
                    return ["127.0.0.1", "17380"];
                }
            });
            const master = new MockServer(17380);
            sentinel.once("disconnect", () => {
                redis.disconnect();
                master.disconnect(() => {
                    sentinel.disconnect(done);
                });
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master"
            });
        });
    });

    describe("master", () => {
        it("should connect to the master successfully", (done) => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name") {
                    return ["127.0.0.1", "17380"];
                }
            });
            const master = new MockServer(17380);
            master.on("connect", () => {
                redis.disconnect();
                sentinel.disconnect(() => {
                    master.disconnect(done);
                });
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master"
            });
        });

        it("should reject when sentinel is rejected", (done) => {
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

            redis.connect().then(() => {
                throw new Error("Expect `connect` to be thrown");
            }).catch((err) => {
                expect(err.message).to.eql('All sentinels are unreachable and retry is disabled. Last error: just rejected');
                redis.disconnect();
                sentinel.disconnect(done);
            });
        });

        it("should connect to the next sentinel if getting master failed", (done) => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name") {
                    return null;
                }
            });

            const sentinel2 = new MockServer(27380);
            sentinel2.on("connect", () => {
                redis.disconnect();
                sentinel.disconnect(() => {
                    sentinel2.disconnect(done);
                });
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" },
                    { host: "127.0.0.1", port: "27380" }
                ],
                name: "master"
            });
        });

        it("should connect to the next sentinel if the role is wrong", (done) => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name" && argv[2] === "master") {
                    return ["127.0.0.1", "17380"];
                }
            });

            const sentinel2 = new MockServer(27380);
            sentinel2.on("connect", () => {
                redis.disconnect();
                sentinel.disconnect(() => {
                    master.disconnect(() => {
                        sentinel2.disconnect(done);
                    });
                });
            });

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
        });
    });

    describe("slave", () => {
        it("should connect to the slave successfully", (done) => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "slaves" && argv[2] === "master") {
                    return [["ip", "127.0.0.1", "port", "17381", "flags", "slave"]];
                }
            });
            const slave = new MockServer(17381);
            slave.on("connect", () => {
                redis.disconnect();
                sentinel.disconnect(() => {
                    slave.disconnect(done);
                });
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master",
                role: "slave",
                preferredSlaves: [{ ip: "127.0.0.1", port: "17381", prio: 10 }]
            });
        });

        it("should connect to the slave successfully based on preferred slave priority", (done) => {
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
            slave.on("connect", () => {
                redis.disconnect();
                sentinel.disconnect(() => {
                    slave.disconnect(done);
                });
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master",
                role: "slave",
                // for code coverage (sorting, etc), use multiple valid values that resolve to prio 1
                preferredSlaves: [,
                    { ip: "127.0.0.1", port: "11111", prio: 100 },
                    { ip: "127.0.0.1", port: "17381", prio: 1 },
                    { ip: "127.0.0.1", port: "22222", prio: 100 },
                    { ip: "127.0.0.1", port: "17381" },
                    { ip: "127.0.0.1", port: "17381" }
                ]
            });
        });

        it("should connect to the slave successfully based on preferred slave filter function", (done) => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "slaves" && argv[2] === "master") {
                    return [["ip", "127.0.0.1", "port", "17381", "flags", "slave"]];
                }
            });
            // only one running slave, which we will prefer
            const slave = new MockServer(17381);
            slave.on("connect", () => {
                redis.disconnect();
                sentinel.disconnect(() => {
                    slave.disconnect(done);
                });
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master",
                role: "slave",
                preferredSlaves(slaves) {
                    for (let i = 0; i < slaves.length; i++) {
                        const slave = slaves[i];
                        if (slave.ip == "127.0.0.1" && slave.port == "17381") {
                            return slave;
                        }
                    }
                    return false;
                }
            });
        });

        it("should connect to the next sentinel if getting slave failed", (done) => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "slaves" && argv[2] === "master") {
                    return [];
                }
            });

            const sentinel2 = new MockServer(27380);
            sentinel2.on("connect", () => {
                redis.disconnect();
                sentinel.disconnect(() => {
                    sentinel2.disconnect(done);
                });
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" },
                    { host: "127.0.0.1", port: "27380" }
                ],
                name: "master",
                role: "slave"
            });
        });

        it("should connect to the next sentinel if the role is wrong", (done) => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "slaves" && argv[2] === "master") {
                    return [["ip", "127.0.0.1", "port", "17381", "flags", "slave"]];
                }
            });

            const sentinel2 = new MockServer(27380);
            sentinel2.on("connect", (c) => {
                redis.disconnect();
                sentinel.disconnect(() => {
                    slave.disconnect(() => {
                        sentinel2.disconnect(done);
                    });
                });
            });

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
        });
    });

    describe("failover", () => {
        it("should switch to new master automatically without any commands being lost", (done) => {
            const sentinel = new MockServer(27379, (argv) => {
                if (argv[0] === "sentinel" && argv[1] === "get-master-addr-by-name") {
                    return ["127.0.0.1", "17380"];
                }
            });
            const master = new MockServer(17380);
            master.on("connect", (c) => {
                c.destroy();
                master.disconnect();
                redis.get("foo", (err, res) => {
                    expect(res).to.eql("bar");
                    redis.disconnect();
                    newMaster.disconnect(() => {
                        sentinel.disconnect(done);
                    });
                });
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
            });

            const redis = new Redis({
                sentinels: [
                    { host: "127.0.0.1", port: "27379" }
                ],
                name: "master"
            });
        });
    });
});
