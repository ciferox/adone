import MockServer from "../helpers/mock_server";
import check from "../helpers/check_redis";

describe("database", "redis", "cluster", { skip: check }, () => {
    const { is, database: { redis: { Redis, Cluster, __: { calculateSlot } } }, util, promise } = adone;

    const disconnect = async (clients, done) => {
        if (is.function(done)) {
            return disconnect(clients).then(() => done());
        }
        return Promise.all(clients.map((x) => x.disconnect()));
    };

    const waitFor = (emitter, e) => new Promise((resolve) => emitter.once(e, resolve));

    afterEach(async () => {
        const redis = new Redis();
        await redis.flushall();
        await redis.script("flush");
        redis.disconnect();
    });

    describe("connect", () => {
        it("should flush the queue when all startup nodes are unreachable", async () => {
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { clusterRetryStrategy: null });
            await assert.throws(async () => {
                await cluster.get("foo");
            }, "None of startup nodes is available");
            cluster.disconnect();
        });

        it("should invoke clusterRetryStrategy when all startup nodes are unreachable", async () => {
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

            await assert.throws(async () => {
                await cluster.get("foo");
            }, "None of startup nodes is available");
            expect(t).to.be.equal(3);
            cluster.disconnect();
        });

        it("should invoke clusterRetryStrategy when none nodes are ready", async () => {
            const argvHandler = (argv) => {
                if (argv[0] === "cluster") {
                    return new Error("CLUSTERDOWN");
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);

            const clusterRetryStrategy = stub().returns(0);
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" },
                { host: "127.0.0.1", port: "30002" }
            ], { clusterRetryStrategy });
            await clusterRetryStrategy.waitForNCalls(3);
            expect(clusterRetryStrategy.getCall(0)).to.have.been.calledWith(1);
            expect(clusterRetryStrategy.getCall(1)).to.have.been.calledWith(2);
            expect(clusterRetryStrategy.getCall(2)).to.have.been.calledWith(3);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should connect to cluster successfully", async () => {
            const node = new MockServer(30001);

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            const onConnect = spy();
            node.once("connect", onConnect);
            await onConnect.waitForCall();
            cluster.disconnect();
            await node.disconnect();
        });

        it("should support url schema", async () => {
            const node = new MockServer(30001);
            const cluster = new Cluster([
                "redis://127.0.0.1:30001"
            ]);
            const onConnect = spy();
            node.once("connect", onConnect);
            await onConnect.waitForCall();
            cluster.disconnect();
            await node.disconnect();
        });

        it("should support a single port", async () => {
            const node = new MockServer(30001);
            const cluster = new Cluster([30001]);
            const onConnect = spy();
            node.once("connect", onConnect);
            await onConnect.waitForCall();
            cluster.disconnect();
            await node.disconnect();
        });

        it("should return a promise to be resolved when connected", async () => {
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

            await cluster.connect();
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
            await node3.disconnect();
        });

        it("should return a promise to be rejected when closed", async () => {
            stub(Cluster.prototype, "connect").callsFake(() => {
                return Promise.resolve();
            });
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            Cluster.prototype.connect.restore();
            await assert.throws(async () => {
                await cluster.connect();
            });
            cluster.disconnect();
        });

        it("should stop reconnecting when disconnected", async () => {
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], {
                clusterRetryStrategy() {
                    return 0;
                }
            });
            const onClose = spy();
            cluster.on("close", onClose);
            await onClose.waitForCall();
            cluster.disconnect();
            stub(Cluster.prototype, "connect").throws(new Error("`connect` should not be called"));
            await promise.delay(10);
            Cluster.prototype.connect.restore();
        });

        it("should discover other nodes automatically", async () => {
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

            const onConnect = spy();
            node1.once("connect", onConnect);
            node2.once("connect", onConnect);
            node3.once("connect", onConnect);
            await onConnect.waitForNCalls(3);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
            await node3.disconnect();
        });

        it("should send command to the correct node", async () => {
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
            const onGetFoo = spy();
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "get" && argv[1] === "foo") {
                    onGetFoo();
                }
            });
            await onGetFoo.waitForCall();
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should emit errors when cluster cannot be connected", async () => {
            const errorMessage = "ERR This instance has cluster support disabled";
            const argvHandler = function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return new Error(errorMessage);
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);

            let retry = 0;

            const onClusterError = spy();
            const onNodeError = spy();

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" },
                { host: "127.0.0.1", port: "30002" }
            ], {
                clusterRetryStrategy() {
                    cluster.once("error", (err) => {
                        retry = false;
                        onClusterError(err);
                    });
                    return retry;
                }
            });

            cluster.once("node error", onNodeError);
            await onClusterError.waitForCall();
            expect(onClusterError).to.have.been.calledWith(match((err) => {
                return err.message === "Failed to refresh slots cache." &&
                    err.lastNodeError.message === errorMessage;
            }));
            expect(onNodeError).to.have.been.calledOnce;
            expect(onNodeError).to.have.been.calledWith(match((err) => {
                return err.message === errorMessage;
            }));
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should using the specified password", async () => {
            const slotTable = [
                [0, 5460, ["127.0.0.1", 30001]],
                [5461, 10922, ["127.0.0.1", 30002]],
                [10923, 16383, ["127.0.0.1", 30003]]
            ];

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001", password: "other password" },
                { host: "127.0.0.1", port: "30002", password: null }
            ], { redisOptions: { lazyConnect: false, password: "default password" } });

            const ok = spy();
            const argvHandler = (port, argv) => {
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
                        ok();
                    }
                }
            };

            const node1 = new MockServer(30001, argvHandler.bind(null, 30001));
            const node2 = new MockServer(30002, argvHandler.bind(null, 30002));
            const node3 = new MockServer(30003, argvHandler.bind(null, 30003));
            await ok.waitForCall();
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
            await node3.disconnect();
        });
    });

    describe("MOVED", () => {
        it("should auto redirect the command to the correct nodes", async () => {
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            const moved = spy();
            const redirect = spy();
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(redirect).to.have.been.called;
                    moved();
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(redirect).to.have.not.been.called;
                    redirect();
                    return new Error(`MOVED ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            });
            await Promise.all([
                cluster.get("foo").then(() => cluster.get("foo")),
                moved.waitForNCalls(2)
            ]);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should be able to redirect a command to a unknown node", async () => {
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
            expect(await cluster.get("foo")).to.be.equal("bar");
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should auto redirect the command within a pipeline", async () => {
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];
            const moved = spy();
            const redirect = spy();
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(redirect).to.have.been.called;
                    moved();
                }
            });
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(redirect).to.have.not.been.called;
                    redirect();
                    return new Error(`MOVED ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            });
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            await Promise.all([
                cluster.get("foo").then(() => cluster.get("foo")),
                moved.waitForNCalls(2)
            ]);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });
    });

    describe("ASK", () => {
        it("should support ASK", async () => {
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002]]
            ];
            const asked = spy();
            const getFoo1 = spy();
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(asked).to.have.been.called;
                    getFoo1();
                } else if (argv[0] === "asking") {
                    asked();
                }
            });
            const getFoo2 = spy();
            const node2 = new MockServer(30002, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    getFoo2();
                    if (getFoo2.callCount !== 2) {
                        return new Error(`ASK ${calculateSlot("foo")} 127.0.0.1:30001`);
                    }
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { lazyConnect: false });
            await Promise.all([
                cluster.get("foo").then(() => cluster.get("foo")),
                getFoo1.waitForCall(),
                getFoo2.waitForNCalls(2)
            ]);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should be able to redirect a command to a unknown node", async () => {
            const ask = spy();
            const slotTable = [
                [0, 16383, ["127.0.0.1", 30002]]
            ];
            const node1 = new MockServer(30001, (argv) => {
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(ask).to.have.been.called;
                    return "bar";
                } else if (argv[0] === "asking") {
                    ask();
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
            expect(await cluster.get("foo")).to.be.equal("bar");
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });
    });

    describe("TRYAGAIN", () => {
        it("should retry the command", async () => {
            const slotTable = [
                [0, 16383, ["127.0.0.1", 30001]]
            ];
            const getFoo = spy();
            const server = new MockServer(30001, (argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return slotTable;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    getFoo();
                    if (getFoo.callCount === 1) {
                        return new Error("TRYAGAIN Multiple keys request during rehashing of slot");
                    }
                }
            });

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { retryDelayOnTryAgain: 1 });
            await cluster.get("foo");
            expect(getFoo).to.have.been.calledTwice;
            cluster.disconnect();
            await server.disconnect();
        });
    });

    describe("CLUSTERDOWN", () => {
        it("should redirect the command to a random node", async () => {
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
            expect(await cluster.get("foo")).to.be.equal("bar");
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });
    });

    describe("maxRedirections", () => {
        it("should return error when reached max redirection", async () => {
            const redirect = spy();
            const argvHandler = function (argv) {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 1, ["127.0.0.1", 30001]],
                        [2, 16383, ["127.0.0.1", 30002]]
                    ];
                } else if (argv[0] === "get" && argv[1] === "foo") {
                    redirect();
                    return new Error(`ASK ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            };
            const node1 = new MockServer(30001, argvHandler);
            const node2 = new MockServer(30002, argvHandler);

            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ], { maxRedirections: 5 });
            await assert.throws(async () => {
                await cluster.get("foo");
            }, "Too many Cluster redirections");
            expect(redirect).to.have.callCount(6);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });
    });

    it("should return the error successfully", async () => {
        const getFooBar = spy();
        const node1 = new MockServer(30001, (argv) => {
            if (argv[0] === "cluster" && argv[1] === "slots") {
                return [
                    [0, 16383, ["127.0.0.1", 30001]]
                ];
            }
            if (argv.toString() === "get,foo,bar") {
                getFooBar();
                return new Error("Wrong arguments count");
            }
        });

        const cluster = new Cluster([
            { host: "127.0.0.1", port: "30001" }
        ]);
        await assert.throws(async () => {
            await cluster.get("foo", "bar");
        }, "Wrong arguments count");
        expect(getFooBar).to.have.been.called;
        cluster.disconnect();
        await node1.disconnect();
    });

    it("should get value successfully", async () => {
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
        expect(await cluster.get("foo")).to.be.equal("bar");
        cluster.disconnect();
        await node1.disconnect();
        await node2.disconnect();
    });

    describe("pipeline", () => {
        it("should throw when not all keys belong to the same slot", async () => {
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
            await assert.throws(async () => {
                await cluster.pipeline().set("foo", "bar").get("foo2").exec().catch();
            }, "All keys in the pipeline should belong to the same slot");
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should auto redirect commands on MOVED", async () => {
            const move = spy();
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
                        expect(move).to.have.not.been.called;
                        move();
                    }
                    return new Error(`MOVED ${calculateSlot("foo")} 127.0.0.1:30001`);
                }
            });
            const cluster = new Cluster([
                { host: "127.0.0.1", port: "30001" }
            ]);
            expect(await cluster.pipeline().get("foo").set("foo", "bar").exec()).to.be.deep.equal([
                [null, "bar"],
                [null, "OK"]
            ]);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should auto redirect commands on ASK", async () => {
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
                    expect(asked).to.be.true;
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
            expect(await cluster.pipeline().get("foo").set("foo", "bar").exec()).to.be.deep.equal([
                [null, "bar"],
                [null, "OK"]
            ]);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should retry the command on TRYAGAIN", async () => {
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
            expect(await cluster.pipeline().get("foo").set("foo", "bar").exec()).to.be.deep.equal([
                [null, "OK"],
                [null, "OK"]
            ]);
            cluster.disconnect();
            await server.disconnect();
        });

        it("should not redirect commands on a non-readonly command is successful", async () => {
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
            const res = await cluster.pipeline().get("foo").set("foo", "bar").exec();
            expect(res).to.have.lengthOf(2);
            expect(res[0][0]).to.be.an("error");
            expect(res[0][0].message).to.include("MOVED");
            expect(res[1]).to.be.deep.equal([null, "OK"]);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should retry when redis is down", async () => {
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
            const [, result] = await Promise.all([
                node2.disconnect(),
                cluster.pipeline().get("foo").set("foo", "bar").exec()
            ]);
            expect(result).to.be.deep.equal([
                [null, "bar"],
                [null, "OK"]
            ]);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });
    });

    describe("transaction", () => {
        it("should auto redirect commands on MOVED", async () => {
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
                    expect(moved).to.be.true;
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
            expect(await cluster.multi().get("foo").set("foo", "bar").exec()).to.be.deep.equal([
                [null, "bar"],
                [null, "OK"]
            ]);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should auto redirect commands on ASK", async () => {
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
                    expect(asked).to.be.true;
                }
                if (argv[0] === "get" && argv[1] === "foo") {
                    expect(asked).to.be.false;
                    return "bar";
                }
                if (argv[0] === "exec") {
                    expect(asked).to.be.false;
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
            expect(await cluster.multi().get("foo").set("foo", "bar").exec()).to.be.deep.equal([
                [null, "bar"],
                [null, "OK"]
            ]);
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });
    });

    describe("pub/sub", () => {
        it("should receive messages", async () => {
            const handler = (argv) => {
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

            sub.subscribe("test cluster").then(() => node1.write(node1.clients[0], ["message", "test channel", "hi"]));
            const onMessage = spy();
            sub.on("message", onMessage);
            await onMessage.waitForCall();
            expect(onMessage).to.have.been.calledWith("test channel", "hi");
            sub.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });

        it("should re-subscribe after reconnection", async () => {
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

            await client.subscribe("test cluster");
            const subscribe = spy(Redis.prototype, "subscribe");
            client.once("end", () => {
                client.connect().catch(adone.noop);
            });
            client.disconnect();
            await subscribe.waitForArgs(["test cluster"]);
            Redis.prototype.subscribe.restore();
            client.disconnect();
            await server.disconnect();
        });

        it("should re-psubscribe after reconnection", async () => {
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
            await client.psubscribe("test?");
            const psubscribe = spy(Redis.prototype, "psubscribe");
            client.once("end", () => {
                client.connect().catch(adone.noop);
            });
            client.disconnect();
            await psubscribe.waitForArgs(["test?"]);
            client.disconnect();
            await server.disconnect();
        });
    });

    describe("enableReadyCheck", () => {
        it("should reconnect when cluster state is not ok", async () => {
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
                    expect(++count).to.to.equal(times);
                    if (count === 3) {
                        state = "ok";
                    }
                    return 0;
                }
            });
            const onReady = spy();
            client.on("ready", onReady);
            await onReady.waitForCall();
            client.disconnect();
            await server.disconnect();
        });
    });

    describe("startupNodes", () => {
        it("should allow updating startupNodes", async () => {
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
            const s = spy();
            const node2 = new MockServer(30002, s);
            await s.waitForCall();
            client.disconnect();
            await node1.disconnect();
            await node2.disconnect();
        });
    });

    describe("scaleReads", () => {
        let node1;
        let node2;
        let node3;
        let node4;

        beforeEach(() => {
            const handler = (port, argv) => {
                if (argv[0] === "cluster" && argv[1] === "slots") {
                    return [
                        [0, 16381, ["127.0.0.1", 30001], ["127.0.0.1", 30003], ["127.0.0.1", 30004]],
                        [16382, 16383, ["127.0.0.1", 30002]]
                    ];
                }
                return port;
            };
            node1 = new MockServer(30001, handler.bind(null, 30001));
            node2 = new MockServer(30002, handler.bind(null, 30002));
            node3 = new MockServer(30003, handler.bind(null, 30003));
            node4 = new MockServer(30004, handler.bind(null, 30004));
        });

        afterEach(async () => {
            await node1.disconnect();
            await node2.disconnect();
            await node3.disconnect();
            await node4.disconnect();
        });

        context("master", () => {
            it("should only send reads to master", async () => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }]);
                await waitFor(cluster, "ready");
                stub(util, "randomChoice").throws("sample is called");
                expect(await cluster.get("foo")).to.be.equal(30001);
                util.randomChoice.restore();
                cluster.disconnect();
            });
        });

        context("slave", () => {
            it("should only send reads to slave", async () => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads: "slave"
                });
                await waitFor(cluster, "ready");
                stub(util, "randomChoice").callsFake((array, from) => {
                    expect(array).to.be.deep.equal(["127.0.0.1:30001", "127.0.0.1:30003", "127.0.0.1:30004"]);
                    expect(from).to.be.equal(1);
                    return "127.0.0.1:30003";
                });
                expect(await cluster.get("foo")).to.be.equal(30003);
                util.randomChoice.restore();
                cluster.disconnect();
            });

            it("should send writes to masters", async () => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads: "slave"
                });
                await waitFor(cluster, "ready");
                stub(util, "randomChoice").throws("sample is called");
                expect(await cluster.set("foo", "bar")).to.be.equal(30001);
                util.randomChoice.restore();
                cluster.disconnect();
            });
        });

        context("custom", () => {
            it("should send to selected slave", async () => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads(node, command) {
                        if (command.name === "get") {
                            return node[1];
                        }
                        return node[2];
                    }
                });
                await waitFor(cluster, "ready");
                stub(util, "randomChoice").callsFake((array, from) => {
                    expect(array).to.be.deep.equal(["127.0.0.1:30001", "127.0.0.1:30003", "127.0.0.1:30004"]);
                    expect(from).to.be.equal(1);
                    return "127.0.0.1:30003";
                });
                expect(await cluster.hgetall("foo")).to.be.equal(30004);
                util.randomChoice.restore();
                cluster.disconnect();
            });

            it("should send writes to masters", async () => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads(node, command) {
                        if (command.name === "get") {
                            return node[1];
                        }
                        return node[2];
                    }
                });
                await waitFor(cluster, "ready");
                stub(util, "randomChoice").throws("sample is called");
                expect(await cluster.set("foo", "bar")).to.be.equal(30001);
                util.randomChoice.restore();
                cluster.disconnect();
            });
        });

        context("all", () => {
            it("should send reads to all nodes randomly", async () => {
                const cluster = new Cluster([{ host: "127.0.0.1", port: "30001" }], {
                    scaleReads: "all"
                });
                await waitFor(cluster, "ready");
                stub(util, "randomChoice").callsFake((array, from) => {
                    expect(array).to.be.deep.equal(["127.0.0.1:30001", "127.0.0.1:30003", "127.0.0.1:30004"]);
                    expect(from).to.be.undefined;
                    return "127.0.0.1:30003";
                });
                expect(await cluster.get("foo")).to.be.equal(30003);
                util.randomChoice.restore();
                cluster.disconnect();
            });
        });
    });

    describe("nodes()", () => {
        it("should return the corrent nodes", async () => {
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
            await waitFor(cluster, "ready");
            expect(cluster.nodes()).to.have.lengthOf(3);
            expect(cluster.nodes("all")).to.have.lengthOf(3);
            expect(cluster.nodes("master")).to.have.lengthOf(2);
            expect(cluster.nodes("slave")).to.have.lengthOf(1);
            await Promise.all([
                waitFor(cluster, "-node"),
                node1.disconnect()
            ]);
            expect(cluster.nodes()).to.have.lengthOf(2);
            expect(cluster.nodes("all")).to.have.lengthOf(2);
            expect(cluster.nodes("master")).to.have.lengthOf(1);
            expect(cluster.nodes("slave")).to.have.lengthOf(1);
            cluster.disconnect();
            await node2.disconnect();
            await node3.disconnect();
        });
    });

    describe("getInfoFromNode", () => {
        it("should refresh master nodes", async () => {
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
            await waitFor(cluster, "ready");
            expect(cluster.nodes("master")).to.have.lengthOf(2);
            slotTable = [
                [0, 5460, ["127.0.0.1", 30003]],
                [5461, 10922, ["127.0.0.1", 30002]]
            ];
            const [, removed] = await Promise.all([
                cluster.refreshSlotsCache(),
                waitFor(cluster, "-node")
            ]);
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
            await node1.disconnect();
            await node2.disconnect();
            await node3.disconnect();
        });
    });

    describe("quit()", () => {
        it("should quit the connection gracefully", async () => {
            const slotTable = [
                [0, 1, ["127.0.0.1", 30001]],
                [2, 16383, ["127.0.0.1", 30002], ["127.0.0.1", 30003]]
            ];
            const argvHandler = (argv) => {
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
            await waitFor(cluster, "ready");
            const [, state] = await Promise.all([
                cluster.set("foo", "bar"),
                cluster.quit()
            ]);
            expect(state).to.be.equal("OK");
            cluster.disconnect();
            await node1.disconnect();
            await node2.disconnect();
            await node3.disconnect();
        });
    });
});
