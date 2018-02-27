const {
    is
} = adone;

let db;
const testBuffer = Buffer.from("testbuffer");
const verifyNotFoundError = require("./util").verifyNotFoundError;

const makeGetDelErrorTests = (type, key, expectedError) => {
    it(`get() with ${type} causes error`, async () => {
        const err = await assert.throws(async () => db.get(key));
        assert.ok(err instanceof Error);
        assert.ok(err.message.match(expectedError), "correct error message");
    });

    it(`del() with ${type} causes error`, async () => {
        const err = await assert.throws(async () => db.del(key));
        assert.ok(err instanceof Error);
        assert.ok(err.message.match(expectedError), "correct error message");
    });
};

const makePutErrorTest = (type, key, value, expectedError) => {
    it(`put() with ${type} causes error`, async () => {
        const err = await assert.throws(async () => db.put(key, value));
        assert.ok(err instanceof Error);
        assert.ok(err.message.match(expectedError), "correct error message");
    });
};

const makePutGetDelSuccessfulTest = function (type, key, value, expectedResult) {
    const hasExpectedResult = arguments.length === 4;
    it(`put()/get()/del() with ${type}`, async () => {
        await db.put(key, value);
        const _value = await db.get(key);
        assert.ok(is.buffer(_value), "is a Buffer");
        let result = _value;
        if (hasExpectedResult) {
            assert.equal(result.toString(), expectedResult);
        } else {
            if (!is.nil(result)) {
                result = _value.toString();
            }
            if (!is.nil(value)) {
                value = value.toString();
            }
            assert.equal(result, value);
        }
        await db.del(key);
        const err = await assert.throws(async () => db.get(key));
        assert.ok(verifyNotFoundError(err), "should have correct error message");
    });
};

const makeErrorKeyTest = (type, key, expectedError) => {
    makeGetDelErrorTests(type, key, expectedError);
    makePutErrorTest(type, key, "foo", expectedError);
};

export const setUp = function (leveldown, testCommon) {
    describe("put()/get()/del()", () => {
        it("setUp common", testCommon.setUp);
        it("setUp db", async () => {
            db = leveldown(testCommon.location());
            await db.open();
        });
    });
};

export const errorKeys = function () {
    describe("put()/get()/del()", () => {
        makeErrorKeyTest("null key", null, /key cannot be `null` or `undefined`/);
        makeErrorKeyTest("undefined key", undefined, /key cannot be `null` or `undefined`/);
        makeErrorKeyTest("empty String key", "", /key cannot be an empty String/);
        makeErrorKeyTest("empty Buffer key", Buffer.alloc(0), /key cannot be an empty \w*Buffer/);
        makeErrorKeyTest("empty Array key", [], /key cannot be an empty String/);
    });
};

export const nonErrorKeys = function () {
    describe("put()/get()/del()", () => {
        // valid falsey keys
        makePutGetDelSuccessfulTest("`false` key", false, "foo false");
        makePutGetDelSuccessfulTest("`0` key", 0, "foo 0");
        makePutGetDelSuccessfulTest("`NaN` key", NaN, "foo NaN");

        // standard String key
        makePutGetDelSuccessfulTest(
            "long String key"
            , "some long string that I'm using as a key for this unit test, cross your fingers dude, we're going in!"
            , "foo"
        );

        // Buffer key
        makePutGetDelSuccessfulTest("Buffer key", testBuffer, "foo");

        // non-empty Array as a value
        makePutGetDelSuccessfulTest("Array value", "foo", [1, 2, 3, 4]);
    });
};

export const errorValues = function () {
};

export const nonErrorValues = function () {
    describe("put()/get()/del()", () => {
        // valid falsey values
        makePutGetDelSuccessfulTest("`false` value", "foo false", false);
        makePutGetDelSuccessfulTest("`0` value", "foo 0", 0);
        makePutGetDelSuccessfulTest("`NaN` value", "foo NaN", NaN);

        // all of the following result in an empty-string value:

        makePutGetDelSuccessfulTest("`null` value", "foo null", null, "");
        makePutGetDelSuccessfulTest("`undefined` value", "foo undefined", undefined, "");
        makePutGetDelSuccessfulTest("empty String value", "foo", "", "");
        makePutGetDelSuccessfulTest("empty Buffer value", "foo", Buffer.alloc(0), "");
        makePutGetDelSuccessfulTest("empty Array value", "foo", [], "");

        // standard String value
        makePutGetDelSuccessfulTest(
            "long String value"
            , "foo"
            , "some long string that I'm using as a key for this unit test, cross your fingers dude, we're going in!"
        );

        // standard Buffer value
        makePutGetDelSuccessfulTest("Buffer value", "foo", testBuffer);

        // non-empty Array as a key
        makePutGetDelSuccessfulTest("Array key", [1, 2, 3, 4], "foo");
    });
};

export const tearDown = function (testCommon) {
    describe("put()/get()/del()", () => {
        it("tearDown", async () => {
            await db.close();
            await testCommon.tearDown();
        });
    });
};

export const all = function (leveldown, testCommon) {
    setUp(leveldown, testCommon);
    errorKeys();
    nonErrorKeys();
    errorValues();
    nonErrorValues();
    tearDown(testCommon);
};
