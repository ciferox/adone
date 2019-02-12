const {
    is
} = adone;

let db;
const verifyNotFoundError = require("./util").verifyNotFoundError;
const testBuffer = Buffer.from("testbuffer");

const makeGetDelErrorTests = function (type, key, expectedError) {
    it(`test get() with ${type} causes error`, (done) => {
        let async = false;

        db.get(key, (err) => {
            assert.ok(err, "has error");
            assert.ok(err instanceof Error);
            assert.ok(err.message.match(expectedError), "correct error message");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });

    it(`test del() with ${type} causes error`, (done) => {
        let async = false;

        db.del(key, (err) => {
            assert.ok(err, "has error");
            assert.ok(err instanceof Error);
            assert.ok(err.message.match(expectedError), "correct error message");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });
};

const makePutErrorTest = function (type, key, value, expectedError) {
    it(`test put() with ${type} causes error`, (done) => {
        let async = false;

        db.put(key, value, (err) => {
            assert.exists(err, "has error");
            assert.ok(err instanceof Error);
            assert.ok(err.message.match(expectedError), "correct error message");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });
};

const makePutGetDelSuccessfulTest = function (type, key, value, expectedResult) {
    const hasExpectedResult = arguments.length === 5;
    it(`test put()/get()/del() with ${type}`, (done) => {
        db.put(key, value, (err) => {
            assert.notExists(err);
            db.get(key, (err, _value) => {
                assert.notExists(err, `no error, has key/value for \`${type}\``);
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
                db.del(key, (err) => {
                    assert.notExists(err, `no error, deleted key/value for \`${type}\``);

                    let async = false;

                    db.get(key, (err, value) => {
                        assert.ok(err, "entry properly deleted");
                        assert.ok(verifyNotFoundError(err), "should have correct error message");
                        assert.equal(typeof value, "undefined", "value is undefined");
                        assert.ok(async, "callback is asynchronous");
                        done();
                    });

                    async = true;
                });
            });
        });
    });
};

const makeErrorKeyTest = function (type, key, expectedError) {
    makeGetDelErrorTests(type, key, expectedError);
    makePutErrorTest(type, key, "foo", expectedError);
};

export const setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
    it("setUp db", (done) => {
        db = testCommon.factory();
        db.open(() => done());
    });
};

export const errorKeys = function (testCommon) {
    makeErrorKeyTest("null key", null, /key cannot be `null` or `undefined`/);
    makeErrorKeyTest("undefined key", undefined, /key cannot be `null` or `undefined`/);
    makeErrorKeyTest("empty String key", "", /key cannot be an empty String/);
    makeErrorKeyTest("empty Buffer key", Buffer.alloc(0), /key cannot be an empty \w*Buffer/);
    makeErrorKeyTest("empty Array key", [], /key cannot be an empty Array/);
};

export const errorValues = function (testCommon) {
    makePutErrorTest("null value", "key", null, /value cannot be `null` or `undefined`/);
    makePutErrorTest("undefined value", "key", undefined, /value cannot be `null` or `undefined`/);
};

export const nonErrorKeys = function (testCommon) {
    // valid falsey keys
    makePutGetDelSuccessfulTest("`0` key", 0, "foo 0");

    // standard String key
    makePutGetDelSuccessfulTest(
        "long String key"
        , "some long string that I'm using as a key for this unit test, cross your fingers human, we're going in!"
        , "foo"
    );

    if (testCommon.bufferKeys) {
        makePutGetDelSuccessfulTest("Buffer key", testBuffer, "foo");
    }

    // non-empty Array as a value
    makePutGetDelSuccessfulTest("Array value", "foo", [1, 2, 3, 4]);
};

export const nonErrorValues = function (testCommon) {
    // valid falsey values
    makePutGetDelSuccessfulTest("`false` value", "foo false", false);
    makePutGetDelSuccessfulTest("`0` value", "foo 0", 0);
    makePutGetDelSuccessfulTest("`NaN` value", "foo NaN", NaN);

    // all of the following result in an empty-string value:
    makePutGetDelSuccessfulTest("empty String value", "foo", "", "");
    makePutGetDelSuccessfulTest("empty Buffer value", "foo", Buffer.alloc(0), "");

    // note that an implementation may return the value as an array
    makePutGetDelSuccessfulTest("empty Array value", "foo", [], "");

    // standard String value
    makePutGetDelSuccessfulTest(
        "long String value"
        , "foo"
        , "some long string that I'm using as a key for this unit test, cross your fingers human, we're going in!"
    );

    // standard Buffer value
    makePutGetDelSuccessfulTest("Buffer value", "foo", testBuffer);

    // non-empty Array as a key
    makePutGetDelSuccessfulTest("Array key", [1, 2, 3, 4], "foo");
};

export const tearDown = function (testCommon) {
    it("tearDown", (done) => {
        db.close(testCommon.tearDown.bind(null, done));
    });
};

export const all = function (testCommon) {
    setUp(testCommon);
    errorKeys(testCommon);
    errorValues(testCommon);
    nonErrorKeys(testCommon);
    nonErrorValues(testCommon);
    tearDown(testCommon);
};
