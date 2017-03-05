const { is } = adone;
const { DEFAULT_PORT, ACTION, STATUS } = adone.netron;
const { Contextable } = adone.netron.decorator;

const Netron = adone.netron.Netron;

let defaultPort = DEFAULT_PORT;
let NETRON_PORT = 32348;

describe("WebSocket Netron", () => {
    let exNetron;
    let superNetron;
    let wsAdapter;

    before(async function () {
        async function isFreePort(port, host = null) {
            const checkerSocket = new adone.std.net.Server;
            const p = new Promise((resolve, reject) => {
                checkerSocket.on("error", function (e) {
                    if (e.code === "EADDRINUSE") {
                        resolve(false);
                    } else {
                        reject(e);
                    }
                }).on("listening", function () {
                    checkerSocket.on("close", function () {
                        resolve(true);
                    });
                    checkerSocket.close();
                });
            });
            checkerSocket.listen(port, host);
            return p;
        }

        function getRandomPort() {
            return 1025 + Math.round(Math.random() * 64510);
        }

        while (!await isFreePort(defaultPort)) {
            defaultPort = getRandomPort();
        }
        while (NETRON_PORT === defaultPort || !await isFreePort(NETRON_PORT)) {
            NETRON_PORT = getRandomPort();
        }
    });

    beforeEach(async function () {
        exNetron = new adone.netron.ws.Netron();
        superNetron = new Netron({ isSuper: true });
        wsAdapter = new adone.netron.ws.Adapter({ id: "ws", port: NETRON_PORT });
        await superNetron.attachAdapter(wsAdapter);
    });

    afterEach(async function () {
        await exNetron.disconnect();
        await superNetron.unbind();
    });

    describe("Unit tests", function () {
        this.timeout(10 * 1000);
        
        describe("Connect", () => {
            it("right status sequence", async function () {
                const sequence = [STATUS.OFFLINE, STATUS.CONNECTING, STATUS.HANDSHAKING, STATUS.ONLINE];
                let index = 0;
                await superNetron.bind();
                exNetron.on("peer create", (peer) => {
                    expect(sequence[index++]).to.be.equal(peer.getStatus());
                    peer.on("status", (status) => {
                        if (status === 0) {
                            return;
                        }
                        expect(sequence[index++]).to.be.equal(status);
                    });
                });
                await exNetron.connect({ port: NETRON_PORT });
                expect(index).to.be.equal(4);
            });

            it("no awaiters after connect", async function () {
                await superNetron.bind();
                const peer = await exNetron.connect({ port: NETRON_PORT });
                expect(peer.getNumberOfAwaiters()).to.be.equal(0);
            });

            it("try to connect after connect", async function () {
                await superNetron.bind();
                const peer1 = await exNetron.connect({ port: NETRON_PORT });
                const peer2 = await exNetron.connect({ port: NETRON_PORT });
                assert.strictEqual(peer1, peer2);
            });
        });

        describe("ping", function () {
            it("ping()", async function () {
                const p1 = superNetron.ping().then((r) => {
                    assert.equal(r, "ok");
                });
                const p2 = exNetron.ping().then((r) => {
                    assert.equal(r, "ok");
                });
                await Promise.all( [p1, p2] );
            });

            it("ping(uid)", async function () {
                await superNetron.bind();
                await exNetron.connect({ port: NETRON_PORT });

                const p1 = superNetron.ping(exNetron.uid).then((r) => {
                    assert.equal(r, "ok");
                });
                const p2 = exNetron.ping(superNetron.uid).then((r) => {
                    assert.equal(r, "ok");
                });

                await Promise.all( [p1, p2] );
            });
        });

        describe("getPeer", function () {
            it("getPeer(null)", function () {
                assert.throws(() => exNetron.getPeer(null), adone.x.InvalidArgument);
            });

            it("getPeer(uid)", async function () {
                await superNetron.bind();

                let peer = await exNetron.connect({ port: NETRON_PORT });
                assert.isOk(peer);
                assert.equal(peer, exNetron.getPeer(superNetron.uid));

                peer = superNetron.getPeer(exNetron.uid);
                assert.isOk(peer);
                assert.equal(peer.uid, exNetron.uid);
            });
        });

        describe("getPeers", function () {
            it("getPeers()", async function () {
                await superNetron.bind();

                const peer = await exNetron.connect({ port: NETRON_PORT });
                assert.isOk(peer);
                const exNetronPeers = exNetron.getPeers();
                assert.isOk(exNetronPeers.has(superNetron.uid));
                assert.equal(exNetronPeers.get(superNetron.uid), peer);

                const superNetronPeers = superNetron.getPeers();
                assert.isOk(superNetronPeers.has(exNetron.uid));
                assert.equal(superNetronPeers.get(exNetron.uid).uid, exNetron.uid);
            });
        });

        describe("disconnect", function () {
            it("Peer.disconnect() from client", async function (done) {
                await superNetron.bind();
                const peer = await exNetron.connect({ port: NETRON_PORT });
                assert.isOk(superNetron.getPeer(exNetron.uid));
                assert.isOk(exNetron.getPeer(superNetron.uid));

                exNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, superNetron.uid);
                    done();
                });

                peer.disconnect();
            });

            it("Peer.disconnect() from server", async function (done) {
                await superNetron.bind();
                await exNetron.connect({ port: NETRON_PORT });

                superNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, exNetron.uid);
                    done();
                });

                superNetron.getPeer(exNetron.uid).disconnect();
            });

            it("Netron.disconnect(uid)", async function (done) {
                await superNetron.bind();
                await exNetron.connect({ port: NETRON_PORT });

                superNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, exNetron.uid);
                    done();
                });

                superNetron.disconnect(exNetron.uid);
            });

            it("Netron.disconnect()", async function (done) {
                await superNetron.bind();
                await exNetron.connect({ port: NETRON_PORT });

                superNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, exNetron.uid);
                    done();
                });

                superNetron.disconnect();
            });
        });

        describe("Peer.get/setStatus", function () {
            it("Peer.get/setStatus", function () {
                const p = new adone.netron.Peer;

                const newStatus = Math.floor(Math.random() * STATUS.MAX);
                p._setStatus(newStatus);
                assert.equal(p.getStatus(), newStatus, "status changed");

                p._setStatus(-1);
                assert.equal(p.getStatus(), newStatus, "negative numbers don't change status");
            });
        });

        describe("Events", function () {
            describe("Netron", function () {
                it("peer create", async function () {
                    await superNetron.bind();

                    const p1 = new Promise((resolve) => {
                        superNetron.on("peer create", () => {
                            resolve();
                        });
                    });
                    const p2 = new Promise((resolve) => {
                        exNetron.on("peer create", () => {
                            resolve();
                        });
                    });

                    const p3 = exNetron.connect({ port: NETRON_PORT });
                    await Promise.all( [p1, p2, p3] );
                });

                it("peer connect", async function () {
                    await superNetron.bind();

                    const p1 = new Promise((resolve, reject) => {
                        superNetron.on("peer connect", (peer) => {
                            try {
                                assert.equal(peer.uid, null);
                                resolve();
                            } catch (e) {
                                reject(e);
                            }
                        });
                    });
                    const p2 = new Promise((resolve, reject) => {
                        exNetron.on("peer connect", (peer) => {
                            try {
                                assert.equal(peer.uid, null);
                                resolve();
                            } catch (e) {
                                reject(e);
                            }
                        });
                    });

                    const p3 = exNetron.connect({ port: NETRON_PORT });
                    return Promise.all( [p1, p2, p3] );
                });

                it("peer online", async function () {
                    await superNetron.bind();

                    const p1 = new Promise((resolve, reject) => {
                        superNetron.on("peer online", (peer) => {
                            try {
                                assert.equal(peer.uid, exNetron.uid);
                                resolve();
                            } catch (e) {
                                reject(e);
                            }
                        });
                    });
                    const p2 = new Promise((resolve, reject) => {
                        exNetron.on("peer online", (peer) => {
                            try {
                                assert.equal(peer.uid, superNetron.uid);
                                resolve();
                            } catch (e) {
                                reject(e);
                            }
                        });
                    });

                    const p3 = exNetron.connect({ port: NETRON_PORT });
                    return Promise.all( [p1, p2, p3] );
                });

                it("peer offline", async function () {
                    await superNetron.bind();
                    await exNetron.connect({ port: NETRON_PORT });

                    const p1 = new Promise((resolve, reject) => {
                        superNetron.on("peer offline", (peer) => {
                            try {
                                assert.equal(peer.uid, exNetron.uid);
                                resolve();
                            } catch (e) {
                                reject(e);
                            }
                        });
                    });
                    const p2 = new Promise((resolve, reject) => {
                        exNetron.on("peer offline", (peer) => {
                            try {
                                assert.equal(peer.uid, superNetron.uid);
                                resolve();
                            } catch (e) {
                                reject(e);
                            }
                        });
                    });

                    exNetron.disconnect();
                    return Promise.all( [p1, p2] );
                });
            });

            describe("Peer", function () {
                it("status", function (done) {
                    const p = new adone.netron.Peer;
                    const newStatus = p.getStatus() + 1;

                    p.on("status", (status) => {
                        assert.equal(status, newStatus);
                        done();
                    });

                    p._setStatus(newStatus);
                });
            });
        });

        describe("Contexts management", () => {

            @Contextable
            class A {
                method() {}
            }

            @Contextable
            class B {
                method() {}
            }

            it("Peer.getContextNames()", async function () {
                await superNetron.bind();
                const peer = await exNetron.connect({ port: NETRON_PORT });
                const contexts = peer.getContextNames();

                assert.isOk(is.array(contexts));
                assert.equal(contexts.length, 0);
            });

            describe("attachContext", function () {
                it("attach", async function () {
                    superNetron.attachContext(new A(), "a");
                    superNetron.attachContext(new B());

                    await superNetron.bind();
                    const peer = await exNetron.connect({ port: NETRON_PORT });

                    assert.include(superNetron.getContextNames(), "a");
                    assert.include(superNetron.getContextNames(), "B");
                    assert.include(peer.getContextNames(), "a");
                    assert.include(peer.getContextNames(), "B");
                });

                it("context attach notification", async function () {
                    await superNetron.bind();
                    const peer = await exNetron.connect({ port: NETRON_PORT });

                    superNetron.attachContext(new A(), "a");
                    superNetron.attachContext(new B());

                    assert.include(superNetron.getContextNames(), "a");
                    assert.include(superNetron.getContextNames(), "B");

                    await adone.promise.delay(100);
                    assert.include(peer.getContextNames(), "a");
                    assert.include(peer.getContextNames(), "B");
                });

                it("double attach same context", async function () {
                    try {
                        const ctx = new A();
                        superNetron.attachContext(ctx, "a");
                        superNetron.attachContext(ctx, "a");
                    } catch (err) {
                        assert.instanceOf(err, adone.x.Exists);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });
            });

            describe("attachContextRemote", function () {
                let exNetron2;

                beforeEach(async function () {
                    exNetron2 = new adone.netron.ws.Netron();
                });

                afterEach(async function () {
                    await superNetron.disconnect();
                    await superNetron.unbind();
                });

                it("attach", async function () {
                    await superNetron.bind();
                    const peer = await exNetron.connect({ port: NETRON_PORT });
                    await exNetron.attachContextRemote(peer.uid, new A(), "a");
                    await exNetron.attachContextRemote(peer.uid, new B());

                    const peer2 = await exNetron2.connect({ port: NETRON_PORT });

                    assert.include(superNetron.getContextNames(), "a");
                    assert.include(superNetron.getContextNames(), "B");
                    assert.include(peer.getContextNames(), "a");
                    assert.include(peer.getContextNames(), "B");
                    assert.include(peer2.getContextNames(), "a");
                    assert.include(peer2.getContextNames(), "B");
                });

                it("context attach notification", async function () {
                    await superNetron.bind();
                    const peer = await exNetron.connect({ port: NETRON_PORT });
                    const peer2 = await exNetron2.connect({ port: NETRON_PORT });
                    await exNetron.attachContextRemote(peer.uid, new A(), "a");
                    await exNetron.attachContextRemote(peer.uid, new B());

                    assert.include(superNetron.getContextNames(), "a");
                    assert.include(superNetron.getContextNames(), "B");

                    await adone.promise.delay(100);
                    assert.include(peer.getContextNames(), "a");
                    assert.include(peer.getContextNames(), "B");
                    assert.include(peer2.getContextNames(), "a");
                    assert.include(peer2.getContextNames(), "B");
                });

                it("double attach same context", async function () {
                    try {
                        const ctx = new A();

                        await superNetron.bind();
                        const peer = await exNetron.connect({ port: NETRON_PORT });

                        await exNetron.attachContextRemote(peer.uid, ctx, "a");
                        await exNetron.attachContextRemote(peer.uid, ctx, "a");
                    } catch (err) {
                        assert.instanceOf(err, adone.x.Exists);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });
            });

            describe("detachContext", () => {
                it("detach not existing context", function () {
                    try {
                        superNetron.detachContext("this_context_not_exists");
                    } catch (e) {
                        assert.instanceOf(e, adone.x.Unknown);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("valid way", async function () {
                    superNetron.attachContext(new A(), "a");
                    superNetron.attachContext(new B());
                    superNetron.detachContext("a");
                    superNetron.detachContext("B");

                    assert.notInclude(superNetron.getContextNames(), "a");
                    assert.notInclude(superNetron.getContextNames(), "B");
                });

                it("context detach notification", async function () {
                    await superNetron.bind();
                    superNetron.attachContext(new A(), "a");
                    superNetron.attachContext(new B());
                    const peer = await exNetron.connect({ port: NETRON_PORT });

                    superNetron.detachContext("a");
                    superNetron.detachContext("B");

                    await adone.promise.delay(100);
                    assert.notInclude(peer.getContextNames(), "a");
                    assert.notInclude(peer.getContextNames(), "B");
                });
            });

            describe("detachContextRemote", () => {
                let exNetron2;

                beforeEach(async function () {
                    exNetron2 = new adone.netron.ws.Netron();
                });

                afterEach(async function () {
                    await superNetron.disconnect();
                    await superNetron.unbind();
                });

                it("detach not existing context", async function () {
                    try {
                        await superNetron.bind();
                        const peer = await exNetron.connect({ port: NETRON_PORT });

                        await exNetron.detachContextRemote(peer.uid, "this_context_not_exists");
                    } catch (e) {
                        assert.instanceOf(e, adone.x.NotExists);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("valid way", async function () {
                    await superNetron.bind();
                    const peer = await exNetron.connect({ port: NETRON_PORT });

                    await exNetron.attachContextRemote(peer.uid, new A(), "a");
                    await exNetron.attachContextRemote(peer.uid, new B());

                    assert.include(peer.getContextNames(), "a");
                    assert.include(peer.getContextNames(), "B");

                    await exNetron.detachContextRemote(peer.uid, "a");
                    await exNetron.detachContextRemote(peer.uid, "B");

                    assert.notInclude(superNetron.getContextNames(), "a");
                    assert.notInclude(superNetron.getContextNames(), "B");
                });

                it("context detach notification", async function () {
                    await superNetron.bind();
                    const peer = await exNetron.connect({ port: NETRON_PORT });
                    await exNetron.attachContextRemote(peer.uid, new A(), "a");
                    await exNetron.attachContextRemote(peer.uid, new B());

                    const peer2 = await exNetron2.connect({ port: NETRON_PORT });
                    assert.include(peer2.getContextNames(), "a");
                    assert.include(peer2.getContextNames(), "B");

                    await exNetron.detachContextRemote(peer.uid, "a");
                    await exNetron.detachContextRemote(peer.uid, "B");

                    await adone.promise.delay(100);
                    assert.notInclude(peer2.getContextNames(), "a");
                    assert.notInclude(peer2.getContextNames(), "B");
                });
            });
        });

        describe("getDefinitionByName", function () {

            @Contextable
            class A {
                method() {}
            }

            let peer;

            beforeEach(async function () {
                superNetron.attachContext(new A, "a");
                await superNetron.bind();
                peer = await exNetron.connect({ port: NETRON_PORT });
            });

            afterEach(async function () {
                await exNetron.disconnect();
                await superNetron.unbind();
            });

            it("local", function () {
                const def = superNetron.getDefinitionByName("a");
                assert.isOk(def);
                assert.instanceOf(def, adone.netron.Definition);
                assert.equal(def.name, "A");

                assert.throws(() => superNetron.getDefinitionByName("not_exists"), adone.x.Unknown);
            });

            it("remote", function () {
                const def = exNetron.getDefinitionByName("a", superNetron.uid);
                assert.isOk(def);
                assert.instanceOf(def, adone.netron.Definition);
                assert.equal(def.name, "A");

                assert.isNotOk(exNetron.getDefinitionByName("not_exists", superNetron.uid));
            });

            it("peer", function () {
                const def = peer.getDefinitionByName("a", superNetron.uid);
                assert.isOk(def);
                assert.instanceOf(def, adone.netron.Definition);
                assert.equal(def.name, "A");

                assert.isNotOk(peer.getDefinitionByName("not_exists", superNetron.uid));
            });
        });

        describe("RPC", () => {

            @Contextable
            class A {
                property = null;
                undefinedProperty = undefined;
                counter = 0;

                method(...args) {
                    return args;
                }

                errorMethod() {
                    throw Error("I'm an error!");
                }

                voidMethod(increment, secondArgument) {
                    if (typeof(increment) === "number") {
                        this.counter += increment;
                    }
                    if (secondArgument) {
                        this.property = secondArgument;
                    }
                }
            }

            for (const currentCase of ["local", "remote", "super remote"]) {
                describe(currentCase, function () {
                    let netron;
                    let uid;
                    let defID;
                    let exNetron2;

                    beforeEach(async function () {
                        exNetron2 = new adone.netron.ws.Netron();

                        if (currentCase === "remote") {

                            superNetron.attachContext(new A, "a");
                            await superNetron.bind();
                            const peer = await exNetron.connect({ port: NETRON_PORT });
                            defID = peer.getDefinitionByName("a").id;

                            netron = exNetron;
                            uid = superNetron.uid;

                        } else if (currentCase === "super remote") {

                            await superNetron.bind();
                            await exNetron.connect({ port: NETRON_PORT });
                            await exNetron.attachContextRemote(superNetron.uid, new A, "a");

                            const peer = await exNetron2.connect({ port: NETRON_PORT });
                            defID = peer.getDefinitionByName("a").id;

                            netron = exNetron2;
                            uid = superNetron.uid;

                        } else if (currentCase === "local") {

                            superNetron.attachContext(new A, "a");
                            defID = superNetron.getDefinitionByName("a").id;
                            netron = superNetron;
                            uid = null;

                        } else {
                            throw Error(`Unknown case: ${currentCase}`);
                        }
                    });

                    afterEach(async function () {
                        await superNetron.disconnect();
                        await superNetron.unbind();
                    });

                    it("set/get", async function () {
                        assert.strictEqual(await netron.get(uid, defID, "property"), null);

                        netron.set(uid, defID, "property", true);
                        assert.strictEqual(await netron.get(uid, defID, "property"), true);

                        netron.set(uid, defID, "property", false);
                        assert.strictEqual(await netron.get(uid, defID, "property"), false);

                        netron.set(uid, defID, "property", 10);
                        assert.strictEqual(await netron.get(uid, defID, "property"), 10);

                        netron.set(uid, defID, "property", "string");
                        assert.strictEqual(await netron.get(uid, defID, "property"), "string");

                        const arr = [true, 1, "string"];
                        netron.set(uid, defID, "property", arr);
                        assert.deepEqual(await netron.get(uid, defID, "property"), arr);

                        const obj = { a: 1, b: "string" };
                        netron.set(uid, defID, "property", obj);
                        assert.deepEqual(await netron.get(uid, defID, "property"), obj);
                    });

                    it("get default value", async function () {
                        assert.strictEqual(await netron.get(uid, defID, "undefinedProperty", 100500), 100500, "default value");
                    });

                    it("call", async function () {
                        let result;
                        const data = [true, 1, "string", { a: true, b: 1, c: "string" }, [true, 1, "string"]];

                        for (const t of data) {
                            result = await netron.call(uid, defID, "method", t);
                            assert.deepEqual(result, [t]);
                            result = await netron.call(uid, defID, "method", t, t);
                            assert.deepEqual(result, [t, t], "multiple arguments");
                        }
                    });

                    it("call - catch exception", async function () {
                        try {
                            await netron.call(uid, defID, "errorMethod");
                        } catch (e) {
                            assert.instanceOf(e, Error);
                            assert.equal(e.message, "I'm an error!");
                            return;
                        }
                        assert.fail("Did not thrown any error");
                    });

                    it("callVoid", async function () {
                        const data = [true, 1, "string", { a: true, b: 1, c: "string" }, [true, 1, "string"]];
                        let counter = 0;

                        for (const t of data) {
                            await netron.call(uid, defID, "voidMethod");
                            assert.strictEqual(await netron.get(uid, defID, "counter"), counter, "without arguments");

                            await netron.call(uid, defID, "voidMethod", 1);
                            ++counter;
                            assert.strictEqual(await netron.get(uid, defID, "counter"), counter, "one arguments");

                            await netron.call(uid, defID, "voidMethod", 1, t);
                            ++counter;
                            assert.strictEqual(await netron.get(uid, defID, "counter"), counter, "multiple arguments");
                            assert.deepEqual(await netron.get(uid, defID, "property"), t, "multiple arguments");
                        }
                    });
                });
            }
        });

        describe("getInterfaceById", function () {

            @Contextable
            class A {
                method() {}
            }

            beforeEach(async function () {
                superNetron.attachContext(new A, "a");
                await superNetron.bind();
                await exNetron.connect({ port: NETRON_PORT });
            });

            afterEach(async function () {
                await exNetron.disconnect();
                await superNetron.unbind();
            });

            it("local", function () {
                const def = superNetron.getDefinitionByName("a");
                const iface = superNetron.getInterfaceById(def.id);
                assert.isOk(iface);
                assert.instanceOf(iface, adone.netron.Interface);

                assert.throws(() => superNetron.getInterfaceById(100500), adone.x.Unknown);
            });

            it("remote", function () {
                const def = exNetron.getDefinitionByName("a", superNetron.uid);
                const iface = exNetron.getInterfaceById(def.id, superNetron.uid);
                assert.isOk(iface);
                assert.instanceOf(iface, adone.netron.Interface);

                assert.throws(() => exNetron.getInterfaceById(100500, superNetron.uid), adone.x.Unknown);
            });
        });

        describe("getInterfaceByName", function () {

            @Contextable
            class A {
                method() {}
            }

            beforeEach(async function () {
                superNetron.attachContext(new A, "a");
                await superNetron.bind();
                await exNetron.connect({ port: NETRON_PORT });
            });

            afterEach(async function () {
                await exNetron.disconnect();
                await superNetron.unbind();
            });

            it("local", function () {
                const iface = superNetron.getInterfaceByName("a");
                assert.isOk(iface);
                assert.instanceOf(iface, adone.netron.Interface);

                assert.throws(() => superNetron.getInterfaceByName("not_exists"), adone.x.Unknown);
            });

            it("remote", function () {
                const iface = exNetron.getInterfaceByName("a", superNetron.uid);
                assert.isOk(iface);
                assert.instanceOf(iface, adone.netron.Interface);

                assert.throws(() => {
                    exNetron.getInterfaceByName("not_exists", superNetron.uid);
                }, adone.x.Unknown);
            });
        });

        it("getStubById", function () {

            @Contextable
            class A {
                method() {}
            }

            superNetron.attachContext(new A, "a");

            const def = superNetron.getDefinitionByName("a");
            const stub = superNetron.getStubById(def.id);
            assert.isOk(stub);
            assert.instanceOf(stub, adone.netron.Stub);

            assert.isNotOk(superNetron.getStubById(100500));
        });

        describe("getPeerForInterface", function () {

            @Contextable
            class A {
                method() {}
            }

            let peer;

            beforeEach(async function () {
                superNetron.attachContext(new A, "a");
                await superNetron.bind();
                peer = await exNetron.connect({ port: NETRON_PORT });
            });

            afterEach(async function () {
                await exNetron.disconnect();
                await superNetron.unbind();
            });

            it("local", function () {
                const iface = superNetron.getInterfaceByName("a");
                assert.throws(() => superNetron.getPeerForInterface(iface), adone.x.InvalidArgument);
            });

            it("remote", function () {
                const iface = exNetron.getInterfaceByName("a", superNetron.uid);
                const peerIface = exNetron.getPeerForInterface(iface);
                assert.isOk(peerIface);
                assert.instanceOf(peerIface, adone.netron.GenesisPeer);
                assert.equal(peerIface.uid, superNetron.uid);
                assert.equal(peerIface.uid, superNetron.uid);
                assert.equal(peerIface, peer);

                assert.throws(() => exNetron.getPeerForInterface(null), adone.x.InvalidArgument);
            });
        });

        describe("Interfaces", () => {

            let exNetron2;

            @Contextable
            class A {
                property = null;
                undefinedProperty = undefined;
                storage = null;
                counter = 0;

                method(...args) {
                    return args;
                }

                errorMethod() {
                    throw Error("I'm an error!");
                }

                voidMethod(...args) {
                    ++this.counter;

                    if (!is.nil(args)) {
                        this.storage = args;
                    }
                }
            }

            @Contextable
            class B {
                getWeakContext() {
                    return (new A);
                }
            }

            it("should not emit events about conexts to context origin netron in super mode", async function () {
                await superNetron.bind();
                await exNetron.connect({ port: NETRON_PORT });
                let nCatchedEvent = false;
                let n2CatchedEvent = false;
                await exNetron.onRemote(superNetron.uid, "context detach", (peer, ctxData) => {
                    nCatchedEvent = true;
                });

                await exNetron.attachContextRemote(superNetron.uid, new A, "a");
                await exNetron.attachContextRemote(superNetron.uid, new B, "b");
                exNetron2 = new adone.netron.ws.Netron();
                await exNetron2.connect({ port: NETRON_PORT });

                await exNetron2.onRemote(superNetron.uid, "context detach", (peer, ctxData) => {
                    n2CatchedEvent = true;
                });

                await exNetron.detachContextRemote(superNetron.uid, "a");
                await adone.promise.delay(1000);
                await superNetron.disconnect();
                await superNetron.unbind();
                assert.equal(nCatchedEvent, false);
                assert.equal(n2CatchedEvent, true);
            });

            for (const contextType of ["Strict", "Weak"]) {
                describe(contextType, function () {
                    for (const currentCase of ["local", "remote", "super remote"]) {
                        describe(currentCase, function () {
                            let netron;
                            let uid;
                            let iface;

                            beforeEach(async function () {
                                this.timeout(25000);
                                if (currentCase === "remote") {

                                    superNetron.attachContext(new A, "a");
                                    superNetron.attachContext(new B, "b");
                                    await superNetron.bind();
                                    await exNetron.connect({ port: NETRON_PORT });
                                    netron = exNetron;
                                    uid = superNetron.uid;

                                } else if (currentCase === "super remote") {

                                    await superNetron.bind();
                                    await exNetron.connect({ port: NETRON_PORT });
                                    await exNetron.attachContextRemote(superNetron.uid, new A, "a");
                                    await exNetron.attachContextRemote(superNetron.uid, new B, "b");
                                    exNetron2 = new adone.netron.ws.Netron();
                                    await exNetron2.connect({ port: NETRON_PORT });
                                    netron = exNetron2;
                                    uid = superNetron.uid;

                                } else if (currentCase === "local") {

                                    superNetron.attachContext(new A, "a");
                                    superNetron.attachContext(new B, "b");
                                    netron = superNetron;
                                    uid = null;

                                } else {
                                    throw Error(`Unknown case: ${currentCase}`);
                                }

                                if (contextType === "Strict") {
                                    iface = netron.getInterfaceByName("a", uid);
                                } else if (contextType === "Weak") {
                                    const tmp = netron.getInterfaceByName("b", uid);
                                    iface = await tmp.getWeakContext();
                                } else {
                                    throw Error(`Unknown context type: ${contextType}`);
                                }
                            });

                            afterEach(async function () {
                                if (currentCase.includes("remote")) {
                                    await exNetron.disconnect();
                                    await adone.promise.delay(300);
                                    if (currentCase === "super remote") {
                                        await exNetron2.disconnect();
                                    }
                                    await superNetron.unbind();
                                }
                            });

                            it("property set/get", async function () {
                                assert.strictEqual(await iface.property.get(), null);

                                await iface.property.set(true);
                                assert.strictEqual(await iface.property.get(), true);

                                await iface.property.set(false);
                                assert.strictEqual(await iface.property.get(), false);

                                await iface.property.set(10);
                                assert.strictEqual(await iface.property.get(), 10);

                                await iface.property.set("string");
                                assert.strictEqual(await iface.property.get(), "string");

                                const arr = [true, 1, "string"];
                                await iface.property.set(arr);
                                assert.deepEqual(await iface.property.get(), arr);

                                const obj = { a: 1, b: "string" };
                                await iface.property.set(obj);
                                assert.deepEqual(await iface.property.get(), obj);
                            });

                            it("get default value", async function () {
                                const iface = netron.getInterfaceByName("a", uid);
                                assert.strictEqual(await iface.undefinedProperty.get(100500), 100500, "default value");
                            });

                            it("call function with return", async function () {
                                let result;
                                const data = [true, 1, "string", { a: true, b: 1, c: "string" }, [true, 1, "string"]];

                                for (const t of data) {
                                    result = await iface.method(t);
                                    assert.deepEqual(result, [t]);
                                    result = await iface.method(t, t);
                                    assert.deepEqual(result, [t, t]);
                                }
                            });

                            it("exception in function call", async function () {
                                try {
                                    await iface.errorMethod();
                                } catch (e) {
                                    assert.instanceOf(e, Error);
                                    assert.equal(e.message, "I'm an error!");
                                    return;
                                }
                                assert.fail("Did not thrown any error");
                            });

                            it("call function without return", async function () {
                                const data = [true, 1, "string", { a: true, b: 1, c: "string" }, [true, 1, "string"]];
                                let counter = 0;

                                for (const t of data) {
                                    await iface.voidMethod();
                                    assert.strictEqual(await iface.counter.get(), ++counter, "without arguments");
                                    assert.deepEqual(await iface.storage.get(), [], "without arguments");

                                    await iface.voidMethod(1);
                                    assert.strictEqual(await iface.counter.get(), ++counter, "one arguments");
                                    assert.deepEqual(await iface.storage.get(), [1], "one arguments");

                                    await iface.voidMethod(1, t);
                                    assert.strictEqual(await iface.counter.get(), ++counter, "multiple arguments");
                                    assert.deepEqual(await iface.storage.get(), [1, t], "multiple arguments");
                                }
                            });
                        });
                    }
                });
            }
        });

        describe("Methods overriding", function () {
            let server;

            afterEach(async function () {
                await superNetron.disconnect();
                if (server) {
                    await server.disconnect();
                    await server.unbind();
                    server = undefined;
                }
            });

            describe("onConfirmConnection", function () {
                it("return true", async function () {
                    let isOK = false;

                    class NewNetron extends Netron
                    {
                        async onConfirmConnection(peer) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            isOK = true;
                            return true;
                        }
                    }

                    server = new NewNetron(undefined, { restrictAccess: true });
                    const adapter = new adone.netron.ws.Adapter({ id: "ws", port: NETRON_PORT });
                    await server.attachAdapter(adapter);
                    await server.bind();
                    await exNetron.connect({ port: NETRON_PORT });
                    assert.isOk(isOK);
                    exNetron.disconnect();
                    await server.unbind();
                });

                it("return false", async function () {
                    class NewNetron extends Netron {
                        async onConfirmConnection(peer) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            return false;
                        }
                    }

                    server = new NewNetron(undefined, { restrictAccess: true });
                    const adapter = new adone.netron.ws.Adapter({ id: "ws", port: NETRON_PORT });
                    await server.attachAdapter(adapter);
                    await server.bind();

                    let resolved = false;
                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolved = true;
                            resolve();
                        });
                    });

                    try {
                        await exNetron.connect({ port: NETRON_PORT });
                    } catch (e) {
                        // assert.instanceOf(e, adone.x.Connect);
                        // assert.include(e.message, "refused connection");
                        assert.equal(resolved, false);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("disconnect", async function () {
                    class NewNetron extends Netron
                    {
                        async onConfirmConnection(peer) {
                            return peer.disconnect();
                        }
                    }

                    server = new NewNetron(undefined, { restrictAccess: true });
                    const adapter = new adone.netron.ws.Adapter({ id: "ws", port: NETRON_PORT });
                    await server.attachAdapter(adapter);
                    await server.bind();

                    let resolved = false;
                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolved = true;
                            resolve();
                        });
                    });

                    try {
                        await exNetron.connect({ port: NETRON_PORT });
                    } catch (e) {
                        // assert.instanceOf(e, adone.x.Connect);
                        // assert.include(e.message, "refused connection");
                        assert.equal(resolved, false);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });
            });

            describe("onConfirmPeer", function () {
                it("return true", async function () {
                    let isOK = false;

                    class NewNetron extends Netron
                    {
                        async onConfirmPeer(peer) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            isOK = true;
                            return true;
                        }
                    }

                    server = new NewNetron;
                    const adapter = new adone.netron.ws.Adapter({ id: "ws", port: NETRON_PORT });
                    server.attachAdapter(adapter);
                    await server.bind();
                    await exNetron.connect({ port: NETRON_PORT });
                    assert.isOk(isOK);
                    exNetron.disconnect();
                    await server.unbind();
                });

                it("return false", async function () {
                    class NewNetron extends Netron
                    {
                        async onConfirmPeer(peer) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            return false;
                        }
                    }

                    server = new NewNetron;
                    const adapter = new adone.netron.ws.Adapter({ id: "ws", port: NETRON_PORT });
                    server.attachAdapter(adapter);
                    await server.bind();

                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolve();
                        });
                    });

                    try {
                        await exNetron.connect({ port: NETRON_PORT });
                    } catch (e) {
                        assert.instanceOf(e, adone.x.Connect);
                        assert.include(e.message, "refused connection");
                        await peerOffline;
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("disconnect", async function () {
                    class NewNetron extends Netron
                    {
                        async onConfirmPeer(peer) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            return peer.disconnect();
                        }
                    }

                    server = new NewNetron;
                    const adapter = new adone.netron.ws.Adapter({ id: "ws", port: NETRON_PORT });
                    server.attachAdapter(adapter);
                    await server.bind();

                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolve();
                        });
                    });

                    try {
                        await exNetron.connect({ port: NETRON_PORT });
                    } catch (e) {
                        assert.instanceOf(e, adone.x.Connect);
                        assert.include(e.message, "refused connection");
                        await peerOffline;
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });
            });

            describe("onSendHandshake", function () {
                it("check calling", async function () {
                    let isOK = false;

                    class Client extends adone.netron.ws.Netron
                    {
                        onSendHandshake(peer, packet) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            isOK = true;
                            return super.onSendHandshake(peer, packet);
                        }
                    }

                    const client = new Client;
                    await superNetron.bind();
                    await client.connect({ port: NETRON_PORT });
                    assert.isOk(isOK);
                });

                it("simple authorization", async function () {
                    class ServerNetron extends Netron
                    {
                        async onConfirmPeer(peer, packet) {
                            const data = packet[adone.netron.GenesisNetron._DATA];
                            if (data.secret === "right secret") {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    }

                    class ClientNetron extends adone.netron.ws.Netron
                    {
                        constructor(uid, secret) {
                            super(uid);
                            this.secret = secret;
                        }

                        onSendHandshake(peer) {
                            const data = super.onSendHandshake(peer);
                            data.secret = this.secret;
                            return data;
                        }
                    }

                    server = new ServerNetron;
                    const adapter = new adone.netron.ws.Adapter({ id: "ws", port: NETRON_PORT });
                    server.attachAdapter(adapter);
                    await server.bind();

                    const client = new ClientNetron("client", "right secret");
                    const hacker = new ClientNetron("hacker", "false secret");

                    await client.connect({ port: NETRON_PORT });

                    try {
                        await hacker.connect({ port: NETRON_PORT });
                    } catch (e) {
                        assert.instanceOf(e, adone.x.Connect);
                        assert.include(e.message, "refused connection");
                        return;
                    }
                    assert.fail("Did not refused connection of hacker");
                });
            });

            describe("customProcessPacket", function () {
                it.skip("custom action on server", async function () {
                    const min_action = ACTION.MAX - 20;
                    const max_action = ACTION.MAX - 1;
                    const an =  Math.round(min_action + Math.random() * (max_action - min_action));
                    const sendData = "hello";
                    const p = new Promise((resolve) => {
                        class ServerNetron extends Netron
                        {
                            customProcessPacket(peer, flags, action, status, packet) {
                                super.customProcessPacket(peer, flags, action, status, packet).then((res) => {
                                    if (!res) {
                                        resolve(packet[adone.netron.GenesisNetron._DATA]);
                                    }
                                });
                            }
                        }

                        server = new ServerNetron();
                    });
                    const adapter = new adone.netron.ws.Adapter({ id: "ws", port: NETRON_PORT });
                    await server.attachAdapter(adapter);
                    await server.bind();
                    const serverPeer = await exNetron.connect({ port: NETRON_PORT });
                    await exNetron.send(serverPeer, 1, serverPeer.streamId.next(), 1, an, sendData);
                    assert.equal(await p, sendData);
                });
            });
        });
    });
});
