const {
    is,
    netron2: { PeerId, Netron, DContext, DPublic }
} = adone;

describe("netron2", "Netron", () => {
    const peerId = PeerId.create();

    describe("initialization", () => {
        it("default", () => {
            const n = new Netron();

            assert.true(is.netron2(n));
            assert.true(is.peerInfo(n.peerInfo));
        });

        it("with precreated PeerId", () => {
            const n = new Netron(peerId);
            assert.deepEqual(peerId, n.peerInfo.id);
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

    describe("contexts", () => {
        describe("no contexts", () => {
            it("#getContextNames() should return empty array", () => {
                const n = new Netron(peerId);
                const contexts = n.getContextNames();

                assert(is.array(contexts));
                assert.equal(contexts.length, 0);
            });
        });

        describe("attach/detach contexts", () => {
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

            it("#attachContext(instance)", () => {
                const n = new Netron(peerId);
                n.attachContext(new A());

                assert.sameMembers(n.getContextNames(), ["A"]);
            });

            it("#attachContext(instance, name)", () => {
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
});
