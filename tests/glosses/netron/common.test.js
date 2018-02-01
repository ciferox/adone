const {
    is,
    net,
    std: { path },
    netron: { DEFAULT_PORT, ACTION, PEER_STATUS, Netron, Reflection, Context, Public }
} = adone;

let defaultPort = DEFAULT_PORT;
let NETRON_PORT = 32348;

const fixturePath = (relPath) => path.join(__dirname, "..", "fixtures", relPath);

describe("netron", "common", function () {
    this.timeout(10 * 1000);
    let exNetron;
    let superNetron;

    before(async () => {
        defaultPort = await net.util.getPort(defaultPort);
        NETRON_PORT = await net.util.getPort({ exclude: [defaultPort] });
    });

    beforeEach(async () => {
        exNetron = new Netron();
        superNetron = new Netron({ isSuper: true });
    });

    afterEach(async () => {
        await exNetron.disconnect();
        await superNetron.unbind();
    });

    it("constructor", () => {
        const n = new Netron();
        assert.true(/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}/.test(n.uid));
        assert.true(is.plainObject(n.options));
    });

    describe("connection", () => {
        it("connect with defaults", async () => {
            await superNetron.bind();
            await exNetron.connect();
        });

        it("reconnect attempts", async () => {
            const customExNetron = new Netron({
                connect: {
                    retries: 4
                }
            });
            let reconnects = 0;
            customExNetron.on("peer create", (peer) => {
                peer.on("reconnect attempt", () => {
                    ++reconnects;
                });
            });

            const err = await assert.throws(async () => customExNetron.connect({
                port: NETRON_PORT
            }));
            assert.instanceOf(err, adone.exception.Connect);
            assert.equal(reconnects, 4);
        });

        it("right status sequence", async () => {
            const sequence = [PEER_STATUS.OFFLINE, PEER_STATUS.CONNECTING, PEER_STATUS.HANDSHAKING, PEER_STATUS.ONLINE];
            let index = 0;
            await superNetron.bind();
            exNetron.on("peer create", (peer) => {
                assert.equal(sequence[index++], peer.getStatus());
                peer.on("status", (status) => {
                    if (status === 0) {
                        return;
                    }
                    assert.equal(sequence[index++], status);
                });
            });
            await exNetron.connect();
            assert.equal(index, 4);
        });

        it("no awaiters after connect", async () => {
            await superNetron.bind();
            const peer = await exNetron.connect();
            assert.equal(peer.getNumberOfAwaiters(), 0);
        });

        it("try to connect after connect (connection cache)", async () => {
            await superNetron.bind();
            const peer1 = await exNetron.connect();
            const peer2 = await exNetron.connect();
            assert.strictEqual(peer1, peer2);
        });

        it("Peer#disconnect() from client", async (done) => {
            await superNetron.bind();
            const peer = await exNetron.connect();
            assert.ok(superNetron.getPeer(exNetron.uid));
            assert.ok(exNetron.getPeer(superNetron.uid));

            exNetron.on("peer offline", (peer) => {
                assert.equal(peer.uid, superNetron.uid);
                done();
            });

            peer.disconnect();
        });

        it("Peer#disconnect() from server", async (done) => {
            await superNetron.bind();
            await exNetron.connect();

            superNetron.on("peer offline", (peer) => {
                assert.equal(peer.uid, exNetron.uid);
                done();
            });

            superNetron.getPeer(exNetron.uid).disconnect();
        });

        it("Netron#disconnect(uid)", async (done) => {
            await superNetron.bind();
            await exNetron.connect();

            superNetron.on("peer offline", (peer) => {
                assert.equal(peer.uid, exNetron.uid);
                done();
            });

            superNetron.disconnect(exNetron.uid);
        });

        it("Netron#disconnect()", async (done) => {
            await superNetron.bind();
            await exNetron.connect();

            superNetron.on("peer offline", (peer) => {
                assert.equal(peer.uid, exNetron.uid);
                done();
            });

            superNetron.disconnect();
        });
    });

    it("predicates", async () => {
        @Context()
        class A {
            @Public({
                type: String
            })
            prop = "adone";

            @Public()
            method() {

            }
        }
        assert.ok(is.netron(exNetron));
        assert.ok(is.genesisNetron(exNetron));
        assert.ok(is.genesisNetron(superNetron));
        const theA = new A();
        const defId = superNetron.attachContext(theA, "a");
        const stubA = superNetron.getStubById(defId);
        assert.ok(is.netronStub(stubA));
        assert.ok(is.netronDefinition(stubA.definition));
        await superNetron.bind();
        const peer = await exNetron.connect();
        assert.ok(is.netronPeer(peer));
        assert.ok(is.genesisPeer(peer));

        const iA = peer.getInterfaceByName("a");
        assert.ok(is.netronInterface(iA));
        assert.ok(is.netronIMethod(iA, "method"));
        assert.ok(is.netronIProperty(iA, "prop"));
    });

    describe("ping", () => {
        it("ping() local netron should always return true", async () => {
            assert.null(await superNetron.ping());
        });

        it("ping() unknown netron should have thrown", async () => {
            await assert.throws(async () => exNetron.ping(adone.util.uuid.v4()), adone.exception.Unknown);
        });

        it("ping remote netron", async () => {
            await superNetron.bind();
            await exNetron.connect();

            let result = await superNetron.ping(exNetron.uid);
            assert.null(result);

            result = await exNetron.ping(superNetron.uid);
            assert.null(result);
        });
    });

    it("getPeer(null)", () => {
        assert.throws(() => exNetron.getPeer(null), adone.exception.InvalidArgument);
    });

    it("getPeer(uid)", async () => {
        await superNetron.bind();

        let peer = await exNetron.connect();
        assert.ok(peer);
        assert.equal(peer, exNetron.getPeer(superNetron.uid));

        peer = superNetron.getPeer(exNetron.uid);
        assert.ok(peer);
        assert.equal(peer.uid, exNetron.uid);
    });

    it("getPeers()", async () => {
        await superNetron.bind();

        const peer = await exNetron.connect();
        assert.ok(peer);
        const exNetronPeers = exNetron.getPeers();
        assert.ok(exNetronPeers.has(superNetron.uid));
        assert.equal(exNetronPeers.get(superNetron.uid), peer);

        const superNetronPeers = superNetron.getPeers();
        assert.ok(superNetronPeers.has(exNetron.uid));
        assert.equal(superNetronPeers.get(exNetron.uid).uid, exNetron.uid);
    });

    describe("events", () => {
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
        @Context()
        class A {
            @Public()
            method() { }
        }

        @Context()
        class B {
            @Public()
            method() { }
        }

        it("Netron#getContextNames()", () => {
            const contexts = superNetron.getContextNames();

            assert(is.array(contexts));
            assert.equal(contexts.length, 0);
        });

        it("Peer#getContextNames()", async () => {
            await superNetron.bind();
            const peer = await exNetron.connect();
            const contexts = peer.getContextNames();

            assert.ok(is.array(contexts));
            assert.equal(contexts.length, 0);
        });

        describe("Reflection.from()", () => {
            it("not instance", () => {
                const err = assert.throws(() => Reflection.from("a"));
                assert.instanceOf(err, adone.exception.NotValid);
            });

            it("class instead instance", () => {
                const err = assert.throws(() => Reflection.from(A));
                assert.instanceOf(err, adone.exception.NotValid);
            });

            it("class without constructor", () => {
                class SomeClass { }
                const err = assert.throws(() => Reflection.from(new SomeClass()));
                assert.instanceOf(err, adone.exception.NotValid);
            });

            it("Object instead instance", () => {
                const err = assert.throws(() => Reflection.from(Object));
                assert.instanceOf(err, adone.exception.NotValid);
            });

            it("empty function instead instance", () => {
                const err = assert.throws(() => Reflection.from(adone.noop));
                assert.instanceOf(err, adone.exception.NotValid);
            });

            it("instance of unnamed class", () => {
                const a = (new
                    class {
                        method() {
                        }
                    }()
                );

                const err = assert.throws(() => Reflection.from(a));
                assert.instanceOf(err, adone.exception.NotValid);
            });

            it("instance with no public methods", () => {
                @Context()
                class A {
                    method() {
                    }
                }

                const err = assert.throws(() => Reflection.from(new A()));
                assert.instanceOf(err, adone.exception.NotValid);
            });

            it("valid way", () => {
                Reflection.from(new A());
            });
        });

        describe("attach contexts", () => {
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
                assert.instanceOf(err, adone.exception.Exists);
            });
        });

        describe("attach remote contexts", () => {
            let exNetron2;

            beforeEach(async () => {
                exNetron2 = new Netron();
            });

            afterEach(async () => {
                await superNetron.disconnect();
                await superNetron.unbind();
            });

            it("netrons should exchange contexts when connected", async () => {
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

            it("attach notifications should be sent between the netrons when new contexts are attached", async () => {
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

            it("double attach same context should have thrown", async () => {
                const ctx = new A();

                await superNetron.bind();
                const peer = await exNetron.connect();

                await exNetron.attachContextRemote(peer.uid, ctx, "a");
                const err = await assert.throws(async () => exNetron.attachContextRemote(peer.uid, ctx, "a"));
                assert.instanceOf(err, adone.exception.Exists);
            });
        });

        describe("detach contexts", () => {
            it("detach not existing context", () => {
                const e = assert.throws(() => superNetron.detachContext("this_context_not_exists"));
                assert.instanceOf(e, adone.exception.Unknown);
            });

            it("valid way", async () => {
                superNetron.attachContext(new A(), "a");
                superNetron.attachContext(new B());
                superNetron.detachContext("a");
                superNetron.detachContext("B");

                assert.notInclude(superNetron.getContextNames(), "a");
                assert.notInclude(superNetron.getContextNames(), "B");
            });

            it("detach notification", async () => {
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

        describe("detach remote contexts", () => {
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
                assert.instanceOf(e, adone.exception.NotExists);
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

            it("detach notification", async () => {
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
        @Context()
        class A {
            @Public()
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
            assert.ok(def);
            assert.instanceOf(def, adone.netron.Definition);
            assert.equal(def.name, "A");

            assert.throws(() => superNetron.getDefinitionByName("not_exists"), adone.exception.Unknown);
        });

        it("remote", () => {
            const def = exNetron.getDefinitionByName("a", superNetron.uid);
            assert.ok(def);
            assert.instanceOf(def, adone.netron.Definition);
            assert.equal(def.name, "A");

            assert.notOk(exNetron.getDefinitionByName("not_exists", superNetron.uid));
        });

        it("peer", () => {
            const def = peer.getDefinitionByName("a", superNetron.uid);
            assert.ok(def);
            assert.instanceOf(def, adone.netron.Definition);
            assert.equal(def.name, "A");

            assert.notOk(peer.getDefinitionByName("not_exists", superNetron.uid));
        });
    });

    describe("RPC", () => {
        @Context()
        class A {
            @Public()
            property = null;

            @Public()
            undefinedProperty = undefined;

            @Public()
            counter = 0;

            @Public()
            method(...args) {
                return args;
            }

            @Public()
            errorMethod() {
                throw Error("I'm an error!");
            }

            @Public()
            voidMethod(increment, secondArgument) {
                if (is.number(increment)) {
                    this.counter += increment;
                }
                if (secondArgument) {
                    this.property = secondArgument;
                }
            }

            @Public()
            timeout() {
                return adone.promise.delay(1000);
            }
        }

        for (const currentCase of ["local", "remote", "super remote"]) {
            // eslint-disable-next-line
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
                    expect(err).to.be.instanceOf(adone.exception.NetronTimeout);
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
                    expect(err).to.be.instanceOf(adone.exception.NetronTimeout);
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
                    if (err instanceof adone.exception.NetronTimeout) {
                        throw new Error("Wrong error was thrown");
                    }
                    expect(err).to.be.instanceOf(adone.exception.NetronPeerDisconnected);
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
                    if (err instanceof adone.exception.NetronTimeout) {
                        throw new Error("Wrong error was thrown");
                    }
                    expect(err).to.be.instanceOf(adone.exception.NetronPeerDisconnected);
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
        @Context()
        class A {
            @Public()
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
            assert.ok(iface);
            assert.instanceOf(iface, adone.netron.Interface);

            assert.throws(() => superNetron.getInterfaceById(100500), adone.exception.Unknown);
        });

        it("remote", () => {
            const def = exNetron.getDefinitionByName("a", superNetron.uid);
            const iface = exNetron.getInterfaceById(def.id, superNetron.uid);
            assert.ok(iface);
            assert.instanceOf(iface, adone.netron.Interface);

            assert.throws(() => exNetron.getInterfaceById(100500, superNetron.uid), adone.exception.Unknown);
        });
    });

    describe("getInterfaceByName", () => {
        @Context()
        class A {
            @Public()
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
            assert.ok(iface);
            assert.instanceOf(iface, adone.netron.Interface);

            assert.throws(() => superNetron.getInterfaceByName("not_exists"), adone.exception.Unknown);
        });

        it("remote", () => {
            const iface = exNetron.getInterfaceByName("a", superNetron.uid);
            assert.ok(iface);
            assert.instanceOf(iface, adone.netron.Interface);

            assert.throws(() => {
                exNetron.getInterfaceByName("not_exists", superNetron.uid);
            }, adone.exception.Unknown);
        });
    });

    it("getStubById", () => {
        @Context()
        class A {
            @Public()
            method() { }
        }

        superNetron.attachContext(new A(), "a");

        const def = superNetron.getDefinitionByName("a");
        const stub = superNetron.getStubById(def.id);
        assert.ok(stub);
        assert.instanceOf(stub, adone.netron.Stub);

        assert.notOk(superNetron.getStubById(100500));
    });

    describe("getPeerForInterface", () => {
        @Context()
        class A {
            @Public()
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
            assert.throws(() => superNetron.getPeerForInterface(iface), adone.exception.InvalidArgument);
        });

        it("remote", () => {
            const iface = exNetron.getInterfaceByName("a", superNetron.uid);
            const peerIface = exNetron.getPeerForInterface(iface);
            assert.ok(peerIface);
            assert.instanceOf(peerIface, adone.netron.Peer);
            assert.equal(peerIface.uid, superNetron.uid);
            assert.equal(peerIface.uid, superNetron.uid);
            assert.equal(peerIface, peer);

            assert.throws(() => exNetron.getPeerForInterface(null), adone.exception.InvalidArgument);
        });
    });

    describe("Interfaces", () => {
        let exNetron2;

        @Context()
        class A {
            @Public()
            property = null;

            @Public()
            undefinedProperty = undefined;

            @Public()
            storage = null;

            @Public()
            counter = 0;

            @Public()
            method(...args) {
                return args;
            }

            @Public()
            errorMethod() {
                throw Error("I'm an error!");
            }

            @Public()
            voidMethod(...args) {
                ++this.counter;

                if (!is.nil(args)) {
                    this.storage = args;
                }
            }
        }

        @Context()
        class B {
            @Public()
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
            // eslint-disable-next-line
            describe(contextType, () => {
                for (const currentCase of ["local", "remote", "super remote"]) {
                    // eslint-disable-next-line
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
                assert.ok(isOK);
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
                assert.instanceOf(e, adone.exception.Connect);
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
                assert.instanceOf(e, adone.exception.Connect);
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
                assert.ok(isOK);
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
                assert.instanceOf(e, adone.exception.Connect);
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
                assert.instanceOf(e, adone.exception.Connect);
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
                assert.ok(isOK);
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
                assert.instanceOf(e, adone.exception.Connect);
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
    });
});
