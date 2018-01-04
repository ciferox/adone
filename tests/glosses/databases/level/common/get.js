const {
    is
} = adone;

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
        it("custom _serialize*", async () => {
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
        it("simple get()", async () => {
            await db.put("foo", "bar");
            let value = await db.get("foo");
            assert.ok(!is.string(value), "should not be string by default");

            let result;
            if (isTypedArray(value)) {
                result = String.fromCharCode.apply(null, new Uint16Array(value));
            } else {
                assert.ok(!is.undefined(Buffer) && value instanceof Buffer);
                try {
                    result = value.toString();
                } catch (e) {
                    assert.error(e, "should not throw when converting value to a string");
                }
            }

            assert.equal(result, "bar");

            value = await db.get("foo", {});
            assert.ok(!is.string(value), "should not be string by default");

            if (isTypedArray(value)) {
                result = String.fromCharCode.apply(null, new Uint16Array(value));
            } else {
                assert.ok(!is.undefined(Buffer) && value instanceof Buffer);
                try {
                    result = value.toString();
                } catch (e) {
                    assert.error(e, "should not throw when converting value to a string");
                }
            }

            assert.equal(result, "bar");

            value = await db.get("foo", { asBuffer: false });
            assert.ok(is.string(value), "should be string if not buffer");
            assert.equal(value, "bar");
        });

        it("simultaniously get()", async () => {
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
                }
            }
        });
    });

    it("get() not found error is asynchronous", async () => {
        await db.put("hello", "world");
        const err = await assert.throws(async () => db.get("not found"));
        assert.ok(verifyNotFoundError(err));
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
