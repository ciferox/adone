const PouchDB = adone.database.pouch.coverage.DB;
const pouchCollate = PouchDB.collate;
const collate = pouchCollate.collate;
const normalizeKey = pouchCollate.normalizeKey;
const toIndexableString = pouchCollate.toIndexableString;
const parseIndexableString = pouchCollate.parseIndexableString;

function stringLexCompare(a, b) {

    const aLen = a.length;
    const bLen = b.length;

    let i;
    for (i = 0; i < aLen; i++) {
        if (i === bLen) {
            // b is shorter substring of a
            return 1;
        }
        const aChar = a.charAt(i);
        const bChar = b.charAt(i);
        if (aChar !== bChar) {
            return aChar < bChar ? -1 : 1;
        }
    }

    if (aLen < bLen) {
        // a is shorter substring of b
        return -1;
    }

    return 0;
}

/*
 * returns the decimal form for the given integer, i.e. writes
 * out all the digits (in base-10) instead of using scientific notation
 */
function intToDecimalForm(int) {

    const isNeg = int < 0;
    let result = "";

    do {
        const remainder = isNeg ? -Math.ceil(int % 10) : Math.floor(int % 10);

        result = remainder + result;
        int = isNeg ? Math.ceil(int / 10) : Math.floor(int / 10);
    } while (int);


    if (isNeg && result !== "0") {
        result = `-${result}`;
    }

    return result;
}

const verifyLexicalKeysSort = function (keys) {
    const lexical = keys.map((key) => {
        return [key, pouchCollate.toIndexableString(key)];
    });
    lexical.sort((a, b) => {
        return stringLexCompare(a[1], b[1]);
    });
    keys.sort(pouchCollate.collate);

    keys.forEach((expected, i) => {
        const actual = lexical[i][0];

        assert.equal(actual, expected, `expect ${JSON.stringify(actual)} is ${JSON.stringify(expected)}`);
    });
};


describe("test.collate.js", () => {
    const a = {
        array: [1, 2, 3],
        bool: true,
        string: "123",
        object: {
            a: 3,
            b: 2
        },
        number: 1
    };
    const b = {
        array: ["a", "b"],
        bool: false,
        string: "ab",
        object: {
            c: 1,
            b: 3
        },
        number: 2
    };
    const c = {
        object: {
            a: 1,
            b: 2,
            c: 3
        },
        array: [1, 2]
    };
    it("compare array to itself", () => {
        assert.equal(collate(a.array, a.array), 0);
        assert.equal(collate(b.array, b.array), 0);
        assert.equal(collate(c.array, c.array), 0);
    });
    it("compare boolean to itself", () => {
        assert.equal(collate(a.bool, a.bool), 0);
        assert.equal(collate(b.bool, b.bool), 0);
    });
    it("compare string to itself", () => {
        assert.equal(collate(a.string, a.string), 0);
        assert.equal(collate(b.string, b.string), 0);
    });
    it("compare number to itself", () => {
        assert.equal(collate(a.number, a.number), 0);
        assert.equal(collate(b.number, b.number), 0);
    });
    it("compare null to itself", () => {
        assert.equal(collate(null, null), 0);
    });
    it("compare object to itself", () => {
        assert.equal(collate(a.object, a.object), 0);
        assert.equal(collate(b.object, b.object), 0);
        assert.equal(collate(c.object, c.object), 0);
    });
    it("compare array to array", () => {
        assert.equal(collate(a.array, b.array), -1);
        assert.equal(collate(b.array, a.array), 1);
        assert.equal(collate(c.array, b.array), -1);
        assert.equal(collate(b.array, c.array), 1);
        assert.equal(collate(a.array, c.array), 1);
        assert.equal(collate(c.array, a.array), -1);
    });
    it("compare array to array", () => {
        assert.equal(collate([a.array], [b.array]), -1);
        assert.equal(collate([b.array], [a.array]), 1);
    });
    it("compare boolean to boolean", () => {
        assert.equal(collate(a.bool, b.bool), 1);
        assert.equal(collate(b.bool, a.bool), -1);
    });
    it("compare string to string", () => {
        assert.equal(collate(a.string, b.string), -1);
        assert.equal(collate(b.string, a.string), 1);
    });
    it("compare number to number", () => {
        assert.equal(collate(a.number, b.number), -1);
        assert.equal(collate(b.number, a.number), 1);
    });
    it("compare object to object", () => {
        assert.equal(collate(a.object, b.object), -1);
        assert.equal(collate(b.object, a.object), 1);
        assert.equal(collate(c.object, b.object), -1);
        assert.equal(collate(b.object, c.object), 1);
        assert.isBelow(collate(c.object, a.object), 0);
        assert.isAbove(collate(a.object, c.object), 0);
    });
    it("objects differing only in num of keys", () => {
        assert.equal(collate({ 1: 1 }, { 1: 1, 2: 2 }), -1);
        assert.equal(collate({ 1: 1, 2: 2 }, { 1: 1 }), 1);
    });
    it("compare number to null", () => {
        assert.isAbove(collate(a.number, null), 0);
    });
    it("compare number to function", () => {
        assert.notEqual(collate(a.number, () => {}), collate(a.number, () => { }));
        assert.notEqual(collate(b.number, () => {}), collate(b.number, () => { }));
        assert.notEqual(collate(() => {}, a.number), collate(() => { }, a.number));
        assert.notEqual(collate(() => {}, b.number), collate(() => { }, b.number));
    });

});

