const { is, netron: { Netron, DEFAULT_PORT, ACTION, STATUS, decorator: { Contextable } } } = adone;

let defaultPort = DEFAULT_PORT;
let NETRON_PORT = 32348;

describe("netron", "websocket", "unit tests", () => {
    let exNetron;
    let superNetron;

    before(async () => {
        if (!(await adone.net.util.isFreePort(defaultPort))) {
            defaultPort = adone.net.util.getPort();
        }
        NETRON_PORT = adone.net.util.getPort({ exclude: [defaultPort] });
    });

    beforeEach(async () => {
        exNetron = new adone.netron.ws.Netron();
        superNetron = new Netron({ isSuper: true });
        superNetron.registerAdapter("ws", adone.netron.ws.Adapter);
    });

    afterEach(async () => {
        await exNetron.disconnect();
        await superNetron.unbind();
    });

    describe("Unit tests", function () {
        this.timeout(10 * 1000);

        describe("Connect", () => {
            it("right status sequence", async () => {
                const sequence = [STATUS.OFFLINE, STATUS.CONNECTING, STATUS.HANDSHAKING, STATUS.ONLINE];
                let index = 0;
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
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

            it("no awaiters after connect", async () => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                const peer = await exNetron.connect({ port: NETRON_PORT });
                expect(peer.getNumberOfAwaiters()).to.be.equal(0);
            });

            it("try to connect after connect", async () => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                const peer1 = await exNetron.connect({ port: NETRON_PORT });
                const peer2 = await exNetron.connect({ port: NETRON_PORT });
                assert.strictEqual(peer1, peer2);
            });
        });

        describe("ping", () => {
            it("ping() local netron should always return true", async () => {
                assert.isNull(await superNetron.ping());
            });

            it("ping() unknown netron", async () => {
                await assert.throws(async () => exNetron.ping(adone.util.uuid.v4()), adone.x.Unknown);
            });

            it("ping remote netron should", async () => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                await exNetron.connect({ port: NETRON_PORT });

                let result = await superNetron.ping(exNetron.uid);
                assert.isNull(result);

                result = await exNetron.ping(superNetron.uid);
                assert.isNull(result);
            });
        });

        describe("getPeer", () => {
            it("getPeer(null)", () => {
                assert.throws(() => exNetron.getPeer(null), adone.x.InvalidArgument);
            });

            it("getPeer(uid)", async () => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });

                let peer = await exNetron.connect({ port: NETRON_PORT });
                assert.isOk(peer);
                assert.equal(peer, exNetron.getPeer(superNetron.uid));

                peer = superNetron.getPeer(exNetron.uid);
                assert.isOk(peer);
                assert.equal(peer.uid, exNetron.uid);
            });
        });

        describe("getPeers", () => {
            it("getPeers()", async () => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });

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

        describe("disconnect", () => {
            it("Peer.disconnect() from client", async (done) => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                const peer = await exNetron.connect({ port: NETRON_PORT });
                assert.isOk(superNetron.getPeer(exNetron.uid));
                assert.isOk(exNetron.getPeer(superNetron.uid));

                exNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, superNetron.uid);
                    done();
                });

                peer.disconnect();
            });

            it("Peer.disconnect() from server", async (done) => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                await exNetron.connect({ port: NETRON_PORT });

                superNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, exNetron.uid);
                    done();
                });

                superNetron.getPeer(exNetron.uid).disconnect();
            });

            it("Netron.disconnect(uid)", async (done) => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                await exNetron.connect({ port: NETRON_PORT });

                superNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, exNetron.uid);
                    done();
                });

                superNetron.disconnect(exNetron.uid);
            });

            it("Netron.disconnect()", async (done) => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                await exNetron.connect({ port: NETRON_PORT });

                superNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, exNetron.uid);
                    done();
                });

                superNetron.disconnect();
            });
        });

        describe("Peer.get/setStatus", () => {
            it("Peer.get/setStatus", () => {
                const p = new adone.netron.Peer();

                const newStatus = 100 + Math.floor(Math.random() * (STATUS.MAX - 100));
                p._setStatus(newStatus);
                assert.equal(p.getStatus(), newStatus, "status changed");

                p._setStatus(-1);
                assert.equal(p.getStatus(), newStatus, "negative numbers don't change status");
            });
        });

        describe("Events", () => {
            describe("Netron", () => {
                it("peer create", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });

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
                    await Promise.all([p1, p2, p3]);
                });

                it("peer connect", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });

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
                    return Promise.all([p1, p2, p3]);
                });

                it("peer online", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });

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
                    return Promise.all([p1, p2, p3]);
                });

                it("peer offline", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
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
                    return Promise.all([p1, p2]);
                });
            });

            describe("Peer", () => {
                it("status", (done) => {
                    const p = new adone.netron.Peer();
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
                method() { }
            }

            @Contextable
            class B {
                method() { }
            }

            it("Peer.getContextNames()", async () => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                const peer = await exNetron.connect({ port: NETRON_PORT });
                const contexts = peer.getContextNames();

                assert.isOk(is.array(contexts));
                assert.equal(contexts.length, 0);
            });

            describe("attachContext", () => {
                it("attach", async () => {
                    superNetron.attachContext(new A(), "a");
                    superNetron.attachContext(new B());

                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
                    const peer = await exNetron.connect({ port: NETRON_PORT });

                    assert.include(superNetron.getContextNames(), "a");
                    assert.include(superNetron.getContextNames(), "B");
                    assert.include(peer.getContextNames(), "a");
                    assert.include(peer.getContextNames(), "B");
                });

                it("context attach notification", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
                    const peer = await exNetron.connect({ port: NETRON_PORT });

                    superNetron.attachContext(new A(), "a");
                    superNetron.attachContext(new B());

                    assert.include(superNetron.getContextNames(), "a");
                    assert.include(superNetron.getContextNames(), "B");

                    await adone.promise.delay(100);
                    assert.include(peer.getContextNames(), "a");
                    assert.include(peer.getContextNames(), "B");
                });

                it("double attach same context", async () => {
                    const ctx = new A();
                    superNetron.attachContext(ctx, "a");
                    const err = assert.throws(() => superNetron.attachContext(ctx, "a"));
                    assert.instanceOf(err, adone.x.Exists);
                });
            });

            describe("attachContextRemote", () => {
                let exNetron2;

                beforeEach(async () => {
                    exNetron2 = new adone.netron.ws.Netron();
                });

                afterEach(async () => {
                    await superNetron.disconnect();
                    await superNetron.unbind();
                });

                it("attach", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
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

                it("context attach notification", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
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

                it("double attach same context", async () => {
                    const ctx = new A();

                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
                    const peer = await exNetron.connect({ port: NETRON_PORT });

                    await exNetron.attachContextRemote(peer.uid, ctx, "a");
                    const err = await assert.throws(async () => exNetron.attachContextRemote(peer.uid, ctx, "a"));
                    assert.instanceOf(err, adone.x.Exists);
                });
            });

            describe("detachContext", () => {
                it("detach not existing context", () => {
                    const e = assert.throws(() => superNetron.detachContext("this_context_not_exists"));
                    assert.instanceOf(e, adone.x.Unknown);
                });

                it("valid way", async () => {
                    superNetron.attachContext(new A(), "a");
                    superNetron.attachContext(new B());
                    superNetron.detachContext("a");
                    superNetron.detachContext("B");

                    assert.notInclude(superNetron.getContextNames(), "a");
                    assert.notInclude(superNetron.getContextNames(), "B");
                });

                it("context detach notification", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
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

                beforeEach(async () => {
                    exNetron2 = new adone.netron.ws.Netron();
                });

                afterEach(async () => {
                    await superNetron.disconnect();
                    await superNetron.unbind();
                });

                it("detach not existing context", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
                    const peer = await exNetron.connect({ port: NETRON_PORT });

                    const e = await assert.throws(async () => exNetron.detachContextRemote(peer.uid, "this_context_not_exists"));
                    assert.instanceOf(e, adone.x.NotExists);
                });

                it("valid way", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
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

                it("context detach notification", async () => {
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
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

        describe("getDefinitionByName", () => {

            @Contextable
            class A {
                method() { }
            }

            let peer;

            beforeEach(async () => {
                superNetron.attachContext(new A(), "a");
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                peer = await exNetron.connect({ port: NETRON_PORT });
            });

            afterEach(async () => {
                await exNetron.disconnect();
                await superNetron.unbind();
            });

            it("local", () => {
                const def = superNetron.getDefinitionByName("a");
                assert.isOk(def);
                assert.instanceOf(def, adone.netron.Definition);
                assert.equal(def.name, "A");

                assert.throws(() => superNetron.getDefinitionByName("not_exists"), adone.x.Unknown);
            });

            it("remote", () => {
                const def = exNetron.getDefinitionByName("a", superNetron.uid);
                assert.isOk(def);
                assert.instanceOf(def, adone.netron.Definition);
                assert.equal(def.name, "A");

                assert.isNotOk(exNetron.getDefinitionByName("not_exists", superNetron.uid));
            });

            it("peer", () => {
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
                    if (is.number(increment)) {
                        this.counter += increment;
                    }
                    if (secondArgument) {
                        this.property = secondArgument;
                    }
                }
            }

            for (const currentCase of ["local", "remote", "super remote"]) {
                describe(currentCase, () => { // eslint-disable-line
                    let netron;
                    let uid;
                    let defID;
                    let exNetron2;

                    beforeEach(async () => {
                        exNetron2 = new adone.netron.ws.Netron();

                        if (currentCase === "remote") {

                            superNetron.attachContext(new A(), "a");
                            await superNetron.bind({
                                adapter: "ws",
                                port: NETRON_PORT
                            });
                            const peer = await exNetron.connect({ port: NETRON_PORT });
                            defID = peer.getDefinitionByName("a").id;

                            netron = exNetron;
                            uid = superNetron.uid;

                        } else if (currentCase === "super remote") {

                            await superNetron.bind({
                                adapter: "ws",
                                port: NETRON_PORT
                            });
                            await exNetron.connect({ port: NETRON_PORT });
                            await exNetron.attachContextRemote(superNetron.uid, new A(), "a");

                            const peer = await exNetron2.connect({ port: NETRON_PORT });
                            defID = peer.getDefinitionByName("a").id;

                            netron = exNetron2;
                            uid = superNetron.uid;

                        } else if (currentCase === "local") {

                            superNetron.attachContext(new A(), "a");
                            defID = superNetron.getDefinitionByName("a").id;
                            netron = superNetron;
                            uid = null;

                        } else {
                            throw Error(`Unknown case: ${currentCase}`);
                        }
                    });

                    afterEach(async () => {
                        await superNetron.disconnect();
                        await superNetron.unbind();
                    });

                    it("set/get", async () => {
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

                    it("get default value", async () => {
                        assert.strictEqual(await netron.get(uid, defID, "undefinedProperty", 100500), 100500, "default value");
                    });

                    it("call", async () => {
                        let result;
                        const data = [true, 1, "string", { a: true, b: 1, c: "string" }, [true, 1, "string"]];

                        for (const t of data) {
                            result = await netron.call(uid, defID, "method", t);
                            assert.deepEqual(result, [t]);
                            result = await netron.call(uid, defID, "method", t, t);
                            assert.deepEqual(result, [t, t], "multiple arguments");
                        }
                    });

                    it("call - catch exception", async () => {
                        const e = await assert.throws(async () => netron.call(uid, defID, "errorMethod"));
                        assert.instanceOf(e, Error);
                        assert.equal(e.message, "I'm an error!");
                    });

                    it("callVoid", async () => {
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

        describe("getInterfaceById", () => {

            @Contextable
            class A {
                method() { }
            }

            beforeEach(async () => {
                superNetron.attachContext(new A(), "a");
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                await exNetron.connect({ port: NETRON_PORT });
            });

            afterEach(async () => {
                await exNetron.disconnect();
                await superNetron.unbind();
            });

            it("local", () => {
                const def = superNetron.getDefinitionByName("a");
                const iface = superNetron.getInterfaceById(def.id);
                assert.isOk(iface);
                assert.instanceOf(iface, adone.netron.Interface);

                assert.throws(() => superNetron.getInterfaceById(100500), adone.x.Unknown);
            });

            it("remote", () => {
                const def = exNetron.getDefinitionByName("a", superNetron.uid);
                const iface = exNetron.getInterfaceById(def.id, superNetron.uid);
                assert.isOk(iface);
                assert.instanceOf(iface, adone.netron.Interface);

                assert.throws(() => exNetron.getInterfaceById(100500, superNetron.uid), adone.x.Unknown);
            });
        });

        describe("getInterfaceByName", () => {

            @Contextable
            class A {
                method() { }
            }

            beforeEach(async () => {
                superNetron.attachContext(new A(), "a");
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                await exNetron.connect({ port: NETRON_PORT });
            });

            afterEach(async () => {
                await exNetron.disconnect();
                await superNetron.unbind();
            });

            it("local", () => {
                const iface = superNetron.getInterfaceByName("a");
                assert.isOk(iface);
                assert.instanceOf(iface, adone.netron.Interface);

                assert.throws(() => superNetron.getInterfaceByName("not_exists"), adone.x.Unknown);
            });

            it("remote", () => {
                const iface = exNetron.getInterfaceByName("a", superNetron.uid);
                assert.isOk(iface);
                assert.instanceOf(iface, adone.netron.Interface);

                assert.throws(() => {
                    exNetron.getInterfaceByName("not_exists", superNetron.uid);
                }, adone.x.Unknown);
            });
        });

        it("getStubById", () => {

            @Contextable
            class A {
                method() { }
            }

            superNetron.attachContext(new A(), "a");

            const def = superNetron.getDefinitionByName("a");
            const stub = superNetron.getStubById(def.id);
            assert.isOk(stub);
            assert.instanceOf(stub, adone.netron.Stub);

            assert.isNotOk(superNetron.getStubById(100500));
        });

        describe("getPeerForInterface", () => {

            @Contextable
            class A {
                method() { }
            }

            let peer;

            beforeEach(async () => {
                superNetron.attachContext(new A(), "a");
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                peer = await exNetron.connect({ port: NETRON_PORT });
            });

            afterEach(async () => {
                await exNetron.disconnect();
                await superNetron.unbind();
            });

            it("local", () => {
                const iface = superNetron.getInterfaceByName("a");
                assert.throws(() => superNetron.getPeerForInterface(iface), adone.x.InvalidArgument);
            });

            it("remote", () => {
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
                    return (new A());
                }
            }

            it("should not emit events about conexts to context origin netron in super mode", async () => {
                await superNetron.bind({
                    adapter: "ws",
                    port: NETRON_PORT
                });
                await exNetron.connect({ port: NETRON_PORT });
                let nCatchedEvent = false;
                let n2CatchedEvent = false;
                await exNetron.onRemote(superNetron.uid, "context detach", (peer, ctxData) => {
                    nCatchedEvent = true;
                });

                await exNetron.attachContextRemote(superNetron.uid, new A(), "a");
                await exNetron.attachContextRemote(superNetron.uid, new B(), "b");
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
                describe(contextType, () => { // eslint-disable-line
                    for (const currentCase of ["local", "remote", "super remote"]) {
                        describe(currentCase, () => { // eslint-disable-line
                            let netron;
                            let uid;
                            let iface;

                            beforeEach(async function () {
                                this.timeout(25000);
                                if (currentCase === "remote") {

                                    superNetron.attachContext(new A(), "a");
                                    superNetron.attachContext(new B(), "b");
                                    await superNetron.bind({
                                        adapter: "ws",
                                        port: NETRON_PORT
                                    });
                                    await exNetron.connect({ port: NETRON_PORT });
                                    netron = exNetron;
                                    uid = superNetron.uid;

                                } else if (currentCase === "super remote") {

                                    await superNetron.bind({
                                        adapter: "ws",
                                        port: NETRON_PORT
                                    });
                                    await exNetron.connect({ port: NETRON_PORT });
                                    await exNetron.attachContextRemote(superNetron.uid, new A(), "a");
                                    await exNetron.attachContextRemote(superNetron.uid, new B(), "b");
                                    exNetron2 = new adone.netron.ws.Netron();
                                    await exNetron2.connect({ port: NETRON_PORT });
                                    netron = exNetron2;
                                    uid = superNetron.uid;

                                } else if (currentCase === "local") {

                                    superNetron.attachContext(new A(), "a");
                                    superNetron.attachContext(new B(), "b");
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

                            afterEach(async () => {
                                if (currentCase.includes("remote")) {
                                    await exNetron.disconnect();
                                    await adone.promise.delay(300);
                                    if (currentCase === "super remote") {
                                        await exNetron2.disconnect();
                                    }
                                    await superNetron.unbind();
                                }
                            });

                            it("property set/get", async () => {
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

                            it("get default value", async () => {
                                const iface = netron.getInterfaceByName("a", uid);
                                assert.strictEqual(await iface.undefinedProperty.get(100500), 100500, "default value");
                            });

                            it("call function with return", async () => {
                                let result;
                                const data = [true, 1, "string", { a: true, b: 1, c: "string" }, [true, 1, "string"]];

                                for (const t of data) {
                                    result = await iface.method(t);
                                    assert.deepEqual(result, [t]);
                                    result = await iface.method(t, t);
                                    assert.deepEqual(result, [t, t]);
                                }
                            });

                            it("exception in function call", async () => {
                                const e = await assert.throws(async () => iface.errorMethod());
                                assert.instanceOf(e, Error);
                                assert.equal(e.message, "I'm an error!");
                            });

                            it("call function without return", async () => {
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

        describe("Methods overriding", () => {
            let server;

            afterEach(async () => {
                await superNetron.disconnect();
                if (server) {
                    await server.disconnect();
                    await server.unbind();
                    server = undefined;
                }
            });

            describe("onConfirmConnection", () => {
                it("return true", async () => {
                    let isOK = false;

                    class NewNetron extends Netron {
                        async onConfirmConnection(peer) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            isOK = true;
                            return true;
                        }
                    }

                    server = new NewNetron(undefined, { restrictAccess: true });
                    await server.registerAdapter("ws", adone.netron.ws.Adapter);
                    await server.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
                    await exNetron.connect({ port: NETRON_PORT });
                    assert.isOk(isOK);
                    exNetron.disconnect();
                    await server.unbind();
                });

                it("return false", async () => {
                    class NewNetron extends Netron {
                        async onConfirmConnection(peer) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            return false;
                        }
                    }

                    server = new NewNetron(undefined, { restrictAccess: true });
                    await server.registerAdapter("ws", adone.netron.ws.Adapter);
                    await server.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });

                    let resolved = false;
                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolved = true;
                            resolve();
                        });
                    });

                    const e = await assert.throws(async () => exNetron.connect({ port: NETRON_PORT }));
                    // assert.instanceOf(e, adone.x.Connect);
                    // assert.include(e.message, "refused connection");
                    assert.equal(resolved, false);
                });

                it("disconnect", async () => {
                    class NewNetron extends Netron {
                        async onConfirmConnection(peer) {
                            return peer.disconnect();
                        }
                    }

                    server = new NewNetron(undefined, { restrictAccess: true });
                    await server.registerAdapter("ws", adone.netron.ws.Adapter);
                    await server.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });

                    let resolved = false;
                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolved = true;
                            resolve();
                        });
                    });

                    const e = await assert.throws(async () => exNetron.connect({ port: NETRON_PORT }));
                    // assert.instanceOf(e, adone.x.Connect);
                    // assert.include(e.message, "refused connection");
                    assert.equal(resolved, false);
                });
            });

            describe("onConfirmPeer", () => {
                it("return true", async () => {
                    let isOK = false;

                    class NewNetron extends Netron {
                        async onConfirmPeer(peer) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            isOK = true;
                            return true;
                        }
                    }

                    server = new NewNetron();
                    server.registerAdapter("ws", adone.netron.ws.Adapter);
                    await server.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
                    await exNetron.connect({ port: NETRON_PORT });
                    assert.isOk(isOK);
                    exNetron.disconnect();
                    await server.unbind();
                });

                it("return false", async () => {
                    class NewNetron extends Netron {
                        async onConfirmPeer(peer) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            return false;
                        }
                    }

                    server = new NewNetron();
                    server.registerAdapter("ws", adone.netron.ws.Adapter);
                    await server.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });

                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolve();
                        });
                    });

                    const e = await assert.throws(async () => exNetron.connect({ port: NETRON_PORT }));
                    assert.instanceOf(e, adone.x.Connect);
                    assert.include(e.message, "refused connection");
                    await peerOffline;
                });

                it("disconnect", async () => {
                    class NewNetron extends Netron {
                        async onConfirmPeer(peer) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            return peer.disconnect();
                        }
                    }

                    server = new NewNetron();
                    server.registerAdapter("ws", adone.netron.ws.Adapter);
                    await server.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });

                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolve();
                        });
                    });

                    const e = await assert.throws(async () => exNetron.connect({ port: NETRON_PORT }));
                    assert.instanceOf(e, adone.x.Connect);
                    assert.include(e.message, "refused connection");
                    await peerOffline;
                });
            });

            describe("onSendHandshake", () => {
                it("check calling", async () => {
                    let isOK = false;

                    class Client extends adone.netron.ws.Netron {
                        onSendHandshake(peer, packet) {
                            assert.instanceOf(peer, adone.netron.GenesisPeer);
                            isOK = true;
                            return super.onSendHandshake(peer, packet);
                        }
                    }

                    const client = new Client();
                    await superNetron.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
                    await client.connect({ port: NETRON_PORT });
                    assert.isOk(isOK);
                });

                it("simple authorization", async () => {
                    class ServerNetron extends Netron {
                        async onConfirmPeer(peer, packet) {
                            const data = packet[adone.netron.GenesisNetron._DATA];
                            if (data.secret === "right secret") {
                                return true;
                            }
                            return false;

                        }
                    }

                    class ClientNetron extends adone.netron.ws.Netron {
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

                    server = new ServerNetron();
                    server.registerAdapter("ws", adone.netron.ws.Adapter);
                    await server.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });

                    const client = new ClientNetron("client", "right secret");
                    const hacker = new ClientNetron("hacker", "false secret");

                    await client.connect({ port: NETRON_PORT });

                    const e = await assert.throws(async () => hacker.connect({ port: NETRON_PORT }));
                    assert.instanceOf(e, adone.x.Connect);
                    assert.include(e.message, "refused connection");
                });
            });

            describe("customProcessPacket", () => {
                it.skip("custom action on server", async () => {
                    const minAction = ACTION.MAX - 20;
                    const maxAction = ACTION.MAX - 1;
                    const an = Math.round(minAction + Math.random() * (maxAction - minAction));
                    const sendData = "hello";
                    const p = new Promise((resolve) => {
                        class ServerNetron extends Netron {
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
                    await server.registerAdapter("ws ", adone.netron.ws.Adapter);
                    await server.bind({
                        adapter: "ws",
                        port: NETRON_PORT
                    });
                    const serverPeer = await exNetron.connect({ port: NETRON_PORT });
                    await exNetron.send(serverPeer, 1, serverPeer.streamId.next(), 1, an, sendData);
                    assert.equal(await p, sendData);
                });
            });
        });
    });
});
