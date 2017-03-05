const { is, std: { path } } = adone;
const { DEFAULT_PORT, ACTION, STATUS, Netron, decorator: { Private, Contextable, Property, Twin } } = adone.netron;

let defaultPort = DEFAULT_PORT;
let NETRON_PORT = 32348;

function fixturePath(relPath) {
    return path.join(__dirname, "..", "fixtures", relPath);
}

describe("Netron", function () {
    let exNetron;
    let superNetron;

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
        exNetron = new Netron();
        superNetron = new Netron({ isSuper: true });
    });

    afterEach(async function () {
        await exNetron.disconnect();
        await superNetron.unbind();
    });

    describe("Unit tests", function () {
        this.timeout(10 * 1000);
        
        it("constructor", function () {
            const n1 = new Netron();
            assert.instanceOf(n1, Netron);
            assert( /[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}/.test(n1.uid));

            const n2 = new Netron();
            assert.instanceOf(n2, Netron);
        });

        describe("Connect", () => {

            it("connect with defaults", async function () {
                await superNetron.bind();
                await exNetron.connect();
            });

            it("reconnect attempts", async function () {
                const customExNetron = new Netron({ reconnects: 4 });
                let reconnects = 0;
                customExNetron.on("peer create", (peer) => {
                    peer.on("reconnect attempt", () => {
                        ++reconnects;
                    });
                });

                try {
                    await customExNetron.connect({ port: NETRON_PORT });
                } catch (err) {
                    assert.instanceOf(err, adone.x.Connect);
                    assert.equal(reconnects, 4);
                    return;
                }
                assert.fail("Did not thrown any error");
            });

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
                await exNetron.connect();
                expect(index).to.be.equal(4);
            });

            it("no awaiters after connect", async function () {
                await superNetron.bind();
                const peer = await exNetron.connect();
                expect(peer.getNumberOfAwaiters()).to.be.equal(0);
            });

            it("try to connect after connect", async function () {
                await superNetron.bind();
                const peer1 = await exNetron.connect();
                const peer2 = await exNetron.connect();
                assert.strictEqual(peer1, peer2);
            });
        });

        it("Netron-specific predicates", async function () {
            @Contextable
            @Property("prop", { private: false, type: String })
            class A {
                constructor() {
                    this.prop = "adone";
                }

                method() {

                }
            }
            assert.isOk(is.netron(exNetron));
            assert.isOk(is.genesisNetron(exNetron));
            assert.isOk(is.genesisNetron(superNetron));
            const theA = new A();
            assert.isOk(is.netronContext(theA));
            const defId = superNetron.attachContext(theA, "a");
            const stubA = superNetron.getStubById(defId);
            assert.isOk(is.netronStub(stubA));
            assert.isOk(is.netronDefinition(stubA.definition));
            await superNetron.bind();
            const peer = await exNetron.connect();
            assert.isOk(is.netronPeer(peer));
            assert.isOk(is.genesisPeer(peer));

            const iA = peer.getInterfaceByName("a");
            assert.isOk(is.netronInterface(iA));
            assert.isOk(is.netronIMethod(iA, "method"));
            assert.isOk(is.netronIProperty(iA, "prop"));
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
                await exNetron.connect();

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

                let peer = await exNetron.connect();
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

                const peer = await exNetron.connect();
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
                const peer = await exNetron.connect();
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
                await exNetron.connect();

                superNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, exNetron.uid);
                    done();
                });

                superNetron.getPeer(exNetron.uid).disconnect();
            });

            it("Netron.disconnect(uid)", async function (done) {
                await superNetron.bind();
                await exNetron.connect();

                superNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, exNetron.uid);
                    done();
                });

                superNetron.disconnect(exNetron.uid);
            });

            it("Netron.disconnect()", async function (done) {
                await superNetron.bind();
                await exNetron.connect();

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

                    const p3 = exNetron.connect();
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

                    const p3 = exNetron.connect();
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

                    const p3 = exNetron.connect();
                    return Promise.all( [p1, p2, p3] );
                });

                it("peer offline", async function () {
                    await superNetron.bind();
                    await exNetron.connect();

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

            it("Netron.getContextNames()", function () {
                const contexts = superNetron.getContextNames();

                assert(is.array(contexts));
                assert.equal(contexts.length, 0);
            });

            it("Peer.getContextNames()", async function () {
                await superNetron.bind();
                const peer = await exNetron.connect();
                const contexts = peer.getContextNames();

                assert.isOk(is.array(contexts));
                assert.equal(contexts.length, 0);
            });

            // Я решил включить тест приватного метода для того, чтобы избежать
            // ненужного повтора тестов на неверные аргументы для attachContext
            // и attachContextRemote. Позже можно будет сделать как-нибудь лучше.
            describe("_checkContext", function () {
                it("not instance", function () {
                    try {
                        superNetron._checkContext("a");
                    } catch (err) {
                        assert.instanceOf(err, adone.x.NotValid);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("class instead instance", function () {
                    try {
                        superNetron._checkContext(A);
                    } catch (err) {
                        assert.instanceOf(err, adone.x.NotValid);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("class without constructor", function () {
                    try {
                        class SomeClass { }
                        superNetron._checkContext(new SomeClass());
                    } catch (err) {
                        assert.instanceOf(err, adone.x.NotValid);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("Object instead instance", function () {
                    try {
                        superNetron._checkContext(Object);
                    } catch (err) {
                        assert.instanceOf(err, adone.x.NotValid);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("empty function instead instance", function () {
                    try {
                        superNetron._checkContext(() => {});
                    } catch (err) {
                        assert.instanceOf(err, adone.x.NotValid);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("instance of unnamed class", function () {
                    const a = (new
                        @Contextable
                        @Private
                        class {
                            method() {
                            }
                        }
                    );

                    try {
                        superNetron._checkContext(a);
                    } catch (err) {
                        assert.instanceOf(err, adone.x.NotAllowed);
                        return;
                    }
                    assert.fail("Should throw exception");
                });

                it("instance with no public methods", function () {
                    @Contextable
                    @Private
                    class A {
                        method() {
                        }
                    }

                    try {
                        superNetron._checkContext(new A);
                    } catch (err) {
                        assert.instanceOf(err, adone.x.NotValid);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("valid way", function () {
                    superNetron._checkContext(new A());
                });
            });

            describe("attachContext", function () {
                it("attach", async function () {
                    superNetron.attachContext(new A(), "a");
                    superNetron.attachContext(new B());

                    await superNetron.bind();
                    const peer = await exNetron.connect();

                    assert.include(superNetron.getContextNames(), "a");
                    assert.include(superNetron.getContextNames(), "B");
                    assert.include(peer.getContextNames(), "a");
                    assert.include(peer.getContextNames(), "B");
                });

                it("context attach notification", async function () {
                    await superNetron.bind();
                    const peer = await exNetron.connect();

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
                    exNetron2 = new Netron();
                });

                afterEach(async function () {
                    await superNetron.disconnect();
                    await superNetron.unbind();
                });

                it("attach", async function () {
                    await superNetron.bind();
                    const peer = await exNetron.connect();
                    await exNetron.attachContextRemote(peer.uid, new A(), "a");
                    await exNetron.attachContextRemote(peer.uid, new B());

                    const peer2 = await exNetron2.connect();

                    assert.include(superNetron.getContextNames(), "a");
                    assert.include(superNetron.getContextNames(), "B");
                    assert.include(peer.getContextNames(), "a");
                    assert.include(peer.getContextNames(), "B");
                    assert.include(peer2.getContextNames(), "a");
                    assert.include(peer2.getContextNames(), "B");
                });

                it("context attach notification", async function () {
                    await superNetron.bind();
                    const peer = await exNetron.connect();
                    const peer2 = await exNetron2.connect();
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
                        const peer = await exNetron.connect();

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
                    const peer = await exNetron.connect();

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
                    exNetron2 = new Netron();
                });

                afterEach(async function () {
                    await superNetron.disconnect();
                    await superNetron.unbind();
                });

                it("detach not existing context", async function () {
                    try {
                        await superNetron.bind();
                        const peer = await exNetron.connect();

                        await exNetron.detachContextRemote(peer.uid, "this_context_not_exists");
                    } catch (e) {
                        assert.instanceOf(e, adone.x.NotExists);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("valid way", async function () {
                    await superNetron.bind();
                    const peer = await exNetron.connect();

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
                    const peer = await exNetron.connect();
                    await exNetron.attachContextRemote(peer.uid, new A(), "a");
                    await exNetron.attachContextRemote(peer.uid, new B());

                    const peer2 = await exNetron2.connect();
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
                peer = await exNetron.connect();
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

                timeout() {
                    return adone.promise.delay(1000);
                }
            }

            for (const currentCase of ["local", "remote", "super remote"]) {
                describe(currentCase, function () {
                    let netron;
                    let uid;
                    let defID;
                    let exNetron2;

                    beforeEach(async function () {
                        exNetron2 = new Netron();

                        if (currentCase === "remote") {

                            superNetron.attachContext(new A, "a");
                            await superNetron.bind();
                            const peer = await exNetron.connect();
                            defID = peer.getDefinitionByName("a").id;

                            netron = exNetron;
                            uid = superNetron.uid;

                        } else if (currentCase === "super remote") {

                            await superNetron.bind();
                            await exNetron.connect();
                            await exNetron.attachContextRemote(superNetron.uid, new A, "a");

                            const peer = await exNetron2.connect();
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

                        await netron.set(uid, defID, "property", true);
                        assert.strictEqual(await netron.get(uid, defID, "property"), true);

                        await netron.set(uid, defID, "property", false);
                        assert.strictEqual(await netron.get(uid, defID, "property"), false);

                        await netron.set(uid, defID, "property", 10);
                        assert.strictEqual(await netron.get(uid, defID, "property"), 10);

                        await netron.set(uid, defID, "property", "string");
                        assert.strictEqual(await netron.get(uid, defID, "property"), "string");

                        const arr = [true, 1, "string"];
                        await netron.set(uid, defID, "property", arr);
                        assert.deepEqual(await netron.get(uid, defID, "property"), arr);

                        const obj = { a: 1, b: "string" };
                        await netron.set(uid, defID, "property", obj);
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
            for (const currentCase of ["remote", "super remote"]) {
                describe(`timeouts:${currentCase}`, function () {
                    let netron;
                    let uid;
                    let defID;
                    let exNetron2;
                    let exNetron;
                    let superNetron;

                    beforeEach(async function () {
                        exNetron = new Netron({
                            responseTimeout: 500
                        });
                        superNetron = new Netron({
                            isSuper: true,
                            responseTimeout: 500
                        });
                        exNetron2 = new Netron({
                            responseTimeout: 500
                        });

                        if (currentCase === "remote") {

                            superNetron.attachContext(new A, "a");
                            await superNetron.bind();
                            const peer = await exNetron.connect();
                            defID = peer.getDefinitionByName("a").id;

                            netron = exNetron;
                            uid = superNetron.uid;

                        } else if (currentCase === "super remote") {

                            await superNetron.bind();
                            await exNetron.connect();
                            await exNetron.attachContextRemote(superNetron.uid, new A, "a");

                            const peer = await exNetron2.connect();
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
                        await exNetron.disconnect();
                        await superNetron.unbind();
                    });

                    it("get should throw", async () => {
                        let err;
                        try {
                            await netron.get(uid, defID, "timeout");
                        } catch (_err) {
                            err = _err;
                        }
                        if (!err) {
                            throw new Error("No error was thrown");
                        }
                        expect(err).to.be.instanceOf(adone.x.NetronTimeout);
                        expect(err.message).to.be.equal("Response timeout 500ms exceeded");
                    });

                    it("set should not throw", async () => {
                        await netron.set(uid, defID, "timeout");
                    });

                    it("call should throw", async () => {
                        let err;
                        try {
                            await netron.call(uid, defID, "timeout");
                        } catch (_err) {
                            err = _err;
                        }
                        if (!err) {
                            throw new Error("No error was thrown");
                        }
                        expect(err).to.be.instanceOf(adone.x.NetronTimeout);
                        expect(err.message).to.be.equal("Response timeout 500ms exceeded");
                    });

                    it("call void shoult not throw", async () => {
                        await netron.callVoid(uid, defID, "timeout");
                    });

                    it("get should throw if the peer disconnects", async () => {
                        const peer = netron.getPeer(uid);
                        setTimeout(() => peer.disconnect(), 200);
                        let err;
                        try {
                            await netron.get(uid, defID, "timeout");
                        } catch (_err) {
                            err = _err;
                        }
                        if (!err) {
                            throw new Error("No error was thrown");
                        }
                        if (err instanceof adone.x.NetronTimeout) {
                            throw new Error("Wrong error was thrown");
                        }
                        expect(err).to.be.instanceOf(adone.x.NetronPeerDisconnected);
                    });

                    it("set should not throw if the peer disconnects", async () => {
                        const peer = netron.getPeer(uid);
                        setTimeout(() => peer.disconnect(), 200);
                        await netron.set(uid, defID, "timeout");
                    });

                    it("call should throw if the peer disconnects", async () => {
                        const peer = netron.getPeer(uid);
                        setTimeout(() => peer.disconnect(), 200);
                        let err;
                        try {
                            await netron.call(uid, defID, "timeout");
                        } catch (_err) {
                            err = _err;
                        }
                        if (!err) {
                            throw new Error("No error was thrown");
                        }
                        if (err instanceof adone.x.NetronTimeout) {
                            throw new Error("Wrong error was thrown");
                        }
                        expect(err).to.be.instanceOf(adone.x.NetronPeerDisconnected);
                    });

                    it("callVoid should not throw if the peer disconnects", async () => {
                        const peer = netron.getPeer(uid);
                        setTimeout(() => peer.disconnect(), 200);
                        await netron.callVoid(uid, defID, "timeout");
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
                await exNetron.connect();
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
                await exNetron.connect();
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
                peer = await exNetron.connect();
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
                assert.instanceOf(peerIface, adone.netron.Peer);
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
                await exNetron.connect();
                let nCatchedEvent = false;
                let n2CatchedEvent = false;
                await exNetron.onRemote(superNetron.uid, "context detach", (peer, ctxData) => {
                    nCatchedEvent = true;
                });
                
                await exNetron.attachContextRemote(superNetron.uid, new A, "a");
                await exNetron.attachContextRemote(superNetron.uid, new B, "b");
                exNetron2 = new Netron();
                await exNetron2.connect();
                

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

                                if (currentCase === "remote") {

                                    superNetron.attachContext(new A, "a");
                                    superNetron.attachContext(new B, "b");
                                    await superNetron.bind();
                                    await exNetron.connect();
                                    netron = exNetron;
                                    uid = superNetron.uid;

                                } else if (currentCase === "super remote") {

                                    await superNetron.bind();
                                    await exNetron.connect();
                                    await exNetron.attachContextRemote(superNetron.uid, new A, "a");
                                    await exNetron.attachContextRemote(superNetron.uid, new B, "b");
                                    exNetron2 = new Netron();
                                    await exNetron2.connect();
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

                    class NewNetron extends Netron {
                        async onConfirmConnection(peer) {
                            assert.instanceOf(peer, adone.netron.Peer);
                            isOK = true;
                            return true;
                        }
                    }

                    server = new NewNetron(undefined, { restrictAccess: true });
                    await server.bind();
                    await exNetron.connect();
                    assert.isOk(isOK);
                    exNetron.disconnect();
                    await server.unbind();
                });

                it("return false", async function () {
                    class NewNetron extends Netron {
                        async onConfirmConnection(peer) {
                            assert.instanceOf(peer, adone.netron.Peer);
                            return false;
                        }
                    }

                    server = new NewNetron(undefined, { restrictAccess: true });
                    await server.bind();

                    let resolved = false;
                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolved = true;
                            resolve();
                        });
                    });

                    try {
                        await exNetron.connect();
                    } catch (e) {
                        assert.instanceOf(e, adone.x.Connect);
                        assert.include(e.message, "refused connection");
                        assert.equal(resolved, false);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("disconnect", async function () {
                    class NewNetron extends Netron {
                        async onConfirmConnection(peer) {
                            return peer.disconnect();
                        }
                    }

                    server = new NewNetron(undefined, { restrictAccess: true });
                    await server.bind();

                    let resolved = false;
                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolved = true;
                            resolve();
                        });
                    });

                    try {
                        await exNetron.connect();
                    } catch (e) {
                        assert.instanceOf(e, adone.x.Connect);
                        assert.include(e.message, "refused connection");
                        assert.equal(resolved, false);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });
            });

            describe("onConfirmPeer", function () {
                it("return true", async function () {
                    let isOK = false;

                    class NewNetron extends Netron {
                        async onConfirmPeer(peer) {
                            assert.instanceOf(peer, adone.netron.Peer);
                            isOK = true;
                            return true;
                        }
                    }

                    server = new NewNetron;
                    await server.bind();
                    await exNetron.connect();
                    assert.isOk(isOK);
                    exNetron.disconnect();
                    await server.unbind();
                });

                it("return false", async function () {
                    class NewNetron extends Netron {
                        async onConfirmPeer(peer) {
                            assert.instanceOf(peer, adone.netron.Peer);
                            return false;
                        }
                    }

                    server = new NewNetron;
                    await server.bind();

                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolve();
                        });
                    });

                    try {
                        await exNetron.connect();
                    } catch (e) {
                        assert.instanceOf(e, adone.x.Connect);
                        assert.include(e.message, "refused connection");
                        await peerOffline;
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });

                it("disconnect", async function () {
                    class NewNetron extends Netron {
                        async onConfirmPeer(peer) {
                            assert.instanceOf(peer, adone.netron.Peer);
                            return peer.disconnect();
                        }
                    }

                    server = new NewNetron;
                    await server.bind();

                    const peerOffline = new Promise((resolve) => {
                        server.on("peer offline", () => {
                            resolve();
                        });
                    });

                    try {
                        await exNetron.connect();
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

                    class Client extends Netron {
                        onSendHandshake(peer, packet) {
                            assert.instanceOf(peer, adone.netron.Peer);
                            isOK = true;
                            return super.onSendHandshake(peer, packet);
                        }
                    }

                    const client = new Client;
                    await superNetron.bind();
                    await client.connect();
                    assert.isOk(isOK);
                });

                it("simple authorization", async function () {
                    class ServerNetron extends Netron {
                        async onConfirmPeer(peer, packet) {
                            const data = packet[adone.netron.GenesisNetron._DATA];
                            if (data.secret === "right secret") {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    }

                    class ClientNetron extends Netron {
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
                    await server.bind();

                    const client = new ClientNetron("client", "right secret");
                    const hacker = new ClientNetron("hacker", "false secret");

                    await client.connect();

                    try {
                        await hacker.connect();
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
                    await server.bind();
                    const serverPeer = await exNetron.connect();
                    await exNetron.send(serverPeer, 1, serverPeer.streamId.next(), 1, an, sendData);
                    assert.equal(await p, sendData);
                });
            });

            describe("Interface twins", function () {
                class TwinA extends adone.netron.Interface {
                    async method2() {
                        const twinValue = await this.$twin.method2();
                        return `twin.${twinValue}`;
                    }

                    method3() {
                        return "method3";
                    }
                }

                @Contextable
                @Property("prop1", { private: false, type: String })
                @Twin(TwinA)
                class A {
                    constructor() {
                        this.prop1 = "prop1";
                        this.prop2 = "prop2";
                    }
                    method1() {
                        return "method1";
                    }

                    method2() {
                        return "method2";
                    }
                }

                @Contextable
                @Property("prop1", { private: false, type: String })
                @Twin(" \
                class B extends adone.netron.Interface { \
                    async method2() { \
                        await adone.promise.delay(10); \
                        const twinValue = await this.$twin.method2(); \
                        return `twin.${twinValue}`; \
                    } \
                    method3() { \
                        return 'method3'; \
                    } \
                }")
                class B {
                    constructor() {
                        this.prop1 = "prop1";
                        this.prop2 = "prop2";
                    }
                    method1() {
                        return "method1";
                    }

                    method2() {
                        return "method2";
                    }
                }

                it("twin interface validation", () => {
                    assert.throws(() => exNetron.setInterfaceTwin("a"), adone.x.InvalidArgument);
                    assert.throws(() => exNetron.setInterfaceTwin("a", 1), adone.x.InvalidArgument);
                    assert.throws(() => exNetron.setInterfaceTwin("a", { }), adone.x.InvalidArgument);
                    assert.throws(() => exNetron.setInterfaceTwin("a", []), adone.x.InvalidArgument);
                    assert.throws(() => exNetron.setInterfaceTwin("a", "twin"), adone.x.InvalidArgument);
                    assert.throws(() => exNetron.setInterfaceTwin("a", new TwinA), adone.x.InvalidArgument);
                    assert.doesNotThrow(() => exNetron.setInterfaceTwin("a", TwinA));
                });

                it("set twin interface double times", () => {
                    assert.doesNotThrow(() => exNetron.setInterfaceTwin("a", TwinA));
                    assert.throws(() => exNetron.setInterfaceTwin("a", TwinA), adone.x.Exists);
                });

                it("local interface twin - basic access", async () => {
                    superNetron.attachContext(new A(), "a");
                    await superNetron.bind();
                    exNetron.option.acceptTwins = false;
                    exNetron.setInterfaceTwin("A", TwinA);

                    const peer = await exNetron.connect();
                    const iTwinA = peer.getInterfaceByName("a");
                    assert.equal(await iTwinA.method1(), "method1");
                    assert.equal(await iTwinA.method2(), "twin.method2");
                    assert.equal(await iTwinA.method3(), "method3");
                    assert.equal(await iTwinA.prop1.get(), "prop1");
                    assert.equal(await iTwinA.prop2.get(), "prop2");
                });

                it("remote interface twin - basic access", async () => {
                    superNetron.attachContext(new B(), "b");
                    await superNetron.bind();

                    const peer = await exNetron.connect();
                    const iTwinA = peer.getInterfaceByName("b");
                    assert.equal(await iTwinA.method1(), "method1");
                    assert.equal(await iTwinA.method2(), "twin.method2");
                    assert.equal(await iTwinA.method3(), "method3");
                    assert.equal(await iTwinA.prop1.get(), "prop1");
                    assert.equal(await iTwinA.prop2.get(), "prop2");
                });
            });
        });

        describe.skip("Streams", function () {
            this.timeout(60 * 1000);

            it("should add stream and requested stream id to associated sets", async function () {
                await superNetron.bind();
                const clientPeer = await exNetron.connect();
                const wStream = await clientPeer.createStream();
                const cstreams = clientPeer._getAwaitingStreams();
                assert.equal(cstreams.length, 1);
                assert.deepEqual(cstreams[0], wStream);
                await adone.promise.delay(500);
                const serverPeer = superNetron.getPeer(exNetron.uid);
                const sstreamIds = serverPeer._getRequestedStreamIds();
                assert.equal(sstreamIds.length, 1);
                assert.deepEqual(sstreamIds[0], wStream.id);
            });

            it("should await for other side accept", async function () {
                await superNetron.bind();
                const clientPeer = await exNetron.connect();
                const wStream = await clientPeer.createStream();
                const serverPeer = superNetron.getPeer(exNetron.uid);
                await adone.promise.delay(500);
                const p = serverPeer.createStream({ remoteStreamId: wStream.id });
                const acceptedStreamId = await wStream.waitForAccept();
                const rStream = await p;
                assert.equal(acceptedStreamId, rStream.id);
            });

            for (const allowHalfOpen of [true, false]) {
                for (const dataCase of ["without", "with"]) {
                    for (const checkType of ["native", "core"]) {
                        it(`should end stream on readable side (allowHalfOpen=${allowHalfOpen} + ${dataCase} data + ${checkType})`, async function () {
                            await superNetron.bind();
                            const clientPeer = await exNetron.connect();
                            const wStream = await clientPeer.createStream({ allowHalfOpen });
                            const serverPeer = superNetron.getPeer(exNetron.uid);
                            await adone.promise.delay(500);
                            let p = serverPeer.createStream({ remoteStreamId: wStream.id, allowHalfOpen });
                            await wStream.waitForAccept();

                            let wEnd = false;
                            let rEnd = false;
                            wStream.on("end", () => {
                                wEnd = true;
                            });

                            const rStream = await p;

                            let data = null;
                            if (checkType === "native") {
                                rStream._readableState.flowing = true; // crazy hack
                                rStream.on("data", (d) => {
                                    data = d;
                                }).on("end", () => {
                                    rEnd = true;
                                });

                                (dataCase === "with") && wStream.write("adone");
                                wStream.end();
                                await p;
                                await adone.promise.delay(1000);
                            } else {
                                p = adone.core(rStream).map((d) => data = d).on("end", () => rEnd = true);   
                                (dataCase === "with") && wStream.write("adone");
                                wStream.end();
                                await p;
                            }

                            if (dataCase === "with") {
                                assert.equal(data, "adone", "Expected data on end but nothing");
                            } else {
                                assert.equal(data, null, "Unexpected data on end");
                            }
                            assert.equal(wEnd, !allowHalfOpen, "On writable side 'end' event was not happened");
                            assert.equal(rEnd, true, "On readable side 'end' event was not happened");
                        });
                    }
                }
            }

            it("should not write data after end", async function () {
                await superNetron.bind();
                const clientPeer = await exNetron.connect();
                const wStream = await clientPeer.createStream();
                const serverPeer = superNetron.getPeer(exNetron.uid);
                await adone.promise.delay(500);
                let p = serverPeer.createStream({ remoteStreamId: wStream.id });
                await wStream.waitForAccept();

                let wEnd = false;
                let rEnd = false;
                wStream.on("end", () => {
                    wEnd = true;
                });

                const rStream = await p;

                let data = null;
                p = adone.core(rStream).map((d) => data = d).on("end", () => rEnd = true);

                wStream.write("adone");
                wStream.end();

                assert.throws(() => wStream.write("bad idea"), Error);

                await p;
                assert.equal(data, "adone", "Expected data on end but nothing");
                assert.equal(wEnd, false, "On writable side 'end' event was not happened");
                assert.equal(rEnd, true, "On readable side 'end' event was not happened");
            });

            it("should receive data after end", async function () {
                await superNetron.bind();
                const clientPeer = await exNetron.connect();
                const wStream = await clientPeer.createStream();
                const serverPeer = superNetron.getPeer(exNetron.uid);
                await adone.promise.delay(500);
                let p = serverPeer.createStream({ remoteStreamId: wStream.id });
                await wStream.waitForAccept();

                let wEnd = false;
                let rEnd = false;
                wStream.on("end", () => {
                    wEnd = true;
                });

                const rStream = await p;

                let data = null;
                p = adone.core(rStream).map((d) => data = d).on("end", () => rEnd = true);

                wStream.write("adone");
                wStream.end();

                assert.throws(() => wStream.write("bad idea"), Error);

                await p;

                assert.equal(data, "adone", "Expected data on end but nothing");
                assert.equal(wEnd, false, "On writable side 'end' event was not happened");
                assert.equal(rEnd, true, "On readable side 'end' event was not happened");

                p = adone.core(wStream).map((d) => data = d).on("end", () => wEnd = true);
                rStream.write("enoda");
                rStream.end();

                await p;

                assert.equal(data, "enoda", "Expected data on end but nothing");
                assert.equal(wEnd, true, "On writable side 'end' event was not happened");
            });

            it("one way data sending", async function () {
                await superNetron.bind();
                const clientPeer = await exNetron.connect();
                const wStream = await clientPeer.createStream();
                const serverPeer = superNetron.getPeer(exNetron.uid);
                
                const rMessages = [];
                await adone.promise.delay(500);
                let p = serverPeer.createStream({ remoteStreamId: wStream.id });
                await wStream.waitForAccept();
                const rStream = await p;

                const rActualMessages = [];
                p = adone.core(rStream).map((data) => {
                    rActualMessages.push(data);
                    return data;
                });
                    
                for (let i = 0; i < 1000; i++) {
                    const msg = adone.text.random(adone.util.random(10, 10000));
                    rMessages.push(msg);
                    wStream.write(msg);
                }

                wStream.end();

                await p;
                assert.sameMembers(rMessages, rActualMessages);
            });

            for (const tcase of ["initiator", "acceptor"]) {
                it(`two way data sending - end initiated by ${tcase}`, async function () {
                    await superNetron.bind();
                    const clientPeer = await exNetron.connect();
                    const wStream = await clientPeer.createStream({ allowHalfOpen: false });
                    const serverPeer = superNetron.getPeer(exNetron.uid);
                    
                    const wMessages = [];
                    const rMessages = [];
                    await adone.promise.delay(500);
                    const p = serverPeer.createStream({ remoteStreamId: wStream.id, allowHalfOpen: false });
                    await wStream.waitForAccept();
                    const rStream = await p;

                    const wActualMessages = [];
                    const p1 = adone.core(rStream).map((data) => {
                        wActualMessages.push(data);
                        return data;
                    });

                    const rActualMessages = [];
                    const p2 = adone.core(wStream).map((data) => {
                        rActualMessages.push(data);
                        return data;
                    });
                        
                    for (let i = 0; i < 3000; i++) {
                        let msg = adone.text.random(adone.util.random(10, 10000));
                        wMessages.push(msg);
                        wStream.write(msg);

                        msg = adone.text.random(adone.util.random(10, 10000));
                        rMessages.push(msg);
                        rStream.write(msg);
                    }

                    if (tcase === "initiator") {
                        wStream.end();
                    } else {
                        rStream.end();
                    }

                    await Promise.all([p1, p2]);
                    expect(rMessages).to.have.lengthOf(rActualMessages.length);
                    expect(wMessages).to.have.lengthOf(wActualMessages.length);
                    expect(rMessages).to.be.deep.equal(rActualMessages);
                    expect(wMessages).to.be.deep.equal(wActualMessages);
                });
            }

            it("should flow data after resume", async function () {
                await superNetron.bind();
                const clientPeer = await exNetron.connect();
                const wStream = await clientPeer.createStream();
                const serverPeer = superNetron.getPeer(exNetron.uid);
                await adone.promise.delay(500);
                const p = serverPeer.createStream({ remoteStreamId: wStream.id });
                await wStream.waitForAccept();
                const rStream = await p;

                const sampleDatas = ["data1", "data2", "data3", "data4", "data5", "data6", "data7", "data8"];

                for (const d of sampleDatas) {
                    wStream.write(d);
                }

                const datas = [];
                rStream.on("data", (d) => {
                    datas.push(d);
                });

                await adone.promise.delay(1000);

                assert.equal(datas.length, 0);
                rStream.resume();
                assert.sameMembers(datas, sampleDatas);

                wStream.end();
            });

            for (const fileName of ["small", "big"]) {
                it(`should send ${fileName} file`, async function () {
                    await superNetron.bind();
                    const clientPeer = await exNetron.connect();
                    const wStream = await clientPeer.createStream( { allowHalfOpen: false });
                    const serverPeer = superNetron.getPeer(exNetron.uid);
                    await adone.promise.delay(500);
                    const p = serverPeer.createStream({ remoteStreamId: wStream.id });
                    await wStream.waitForAccept();
                    const rStream = await p;

                    const bs = new adone.stream.buffer.WritableStream();
                    rStream.pipe(bs);

                    const p1 = new Promise((resolve) => {
                        rStream.on("end", resolve);
                    });

                    adone.std.fs.createReadStream(fixturePath(fileName)).pipe(wStream);

                    await p1;

                    const origBuff = adone.std.fs.readFileSync(fixturePath(fileName));
                    assert.deepEqual(bs.getContents(), origBuff);
                });
            }

            for (const dataSize of [1024 * 1024, 10 * 1024 * 1024, 50 * 1024 * 1024]) {
                it(`should send ${dataSize / 1024 / 1024}MB of data`, async function () {
                    await superNetron.bind();
                    const clientPeer = await exNetron.connect();
                    const wStream = await clientPeer.createStream( { allowHalfOpen: false });
                    const serverPeer = superNetron.getPeer(exNetron.uid);
                    await adone.promise.delay(500);
                    const p = serverPeer.createStream({ remoteStreamId: wStream.id });
                    await wStream.waitForAccept();
                    const rStream = await p;

                    const bs = new adone.stream.buffer.WritableStream();
                    rStream.pipe(bs);

                    const p1 = new Promise((resolve) => {
                        rStream.on("end", resolve);
                    });

                    const buff = new adone.ExBuffer();
                    let remaining = dataSize;

                    while (remaining > 0) {
                        let chunkSize = adone.util.random(256, 65536);
                        if (chunkSize > remaining) {
                            chunkSize = remaining;
                        }
                        remaining -= chunkSize;
                        const data = adone.std.crypto.randomBytes(chunkSize);
                        buff.write(data);
                        wStream.write(data);
                    }

                    wStream.end();

                    await p1;

                    buff.flip();
                    assert.deepEqual(bs.getContents(), buff.toBuffer());
                });
            }
        });

        // it("", async function () {
        //     await superNetron.bind();
        //     const clientPeer = await exNetron.connect();

        // });
    });
});
