let db;
let leveldown;
let testCommon;
const verifyNotFoundError = require("./util").verifyNotFoundError;
const isTypedArray = require("./util").isTypedArray;

export const setUp = function (_leveldown, _testCommon) {
    describe("get()", () => {
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
    describe("get()", () => {
        it("test _serialize object", async () => {
            const db = leveldown(testCommon.location());
            db._get = function (key, opts, callback) {
                assert.equal(Buffer.isBuffer(key) ? String(key) : key, "[object Object]");
                callback();
            };
            await db.get({});
        });

        it("test _serialize buffer", async () => {
            const db = leveldown(testCommon.location());
            db._get = function (key, opts, callback) {
                assert.deepEqual(key, Buffer.from("key"));
                callback();
            };
            await db.get(Buffer.from("key"));
        });

        it("test custom _serialize*", async () => {
            const db = leveldown(testCommon.location());
            db._serializeKey = function (data) {
                return data;
            };
            db._get = function (key, options, callback) {
                assert.deepEqual(key, { foo: "bar" });
                callback();
            };
            await db.open();
            await db.get({ foo: "bar" });
            await db.close();
        });
    });
};

export const get = function () {
    describe("get()", () => {
        it("test simple get()", async () => {
            await db.put("foo", "bar");
            let value = await db.get("foo");
            assert.ok(typeof value !== "string", "should not be string by default");

            let result;
            if (isTypedArray(value)) {
                result = String.fromCharCode.apply(null, new Uint16Array(value));
            } else {
                assert.ok(typeof Buffer !== "undefined" && value instanceof Buffer);
                try {
                    result = value.toString();
                } catch (e) {
                    assert.error(e, "should not throw when converting value to a string");
                }
            }

            assert.equal(result, "bar");

            value = await db.get("foo", {});
            assert.ok(typeof value !== "string", "should not be string by default");

            if (isTypedArray(value)) {
                result = String.fromCharCode.apply(null, new Uint16Array(value));
            } else {
                assert.ok(typeof Buffer !== "undefined" && value instanceof Buffer);
                try {
                    result = value.toString();
                } catch (e) {
                    assert.error(e, "should not throw when converting value to a string");
                }
            }

            assert.equal(result, "bar");

            value = await db.get("foo", { asBuffer: false });
            assert.ok(typeof value === "string", "should be string if not buffer");
            assert.equal(value, "bar");
        });

        it("test simultaniously get()", async () => {
            await db.put("hello", "world");

            for (let i = 0; i < 10; ++i) {
                const value = await db.get("hello");
                assert.equal(value.toString(), "world");
            }

            for (let j = 0; j < 10; ++j) {
                try {
                    await db.get("not found");
                } catch (err) {
                    assert.ok(verifyNotFoundError(err), "should have correct error message");
                    assert.ok(typeof value === "undefined", "value is undefined");
                }
            }
        });
    });
};

export const tearDown = function (testCommon) {
    describe("get()", () => {
        it("tearDown", async () => {
            await db.close();
            await testCommon.tearDown();
        });
    });
};

export const all = function (leveldown, testCommon) {
    setUp(leveldown, testCommon);
    args();
    get();
    tearDown(testCommon);
};
