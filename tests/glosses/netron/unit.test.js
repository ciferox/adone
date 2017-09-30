const { is, std: { path }, netron: { DEFAULT_PORT, ACTION, STATUS, Netron, decorator: { Private, Contextable, Property, Twin } } } = adone;

let defaultPort = DEFAULT_PORT;
let NETRON_PORT = 32348;

const fixturePath = (relPath) => path.join(__dirname, "..", "fixtures", relPath);

describe("netron", "native", "unit test", () => {
    let exNetron;
    let superNetron;

    before(async () => {
        if (!(await adone.net.util.isFreePort(defaultPort))) {
            defaultPort = adone.net.util.getPort();
        }
        NETRON_PORT = adone.net.util.getPort({ exclude: [defaultPort] });
    });

    beforeEach(async () => {
        exNetron = new Netron();
        superNetron = new Netron({ isSuper: true });
    });

    afterEach(async () => {
        await exNetron.disconnect();
        await superNetron.unbind();
    });

    describe("Unit tests", function () {
        this.timeout(10 * 1000);

        it("constructor", () => {
            const n1 = new Netron();
            assert.instanceOf(n1, Netron);
            assert(/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}/.test(n1.uid));

            const n2 = new Netron();
            assert.instanceOf(n2, Netron);
        });

        describe("Connect", () => {
            it("connect with defaults", async () => {
                await superNetron.bind();
                await exNetron.connect();
            });

            it("reconnect attempts", async () => {
                const customExNetron = new Netron({ reconnects: 4 });
                let reconnects = 0;
                customExNetron.on("peer create", (peer) => {
                    peer.on("reconnect attempt", () => {
                        ++reconnects;
                    });
                });

                const err = await assert.throws(async () => customExNetron.connect({ port: NETRON_PORT }));
                assert.instanceOf(err, adone.x.Connect);
                assert.equal(reconnects, 4);
            });

            it("right status sequence", async () => {
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

            it("no awaiters after connect", async () => {
                await superNetron.bind();
                const peer = await exNetron.connect();
                expect(peer.getNumberOfAwaiters()).to.be.equal(0);
            });

            it("try to connect after connect", async () => {
                await superNetron.bind();
                const peer1 = await exNetron.connect();
                const peer2 = await exNetron.connect();
                assert.strictEqual(peer1, peer2);
            });
        });

        it("Netron-specific predicates", async () => {
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

        describe("ping", () => {
            it("ping() local netron should always return true", async () => {
                assert.isNull(await superNetron.ping());
            });

            it("ping() unknown netron", async () => {
                await assert.throws(async () => exNetron.ping(adone.util.uuid.v4()), adone.x.Unknown);
            });

            it("ping remote netron should", async () => {
                await superNetron.bind();
                await exNetron.connect();

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
                await superNetron.bind();

                let peer = await exNetron.connect();
                assert.isOk(peer);
                assert.equal(peer, exNetron.getPeer(superNetron.uid));

                peer = superNetron.getPeer(exNetron.uid);
                assert.isOk(peer);
                assert.equal(peer.uid, exNetron.uid);
            });
        });

        describe("getPeers", () => {
            it("getPeers()", async () => {
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

        describe("disconnect", () => {
            it("Peer.disconnect() from client", async (done) => {
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

            it("Peer.disconnect() from server", async (done) => {
                await superNetron.bind();
                await exNetron.connect();

                superNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, exNetron.uid);
                    done();
                });

                superNetron.getPeer(exNetron.uid).disconnect();
            });

            it("Netron.disconnect(uid)", async (done) => {
                await superNetron.bind();
                await exNetron.connect();

                superNetron.on("peer offline", (peer) => {
                    assert.equal(peer.uid, exNetron.uid);
                    done();
                });

                superNetron.disconnect(exNetron.uid);
            });

            it("Netron.disconnect()", async (done) => {
                await superNetron.bind();
                await exNetron.connect();

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

                const newStatus = Math.floor(Math.random() * STATUS.MAX);
                p._setStatus(newStatus);
                assert.equal(p.getStatus(), newStatus, "status changed");

                p._setStatus(-1);
                assert.equal(p.getStatus(), newStatus, "negative numbers don't change status");
            });
        });

        describe("Events", () => {
            describe("Netron", () => {
                it("peer create", async () => {
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
                    await Promise.all([p1, p2, p3]);
                });

                it("peer connect", async () => {
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
                    return Promise.all([p1, p2, p3]);
                });

                it("peer online", async () => {
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
                    return Promise.all([p1, p2, p3]);
                });

                it("peer offline", async () => {
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

            it("Netron.getContextNames()", () => {
                const contexts = superNetron.getContextNames();

                assert(is.array(contexts));
                assert.equal(contexts.length, 0);
            });

            it("Peer.getContextNames()", async () => {
                await superNetron.bind();
                const peer = await exNetron.connect();
                const contexts = peer.getContextNames();

                assert.isOk(is.array(contexts));
                assert.equal(contexts.length, 0);
            });

            // Я решил включить тест приватного метода для того, чтобы избежать
            // ненужного повтора тестов на неверные аргументы для attachContext
            // и attachContextRemote. Позже можно будет сделать как-нибудь лучше.
            describe("_checkContext", () => {
                it("not instance", () => {
                    const err = assert.throws(() => superNetron._checkContext("a"));
                    assert.instanceOf(err, adone.x.NotValid);
                });

                it("class instead instance", () => {
                    const err = assert.throws(() => superNetron._checkContext(A));
                    assert.instanceOf(err, adone.x.NotValid);
                });

                it("class without constructor", () => {
                    class SomeClass { }
                    const err = assert.throws(() => superNetron._checkContext(new SomeClass()));
                    assert.instanceOf(err, adone.x.NotValid);
                });

                it("Object instead instance", () => {
                    const err = assert.throws(() => superNetron._checkContext(Object));
                    assert.instanceOf(err, adone.x.NotValid);
                });

                it("empty function instead instance", () => {
                    const err = assert.throws(() => superNetron._checkContext(adone.noop));
                    assert.instanceOf(err, adone.x.NotValid);
                });

                it("instance of unnamed class", () => {
                    const a = (new
                        @Contextable
                    @Private
                    class {
                        method() {
                        }
                    } ()
                    );

                const err = assert.throws(() => superNetron._checkContext(a));
                assert.instanceOf(err, adone.x.NotAllowed);
            });

            it("instance with no public methods", () => {
                @Contextable
                @Private
                class A {
                    method() {
                    }
                }

                const err = assert.throws(() => superNetron._checkContext(new A()));
                assert.instanceOf(err, adone.x.NotValid);
            });

            it("valid way", () => {
                superNetron._checkContext(new A());
            });
        });

        describe("attachContext", () => {
            it("attach", async () => {
                superNetron.attachContext(new A(), "a");
                superNetron.attachContext(new B());

                await superNetron.bind();
                const peer = await exNetron.connect();

                assert.include(superNetron.getContextNames(), "a");
                assert.include(superNetron.getContextNames(), "B");
                assert.include(peer.getContextNames(), "a");
                assert.include(peer.getContextNames(), "B");
            });

            it("context attach notification", async () => {
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
                exNetron2 = new Netron();
            });

            afterEach(async () => {
                await superNetron.disconnect();
                await superNetron.unbind();
            });

            it("attach", async () => {
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

            it("context attach notification", async () => {
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

            it("double attach same context", async () => {
                const ctx = new A();

                await superNetron.bind();
                const peer = await exNetron.connect();

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

            beforeEach(async () => {
                exNetron2 = new Netron();
            });

            afterEach(async () => {
                await superNetron.disconnect();
                await superNetron.unbind();
            });

            it("detach not existing context", async () => {
                await superNetron.bind();
                const peer = await exNetron.connect();

                const e = await assert.throws(async () => exNetron.detachContextRemote(peer.uid, "this_context_not_exists"));
                assert.instanceOf(e, adone.x.NotExists);
            });

            it("valid way", async () => {
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

            it("context detach notification", async () => {
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

    describe("getDefinitionByName", () => {

        @Contextable
        class A {
            method() { }
        }

        let peer;

        beforeEach(async () => {
            superNetron.attachContext(new A(), "a");
            await superNetron.bind();
            peer = await exNetron.connect();
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

            timeout() {
                return adone.promise.delay(1000);
            }
        }

        for (const currentCase of ["local", "remote", "super remote"]) {
            describe(currentCase, () => {
                let netron;
                let uid;
                let defID;
                let exNetron2;

                beforeEach(async () => {
                    exNetron2 = new Netron();

                    if (currentCase === "remote") {

                        superNetron.attachContext(new A(), "a");
                        await superNetron.bind();
                        const peer = await exNetron.connect();
                        defID = peer.getDefinitionByName("a").id;

                        netron = exNetron;
                        uid = superNetron.uid;

                    } else if (currentCase === "super remote") {

                        await superNetron.bind();
                        await exNetron.connect();
                        await exNetron.attachContextRemote(superNetron.uid, new A(), "a");

                        const peer = await exNetron2.connect();
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
        for (const currentCase of ["remote", "super remote"]) {
            describe(`timeouts:${currentCase}`, () => {
                let netron;
                let uid;
                let defID;
                let exNetron2;
                let exNetron;
                let superNetron;

                beforeEach(async () => {
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

                        superNetron.attachContext(new A(), "a");
                        await superNetron.bind();
                        const peer = await exNetron.connect();
                        defID = peer.getDefinitionByName("a").id;

                        netron = exNetron;
                        uid = superNetron.uid;

                    } else if (currentCase === "super remote") {

                        await superNetron.bind();
                        await exNetron.connect();
                        await exNetron.attachContextRemote(superNetron.uid, new A(), "a");

                        const peer = await exNetron2.connect();
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

    describe("getInterfaceById", () => {

        @Contextable
        class A {
            method() { }
        }

        beforeEach(async () => {
            superNetron.attachContext(new A(), "a");
            await superNetron.bind();
            await exNetron.connect();
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
            await superNetron.bind();
            await exNetron.connect();
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
            await superNetron.bind();
            peer = await exNetron.connect();
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
                return (new A());
            }
        }

        it("should not emit events about conexts to context origin netron in super mode", async () => {
            await superNetron.bind();
            await exNetron.connect();
            let nCatchedEvent = false;
            let n2CatchedEvent = false;
            await exNetron.onRemote(superNetron.uid, "context detach", (peer, ctxData) => {
                nCatchedEvent = true;
            });

            await exNetron.attachContextRemote(superNetron.uid, new A(), "a");
            await exNetron.attachContextRemote(superNetron.uid, new B(), "b");
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
            describe(contextType, () => {
                for (const currentCase of ["local", "remote", "super remote"]) {
                    describe(currentCase, () => {
                        let netron;
                        let uid;
                        let iface;

                        beforeEach(async () => {

                            if (currentCase === "remote") {

                                superNetron.attachContext(new A(), "a");
                                superNetron.attachContext(new B(), "b");
                                await superNetron.bind();
                                await exNetron.connect();
                                netron = exNetron;
                                uid = superNetron.uid;

                            } else if (currentCase === "super remote") {

                                await superNetron.bind();
                                await exNetron.connect();
                                await exNetron.attachContextRemote(superNetron.uid, new A(), "a");
                                await exNetron.attachContextRemote(superNetron.uid, new B(), "b");
                                exNetron2 = new Netron();
                                await exNetron2.connect();
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

            it("return false", async () => {
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

                const e = await assert.throws(async () => exNetron.connect());
                assert.instanceOf(e, adone.x.Connect);
                assert.include(e.message, "refused connection");
                assert.equal(resolved, false);
            });

            it("disconnect", async () => {
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

                const e = await assert.throws(async () => exNetron.connect());
                assert.instanceOf(e, adone.x.Connect);
                assert.include(e.message, "refused connection");
                assert.equal(resolved, false);
            });
        });

        describe("onConfirmPeer", () => {
            it("return true", async () => {
                let isOK = false;

                class NewNetron extends Netron {
                    async onConfirmPeer(peer) {
                        assert.instanceOf(peer, adone.netron.Peer);
                        isOK = true;
                        return true;
                    }
                }

                server = new NewNetron();
                await server.bind();
                await exNetron.connect();
                assert.isOk(isOK);
                exNetron.disconnect();
                await server.unbind();
            });

            it("return false", async () => {
                class NewNetron extends Netron {
                    async onConfirmPeer(peer) {
                        assert.instanceOf(peer, adone.netron.Peer);
                        return false;
                    }
                }

                server = new NewNetron();
                await server.bind();

                const peerOffline = new Promise((resolve) => {
                    server.on("peer offline", () => {
                        resolve();
                    });
                });

                const e = await assert.throws(async () => exNetron.connect());
                assert.instanceOf(e, adone.x.Connect);
                assert.include(e.message, "refused connection");
                await peerOffline;
            });

            it("disconnect", async () => {
                class NewNetron extends Netron {
                    async onConfirmPeer(peer) {
                        assert.instanceOf(peer, adone.netron.Peer);
                        return peer.disconnect();
                    }
                }

                server = new NewNetron();
                await server.bind();

                const peerOffline = new Promise((resolve) => {
                    server.on("peer offline", () => {
                        resolve();
                    });
                });

                const e = await assert.throws(async () => exNetron.connect());
                assert.instanceOf(e, adone.x.Connect);
                assert.include(e.message, "refused connection");
                await peerOffline;
            });
        });

        describe("onSendHandshake", () => {
            it("check calling", async () => {
                let isOK = false;

                class Client extends Netron {
                    onSendHandshake(peer, packet) {
                        assert.instanceOf(peer, adone.netron.Peer);
                        isOK = true;
                        return super.onSendHandshake(peer, packet);
                    }
                }

                const client = new Client();
                await superNetron.bind();
                await client.connect();
                assert.isOk(isOK);
            });

            it("simple authorization", async () => {
                class ServerNetron extends Netron {
                    async onConfirmPeer(peer, packet) {
                        const data = packet.data;
                        if (data.secret === "right secret") {
                            return true;
                        }
                        return false;

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

                server = new ServerNetron();
                await server.bind();

                const client = new ClientNetron("client", "right secret");
                const hacker = new ClientNetron("hacker", "false secret");

                await client.connect();

                const e = await assert.throws(async () => hacker.connect());
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
                        customProcessPacket(peer, packet) {
                            super.customProcessPacket(peer, packet).then((res) => {
                                if (!res) {
                                    resolve(packet.data);
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

        describe("Interface twins", () => {
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
                assert.throws(() => exNetron.setInterfaceTwin("a", {}), adone.x.InvalidArgument);
                assert.throws(() => exNetron.setInterfaceTwin("a", []), adone.x.InvalidArgument);
                assert.throws(() => exNetron.setInterfaceTwin("a", "twin"), adone.x.InvalidArgument);
                assert.throws(() => exNetron.setInterfaceTwin("a", new TwinA()), adone.x.InvalidArgument);
                assert.doesNotThrow(() => exNetron.setInterfaceTwin("a", TwinA));
            });

            it("set twin interface double times", () => {
                assert.doesNotThrow(() => exNetron.setInterfaceTwin("a", TwinA));
                assert.throws(() => exNetron.setInterfaceTwin("a", TwinA), adone.x.Exists);
            });

            it("local interface twin - basic access", async () => {
                superNetron.attachContext(new A(), "a");
                await superNetron.bind();
                exNetron.options.acceptTwins = false;
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

        it("should add stream and requested stream id to associated sets", async () => {
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

        it("should await for other side accept", async () => {
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
                    it(`should end stream on readable side (allowHalfOpen=${allowHalfOpen} + ${dataCase} data + ${checkType})`, async () => {
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

        it("should not write data after end", async () => {
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

        it("should receive data after end", async () => {
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

        it("one way data sending", async () => {
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
                const msg = adone.text.random(adone.math.random(10, 10000));
                rMessages.push(msg);
                wStream.write(msg);
            }

            wStream.end();

            await p;
            assert.sameMembers(rMessages, rActualMessages);
        });

        for (const tcase of ["initiator", "acceptor"]) {
            it(`two way data sending - end initiated by ${tcase}`, async () => {
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
                    let msg = adone.text.random(adone.math.random(10, 10000));
                    wMessages.push(msg);
                    wStream.write(msg);

                    msg = adone.text.random(adone.math.random(10, 10000));
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

        it("should flow data after resume", async () => {
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
            it(`should send ${fileName} file`, async () => {
                await superNetron.bind();
                const clientPeer = await exNetron.connect();
                const wStream = await clientPeer.createStream({ allowHalfOpen: false });
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
            it(`should send ${dataSize / 1024 / 1024}MB of data`, async () => {
                await superNetron.bind();
                const clientPeer = await exNetron.connect();
                const wStream = await clientPeer.createStream({ allowHalfOpen: false });
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

                const buff = new adone.collection.ByteArray();
                let remaining = dataSize;

                while (remaining > 0) {
                    let chunkSize = adone.math.random(256, 65536);
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