describe("normalizeKey", () => {

    it("verify key normalizations", () => {
        const normalizations = [
            [null, null],
            [NaN, null],
            [undefined, null],
            [Infinity, null],
            [-Infinity, null],
            ["", ""],
            ["foo", "foo"],
            ["0", "0"],
            ["1", "1"],
            [0, 0],
            [1, 1],
            [Number.MAX_VALUE, Number.MAX_VALUE],
            [new Date("1982-11-30T00:00:00.000Z"), "1982-11-30T00:00:00.000Z"] // Thriller release date
        ];

        normalizations.forEach((normalization) => {
            const original = normalization[0];
            const expected = normalization[1];
            const normalized = normalizeKey(original);

            const message = `check normalization of ${JSON.stringify(original)
                } to ${JSON.stringify(expected)
                }, got ${JSON.stringify(normalized)}`;
            assert.equal(normalized, expected, message);
        });
    });
});

describe("indexableString", () => {

    it("verify intToDecimalForm", () => {
        assert.equal(intToDecimalForm(0), "0");
        assert.equal(intToDecimalForm(Number.MIN_VALUE), "0");
        assert.equal(intToDecimalForm(-Number.MIN_VALUE), "0");

        const maxValueStr = "1797693134862316800886484642206468426866682428440286464" +
            "42228680066046004606080400844208228060084840044686866242482868202680268" +
            "82040288406280040662242886466688240606642242682208668042640440204020242" +
            "48802248082808208888442866208026644060866608420408868240026826626668642" +
            "46642840408646468824200860804260804068888";

        assert.equal(intToDecimalForm(Number.MAX_VALUE), maxValueStr);
        assert.equal(intToDecimalForm(-Number.MAX_VALUE), `-${maxValueStr}`);

        const simpleNums = [-3000, 3000, 322, 2308, -32, -1, 0, 1, 2, -2, -10, 10, -100, 100];

        simpleNums.forEach((simpleNum) => {
            assert.equal(intToDecimalForm(simpleNum), simpleNum.toString());
        });
    });

    it("verify toIndexableString()", () => {
        const keys = [
            null,
            false,
            true,
            -Number.MAX_VALUE,
            -300,
            -200,
            -100,
            -10,
            -2.5,
            -2,
            -1.5,
            -1,
            -0.5,
            -0.0001,
            -Number.MIN_VALUE,
            0,
            Number.MIN_VALUE,
            0.0001,
            0.1,
            0.5,
            1,
            1.5,
            2,
            3,
            10,
            15,
            100,
            200,
            300,
            Number.MAX_VALUE,
            "",
            "1",
            "10",
            "100",
            "2",
            "20",
            "[]",
            //'é',
            "foo",
            "mo",
            "moe",
            //'moé',
            //'moët et chandon',
            "moz",
            "mozilla",
            "mozilla with a super long string see how far it can go",
            "mozzy",
            [],
            [null],
            [null, null],
            [null, "foo"],
            [false],
            [false, 100],
            [true],
            [true, 100],
            [0],
            [0, null],
            [0, 1],
            [0, ""],
            [0, "foo"],
            ["", ""],
            ["foo"],
            ["foo", 1],
            {},
            { 0: null },
            { 0: false },
            { 0: true },
            { 0: 0 },
            { 0: 1 },
            { 0: "bar" },
            { 0: "foo" },
            { 0: "foo", 1: false },
            { 0: "foo", 1: true },
            { 0: "foo", 1: 0 },
            { 0: "foo", 1: "0" },
            { 0: "foo", 1: "bar" },
            { 0: "quux" },
            { 1: "foo" }
            //{ '1': 'foo', '0' : 'foo' } // key order actually matters, but node sorts them
        ];
        verifyLexicalKeysSort(keys);
    });

    it("verify toIndexableString()", () => {
        const keys = [
            ["test", "test"],
            ["test\u0000"]
        ];
        verifyLexicalKeysSort(keys);
    });

    it("verify deep normalization", () => {
        const a = {
            list: [undefined, "1982-11-30T00:00:00.000Z"],
            obj: {
                foo: null,
                date: "1982-11-30T00:00:00.000Z"
            },
            brokenList: [undefined, 1, 2, undefined, 3, 4, 5, undefined]
        };
        const b = {
            list: [null, new Date("1982-11-30T00:00:00.000Z")],
            obj: {
                foo: NaN,
                date: new Date("1982-11-30T00:00:00.000Z")
            },
            ignoredParam: undefined,
            brokenList: [null, 1, 2, null, 3, 4, 5, null]
        };

        // sanity check
        assert.equal(JSON.stringify(a), JSON.stringify(b), "stringify a,b");

        assert.equal(toIndexableString(a), toIndexableString(b), "string a,b");
        assert.equal(toIndexableString(a), toIndexableString(b), "string a,a");
        assert.equal(toIndexableString(b), toIndexableString(b), "string b,b");

        assert.deepEqual(normalizeKey(a), normalizeKey(b), "normalize a,b");
        assert.deepEqual(normalizeKey(a), normalizeKey(a), "normalize a,a");
        assert.deepEqual(normalizeKey(b), normalizeKey(b), "normalize b,b");

        assert.equal(collate(a, b), 0, "collate a,b");
        assert.equal(collate(a, a), 0, "collate a,a");
        assert.equal(collate(b, b), 0, "collate b,b");
    });

    it("verify parseIndexableString", () => {
        const keys = [null, false, true, 0, 1, -1, 9, -9, 10, -10, 0.1, -0.1, -0.01,
            100, 200, 20, -20, -200, -30, Number.MAX_VALUE, Number.MIN_VALUE,
            "foo", "", "\u0000", "\u0001", "\u0002", [1], { foo: true },
            { foo: "bar", baz: "quux", foobaz: { bar: "bar", baz: "baz", quux: { foo: "bar" } } },
            { foo: { bar: true } },
            [{ foo: "bar" }, { bar: "baz" }, {}, ["foo", "bar", "baz"]],
            [[[["foo"]], [], [["bar"]]]],
            -Number.MAX_VALUE,
            -300,
            -200,
            -100,
            -10,
            -2.5,
            -2,
            -1.5,
            -1,
            -0.5,
            -0.0001,
            -Number.MIN_VALUE,
            0,
            Number.MIN_VALUE,
            0.0001,
            0.1,
            0.5,
            1,
            1.5,
            2,
            3,
            10,
            15,
            100,
            200,
            300,
            Number.MAX_VALUE,
            "",
            "1",
            "10",
            "100",
            "2",
            "20",
            "[]",
            //'é',
            "foo",
            "mo",
            "moe",
            //'moé',
            //'moët et chandon',
            "moz",
            "mozilla",
            "mozilla with a super long string see how far it can go",
            "mozzy",
            [],
            [null],
            [null, null],
            [null, "foo"],
            [false],
            [false, 100],
            [true],
            [true, 100],
            [0],
            [0, null],
            [0, 1],
            [0, ""],
            [0, "foo"],
            ["", ""],
            ["foo"],
            ["foo", 1],
            {},
            { 0: null },
            { 0: false },
            { 0: true },
            { 0: 0 },
            { 0: 1 },
            { 0: "bar" },
            { 0: "foo" },
            { 0: "foo", 1: false },
            { 0: "foo", 1: true },
            { 0: "foo", 1: 0 },
            { 0: "foo", 1: "0" },
            { 0: "foo", 1: "bar" },
            { 0: "quux" },
            { 1: "foo" }
        ];

        keys.forEach((key) => {
            const indexableString = toIndexableString(key);
            assert.equal(JSON.stringify(parseIndexableString(indexableString)), 
                JSON.stringify(key), `check parseIndexableString for key: ${key
                }(indexable string is: ${indexableString})`);
        });
    });
    it("throws error in parseIndexableString on invalid input", () => {

        try {
            parseIndexableString("");
            assert.fail("didn't expect to parse correctly");
        } catch (err) {
            assert.exists(err);
        }
    });
});
