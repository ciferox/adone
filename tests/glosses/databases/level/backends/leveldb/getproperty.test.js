const testCommon = require("./common");

let db;

it("setUp common", testCommon.setUp);

it("setUp db", (done) => {
    db = testCommon.factory();
    db.open(() => done());
});

it("test argument-less getProperty() throws", () => {
    assert.throws(() => {
        db.getProperty();
    }, "getProperty() requires a valid `property` argument", "no-arg getProperty() throws");
});

it("test non-string getProperty() throws", () => {
    assert.throws(() => {
        db.getProperty({});
    }, "getProperty() requires a valid `property` argument", "no-arg getProperty() throws");
});

it("test invalid getProperty() returns empty string", () => {
    assert.equal(db.getProperty("foo"), "", "invalid property");
    assert.equal(db.getProperty("leveldb.foo"), "", "invalid leveldb.* property");
});

it('test invalid getProperty("leveldb.num-files-at-levelN") returns numbers', () => {
    for (let i = 0; i < 7; i++) {
        assert.equal(db.getProperty(`leveldb.num-files-at-level${i}`),
            "0", '"leveldb.num-files-at-levelN" === "0"');
    }
});

it('test invalid getProperty("leveldb.stats")', () => {
    assert.ok(db.getProperty("leveldb.stats").split("\n").length > 3, "leveldb.stats has > 3 newlines");
});

it('test invalid getProperty("leveldb.sstables")', () => {
    const expected = `${[0, 1, 2, 3, 4, 5, 6].map((l) => {
        return `--- level ${l} ---`;
    }).join("\n")}\n`;
    assert.equal(db.getProperty("leveldb.sstables"), expected, "leveldb.sstables");
});

it("tearDown", (done) => {
    db.close(testCommon.tearDown.bind(null, done));
});
