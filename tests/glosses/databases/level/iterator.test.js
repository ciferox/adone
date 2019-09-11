const common = require("./common");

const {
    database: { level: { DB, backend: { Memory, Encoding } } }
} = adone;

describe("iterator", () => {
    beforeEach((done) => {
        common.commonSetUp(done);
    });


    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("test simple iterator", (done) => {
        const db = new DB(new Memory());
        db.open();
        common.closeableDatabases.push(db);

        db.put("key", "value", (err) => {
            assert.notExists(err);

            const it = db.iterator({
                keyAsBuffer: false,
                valueAsBuffer: false
            });

            it.next((err, key, value) => {
                assert.notExists(err);

                assert.equal(key, "key");
                assert.equal(value, "value");

                it.end(done);
            });
        });
    });
});

describe("iterator#seek()", () => {
    let mem;
    let db;

    beforeEach((done) => {
        mem = new Memory();
        mem.open(() => { });
        mem.batch([
            { type: "put", key: '"a"', value: "a" },
            { type: "put", key: '"b"', value: "b" }
        ], () => { });
        mem.close(done);
    });

    afterEach((done) => {
        db.close(done);
    });

    it("without encoding, without deferred-open", (done) => {
        db = new DB(mem);

        db.open((err) => {
            assert.notExists(err);

            const itr = db.iterator({ keyAsBuffer: false });

            itr.seek('"b"');
            itr.next((err, key, value) => {
                assert.notExists(err);
                assert.equal(key, '"b"');
                itr.end(done);
            });
        });
    });

    it("without encoding, with deferred-open", (done) => {
        db = new DB(mem);
        const itr = db.iterator({ keyAsBuffer: false });

        itr.seek('"b"');
        itr.next((err, key, value) => {
            assert.notExists(err);
            assert.equal(key, '"b"');
            itr.end(done);
        });
    });

    it("with encoding, with deferred-open", (done) => {
        db = new DB(new Encoding(mem, { keyEncoding: "json" }));
        const itr = db.iterator();

        itr.seek("b");
        itr.next((err, key, value) => {
            assert.notExists(err);
            assert.equal(key, "b");
            itr.end(done);
        });
    });

    it("with encoding, without deferred-open", (done) => {
        db = new DB(new Encoding(mem, { keyEncoding: "json" }));
        db.open((err) => {
            assert.notExists(err);
            const itr = db.iterator();
            itr.seek("b");
            itr.next((err, key, value) => {
                assert.notExists(err);
                assert.equal(key, "b");
                itr.end(done);
            });
        });
    });
});
