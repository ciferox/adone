const { is, data: { json5 } } = adone;

const simpleCases = [
    null,
    9, -9, +9, +9.878,
    "", "''", "999", "9aa", "aaa", "aa a", "aa\na", "aa\\a", "'", "\\'", '\\"',
    undefined,
    true, false,
    {}, [], function () {}, () => {}, 
    Date.now(), new Date(Date.now())
];

const stringifyJSON5 = (obj, replacer, space) => {
    let res;
    try {
        res = json5.encode(obj, replacer, space);
    } catch (e) {
        res = e.message;
    }
    return res;
};

const stringifyJSON = (obj, replacer, space) => {
    let res;
    
    try {
        res = JSON.stringify(obj, replacer, space);
    
        // now remove all quotes from keys where appropriate first recursively find all key names
        const keys = [];

        const findKeys = (key, innerObj) => {
            if (innerObj && innerObj.toJSON && is.function(innerObj.toJSON)) {
                innerObj = innerObj.toJSON();
            }
            if (replacer) {
                if (is.function(replacer)) {
                    innerObj = replacer(key, innerObj);
                } else if (key !== "" && replacer.indexOf(key) < 0) {
                    return;
                }
            }
            if (json5.isWord(key) && !is.function(innerObj) && typeof innerObj !== "undefined") {
                keys.push(key);
            }
            if (typeof innerObj === "object") {
                if (is.array(innerObj)) {
                    for (let i = 0; i < innerObj.length; i++) {
                        findKeys(i, innerObj[i]);
                    }
                } else if (innerObj !== null) {
                    for (const prop in innerObj) {
                        if (innerObj.hasOwnProperty(prop)) {
                            findKeys(prop, innerObj[prop]);
                        }
                    }
                }
            }
        };

        findKeys("", obj);

        // now replace each key in the result
        let last = 0;
        for (let i = 0; i < keys.length; i++) {  
            // not perfect since we can match on parts of the previous value that 
            // matches the key, but we can design our test around that.
            last = res.indexOf('"' + keys[i] + '"', last);
            if (last === -1) {
                // problem with test framework
                console.log("Couldn't find: " + keys[i]);
                throw new Error("Couldn't find: " + keys[i]);
            }
            res = res.substring(0, last) + res.substring(last + 1, last + keys[i].length + 1) + res.substring(last + keys[i].length + 2, res.length);
            last += keys[i].length;
        }
    } catch (e) {
        res = e.message;
    }
    return res;
};

const assertStringify = (obj, replacerTestConstructor, expectError) => {
    if (!replacerTestConstructor) {
        replacerTestConstructor = () => {
            return {
                replacer: null,
                assert() {}
            };
        };
    }
    const testStringsEqual = (obj, indent) => {
        const j5ReplacerTest = replacerTestConstructor();
        const jReplacerTest = replacerTestConstructor();
        const j5 = stringifyJSON5(obj, j5ReplacerTest.replacer, indent);
        const j = stringifyJSON(obj, jReplacerTest.replacer, indent);
        assert.equal(j5, j);
        j5ReplacerTest.assert();
    };

    const indents = [
        undefined,
        " ",
        "          ",
        "                    ",
        "\t",
        "this is an odd indent",
        5,
        20,
        "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t"
    ];
    for (let i = 0; i < indents.length; i++) {
        testStringsEqual(obj, indents[i]);
    }

    if (!expectError) {
        // no point in round tripping if there is an error
        const origStr = json5.encode(obj);
        let roundTripStr;
        if (origStr !== "undefined" && typeof origStr !== "undefined") {
            try {
                roundTripStr = json5.encode(json5.decode(origStr));
            } catch (e) {
                console.log(e);
                console.log(origStr);    
                throw e;
            }
            assert.equal(origStr, roundTripStr);
        }
    }
};

