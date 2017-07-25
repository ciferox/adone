const { is, data: { json: { encodeSafe, decodeSafe } } } = adone;

describe("data", "json", () => {
    const testUsingObject = (obj) => {
        const asString = encodeSafe(obj);
        const asJsonString = JSON.stringify(obj);

        const v2vObject = decodeSafe(asString);
        const j2vObject = decodeSafe(asJsonString);
        const v2jObject = JSON.parse(asString);

        // if the object doesn't equal itself
        // after JSON conversion, don't test the obj itself
        if (is.deepEqual(obj, JSON.parse(JSON.stringify(obj)))) {
            assert.deepEqual(obj, v2vObject);
        }
        assert.deepEqual(v2vObject, j2vObject);
        assert.deepEqual(j2vObject, v2jObject);
    };

    const testUsingStringForDeeplyNested = (str) => {
        // can't actually use JSON.parse/JSON.stringify here,
        // because it fails! :P

        const parsed = decodeSafe(str);
        const stringified = encodeSafe(parsed);
        decodeSafe(stringified);

        // can't compare objects; we get a max call stack error. :)
        assert.equal(str, stringified);
    };

    const requireFixture = (name) => require(adone.std.path.join(__dirname, "fixtures", name));

    describe("basic tests", () => {
        const basicObjects = requireFixture("basic");

        basicObjects.forEach((obj) => {
            it(`test: ${JSON.stringify(obj)}`, () => {
                testUsingObject(obj);
            });
        });
    });

    describe("whitespace tests", () => {
        it("test spaces ", () => {
            assert.deepEqual(decodeSafe('{"foo"\t:\t:   "bar"}'), { foo: "bar" });
        });
        it("test tabs ", () => {
            assert.deepEqual(decodeSafe('{"foo"\t:\t:"bar"}'), { foo: "bar" });
        });
        it("test newlines ", () => {
            assert.deepEqual(decodeSafe('{"foo"\n\n:\n:"bar"}'), { foo: "bar" });
        });
        it("test newlines + tabs", () => {
            assert.deepEqual(decodeSafe('{\t"foo"\n\n\t:\n\n\t"bar"}'), { foo: "bar" });
        });
    });

    describe("hasOwnProperty tests", () => {
        it("test hasOwnProperty", () => {
            class Foo {
            }
            Foo.prototype.bar = "baz";

            class SubFoo extends Foo {
            }

            const o = new SubFoo();
            o.prop = "exists";

            const converted = decodeSafe(encodeSafe(o));
            assert.deepEqual(converted, { prop: "exists" });
        });
    });

    describe("invalid json test", () => {
        it("throws error if invalid json", () => {
            assert.throws(() => decodeSafe("badjson"));
        });
    });

    describe("advanced tests", () => {
        const advancedObjects = requireFixture("advanced");

        Object.keys(advancedObjects).forEach((key) => {
            const obj = advancedObjects[key];
            it(`test: ${key}`, () => {
                testUsingObject(obj);
            });
        });
    });

    describe("deeply nested tests", () => {
        const deeplyNested = requireFixture("deeply-nested");

        deeplyNested.forEach((str, i) => {
            it(`test: ${i}`, () => {
                testUsingStringForDeeplyNested(str);
            });
        });
    });
});
