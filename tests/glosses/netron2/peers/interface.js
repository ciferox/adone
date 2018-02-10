import { A, B, commonTypes, CommonTypes, ObjectStorage, Document, DocumentTypes, Soul, Devil, BodyStatuses } from "../contexts";
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

                describe("get values of public properties", () => {
                    for (const ct of commonTypes) {
                        // eslint-disable-next-line
                        it(`_${ct.name}`, async () => {
                            assert.deepEqual(await iCt[`_${ct.name}`].get(), ct.value);
                        });
                    }
                });

                describe("set values of public properties", () => {
                    for (const ct of commonTypes) {
                        // eslint-disable-next-line
                        it(`_${ct.name}`, async () => {
                            assert.strictEqual(await iCt[`_${ct.name}`].set(ct.otherValue), undefined);
                            assert.deepEqual(await iCt[`_${ct.name}`].get(), ct.otherValue);
                        });
                    }
                });

                describe("call public methods via non-void way", () => {
                    for (const ct of commonTypes) {
                        // eslint-disable-next-line
                        it(`${ct.name}()`, async () => {
                            assert.deepEqual(await iCt[ct.name](), ct.value);
                        });
                    }
                });

                describe("call public methods via void way", () => {
                    for (const ct of commonTypes) {
                        // eslint-disable-next-line
                        it(`${ct.name}()`, async () => {
                            assert.strictEqual(await iCt[`set_${ct.name}`].void(ct.value), undefined);
                            // assert.deepEqual(await iCt[`_${ct.name}`].get(), ct.otherValue);
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

            describe("weak context and inversion of control", () => {
                it("query strong interface", async () => {
                    const storage = new ObjectStorage("unknown", 1024);
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.peer.info);
                    await peer.attachContext(storage, "storage");
                    await promise.delay(300);
                    const iStorage = remotePeer.queryInterface("storage");
                    assert.true(is.netron2Interface(iStorage));
                    let name = await iStorage.name.get();
                    assert.strictEqual(name, "unknown");
                    await iStorage.name.set("simplestore");
                    name = await iStorage.name.get();
                    assert.strictEqual(name, "simplestore");
                    let size = await iStorage.getCapacity();
                    assert.strictEqual(size, 1024);
                    await iStorage.setCapacity(2048);
                    size = await iStorage.getCapacity();
                    assert.strictEqual(size, 2048);
                });

                it("query remotely instantiated object", async () => {
                    const idea = "To get out of difficulty, one usually must go throught it";
                    const storage = new ObjectStorage("simplestore", 3);
                    storage.addDocument("idea", new Document(idea, DocumentTypes.string));
                    await peer.attachContext(storage, "storage");
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.peer.info);
                    const iStorage = remotePeer.queryInterface("storage");
                    const size = await iStorage.getSize();
                    assert.strictEqual(size, 1);
                    const iDoc1 = await iStorage.getDocument("idea");
                    const data = await iDoc1.data.get();
                    assert.strictEqual(data, idea);
                });

                it("create remote object, pass it to other remote object and get it from there", async () => {
                    const idea = "To get out of difficulty, one usually must go throught it";
                    const storage = new ObjectStorage("simplestore", 3);
                    await peer.attachContext(storage, "storage");
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.peer.info);
                    const iStorage = remotePeer.queryInterface("storage");
                    const iDoc = await iStorage.createDocument(idea, DocumentTypes.string);
                    await iStorage.addDocument("idea", iDoc);
                    const iDocSame = await iStorage.getDocument("idea");
                    const data = await iDocSame.data.get();
                    assert.deepEqual(data, idea);
                    assert.deepEqual(iDoc.$def, iDocSame.$def);
                });

                describe("inverse object interfacing", function () {
                    this.timeout(60 * 10000);
                    it("simple", async () => {
                        const peter = new Soul("Peter");
                        const mike = new Soul("Mike");
                        const devil = new Devil();
                        await peer.attachContext(devil, "devil");
                        const netron2 = createNetron();
                        const remotePeer = await netron2.connect("default", netron.peer.info);
                        const iDevil = remotePeer.queryInterface("devil");

                        await iDevil.sellSoul(peter.name, peter);
                        await iDevil.sellSoul(mike.name, mike);
                        devil.possess("Mike");
                        await devil.takeVitality(50);
                        assert.strictEqual(mike.vitality, 50);
                        devil.possess("Peter");
                        await devil.takeVitality(100);
                        assert.strictEqual(peter.vitality, 0);
                        assert.deepEqual(peter.bodyStatus, BodyStatuses.Dead);
                    });

                    it.todo("complex", async () => {
                        const peter = new Soul("Peter");
                        const mike = new Soul("Mike");
                        const devil = new Devil();
                        await peer.attachContext(devil, "devil");
                        const netron2 = createNetron();
                        const remotePeer = await netron2.connect("default", netron.peer.info);
                        const iDevil = remotePeer.queryInterface("devil");

                        // await iDevil.sellSoul(peter.name, peter);
                        await iDevil.sellSoul(mike.name, mike);
                        devil.possess("Mike");
                        // await devil.takeVitality(50);
                        // assert.strictEqual(mike.vitality, 50);
                        // devil.possess("Peter");
                        // await devil.takeVitality(100);
                        // assert.strictEqual(peter.vitality, 0);
                        // assert.deepEqual(peter.bodyStatus, BodyStatuses.Dead);
                        await devil.doEvil("Mike", 50);
                        // const iMikeSoul = devil.souls.get("Mike");
                        // const mikeVitality = await iMikeSoul.vitality.get();
                        // const mikeBodyStatus = await iMikeSoul.bodyStatus.get();
                        // assert.strictEqual(mikeVitality, 0);
                        // assert.deepEqual(mikeBodyStatus, BodyStatuses.Dead);
                    });
                });

                // describe("Weak-contexts", () => {
                //     @Context()
                //     class Weak {
                //         @Public()
                //         doSomething() {
                //             return 888;
                //         }
                //     }

                //     @Context()
                //     class Strong {
                //         constructor(netron) {
                //             this.netron = netron;
                //             this.weak = new Weak();
                //         }

                //         @Public()
                //         getWeak() {
                //             return this.weak;
                //         }

                //         @Public()
                //         releaseWeak() {
                //             this.netron.releaseContext(this.weak);
                //             this.weak = null;
                //         }
                //     }

                //     it("call released context", async () => {
                //         superNetron.attachContext(new Strong(superNetron), "strong");

                //         exNetron = new adone.netron.Netron();

                //         await superNetron.bind();
                //         const peer = await exNetron.connect();
                //         const iStrong = peer.getInterfaceByName("strong");
                //         const iWeak = await iStrong.getWeak();
                //         assert.equal(await iWeak.doSomething(), 888);
                //         await iStrong.releaseWeak();
                //         const err = await assert.throws(async () => iWeak.doSomething());
                //         assert.ok(err instanceof adone.x.NotExists);
                //         assert.equal(err.message, "Context not exists");
                //     });

                //     it("deep contexting", async () => {
                //         let depthLabel;

                //         @Context()
                //         class CounterKeeper {
                //             constructor(keeper = null) {
                //                 this.keeper = keeper;
                //             }

                //             @Public()
                //             async getCounter() {
                //                 if (this.keeper) {
                //                     depthLabel++;
                //                     return (await this.keeper.getCounter()) + 1;
                //                 }
                //                 return 1;

                //             }

                //             @Public()
                //             async getNextKeeper(keeper) {
                //                 return new CounterKeeper(keeper);
                //             }
                //         }

                //         await superNetron.attachContext(new CounterKeeper(), "keeper");
                //         await superNetron.bind();
                //         const superNetronPeer = await exNetron.connect();
                //         let keeper = superNetronPeer.getInterfaceByName("keeper");
                //         let counter = 1;
                //         assert.strictEqual(await keeper.getCounter(), counter);
                //         while (counter < 30) {
                //             keeper = new CounterKeeper(keeper);
                //             assert.strictEqual(await keeper.getCounter(), ++counter);
                //             keeper = await keeper.getNextKeeper(keeper);
                //             depthLabel = 1;
                //             assert.strictEqual(await keeper.getCounter(), ++counter);
                //             assert.strictEqual(depthLabel, counter);
                //         }
                //     });

                //     describe("complex weak-context inversion", () => {

                //         let n1;
                //         let n2;

                //         afterEach(async () => {
                //             await n2.disconnect();
                //             await adone.promise.delay(100);
                //             await n1.disconnect();

                //             await superNetron.disconnect();
                //             await superNetron.unbind();
                //         });

                //         it("complex weak-context inversion", async () => {

                //             @Context()
                //             class PM {
                //                 @Public()
                //                 on(handle) {
                //                     return handle.emit();
                //                 }
                //             }

                //             @Context()
                //             class Handle {
                //                 @Public()
                //                 emit() {
                //                     return adone.ok;
                //                 }
                //             }

                //             @Context()
                //             class System {
                //                 constructor(pm) {
                //                     this.pm = pm;
                //                 }

                //                 @Public()
                //                 register() {
                //                     return this.pm.on(new Handle());
                //                 }
                //             }

                //             superNetron = new adone.netron.Netron({ isSuper: true });
                //             await superNetron.bind();

                //             n1 = new adone.netron.Netron();
                //             const client1 = await n1.connect();
                //             await n1.attachContextRemote(superNetron.uid, new PM(), "pm");

                //             n2 = new adone.netron.Netron();
                //             const client2 = await n2.connect();
                //             await n2.attachContextRemote(superNetron.uid, new System(client2.getInterfaceByName("pm")), "system");

                //             await adone.promise.delay(200);
                //             const system = client1.getInterfaceByName("system");

                //             const answer = await system.register();
                //             assert.strictEqual(answer, adone.ok);
                //         });
                //     });

                //     describe.skip("cycle weak-context transmission", () => {

                //         let n1;
                //         let n2;

                //         afterEach(async () => {
                //             await n1.disconnect();
                //             await n1.unbind();
                //             await superNetron.disconnect();
                //             await superNetron.unbind();
                //         });

                //         it.skip("cycle weak-context transmission", async () => {

                //             @Context()
                //             class Ball {
                //                 @Public()
                //                 hit() {
                //                     return "bounce";
                //                 }
                //             }

                //             @Context()
                //             class Basket {
                //                 constructor() {
                //                     this.ball = null;
                //                 }

                //                 @Public()
                //                 putBall(ball) {
                //                     assert.instanceOf(ball, adone.netron.Interface);
                //                     this.ball = ball;
                //                 }

                //                 @Public()
                //                 getBall() {
                //                     return this.ball;
                //                 }
                //             }

                //             superNetron = new adone.netron.Netron({ isSuper: true });
                //             await superNetron.bind();

                //             // n1 provides basket to Server
                //             n1 = new adone.netron.Netron();
                //             await n1.connect();
                //             const basket = new Basket();
                //             await n1.attachContextRemote(superNetron.uid, basket, "basket");

                //             // n2 put ball in basket via Server
                //             n2 = new adone.netron.Netron();
                //             const client2toS = await n2.connect();
                //             const remoteBasket = await client2toS.getInterfaceByName("basket");
                //             await remoteBasket.putBall(new Ball());

                //             // n1 get n2's ball from basket on Server
                //             let ball = basket.getBall();
                //             assert.ok(ball);
                //             assert.equal(await ball.hit(), "bounce");
                //             // and put it on another basket
                //             let anotherBasket = new Basket();
                //             anotherBasket.putBall(ball);
                //             n1.attachContext(anotherBasket, "basket");

                //             // n2 returns his ball from n1 and hit it
                //             await n1.bind({ port: 12509 });
                //             const client2to1 = await n2.connect({ port: 12509 });
                //             assert.equal(client2to1.uid, n1.uid);
                //             anotherBasket = await client2to1.getInterfaceByName("basket");
                //             ball = await anotherBasket.getBall();
                //             assert.equal(ball.hit(), "bounce");
                //         });
                //     });
                // });
            });

            // describe("multiple definitions", () => {
            //     @Context()
            //     class NumField {
            //         constructor(val) {
            //             this._val = val;
            //         }

            //         @Public()
            //         getValue() {
            //             return this._val;
            //         }
            //     }

            //     @Context()
            //     class NumSet {
            //         @Public()
            //         getFields(start, end) {
            //             const defs = new adone.netron.Definitions();
            //             for (let i = start; i < end; i++) {
            //                 defs.push(new NumField(i));
            //             }
            //             return defs;
            //         }

            //         @Public()
            //         setFields(fields) {
            //             this._fields = fields;
            //         }
            //     }

            //     it("get multiple definitions", async () => {
            //         const numSet = new NumSet();
            //         superNetron.attachContext(numSet, "numset");
            //         await superNetron.bind();
            //         const peer = await exNetron.connect();
            //         const iNumSet = peer.getInterfaceByName("numset");
            //         const defs = await iNumSet.getFields(0, 8);
            //         expect(defs.length).to.be.equal(8);
            //         for (let i = 0; i < defs.length; i++) {
            //             const def = defs.get(i);
            //             expect(await def.getValue()).to.be.equal(i);
            //         }
            //     });

            //     it("get multiple definitions through super-netron", async () => {
            //         const numSet = new NumSet();
            //         await superNetron.bind();
            //         const peer = await exNetron.connect();
            //         await exNetron.attachContextRemote(peer.uid, numSet, "numset");
            //         const exNetron2 = new adone.netron.Netron();
            //         const peer2 = await exNetron2.connect();
            //         const iNumSet = peer2.getInterfaceByName("numset");
            //         const defs = await iNumSet.getFields(0, 8);
            //         expect(defs.length).to.be.equal(8);
            //         for (let i = 0; i < defs.length; i++) {
            //             const def = defs.get(i);
            //             expect(await def.getValue()).to.be.equal(i);
            //         }
            //         await exNetron2.disconnect();
            //     });

            //     it("set multiple definitions (control inversion)", async () => {
            //         const numSet = new NumSet();
            //         superNetron.attachContext(numSet, "numset");
            //         await superNetron.bind();
            //         const peer = await exNetron.connect();
            //         const iNumSet = peer.getInterfaceByName("numset");
            //         const fields = new adone.netron.Definitions();
            //         for (let i = 0; i < 10; i++) {
            //             fields.push(new NumField(i));
            //         }
            //         await iNumSet.setFields(fields);
            //         expect(numSet._fields.length).to.be.equal(10);
            //         for (let i = 0; i < numSet._fields.length; i++) {
            //             const def = numSet._fields.get(i);
            //             expect(await def.getValue()).to.be.equal(i);
            //         }
            //     });

            //     it("set multiple definitions through super-netron (control inversion)", async () => {
            //         const numSet = new NumSet();
            //         await superNetron.bind();
            //         const peer = await exNetron.connect();
            //         await exNetron.attachContextRemote(peer.uid, numSet, "numset");
            //         const exNetron2 = new adone.netron.Netron();
            //         const peer2 = await exNetron2.connect();
            //         const iNumSet = peer2.getInterfaceByName("numset");
            //         const fields = new adone.netron.Definitions();
            //         for (let i = 0; i < 10; i++) {
            //             fields.push(new NumField(i));
            //         }
            //         await iNumSet.setFields(fields);
            //         expect(numSet._fields.length).to.be.equal(10);
            //         for (let i = 0; i < numSet._fields.length; i++) {
            //             const def = numSet._fields.get(i);
            //             expect(await def.getValue()).to.be.equal(i);
            //         }
            //         await exNetron2.disconnect();
            //     });
            // });
        });
    });
};
