import { A, B, commonTypes, CommonTypes } from "../contexts";
import { createNetron } from "../common";

const {
    is,
    promise
} = adone;

const __ = adone.private(adone.netron2);

export default (testInterface) => {
    describe("peer interface", () => {
        let netron;
        let peer;

        before(async () => {
            await testInterface.before();
        });

        after(async () => {
            await testInterface.after();
        });

        beforeEach(async () => {
            [netron, peer] = await testInterface.beforeEach();
        });

        afterEach(async () => {
            await testInterface.afterEach();
        });

        describe("_getContextDefinition()", () => {
            beforeEach(async () => {
                await netron.attachContext(new A(), "a");
                await promise.delay(500);
            });

            it("should throws with unknown context", () => {
                assert.throws(() => peer._getContextDefinition("not_exists"), adone.exception.NotExists);
            });

            it("_getContextDefinition() should return definition of attached context owned by netron instance", () => {
                const def = peer._getContextDefinition("a");
                assert.ok(is.netron2Definition(def));
                assert.instanceOf(def, adone.netron2.Definition);
                assert.equal(def.name, "A");
            });

            it("OwnPeer#_getContextDefinition() should return definition of attached context of associated netron", () => {
                const def = peer._getContextDefinition("a");
                assert.ok(is.netron2Definition(def));
                assert.instanceOf(def, adone.netron2.Definition);
                assert.equal(def.name, "A");
            });
        });

        it("run 'config' task", async () => {
            const result = await peer.runTask("config");
            assert.deepEqual(result.config.result, netron.options);
        });

        it("run 'contextDefs' task", async () => {
            netron.attachContext(new A(), "a");
            netron.attachContext(new B(), "b");
            const result = await peer.runTask("contextDefs");
            assert.sameMembers(Object.keys(result.contextDefs.result), ["a", "b"]);
        });

        describe("contexts", () => {
            it("hasContexts()", () => {
                assert.false(peer.hasContexts());
            });

            it("getContextNames()", () => {
                assert.lengthOf(peer.getContextNames(), 0);
            });

            it("hasContext() should return false for unknown context", () => {
                assert.false(peer.hasContext("a"));
            });

            it("attached contexts should be accessible from the same peer", async () => {
                await peer.attachContext(new A(), "a");
                await peer.attachContext(new B());

                await promise.delay(500);

                assert.include(netron.getContextNames(), "a");
                assert.include(netron.getContextNames(), "B");

                await promise.delay(100);

                assert.include(peer.getContextNames(), "a");
                assert.include(peer.getContextNames(), "B");
            });

            it("attached contexts (before connect) should be accessible from other peer", async () => {
                await peer.attachContext(new A(), "a");
                await peer.attachContext(new B());

                await promise.delay(500);

                const netron2 = createNetron();
                const remotePeer = await netron2.connect("default", netron.peer.info);
                assert.true(remotePeer.isConnected());

                assert.include(netron.getContextNames(), "a");
                assert.include(netron.getContextNames(), "B");

                assert.include(peer.getContextNames(), "a");
                assert.include(peer.getContextNames(), "B");

                assert.include(remotePeer.getContextNames(), "a");
                assert.include(remotePeer.getContextNames(), "B");
            });

            it("attached contexts (after connect) should be accessible from other peer", async () => {
                const netron2 = createNetron();
                const remotePeer = await netron2.connect("default", netron.peer.info);
                assert.true(remotePeer.isConnected());

                await peer.attachContext(new A(), "a");
                await peer.attachContext(new B());

                await promise.delay(500);

                assert.include(netron.getContextNames(), "a");
                assert.include(netron.getContextNames(), "B");

                assert.include(peer.getContextNames(), "a");
                assert.include(peer.getContextNames(), "B");

                assert.include(remotePeer.getContextNames(), "a");
                assert.include(remotePeer.getContextNames(), "B");
            });

            it("attach same context twice should have thrown", async () => {
                const a = new A();

                await peer.attachContext(a, "a");
                const err = await assert.throws(async () => peer.attachContext(a, "a"));
                assert.instanceOf(err, adone.exception.Exists);
            });

            it("detach contexts", async () => {
                const netron2 = createNetron();
                const remotePeer = await netron2.connect("default", netron.peer.info);
                assert.true(remotePeer.isConnected());

                await promise.delay(500);

                await peer.attachContext(new A(), "a");
                await peer.attachContext(new B());

                await promise.delay(500);

                assert.sameMembers(remotePeer.getContextNames(), ["a", "B"]);
                assert.sameMembers(peer.getContextNames(), ["a", "B"]);
                assert.sameMembers(netron.getContextNames(), ["a", "B"]);

                await peer.detachContext("a");
                await peer.detachContext("B");

                await promise.delay(500);

                assert.lengthOf(netron.getContextNames(), 0);
                assert.lengthOf(peer.getContextNames(), 0);
                assert.lengthOf(remotePeer.getContextNames(), 0);
            });

            it("detach non-existing context should have thrown", async () => {
                await assert.throws(async () => peer.detachContext("hack"), adone.exception.NotExists);
            });
        });

        describe("interfaces", () => {
            describe("_queryInterfaceByDefinition()", () => {
                beforeEach(async () => {
                    await peer.attachContext(new A(), "a");
                });

                it("should return interface for valid context", () => {
                    const def = peer._getContextDefinition("a");
                    const iface = peer._queryInterfaceByDefinition(def.id);
                    assert.true(is.netron2Interface(iface));
                    assert.strictEqual(iface[__.I_DEFINITION_SYMBOL].id, def.id);
                });

                it("should return interface for valid context (remote)", async () => {
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.peer.info);
                    const def = remotePeer._getContextDefinition("a");
                    const iface = remotePeer._queryInterfaceByDefinition(def.id);
                    assert.true(is.netron2Interface(iface));
                    assert.strictEqual(iface[__.I_DEFINITION_SYMBOL].id, def.id);
                });

                it("should throw for unknown context", () => {
                    assert.throws(() => netron.peer._queryInterfaceByDefinition(100500), adone.exception.Unknown);
                });
            });

            it("query interface", async () => {
                await peer.attachContext(new A(), "a");
                await promise.delay(500);

                const iA = peer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                assert.true(peer.interfaces.has(iA[__.I_DEFINITION_SYMBOL].id));
            });

            it("query interface (remote)", async () => {
                const netron2 = createNetron();
                const remotePeer = await netron2.connect("default", netron.peer.info);

                await peer.attachContext(new A(), "a");
                await promise.delay(500);

                const iA = remotePeer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                assert.true(remotePeer.interfaces.has(iA[__.I_DEFINITION_SYMBOL].id));
            });

            it("query non-existing interface should have thrown", async () => {
                assert.throws(() => peer.queryInterface("a"), adone.exception.NotExists);
            });

            it("release interface", async () => {
                await peer.attachContext(new A(), "a");
                await promise.delay(500);

                const iA = peer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                const defId = iA[__.I_DEFINITION_SYMBOL].id;
                assert.true(peer.interfaces.has(defId));

                peer.releaseInterface(iA);
                assert.false(peer.interfaces.has(defId));
            });

            it("release interface (remote)", async () => {
                const netron2 = createNetron();
                const remotePeer = await netron2.connect("default", netron.peer.info);

                await peer.attachContext(new A(), "a");
                await promise.delay(500);

                const iA = remotePeer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                const defId = iA[__.I_DEFINITION_SYMBOL].id;
                assert.true(remotePeer.interfaces.has(defId));

                remotePeer.releaseInterface(iA);
                assert.false(remotePeer.interfaces.has(defId));
            });

            it("release non-interface should have thrown", async () => {
                assert.throws(() => peer.releaseInterface(new A()), adone.exception.NotValid);
            });

            describe("Netron#getPeerForInterface()", () => {
                beforeEach(async () => {
                    await peer.attachContext(new A(), "a");
                });

                it("should return peer", () => {
                    const iInstance = peer.queryInterface("a");
                    const otherPeer = netron.getPeerForInterface(iInstance);
                    assert.strictEqual(peer.info.id.asBase58(), otherPeer.info.id.asBase58());
                });

                it("should throw for non-interface instance", () => {
                    assert.throws(() => netron.getPeerForInterface(new A()), adone.exception.NotValid);
                });
            });

            describe("common types", () => {
                let iCt;
                beforeEach(async () => {
                    await peer.attachContext(new CommonTypes(), "ct");

                    await promise.delay(500);
                    iCt = peer.queryInterface("ct");
                });

                describe("public properties", () => {
                    for (const ct of commonTypes) {
                        // eslint-disable-next-line
                        it(`_${ct.name}`, async () => {
                            assert.deepEqual(await iCt[`_${ct.name}`].get(), ct.value);
                        });
                    }
                });

                describe("public methods", () => {
                    for (const ct of commonTypes) {
                        // eslint-disable-next-line
                        it(`${ct.name}()`, async () => {
                            assert.deepEqual(await iCt[ct.name](), ct.value);
                        });
                    }
                });
            });

            describe("common types (remote peer)", () => {
                let netron2;
                let remotePeer;
                let iCt;

                before(() => {
                    netron2 = createNetron();
                });

                beforeEach(async () => {
                    await peer.attachContext(new CommonTypes(), "ct");

                    remotePeer = await netron2.connect("default", netron.peer.info);

                    iCt = remotePeer.queryInterface("ct");
                    assert.true(is.netron2Interface(iCt));
                });

                describe("public properties", () => {
                    for (const ct of commonTypes) {
                        // eslint-disable-next-line
                        it(`_${ct.name}`, async () => {
                            assert.deepEqual(await iCt[`_${ct.name}`].get(), ct.value);
                        });
                    }
                });

                describe("public methods", () => {
                    for (const ct of commonTypes) {
                        // eslint-disable-next-line
                        it(`${ct.name}()`, async () => {
                            assert.deepEqual(await iCt[ct.name](), ct.value);
                        });
                    }
                });
            });

            it("get property of non-existing context", async () => {
                await peer.attachContext(new A(), "a");

                await promise.delay(500);

                const iA = peer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                assert.equal(await iA.propA.get(), "aaa");

                await peer.detachContext("a");

                await promise.delay(500);

                await assert.throws(async () => iA.propA.get(), adone.exception.NotExists);
            });

            it("get property of non-existing context (remote)", async () => {
                const netron2 = createNetron();
                await peer.attachContext(new A(), "a");

                await promise.delay(500);

                const remotePeer = await netron2.connect("default", netron.peer.info);

                const iA = remotePeer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                assert.equal(await iA.propA.get(), "aaa");

                await peer.detachContext("a");

                await promise.delay(500);

                await assert.throws(async () => iA.propA.get(), adone.exception.NotExists);
            });

            it("call method of non-existing context", async () => {
                await peer.attachContext(new A(), "a");

                await promise.delay(500);

                const iA = peer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                assert.equal(await iA.methodA(), "aaa");

                await peer.detachContext("a");

                await promise.delay(500);

                await assert.throws(async () => iA.methodA(), adone.exception.NotExists);
            });

            it("call method of non-existing context (remote)", async () => {
                const netron2 = createNetron();
                await peer.attachContext(new A(), "a");

                await promise.delay(500);

                const remotePeer = await netron2.connect("default", netron.peer.info);

                const iA = remotePeer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                assert.equal(await iA.methodA(), "aaa");

                await netron.detachContext("a");

                await promise.delay(500);

                await assert.throws(async () => iA.methodA(), adone.exception.NotExists);
            });
        });
    });
};
