import { stub } from "sinon";
import MockServer from "../helpers/mock_server";
import check from "../helpers/check_redis";
import calculateSlot from "adone/glosses/databases/redis/cluster_key_slot";
const { Redis } = adone.database;
const { vendor: { lodash } } = adone;

skip(check);

afterEach(function (done) {
    const redis = new Redis();
    redis.flushall(function () {
        redis.script("flush", function () {
            redis.disconnect();
            done();
        });
    });
});

describe("cluster", function () {
    describe("connect", function () {
        it("should flush the queue when all startup nodes are unreachable", function (done) {
            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { clusterRetryStrategy: null });

            cluster.get("foo", function (err) {
                expect(err.message).to.match(/None of startup nodes is available/);
                cluster.disconnect();
                done();
            });
        });

        it("should invoke clusterRetryStrategy when all startup nodes are unreachable", function (done) {
            let t = 0;
            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" },
                { host: "127.0.0.1", port: "30002" }
            ], {
                clusterRetryStrategy (times) {
                    expect(times).to.eql(++t);
                    if (times === 3) {
                        return;
                    }
                    return 0;
                }
            });

            cluster.get("foo", function (err) {
                expect(t).to.eql(3);
                expect(err.message).to.match(/None of startup nodes is available/);
                cluster.disconnect();
                done();
            });
        });

        it("should invoke clusterRetryStrategy when none nodes are ready", function (done) {
            const argvHandler = function (argv) {
                if (argv[0] === "cluster") {
                    return new Error("CLUSTERDOWN");
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);

            let t = 0;
            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" },
                { host: "127.0.0.1", port: "30002" }
            ], {
                clusterRetryStrategy (times) {
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

        it("should connect to cluster successfully", function (done) {
            const node = new MockServer(30001);

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);

            node.once("connect", function () {
                cluster.disconnect();
                disconnect([node], done);
            });
        });

        it("should support url schema", function (done) {
            const node = new MockServer(30001);

            const cluster = new Redis.Cluster([
                "redis://127.0.0.1:30001"
            ]);

            node.once("connect", function () {
                cluster.disconnect();
                disconnect([node], done);
            });
        });

        it("should support a single port", function (done) {
            const node = new MockServer(30001);

            const cluster = new Redis.Cluster([30001]);

            node.once("connect", function () {
                cluster.disconnect();
                disconnect([node], done);
            });
        });

        it("should return a promise to be resolved when connected", function (done) {
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

            stub(Redis.Cluster.prototype, "connect", function () {
                return Promise.resolve();
            });
            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            Redis.Cluster.prototype.connect.restore();

            cluster.connect().then(function () {
                cluster.disconnect();
                disconnect([node1, node2, node3], done);
            });
        });

        it("should return a promise to be rejected when closed", function (done) {
            stub(Redis.Cluster.prototype, "connect", function () {
                return Promise.resolve();
            });
            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            Redis.Cluster.prototype.connect.restore();

            cluster.connect().catch(function () {
                cluster.disconnect();
                done();
            });
        });

        it("should stop reconnecting when disconnected", function (done) {
            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], {
                clusterRetryStrategy () {
                    return 0;
                }
            });

            cluster.on("close", function () {
                cluster.disconnect();
                stub(Redis.Cluster.prototype, "connect").throws(new Error("`connect` should not be called"));
                setTimeout(function () {
                    Redis.Cluster.prototype.connect.restore();
                    done();
                }, 1);
            });
        });

        it("should discover other nodes automatically", function (done) {
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

            let pending = 3;
            node1.once("connect", check);
            node2.once("connect", check);
            node3.once("connect", check);

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { redisOptions: { lazyConnect: false } });

            function check() {
                if (!--pending) {
                    cluster.disconnect();
                    disconnect([node1, node2, node3], done);
                }
            }
        });

        it("should send command to the correct node", function (done) {
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 1, ["127.0.0.1", 30001]],
                        [2, 16383, ["127.0.0.1", 30002]]
                    ];
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "get" && argv[1] === "foo") {
                    process.nextTick(function () {
                        cluster.disconnect();
                        disconnect([node1, node2], done);
                    });
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            cluster.get("foo");
        });

        it("should emit errors when cluster cannot be connected", function (done) {
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
            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" },
                { host: "127.0.0.1", port: "30002" }
            ], {
                clusterRetryStrategy () {
                    cluster.once("error", function (err) {
                        retry = false;
                        expect(err.message).to.eql("Failed to refresh slots cache.");
                        expect(err.lastNodeError.message).to.eql(errorMessage);
                        checkDone();
                    });
                    return retry;
                }
            });

            cluster.once("node error", function (err) {
                expect(err.message).to.eql(errorMessage);
                checkDone();
            });
            function checkDone() {
                if (!--pending) {
                    cluster.disconnect();
                    disconnect([node1, node2], done);
                }
            }
        });

        it("should using the specified password", function (done) {
            let node1;
            let node2;
            let node3;
            const slotTable = [
                [0, 5460, ["127.0.0.1", 30001]],
                [5461, 10922, ["127.0.0.1", 30002]],
                [10923, 16383, ["127.0.0.1", 30003]]
            ];
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
                        disconnect([node1, node2, node3], done);
                    }
                }
            };
            node1 = new MockServer(30001, argvHandler.bind(null, 30001));
            node2 = new MockServer(30002, argvHandler.bind(null, 30002));
            node3 = new MockServer(30003, argvHandler.bind(null, 30003));

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001", password: "other password" },
                { host: "127.0.0.1", port: "30002", password: null }
            ], { redisOptions: { lazyConnect: false, password: "default password" } });
        });
    });

    describe("MOVED", function () {
        it("should auto redirect the command to the correct nodes", function (done) {
            let moved = false;
            let times = 0;
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    if (times++ === 1) {
                        expect(moved).to.eql(true);
                        process.nextTick(function () {
                            cluster.disconnect();
                            disconnect([node1, node2], done);
                        });
                    }
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(moved).to.eql(false);
                    moved = true;
                    return new Error("MOVED " + calculateSlot("foo") + " 127.0.0.1:30001");
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.get("foo", function () {
                cluster.get("foo");
            });
        });

        it("should be able to redirect a command to a unknown node", function (done) {
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16383, ["127.0.0.1", 30001]]
                    ];
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return new Error("MOVED " + calculateSlot("foo") + " 127.0.0.1:30002");
                }
            });
            const node2 = new MockServer(30002, function (argv) {
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
            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { retryDelayOnFailover: 1 });
            cluster.get("foo", function (err, res) {
                expect(res).to.eql("bar");
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should auto redirect the command within a pipeline", function (done) {
            let moved = false;
            let times = 0;
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    if (times++ === 1) {
                        expect(moved).to.eql(true);
                        process.nextTick(function () {
                            cluster.disconnect();
                            disconnect([node1, node2], done);
                        });
                    }
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(moved).to.eql(false);
                    moved = true;
                    return new Error("MOVED " + calculateSlot("foo") + " 127.0.0.1:30001");
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            cluster.get("foo", function () {
                cluster.get("foo");
            });
        });
    });

    describe("ASK", function () {
        it("should support ASK", function (done) {
            let asked = false;
            let times = 0;
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(asked).to.eql(true);
                } else if (argv[0] === "asking") {
                    asked = true;
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    if (++times === 2) {
                        process.nextTick(function () {
                            cluster.disconnect();
                            disconnect([node1, node2], done);
                        });
                    } else {
                        return new Error("ASK " + calculateSlot("foo") + " 127.0.0.1:30001");
                    }
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            cluster.get("foo", function () {
                cluster.get("foo");
            });
        });

        it("should be able to redirect a command to a unknown node", function (done) {
            let asked = false;
            const slotTable = [
                [0, 16383, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(asked).to.eql(true);
                    return "bar";
                } else if (argv[0] === "asking") {
                    asked = true;
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return new Error("ASK " + calculateSlot("foo") + " 127.0.0.1:30001");
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30002" }
            ]);
            cluster.get("foo", function (err, res) {
                expect(res).to.eql("bar");
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    describe("TRYAGAIN", function () {
        it("should retry the command", function (done) {
            let times = 0;
            const slotTable = [
                [0, 16383, ["127.0.0.1", 30001]]
            ];
            const server = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    if (times++ === 1) {
                        process.nextTick(function () {
                            cluster.disconnect();
                            disconnect([server], done);
                        });
                    } else {
                        return new Error("TRYAGAIN Multiple keys request during rehashing of slot");
                    }
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { retryDelayOnTryAgain: 1 });
            cluster.get("foo");
        });
    });

    describe("CLUSTERDOWN", function () {
        it("should redirect the command to a random node", function (done) {
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return "bar";
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return new Error("CLUSTERDOWN");
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], {
                lazyConnect: false,
                retryDelayOnClusterDown: 1
            });
            cluster.get("foo", function (_, res) {
                expect(res).to.eql("bar");
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    describe("maxRedirections", function () {
        it("should return error when reached max redirection", function (done) {
            let redirectTimes = 0;
            const argvHandler = function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 1, ["127.0.0.1", 30001]],
                        [2, 16383, ["127.0.0.1", 30002]]
                    ];
                } else if (argv[0] === "get" && argv[1] === "foo") {
                    redirectTimes += 1;
                    return new Error("ASK " + calculateSlot("foo") + " 127.0.0.1:30001");
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { maxRedirections: 5 });
            cluster.get("foo", function (err) {
                expect(redirectTimes).to.eql(6);
                expect(err.message).to.match(/Too many Cluster redirections/);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    it("should return the error successfully", function (done) {
        let called = false;
        const node1 = new MockServer(30001, function (argv) {
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

        const cluster = new Redis.Cluster([
            { host: "127.0.0.1", port: "30001" }
        ]);
        cluster.get("foo", "bar", function (err) {
            expect(called).to.eql(true);
            expect(err.message).to.match(/Wrong arguments count/);
            cluster.disconnect();
            disconnect([node1], done);
        });
    });

    it("should get value successfully", function (done) {
        const node1 = new MockServer(30001, function (argv) {
            if (argv[0] === "cluster" && argv[1] === "slots") {
                return [
                    [0, 1, ["127.0.0.1", 30001]],
                    [2, 16383, ["127.0.0.1", 30002]]
                ];
            }
        });
        const node2 = new MockServer(30002, function (argv) {
            if (argv[0] === "get" && argv[1] === "foo") {
                return "bar";
            }
        });

        const cluster = new Redis.Cluster([
            { host: "127.0.0.1", port: "30001" }
        ]);
        cluster.get("foo", function (err, result) {
            expect(result).to.eql("bar");
            cluster.disconnect();
            disconnect([node1, node2], done);
        });
    });

    describe("pipeline", function () {
        it("should throw when not all keys belong to the same slot", function (done) {
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.pipeline().set("foo", "bar").get("foo2").exec().catch(function (err) {
                expect(err.message).to.match(/All keys in the pipeline should belong to the same slot/);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should auto redirect commands on MOVED", function (done) {
            let moved = false;
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return "bar";
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[1] === "foo") {
                    if (argv[0] === "set") {
                        expect(moved).to.eql(false);
                        moved = true;
                    }
                    return new Error("MOVED " + calculateSlot("foo") + " 127.0.0.1:30001");
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.pipeline().get("foo").set("foo", "bar").exec(function (err, result) {
                expect(err).to.eql(null);
                expect(result[0]).to.eql([null, "bar"]);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should auto redirect commands on ASK", function (done) {
            let asked = false;
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, function (argv) {
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
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[1] === "foo") {
                    return new Error("ASK " + calculateSlot("foo") + " 127.0.0.1:30001");
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.pipeline().get("foo").set("foo", "bar").exec(function (err, result) {
                expect(err).to.eql(null);
                expect(result[0]).to.eql([null, "bar"]);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should retry the command on TRYAGAIN", function (done) {
            let times = 0;
            const slotTable = [
                [0, 16383, ["127.0.0.1", 30001]]
            ];
            const server = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[1] === "foo") {
                    if (times++ < 2) {
                        return new Error("TRYAGAIN Multiple keys request during rehashing of slot");
                    }
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { retryDelayOnTryAgain: 1 });
            cluster.pipeline().get("foo").set("foo", "bar").exec(function (err, result) {
                expect(result[0][1]).to.eql("OK");
                expect(result[1][1]).to.eql("OK");
                cluster.disconnect();
                disconnect([server], done);
            });
        });

        it("should not redirect commands on a non-readonly command is successful", function (done) {
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return "bar";
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return new Error("MOVED " + calculateSlot("foo") + " 127.0.0.1:30001");
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.pipeline().get("foo").set("foo", "bar").exec(function (err, result) {
                expect(err).to.eql(null);
                expect(result[0][0].message).to.match(/MOVED/);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should retry when redis is down", function (done) {
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return "bar";
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { retryDelayOnFailover: 1 });
            stub(cluster, "refreshSlotsCache", function () {
                node2.connect();
                cluster.refreshSlotsCache.restore();
                cluster.refreshSlotsCache.apply(cluster, arguments);
            });
            node2.disconnect();
            cluster.pipeline().get("foo").set("foo", "bar").exec(function (err, result) {
                expect(err).to.eql(null);
                expect(result[0]).to.eql([null, "bar"]);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    describe("transaction", function () {
        it("should auto redirect commands on MOVED", function (done) {
            let moved = false;
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, function (argv) {
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
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    moved = true;
                    return new Error("MOVED " + calculateSlot("foo") + " 127.0.0.1:30001");
                }
                if (argv[0] === "exec") {
                    return new Error("EXECABORT Transaction discarded because of previous errors.");
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.multi().get("foo").set("foo", "bar").exec(function (err, result) {
                expect(err).to.eql(null);
                expect(result[0]).to.eql([null, "bar"]);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should auto redirect commands on ASK", function (done) {
            let asked = false;
            const slotTable = [
                [0, 12181, ["127.0.0.1", 30001]],
                [12182, 12183, ["127.0.0.1", 30002]],
                [12184, 16383, ["127.0.0.1", 30001]]
            ];
            const node1 = new MockServer(30001, function (argv) {
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
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    return new Error("ASK " + calculateSlot("foo") + " 127.0.0.1:30001");
                }
                if (argv[0] === "exec") {
                    return new Error("EXECABORT Transaction discarded because of previous errors.");
                }
            });

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            cluster.multi().get("foo").set("foo", "bar").exec(function (err, result) {
                expect(err).to.eql(null);
                expect(result[0]).to.eql([null, "bar"]);
                expect(result[1]).to.eql([null, "OK"]);
                cluster.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    describe("pub/sub", function () {
        it("should receive messages", function (done) {
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
            const sub = new Redis.Cluster(options);

            sub.subscribe("test cluster", function () {
                node1.write(node1.clients[0], ["message", "test channel", "hi"]);
            });
            sub.on("message", function (channel, message) {
                expect(channel).to.eql("test channel");
                expect(message).to.eql("hi");
                sub.disconnect();
                disconnect([node1, node2], done);
            });
        });

        it("should re-subscribe after reconnection", function (done) {
            const server = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16383, ["127.0.0.1", 30001]]
                    ];
                } else if (argv[0] === "subscribe" || argv[0] === "psubscribe") {
                    return [argv[0], argv[1]];
                }
            });
            const client = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }]);

            client.subscribe("test cluster", function () {
                stub(Redis.prototype, "subscribe", function (channels) {
                    expect(channels).to.eql(["test cluster"]);
                    Redis.prototype.subscribe.restore();
                    client.disconnect();
                    disconnect([server], done);
                    return Redis.prototype.subscribe.apply(this, arguments);
                });
                client.once("end", function () {
                    client.connect();
                });
                client.disconnect();
            });
        });

        it("should re-psubscribe after reconnection", function (done) {
            const server = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16383, ["127.0.0.1", 30001]]
                    ];
                } else if (argv[0] === "subscribe" || argv[0] === "psubscribe") {
                    return [argv[0], argv[1]];
                }
            });
            const client = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }]);

            client.psubscribe("test?", function () {
                stub(Redis.prototype, "psubscribe", function (channels) {
                    expect(channels).to.eql(["test?"]);
                    Redis.prototype.psubscribe.restore();
                    client.disconnect();
                    disconnect([server], done);
                    return Redis.prototype.psubscribe.apply(this, arguments);
                });
                client.once("end", function () {
                    client.connect().catch(() => {});
                });
                client.disconnect();
            });
        });
    });

    describe("enableReadyCheck", function () {
        it("should reconnect when cluster state is not ok", function (done) {
            let state = "fail";
            const server = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16383, ["127.0.0.1", 30001]]
                    ];
                } else if (argv[0] === "cluster" && argv[1] === "info") {
                    return "cluster_state:" + state;
                }
            });
            let count = 0;
            const client = new Redis.Cluster([{
                host: "127.0.0.1", port: "30001"
            }], {
                clusterRetryStrategy (times) {
                    expect(++count).to.eql(times);
                    if (count === 3) {
                        state = "ok";
                    }
                    return 0;
                }
            });
            client.on("ready", function () {
                client.disconnect();
                disconnect([server], done);
            });
        });
    });

    describe("startupNodes", function () {
        it("should allow updating startupNodes", function (done) {
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16383, ["127.0.0.1", 30001]]
                    ];
                }
                if (argv[0] === "cluster" && argv[1] === "info") {
                    return "cluster_state:fail";
                }
            });
            const client = new Redis.Cluster([{
                host: "127.0.0.1", port: "30001"
            }], {
                clusterRetryStrategy () {
                    this.startupNodes = [{ port: 30002 }];
                    return 0;
                }
            });
            const node2 = new MockServer(30002, function () {
                client.disconnect();
                disconnect([node1, node2], done);
            });
        });
    });

    describe("scaleReads", function () {
        let node1;
        let node2;
        let node3;
        let node4;

        beforeEach(function () {
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

        afterEach(function (done) {
            disconnect([node1, node2, node3, node4], done);
        });

        context("master", function () {
            it("should only send reads to master", function (done) {
                const cluster = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }]);
                cluster.on("ready", function () {
                    stub(lodash, "sample").throws("sample is called");
                    cluster.get("foo", function (err, res) {
                        lodash.sample.restore();
                        expect(res).to.eql(30001);
                        cluster.disconnect();
                        done();
                    });
                });
            });
        });

        context("slave", function () {
            it("should only send reads to slave", function (done) {
                const cluster = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads: "slave"
                });
                cluster.on("ready", function () {
                    stub(lodash, "sample", function (array, from) {
                        expect(array).to.eql(["127.0.0.1:30001", "127.0.0.1:30003", "127.0.0.1:30004"]);
                        expect(from).to.eql(1);
                        return "127.0.0.1:30003";
                    });
                    cluster.get("foo", function (err, res) {
                        lodash.sample.restore();
                        expect(res).to.eql(30003);
                        cluster.disconnect();
                        done();
                    });
                });
            });

            it("should send writes to masters", function (done) {
                const cluster = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads: "slave"
                });
                cluster.on("ready", function () {
                    stub(lodash, "sample").throws("sample is called");
                    cluster.set("foo", "bar", function (err, res) {
                        lodash.sample.restore();
                        expect(res).to.eql(30001);
                        cluster.disconnect();
                        done();
                    });
                });
            });
        });

        context("custom", function () {
            it("should send to selected slave", function (done) {
                const cluster = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads (node, command) {
                        if (command.name === "get") {
                            return node[1];
                        }
                        return node[2];
                    }
                });
                cluster.on("ready", function () {
                    stub(lodash, "sample", function (array, from) {
                        expect(array).to.eql(["127.0.0.1:30001", "127.0.0.1:30003", "127.0.0.1:30004"]);
                        expect(from).to.eql(1);
                        return "127.0.0.1:30003";
                    });
                    cluster.hgetall("foo", function (err, res) {
                        lodash.sample.restore();
                        expect(res).to.eql(30004);
                        cluster.disconnect();
                        done();
                    });
                });
            });

            it("should send writes to masters", function (done) {
                const cluster = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads (node, command) {
                        if (command.name === "get") {
                            return node[1];
                        }
                        return node[2];
                    }
                });
                cluster.on("ready", function () {
                    stub(lodash, "sample").throws("sample is called");
                    cluster.set("foo", "bar", function (err, res) {
                        lodash.sample.restore();
                        expect(res).to.eql(30001);
                        cluster.disconnect();
                        done();
                    });
                });
            });
        });

        context("all", function () {
            it("should send reads to all nodes randomly", function (done) {
                const cluster = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads: "all"
                });
                cluster.on("ready", function () {
                    stub(lodash, "sample", function (array, from) {
                        expect(array).to.eql(["127.0.0.1:30001", "127.0.0.1:30003", "127.0.0.1:30004"]);
                        expect(from).to.eql(undefined);
                        return "127.0.0.1:30003";
                    });
                    cluster.get("foo", function (err, res) {
                        lodash.sample.restore();
                        expect(res).to.eql(30003);
                        cluster.disconnect();
                        done();
                    });
                });
            });
        });
    });

    describe("#nodes()", function () {
        it("should return the corrent nodes", function (done) {
            const slotTable = [
                [0, 5460, ["127.0.0.1", 30001], ["127.0.0.1", 30003]],
                [5461, 10922, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });

            const node3 = new MockServer(30003, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });

            const cluster = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }]);
            cluster.on("ready", function () {
                expect(cluster.nodes()).to.have.lengthOf(3);
                expect(cluster.nodes("all")).to.have.lengthOf(3);
                expect(cluster.nodes("master")).to.have.lengthOf(2);
                expect(cluster.nodes("slave")).to.have.lengthOf(1);

                cluster.once("-node", function () {
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

    describe("#getInfoFromNode", function () {
        it("should refresh master nodes", function (done) {
            let slotTable = [
                [0, 5460, ["127.0.0.1", 30001], ["127.0.0.1", 30003]],
                [5461, 10922, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });
            const node2 = new MockServer(30002, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });

            const node3 = new MockServer(30003, function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
            });

            const cluster = new Redis.Cluster([{ host: "127.0.0.1", port: "30001" }], {
                redisOptions: { showFriendlyErrorStack: true }
            });
            cluster.on("ready", function () {
                expect(cluster.nodes("master")).to.have.lengthOf(2);
                slotTable = [
                    [0, 5460, ["127.0.0.1", 30003]],
                    [5461, 10922, ["127.0.0.1", 30002]]
                ];
                cluster.refreshSlotsCache(function () {
                    cluster.once("-node", function (removed) {
                        expect(removed.options.port).to.eql(30001);
                        expect(cluster.nodes("master")).to.have.lengthOf(2);
                        expect([
                            cluster.nodes("master")[0].options.port,
                            cluster.nodes("master")[1].options.port
                        ].sort()).to.eql([30002, 30003]);
                        cluster.nodes("master").forEach(function (node) {
                            expect(node.options).to.have.property("readOnly", false);
                        });
                        cluster.disconnect();
                        disconnect([node1, node2, node3], done);
                    });
                });
            });
        });
    });

    describe("#quit()", function () {
        it("should quit the connection gracefully", function (done) {
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

            const cluster = new Redis.Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);

            let setCommandHandled = false;
            cluster.on("ready", function () {
                cluster.set("foo", "bar", function () {
                    setCommandHandled = true;
                });
                cluster.quit(function (err, state) {
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
