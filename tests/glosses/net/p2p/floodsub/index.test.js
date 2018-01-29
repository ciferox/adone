const utils = require("./utils");
const { first, createNetCore, expectSet } = utils;

const {
    is,
    net: { p2p: { floodsub: { FloodSub, utils: floodUtils } } },
    vendor: { lodash: { times: _times } }
} = adone;

describe("floodsub", () => {
    describe("basics between 2 nodes", () => {
        const shouldNotHappen = function (msg) {
            assert.fail();
        };

        describe("fresh nodes", () => {
            let nodeA;
            let nodeB;
            let fsA;
            let fsB;

            before(async () => {
                nodeA = await createNetCore("/ip4/127.0.0.1/tcp/0");
                nodeB = await createNetCore("/ip4/127.0.0.1/tcp/0");
            });

            after(async () => {
                await nodeA.stop();
                await nodeB.stop();
            });

            it("Mount the pubsub protocol", (done) => {
                fsA = new FloodSub(nodeA);
                fsB = new FloodSub(nodeB);

                setTimeout(() => {
                    expect(fsA.peers.size).to.be.eql(0);
                    expect(fsA.subscriptions.size).to.eql(0);
                    expect(fsB.peers.size).to.be.eql(0);
                    expect(fsB.subscriptions.size).to.eql(0);
                    done();
                }, 50);
            });

            it("start both FloodSubs", async () => {
                await Promise.all([
                    fsA.start(),
                    fsB.start()
                ]);
            });

            it("Dial from nodeA to nodeB", async () => {
                await nodeA.connect(nodeB.peerInfo);
                await adone.promise.delay(1000);
                expect(fsA.peers.size).to.equal(1);
                expect(fsB.peers.size).to.equal(1);
            });

            it("Subscribe to a topic:Z in nodeA", (done) => {
                fsA.subscribe("Z");
                setTimeout(() => {
                    expectSet(fsA.subscriptions, ["Z"]);
                    expect(fsB.peers.size).to.equal(1);
                    expectSet(first(fsB.peers).topics, ["Z"]);
                    done();
                }, 100);
            });

            it("Publish to a topic:Z in nodeA", (done) => {
                const shouldNotHappen = function (msg) {
                    assert.fail();
                };

                fsB.once("Z", shouldNotHappen);

                fsA.once("Z", (msg) => {
                    expect(msg.data.toString()).to.equal("hey");
                    fsB.removeListener("Z", shouldNotHappen);
                    done();
                });

                fsB.once("Z", shouldNotHappen);

                fsA.publish("Z", Buffer.from("hey"));
            });

            it("Publish to a topic:Z in nodeB", (done) => {
                fsB.once("Z", shouldNotHappen);

                fsA.once("Z", (msg) => {
                    fsA.once("Z", shouldNotHappen);
                    expect(msg.data.toString()).to.equal("banana");

                    setTimeout(() => {
                        fsA.removeListener("Z", shouldNotHappen);
                        fsB.removeListener("Z", shouldNotHappen);
                        done();
                    }, 100);
                });

                fsB.once("Z", shouldNotHappen);

                fsB.publish("Z", Buffer.from("banana"));
            });

            it("Publish 10 msg to a topic:Z in nodeB", (done) => {
                let counter = 0;

                const receivedMsg = function (msg) {
                    expect(msg.data.toString()).to.equal("banana");
                    expect(msg.from).to.be.eql(fsB.netCore.peerInfo.id.asBase58());
                    assert.true(is.buffer(msg.seqno));
                    expect(msg.topicIDs).to.be.eql(["Z"]);

                    if (++counter === 10) {
                        fsA.removeListener("Z", receivedMsg);
                        done();
                    }
                };

                fsB.once("Z", shouldNotHappen);

                fsA.on("Z", receivedMsg);

                _times(10, () => fsB.publish("Z", Buffer.from("banana")));
            });

            it("Publish 10 msg to a topic:Z in nodeB as array", (done) => {
                let counter = 0;

                const receivedMsg = function (msg) {
                    expect(msg.data.toString()).to.equal("banana");
                    expect(msg.from).to.be.eql(fsB.netCore.peerInfo.id.asBase58());
                    assert.true(is.buffer(msg.seqno));
                    expect(msg.topicIDs).to.be.eql(["Z"]);

                    if (++counter === 10) {
                        fsA.removeListener("Z", receivedMsg);
                        done();
                    }
                };

                fsB.once("Z", shouldNotHappen);
                fsA.on("Z", receivedMsg);

                const msgs = [];
                _times(10, () => msgs.push(Buffer.from("banana")));
                fsB.publish("Z", msgs);
            });

            it("Unsubscribe from topic:Z in nodeA", (done) => {
                fsA.unsubscribe("Z");
                expect(fsA.subscriptions.size).to.equal(0);

                setTimeout(() => {
                    expect(fsB.peers.size).to.equal(1);
                    expectSet(first(fsB.peers).topics, []);
                    done();
                }, 100);
            });

            it("Publish to a topic:Z in nodeA nodeB", (done) => {
                fsA.once("Z", shouldNotHappen);
                fsB.once("Z", shouldNotHappen);

                setTimeout(() => {
                    fsA.removeListener("Z", shouldNotHappen);
                    fsB.removeListener("Z", shouldNotHappen);
                    done();
                }, 100);

                fsB.publish("Z", Buffer.from("banana"));
                fsA.publish("Z", Buffer.from("banana"));
            });

            it("stop both FloodSubs", async () => {
                await Promise.all([
                    fsA.stop(),
                    fsB.stop()
                ]);
            });
        });

        describe("nodes send state on connection", () => {
            let nodeA;
            let nodeB;
            let fsA;
            let fsB;

            before(async () => {
                nodeA = await createNetCore("/ip4/127.0.0.1/tcp/0");
                nodeB = await createNetCore("/ip4/127.0.0.1/tcp/0");

                fsA = new FloodSub(nodeA);
                fsB = new FloodSub(nodeB);

                await Promise.all([
                    fsA.start(),
                    fsB.start()
                ]);

                fsA.subscribe("Za");
                fsB.subscribe("Zb");

                expect(fsA.peers.size).to.equal(0);
                expectSet(fsA.subscriptions, ["Za"]);
                expect(fsB.peers.size).to.equal(0);
                expectSet(fsB.subscriptions, ["Zb"]);

            });

            after(async () => {
                await nodeA.stop();
                await nodeB.stop();
            });

            it("existing subscriptions are sent upon peer connection", async () => {
                await nodeA.connect(nodeB.peerInfo);
                await adone.promise.delay(1000);
                expect(fsA.peers.size).to.equal(1);
                expect(fsB.peers.size).to.equal(1);

                expectSet(fsA.subscriptions, ["Za"]);
                expect(fsB.peers.size).to.equal(1);
                expectSet(first(fsB.peers).topics, ["Za"]);

                expectSet(fsB.subscriptions, ["Zb"]);
                expect(fsA.peers.size).to.equal(1);
                expectSet(first(fsA.peers).topics, ["Zb"]);
            });

            it("stop both FloodSubs", async () => {
                await Promise.all([
                    fsA.stop(),
                    fsB.stop()
                ]);
            });
        });

        describe("nodes handle connection errors", () => {
            let nodeA;
            let nodeB;
            let fsA;
            let fsB;

            before(async () => {
                nodeA = await createNetCore("/ip4/127.0.0.1/tcp/0");
                nodeB = await createNetCore("/ip4/127.0.0.1/tcp/0");

                fsA = new FloodSub(nodeA);
                fsB = new FloodSub(nodeB);

                await Promise.all([
                    fsA.start(),
                    fsB.start()
                ]);

                fsA.subscribe("Za");
                fsB.subscribe("Zb");

                expect(fsA.peers.size).to.equal(0);
                expectSet(fsA.subscriptions, ["Za"]);
                expect(fsB.peers.size).to.equal(0);
                expectSet(fsB.subscriptions, ["Zb"]);

            });

            it("peer is removed from the state when connection ends", async () => {
                await nodeA.connect(nodeB.peerInfo);
                await adone.promise.delay(1000);
                expect(first(fsA.peers)._references).to.equal(2);
                expect(first(fsB.peers)._references).to.equal(2);

                await fsA.stop();
                await adone.promise.delay(1000);
                expect(first(fsB.peers)._references).to.equal(1);
            });

            it("stop one node", async () => {
                await nodeA.stop();
                await nodeB.stop();
            });

            it("nodes don't have peers in it", (done) => {
                setTimeout(() => {
                    expect(fsA.peers.size).to.equal(0);
                    expect(fsB.peers.size).to.equal(0);
                    done();
                }, 1000);
            });
        });

        describe("connect the pubsub protocol on mount", () => {
            let nodeA;
            let nodeB;
            let fsA;
            let fsB;

            before(async () => {
                nodeA = await createNetCore("/ip4/127.0.0.1/tcp/0");
                nodeB = await createNetCore("/ip4/127.0.0.1/tcp/0");
                await nodeA.connect(nodeB.peerInfo);
                await adone.promise.delay(1000);
            });

            after(async () => {
                await nodeA.stop();
                await nodeB.stop();
            });

            it("connect on floodsub on mount", async () => {
                fsA = new FloodSub(nodeA);
                fsB = new FloodSub(nodeB);

                await Promise.all([
                    fsA.start(),
                    fsB.start()
                ]);

                expect(fsA.peers.size).to.equal(1);
                expect(fsB.peers.size).to.equal(1);
            });

            it("stop both FloodSubs", async () => {
                await Promise.all([
                    fsA.stop(),
                    fsB.stop()
                ]);
            });
        });
    });

    describe("multiple nodes (more than 2)", () => {
        const spawnPubSubNode = async () => {
            const netCore = await createNetCore("/ip4/127.0.0.1/tcp/0");
            const ps = new FloodSub(netCore);
            await ps.start();
            return {
                netCore,
                ps
            };
        };

        describe("every peer subscribes to the topic", () => {
            describe("line", () => {
                // line
                // ◉────◉────◉
                // a    b    c
                let a;
                let b;
                let c;

                before(async () => {
                    const nodes = await Promise.all([
                        spawnPubSubNode(),
                        spawnPubSubNode(),
                        spawnPubSubNode()
                    ]);

                    a = nodes[0];
                    b = nodes[1];
                    c = nodes[2];
                });

                after(async () => {
                    // note: setTimeout to avoid the tests finishing
                    // before swarm does its connects
                    await adone.promise.delay(1000);
                    await a.netCore.stop();
                    await b.netCore.stop();
                    await c.netCore.stop();
                });

                it("establish the connections", async () => {
                    await a.netCore.connect(b.netCore.peerInfo);
                    await b.netCore.connect(c.netCore.peerInfo);
                    // wait for the pubsub pipes to be established
                    await adone.promise.delay(2000);
                });

                it("subscribe to the topic on node a", async () => {
                    a.ps.subscribe("Z");
                    expectSet(a.ps.subscriptions, ["Z"]);

                    await adone.promise.delay(2000);
                    expect(b.ps.peers.size).to.equal(2);
                    const topics = [...b.ps.peers.values()][1].topics;
                    expectSet(topics, ["Z"]);

                    expect(c.ps.peers.size).to.equal(1);
                    expectSet(first(c.ps.peers).topics, []);
                });

                it("subscribe to the topic on node b", async () => {
                    b.ps.subscribe("Z");
                    expectSet(b.ps.subscriptions, ["Z"]);

                    await adone.promise.delay(200);
                    expect(a.ps.peers.size).to.equal(1);
                    expectSet(first(a.ps.peers).topics, ["Z"]);

                    expect(c.ps.peers.size).to.equal(1);
                    expectSet(first(c.ps.peers).topics, ["Z"]);
                });

                it("subscribe to the topic on node c", async () => {
                    c.ps.subscribe("Z");
                    expectSet(c.ps.subscriptions, ["Z"]);

                    await adone.promise.delay(200);
                    expect(a.ps.peers.size).to.equal(1);
                    expectSet(first(a.ps.peers).topics, ["Z"]);

                    expect(b.ps.peers.size).to.equal(2);
                    b.ps.peers.forEach((peer) => {
                        expectSet(peer.topics, ["Z"]);
                    });
                });

                it("publish on node a", (done) => {
                    let counter = 0;
                    let incMsg = null;

                    const check = function () {
                        if (++counter === 3) {
                            a.ps.removeListener("Z", incMsg);
                            b.ps.removeListener("Z", incMsg);
                            c.ps.removeListener("Z", incMsg);
                            done();
                        }
                    };

                    incMsg = function (msg) {
                        expect(msg.data.toString()).to.equal("hey");
                        check();
                    };

                    a.ps.on("Z", incMsg);
                    b.ps.on("Z", incMsg);
                    c.ps.on("Z", incMsg);

                    a.ps.publish("Z", Buffer.from("hey"));
                });

                it("publish array on node a", (done) => {
                    let counter = 0;
                    let incMsg = null;

                    const check = function () {
                        if (++counter === 6) {
                            a.ps.removeListener("Z", incMsg);
                            b.ps.removeListener("Z", incMsg);
                            c.ps.removeListener("Z", incMsg);
                            done();
                        }
                    };

                    incMsg = function (msg) {
                        expect(msg.data.toString()).to.equal("hey");
                        check();
                    };

                    a.ps.on("Z", incMsg);
                    b.ps.on("Z", incMsg);
                    c.ps.on("Z", incMsg);

                    a.ps.publish("Z", [Buffer.from("hey"), Buffer.from("hey")]);
                });

                // since the topology is the same, just the publish
                // gets sent by other peer, we reused the same peers
                describe("1 level tree", () => {
                    // 1 level tree
                    //     ┌◉┐
                    //     │b│
                    //   ◉─┘ └─◉
                    //   a     c

                    it("publish on node b", (done) => {
                        let counter = 0;
                        let incMsg = null;

                        const check = function () {
                            if (++counter === 3) {
                                a.ps.removeListener("Z", incMsg);
                                b.ps.removeListener("Z", incMsg);
                                c.ps.removeListener("Z", incMsg);
                                done();
                            }
                        };

                        incMsg = function (msg) {
                            expect(msg.data.toString()).to.equal("hey");
                            check();
                        };

                        a.ps.on("Z", incMsg);
                        b.ps.on("Z", incMsg);
                        c.ps.on("Z", incMsg);

                        b.ps.publish("Z", Buffer.from("hey"));
                    });
                });
            });

            describe("2 level tree", () => {
                // 2 levels tree
                //      ┌◉┐
                //      │c│
                //   ┌◉─┘ └─◉┐
                //   │b     d│
                // ◉─┘       └─◉
                // a           e

                let a;
                let b;
                let c;
                let d;
                let e;

                before(async () => {
                    const nodes = await Promise.all([
                        spawnPubSubNode(),
                        spawnPubSubNode(),
                        spawnPubSubNode(),
                        spawnPubSubNode(),
                        spawnPubSubNode()
                    ]);
                    a = nodes[0];
                    b = nodes[1];
                    c = nodes[2];
                    d = nodes[3];
                    e = nodes[4];
                });

                after(async () => {
                    // note: setTimeout to avoid the tests finishing
                    // before swarm does its connects
                    await adone.promise.delay(1000);
                    await a.netCore.stop();
                    await b.netCore.stop();
                    await c.netCore.stop();
                    await d.netCore.stop();
                    await e.netCore.stop();
                });

                it("establish the connections", async () => {
                    await a.netCore.connect(b.netCore.peerInfo);
                    await b.netCore.connect(c.netCore.peerInfo);
                    await c.netCore.connect(d.netCore.peerInfo);
                    await d.netCore.connect(e.netCore.peerInfo);
                    // wait for the pubsub pipes to be established
                    await adone.promise.delay(2000);
                });

                it("subscribes", () => {
                    a.ps.subscribe("Z");
                    expectSet(a.ps.subscriptions, ["Z"]);
                    b.ps.subscribe("Z");
                    expectSet(b.ps.subscriptions, ["Z"]);
                    c.ps.subscribe("Z");
                    expectSet(c.ps.subscriptions, ["Z"]);
                    d.ps.subscribe("Z");
                    expectSet(d.ps.subscriptions, ["Z"]);
                    e.ps.subscribe("Z");
                    expectSet(e.ps.subscriptions, ["Z"]);
                });

                it("publishes from c", async (done) => {
                    let counter = 0;
                    let incMsg = null;

                    // wait for the pubsub pipes to be established
                    await adone.promise.delay(2000);

                    const check = function () {
                        if (++counter === 5) {
                            a.ps.removeListener("Z", incMsg);
                            b.ps.removeListener("Z", incMsg);
                            c.ps.removeListener("Z", incMsg);
                            d.ps.removeListener("Z", incMsg);
                            e.ps.removeListener("Z", incMsg);
                            done();
                        }
                    };

                    incMsg = function (msg) {
                        assert.equal(msg.data.toString(), "hey from c");
                        check();
                    };

                    a.ps.on("Z", incMsg);
                    b.ps.on("Z", incMsg);
                    c.ps.on("Z", incMsg);
                    d.ps.on("Z", incMsg);
                    e.ps.on("Z", incMsg);

                    c.ps.publish("Z", Buffer.from("hey from c"));
                });
            });
        });

        describe("only some nodes subscribe the networks", () => {
            describe("line", () => {
                // line
                // ◉────◎────◉
                // a    b    c

                before((done) => { });
                after((done) => { });
            });

            describe("1 level tree", () => {
                // 1 level tree
                //     ┌◉┐
                //     │b│
                //   ◎─┘ └─◉
                //   a     c

                before((done) => { });
                after((done) => { });
            });

            describe("2 level tree", () => {
                // 2 levels tree
                //      ┌◉┐
                //      │c│
                //   ┌◎─┘ └─◉┐
                //   │b     d│
                // ◉─┘       └─◎
                // a           e

                before((done) => { });
                after((done) => { });
            });
        });
    });

    describe("utils", () => {
        it("randomSeqno", () => {
            const first = floodUtils.randomSeqno();
            const second = floodUtils.randomSeqno();

            expect(first).to.have.length(40);
            expect(second).to.have.length(40);
            expect(first).to.not.eql(second);
        });

        it("msgId", () => {
            expect(floodUtils.msgId("hello", "world")).to.be.eql("helloworld");
        });

        it("anyMatch", () => {
            [
                [[1, 2, 3], [4, 5, 6], false],
                [[1, 2], [1, 2], true],
                [[1, 2, 3], [4, 5, 1], true],
                [[5, 6, 1], [1, 2, 3], true],
                [[], [], false],
                [[1], [2], false]
            ].forEach((test) => {
                expect(floodUtils.anyMatch(new Set(test[0]), new Set(test[1]))).to.eql(test[2]);

                expect(floodUtils.anyMatch(new Set(test[0]), test[1])).to.eql(test[2]);
            });
        });

        it("ensureArray", () => {
            expect(floodUtils.ensureArray("hello")).to.be.eql(["hello"]);
            expect(floodUtils.ensureArray([1, 2])).to.be.eql([1, 2]);
        });

        it("converts an IN msg.from to b58", () => {
            const binaryId = Buffer.from("1220e2187eb3e6c4fb3e7ff9ad4658610624a6315e0240fc6f37130eedb661e939cc", "hex");
            const stringId = "QmdZEWgtaWAxBh93fELFT298La1rsZfhiC2pqwMVwy3jZM";
            const m = [
                { from: binaryId },
                { from: stringId }
            ];
            const expected = [
                { from: stringId },
                { from: stringId }
            ];
            expect(floodUtils.normalizeInRpcMessages(m)).to.deep.eql(expected);
        });

        it("converts an OUT msg.from to binary", () => {
            const binaryId = Buffer.from("1220e2187eb3e6c4fb3e7ff9ad4658610624a6315e0240fc6f37130eedb661e939cc", "hex");
            const stringId = "QmdZEWgtaWAxBh93fELFT298La1rsZfhiC2pqwMVwy3jZM";
            const m = [
                { from: binaryId },
                { from: stringId }
            ];
            const expected = [
                { from: binaryId },
                { from: binaryId }
            ];
            expect(floodUtils.normalizeOutRpcMessages(m)).to.deep.eql(expected);
        });
    });
});
