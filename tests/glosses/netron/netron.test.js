import { A, B } from "./contexts";

const {
    assertion,
    error,
    is,
    netron: { Netron, OwnPeer },
    promise
} = adone;

assertion.use(assertion.extension.checkmark);

describe("Netron", () => {
    const createNetron = (options) => new Netron(options);

    describe("initialization", () => {
        it("default constructor", () => {
            const netron = createNetron();

            assert.isTrue(is.asyncEmitter(netron));
            assert.isTrue(is.netron(netron));

            assert.instanceOf(netron.peer, OwnPeer);
            assert.isTrue(is.infinite(netron.getMaxListeners()));

            assert.isTrue(is.netronOwnPeer(netron.peer));
            assert.equal(netron.options.responseTimeout, 3 * 60000);
            assert.equal(netron.options.proxifyContexts, false);

            assert.instanceOf(netron.contexts, Map);
            assert.equal(netron.contexts.size, 0);
            assert.instanceOf(netron.peers, Map);
            assert.equal(netron.peers.size, 0);
            // assert.instanceOf(netron.networks, Map);
            // assert.equal(netron.networks.size, 0);

            assert.isTrue(is.taskManager(netron.taskManager));
            assert.lengthOf(netron.taskManager.getTaskNames(), 0);

            assert.strictEqual(netron.stubManager.netron, netron);
            assert.instanceOf(netron.stubManager.uid, adone.netron.uid.FastUid);
            assert.instanceOf(netron.stubManager.stubs, Map);
            assert.instanceOf(netron.stubManager.peerStubs, Map);
        });

        // it("custom unique id generator for context definitions", () => {
        //     const netron = new Netron(peerId, {
        //         uniqueId: new adone.netron.UniqueId()
        //     });
        //     assert.instanceOf(netron._defUniqueId, adone.netron.UniqueId);
        // });
    });

    describe("public methods", () => {
        const netron = createNetron();

        const methods = [
            "attachContext",
            "detachContext",
            "detachAllContexts",
            "hasContext",
            "hasContexts",
            "refContext",
            "releaseContext",
            "addPeer",
            "deletePeer",
            "getPeer",
            "getPeerForInterface",
            "addTask",
            "runTask",
            "deleteSpecialEvents",
            "emitSpecial"
        ];

        for (const m of methods) {
            // eslint-disable-next-line
            it(`${m}()`, () => {
                assert.isTrue(is.function(netron[m]));
            });
        }
    });

    describe("tasks", () => {
        let netron;
        beforeEach(() => {
            netron = createNetron({
                proxifyContexts: true
            });
            netron.attachContext(new A(), "a");
            netron.attachContext(new B(), "b");
        });

        const taskVars = [
            "netronGetConfig",
            {
                task: "netronGetConfig"
            },
            ["netronGetConfig"],
            [
                {
                    task: "netronGetConfig"
                }
            ]
        ];

        describe("variations of task argument in runTask() method", () => {
            for (const v of taskVars) {
                // eslint-disable-next-line
                it(`#runTask(${adone.std.util.inspect(v)})`, async () => {
                    const result = await netron.runTask(netron.peer, v);
                    assert.deepEqual(result.netronGetConfig.result, netron.options);
                });
            }
        });

        it("run 'contextDefs' task", async () => {
            const result = await netron.runTask(netron.peer, {
                task: "netronGetContextDefs"
            });
            assert.sameMembers(Object.keys(result.netronGetContextDefs.result), ["a", "b"]);
        });

        it("run both tasks from own peer", async () => {
            const result = await netron.peer.runTask([
                {
                    task: "netronGetConfig"
                },
                {
                    task: "netronGetContextDefs"
                }
            ]);
            assert.deepEqual(result.netronGetConfig.result, netron.options);
            assert.sameMembers(Object.keys(result.netronGetContextDefs.result), ["a", "b"]);
            // assert.deepEqual(result, netron.peer.task);
        });

        it("run non-existing task", async () => {
            const result = await netron.runTask(netron.peer, {
                task: "topaz"
            });

            assert.instanceOf(result.topaz.error, error.NotExistsException);
        });

        it("custom task", async () => {
            class MyTask extends adone.task.IsomorphicTask {
                main({ peer, args }) {
                    const [a, b] = args;
                    return {
                        sum: a + b
                    };
                }
            }

            await netron.addTask({
                name: "custom",
                task: MyTask,
                singleton: true
            });

            const result = await netron.runTask(netron.peer, {
                task: "custom",
                args: [7, 9]
            });
            assert.deepEqual(result, {
                custom: {
                    result: {
                        sum: 16
                    }
                }
            });
        });
    });

    describe("contexts", () => {
        let netron;

        beforeEach(() => {
            netron = createNetron();
        });

        it("hasContexts()", () => {
            assert.isFalse(netron.hasContexts());
        });

        it("getContextNames() should return empty array if not contexts", () => {
            const contexts = netron.getContextNames();
            assert(is.array(contexts));
            assert.equal(contexts.length, 0);
        });

        describe("attach/detach contexts", () => {
            it("attachContext(instance)", () => {
                netron.attachContext(new A());

                assert.isTrue(netron.hasContexts());
                assert.isTrue(netron.hasContext("A"));
                assert.sameMembers(netron.getContextNames(), ["A"]);
            });

            it("attachContext(instance, name)", () => {
                netron.attachContext(new A(), "a");
                assert.isTrue(netron.hasContexts());
                assert.sameMembers(netron.getContextNames(), ["a"]);
            });

            it("attachContext(instance, name) should return it's definition id", () => {
                const defId = netron.attachContext(new A(), "a");
                assert.isTrue(netron.stubManager.uid.compare(defId, netron.stubManager.uid.id));
            });

            it("attach same context twice with same name should have thrown", () => {
                const a = new A();
                assert.isFalse(netron.hasContexts());
                netron.attachContext(a, "a");
                assert.isTrue(netron.hasContexts());
                assert.throws(() => netron.attachContext(a, "a"), error.ExistsException);
            });

            it("attach different contexts with same name should have thrown", () => {
                netron.attachContext(new A(), "a");
                assert.throws(() => netron.attachContext(new B(), "a"), error.ExistsException);
            });

            it("attach same context with different name should be ok", () => {
                const a = new A();
                netron.attachContext(a, "a");
                netron.attachContext(a, "A");
            });

            it("detach non-existing context should have thrown", () => {
                assert.throws(() => netron.detachContext("b"), error.NotExistsException);
            });

            it("detach attached context", () => {
                const a = new A();
                netron.attachContext(a, "a");
                assert.sameMembers(netron.getContextNames(), ["a"]);
                netron.detachContext("a");
                assert.lengthOf(netron.getContextNames(), 0);
                assert.equal(netron.contexts.size, 0);
                assert.equal(netron.stubManager.stubs.size, 0);
            });

            it("detach all contexts", () => {
                netron.attachContext(new A(), "a");
                netron.attachContext(new B(), "b");
                assert.isTrue(netron.hasContexts());
                assert.sameMembers(netron.getContextNames(), ["a", "b"]);
                netron.detachAllContexts();
                assert.lengthOf(netron.getContextNames(), 0);
                assert.equal(netron.contexts.size, 0);
                assert.equal(netron.stubManager.stubs.size, 0);
            });

            describe("events", () => {
                it("context:attach", async (done) => {
                    netron.on("context:attach", ({ id, def }) => {
                        assert.equal(id, "a");
                        assert.equal(def.id, 1);
                        done();
                    });

                    netron.attachContext(new A(), "a");
                });

                it("context:detach", async (done) => {
                    netron.on("context:detach", ({ id, defId }) => {
                        assert.equal(id, "a");
                        assert.equal(defId, 1);
                        done();
                    });

                    netron.attachContext(new A(), "a");
                    await promise.delay(100);
                    netron.detachContext("a");
                });
            });
        });

        describe("stubManager.getStub()", () => {
            it("known context", () => {
                const a = new A();
                const defId = netron.attachContext(a, "a");
                const stub = netron.stubManager.getStub(defId);
                assert.isTrue(is.netronStub(stub));
                assert.instanceOf(stub, adone.netron.Stub);
                assert.strictEqual(stub.instance, a);
            });

            it("unknown context - should have thrown", () => {
                assert.throws(() => netron.stubManager.getStub(778899), error.NotExistsException);
            });
        });

        describe("originated contexts", () => {

        });
    });

    describe("getPeer() for own peers", () => {
        let netron;
        beforeEach(() => {
            netron = new Netron();
        });

        it("by default should return own peer", () => {
            const ownPeer = netron.getPeer();
            assert.isTrue(is.netronPeer(ownPeer));
            assert.isTrue(is.netronOwnPeer(ownPeer));
        });

        it("should return own peer if passed own peer", () => {
            const ownPeer = netron.getPeer(netron.peer);
            assert.isTrue(is.netronPeer(ownPeer));
            assert.isTrue(is.netronOwnPeer(ownPeer));
        });

        it("should throw if pass own peer of another netron", () => {
            const netron1 = new Netron();
            assert.throws(() => netron.getPeer(netron1.peer), error.UnknownException);
        });
    });

    describe("networking", () => {
        const {
            netron: { P2PNetCore }
        } = adone;

        let netronS;
        let netronC;
        let idServer;
        let idClient;
        let peerInfoS;
        let peerInfoC = null;
        let p2pNetCoreS;
        let p2pNetCoreC;

        before(async () => {
            idServer = await P2PNetCore.createPeerId({ bits: 512 });
            idClient = await P2PNetCore.createPeerId({ bits: 512 });
            // peerInfoS = await P2PNetCore.createPeerInfo({
            //     addrs: "/ip4/0.0.0.0/tcp/0",
            //     bits: 512
            // });
            // idServer = peerInfoS.id;

            // peerInfoC = await P2PNetCore.createPeerInfo({
            //     addrs: "/ip4/0.0.0.0/tcp/0",
            //     bits: 512
            // });
            // idClient = peerInfoC.id;
        });

        beforeEach(async () => {
            peerInfoS = await P2PNetCore.createPeerInfo({
                addrs: "/ip4/0.0.0.0/tcp/0",
                peerId: idServer
            });

            peerInfoC = await P2PNetCore.createPeerInfo({
                addrs: "/ip4/0.0.0.0/tcp/0",
                peerId: idClient
            });

            p2pNetCoreS = new P2PNetCore({ peerInfo: peerInfoS });
            p2pNetCoreC = new P2PNetCore({ peerInfo: peerInfoC });

            netronS = createNetron();
            netronC = createNetron();
        });

        afterEach(async () => {
            await p2pNetCoreC.stop();
            await p2pNetCoreS.stop();
        });

        it("start netcore with netron", async () => {
            assert.isFalse(p2pNetCoreS.started);
            await p2pNetCoreS.start(netronS);
            assert.isTrue(p2pNetCoreS.started);
        });

        it("connect one net core to another", async () => {
            await p2pNetCoreC.start(netronC); // TODO: no need to start net core on connector side.

            await p2pNetCoreS.start(netronS);
            assert.isTrue(p2pNetCoreS.started);
            const remotePeer = await p2pNetCoreC.connect(peerInfoS, netronC);
            assert.isTrue(is.netronRemotePeer(remotePeer));
            assert.deepEqual(remotePeer.netron, netronC);
            assert.equal(remotePeer.netCore, p2pNetCoreC);
        });

        it("disconnect() from connection initiator side", async () => {
            await p2pNetCoreC.start(netronC);
            await p2pNetCoreS.start(netronS);
            const remotePeerS = await p2pNetCoreC.connect(peerInfoS, netronC);
            await promise.delay(500);

            const remotePeerC = netronS.getPeer(p2pNetCoreC.peerInfo.id.toB58String());
            assert.isTrue(remotePeerS.connected);
            assert.isTrue(remotePeerC.connected);

            await remotePeerS.disconnect();
            await promise.delay(500);
            assert.isFalse(remotePeerS.connected);
            assert.isFalse(remotePeerC.connected);
        });

        it("disconnect() from connection acceptor side", async () => {
            await p2pNetCoreC.start(netronC);
            await p2pNetCoreS.start(netronS);
            const remotePeerS = await p2pNetCoreC.connect(peerInfoS, netronC);
            await promise.delay(500);

            const remotePeerC = netronS.getPeer(p2pNetCoreC.peerInfo.id.toB58String());

            assert.isTrue(remotePeerS.connected);
            assert.isTrue(remotePeerC.connected);
            await remotePeerC.disconnect();
            await promise.delay(500);
            assert.isFalse(remotePeerS.connected);
            assert.isFalse(remotePeerC.connected);
        });

        it("disconnect() and completion of all internal stuff during peer disconnection", async () => {
            await p2pNetCoreC.start(netronC);
            await p2pNetCoreS.start(netronS);
            const remotePeerS = await p2pNetCoreC.connect(peerInfoS, netronC);
            await promise.delay(500);

            const remotePeerC = netronS.getPeer(p2pNetCoreC.peerInfo.id.toB58String());
            assert.isTrue(remotePeerS.connected);
            assert.isTrue(remotePeerC.connected);
            assert.isTrue(is.netronPeer(netronC.getPeer(remotePeerS.info.id.toB58String())));
            await remotePeerS.disconnect();
            assert.throws(() => netronC.getPeer(remotePeerS.info.id.toB58String()), error.UnknownException);
        });

        it("connect to already connected peer should return same instance of peer", async () => {
            await p2pNetCoreC.start(netronC);
            await p2pNetCoreS.start(netronS);
            const remotePeer1 = await p2pNetCoreC.connect(peerInfoS, netronC);
            const remotePeer2 = await p2pNetCoreC.connect(peerInfoS, netronC);
            assert.deepEqual(remotePeer1, remotePeer2);
        });

        it("emit event if peer connected", async (done) => {
            let i = 0;
            const check = () => ++i === 2 ? done() : null;
            netronS.on("peer:connect", (peer) => {
                netronS.peers.has(peer.id);
                check();
            });
            netronC.on("peer:connect", (peer) => {
                netronC.peers.has(peer.id);
                check();
            });

            await p2pNetCoreC.start(netronC);
            await p2pNetCoreS.start(netronS);
            await p2pNetCoreC.connect(peerInfoS, netronC);
        });

        it.todo("disconnect all peers", async () => {

        });

        it("connect by default should automatically request netron config and contexts definitions", async () => {
            netronS.attachContext(new A(), "a");
            netronS.attachContext(new B(), "b");

            await p2pNetCoreC.start(netronC);
            await p2pNetCoreS.start(netronS);
            const remotePeer = await p2pNetCoreC.connect(peerInfoS, netronC);
            assert.isTrue(remotePeer.connected);

            assert.deepEqual(remotePeer.task.netronGetConfig.result, netronS.options);

            assert.sameMembers(Object.keys(remotePeer.task.netronGetContextDefs.result), ["a", "b"]);
        });

        it("connects using different addresses of the remote netron should return same peer", async () => {
            await p2pNetCoreC.start(netronC);
            await p2pNetCoreS.start(netronS);
            await promise.delay(1000);

            const addrs = peerInfoS.multiaddrs.toArray();

            const remotePeer1 = await p2pNetCoreC.connect(addrs[0], netronC);
            assert.isTrue(remotePeer1.connected);

            const remotePeer2 = await p2pNetCoreC.connect(addrs[1], netronC);
            assert.isTrue(remotePeer2.connected);

            assert.strictEqual(remotePeer1, remotePeer2);
        });

        describe("events", () => {
            it("peer:connect", async (done) => {
                await p2pNetCoreC.start(netronC);
                await p2pNetCoreS.start(netronS);

                let i = 0;
                const check = () => ++i === 2 ? done() : null;

                netronS.on("peer:connect", (peer) => {
                    assert.equal(p2pNetCoreC.peerInfo.id.toB58String(), peer.id);
                    check();
                });

                netronC.on("peer:connect", (peer) => {
                    assert.equal(p2pNetCoreS.peerInfo.id.toB58String(), peer.id);
                    check();
                });

                p2pNetCoreC.connect(peerInfoS, netronC);
            });

            it("peer:disconnect", async (done) => {
                await p2pNetCoreC.start(netronC);
                await p2pNetCoreS.start(netronS);

                const remotePeer = await p2pNetCoreC.connect(peerInfoS, netronC);

                let i = 0;
                const check = () => ++i === 2 ? done() : null;

                netronS.on("peer:disconnect", (peer) => {
                    assert.equal(p2pNetCoreC.peerInfo.id.toB58String(), peer.id);
                    check();
                });

                netronC.on("peer:disconnect", (peer) => {
                    assert.equal(p2pNetCoreS.peerInfo.id.toB58String(), peer.id);
                    check();
                });

                await remotePeer.disconnect();
            });

            it("subsribe own peer on peer events", async (done) => {
                await p2pNetCoreC.start(netronC);
                await p2pNetCoreS.start(netronS);

                let i = 0;
                const check = () => ++i === 3 ? done() : null;

                netronS.on("peer:connect", (peer) => {
                    assert.equal(p2pNetCoreC.peerInfo.id.toB58String(), peer.id);
                    check();
                });

                netronC.peer.subscribe("peer:connect", (peer) => {
                    assert.equal(p2pNetCoreS.peerInfo.id.toB58String(), peer.id);
                    check();
                });

                netronC.peer.subscribe("peer:disconnect", (peer) => {
                    assert.equal(p2pNetCoreS.peerInfo.id.toB58String(), peer.id);
                    check();
                });

                const remotePeer = await p2pNetCoreC.connect(peerInfoS, netronC);
                await promise.delay(100);
                await remotePeer.disconnect();
            });

            it("many peer connections", async (done) => {
                const N = 10;

                expect(N * 2).checks(done);

                await p2pNetCoreC.start(netronC);
                await p2pNetCoreS.start(netronS);

                const peerIds = [];
                const peers = [];

                netronS.on("peer:connect", (peer) => {
                    expect(peerIds.includes(peer.id)).to.be.true.mark();
                });

                netronS.on("peer:disconnect", (peer) => {
                    expect(peerIds.includes(peer.id)).to.be.true.mark();
                });

                for (let c = 0; c < N; c++) {
                    const p2pNC = new P2PNetCore({
                        // eslint-disable-next-line no-await-in-loop
                        peerInfo: await P2PNetCore.createPeerInfo({
                            addrs: "/ip4/0.0.0.0/tcp/0",
                            bits: 512
                        })
                    });
                    const n = createNetron();
                    // eslint-disable-next-line no-await-in-loop
                    await p2pNC.start(n);
                    peerIds.push(p2pNC.peerInfo.id.toB58String());

                    const p = await p2pNC.connect(peerInfoS, n); // eslint-disable-line
                    peers.push(p);
                }

                await promise.delay(500);

                for (let n = 0; n < N; n++) {
                    peers[n].disconnect();
                }
            });
        });

        describe("remote events", () => {
            it("peer:connect", async (done) => {
                await p2pNetCoreC.start(netronC);
                await p2pNetCoreS.start(netronS);
                let pp = null;

                let peerDBase68Id = null;
                const remotePeerS = await p2pNetCoreC.connect(peerInfoS, netronC);
                await remotePeerS.subscribe("peer:connect", async (peer, { id }) => {
                    assert.equal(peer.info.id.toB58String(), p2pNetCoreS.peerInfo.id.toB58String());
                    assert.equal(peerDBase68Id, id);
                    await pp.disconnect(); // we need it here to prevent unhandled error
                    done();
                });

                const p2pNC = new P2PNetCore({
                    // eslint-disable-next-line no-await-in-loop
                    peerInfo: await P2PNetCore.createPeerInfo({
                        addrs: "/ip4/0.0.0.0/tcp/0",
                        bits: 512
                    })
                });
                const netronD = createNetron();
                await p2pNC.start(netronD);
                peerDBase68Id = p2pNC.peerInfo.id.toB58String();
                pp = await p2pNC.connect(peerInfoS, netronD);
            });

            it("peer:diconnect", async (done) => {
                await p2pNetCoreC.start(netronC);
                await p2pNetCoreS.start(netronS);

                let peerDBase68Id = null;
                const remotePeerS = await p2pNetCoreC.connect(peerInfoS, netronC);
                await remotePeerS.subscribe("peer:disconnect", async (peer, { id }) => {
                    assert.equal(peer.info.id.toB58String(), p2pNetCoreS.peerInfo.id.toB58String());
                    assert.equal(peerDBase68Id, id);
                    await promise.delay(100);
                    done();
                });

                const p2pNC = new P2PNetCore({
                    // eslint-disable-next-line no-await-in-loop
                    peerInfo: await P2PNetCore.createPeerInfo({
                        addrs: "/ip4/0.0.0.0/tcp/0",
                        bits: 512
                    })
                });
                const netronD = createNetron();
                await p2pNC.start(netronD);
                peerDBase68Id = p2pNC.peerInfo.id.toB58String();
                const remotePeerSD = await p2pNC.connect(peerInfoS, netronD);

                await promise.delay(300);

                await remotePeerSD.disconnect();
            });

            it("context:attach", async (done) => {
                await p2pNetCoreC.start(netronC);
                await p2pNetCoreS.start(netronS);
                let defId = null;

                const remotePeerS = await p2pNetCoreC.connect(peerInfoS, netronC);
                await remotePeerS.subscribe("context:attach", async (peer, { id, def }) => {
                    assert.equal(id, "B");
                    assert.equal(def.id, defId);
                    done();
                });

                await promise.delay(100);

                defId = netronS.attachContext(new B());
            });

            it("context:detach", async (done) => {
                await p2pNetCoreC.start(netronC);
                await p2pNetCoreS.start(netronS);
                let defId = null;

                const remotePeerS = await p2pNetCoreC.connect(peerInfoS, netronC);
                await remotePeerS.subscribe("context:detach", async (peer, { id, defId: remoteDefId }) => {
                    assert.equal(id, "B");
                    assert.equal(defId, remoteDefId);
                    done();
                });

                await promise.delay(100);

                defId = netronS.attachContext(new B());

                await promise.delay(100);

                netronS.detachContext("B");
            });

            it("automatically subscribe on contexts events", async () => {
                await p2pNetCoreC.start(netronC);
                await p2pNetCoreS.start(netronS);

                const remotePeerS = await p2pNetCoreC.connect(peerInfoS, netronC);
                await promise.delay(100);

                assert.isFalse(remotePeerS.hasContext("A"));

                netronS.attachContext(new A());
                await promise.delay(100);

                assert.isTrue(remotePeerS.hasContext("A"));

                netronS.detachContext("A");
                await promise.delay(100);

                assert.isFalse(remotePeerS.hasContext("A"));
            });

            // TODO: tests for unsubscribe task
        });

        it("after connected peer should have all existing context definitions from remote netron", async () => {
            netronS.attachContext(new A());

            await p2pNetCoreC.start(netronC);
            await p2pNetCoreS.start(netronS);

            const remotePeerS = await p2pNetCoreC.connect(peerInfoS, netronC);
            // await promise.delay(100);

            assert.isTrue(remotePeerS.hasContext("A"));
        });
    });
});
