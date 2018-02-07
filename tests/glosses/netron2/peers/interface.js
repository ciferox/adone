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

            // it("should not emit events about conexts to context origin netron in super mode", async () => {
            //     await superNetron.bind();
            //     await exNetron.connect();
            //     let nCatchedEvent = false;
            //     let n2CatchedEvent = false;
            //     await exNetron.onRemote(superNetron.uid, "context detach", (peer, ctxData) => {
            //         nCatchedEvent = true;
            //     });

            //     await exNetron.attachContextRemote(superNetron.uid, new A(), "a");
            //     await exNetron.attachContextRemote(superNetron.uid, new B(), "b");
            //     exNetron2 = new Netron();
            //     await exNetron2.connect();


            //     await exNetron2.onRemote(superNetron.uid, "context detach", (peer, ctxData) => {
            //         n2CatchedEvent = true;
            //     });

            //     await exNetron.detachContextRemote(superNetron.uid, "a");
            //     await promise.delay(1000);
            //     await superNetron.disconnect();
            //     await superNetron.unbind();
            //     assert.equal(nCatchedEvent, false);
            //     assert.equal(n2CatchedEvent, true);
            // });

            // for (const contextType of ["Strict", "Weak"]) {
            //     // eslint-disable-next-line
            //     describe(contextType, () => {
            //         for (const currentCase of ["local", "remote", "super remote"]) {
            //             // eslint-disable-next-line
            //             describe(currentCase, () => {
            //                 let netron;
            //                 let uid;
            //                 let iface;

            //                 beforeEach(async () => {

            //                     if (currentCase === "remote") {

            //                         superNetron.attachContext(new A(), "a");
            //                         superNetron.attachContext(new B(), "b");
            //                         await superNetron.bind();
            //                         await exNetron.connect();
            //                         netron = exNetron;
            //                         uid = superNetron.uid;

            //                     } else if (currentCase === "super remote") {

            //                         await superNetron.bind();
            //                         await exNetron.connect();
            //                         await exNetron.attachContextRemote(superNetron.uid, new A(), "a");
            //                         await exNetron.attachContextRemote(superNetron.uid, new B(), "b");
            //                         exNetron2 = new Netron();
            //                         await exNetron2.connect();
            //                         netron = exNetron2;
            //                         uid = superNetron.uid;

            //                     } else if (currentCase === "local") {

            //                         superNetron.attachContext(new A(), "a");
            //                         superNetron.attachContext(new B(), "b");
            //                         netron = superNetron;
            //                         uid = null;

            //                     } else {
            //                         throw Error(`Unknown case: ${currentCase}`);
            //                     }

            //                     if (contextType === "Strict") {
            //                         iface = netron.getInterfaceByName("a", uid);
            //                     } else if (contextType === "Weak") {
            //                         const tmp = netron.getInterfaceByName("b", uid);
            //                         iface = await tmp.getWeakContext();
            //                     } else {
            //                         throw Error(`Unknown context type: ${contextType}`);
            //                     }
            //                 });

            //                 afterEach(async () => {
            //                     if (currentCase.includes("remote")) {
            //                         await exNetron.disconnect();
            //                         await promise.delay(300);
            //                         if (currentCase === "super remote") {
            //                             await exNetron2.disconnect();
            //                         }
            //                         await superNetron.unbind();
            //                     }
            //                 });

            //                 it("property set/get", async () => {
            //                     assert.strictEqual(await iface.property.get(), null);

            //                     await iface.property.set(true);
            //                     assert.strictEqual(await iface.property.get(), true);

            //                     await iface.property.set(false);
            //                     assert.strictEqual(await iface.property.get(), false);

            //                     await iface.property.set(10);
            //                     assert.strictEqual(await iface.property.get(), 10);

            //                     await iface.property.set("string");
            //                     assert.strictEqual(await iface.property.get(), "string");

            //                     const arr = [true, 1, "string"];
            //                     await iface.property.set(arr);
            //                     assert.deepEqual(await iface.property.get(), arr);

            //                     const obj = { a: 1, b: "string" };
            //                     await iface.property.set(obj);
            //                     assert.deepEqual(await iface.property.get(), obj);
            //                 });

            //                 it("get default value", async () => {
            //                     const iface = netron.getInterfaceByName("a", uid);
            //                     assert.strictEqual(await iface.undefinedProperty.get(100500), 100500, "default value");
            //                 });

            //                 it("call function with return", async () => {
            //                     let result;
            //                     const data = [true, 1, "string", { a: true, b: 1, c: "string" }, [true, 1, "string"]];

            //                     for (const t of data) {
            //                         result = await iface.method(t);
            //                         assert.deepEqual(result, [t]);
            //                         result = await iface.method(t, t);
            //                         assert.deepEqual(result, [t, t]);
            //                     }
            //                 });

            //                 it("exception in function call", async () => {
            //                     const e = await assert.throws(async () => iface.errorMethod());
            //                     assert.instanceOf(e, Error);
            //                     assert.equal(e.message, "I'm an error!");
            //                 });

            //                 it("call function without return", async () => {
            //                     const data = [true, 1, "string", { a: true, b: 1, c: "string" }, [true, 1, "string"]];
            //                     let counter = 0;

            //                     for (const t of data) {
            //                         await iface.voidMethod();
            //                         assert.strictEqual(await iface.counter.get(), ++counter, "without arguments");
            //                         assert.deepEqual(await iface.storage.get(), [], "without arguments");

            //                         await iface.voidMethod(1);
            //                         assert.strictEqual(await iface.counter.get(), ++counter, "one arguments");
            //                         assert.deepEqual(await iface.storage.get(), [1], "one arguments");

            //                         await iface.voidMethod(1, t);
            //                         assert.strictEqual(await iface.counter.get(), ++counter, "multiple arguments");
            //                         assert.deepEqual(await iface.storage.get(), [1, t], "multiple arguments");
            //                     }
            //                 });
            //             });
            //         }
            //     });
            // }
        });

        // describe("interfaces", () => {
        //     describe("_queryInterfaceByDefinition()", () => {
        //         let netron;

        //         beforeEach(async () => {
        //             netron = new Netron(peerId);
        //             netron.attachContext(new A(), "a");
        //             //     await superNetron.bind();
        //             //     await exNetron.connect();
        //         });

        //         // afterEach(async () => {
        //         //     await exNetron.disconnect();
        //         //     await superNetron.unbind();
        //         // });

        //         it("should return interface for valid context", () => {
        //             const def = netron.peer._getContextDefinition("a");
        //             const iface = netron.peer._queryInterfaceByDefinition(def.id);
        //             assert.true(is.netron2Interface(iface));
        //         });

        //         it("should throw for unknown context", () => {
        //             assert.throws(() => netron.peer._queryInterfaceByDefinition(100500), adone.exception.Unknown);
        //         });

        //         // it("remote", () => {
        //         //     const def = exNetron.getDefinitionByName("a", superNetron.uid);
        //         //     const iface = exNetron._queryInterfaceByDefinition(def.id, superNetron.uid);
        //         //     assert.ok(iface);
        //         //     assert.instanceOf(iface, adone.netron.Interface);

        //         //     assert.throws(() => exNetron._queryInterfaceByDefinition(100500, superNetron.uid), adone.exception.Unknown);
        //         // });
        //     });

        //     describe("queryInterface()", () => {
        //         let netron;

        //         beforeEach(async () => {
        //             netron = new Netron(peerId);
        //             netron.attachContext(new A(), "a");
        //             // await superNetron.bind();
        //             // await exNetron.connect();
        //         });

        //         // afterEach(async () => {
        //         //     await exNetron.disconnect();
        //         //     await superNetron.unbind();
        //         // });

        //         it("should return interface for valid context", () => {
        //             const iface = netron.peer.getInterfaceByName("a");
        //             assert.true(is.netron2Interface(iface));
        //         });

        //         it("should throw for unknown context", () => {
        //             assert.throws(() => netron.peer.getInterfaceByName("not_exists"), adone.exception.Unknown);
        //         });

        //         // it("remote", () => {
        //         //     const iface = exNetron.getInterfaceByName("a", superNetron.uid);
        //         //     assert.ok(iface);
        //         //     assert.instanceOf(iface, adone.netron.Interface);

        //         //     assert.throws(() => {
        //         //         exNetron.getInterfaceByName("not_exists", superNetron.uid);
        //         //     }, adone.exception.Unknown);
        //         // });
        //     });

        //     describe("getPeerForInterface()", () => {
        //         let netron;

        //         beforeEach(async () => {
        //             netron = new Netron(peerId);
        //             netron.attachContext(new A(), "a");
        //             //     await superNetron.bind();
        //             //     peer = await exNetron.connect();
        //         });

        //         // afterEach(async () => {
        //         //     await exNetron.disconnect();
        //         //     await superNetron.unbind();
        //         // });

        //         it("Netron#getPeerForInterface() should return own peer for interface obtained directly from netron instance", () => {
        //             const iInstance = netron.peer.getInterfaceByName("a");
        //             const ownPeer = netron.getPeerForInterface(iInstance);
        //             assert.deepEqual(ownPeer, netron.peer);
        //         });

        //         it("should throw for non-interface instance", () => {
        //             assert.throws(() => netron.getPeerForInterface(new A()), adone.exception.NotValid);
        //         });

        //         // it("remote", () => {
        //         //     const iface = exNetron.getInterfaceByName("a", superNetron.uid);
        //         //     const peerIface = exNetron.getPeerForInterface(iface);
        //         //     assert.ok(peerIface);
        //         //     assert.instanceOf(peerIface, adone.netron.Peer);
        //         //     assert.equal(peerIface.uid, superNetron.uid);
        //         //     assert.equal(peerIface.uid, superNetron.uid);
        //         //     assert.equal(peerIface, peer);

        //         //     assert.throws(() => exNetron.getPeerForInterface(null), adone.exception.InvalidArgument);
        //         // });
        //     });

        //     it("release local interface", () => {
        //         const n = new Netron(peerId);
        //         n.attachContext(new A(), "a");

        //         const iInstance = n.peer.queryInterface("a");

        //         assert.true(is.netron2Interface(iInstance));
        //         assert.sameMembers([...n.peer.interfaces.values()], [iInstance]);

        //         n.peer.releaseInterface(iInstance);

        //         assert.equal(n.peer.interfaces.size, 0);
        //     });
        // });
    });
};
