import { A, B } from "./contexts";

const {
    is,
    net: { p2p: { PeerId, PeerInfo } },
    netron2: { Netron }
} = adone;

describe("Netron", () => {
    let peerId;

    before(() => {
        peerId = PeerId.create();
    });

    describe("initialization", () => {
        it("default constructor", () => {
            const netron = new Netron();

            assert.true(is.asyncEmitter(netron));
            assert.true(is.taskManager(netron));
            assert.true(is.netron2(netron));

            assert.true(is.netron2OwnPeer(netron.peer));
            assert.equal(netron.options.responseTimeout, 3 * 60000);
            assert.equal(netron.options.proxyContexts, false);

            assert.instanceOf(netron.contexts, Map);
            assert.equal(netron.contexts.size, 0);
            assert.instanceOf(netron.peers, Map);
            assert.equal(netron.peers.size, 0);
            assert.instanceOf(netron.networks, Map);
            assert.equal(netron.networks.size, 0);

            assert.instanceOf(netron._defUniqueId, adone.netron2.FastUniqueId);
        });

        it("with precreated PeerId", () => {
            const n = new Netron(peerId);
            assert.deepEqual(peerId, n.peer.info.id);
        });

        it("custom unique id generator for context definitions", () => {
            const netron = new Netron(peerId, {
                uniqueId: new adone.netron2.UniqueId()
            });
            assert.instanceOf(netron._defUniqueId, adone.netron2.UniqueId);
        });
    });

    describe("getPeer()", () => {
        let netron;
        beforeEach(() => {
            netron = new Netron(peerId);
        });

        it("should return own peer by PeerInfo instance", () => {
            const peerInfo = PeerInfo.create(peerId);
            const peer1 = netron.getPeer(peerInfo);
            assert.true(is.netron2Peer(peer1));
        });

        it("should return own peer by PeerId instance", () => {
            const peer1 = netron.getPeer(peerId);
            assert.true(is.netron2Peer(peer1));
        });

        it("should return own peer by base58 value", () => {
            const peer1 = netron.getPeer(peerId.asBase58());
            assert.true(is.netron2Peer(peer1));
        });

        it("should return own peer by it's instance", () => {
            const peer1 = netron.getPeer(netron.peer);
            assert.true(is.netron2Peer(peer1));
        });
    });

    describe("contexts", () => {
        let netron;

        beforeEach(() => {
            netron = new Netron(peerId);
        });

        it("hasContexts()", () => {
            assert.false(netron.hasContexts());
        });

        it("getContextNames() should return empty array if not contexts", () => {
            const contexts = netron.getContextNames();
            assert(is.array(contexts));
            assert.equal(contexts.length, 0);
        });

        describe("attach/detach contexts", () => {
            it("attachContext(instance)", () => {
                netron.attachContext(new A());

                assert.true(netron.hasContexts());
                assert.true(netron.hasContext("A"));
                assert.sameMembers(netron.getContextNames(), ["A"]);
            });

            it("attachContext(instance, name)", () => {
                netron.attachContext(new A(), "a");
                assert.true(netron.hasContexts());
                assert.sameMembers(netron.getContextNames(), ["a"]);
            });

            it("attachContext(instance, name) should return it's definition id", () => {
                const defId = netron.attachContext(new A(), "a");

                assert.true(netron._defUniqueId.isEqual(defId, netron._defUniqueId.id));
            });

            it("attach same context twice with same name should have thrown", () => {
                const a = new A();
                assert.false(netron.hasContexts());
                netron.attachContext(a, "a");
                assert.true(netron.hasContexts());
                assert.throws(() => netron.attachContext(a, "a"), adone.exception.Exists);
            });

            it("attach different contexts with same name should have thrown", () => {
                netron.attachContext(new A(), "a");
                assert.throws(() => netron.attachContext(new B(), "a"), adone.exception.Exists);
            });

            it("attach same context with different name should be ok", () => {
                const a = new A();
                netron.attachContext(a, "a");
                netron.attachContext(a, "A");
            });

            it("detach non-existing context should have thrown", () => {
                assert.throws(() => netron.detachContext("b"), adone.exception.Unknown);
            });

            it("detach attached context", () => {
                const a = new A();
                netron.attachContext(a, "a");
                assert.sameMembers(netron.getContextNames(), ["a"]);
                netron.detachContext("a");
                assert.lengthOf(netron.getContextNames(), 0);
                assert.equal(netron.contexts.size, 0);
                assert.equal(netron._stubs.size, 0);
            });

            it("detach all contexts", () => {
                netron.attachContext(new A(), "a");
                netron.attachContext(new B(), "b");
                assert.true(netron.hasContexts());
                assert.sameMembers(netron.getContextNames(), ["a", "b"]);
                netron.detachAllContexts();
                assert.lengthOf(netron.getContextNames(), 0);
                assert.equal(netron.contexts.size, 0);
                assert.equal(netron._stubs.size, 0);
            });
        });

        describe("_getStub()", () => {
            it("known context", () => {
                const a = new A();
                const defId = netron.attachContext(a, "a");
                const stub = netron._getStub(defId);
                assert.true(is.netron2Stub(stub));
                assert.instanceOf(stub, adone.netron2.Stub);
                assert.strictEqual(stub.instance, a);
            });

            it("unknown context - should have thrown", () => {
                assert.throws(() => netron._getStub(778899), adone.exception.Unknown);
            });
        });
    });

    describe("tasks", () => {
        let netron;
        beforeEach(() => {
            netron = new Netron(peerId, {
                proxyContexts: true
            });
            netron.attachContext(new A(), "a");
            netron.attachContext(new B(), "b");
        });

        const taskVars = [
            "config",
            {
                task: "config"
            },
            ["config"],
            [
                {
                    task: "config"
                }
            ]
        ];

        let i = 1;
        for (const task of taskVars) {
            // eslint-disable-next-line
            it(`run 'config' task (${i++})`, async () => {
                const result = await netron._runPeerTask(netron.peer, task);
                assert.deepEqual(result.config.result, netron.options);
            });
        }

        it("run 'contextDefs' task", async () => {
            const result = await netron._runPeerTask(netron.peer, {
                task: "contextDefs"
            });
            assert.sameMembers(Object.keys(result.contextDefs.result), ["a", "b"]);
        });

        it("run both tasks from own peer", async () => {
            const result = await netron.peer.runTask([
                {
                    task: "config"
                },
                {
                    task: "contextDefs"
                }
            ]);
            assert.deepEqual(result.config.result, netron.options);
            assert.sameMembers(Object.keys(result.contextDefs.result), ["a", "b"]);
            assert.deepEqual(result, netron.peer.task);
        });

        it("run non-existing task", async () => {
            const result = await netron._runPeerTask(netron.peer, {
                task: "topaz"
            });

            assert.instanceOf(result.topaz.error, adone.exception.NotExists);
        });

        it("custom task", async () => {
            class MyTask extends adone.task.Task {
                run(peer, a, b) {
                    return {
                        sum: a + b,
                        id: peer.info.id.asBase58()
                    };
                }
            }

            netron.addTask("my", MyTask, {
                singleton: true
            });

            const result = await netron._runPeerTask(netron.peer, {
                task: "my",
                args: [7, 9]
            });
            assert.deepEqual(result, {
                my: {
                    result: {
                        sum: 16,
                        id: netron.peer.info.id.asBase58()
                    }
                }
            });
        });
    });

    describe("networking", () => {
        let netronS;
        let netronC;
        let idServer;
        let idClient;
        let peerS;
        let peerC;

        before(() => {
            idServer = PeerId.create();
            idClient = PeerId.create();
        });

        beforeEach(async () => {
            peerS = new PeerInfo(idServer);
            peerS.multiaddrs.add("/ip4/0.0.0.0/tcp/0");
            peerC = new PeerInfo(idClient);
            peerC.multiaddrs.add("/ip4/0.0.0.0/tcp/0");

            netronS = new Netron(peerS);
            netronS.createNetCore("default");

            netronC = new Netron(peerC);
            netronC.createNetCore("default");

            // adone.log(peerS.multiaddrs.toArray().map((x) => x.toString()));
            // adone.log("Server peer:", peerS.id.asBase58());
            // adone.log("Client peer:", peerC.id.asBase58());
        });

        afterEach(async () => {
            // await netronC.disconnect();
            await netronS.stop("default");
        });

        it("should be only one created network core", () => {
            assert.equal(netronS.networks.size, 1);
            const netCore = netronS.getNetCore("default");
            assert.true(is.p2pCore(netCore));
        });

        it("delete netcore", async () => {
            netronC.deleteNetCore("default");
            assert.strictEqual(netronC.networks.size, 0);
        });

        it("start one of netron's netcore", async () => {
            const netCore = netronS.getNetCore("default");
            assert.false(netCore.started);
            await netronS.start("default");
            assert.true(netCore.started);
        });

        it("delete active netcore is not allowed", async () => {
            await netronS.start("default");
            assert.throws(() => netronS.deleteNetCore("default"), adone.exception.NotAllowed);
            assert.strictEqual(netronS.networks.size, 1);
        });

        it("connect one netron to another", async () => {
            await netronS.start("default");
            assert.true(netronS.getNetCore("default").started);
            const remotePeer = await netronC.connect("default", peerS);
            assert.deepEqual(remotePeer.netron, netronC);
            const netCoreC = netronC.getNetCore("default");
            assert.false(netCoreC.started);
            assert.deepEqual(remotePeer.netCore, netCoreC);
        });

        it("connect to already connected peer should return same instance of peer", async () => {
            await netronS.start("default");
            const remotePeer1 = await netronC.connect("default", peerS);
            const remotePeer2 = await netronC.connect("default", peerS);
            assert.deepEqual(remotePeer1, remotePeer2);
        });

        it("emit event if peer connected", async (done) => {
            let i = 0;
            const check = () => ++i === 2 ? done() : null;
            netronS.on("peer:connect", (peer) => {
                netronS.peers.has(peer.info.id.asBase58());
                check();
            });
            netronC.on("peer:connect", (peer) => {
                netronC.peers.has(peer.info.id.asBase58());
                check();
            });

            await netronS.start("default");
            await netronC.connect("default", peerS);

        });

        it("connect by default should automatically request netron config and contexts definitions", async () => {
            netronS.attachContext(new A(), "a");
            netronS.attachContext(new B(), "b");
            await netronS.start("default");
            const remotePeer = await netronC.connect("default", peerS);
            assert.true(remotePeer.isNetronConnected());

            assert.deepEqual(remotePeer.task.config.result, {
                proxyContexts: false
            });

            assert.sameMembers(Object.keys(remotePeer.task.contextDefs.result), ["a", "b"]);
        });

        it("connect netron to netcore without netron protocol should be ok", async () => {
            const netCore = netronS.getNetCore("default");
            await netCore.start();
            const remotePeer = await netronC.connect("default", peerS);
            assert.false(remotePeer.isNetronConnected());
        });

        it.todo("connects using different addresses of the remote netron should return same peer", async () => {

        });

        describe("events", () => {
            it("peer:connect", async (done) => {
                await netronS.start("default");

                let i = 0;
                const check = () => ++i === 2 ? done() : null;

                netronS.on("peer:connect", (peer) => {
                    assert.equal(netronC.peer.info.id.asBase58(), peer.info.id.asBase58());
                    check();
                });

                netronC.on("peer:connect", (peer) => {
                    assert.equal(netronS.peer.info.id.asBase58(), peer.info.id.asBase58());
                    check();
                });

                netronC.connect("default", peerS);
            });

            it("peer:disconnect", async (done) => {
                await netronS.start("default");
                const remotePeer = await netronC.connect("default", peerS);

                let i = 0;
                const check = () => ++i === 2 ? done() : null;

                netronS.on("peer:disconnect", (peer) => {
                    assert.equal(netronC.peer.info.id.asBase58(), peer.info.id.asBase58());
                    check();
                });

                netronC.on("peer:disconnect", (peer) => {
                    assert.equal(netronS.peer.info.id.asBase58(), peer.info.id.asBase58());
                    check();
                });

                remotePeer.disconnect();
            });

            it("subsribe own peer on peer events", async (done) => {
                await netronS.start("default");

                let i = 0;
                const check = () => ++i === 2 ? done() : null;

                netronS.on("peer:connect", (peer) => {
                    assert.equal(netronC.peer.info.id.asBase58(), peer.info.id.asBase58());
                    check();
                });

                netronC.peer.subscribe("peer:connect", (peer) => {
                    assert.equal(netronS.peer.info.id.asBase58(), peer.info.id.asBase58());
                    check();
                });

                netronC.peer.subscribe("peer:disconnect", (peer) => {
                    assert.equal(netronS.peer.info.id.asBase58(), peer.info.id.asBase58());
                    check();
                });

                const remotePeer = await netronC.connect("default", peerS);
                await adone.promise.delay(100);
                remotePeer.disconnect();
            });
        });
    });
});
