const {
    is,
    netron2: { PeerId, PeerInfo, Netron, DContext, DPublic }
} = adone;

describe("netron2", "Netron", () => {
    @DContext()
    class A {
        @DPublic()
        method() { }
    }

    @DContext()
    class B {
        @DPublic()
        method() { }
    }

    const peerId = PeerId.create();

    describe("initialization", () => {
        it("default", () => {
            const n = new Netron();

            assert.true(is.netron2(n));
            assert.true(is.peerInfo(n.peer.info));
        });

        it("with precreated PeerId", () => {
            const n = new Netron(peerId);
            assert.deepEqual(peerId, n.peer.info.id);
        });

        it("no netcores", () => {
            const n = new Netron(peerId);

            assert.instanceOf(n.netCores, Map);
            assert.equal(n.netCores.size, 0);
        });

        it("no contexts", () => {
            const n = new Netron(peerId);

            assert.instanceOf(n.contexts, Map);
            assert.equal(n.contexts.size, 0);
        });

        it("no peers", () => {
            const n = new Netron(peerId);

            assert.instanceOf(n.peers, Map);
            assert.equal(n.peers.size, 0);
        });
    });

    it("own peer", () => {
        const n = new Netron();
        const ownPeer = n.peer;
        assert.true(is.netron2OwnPeer(ownPeer));
        assert.deepEqual(ownPeer.netron, n);
    });

    describe("getPeer()", () => {
        let netron;
        beforeEach(() => {
            netron = new Netron(peerId);
        });

        it("should return own peer by PeerInfo instance", () => {
            const peerInfo = adone.netron2.PeerInfo.create(peerId);
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
        describe("no contexts", () => {
            it("Netron#getContextNames() should return empty array", () => {
                const n = new Netron(peerId);
                const contexts = n.getContextNames();

                assert(is.array(contexts));
                assert.equal(contexts.length, 0);
            });

            it("OwnPeer#getContextNames() should return empty array", () => {
                const n = new Netron(peerId);
                const contexts = n.peer.getContextNames();

                assert(is.array(contexts));
                assert.equal(contexts.length, 0);
            });
        });

        describe("attach/detach contexts", () => {
            it("attachContext(instance)", () => {
                const n = new Netron(peerId);
                n.attachContext(new A());

                assert.true(n.hasContexts());
                assert.true(n.hasContext("A"));
                assert.sameMembers(n.getContextNames(), ["A"]);
            });

            it("attachContext(instance, name)", () => {
                const n = new Netron(peerId);
                n.attachContext(new A(), "a");

                assert.sameMembers(n.getContextNames(), ["a"]);
            });

            it("attach same context twice with same name should have thrown", () => {
                const n = new Netron(peerId);
                const a = new A();
                n.attachContext(a, "a");
                assert.throws(() => n.attachContext(a, "a"), adone.x.Exists);
            });

            it("attach different contexts with same name should have thrown", () => {
                const n = new Netron(peerId);
                n.attachContext(new A(), "a");
                assert.throws(() => n.attachContext(new B(), "a"), adone.x.Exists);
            });

            it("attach same context with different name should be ok", () => {
                const n = new Netron(peerId);
                const a = new A();
                n.attachContext(a, "a");
                n.attachContext(a, "A");
            });

            it("detach unknown context should have thrown", () => {
                const n = new Netron(peerId);
                assert.throws(() => n.detachContext("b"), adone.x.Unknown);
            });

            it("detach attached context", () => {
                const n = new Netron(peerId);
                const a = new A();
                n.attachContext(a, "a");
                assert.sameMembers(n.getContextNames(), ["a"]);
                n.detachContext("a");
                assert.lengthOf(n.getContextNames(), 0);
                assert.equal(n.contexts.size, 0);
                assert.equal(n._stubs.size, 0);
            });
        });

        describe("getStubById()", () => {
            let n;
            beforeEach(() => {
                n = new Netron();
            });

            it("known context", () => {
                n.attachContext(new A(), "a");

                const def = n.getDefinitionByName("a");
                const stub = n.getStubById(def.id);
                assert.true(is.netron2Stub(stub));
                assert.instanceOf(stub, adone.netron2.Stub);
            });

            it("unknown context - should have thrown", () => {
                assert.throws(() => n.getStubById(778899), adone.x.NotExists);
            });
        });

        describe("getDefinitionByName()", () => {
            let netron;
            // let peer;

            beforeEach(async () => {
                netron = new Netron();
                netron.attachContext(new A(), "a");
                // await superNetron.bind();
                // peer = await exNetron.connect();
            });

            // afterEach(async () => {
            //     await exNetron.disconnect();
            //     await superNetron.unbind();
            // });

            it("should throws with unknown context", () => {
                assert.throws(() => netron.getDefinitionByName("not_exists"), adone.x.Unknown);
            });

            it("Netron#getDefinitionByName() should return definition of attached context owned by netron instance", () => {
                const def = netron.getDefinitionByName("a");
                assert.ok(is.netron2Definition(def));
                assert.instanceOf(def, adone.netron2.Definition);
                assert.equal(def.name, "A");
            });

            it("OwnPeer#getDefinitionByName() should return definition of attached context of associated netron", () => {
                const ownPeer = netron.peer;
                const def = ownPeer.getDefinitionByName("a");
                assert.ok(is.netron2Definition(def));
                assert.instanceOf(def, adone.netron2.Definition);
                assert.equal(def.name, "A");
            });

            // it("remote", () => {
            //     const def = exNetron.getDefinitionByName("a", superNetron.uid);
            //     assert.ok(def);
            //     assert.instanceOf(def, adone.netron.Definition);
            //     assert.equal(def.name, "A");

            //     assert.notOk(exNetron.getDefinitionByName("not_exists", superNetron.uid));
            // });

            // it("peer", () => {
            //     const def = peer.getDefinitionByName("a", superNetron.uid);
            //     assert.ok(def);
            //     assert.instanceOf(def, adone.netron.Definition);
            //     assert.equal(def.name, "A");

            //     assert.notOk(peer.getDefinitionByName("not_exists", superNetron.uid));
            // });
        });
    });

    describe("RPC", () => {
        @DContext()
        class A {
            @DPublic()
            property = null;

            @DPublic()
            undefinedProperty = undefined;

            @DPublic()
            counter = 0;

            @DPublic()
            method(...args) {
                return args;
            }

            @DPublic()
            errorMethod() {
                throw new adone.x.Runtime("I'm an error!");
            }

            @DPublic()
            voidMethod(increment, secondArgument) {
                if (is.number(increment)) {
                    this.counter += increment;
                }
                if (secondArgument) {
                    this.property = secondArgument;
                }
            }

            @DPublic()
            timeout() {
                return adone.promise.delay(1000);
            }
        }

        for (const mode of ["local"/*, "remote", "super remote"*/]) {
            describe(mode, () => {
                let netron;
                let peerInfo;
                let defID;
                let n1;

                beforeEach(async () => {
                    n1 = new Netron();

                    if (mode === "remote") {
                        //     superNetron.attachContext(new A(), "a");
                        //     await superNetron.bind();
                        //     const peer = await exNetron.connect();
                        //     defID = peer.getDefinitionByName("a").id;

                        //     netron = exNetron;
                        //     uid = superNetron.uid;
                    } else if (mode === "super remote") {
                        //     await superNetron.bind();
                        //     await exNetron.connect();
                        //     await exNetron.attachContextRemote(superNetron.uid, new A(), "a");

                        //     const peer = await n2.connect();
                        //     defID = peer.getDefinitionByName("a").id;

                        //     netron = n2;
                        //     uid = superNetron.uid;
                    } else if (mode === "local") {
                        n1.attachContext(new A(), "a");
                        defID = n1.getDefinitionByName("a").id;
                        netron = n1;
                        peerInfo = null;
                    }
                });

                afterEach(async () => {
                    // await superNetron.disconnect();
                    // await superNetron.unbind();
                });

                it("set()/get() property", async () => {
                    assert.strictEqual(await netron.get(peerInfo, defID, "property"), null);

                    await netron.set(peerInfo, defID, "property", true);
                    assert.strictEqual(await netron.get(peerInfo, defID, "property"), true);

                    await netron.set(peerInfo, defID, "property", false);
                    assert.strictEqual(await netron.get(peerInfo, defID, "property"), false);

                    await netron.set(peerInfo, defID, "property", 10);
                    assert.strictEqual(await netron.get(peerInfo, defID, "property"), 10);

                    await netron.set(peerInfo, defID, "property", "string");
                    assert.strictEqual(await netron.get(peerInfo, defID, "property"), "string");

                    const arr = [true, 1, "string"];
                    await netron.set(peerInfo, defID, "property", arr);
                    assert.deepEqual(await netron.get(peerInfo, defID, "property"), arr);

                    const obj = { a: 1, b: "string" };
                    await netron.set(peerInfo, defID, "property", obj);
                    assert.deepEqual(await netron.get(peerInfo, defID, "property"), obj);
                });

                it("get() should return default value for undefined property", async () => {
                    assert.strictEqual(await netron.get(peerInfo, defID, "undefinedProperty", 100500), 100500, "default value");
                });

                it("call()", async () => {
                    let result;
                    const data = [true, 1, "string", { a: true, b: 1, c: "string" }, [true, 1, "string"]];

                    for (const t of data) {
                        result = await netron.call(peerInfo, defID, "method", t); // eslint-disable-line
                        assert.deepEqual(result, [t]);
                        result = await netron.call(peerInfo, defID, "method", t, t); // eslint-disable-line
                        assert.deepEqual(result, [t, t], "multiple arguments");
                    }
                });

                it("call method that throws", async () => {
                    const e = await assert.throws(async () => netron.call(peerInfo, defID, "errorMethod"));
                    assert.instanceOf(e, adone.x.Runtime);
                    assert.equal(e.message, "I'm an error!");
                });

                it("callVoid()", async () => {
                    const data = [true, 1, "string", { a: true, b: 1, c: "string" }, [true, 1, "string"]];
                    let counter = 0;

                    for (const t of data) {
                        await netron.call(peerInfo, defID, "voidMethod"); // eslint-disable-line
                        assert.strictEqual(await netron.get(peerInfo, defID, "counter"), counter, "without arguments"); // eslint-disable-line

                        await netron.call(peerInfo, defID, "voidMethod", 1); // eslint-disable-line
                        ++counter;
                        assert.strictEqual(await netron.get(peerInfo, defID, "counter"), counter, "one arguments"); // eslint-disable-line

                        await netron.call(peerInfo, defID, "voidMethod", 1, t); // eslint-disable-line
                        ++counter;
                        assert.strictEqual(await netron.get(peerInfo, defID, "counter"), counter, "multiple arguments"); // eslint-disable-line
                        assert.deepEqual(await netron.get(peerInfo, defID, "property"), t, "multiple arguments"); // eslint-disable-line
                    }
                });
            });
        }

        // for (const currentCase of ["remote", "super remote"]) {
        //     describe(`timeouts:${currentCase}`, () => {
        //         let netron;
        //         let uid;
        //         let defID;
        //         let exNetron2;
        //         let exNetron;
        //         let superNetron;

        //         beforeEach(async () => {
        //             exNetron = new Netron({
        //                 responseTimeout: 500
        //             });
        //             superNetron = new Netron({
        //                 isSuper: true,
        //                 responseTimeout: 500
        //             });
        //             exNetron2 = new Netron({
        //                 responseTimeout: 500
        //             });

        //             if (currentCase === "remote") {

        //                 superNetron.attachContext(new A(), "a");
        //                 await superNetron.bind();
        //                 const peer = await exNetron.connect();
        //                 defID = peer.getDefinitionByName("a").id;

        //                 netron = exNetron;
        //                 uid = superNetron.uid;

        //             } else if (currentCase === "super remote") {

        //                 await superNetron.bind();
        //                 await exNetron.connect();
        //                 await exNetron.attachContextRemote(superNetron.uid, new A(), "a");

        //                 const peer = await exNetron2.connect();
        //                 defID = peer.getDefinitionByName("a").id;

        //                 netron = exNetron2;
        //                 uid = superNetron.uid;

        //             } else if (currentCase === "local") {

        //                 superNetron.attachContext(new A(), "a");
        //                 defID = superNetron.getDefinitionByName("a").id;
        //                 netron = superNetron;
        //                 uid = null;

        //             } else {
        //                 throw Error(`Unknown case: ${currentCase}`);
        //             }
        //         });

        //         afterEach(async () => {
        //             await superNetron.disconnect();
        //             await superNetron.unbind();
        //             await exNetron.disconnect();
        //             await superNetron.unbind();
        //         });

        //         it("get should throw", async () => {
        //             let err;
        //             try {
        //                 await netron.get(uid, defID, "timeout");
        //             } catch (_err) {
        //                 err = _err;
        //             }
        //             if (!err) {
        //                 throw new Error("No error was thrown");
        //             }
        //             expect(err).to.be.instanceOf(adone.x.NetronTimeout);
        //             expect(err.message).to.be.equal("Response timeout 500ms exceeded");
        //         });

        //         it("set should not throw", async () => {
        //             await netron.set(uid, defID, "timeout");
        //         });

        //         it("call should throw", async () => {
        //             let err;
        //             try {
        //                 await netron.call(uid, defID, "timeout");
        //             } catch (_err) {
        //                 err = _err;
        //             }
        //             if (!err) {
        //                 throw new Error("No error was thrown");
        //             }
        //             expect(err).to.be.instanceOf(adone.x.NetronTimeout);
        //             expect(err.message).to.be.equal("Response timeout 500ms exceeded");
        //         });

        //         it("call void shoult not throw", async () => {
        //             await netron.callVoid(uid, defID, "timeout");
        //         });

        //         it("get should throw if the peer disconnects", async () => {
        //             const peer = netron.getPeer(uid);
        //             setTimeout(() => peer.disconnect(), 200);
        //             let err;
        //             try {
        //                 await netron.get(uid, defID, "timeout");
        //             } catch (_err) {
        //                 err = _err;
        //             }
        //             if (!err) {
        //                 throw new Error("No error was thrown");
        //             }
        //             if (err instanceof adone.x.NetronTimeout) {
        //                 throw new Error("Wrong error was thrown");
        //             }
        //             expect(err).to.be.instanceOf(adone.x.NetronPeerDisconnected);
        //         });

        //         it("set should not throw if the peer disconnects", async () => {
        //             const peer = netron.getPeer(uid);
        //             setTimeout(() => peer.disconnect(), 200);
        //             await netron.set(uid, defID, "timeout");
        //         });

        //         it("call should throw if the peer disconnects", async () => {
        //             const peer = netron.getPeer(uid);
        //             setTimeout(() => peer.disconnect(), 200);
        //             let err;
        //             try {
        //                 await netron.call(uid, defID, "timeout");
        //             } catch (_err) {
        //                 err = _err;
        //             }
        //             if (!err) {
        //                 throw new Error("No error was thrown");
        //             }
        //             if (err instanceof adone.x.NetronTimeout) {
        //                 throw new Error("Wrong error was thrown");
        //             }
        //             expect(err).to.be.instanceOf(adone.x.NetronPeerDisconnected);
        //         });

        //         it("callVoid should not throw if the peer disconnects", async () => {
        //             const peer = netron.getPeer(uid);
        //             setTimeout(() => peer.disconnect(), 200);
        //             await netron.callVoid(uid, defID, "timeout");
        //         });
        //     });
        // }
    });

    describe("interfaces", () => {
        describe("getInterfaceById()", () => {
            let netron;

            beforeEach(async () => {
                netron = new Netron(peerId);
                netron.attachContext(new A(), "a");
                //     await superNetron.bind();
                //     await exNetron.connect();
            });

            // afterEach(async () => {
            //     await exNetron.disconnect();
            //     await superNetron.unbind();
            // });

            it("should return interface for valid context", () => {
                const def = netron.getDefinitionByName("a");
                const iface = netron.getInterfaceById(def.id);
                assert.true(is.netron2Interface(iface));
            });

            it("should throw for unknown context", () => {
                assert.throws(() => netron.getInterfaceById(100500), adone.x.NotExists);
            });

            // it("remote", () => {
            //     const def = exNetron.getDefinitionByName("a", superNetron.uid);
            //     const iface = exNetron.getInterfaceById(def.id, superNetron.uid);
            //     assert.ok(iface);
            //     assert.instanceOf(iface, adone.netron.Interface);

            //     assert.throws(() => exNetron.getInterfaceById(100500, superNetron.uid), adone.x.Unknown);
            // });
        });

        describe("getInterfaceByName()/getInterface()", () => {
            let netron;

            beforeEach(async () => {
                netron = new Netron(peerId);
                netron.attachContext(new A(), "a");
                // await superNetron.bind();
                // await exNetron.connect();
            });

            // afterEach(async () => {
            //     await exNetron.disconnect();
            //     await superNetron.unbind();
            // });

            it("should return interface for valid context", () => {
                const iface = netron.getInterfaceByName("a");
                assert.true(is.netron2Interface(iface));
            });

            it("should throw for unknown context", () => {
                assert.throws(() => netron.getInterfaceByName("not_exists"), adone.x.Unknown);
            });

            it("getInterface() ~ getInterfaceByName()", () => {
                const iface1 = netron.getInterfaceByName("a");
                const iface2 = netron.getInterface("a");
                assert.strictEqual(iface1, iface2); // ???
                assert.deepEqual(iface1, iface2);
            });

            // it("remote", () => {
            //     const iface = exNetron.getInterfaceByName("a", superNetron.uid);
            //     assert.ok(iface);
            //     assert.instanceOf(iface, adone.netron.Interface);

            //     assert.throws(() => {
            //         exNetron.getInterfaceByName("not_exists", superNetron.uid);
            //     }, adone.x.Unknown);
            // });
        });

        describe("getPeerForInterface()", () => {
            let netron;

            beforeEach(async () => {
                netron = new Netron(peerId);
                netron.attachContext(new A(), "a");
                //     await superNetron.bind();
                //     peer = await exNetron.connect();
            });

            // afterEach(async () => {
            //     await exNetron.disconnect();
            //     await superNetron.unbind();
            // });

            it("Netron#getPeerForInterface() should return own peer for interface obtained directly from netron instance", () => {
                const iInstance = netron.getInterfaceByName("a");
                const ownPeer = netron.getPeerForInterface(iInstance);
                assert.deepEqual(ownPeer, netron.peer);
            });

            it("should throw for non-interface instance", () => {
                assert.throws(() => netron.getPeerForInterface(new A()), adone.x.NotValid);
            });

            // it("remote", () => {
            //     const iface = exNetron.getInterfaceByName("a", superNetron.uid);
            //     const peerIface = exNetron.getPeerForInterface(iface);
            //     assert.ok(peerIface);
            //     assert.instanceOf(peerIface, adone.netron.Peer);
            //     assert.equal(peerIface.uid, superNetron.uid);
            //     assert.equal(peerIface.uid, superNetron.uid);
            //     assert.equal(peerIface, peer);

            //     assert.throws(() => exNetron.getPeerForInterface(null), adone.x.InvalidArgument);
            // });
        });

        it("release local interface", () => {
            const n = new Netron(peerId);
            n.attachContext(new A(), "a");

            const iInstance = n.getInterface("a");

            assert.true(is.netron2Interface(iInstance));
            assert.sameMembers(n.peer.interfaces, [iInstance]);
            assert.sameMembers(n.getInterfacesForPeer(peerId), [iInstance]);

            n.releaseInterface(iInstance);

            assert.lengthOf(n.peer.interfaces, 0);
            assert.lengthOf(n.getInterfacesForPeer(peerId), 0);
        });
    });

    describe("networks", () => {
        let idServer;
        let idClient;
        let peerS;
        let peerC;
        let netronS;
        let netronC;

        before(() => {
            idServer = PeerId.create();
            idClient = PeerId.create();
        });

        beforeEach(async () => {
            peerS = new PeerInfo(idServer);
            peerS.multiaddrs.add("/ip4/0.0.0.0/tcp/0");
            netronS = new Netron(peerS);
            netronS.createNetCore("default");

            adone.log("Server peer:", peerS.id.asBase58());

            peerC = new PeerInfo(idClient);
            peerC.multiaddrs.add("/ip4/0.0.0.0/tcp/0");
            netronC = new Netron(peerC);
            netronC.createNetCore("default");

            adone.log("Client peer:", peerC.id.asBase58());
        });

        afterEach(async () => {
            await netronS.stop("default");
        });

        it("should be only one created network", () => {
            assert.equal(netronS.netCores.size, 1);
            const netCore = netronS.getNetCore("default");
            assert.ok(netCore);
        });

        it("delete netcore", async () => {
            netronC.deleteNetCore("default");
            assert.equal(netronC.netCores.size, 0);
        });

        it("delete active netcore is not allowed", async () => {
            await netronS.start("default");
            assert.throws(() => netronS.deleteNetCore("default"), adone.x.NotAllowed);
        });

        it("start one of netron's netcore", async () => {
            assert.false(netronS.getNetCore("default").started);
            await netronS.start("default");
            assert.true(netronS.getNetCore("default").started);
        });

        it("connect one netron to another", async () => {
            await netronS.start("default");
            assert.true(netronS.getNetCore("default").started);
            await netronC.connect("default", peerS);
            assert.false(netronC.getNetCore("default").started);
        });
    });
});
