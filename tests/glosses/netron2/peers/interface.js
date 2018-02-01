import { A, B } from "../contexts";

const {
    is
} = adone;

export default (testInterface) => {
    describe("interface", () => {
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
                await peer.attachContext(new A(), "a");
            });

            it("should throws with unknown context", () => {
                assert.throws(() => peer._getContextDefinition("not_exists"), adone.exception.Unknown);
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

        it("request meta 'ability' should return all netron options", async () => {
            const response = await peer.requestMeta("ability");
            assert.deepEqual(response.length, 1);
            const ability = response[0];
            assert.equal(ability.id, "ability");
            assert.deepEqual(ability.data, netron.options);
            assert.deepEqual(peer.meta.get("ability"), adone.util.omit(ability, "id"));
        });

        it("request meta 'contexts' should returl all context definitions", async () => {
            peer.attachContext(new A(), "a");
            peer.attachContext(new B(), "b");
            const response = await peer.requestMeta("contexts");
            assert.deepEqual(response.length, 1);
            const contexts = response[0];
            assert.equal(contexts.id, "contexts");
            assert.sameMembers(Object.keys(contexts.data), ["a", "b"]);
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

            it("attach context", async () => {
                assert.false(peer.hasContexts());
                await peer.attachContext(new A(), "a");
                assert.true(peer.hasContexts());
                assert.sameDeepMembers(peer.getContextNames(), ["a"]);
            });

            it("detach context", async () => {
                assert.false(peer.hasContexts());
                await peer.attachContext(new A(), "a");
                assert.true(peer.hasContexts());
                await peer.detachContext("a");
                assert.false(peer.hasContexts());
            });

            it("detach all contexts", async () => {
                await peer.attachContext(new A(), "a");
                await peer.attachContext(new B(), "b");
                assert.true(peer.hasContexts());
                assert.sameMembers(peer.getContextNames(), ["a", "b"]);
                await peer.detachAllContexts();
                assert.false(peer.hasContexts());
                assert.lengthOf(peer.getContextNames(), 0);
            });

            it("detach non-existing context", async () => {
                await assert.throws(async () => peer.detachContext("this_context_not_exists"), adone.exception.Unknown);
            });

            it("attach same context twice should have thrown", async () => {
                const a = new A();
                assert.false(peer.hasContexts());
                await peer.attachContext(a, "a");
                assert.true(peer.hasContexts());
                await assert.throws(async () => peer.attachContext(a, "a"), adone.exception.Exists);
            });

            //     it("context attach notification", async () => {
            //         await superNetron.bind();
            //         const peer = await exNetron.connect();

            //         superNetron.attachContext(new A(), "a");
            //         superNetron.attachContext(new B());

            //         assert.include(superNetron.getContextNames(), "a");
            //         assert.include(superNetron.getContextNames(), "B");

            //         await adone.promise.delay(100);
            //         assert.include(peer.getContextNames(), "a");
            //         assert.include(peer.getContextNames(), "B");
            //     });


            // describe("attach remote contexts", () => {
            //     let exNetron2;

            //     beforeEach(async () => {
            //         exNetron2 = new Netron();
            //     });

            //     afterEach(async () => {
            //         await superNetron.disconnect();
            //         await superNetron.unbind();
            //     });

            //     it("netrons should exchange contexts when connected", async () => {
            //         await superNetron.bind();
            //         const peer = await exNetron.connect();
            //         await exNetron.attachContextRemote(peer.uid, new A(), "a");
            //         await exNetron.attachContextRemote(peer.uid, new B());

            //         const peer2 = await exNetron2.connect();

            //         assert.include(superNetron.getContextNames(), "a");
            //         assert.include(superNetron.getContextNames(), "B");
            //         assert.include(peer.getContextNames(), "a");
            //         assert.include(peer.getContextNames(), "B");
            //         assert.include(peer2.getContextNames(), "a");
            //         assert.include(peer2.getContextNames(), "B");
            //     });

            //     it("attach notifications should be sent between the netrons when new contexts are attached", async () => {
            //         await superNetron.bind();
            //         const peer = await exNetron.connect();
            //         const peer2 = await exNetron2.connect();
            //         await exNetron.attachContextRemote(peer.uid, new A(), "a");
            //         await exNetron.attachContextRemote(peer.uid, new B());

            //         assert.include(superNetron.getContextNames(), "a");
            //         assert.include(superNetron.getContextNames(), "B");

            //         await adone.promise.delay(100);
            //         assert.include(peer.getContextNames(), "a");
            //         assert.include(peer.getContextNames(), "B");
            //         assert.include(peer2.getContextNames(), "a");
            //         assert.include(peer2.getContextNames(), "B");
            //     });

            //     it("double attach same context should have thrown", async () => {
            //         const ctx = new A();

            //         await superNetron.bind();
            //         const peer = await exNetron.connect();

            //         await exNetron.attachContextRemote(peer.uid, ctx, "a");
            //         const err = await assert.throws(async () => exNetron.attachContextRemote(peer.uid, ctx, "a"));
            //         assert.instanceOf(err, adone.exception.Exists);
            //     });
            // });

            // describe("detach contexts", () => {
            //     it("detach notification", async () => {
            //         await superNetron.bind();
            //         superNetron.attachContext(new A(), "a");
            //         superNetron.attachContext(new B());
            //         const peer = await exNetron.connect();

            //         superNetron.detachContext("a");
            //         superNetron.detachContext("B");

            //         await adone.promise.delay(100);
            //         assert.notInclude(peer.getContextNames(), "a");
            //         assert.notInclude(peer.getContextNames(), "B");
            //     });
            // });

            // describe("detach remote contexts", () => {
            //     let exNetron2;

            //     beforeEach(async () => {
            //         exNetron2 = new Netron();
            //     });

            //     afterEach(async () => {
            //         await superNetron.disconnect();
            //         await superNetron.unbind();
            //     });

            //     it("detach not existing context", async () => {
            //         await superNetron.bind();
            //         const peer = await exNetron.connect();

            //         const e = await assert.throws(async () => exNetron.detachContextRemote(peer.uid, "this_context_not_exists"));
            //         assert.instanceOf(e, adone.exception.NotExists);
            //     });

            //     it("valid way", async () => {
            //         await superNetron.bind();
            //         const peer = await exNetron.connect();

            //         await exNetron.attachContextRemote(peer.uid, new A(), "a");
            //         await exNetron.attachContextRemote(peer.uid, new B());

            //         assert.include(peer.getContextNames(), "a");
            //         assert.include(peer.getContextNames(), "B");

            //         await exNetron.detachContextRemote(peer.uid, "a");
            //         await exNetron.detachContextRemote(peer.uid, "B");

            //         assert.notInclude(superNetron.getContextNames(), "a");
            //         assert.notInclude(superNetron.getContextNames(), "B");
            //     });

            //     it("detach notification", async () => {
            //         await superNetron.bind();
            //         const peer = await exNetron.connect();
            //         await exNetron.attachContextRemote(peer.uid, new A(), "a");
            //         await exNetron.attachContextRemote(peer.uid, new B());

            //         const peer2 = await exNetron2.connect();
            //         assert.include(peer2.getContextNames(), "a");
            //         assert.include(peer2.getContextNames(), "B");

            //         await exNetron.detachContextRemote(peer.uid, "a");
            //         await exNetron.detachContextRemote(peer.uid, "B");

            //         await adone.promise.delay(100);
            //         assert.notInclude(peer2.getContextNames(), "a");
            //         assert.notInclude(peer2.getContextNames(), "B");
            //     });
            // });




            // it("obtain interface of netron context", async () => {
            //     @Context()
            //     class CtxA {
            //         @Public()
            //         method1() {
            //             return "Adone";
            //         }
            //     }
            //     await netron.attachContext(new CtxA(), "a");
            //     const ownPeer = await netron.connect(null);
            //     const iA = ownPeer.queryInterface("a");
            //     assert.equal(await iA.method1(), "Adone");

            //     await assert.throws(async () => ownPeer.disconnect());
            // });

            // it("attach remote context should simply attach context", async () => {
            //     @Context()
            //     class CtxA {
            //         @Public()
            //         method1() {
            //             return "Adone";
            //         }
            //     }
            //     const ownPeer = await netron.connect(null);
            //     await ownPeer.attachContextRemote(new CtxA());
            //     const iA = ownPeer.queryInterface("CtxA");
            //     assert.equal(await iA.method1(), "Adone");
            //     assert.sameMembers(netron.getContextNames(), ["CtxA"]);

            //     await ownPeer.detachContextRemote("CtxA");
            //     assert.lengthOf(netron.getContextNames(), 0);
            // });
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
    
        describe("interfaces", () => {
            // let exNetron2;
    
            // @Context()
            // class A {
            //     @Public()
            //     property = null;
    
            //     @Public()
            //     undefinedProperty = undefined;
    
            //     @Public()
            //     storage = null;
    
            //     @Public()
            //     counter = 0;
    
            //     @Public()
            //     method(...args) {
            //         return args;
            //     }
    
            //     @Public()
            //     errorMethod() {
            //         throw Error("I'm an error!");
            //     }
    
            //     @Public()
            //     voidMethod(...args) {
            //         ++this.counter;
    
            //         if (!is.nil(args)) {
            //             this.storage = args;
            //         }
            //     }
            // }
    
            // @Context()
            // class B {
            //     @Public()
            //     getWeakContext() {
            //         return (new A());
            //     }
            // }
    
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
            //     await adone.promise.delay(1000);
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
            //                         await adone.promise.delay(300);
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
    });
};