describe("JSON5.encode", function () {
    it("simple", function () {
        for (let i = 0; i < simpleCases.length; i++) {
            assertStringify(simpleCases[i]);
        }
    });

    it("oddities", function () {
        assertStringify(Function);
        assertStringify(Date);
        assertStringify(Object);
        assertStringify(NaN);
        assertStringify(Infinity);
        assertStringify(10e6);
        assertStringify(19.3223e6);
        assertStringify(0o77);
        assertStringify(0x99);
        assertStringify(/aa/);
        assertStringify(new RegExp("aa"));
        
        assertStringify(new Number(7));
        assertStringify(new String(7));
        assertStringify(new String(""));
        assertStringify(new String("abcde"));
        assertStringify(new String(new String("abcde")));
        assertStringify(new Boolean(true));
        assertStringify(new Boolean());
    });

    it("arrays", function () {
        assertStringify([]);
        assertStringify([""]);
        assertStringify([1, 2]);
        assertStringify([undefined]);
        assertStringify([1, "fasds"]);
        assertStringify([1, "\n\b\t\f\r'"]);
        assertStringify([1, "fasds", ["fdsafsd"], null]);
        assertStringify([1, "fasds", ["fdsafsd"], null, () => {
            return 1; 
        }, false]);
        assertStringify([1, "fasds", ["fdsafsd"], undefined, () => {
            return 1; 
        }, false]);
    });

    it("objects", function () {
        assertStringify({ a: 1, b: 2 });
        assertStringify({ "": 1, b: 2 });
        assertStringify({ 9: 1, b: 2 });
        assertStringify({ "9aaa": 1, b: 2 });
        assertStringify({ aaaa: 1, bbbb: 2 });
        assertStringify({ a$a_aa: 1, bbbb: 2 });
        assertStringify({ "a$a_aa": 1, "bbbb": 2 });
        assertStringify({ "a$a_aa": [1], "bbbb": { a: 2 } });
        assertStringify({ "a$22222_aa": [1], "bbbb": { aaaa: 2, name(a, n, fh, h) {
            return "nuthin"; 
        }, foo: undefined } });
        assertStringify({ "a$222222_aa": [1], "bbbb": { aaaa: 2, name: "other", foo: undefined } });
        assertStringify({ "a$222222_aa": [1, {}, undefined, function () { }, { jjj() { } }], "bbbb": { aaaa: 2, name: "other", foo: undefined } });
        
        // using same obj multiple times
        const innerObj = { a: 9, b: 6 };
        assertStringify({ a: innerObj, b: innerObj, c: [innerObj, innerObj, innerObj] });
    });

    it("oddKeys", function () {
        assertStringify({ "this is a crazy long key": 1, "bbbb": 2 });
        assertStringify({ "": 1, "bbbb": 2 });
        assertStringify({ "s\ns": 1, "bbbb": 2 });
        assertStringify({ "\n\b\t\f\r'\\": 1, "bbbb": 2 });
        assertStringify({ undefined: 1, "bbbb": 2 });
        assertStringify({ "\x00": "\x00" });
    });

    it("circular", function () {
        const obj = { };
        obj.obj = obj;
        assertStringify(obj, null, true);

        const obj2 = { inner1: { inner2: {} } };
        obj2.inner1.inner2.obj = obj2;
        assertStringify(obj2, null, true);

        const obj3 = { inner1: { inner2: [] } };
        obj3.inner1.inner2[0] = obj3;
        assertStringify(obj3, null, true);
    });

    it("replacerType", function () {
        const assertStringifyJSON5ThrowsExceptionForReplacer = (replacer) => {
            assert.throws(
                () => {
                    json5.encode(null, replacer); 
                },
                /Replacer must be a function or an array/
            );
        };
        assertStringifyJSON5ThrowsExceptionForReplacer("string");
        assertStringifyJSON5ThrowsExceptionForReplacer(123);
        assertStringifyJSON5ThrowsExceptionForReplacer({});
    });

    it("toJSON", function () {
        const customToJSONObject = {
            name: "customToJSONObject",
            toJSON() {
                return "custom-to-json-object-serialization";
            }
        };
        assertStringify(customToJSONObject);

        // const customToJSONPrimitive = "Some string";
        // customToJSONPrimitive.toJSON = () => {
        //     return "custom-to-json-string-serialization";
        // };
        // assertStringify(customToJSONPrimitive);

        const object = {
            customToJSONObject
        };
        assertStringify(object);

        // Returning an object with a toJSON function does *NOT* have that toJSON function called: it is omitted
        const nested = {
            name: "nested",
            toJSON() {
                return customToJSONObject;
            }
        };
        assertStringify(nested);

        let count = 0;
        function createObjectSerialisingTo(value) {
            count++;
            return {
                name: "obj-" + count,
                toJSON() {
                    return value;
                }
            };
        }
        assertStringify(createObjectSerialisingTo(null));
        assertStringify(createObjectSerialisingTo(undefined));
        assertStringify(createObjectSerialisingTo([]));
        assertStringify(createObjectSerialisingTo({}));
        assertStringify(createObjectSerialisingTo(12345));
        assertStringify(createObjectSerialisingTo(true));
        assertStringify(createObjectSerialisingTo(new Date()));
        assertStringify(createObjectSerialisingTo(function () {}));
    });

    describe("Replacer", function () {
        describe("Function", function () {
            it("simple", function () {
                const replacerTestFactory = (expectedValue) => {
                    return () => {
                        let lastKey = null;
                        let lastValue = null;
                        let numCalls = 0;
                        let replacerThis;
                        return {
                            replacer(key, value) {
                                lastKey = key;
                                lastValue = value;
                                numCalls++;
                                replacerThis = this;
                                return value;
                            },
                            assert() {
                                assert.equal(numCalls, 1, "Replacer should be called exactly once for " + expectedValue);
                                assert.equal(lastKey, "");
                                assert.deepEqual(replacerThis, { "": expectedValue });
                                let expectedValueToJson = expectedValue;
                                if (expectedValue && expectedValue["toJSON"]) {
                                    expectedValueToJson = expectedValue.toJSON();
                                }
                                assert.equal(lastValue, expectedValueToJson);
                            }
                        };
                    };
                };
                for (let i = 0; i < simpleCases.length; i++) {
                    assertStringify(simpleCases[i], replacerTestFactory(simpleCases[i]));
                }
            });

            it("complexObject", function () {
                const obj = {
                    "": "emptyPropertyName",
                    one: "string",
                    two: 123,
                    three: ["array1", "array2"],
                    four: { nested_one: "anotherString" },
                    five: new Date(),
                    six: Date.now(),
                    seven: null,
                    eight: true,
                    nine: false,
                    ten: [NaN, Infinity, -Infinity],
                    eleven() {}
                };
                const expectedKeys = [
                    "", // top level object
                    "", // First key
                    "one",
                    "two",
                    "three", 0, 1, // array keys
                    "four", "nested_one", // nested object keys
                    "five",
                    "six",
                    "seven",
                    "eight",
                    "nine",
                    "ten", 0, 1, 2, // array keys
                    "eleven"
                ];
                const expectedHolders = [
                    { "": obj },
                    obj,
                    obj,
                    obj,
                    obj, obj.three, obj.three,
                    obj, obj.four,
                    obj,
                    obj,
                    obj,
                    obj,
                    obj,
                    obj, obj.ten, obj.ten, obj.ten,
                    obj
                ];
                const ReplacerTest = () => {
                    const seenKeys = [];
                    const seenHolders = [];
                    return {
                        replacer(key, value) {
                            seenKeys.push(key);
                            seenHolders.push(this);
                            if (typeof(value) === "object") {
                                return value;
                            }
                            return "replaced " + (value ? value.toString() : "");
                        },
                        assert() {
                            assert.deepEqual(seenKeys, expectedKeys);
                            assert.deepEqual(seenHolders, expectedHolders);
                        }
                    };
                };
                assertStringify(obj, ReplacerTest);
            });

            it("replacingWithUndefined", function () {
                const obj = { shouldSurvive: "one", shouldBeRemoved: "two" };
                const ReplacerTest = () => {
                    return {
                        replacer(key, value) {
                            if (key === "shouldBeRemoved") {
                                return undefined;
                            } else {
                                return value;
                            }
                        },
                        assert() { /* no-op */ }
                    };
                };
                assertStringify(obj, ReplacerTest);
            });

            it("replacingArrayValueWithUndefined", function () {
                const obj = ["should survive", "should be removed"];
                const ReplacerTest = () => {
                    return {
                        replacer(key, value) {
                            if (value === "should be removed") {
                                return undefined;
                            } else {
                                return value;
                            }
                        },
                        assert() { /* no-op */ }
                    };
                };
                assertStringify(obj, ReplacerTest);
            });
        });

        describe("Array", function () {
            it("simple", function () {
                const ReplacerTest = () => {
                    return {
                        replacer: [],
                        assert() { /* no-op */ }
                    };
                };
                for (let i = 0; i < simpleCases.length; i++) {
                    assertStringify(simpleCases[i], ReplacerTest);
                }
            });

            it("emptyStringProperty", function () {
                const obj = { "": "keep", "one": "remove" };
                const ReplacerTest = () => {
                    return {
                        replacer: [""],
                        assert() { /* no-op */ }
                    };
                };
                assertStringify(obj, ReplacerTest);
            });

            it("complexObject", function () {
                const obj = {
                    "": "emptyPropertyName",
                    one: "string",
                    one_remove: "string",
                    two: 123,
                    two_remove: 123,
                    three: ["array1", "array2"],
                    three_remove: ["array1", "array2"],
                    four: { nested_one: "anotherString", nested_one_remove: "anotherString" },
                    four_remove: { nested_one: "anotherString", nested_one_remove: "anotherString" },
                    five: new Date(),
                    five_remove: new Date(),
                    six: Date.now(),
                    six_remove: Date.now(),
                    seven: null,
                    seven_remove: null,
                    eight: true,
                    eight_remove: true,
                    nine: false,
                    nine_remove: false,
                    ten: [NaN, Infinity, -Infinity],
                    ten_remove: [NaN, Infinity, -Infinity],
                    eleven() {},
                    eleven_remove() {}
                };
                const ReplacerTest = () => {
                    return {
                        replacer: [
                            "one", "two", "three", "four", "nested_one", "five", "six", "seven", "eight", "nine", "ten", "eleven", 0
                        ],
                        assert() { /* no-op */ }
                    };
                };
                assertStringify(obj, ReplacerTest);
            });
        });
    });
});
