const {
    is
} = adone;

let db;
const { isTypedArray, verifyNotFoundError } = require("./util");

export const setUp = function (leveldown, testCommon) {
    describe("batch", () => {
        it("setUp common", testCommon.setUp);
        it("setUp db", async () => {
            db = leveldown(testCommon.location());
            await db.open();
        });
    });
};

export const args = function () {
    describe("batch", () => {
        it("batch() with missing `value`", async () => {
            await db.batch([{ type: "put", key: "foo1" }]);
        });

        it("batch() with null `value`", async () => {
            await db.batch([{ type: "put", key: "foo1", value: null }]);
        });

        it("batch() with missing `key`", async () => {
            await assert.throws(async () => db.batch([{ type: "put", value: "foo1" }]));
        });

        it("batch() with null `key`", async () => {
            await assert.throws(async () => db.batch([{ type: "put", key: null, value: "foo1" }]));
        });

        it("batch() with missing `key` and `value`", async () => {
            await assert.throws(async () => db.batch([{ type: "put" }]));
        });

        it("batch() with missing `type`", async () => {
            await assert.throws(async () => db.batch([{ key: "key", value: "value" }]), "`type` must be 'put' or 'del'");
        });

        it("batch() with wrong `type`", async () => {
            await assert.throws(async () => db.batch([{ key: "key", value: "value", type: "foo" }]), "`type` must be 'put' or 'del'");
        });

        // it("batch() with missing array", async () => {
        //     await assert.throws(async () => db.batch());
        // });

        it("batch() with undefined array", async () => {
            await assert.throws(async () => db.batch(void 0));
        });

        it("batch() with null array", async () => {
            await assert.throws(async () => db.batch(null));
        });

        it("batch() with null options", async () => {
            await db.batch([], null);
        });

        [null, undefined, 1, true].forEach((element) => {
            const type = is.null(element) ? "null" : typeof element;

            it(`test batch() with ${type} element`, async () => {
                await assert.throws(async () => db.batch([element], /batch(array) element must be an object and not `null`/));
            });
        });
    });
};

export const batch = function () {
    describe("batch", () => {
        it("batch() with empty array", async () => {
            await db.batch([]);
        });

        it("simple batch()", async () => {
            await db.batch([{ type: "put", key: "foo", value: "bar" }]);
            const value = await db.get("foo");
            let result;
            if (isTypedArray(value)) {
                result = String.fromCharCode.apply(null, new Uint16Array(value));
            } else {
                assert.ok(!is.undefined(Buffer) && value instanceof Buffer);
                result = value.toString();
            }
            assert.equal(result, "bar");
        });

        it("multiple batch()", async () => {
            await db.batch([
                { type: "put", key: "foobatch1", value: "bar1" },
                { type: "put", key: "foobatch2", value: "bar2" },
                { type: "put", key: "foobatch3", value: "bar3" },
                { type: "del", key: "foobatch2" }
            ]);

            let value = await db.get("foobatch1");
            let result;
            if (isTypedArray(value)) {
                result = String.fromCharCode.apply(null, new Uint16Array(value));
            } else {
                assert.ok(!is.undefined(Buffer) && value instanceof Buffer);
                result = value.toString();
            }
            assert.equal(result, "bar1");

            const err = await assert.throws(async () => db.get("foobatch2"));
            assert.ok(verifyNotFoundError(err), "NotFound error");

            value = await db.get("foobatch3");
            if (isTypedArray(value)) {
                result = String.fromCharCode.apply(null, new Uint16Array(value));
            } else {
                assert.ok(!is.undefined(Buffer) && value instanceof Buffer);
                result = value.toString();
            }
            assert.equal(result, "bar3");
        });
    });
};

export const atomic = function () {
    describe("batch", () => {
        it("multiple batch()", async () => {
            await assert.throws(async () => db.batch([
                { type: "put", key: "foobah1", value: "bar1" },
                { type: "put", value: "bar2" },
                { type: "put", key: "foobah3", value: "bar3" }
            ]));

            await assert.throws(async () => db.get("foobah1"));
            await assert.throws(async () => db.get("foobah3"));
        });
    });
};

export const tearDown = function (testCommon) {
    describe("batch", () => {
        it("tearDown", async () => {
            await db.close();
            await testCommon.tearDown();
        });
    });
};

export const all = function (leveldown, testCommon) {
    setUp(leveldown, testCommon);
    args();
    batch();
    atomic();
    tearDown(testCommon);
};
