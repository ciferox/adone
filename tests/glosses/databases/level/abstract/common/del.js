const {
    is
} = adone;

let db;
let leveldown;
let testCommon;
const verifyNotFoundError = require("./util").verifyNotFoundError;

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
        it("custom _serialize*", async () => {
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
        it("simple del()", async () => {
            await db.put("foo", "bar");
            await db.del("foo");
            const err = await assert.throws(async () => db.get("foo"));
            assert.ok(verifyNotFoundError(err), "NotFound error");
        });

        it("del on non-existent key", async () => {
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
