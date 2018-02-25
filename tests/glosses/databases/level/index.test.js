const {
    is,
    error,
    database: { level: { DB, Batch, backend: { LevelDB } } }
} = adone;
const delayed = require("delayed").delayed;

let dbidx = 0;

class Manager {
    constructor() {
        this.binaryTestDataMD5Sum = "920725ef1a3b32af40ccd0b78f4a62fd";
    }

    nextLocation() {
        return adone.std.path.join(__dirname, `_levelup_test_db_${dbidx++}`);
    }

    async openTestDatabase({ location = this.nextLocation(), keyEncoding = "utf8", valueEncoding = "utf8" } = {}) {
        await adone.fs.rm(location);
        const db = new DB({ location, keyEncoding, valueEncoding });
        await db.open();
        this.closeableDatabases.push(db);
        return db;
    }

    setUp() {
        this.closeableDatabases = [];
        this.timeout = 10000;
        return this.cleanup();
    }

    async shutdown() {
        for (const db of this.closeableDatabases) {
            await db.close();
        }
        return this.cleanup();
    }

    async cleanup() {
        const list = (await adone.fs.readdir(__dirname)).filter((f) => {
            return (/^_levelup_test_db_/).test(f);
        });
        for (const f of list) {
            await adone.fs.rm(adone.std.path.join(__dirname, f));
        }
    }

    async streamSetUp() {
        await this.setUp();
        let i;
        let k;

        this.dataSpy = spy();
        this.endSpy = spy();
        this.sourceData = [];

        for (i = 0; i < 100; i++) {
            k = (i < 10 ? "0" : "") + i;
            this.sourceData.push({
                type: "put",
                key: k,
                value: Math.random()
            });
        }

        this.verify = delayed((done, data) => {
            if (!data) {
                data = this.sourceData;
            } // can pass alternative data array for verification
            assert.equal(this.endSpy.callCount, 1, 'ReadStream emitted single "end" event');
            assert.equal(this.dataSpy.callCount, data.length, 'ReadStream emitted correct number of "data" events');
            data.forEach((d, i) => {
                const call = this.dataSpy.getCall(i);
                if (call) {
                    assert.equal(call.args.length, 1, `ReadStream "data" event #${i} fired with 1 argument`);
                    assert.notNull(call.args[0].key, `ReadStream "data" event #${i} argument has "key" property`);
                    assert.notNull(call.args[0].value, `ReadStream "data" event #${i} argument has "value" property`);
                    assert.equal(call.args[0].key, d.key, `ReadStream "data" event #${i} argument has correct "key"`);
                    assert.deepEqual(Number(call.args[0].value), Number(d.value), `ReadStream "data" event #${i} argument has correct "value"`);
                }
            });
            done();
        }, 0.05);
    }

    loadBinaryTestData() {
        return adone.fs.readFile(adone.std.path.join(__dirname, "data/testdata.bin"));
    }

    checkBinaryTestData(testData) {
        const md5sum = adone.std.crypto.createHash("md5");
        md5sum.update(testData);
        assert.equal(md5sum.digest("hex"), this.binaryTestDataMD5Sum);
    }

    static async shouldThrows(fn, Type, msg, fail = `${Type.name} hasn't been thrown`) {
        try {
            await fn();
        } catch (err) {
            assert.instanceOf(err, Type);
            if (adone.is.string(msg)) {
                assert.equal(err.message, msg);
            }
            return;
        }
        assert.fail(fail);
    }

    static async open(options) {
        const db = new DB(options);
        assert.false(db.isOpen());
        assert.false(db.isClosed());
        await db.open();
        return db;
    }
}


