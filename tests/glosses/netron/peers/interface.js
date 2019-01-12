import { A, B, commonTypes, CommonTypes, ObjectStorage, Document, DocumentTypes, Soul, Devil, BodyStatuses, Strong, CounterKeeper, NumSet, NumField, StdErrs, AdoneErrs, adoneErrors, netronErrors, NonStdErr/*, NodeErrs, nodeErrors*/ } from "../contexts";
import { createNetron } from "../common";

const {
    is,
    promise
} = adone;

const __ = adone.private(adone.netron);

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

        it("short path to peer id", () => {
            assert.strictEqual(peer.id, peer.info.id.asBase58());
            assert.strictEqual(netron.peer.id, netron.peer.info.id.asBase58());
        });

        describe("_getContextDefinition()", () => {
            beforeEach(async () => {
                await netron.attachContext(new A(), "a");
                await promise.delay(500);
            });

            it("should throws with unknown context", () => {
                assert.throws(() => peer._getContextDefinition("not_exists"), adone.error.NotExists);
            });

            it("_getContextDefinition() should return definition of attached context owned by netron instance", () => {
                const def = peer._getContextDefinition("a");
                assert.ok(is.netron2Definition(def));
                assert.instanceOf(def, adone.netron.Definition);
                assert.equal(def.name, "A");
            });

            it("OwnPeer#_getContextDefinition() should return definition of attached context of associated netron", () => {
                const def = peer._getContextDefinition("a");
                assert.ok(is.netron2Definition(def));
                assert.instanceOf(def, adone.netron.Definition);
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
                const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
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
                const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
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
                assert.instanceOf(err, adone.error.Exists);
            });

            it("detach contexts", async () => {
                const netron2 = createNetron();
                const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
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
                await assert.throws(async () => peer.detachContext("hack"), adone.error.NotExists);
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
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    const def = remotePeer._getContextDefinition("a");
                    const iface = remotePeer._queryInterfaceByDefinition(def.id);
                    assert.true(is.netron2Interface(iface));
                    assert.strictEqual(iface[__.I_DEFINITION_SYMBOL].id, def.id);
                });

                it("should throw for unknown context", () => {
                    assert.throws(() => netron.peer._queryInterfaceByDefinition(100500), adone.error.Unknown);
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
                const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);

                await peer.attachContext(new A(), "a");
                await promise.delay(500);

                const iA = remotePeer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                assert.true(remotePeer.interfaces.has(iA[__.I_DEFINITION_SYMBOL].id));
            });

            it("query non-existing interface should have thrown", async () => {
                assert.throws(() => peer.queryInterface("a"), adone.error.NotExists);
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
                const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);

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
                assert.throws(() => peer.releaseInterface(new A()), adone.error.NotValid);
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
                    assert.throws(() => netron.getPeerForInterface(new A()), adone.error.NotValid);
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

                    remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);

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

                await assert.throws(async () => iA.propA.get(), adone.error.NotExists);
            });

            it("get property of non-existing context (remote)", async () => {
                const netron2 = createNetron();
                await peer.attachContext(new A(), "a");

                await promise.delay(500);

                const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);

                const iA = remotePeer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                assert.equal(await iA.propA.get(), "aaa");

                await peer.detachContext("a");

                await promise.delay(500);

                await assert.throws(async () => iA.propA.get(), adone.error.NotExists);
            });

            it("call method of non-existing context", async () => {
                await peer.attachContext(new A(), "a");

                await promise.delay(500);

                const iA = peer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                assert.equal(await iA.methodA(), "aaa");

                await peer.detachContext("a");

                await promise.delay(500);

                await assert.throws(async () => iA.methodA(), adone.error.NotExists);
            });

            it("call method of non-existing context (remote)", async () => {
                const netron2 = createNetron();
                await peer.attachContext(new A(), "a");

                await promise.delay(500);

                const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);

                const iA = remotePeer.queryInterface("a");
                assert.true(is.netron2Interface(iA));
                assert.equal(await iA.methodA(), "aaa");

                await netron.detachContext("a");

                await promise.delay(500);

                await assert.throws(async () => iA.methodA(), adone.error.NotExists);
            });

            describe("weak context and inversion of control", () => {
                it("query strong interface", async () => {
                    const storage = new ObjectStorage("unknown", 1024);
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
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
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    const iStorage = remotePeer.queryInterface("storage");
                    const size = await iStorage.getSize();
                    assert.strictEqual(size, 1);
                    const iDoc1 = await iStorage.getDocument("idea");
                    const data = await iDoc1.data.get();
                    assert.strictEqual(data, idea);
                });

                it("create remote object, obtain it and send again to remote", async function () {
                    this.timeout(600 * 100000);
                    const idea = "To get out of difficulty, one usually must go throught it";
                    const storage = new ObjectStorage("simplestore", 3);
                    await peer.attachContext(storage, "storage");
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    const iStorage = remotePeer.queryInterface("storage");
                    const iDoc = await iStorage.createDocument(idea, DocumentTypes.string);
                    await iStorage.addDocument("idea", iDoc);
                    const iDocSame = await iStorage.getDocument("idea");
                    const data = await iDocSame.data.get();
                    assert.instanceOf(storage.getDocument("idea"), Document);
                    assert.deepEqual(data, idea);
                    assert.deepEqual(iDoc.$def, iDocSame.$def);
                });

                describe("inverse object interfacing", () => {
                    it("simple", async () => {
                        const peter = new Soul("Peter");
                        const mike = new Soul("Mike");
                        const devil = new Devil();
                        await peer.attachContext(devil, "devil");
                        const netron2 = createNetron();
                        const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
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

                    it("complex", async () => {
                        const peter = new Soul("Peter");
                        const mike = new Soul("Mike");
                        const devil = new Devil();
                        await peer.attachContext(devil, "devil");
                        const netron2 = createNetron();
                        const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
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
                        await devil.doEvil("Mike", 50);
                        const iMikeSoul = devil.souls.get("Mike");
                        const mikeVitality = await iMikeSoul.vitality.get();
                        const mikeBodyStatus = await iMikeSoul.bodyStatus.get();
                        assert.strictEqual(mikeVitality, 0);
                        assert.deepEqual(mikeBodyStatus, BodyStatuses.Dead);
                    });
                });

                it("call released weak context", async function () {
                    this.timeout(600 * 10000);
                    await peer.attachContext(new Strong(peer.netron), "strong");
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    const iStrong = remotePeer.queryInterface("strong");
                    const iWeak = await iStrong.getWeak();
                    assert.equal(await iWeak.doSomething(), 888);
                    await iStrong.releaseWeak();
                    const err = await assert.throws(async () => iWeak.doSomething());
                    assert.ok(err instanceof adone.error.NotExists);
                    assert.match(err.message, /Context with definition id /);
                });

                it("deep weak contexting", async () => {
                    await peer.attachContext(new CounterKeeper(), "keeper");
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    let keeper = remotePeer.queryInterface("keeper");
                    let counter = 1;
                    assert.strictEqual(await keeper.getCounter(), counter);
                    while (counter < 30) {
                        keeper = new CounterKeeper(keeper);
                        assert.strictEqual(await keeper.getCounter(), ++counter);
                        keeper = await keeper.getNextKeeper(keeper);
                        CounterKeeper.setValue(1);
                        assert.strictEqual(await keeper.getCounter(), ++counter);
                        assert.strictEqual(CounterKeeper.getValue(), counter);
                    }
                });
            });

            describe("multiple definitions", () => {
                it("get multiple definitions", async () => {
                    const numSet = new NumSet();
                    await peer.attachContext(numSet, "numset");
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    const iNumSet = remotePeer.queryInterface("numset");
                    const defs = await iNumSet.getFields(0, 8);
                    expect(defs.length).to.be.equal(8);
                    for (let i = 0; i < defs.length; i++) {
                        const def = defs.get(i);
                        expect(await def.getValue()).to.be.equal(i);
                    }
                });

                it("set multiple definitions (control inversion)", async () => {
                    const numSet = new NumSet();
                    await peer.attachContext(numSet, "numset");
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    const iNumSet = remotePeer.queryInterface("numset");
                    const fields = new adone.netron.Definitions();
                    for (let i = 0; i < 10; i++) {
                        fields.push(new NumField(i));
                    }
                    await iNumSet.setFields(fields);
                    expect(numSet._fields.length).to.be.equal(10);
                    for (let i = 0; i < numSet._fields.length; i++) {
                        const def = numSet._fields.get(i);
                        expect(await def.getValue()).to.be.equal(i);
                    }
                });
            });

            describe("exceptions", () => {
                it("standart exceptions", async () => {
                    let okCount = 0;
                    await peer.attachContext(new StdErrs(), "a");
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    const iA = remotePeer.queryInterface("a");
                    const stdErrors = adone.error.stdExceptions;
                    for (const StdError of stdErrors) {
                        try {
                            await iA[`throw${StdError.prototype.name}`]();
                        } catch (err) {
                            okCount += (err instanceof StdError ? 1 : 0);
                        }
                    }
                    assert.strictEqual(okCount, stdErrors.length);
                });

                it("adone exceptions", async () => {
                    let okCount = 0;

                    await peer.attachContext(new AdoneErrs(), "a");
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    const iA = remotePeer.queryInterface("a");

                    for (const AdoneError of adoneErrors) {
                        if (netronErrors.includes(AdoneError.name)) {
                            continue;
                        }
                        try {
                            const fnName = `throw${AdoneError.name}`;
                            await iA[fnName]();
                        } catch (err) {
                            okCount += (err instanceof AdoneError ? 1 : 0);
                        }
                    }
                    assert.strictEqual(okCount, adoneErrors.length - netronErrors.length);
                });

                it.todo("node internal errors", async () => {
                    let okCount = 0;
                    await peer.attachContext(new NodeErrs(), "a");
                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    const iA = remotePeer.queryInterface("a");
                    for (const [name, Exc] of Object.entries(nodeErrors)) {
                        try {
                            const fnName = `throw${name}`;
                            await iA[fnName]();
                        } catch (err) {
                            okCount += (err instanceof Error ? 1 : 0);
                        }
                    }

                    assert.strictEqual(okCount, Object.keys(nodeErrors).length);
                });

                it("should not fail when a non-standard error is sent", async () => {
                    await peer.attachContext(new NonStdErr(), "a");

                    const netron2 = createNetron();
                    const remotePeer = await netron2.connect("default", netron.getNetCore("default").peerInfo);
                    const iA = remotePeer.queryInterface("a");

                    await assert.throws(async () => {
                        await iA.throw();
                    }, "Hello World!");
                });
            });
        });
    });
};
