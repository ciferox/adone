let db;
let leveldown;
let testCommon;
const verifyNotFoundError = require("./util").verifyNotFoundError;
const isTypedArray = require("./util").isTypedArray;

export const setUp = function (_leveldown, _testCommon) {
    describe("del()", () => {
        it("setUp common", _testCommon.setUp);
        it("setUp db", async () => {
            leveldown = _leveldown;
            testCommon = _testCommon;
            db = leveldown(testCommon.location());
            await db.open();
        });
    });
};

export const args = function () {
    describe("del()", () => {
        it("test _serialize object", async () => {
            const db = leveldown(testCommon.location());
            db._del = function (key, opts, callback) {
                assert.equal(Buffer.isBuffer(key) ? String(key) : key, "[object Object]");
                callback();
            };
            await db.del({});
        });

        it("test _serialize buffer", async () => {
            const db = leveldown(testCommon.location());
            db._del = function (key, opts, callback) {
                assert.ok(Buffer.isBuffer(key));
                callback();
            };
            await db.del(Buffer.from("buf"));
        });

        it("test custom _serialize*", async () => {
            const db = leveldown(testCommon.location());
            db._serializeKey = function (data) {
                return data;
            };
            db._del = function (key, options, callback) {
                assert.deepEqual(key, { foo: "bar" });
                callback();
            };
            await db.open();
            await db.del({ foo: "bar" });
            await db.close();    
        });
    });
};

export const del = function () {
    describe("del()", () => {
        it("test simple del()", async () => {
            await db.put("foo", "bar");
            await db.del("foo");
            try {
                await db.get("foo");
            } catch (err) {
                assert.ok(err, "entry propertly deleted");
                assert.ok(typeof value === "undefined", "value is undefined");
                assert.ok(verifyNotFoundError(err), "NotFound error");
            }
        });

        it("test del on non-existent key", async () => {
            await db.del("blargh");
        });
    });
};

export const tearDown = function (testCommon) {
    describe("del()", () => {
        it("tearDown", async () => {
            await db.close();
            await testCommon.tearDown();
        });
    });
};

export const all = function (leveldown, testCommon) {
    setUp(leveldown, testCommon);
    args();
    del();
    tearDown(testCommon);
};
