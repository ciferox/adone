import MockServer from "../helpers/mock_server";
import check from "../helpers/check_redis";

describe("database", "redis", "cluster", { skip: check }, () => {
    const { database: { redis: { Redis, Cluster, __: { calculateSlot } } }, util } = adone;

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
        it("should flush the queue when all startup nodes are unreachable", (done) => {
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { clusterRetryStrategy: null });

            cluster.get("foo", (err) => {
                expect(err.message).to.match(/None of startup nodes is available/);
                cluster.disconnect();
                done();
            });
        });

        it("should invoke clusterRetryStrategy when all startup nodes are unreachable", (done) => {
            let t = 0;
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" },
                { host: "127.0.0.1", port: "30002" }
            ], {
                clusterRetryStrategy(times) {
                    expect(times).to.eql(++t);
                    if (times === 3) {
                        return;
                    }
                    return 0;
                }
            });

            cluster.get("foo", (err) => {
                expect(t).to.eql(3);
                expect(err.message).to.match(/None of startup nodes is available/);
                cluster.disconnect();
                done();
            });
        });

        it("should invoke clusterRetryStrategy when none nodes are ready", (done) => {
            const argvHandler = function (argv) {
                if (argv[0] === "cluster") {
                    return new Error("CLUSTERDOWN");
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);

            let t = 0;
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" },
                { host: "127.0.0.1", port: "30002" }
            ], {
                clusterRetryStrategy(times) {
                    expect(times).to.eql(++t);
                    if (times === 3) {
                        cluster.disconnect();
                        disconnect([node1, node2], done);
                        return;
                    }
                    return 0;
                }
            });
        });

        it("should connect to cluster successfully", (done) => {
            const node = new MockServer(30001);

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);

            node.once("connect", () => {
                cluster.disconnect();
                disconnect([node], done);
            });
        });

        it("should support url schema", (done) => {
            const node = new MockServer(30001);

            const cluster = new Cluster([
                "redis://127.0.0.1:30001"
            ]);

            node.once("connect", () => {
                cluster.disconnect();
                disconnect([node], done);
            });
        });

        it("should support a single port", (done) => {
            const node = new MockServer(30001);

            const cluster = new Cluster([30001]);

            node.once("connect", () => {
                cluster.disconnect();
                disconnect([node], done);
            });
        });

        it("should return a promise to be resolved when connected", (done) => {
            const slotTable = [
                [0, 5460, ["127.0.0.1", 30001]],
                [5461, 10922, ["127.0.0.1", 30002]],
                [10923, 16383, ["127.0.0.1", 30003]]
            ];
            const argvHandler = function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);
            const node3 = new MockServer(30003, argvHandler);

            stub(Cluster.prototype, "connect").callsFake(() => {
                return Promise.resolve();
            });
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            Cluster.prototype.connect.restore();

            cluster.connect().then(() => {
                cluster.disconnect();
                disconnect([node1, node2, node3], done);
            });
        });

        it("should return a promise to be rejected when closed", (done) => {
            stub(Cluster.prototype, "connect").callsFake(() => {
                return Promise.resolve();
            });
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            Cluster.prototype.connect.restore();

            cluster.connect().catch(() => {
                cluster.disconnect();
                done();
            });
        });

        it("should stop reconnecting when disconnected", (done) => {
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], {
                clusterRetryStrategy() {
                    return 0;
                }
            });

            cluster.on("close", () => {
                cluster.disconnect();
                stub(Cluster.prototype, "connect").throws(new Error("`connect` should not be called"));
                setTimeout(() => {
                    Cluster.prototype.connect.restore();
                    done();
                }, 1);
            });
        });

        it("should discover other nodes automatically", (done) => {
            const slotTable = [
                [0, 5460, ["127.0.0.1", 30001]],
                [5461, 10922, ["127.0.0.1", 30002]],
                [10923, 16383, ["127.0.0.1", 30003]]
            ];
            const argvHandler = function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);
            const node3 = new MockServer(30003, argvHandler);

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { redisOptions: { lazyConnect: false } });

            let pending = 3;

            const check = () => {
                if (!--pending) {
                    cluster.disconnect();
                    disconnect([node1, node2, node3], done);
                }
            };

            node1.once("connect", check);
            node2.once("connect", check);
            node3.once("connect", check);
        });

        it("should send command to the correct node", (done) => {
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 1, ["127.0.0.1", 30001]],
                        [2, 16383, ["127.0.0.1", 30002]]
                    ];
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            cluster.get("foo");

            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "get" && argv[1] === "foo") {
                    process.nextTick(() => {
                        cluster.disconnect();
                        disconnect([node1, node2], done);
                    });
                }
            });
        });

        it("should emit errors when cluster cannot be connected", (done) => {
            const errorMessage = "ERR This instance has cluster support disabled";
            const argvHandler = function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return new Error(errorMessage);
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);

            let pending = 2;
            let retry = 0;

            const checkDone = () => {
                if (!--pending) {
                    // eslint-disable-next-line
                    cluster.disconnect();
                    disconnect([node1, node2], done);
                }
            };

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" },
                { host: "127.0.0.1", port: "30002" }
            ], {
                clusterRetryStrategy() {
                    cluster.once("error", (err) => {
                        retry = false;
                        expect(err.message).to.eql("Failed to refresh slots cache.");
                        expect(err.lastNodeError.message).to.eql(errorMessage);
                        checkDone();
                    });
                    return retry;
                }
            });

            cluster.once("node error", (err) => {
                expect(err.message).to.eql(errorMessage);
                checkDone();
            });
        });

        it("should using the specified password", (done) => {
            const slotTable = [
                [0, 5460, ["127.0.0.1", 30001]],
                [5461, 10922, ["127.0.0.1", 30002]],
                [10923, 16383, ["127.0.0.1", 30003]]
            ];

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001", password: "other password" },
                { host: "127.0.0.1", port: "30002", password: null }
            ], { redisOptions: { lazyConnect: false, password: "default password" } });

            const argvHandler = function (port, argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "auth") {
                    const password = argv[1];
                    if (port === 30001) {
                        expect(password).to.eql("other password");
                    } else if (port === 30002) {
                        throw new Error("30002 got password");
                    } else if (port === 30003) {
                        expect(password).to.eql("default password");
                        cluster.disconnect();
                        disconnect([node1, node2, node3], done);  // eslint-disable-line
                    }
                }
            };

            const node1 = new MockServer(30001, argvHandler.bind(null, 30001));
            const node2 = new MockServer(30002, argvHandler.bind(null, 30002));
            const node3 = new MockServer(30003, argvHandler.bind(null, 30003));
        });
    });

    describe("MOVED", () => {
        it("should auto redirect the command to the correct nodes", (done) => {
            let moved = false;
            let times = 0;
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.get("foo", () => {
                cluster.get("foo");
            });

            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    if (times++ === 1) {
                        expect(moved).to.eql(true);
                        process.nextTick(() => {
                            cluster.disconnect();
                            disconnect([node1, node2], done);  // eslint-disable-line
                        });
                    }
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(moved).to.eql(false);
                    moved = true;
                    return new Error(`MOVED ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            });
        });

        it("should be able to redirect a command to a unknown node", (done) => {
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16383, ["127.0.0.1", 30001]]
                    ];
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return new Error(`MOVED ${calculateSlot("foo")} 127.0.0.1:30002`);
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16381, ["127.0.0.1", 30001]],
                        [16382, 16383, ["127.0.0.1", 30002]]
                    ];
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return "bar";
                }
            });
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { retryDelayOnFailover: 1 });
            cluster.get("foo", (err, res) => {
                expect(res).to.eql("bar");
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should auto redirect the command within a pipeline", (done) => {
            let moved = false;
            let times = 0;
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    if (times++ === 1) {
                        expect(moved).to.eql(true);
                        process.nextTick(() => {
                            cluster.disconnect();
                            disconnect([node1, node2], done);
                        });
                    }
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(moved).to.eql(false);
                    moved = true;
                    return new Error(`MOVED ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            cluster.get("foo", () => {
                cluster.get("foo");
            });
        });
    });

    describe("ASK", () => {
        it("should support ASK", (done) => {
            let asked = false;
            let times = 0;
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(asked).to.eql(true);
                } else if (argv[0] === "asking") {
                    asked = true;
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    if (++times === 2) {
                        process.nextTick(() => {
                            cluster.disconnect();
                            disconnect([node1, node2], done);
                        });
                    } else {
                        return new Error(`ASK ${calculateSlot("foo")} 127.0.0.1:30001`);
                    }
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            cluster.get("foo", () => {
                cluster.get("foo");
            });
        });

        it("should be able to redirect a command to a unknown node", (done) => {
            let asked = false;
            const slotTable = [
                [0, 16383, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(asked).to.eql(true);
                    return "bar";
                } else if (argv[0] === "asking") {
                    asked = true;
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return new Error(`ASK ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30002" }
            ]);
            cluster.get("foo", (err, res) => {
                expect(res).to.eql("bar");
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    describe("TRYAGAIN", () => {
        it("should retry the command", (done) => {
            let times = 0;
            const slotTable = [
                [0, 16383, ["127.0.0.1", 30001]]
            ];
            const server = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    if (times++ === 1) {
                        process.nextTick(() => {
                            cluster.disconnect();
                            disconnect([server], done);
                        });
                    } else {
                        return new Error("TRYAGAIN Multiple keys request during rehashing of slot");
                    }
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { retryDelayOnTryAgain: 1 });
            cluster.get("foo");
        });
    });

    describe("CLUSTERDOWN", () => {
        it("should redirect the command to a random node", (done) => {
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return "bar";
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return new Error("CLUSTERDOWN");
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], {
                lazyConnect: false,
                retryDelayOnClusterDown: 1
            });
            cluster.get("foo", (_, res) => {
                expect(res).to.eql("bar");
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    describe("maxRedirections", () => {
        it("should return error when reached max redirection", (done) => {
            let redirectTimes = 0;
            const argvHandler = function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 1, ["127.0.0.1", 30001]],
                        [2, 16383, ["127.0.0.1", 30002]]
                    ];
                } else if (argv[0] === "get" && argv[1] === "foo") {
                    redirectTimes += 1;
                    return new Error(`ASK ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { maxRedirections: 5 });
            cluster.get("foo", (err) => {
                expect(redirectTimes).to.eql(6);
                expect(err.message).to.match(/Too many Cluster redirections/);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    it("should return the error successfully", (done) => {
        let called = false;
        const node1 = new MockServer(30001, (argv) => {
            if (argv[0] === "cluster" && argv[1] === "slots") {
                return [
                    [0, 16383, ["127.0.0.1", 30001]]
                ];
            }
            if (argv.toString() === "get,foo,bar") {
                called = true;
                return new Error("Wrong arguments count");
            }
        });

        const cluster = new Cluster([
            { host: "127.0.0.1", port: "30001" }
        ]);
        cluster.get("foo", "bar", (err) => {
            expect(called).to.eql(true);
            expect(err.message).to.match(/Wrong arguments count/);
            cluster.disconnect();
            disconnect([node1], done);
        });
    });

    it("should get value successfully", (done) => {
        const node1 = new MockServer(30001, (argv) => {
            if (argv[0] === "cluster" && argv[1] === "slots") {
                return [
                    [0, 1, ["127.0.0.1", 30001]],
                    [2, 16383, ["127.0.0.1", 30002]]
                ];
            }
        });
        const node2 = new MockServer(30002, (argv) => {
            if (argv[0] === "get" && argv[1] === "foo") {
                return "bar";
            }
        });

        const cluster = new Cluster([
            { host: "127.0.0.1", port: "30001" }
        ]);
        cluster.get("foo", (err, result) => {
            expect(result).to.eql("bar");
            cluster.disconnect();
            disconnect([node1, node2], done);
        });
    });

    describe("pipeline", () => {
        it("should throw when not all keys belong to the same slot", (done) => {
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.pipeline().set("foo", "bar").get("foo2").exec().catch((err) => {
                expect(err.message).to.match(/All keys in the pipeline should belong to the same slot/);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should auto redirect commands on MOVED", (done) => {
            let moved = false;
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return "bar";
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[1] === "foo") {
                    if (argv[0] === "set") {
                        expect(moved).to.eql(false);
                        moved = true;
                    }
                    return new Error(`MOVED ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.pipeline().get("foo").set("foo", "bar").exec((err, result) => {
                expect(err).to.eql(null);
                expect(result[0]).to.eql([null, "bar"]);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should auto redirect commands on ASK", (done) => {
            let asked = false;
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "asking") {
                    asked = true;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(asked).to.eql(true);
                    return "bar";
                }
                if (argv[0] !== "asking") {
                    asked = false;
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[1] === "foo") {
                    return new Error(`ASK ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.pipeline().get("foo").set("foo", "bar").exec((err, result) => {
                expect(err).to.eql(null);
                expect(result[0]).to.eql([null, "bar"]);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should retry the command on TRYAGAIN", (done) => {
            let times = 0;
            const slotTable = [
                [0, 16383, ["127.0.0.1", 30001]]
            ];
            const server = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[1] === "foo") {
                    if (times++ < 2) {
                        return new Error("TRYAGAIN Multiple keys request during rehashing of slot");
                    }
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { retryDelayOnTryAgain: 1 });
            cluster.pipeline().get("foo").set("foo", "bar").exec((err, result) => {
                expect(result[0][1]).to.eql("OK");
                expect(result[1][1]).to.eql("OK");
                cluster.disconnect();
                disconnect([server], done);
            });
        });

        it("should not redirect commands on a non-readonly command is successful", (done) => {
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return "bar";
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return new Error(`MOVED ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.pipeline().get("foo").set("foo", "bar").exec((err, result) => {
                expect(err).to.eql(null);
                expect(result[0][0].message).to.match(/MOVED/);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should retry when redis is down", (done) => {
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return "bar";
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { retryDelayOnFailover: 1 });
            stub(cluster, "refreshSlotsCache").callsFake((...args) => {
                node2.connect();
                cluster.refreshSlotsCache.restore();
                cluster.refreshSlotsCache.apply(cluster, args);
            });
            node2.disconnect();
            cluster.pipeline().get("foo").set("foo", "bar").exec((err, result) => {
                expect(err).to.eql(null);
                expect(result[0]).to.eql([null, "bar"]);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    describe("transaction", () => {
        it("should auto redirect commands on MOVED", (done) => {
            let moved = false;
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[1] === "foo") {
                    return "QUEUED";
                }
                if (argv[0] === "exec") {
                    expect(moved).to.eql(true);
                    return ["bar", "OK"];
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    moved = true;
                    return new Error(`MOVED ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
                if (argv[0] === "exec") {
                    return new Error("EXECABORT Transaction discarded because of previous errors.");
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.multi().get("foo").set("foo", "bar").exec((err, result) => {
                expect(err).to.eql(null);
                expect(result[0]).to.eql([null, "bar"]);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should auto redirect commands on ASK", (done) => {
            let asked = false;
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "asking") {
                    asked = true;
                }
                if (argv[0] === "multi") {
                    expect(asked).to.eql(true);
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(asked).to.eql(false);
                    return "bar";
                }
                if (argv[0] === "exec") {
                    expect(asked).to.eql(false);
                    return ["bar", "OK"];
                }
                if (argv[0] !== "asking") {
                    asked = false;
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return new Error(`ASK ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
                if (argv[0] === "exec") {
                    return new Error("EXECABORT Transaction discarded because of previous errors.");
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.multi().get("foo").set("foo", "bar").exec((err, result) => {
                expect(err).to.eql(null);
                expect(result[0]).to.eql([null, "bar"]);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    describe("pub/sub", () => {
        it("should receive messages", (done) => {
            const handler = function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 1, ["127.0.0.1", 30001]],
                        [2, 16383, ["127.0.0.1", 30002]]
                    ];
                }
            };
            const node1 = new MockServer(30001, handler);
            const node2 = new MockServer(30002, handler);

            const options = [{ host: "127.0.0.1", port: "30001" }];
            const sub = new Cluster(options);

            sub.subscribe("test cluster", () => {
                node1.write(node1.clients[0], ["message", "test channel", "hi"]);
            });
            sub.on("message", (channel, message) => {
                expect(channel).to.eql("test channel");
                expect(message).to.eql("hi");
                sub.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should re-subscribe after reconnection", (done) => {
            const server = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16383, ["127.0.0.1", 30001]]
                    ];
                } else if (argv[0] === "subscribe" || argv[0] === "psubscribe") {
                    return [argv[0], argv[1]];
                }
            });
            const client = new Cluster([{ host: "127.0.0.1", port: "30001" }]);

            client.subscribe("test cluster", () => {
                stub(Redis.prototype, "subscribe").callsFake(function (...args) {
                    const [channels] = args;
                    expect(channels).to.eql(["test cluster"]);
                    Redis.prototype.subscribe.restore();
                    client.disconnect();
                    disconnect([server], done);
                    return Redis.prototype.subscribe.apply(this, ...args);
                });
                client.once("end", () => {
                    client.connect().catch(adone.noop);
                });
                client.disconnect();
            });
        });

        it("should re-psubscribe after reconnection", (done) => {
            const server = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16383, ["127.0.0.1", 30001]]
                    ];
                } else if (argv[0] === "subscribe" || argv[0] === "psubscribe") {
                    return [argv[0], argv[1]];
                }
            });
            const client = new Cluster([{ host: "127.0.0.1", port: "30001" }]);

            client.psubscribe("test?", () => {
                stub(Redis.prototype, "psubscribe").callsFake((...args) => {
                    const [channels] = args;
                    expect(channels).to.eql(["test?"]);
                    Redis.prototype.psubscribe.restore();
                    client.disconnect();
                    disconnect([server], done);
                    return Redis.prototype.psubscribe(...args);
                });
                client.once("end", () => {
                    client.connect().catch(adone.noop);
                });
                client.disconnect();
            });
        });
    });

    describe("enableReadyCheck", () => {
        it("should reconnect when cluster state is not ok", (done) => {
            let state = "fail";
            const server = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16383, ["127.0.0.1", 30001]]
                    ];
                } else if (argv[0] === "cluster" && argv[1] === "info") {
                    return `cluster_state:${state}`;
                }
            });
            let count = 0;
            const client = new Cluster([{
                host: "127.0.0.1", port: "30001"
            }], {
                clusterRetryStrategy(times) {
                    expect(++count).to.eql(times);
                    if (count === 3) {
                        state = "ok";
                    }
                    return 0;
                }
            });
            client.on("ready", () => {
                client.disconnect();
                disconnect([server], done);
            });
        });
    });

    describe("startupNodes", () => {
        it("should allow updating startupNodes", (done) => {
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16383, ["127.0.0.1", 30001]]
                    ];
                }
                if (argv[0] === "cluster" && argv[1] === "info") {
                    return "cluster_state:fail";
                }
            });
            const client = new Cluster([{
                host: "127.0.0.1", port: "30001"
            }], {
                clusterRetryStrategy() {
                    this.startupNodes = [{ port: 30002 }];
                    return 0;
                }
            });
            const node2 = new MockServer(30002, () => {
                client.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    describe("scaleReads", () => {
        let node1;
        let node2;
        let node3;
        let node4;

        beforeEach(() => {
            function handler(port, argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16381, ["127.0.0.1", 30001], ["127.0.0.1", 30003], ["127.0.0.1", 30004]],
                        [16382, 16383, ["127.0.0.1", 30002]]
                    ];
                }
                return port;
            }
            node1 = new MockServer(30001, handler.bind(null, 30001));
            node2 = new MockServer(30002, handler.bind(null, 30002));
            node3 = new MockServer(30003, handler.bind(null, 30003));
            node4 = new MockServer(30004, handler.bind(null, 30004));
        });

        afterEach((done) => {
            disconnect([node1, node2, node3, node4], done);
        });

        context("master", () => {
            it("should only send reads to master", (done) => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }]);
                cluster.on("ready", () => {
                    stub(util, "randomChoice").throws("sample is called");
                    cluster.get("foo", (err, res) => {
                        util.randomChoice.restore();
                        expect(res).to.eql(30001);
                        cluster.disconnect();
                        done();
                    });
                });
            });
        });

        context("slave", () => {
            it("should only send reads to slave", (done) => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads: "slave"
                });
                cluster.on("ready", () => {
                    stub(util, "randomChoice").callsFake((array, from) => {
                        expect(array).to.eql(["127.0.0.1:30001", "127.0.0.1:30003", "127.0.0.1:30004"]);
                        expect(from).to.eql(1);
                        return "127.0.0.1:30003";
                    });
                    cluster.get("foo", (err, res) => {
                        util.randomChoice.restore();
                        expect(res).to.eql(30003);
                        cluster.disconnect();
                        done();
                    });
                });
            });

            it("should send writes to masters", (done) => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads: "slave"
                });
                cluster.on("ready", () => {
                    stub(util, "randomChoice").throws("sample is called");
                    cluster.set("foo", "bar", (err, res) => {
                        util.randomChoice.restore();
                        expect(res).to.eql(30001);
                        cluster.disconnect();
                        done();
                    });
                });
            });
        });

        context("custom", () => {
            it("should send to selected slave", (done) => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads(node, command) {
                        if (command.name === "get") {
                            return node[1];
                        }
                        return node[2];
                    }
                });
                cluster.on("ready", () => {
                    stub(util, "randomChoice").callsFake((array, from) => {
                        expect(array).to.eql(["127.0.0.1:30001", "127.0.0.1:30003", "127.0.0.1:30004"]);
                        expect(from).to.eql(1);
                        return "127.0.0.1:30003";
                    });
                    cluster.hgetall("foo", (err, res) => {
                        util.randomChoice.restore();
                        expect(res).to.eql(30004);
                        cluster.disconnect();
                        done();
                    });
                });
            });

            it("should send writes to masters", (done) => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads(node, command) {
                        if (command.name === "get") {
                            return node[1];
                        }
                        return node[2];
                    }
                });
                cluster.on("ready", () => {
                    stub(util, "randomChoice").throws("sample is called");
                    cluster.set("foo", "bar", (err, res) => {
                        util.randomChoice.restore();
                        expect(res).to.eql(30001);
                        cluster.disconnect();
                        done();
                    });
                });
            });
        });

        context("all", () => {
            it("should send reads to all nodes randomly", (done) => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads: "all"
                });
                cluster.on("ready", () => {
                    stub(util, "randomChoice").callsFake((array, from) => {
                        expect(array).to.eql(["127.0.0.1:30001", "127.0.0.1:30003", "127.0.0.1:30004"]);
                        expect(from).to.eql(undefined);
                        return "127.0.0.1:30003";
                    });
                    cluster.get("foo", (err, res) => {
                        util.randomChoice.restore();
                        expect(res).to.eql(30003);
                        cluster.disconnect();
                        done();
                    });
                });
            });
        });
    });

    describe("#nodes()", () => {
        it("should return the corrent nodes", (done) => {
            const slotTable = [
                [0, 5460, ["127.0.0.1", 30001], ["127.0.0.1", 30003]],
                [5461, 10922, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });

            const node3 = new MockServer(30003, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });

            const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }]);
            cluster.on("ready", () => {
                expect(cluster.nodes()).to.have.lengthOf(3);
                expect(cluster.nodes("all")).to.have.lengthOf(3);
                expect(cluster.nodes("master")).to.have.lengthOf(2);
                expect(cluster.nodes("slave")).to.have.lengthOf(1);

                cluster.once("-node", () => {
                    expect(cluster.nodes()).to.have.lengthOf(2);
                    expect(cluster.nodes("all")).to.have.lengthOf(2);
                    expect(cluster.nodes("master")).to.have.lengthOf(1);
                    expect(cluster.nodes("slave")).to.have.lengthOf(1);
                    cluster.disconnect();
                    disconnect([node2, node3], done);
                });
                disconnect([node1]);
            });

        });
    });

    describe("#getInfoFromNode", () => {
        it("should refresh master nodes", (done) => {
            let slotTable = [
                [0, 5460, ["127.0.0.1", 30001], ["127.0.0.1", 30003]],
                [5461, 10922, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });

            const node3 = new MockServer(30003, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });

            const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                redisOptions: { showFriendlyErrorStack: true }
            });
            cluster.on("ready", () => {
                expect(cluster.nodes("master")).to.have.lengthOf(2);
                slotTable = [
                    [0, 5460, ["127.0.0.1", 30003]],
                    [5461, 10922, ["127.0.0.1", 30002]]
                ];
                cluster.refreshSlotsCache(() => {
                    cluster.once("-node", (removed) => {
                        expect(removed.options.port).to.eql(30001);
                        expect(cluster.nodes("master")).to.have.lengthOf(2);
                        expect([
                            cluster.nodes("master")[0].options.port,
                            cluster.nodes("master")[1].options.port
                        ].sort()).to.eql([30002, 30003]);
                        cluster.nodes("master").forEach((node) => {
                            expect(node.options).to.have.property("readOnly", false);
                        });
                        cluster.disconnect();
                        disconnect([node1, node2, node3], done);
                    });
                });
            });
        });
    });

    describe("#quit()", () => {
        it("should quit the connection gracefully", (done) => {
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002], ["127.0.0.1", 30003]]
            ];
            const argvHandler = function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);
            const node3 = new MockServer(30003, argvHandler);

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);

            let setCommandHandled = false;
            cluster.on("ready", () => {
                cluster.set("foo", "bar", () => {
                    setCommandHandled = true;
                });
                cluster.quit((err, state) => {
                    expect(setCommandHandled).to.eql(true);
                    expect(state).to.eql("OK");
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