describe("database", "level", () => {
    describe("Initialization", () => {
        let manager;
        beforeEach(() => {
            manager = new Manager();
            return manager.setUp();
        });

        afterEach(() => {
            return manager.shutdown();
        });

        it("new DB()", () => {
            assert.throws(() => new DB(), error.DatabaseInitialization);
        });

        for (let encMode = 0; encMode <= 1; encMode++) {
            // eslint-disable-next-line
            it(`default options${encMode ? " - encryption mode" : ""}`, async () => {
                const location = manager.nextLocation();
                const options = {
                    location
                };

                if (encMode === 1) {
                    options.encryption = {
                        password: "test"
                    };
                }

                let db = await Manager.open(options);
                assert.true(db.isOpen());
                await db.close();
                assert.false(db.isOpen());

                db = await Manager.open(options);
                if (encMode) {
                    assert.equal(db.options.keyEncoding, "binary");
                    assert.equal(db.options.valueEncoding, "binary");
                } else {
                    assert.equal(db.options.keyEncoding, "utf8");
                    assert.equal(db.options.valueEncoding, "utf8");
                }
                assert.equal(db.location, location);

                if (encMode) {
                    assert.equal(db.options.encryption.saltBytes, 32);
                    assert.undefined(db.options.encryption.salt);
                    assert.equal(db.options.encryption.digest, "sha256");
                    assert.equal(db.options.encryption.keyBytes, 32);
                    assert.equal(db.options.encryption.iterations, 64000);
                    assert.equal(db.options.encryption.algorithm, "aes-256-cbc");
                    assert.equal(db.options.encryption.ivBytes, 16);
                    assert.undefined(db.options.encryption.key);
                }
                await db.close();
            });
        }

        it("default encryption options when suplying 'key' value", async () => {
            const key = Buffer.from("test");
            const db = await Manager.open({
                location: manager.nextLocation(),
                encryption: {
                    key
                }
            });
            assert.undefined(db.options.encryption.saltBytes);
            assert.undefined(db.options.encryption.salt);
            assert.undefined(db.options.encryption.digest);
            assert.undefined(db.options.encryption.keyBytes);
            assert.undefined(db.options.encryption.iterations, 64000);
            assert.equal(db.options.encryption.algorithm, "aes-256-cbc");
            assert.equal(db.options.encryption.ivBytes, 16);
            assert.deepEqual(db.options.encryption.key, key);
            await db.close();
        });

        it("read-only properties", async () => {
            const location = manager.nextLocation();
            const db = await Manager.open({ location });

            try {
                db.location = "foo";
            } catch (err) { /*ignore*/ }
            assert.equal(db.location, location);
            await db.close();
        });

        it("basic options", async () => {
            const location = manager.nextLocation();
            const db = await Manager.open({ location, valueEncoding: "binary" });
            assert.equal(db.options.keyEncoding, "utf8");
            assert.equal(db.options.valueEncoding, "binary");
            assert.equal(db.location, location);
            await db.close();
        });

        it("options with encoding", async () => {
            const location = manager.nextLocation();
            const db = await Manager.open({ location, keyEncoding: "ascii", valueEncoding: "json" });
            assert.equal(db.options.keyEncoding, "ascii");
            assert.equal(db.options.valueEncoding, "json");
            assert.equal(db.location, location);
            await db.close();
        });

        it("encryption without password", async () => {
            try {
                await Manager.open({ location: manager.nextLocation(), encryption: {} });
            } catch (err) {
                assert.instanceOf(err, error.NotValid);
                return;
            }
            assert.fail("NotValid exeption hasn't been thrown");
        });
    });

    describe("get() / put() / del()", () => {
        let manager;
        beforeEach(() => {
            manager = new Manager();
            return manager.setUp();
        });

        afterEach(() => {
            return manager.shutdown();
        });

        it("not valid batch list", async () => {
            const db = await manager.openTestDatabase();
            await Manager.shouldThrows(() => db.batch(null, {}), error.DatabaseWrite, "batch() requires an array argument", "no-arg batch() throws");
            await Manager.shouldThrows(() => db.batch({}), error.DatabaseWrite, "batch() requires an array argument", "1-arg, no Array batch() throws");
        });

        it("get() on empty database causes error", async () => {
            const db = await manager.openTestDatabase();
            await Manager.shouldThrows(() => db.get("undefkey"), error.NotFound);
        });

        it("put() and get() simple string key/value pairs", async () => {
            const db = await manager.openTestDatabase();
            await db.put("some key", "some value stored in the database");
            const value = await db.get("some key");
            assert.equal(value, "some value stored in the database");
        });

        it("put() and get() multiple values", async () => {
            const location = manager.nextLocation();
            const db = await Manager.open({ location });
            assert.equal(db.location, location);

            await db.put("k1", "v1");
            await db.put("k2", "v2");
            await db.put("k3", "v3");

            for (const k of [1, 2, 3]) {
                const v = await db.get(`k${k}`);
                assert.equal(v, `v${k}`);
            }
            await Manager.shouldThrows(() => db.get("k4"), error.NotFound);
            await db.close();
        });

        it("del() on empty database doesn't cause error", async () => {
            const db = await manager.openTestDatabase();
            await db.del("undefkey");
        });

        it("del() works on real entries", async () => {
            const db = await manager.openTestDatabase();
            for (const key of ["foo", "bar", "baz"]) {
                await db.put(key, 1 + Math.random());
            }

            await db.del("bar");
            for (const key of ["foo", "bar", "baz"]) {
                if (key === "bar") {
                    await Manager.shouldThrows(() => db.get(key), error.NotFound);
                } else {
                    await db.get(key);
                }
            }
        });
    });

    describe("null & undefined keys & values", () => {
        let manager;
        beforeEach(() => {
            manager = new Manager();
            return manager.setUp();
        });

        afterEach(() => {
            return manager.shutdown();
        });

        describe("null and undefined", () => {
            let _db;
            beforeEach(async () => {
                const db = await Manager.open({ location: manager.nextLocation() });
                manager.closeableDatabases.push(db);
                assert.true(db.isOpen());
                _db = db;
            });

            it("get() with null key causes error", async () => {
                await Manager.shouldThrows(() => _db.get(null), error.Database);
            });

            it("get() with undefined key causes error", async () => {
                await Manager.shouldThrows(() => _db.get(undefined), error.Database);
            });

            it("del() with null key causes error", async () => {
                await Manager.shouldThrows(() => _db.del(null), error.Database);
            });

            it("del() with undefined key causes error", async () => {
                await Manager.shouldThrows(() => _db.del(undefined), error.Database);
            });

            it("put() with null key causes error", async () => {
                await Manager.shouldThrows(() => _db.put(null, "foo"), error.Database);
            });

            it("put() with undefined key causes error", async () => {
                await Manager.shouldThrows(() => _db.put(undefined, "foo"), error.Database);
            });

            it("put() with null value works", async () => {
                await _db.put("foo", null);
            });

            it("put() with undefined value works", async () => {
                await _db.put("foo", undefined);
            });

            it("batch() with undefined value works", async () => {
                await _db.batch([{ key: "foo", value: undefined, type: "put" }]);
            });

            it("batch() with null value works", async () => {
                await _db.batch([{ key: "foo", value: null, type: "put" }]);
            });

            it("batch() with undefined key causes error", async () => {
                await Manager.shouldThrows(() => _db.batch([{ key: undefined, value: "bar", type: "put" }]), error.Database);
            });

            it("batch() with null key causes error", async () => {
                await Manager.shouldThrows(() => _db.batch([{ key: null, value: "bar", type: "put" }]), error.Database);
            });
        });
    });

    describe("Encoding", () => {
        let manager;
        beforeEach(() => {
            manager = new Manager();
            return manager.streamSetUp();
        });

        afterEach(() => {
            return manager.shutdown();
        });

        it("simple ReadStream", async (done) => {
            let db = await manager.openTestDatabase();
            const location = db.location;
            await db.batch(manager.sourceData.slice());
            await db.close();

            db = await Manager.open({ location });
            const rs = db.createReadStream();
            rs.on("data", manager.dataSpy);
            rs.on("end", () => {
                manager.endSpy();
                manager.verify(rs, () => db.close().then(done));
            });
        });

        it("test safe decode in get()", async () => {
            let db = await manager.openTestDatabase({ valueEncoding: "utf8" });
            await db.put("foo", "this {} is [] not : json");
            await db.close();
            db = await Manager.open({ location: db.location, valueEncoding: "json" });
            await Manager.shouldThrows(() => db.get("foo"), error.Encoding);
            await db.close();
        });

        it("test safe decode in readStream()", async (done) => {
            let db = await manager.openTestDatabase({ valueEncoding: "utf8" });
            await db.put("foo", "this {} is [] not : json");
            await db.close();
            const dataSpy = spy();
            const errorSpy = spy();

            db = await Manager.open({ location: db.location, valueEncoding: "json" });
            db.createReadStream()
                .on("data", dataSpy)
                .on("error", errorSpy)
                .on("end", () => {
                    assert.equal(dataSpy.callCount, 0, "no data");
                    assert.equal(errorSpy.callCount, 1, "error emitted");

                    assert.equal("Encoding", errorSpy.getCall(0).args[0].name);
                    db.close().then(done);
                });
        });

        it("test encoding = valueEncoding", async () => {
            // write a value as JSON, read as utf8 and check
            // the fact that we can get with keyEncoding of utf8 should demonstrate that
            // the key is not encoded as JSON
            const db = await manager.openTestDatabase({ valueEncoding: "json" });
            await db.put("foo:foo", { bar: "bar" });
            const value = await db.get("foo:foo", { keyEncoding: "utf8", valueEncoding: "utf8" });
            assert.equal(value, '{"bar":"bar"}');
        });

        it("test batch op encoding", async () => {
            const db = await manager.openTestDatabase({ valueEncoding: "json" });
            await db.batch([
                {
                    type: "put",
                    key: Buffer.from([1, 2, 3]),
                    value: Buffer.from([4, 5, 6]),
                    keyEncoding: "binary",
                    valueEncoding: "binary"
                },
                {
                    type: "put",
                    key: "string",
                    value: "string"
                }
            ], { keyEncoding: "utf8", valueEncoding: "utf8" });
            let val = await db.get(Buffer.from([1, 2, 3]), {
                keyEncoding: "binary",
                valueEncoding: "binary"
            });
            assert.equal(val.toString(), "\u0004\u0005\u0006");

            val = await db.get("string", { valueEncoding: "utf8" });
            assert.equal(val, "string");
        });
    });

    describe("Binary API", () => {
        let testData;
        let manager;

        beforeEach(async () => {
            manager = new Manager();
            await manager.setUp();
            testData = await manager.loadBinaryTestData();
        });

        afterEach(() => {
            return manager.shutdown();
        });

        it("sanity check on test data", () => {
            assert.ok(is.buffer(testData));
            manager.checkBinaryTestData(testData);
        });

        it("test put() and get() with binary value {valueEncoding:binary}", async () => {
            const db = await manager.openTestDatabase();
            await db.put("binarydata", testData, { valueEncoding: "binary" });
            const value = await db.get("binarydata", { valueEncoding: "binary" });
            assert(value);
            manager.checkBinaryTestData(value);
        });

        it("test put() and get() with binary value {valueEncoding:binary} on createDatabase()", async () => {
            const db = await manager.openTestDatabase({ valueEncoding: "binary" });
            await db.put("binarydata", testData);
            const value = await db.get("binarydata");
            assert(value);
            manager.checkBinaryTestData(value);
        });

        it("test put() and get() with binary key {valueEncoding:binary}", async () => {
            const db = await manager.openTestDatabase();
            await db.put(testData, "binarydata", { valueEncoding: "binary" });
            const value = await db.get(testData, { valueEncoding: "binary" });
            assert(value instanceof Buffer, "value is buffer");
            assert.equal(value.toString(), "binarydata");
        });

        it("test put() and get() with binary value {keyEncoding:utf8,valueEncoding:binary}", async () => {
            const db = await manager.openTestDatabase();
            await db.put("binarydata", testData, { keyEncoding: "utf8", valueEncoding: "binary" });
            const value = await db.get("binarydata", { keyEncoding: "utf8", valueEncoding: "binary" });
            assert(value);
            manager.checkBinaryTestData(value);
        });

        it("test put() and get() with binary value {keyEncoding:utf8,valueEncoding:binary} on createDatabase()", async () => {
            const db = await manager.openTestDatabase({ valueEncoding: "binary" });
            await db.put("binarydata", testData);
            const value = await db.get("binarydata");
            assert(value);
            manager.checkBinaryTestData(value);
        });

        it("test put() and get() with binary key {keyEncoding:binary,valueEncoding:utf8}", async () => {
            const db = await manager.openTestDatabase();
            await db.put(testData, "binarydata", { keyEncoding: "binary", valueEncoding: "utf8" });
            const value = await db.get(testData, { keyEncoding: "binary", valueEncoding: "utf8" });
            assert.equal(value, "binarydata");
        });

        it("test put() and get() with binary key & value {valueEncoding:binary}", async () => {
            const db = await manager.openTestDatabase();
            await db.put(testData, testData, { valueEncoding: "binary" });
            const value = await db.get(testData, { valueEncoding: "binary" });
            manager.checkBinaryTestData(value);
        });

        it("test put() and del() and get() with binary key {valueEncoding:binary}", async () => {
            const db = await manager.openTestDatabase();
            await db.put(testData, "binarydata", { valueEncoding: "binary" });
            await db.del(testData, { valueEncoding: "binary" });
            Manager.shouldThrows(() => db.get(testData, { valueEncoding: "binary" }), error.NotFound);
        });

        it("batch() with multiple puts", async () => {
            const db = await manager.openTestDatabase();
            await db.batch([
                { type: "put", key: "foo", value: testData },
                { type: "put", key: "bar", value: testData },
                { type: "put", key: "baz", value: "abazvalue" }
            ], { keyEncoding: "utf8", valueEncoding: "binary" });

            for (const key of ["foo", "bar", "baz"]) {
                const value = await db.get(key, { valueEncoding: "binary" });
                if (key === "baz") {
                    assert(value instanceof Buffer, "value is buffer");
                    assert.equal(value.toString(), `a${key}value`);
                } else {
                    manager.checkBinaryTestData(value);
                }
            }
        });
    });

    describe("batch()", () => {
        let manager;
        beforeEach(() => {
            manager = new Manager();
            return manager.setUp();
        });

        afterEach(() => {
            return manager.shutdown();
        });

        it("batch() with multiple puts", async () => {
            const location = manager.nextLocation();
            const db = await Manager.open({ location });
            assert.equal(db.location, location);

            await db.batch([
                { type: "put", key: "foo", value: "afoovalue" },
                { type: "put", key: "bar", value: "abarvalue" },
                { type: "put", key: "baz", value: "abazvalue" }
            ]);
            for (const key of ["foo", "bar", "baz"]) {
                const value = await db.get(key);
                assert.equal(value, `a${key}value`);
            }

            await Manager.shouldThrows(() => db.get("k4"), error.NotFound);
            await db.close();
        });

        it("batch() no type set defaults to put", async () => {
            const db = await manager.openTestDatabase();
            await db.batch([
                { key: "foo", value: "afoovalue" },
                { key: "bar", value: "abarvalue" },
                { key: "baz", value: "abazvalue" }
            ]);

            for (const key of ["foo", "bar", "baz"]) {
                const value = await db.get(key);
                assert.equal(value, `a${key}value`);
            }
        });

        it("batch() with multiple puts and deletes", async () => {
            const db = await manager.openTestDatabase();
            await db.batch([
                { type: "put", key: "1", value: "one" },
                { type: "put", key: "2", value: "two" },
                { type: "put", key: "3", value: "three" }
            ]);
            await db.batch([
                { type: "put", key: "foo", value: "afoovalue" },
                { type: "del", key: "1" },
                { type: "put", key: "bar", value: "abarvalue" },
                { type: "del", key: "foo" },
                { type: "put", key: "baz", value: "abazvalue" }
            ]);

            // these should exist
            for (const key of ["2", "3", "bar", "baz"]) {
                const value = await db.get(key);
                assert.notNull(value);
            }

            // these shouldn't exist
            for (const key of ["1", "foo"]) {
                Manager.shouldThrows(() => db.get(key), error.NotFound);
            }
        });

        it.todo("batch() with chained interface", async () => {
            const db = await manager.openTestDatabase();
            await db.put("1", "one");
            const batch = new Batch(db);
            await batch.put("one", "1")
                .del("two")
                .put("three", "3")
                .clear()
                .del("1")
                .put("2", "two")
                .put("3", "three")
                .del("3")
                .write();
            for (const key of ["one", "three", "1", "2", "3"]) {
                let thrown = false;
                try {
                    const value = await db.get(key);
                } catch (err) {
                    thrown = true;
                }

                if (["one", "three", "1", "3"].indexOf(key) > -1 && !thrown) {
                    assert.fail("Should throws NotFound");
                } else if (key === "2" && thrown) {
                    assert.fail("Should not throw NotFound");
                }
            }

            await Manager.shouldThrows(() => db.get("k4"), error.NotFound);
        });

        it.todo("batch() exposes ops queue length", async () => {
            const db = await manager.openTestDatabase();
            const batch = new Batch(db);
            batch.put("one", "1")
                .del("two")
                .put("three", "3");
            assert.equal(batch.length, 3);
            batch.clear();
            assert.equal(batch.length, 0);
            batch
                .del("1")
                .put("2", "two")
                .put("3", "three")
                .del("3");
            assert.equal(batch.length, 4);
        });

        it("batch() with can manipulate data from put()", async () => {
            // checks encoding and whatnot
            const db = await manager.openTestDatabase();
            await db.put("1", "one");
            await db.put("2", "two");
            await db.put("3", "three");
            await db.batch([
                { type: "put", key: "foo", value: "afoovalue" },
                { type: "del", key: "1" },
                { type: "put", key: "bar", value: "abarvalue" },
                { type: "del", key: "foo" },
                { type: "put", key: "baz", value: "abazvalue" }
            ]);

            // these should exist
            for (const key of ["2", "3", "bar", "baz"]) {
                const value = await db.get(key);
                assert.notNull(value);
            }
            // these shouldn't exist
            for (const key of ["1", "foo"]) {
                Manager.shouldThrows(() => db.get(key), error.NotFound);
            }
        });

        it("batch() data can be read with get() and del()", async () => {
            const db = await manager.openTestDatabase();
            await db.batch([
                { type: "put", key: "1", value: "one" },
                { type: "put", key: "2", value: "two" },
                { type: "put", key: "3", value: "three" }
            ]);
            await db.del("1");
            // these should exist
            for (const key of ["2", "3"]) {
                const value = await db.get(key);
                assert.notNull(value);
            }
            // this shouldn't exist
            await Manager.shouldThrows(() => db.get("1"), error.NotFound);
        });

        describe.todo("chained batch() arguments", () => {
            let _db;
            let _batch;
            beforeEach(async () => {
                _db = await manager.openTestDatabase();
                _batch = new Batch(_db);
            });

            it("test batch#put() with missing `value`", () => {
                // value = undefined
                _batch.put("foo1");
                _batch.put("foo1", null);
            });

            it("test batch#put() with missing `key`", () => {
                // key = undefined
                assert.throws(() => _batch.put(undefined, "foo1"), error.DatabaseWrite, "key cannot be `null` or `undefined`");

                // key = null
                assert.throws(() => _batch.put(null, "foo1"), error.DatabaseWrite, "key cannot be `null` or `undefined`");
            });

            it("test batch#put() with missing `key` and `value`", () => {
                // undefined
                assert.throws(() => _batch.put(), error.DatabaseWrite, "key cannot be `null` or `undefined`");

                // null
                assert.throws(() => _batch.put(null, null), error.DatabaseWrite, "key cannot be `null` or `undefined`");
            });

            it("test batch#del() with missing `key`", () => {
                // key = undefined
                assert.throws(() => _batch.del(undefined, "foo1"), error.DatabaseWrite, "key cannot be `null` or `undefined`");

                // key = null
                assert.throws(() => _batch.del(null, "foo1"), error.DatabaseWrite, "key cannot be `null` or `undefined`");
            });

            describe("test batch operations after write()", () => {
                beforeEach(async () => {
                    await _batch.put("foo", "bar").put("boom", "bang").del("foo").write();
                    manager.verify = (cb) => Manager.shouldThrows(cb, error.DatabaseWrite, "write() already called on this batch");
                });

                it("test put()", () => {
                    manager.verify(() => _batch.put("whoa", "dude"));
                });

                it("test del()", () => {
                    manager.verify(() => _batch.del("foo"));
                });

                it("test clear()", () => {
                    manager.verify(() => _batch.clear());
                });

                it("test write()", () => {
                    manager.verify(() => _batch.write());
                });
            });
        });
    });

    describe("Destroy & Repair", () => {
        it("destroy() passes on arguments", () => {
            const ldmock = mock(LevelDB);
            const args = ["location", function () { }];
            const expect = ldmock
                .expects("destroy")
                .once()
                .withExactArgs(args[0], args[1]);

            LevelDB.destroy(...args);
            ldmock.verify();
        });

        it("repair() passes on arguments", () => {
            const ldmock = mock(LevelDB);
            const args = ["location", function () { }];
            const expect = ldmock
                .expects("repair")
                .once()
                .withExactArgs(args[0], args[1]);

            LevelDB.repair(...args);
            ldmock.verify();
        });

        it("destroy() substitutes missing callback argument", () => {
            const ldmock = mock(LevelDB);
            const args = ["location"];
            const expect = ldmock
                .expects("destroy")
                .once()
                .withArgs(args[0]);

            LevelDB.destroy(...args);
            ldmock.verify();
            assert.equal(1, expect.getCall(0).args.length);
        });

        it("repair() substitutes missing callback argument", () => {
            const ldmock = mock(LevelDB);
            const args = ["location"];
            const expect = ldmock
                .expects("repair")
                .once()
                .withArgs(args[0]);

            LevelDB.repair(...args);
            ldmock.verify();
            assert.equal(1, expect.getCall(0).args.length);
        });
    });

    describe("JSON API", () => {
        let manager;
        let runTest;
        beforeEach(async () => {
            manager = new Manager();
            await manager.setUp();
            runTest = async (testData, assertType) => {
                const location = manager.nextLocation();
                const db = await Manager.open({ location, valueEncoding: { encode: JSON.stringify, decode: JSON.parse } });
                manager.closeableDatabases.push(db);
                const promises = testData.map((d) => db.put(d.key, d.value));
                await Promise.all(promises);
                for (const d of testData) {
                    const value = await db.get(d.key);
                    assert[assertType](d.value, value);
                }
            };
        });

        afterEach(() => {
            return manager.shutdown();
        });

        it('simple-object values in "json" encoding', () => {
            return runTest([
                { key: "0", value: 0 },
                { key: "1", value: 1 },
                { key: "string", value: "a string" },
                { key: "true", value: true },
                { key: "false", value: false }
            ], "equal");
        });

        it('simple-object keys in "json" encoding', () => {
            return runTest([
                { value: "0", key: 0 },
                { value: "1", key: 1 },
                { value: "string", key: "a string" },
                { value: "true", key: true },
                { value: "false", key: false }
            ], "equal");
        });

        it('complex-object values in "json" encoding', () => {
            return runTest([
                {
                    key: "0", value: {
                        foo: "bar",
                        bar: [1, 2, 3],
                        bang: { yes: true, no: false }
                    }
                }
            ], "deepEqual");
        });

        it('complex-object keys in "json" encoding', () => {
            return runTest([
                {
                    value: "0", key: {
                        foo: "bar",
                        bar: [1, 2, 3],
                        bang: { yes: true, no: false }
                    }
                }
            ], "equal");
        });
    });

    describe("Key and Value Streams", () => {
        let manager;
        let dataSpy;
        let endSpy;
        let sourceData;
        let sourceKeys;
        let sourceValues;
        let verify;

        beforeEach(async () => {
            manager = new Manager();
            await manager.setUp();
            dataSpy = spy();
            endSpy = spy();
            sourceData = [];

            for (let i = 0; i < 100; i++) {
                const k = (i < 10 ? "0" : "") + i;
                sourceData.push({
                    type: "put",
                    key: k,
                    value: Math.random()
                });
            }

            sourceKeys = Object.keys(sourceData).map((k) => {
                return sourceData[k].key;
            });
            sourceValues = Object.keys(sourceData).map((k) => {
                return sourceData[k].value;
            });

            verify = delayed((data, done) => {
                assert.equal(endSpy.callCount, 1, 'Stream emitted single "end" event');
                assert.equal(dataSpy.callCount, data.length, 'Stream emitted correct number of "data" events');
                data.forEach((d, i) => {
                    const call = dataSpy.getCall(i);
                    if (call) {
                        //console.log('call', i, ':', call.args[0].key, '=', call.args[0].value, '(expected', d.key, '=', d.value, ')')
                        assert.equal(call.args.length, 1, `Stream "data" event #${i} fired with 1 argument`);
                        assert.equal(Number(call.args[0].toString()), Number(d), `Stream correct "data" event #${i}: ${d}`);
                    }
                });
                done();
            }, 0.05);
        });

        afterEach(() => {
            return manager.shutdown();
        });

        it("test .keyStream()", async (done) => {
            const db = await manager.openTestDatabase();
            await db.batch(sourceData.slice());
            const rs = db.createKeyStream();
            rs.on("data", dataSpy);
            rs.on("end", () => {
                endSpy();
                verify(rs, sourceKeys, done);
            });
        });

        it("test .readStream({keys:true,values:false})", async (done) => {
            const db = await manager.openTestDatabase();
            await db.batch(sourceData.slice());
            const rs = db.createReadStream({ keys: true, values: false });
            rs.on("data", dataSpy);
            rs.on("end", () => {
                endSpy();
                verify(rs, sourceKeys, done);
            });
        });

        it("test .valueStream()", async (done) => {
            const db = await manager.openTestDatabase();
            await db.batch(sourceData.slice());
            const rs = db.createValueStream();
            rs.on("data", dataSpy);
            rs.on("end", () => {
                endSpy();
                verify(rs, sourceValues, done);
            });
        });

        it("test .readStream({keys:false,values:true})", async (done) => {
            const db = await manager.openTestDatabase();
            await db.batch(sourceData.slice());
            const rs = db.createReadStream({ keys: false, values: true });
            rs.on("data", dataSpy);
            rs.on("end", () => {
                endSpy();
                verify(rs, sourceValues, done);
            });
        });
    });

    describe.skip("JSON API", () => {
        let manager;
        let runTest;

        beforeEach((done) => {
            manager = new Manager();
            manager.setUp(() => {
                runTest = function (testData, assertType, done) {
                    const location = manager.nextLocation();
                    levelup(location, {
                        valueEncoding: {
                            encode: msgpack.encode,
                            decode: msgpack.decode,
                            buffer: true,
                            type: "msgpack"
                        }
                    }, (err, db) => {
                        assert(!err);
                        if (err) {
                            return;
                        }

                        manager.closeableDatabases.push(db);

                        async.parallel(testData.map((d) => {
                            return db.put.bind(db, d.key, d.value);
                        }), (err) => {
                            assert(!err);

                            async.forEach(testData, (d, callback) => {
                                db.get(d.key, (err, value) => {
                                    if (err) {
                                        console.error(err.stack);
                                    }
                                    assert(!err);
                                    assert[assertType](d.value, value);
                                    callback();
                                });
                            }, done);
                        });
                    });
                };
                done();
            });
        });

        afterEach((done) => {
            manager.shutdown(done);
        });

        it('simple-object values in "json" encoding', (done) => {
            runTest([
                { key: "0", value: 0 },
                { key: "1", value: 1 },
                { key: "string", value: "a string" },
                { key: "true", value: true },
                { key: "false", value: false }
            ], "equal", done);
        });

        it('simple-object keys in "json" encoding', (done) => {
            runTest([
                { value: "0", key: 0 },
                { value: "1", key: 1 },
                { value: "string", key: "a string" },
                { value: "true", key: true },
                { value: "false", key: false }
            ], "equal", done);
        });

        it('complex-object values in "json" encoding', (done) => {
            runTest([
                {
                    key: "0", value: {
                        foo: "bar",
                        bar: [1, 2, 3],
                        bang: { yes: true, no: false }
                    }
                }
            ], "deepEqual", done);
        });

        it('complex-object keys in "json" encoding', (done) => {
            runTest([
                {
                    value: "0", key: {
                        foo: "bar",
                        bar: [1, 2, 3],
                        bang: { yes: true, no: false }
                    }
                }
            ], "equal", done);
        });
    });

    // import Manager from "./common";
    // const SlowStream = require("slow-stream");
    // const delayed = require("delayed");
    // const rimraf = require("rimraf");
    // const async = require("async");
    // const msgpack = require("msgpack-js");
    // const bigBlob = Array.apply(null, Array(1024 * 100)).map(() => {
    //     return "aaaaaaaaaa";
    // }).join("");


    // describe("ReadStream", () => {
    //     let manager;
    //     beforeEach(() => {
    //         manager = new Manager();
    //         return manager.streamSetUp();
    //     });

    //     afterEach(() => {
    //         return manager.shutdown();
    //     });

    //     it("test simple ReadStream", (done) => {
    //         manager.openTestDatabase((db) => {
    //             // execute
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream();
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));
    //             });
    //         });
    //     });

    //     it("test pausing", (done) => {
    //         let calls = 0;
    //         let rs;
    //         const pauseVerify = function () {
    //             assert.equal(calls, 5, "stream should still be paused");
    //             rs.resume();
    //             pauseVerify.called = true;
    //         };
    //         const onData = function () {
    //             if (++calls === 5) {
    //                 rs.pause();
    //                 setTimeout(pauseVerify, 50);
    //             }
    //         };
    //         const verify = function () {
    //             assert.equal(calls, manager.sourceData.length, "onData was used in test");
    //             assert(pauseVerify.called, "pauseVerify was used in test");
    //             manager.verify(rs, done);
    //         };

    //         manager.dataSpy = spy(onData); // so we can still verify

    //         manager.openTestDatabase((db) => {
    //             // execute
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 rs = db.createReadStream();
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("end", verify);
    //             });
    //         });
    //     });

    //     it("test destroy() immediately", (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream();
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", () => {
    //                     assert.equal(manager.dataSpy.callCount, 0, '"data" event was not fired');
    //                     assert.equal(manager.endSpy.callCount, 0, '"end" event was not fired');
    //                     done();
    //                 });
    //                 rs.destroy();
    //             });
    //         });
    //     });

    //     it("test destroy() after close", (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream();
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", () => {
    //                     rs.destroy();
    //                     done();
    //                 });
    //             });
    //         });
    //     });

    //     it("test destroy() after closing db", (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);
    //                 db.close((err) => {
    //                     const rs = db.createReadStream();
    //                     rs.destroy();
    //                     done();
    //                 });
    //             });
    //         });
    //     });

    //     it("test destroy() twice", (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream();
    //                 rs.on("data", () => {
    //                     rs.destroy();
    //                     rs.destroy();
    //                     done();
    //                 });
    //             });
    //         });
    //     });

    //     it("test destroy() half way through", (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream();
    //                 const endSpy = spy();
    //                 let calls = 0;
    //                 manager.dataSpy = spy(() => {
    //                     if (++calls === 5) {
    //                         rs.destroy();
    //                     }
    //                 });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", endSpy);
    //                 rs.on("close", () => {
    //                     //  assert.equal(this.readySpy.callCount, 1, 'ReadStream emitted single "ready" event')
    //                     // should do "data" 5 times ONLY
    //                     assert.equal(manager.dataSpy.callCount, 5, 'ReadStream emitted correct number of "data" events (5)');
    //                     manager.sourceData.slice(0, 5).forEach((d, i) => {
    //                         const call = manager.dataSpy.getCall(i);
    //                         assert(call);
    //                         if (call) {
    //                             assert.equal(call.args.length, 1, `ReadStream "data" event #${i} fired with 1 argument`);
    //                             assert.notNull(call.args[0].key, `ReadStream "data" event #${i} argument has "key" property`);
    //                             assert.notNull(call.args[0].value, `ReadStream "data" event #${i} argument has "value" property`);
    //                             assert.equal(call.args[0].key, d.key, `ReadStream "data" event #${i} argument has correct "key"`);
    //                             assert.equal(Number(call.args[0].value), Number(d.value), `ReadStream "data" event #${i} argument has correct "value"`);
    //                         }
    //                     });
    //                     done();
    //                 });
    //             });
    //         });
    //     });

    //     it('test readStream() with "reverse=true"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             // execute
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ reverse: true });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 manager.sourceData.reverse(); // for verify
    //             });
    //         });
    //     });

    //     it('test readStream() with "start"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ start: "50" });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 // slice off the first 50 so verify() expects only the last 50 even though all 100 are in the db
    //                 manager.sourceData = manager.sourceData.slice(50);
    //             });
    //         });
    //     });

    //     it('test readStream() with "start" and "reverse=true"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ start: "50", reverse: true });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 // reverse and slice off the first 50 so verify() expects only the first 50 even though all 100 are in the db
    //                 manager.sourceData.reverse();
    //                 manager.sourceData = manager.sourceData.slice(49);
    //             });
    //         });
    //     });

    //     it('test readStream() with "start" being mid-way key (float)', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 // '49.5' doesn't actually exist but we expect it to start at '50' because '49' < '49.5' < '50' (in string terms as well as numeric)
    //                 const rs = db.createReadStream({ start: "49.5" });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 // slice off the first 50 so verify() expects only the last 50 even though all 100 are in the db
    //                 manager.sourceData = manager.sourceData.slice(50);
    //             });
    //         });
    //     });

    //     it('test readStream() with "start" being mid-way key (float) and "reverse=true"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ start: "49.5", reverse: true });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 // reverse & slice off the first 50 so verify() expects only the first 50 even though all 100 are in the db
    //                 manager.sourceData.reverse();
    //                 manager.sourceData = manager.sourceData.slice(50);
    //             });
    //         });
    //     });

    //     it('test readStream() with "start" being mid-way key (string)', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 // '499999' doesn't actually exist but we expect it to start at '50' because '49' < '499999' < '50' (in string terms)
    //                 // the same as the previous test but we're relying solely on string ordering
    //                 const rs = db.createReadStream({ start: "499999" });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 // slice off the first 50 so verify() expects only the last 50 even though all 100 are in the db
    //                 manager.sourceData = manager.sourceData.slice(50);
    //             });
    //         });
    //     });

    //     it('test readStream() with "end"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ end: "50" });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 // slice off the last 49 so verify() expects only 0 -> 50 inclusive, even though all 100 are in the db
    //                 manager.sourceData = manager.sourceData.slice(0, 51);
    //             });
    //         });
    //     });

    //     it('test readStream() with "end" being mid-way key (float)', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ end: "50.5" });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 // slice off the last 49 so verify() expects only 0 -> 50 inclusive, even though all 100 are in the db
    //                 manager.sourceData = manager.sourceData.slice(0, 51);
    //             });
    //         });
    //     });

    //     it('test readStream() with "end" being mid-way key (string)', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ end: "50555555" });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 // slice off the last 49 so verify() expects only 0 -> 50 inclusive, even though all 100 are in the db
    //                 manager.sourceData = manager.sourceData.slice(0, 51);
    //             });
    //         });
    //     });

    //     it('test readStream() with "end" being mid-way key (float) and "reverse=true"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ end: "50.5", reverse: true });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 manager.sourceData.reverse();
    //                 manager.sourceData = manager.sourceData.slice(0, 49);
    //             });
    //         });
    //     });

    //     it('test readStream() with both "start" and "end"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ start: 30, end: 70 });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 // should include 30 to 70, inclusive
    //                 manager.sourceData = manager.sourceData.slice(30, 71);
    //             });
    //         });
    //     });

    //     it('test readStream() with both "start" and "end" and "reverse=true"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ start: 70, end: 30, reverse: true });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 // expect 70 -> 30 inclusive
    //                 manager.sourceData.reverse();
    //                 manager.sourceData = manager.sourceData.slice(29, 70);
    //             });
    //         });
    //     });

    //     it("test hex encoding", (done) => {
    //         const options = { createIfMissing: true, errorIfExists: true, keyEncoding: "utf8", valueEncoding: "hex" };
    //         const data = [
    //             { type: "put", key: "ab", value: "abcdef0123456789" }
    //         ];

    //         manager.openTestDatabase({}, (db) => {
    //             db.batch(data.slice(), options, (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream(options);
    //                 rs.on("data", (data) => {
    //                     assert.equal(data.value, "abcdef0123456789");
    //                 });
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", done);

    //             });
    //         });
    //     });

    //     it("test json encoding", (done) => {
    //         const options = { createIfMissing: true, errorIfExists: true, keyEncoding: "utf8", valueEncoding: "json" };
    //         const data = [
    //             { type: "put", key: "aa", value: { a: "complex", obj: 100 } },
    //             { type: "put", key: "ab", value: { b: "foo", bar: [1, 2, 3] } },
    //             { type: "put", key: "ac", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
    //             { type: "put", key: "ba", value: { a: "complex", obj: 100 } },
    //             { type: "put", key: "bb", value: { b: "foo", bar: [1, 2, 3] } },
    //             { type: "put", key: "bc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
    //             { type: "put", key: "ca", value: { a: "complex", obj: 100 } },
    //             { type: "put", key: "cb", value: { b: "foo", bar: [1, 2, 3] } },
    //             { type: "put", key: "cc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } }
    //         ];

    //         manager.openTestDatabase(options, (db) => {
    //             db.batch(data.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream();
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done, data));
    //             });
    //         });
    //     });

    //     it("test injectable encoding", (done) => {
    //         const options = {
    //             createIfMissing: true, errorIfExists: true, keyEncoding: "utf8", valueEncoding: {
    //                 decode: msgpack.decode,
    //                 encode: msgpack.encode,
    //                 buffer: true
    //             }
    //         };
    //         const data = [
    //             { type: "put", key: "aa", value: { a: "complex", obj: 100 } },
    //             { type: "put", key: "ab", value: { b: "foo", bar: [1, 2, 3] } },
    //             { type: "put", key: "ac", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
    //             { type: "put", key: "ba", value: { a: "complex", obj: 100 } },
    //             { type: "put", key: "bb", value: { b: "foo", bar: [1, 2, 3] } },
    //             { type: "put", key: "bc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
    //             { type: "put", key: "ca", value: { a: "complex", obj: 100 } },
    //             { type: "put", key: "cb", value: { b: "foo", bar: [1, 2, 3] } },
    //             { type: "put", key: "cc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } }
    //         ];

    //         manager.openTestDatabase(options, (db) => {
    //             db.batch(data.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream();
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done, data));
    //             });
    //         });
    //     });

    //     it('test readStream() "reverse=true" not sticky (issue #6)', (done) => {
    //         manager.openTestDatabase((db) => {
    //             // execute
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);
    //                 // read in reverse, assume all's good
    //                 const rs = db.createReadStream({ reverse: true });
    //                 rs.on("close", () => {
    //                     // now try reading the other way
    //                     const rs = db.createReadStream();
    //                     rs.on("data", manager.dataSpy);
    //                     rs.on("end", manager.endSpy);
    //                     rs.on("close", manager.verify.bind(null, rs, done));
    //                 });
    //                 rs.resume();
    //             });
    //         });
    //     });

    //     it("test ReadStream, start=0", (done) => {
    //         manager.openTestDatabase((db) => {
    //             // execute
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ start: 0 });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));
    //             });
    //         });
    //     });

    //     // we don't expect any data to come out of here because the keys start at '00' not 0
    //     // we just want to ensure that we don't kill the process
    //     it("test ReadStream, end=0", (done) => {
    //         manager.openTestDatabase((db) => {
    //             // execute
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ end: 0 });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 manager.sourceData = [];
    //             });
    //         });
    //     });

    //     // ok, so here's the deal, this is kind of obscure: when you have 2 databases open and
    //     // have a readstream coming out from both of them with no references to the dbs left
    //     // V8 will GC one of them and you'll get an failed assert from leveldb.
    //     // This ISN'T a problem if you only have one of them open, even if the db gets GCed!
    //     // Process:
    //     //   * open
    //     //   * batch write data
    //     //   * close
    //     //   * reopen
    //     //   * create ReadStream, keeping no reference to the db
    //     //   * pipe ReadStream through SlowStream just to make sure GC happens
    //     //       - the error should occur here if the bug exists
    //     //   * when both streams finish, verify all 'data' events happened
    //     it("test ReadStream without db ref doesn't get GCed", (done) => {
    //         const dataSpy1 = spy();
    //         const dataSpy2 = spy();
    //         const location1 = manager.nextLocation();
    //         const location2 = manager.nextLocation();
    //         const sourceData = manager.sourceData;
    //         const verify = function () {
    //             // no reference to `db` here, should have been GCed by now if it could be
    //             assert(dataSpy1.callCount, sourceData.length);
    //             assert(dataSpy2.callCount, sourceData.length);
    //             async.parallel([rimraf.bind(null, location1), rimraf.bind(null, location2)], done);
    //         };
    //         const execute = function (d, callback) {
    //             // no reference to `db` here, could be GCed
    //             d.readStream
    //                 .pipe(new SlowStream({ maxWriteInterval: 5 }))
    //                 .on("data", d.spy)
    //                 .on("close", delayed.delayed(callback, 0.05));
    //         };
    //         const open = function (reopen, location, callback) {
    //             levelup(location, { createIfMissing: !reopen, errorIfExists: !reopen }, callback);
    //         };
    //         const write = function (db, callback) {
    //             db.batch(sourceData.slice(), callback);
    //         };
    //         const close = function (db, callback) {
    //             db.close(callback);
    //         };
    //         const setup = function (callback) {
    //             async.map([location1, location2], open.bind(null, false), (err, dbs) => {
    //                 assert(!err);
    //                 if (err) {
    //                     return;
    //                 }
    //                 async.map(dbs, write, (err) => {
    //                     assert(!err);
    //                     if (err) {
    //                         return;
    //                     }
    //                     async.forEach(dbs, close, callback);
    //                 });
    //             });
    //         };
    //         const reopen = function () {
    //             async.map([location1, location2], open.bind(null, true), (err, dbs) => {
    //                 assert(!err);
    //                 if (err) {
    //                     return;
    //                 }
    //                 async.forEach([
    //                     { readStream: dbs[0].createReadStream(), spy: dataSpy1 }
    //                     , { readStream: dbs[1].createReadStream(), spy: dataSpy2 }
    //                 ], execute, verify);
    //             });
    //         };

    //         setup(delayed.delayed(reopen, 0.05));
    //     });

    //     // this is just a fancy way of testing levelup('/path').createReadStream()
    //     // i.e. not waiting for 'open' to complete
    //     // the logic for this is inside the ReadStream constructor which waits for 'ready'
    //     it("test ReadStream on pre-opened db", (done) => {
    //         const execute = function (db) {
    //             // is in limbo
    //             assert(!db.isOpen());
    //             assert(!db.isClosed());

    //             const rs = db.createReadStream();
    //             rs.on("data", manager.dataSpy);
    //             rs.on("end", manager.endSpy);
    //             rs.on("close", manager.verify.bind(null, rs, done));
    //         };
    //         const setup = function (db) {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);
    //                 db.close((err) => {
    //                     assert(!err);
    //                     const db2 = levelup(db.location, { createIfMissing: false, errorIfExists: false, valueEncoding: "utf8" });
    //                     execute(db2);
    //                 });
    //             });
    //         };

    //         manager.openTestDatabase(setup);
    //     });

    //     it('test readStream() with "limit"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ limit: 20 });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 manager.sourceData = manager.sourceData.slice(0, 20);
    //             });
    //         });
    //     });

    //     it('test readStream() with "start" and "limit"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ start: "20", limit: 20 });
    //                 //rs.on('ready', this.readySpy)
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 manager.sourceData = manager.sourceData.slice(20, 40);
    //             });
    //         });
    //     });

    //     it('test readStream() with "end" after "limit"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ end: "50", limit: 20 });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 manager.sourceData = manager.sourceData.slice(0, 20);
    //             });
    //         });
    //     });

    //     it('test readStream() with "end" before "limit"', (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream({ end: "30", limit: 50 });
    //                 rs.on("data", manager.dataSpy);
    //                 rs.on("end", manager.endSpy);
    //                 rs.on("close", manager.verify.bind(null, rs, done));

    //                 manager.sourceData = manager.sourceData.slice(0, 31);
    //             });
    //         });
    //     });

    //     // can, fairly reliably, trigger a core dump if next/end isn't
    //     // protected properly
    //     // the use of large blobs means that next() takes time to return
    //     // so we should be able to slip in an end() while it's working
    //     it("test iterator next/end race condition", (done) => {
    //         const data = [];
    //         let i = 5;
    //         let v;

    //         while (i--) {
    //             v = bigBlob + i;
    //             data.push({ type: "put", key: v, value: v });
    //         }

    //         manager.openTestDatabase((db) => {
    //             db.batch(data, (err) => {
    //                 assert(!err);
    //                 const rs = db.createReadStream().on("close", done);
    //                 rs.once("data", rs.destroy.bind(rs));
    //             });
    //         });
    //     });

    //     it("test can only end once", (done) => {
    //         manager.openTestDatabase((db) => {
    //             db.batch(manager.sourceData.slice(), (err) => {
    //                 assert(!err);

    //                 const rs = db.createReadStream()
    //                     .on("close", done);

    //                 process.nextTick(() => {
    //                     rs.destroy();
    //                 });

    //             });
    //         });
    //     });
    // });
});
