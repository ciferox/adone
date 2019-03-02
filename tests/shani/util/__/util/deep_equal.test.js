describe("shani", "util", "__", "util", "deepEqual", () => {
    const {
        __: { util: { deepEqual } },
        match,
        spy: createSpy
    } = adone.shani.util;

    it("passes null", () => {
        assert(deepEqual(null, null));
    });

    it("fails null and object", () => {
        assert.isFalse(deepEqual(null, {}));
    });

    it("fails object and null", () => {
        assert.isFalse(deepEqual({}, null));
    });

    it("fails error and object", () => {
        assert.isFalse(deepEqual(new Error(), {}));
    });

    it("fails object and error", () => {
        assert.isFalse(deepEqual({}, new Error()));
    });

    it("fails regexp and object", () => {
        assert.isFalse(deepEqual(/.*/, {}));
    });

    it("fails object and regexp", () => {
        assert.isFalse(deepEqual({}, /.*/));
    });

    it("passes primitives", () => {
        assert(deepEqual(1, 1));
    });

    it("passes same object", () => {
        const object = {};

        assert(deepEqual(object, object));
    });

    it("passes same function", () => {
        const func = function () {};

        assert(deepEqual(func, func));
    });

    it("passes same array", () => {
        const arr = [];

        assert(deepEqual(arr, arr));
    });

    it("passes same regexp", () => {
        const regexp = /foo/;

        assert(deepEqual(regexp, regexp));
    });

    it("passes same error", () => {
        const error = new Error();

        assert(deepEqual(error, error));
    });

    it("passes equal arrays", () => {
        const arr1 = [1, 2, 3, "hey", "there"];
        const arr2 = [1, 2, 3, "hey", "there"];

        assert(deepEqual(arr1, arr2));
    });

    it("passes equal arrays with custom properties", () => {
        const arr1 = [1, 2, 3, "hey", "there"];
        const arr2 = [1, 2, 3, "hey", "there"];

        arr1.foo = "bar";
        arr2.foo = "bar";

        assert(deepEqual(arr1, arr2));
    });

    it.skip("fails arrays with unequal custom properties", () => {
        // important?
        const arr1 = [1, 2, 3, "hey", "there"];
        const arr2 = [1, 2, 3, "hey", "there"];

        arr1.foo = "bar";
        arr2.foo = "not bar";

        assert.isFalse(deepEqual(arr1, arr2));
    });

    it("passes equal regexps", () => {
        const regexp1 = /foo/;
        const regexp2 = /foo/;

        assert(deepEqual(regexp1, regexp2));

    });

    it("fails unequal regexps", () => {
        const regexp1 = /foo/;
        const regexp2 = /bar/;

        assert.isFalse(deepEqual(regexp1, regexp2));

    });

    it("passes equal regexps with same ignoreCase flags", () => {
        const regexp1 = /foo/i;
        const regexp2 = /foo/i;

        assert(deepEqual(regexp1, regexp2));

    });

    it("fails unequal regexps with different ignoreCase flags", () => {
        const regexp1 = /foo/i;
        const regexp2 = /foo/;

        assert.isFalse(deepEqual(regexp1, regexp2));

    });

    it("passes equal regexps with same multiline flags", () => {
        const regexp1 = /foo/m;
        const regexp2 = /foo/m;

        assert(deepEqual(regexp1, regexp2));

    });

    it("fails unequal regexps with different multiline flags", () => {
        const regexp1 = /foo/m;
        const regexp2 = /foo/;

        assert.isFalse(deepEqual(regexp1, regexp2));
    });

    it("passes equal regexps with same global flags", () => {
        const regexp1 = /foo/g;
        const regexp2 = /foo/g;

        assert(deepEqual(regexp1, regexp2));
    });

    it("fails unequal regexps with different global flags", () => {
        const regexp1 = /foo/g;
        const regexp2 = /foo/;

        assert.isFalse(deepEqual(regexp1, regexp2));
    });

    it("passes equal regexps with multiple flags", () => {
        const regexp1 = /bar/im;
        const regexp2 = /bar/im;

        assert(deepEqual(regexp1, regexp2));
    });

    it("fails unequal regexps with multiple flags", () => {
        const regexp1 = /bar/im;
        const regexp2 = /bar/ig;

        assert.isFalse(deepEqual(regexp1, regexp2));
    });

    it("fails unequal errors", () => {
        const error1 = new Error();
        const error2 = new Error();

        assert.isFalse(deepEqual(error1, error2));
    });

    it("passes NaN and NaN", () => {
        assert(deepEqual(NaN, NaN));
    });

    it("passes equal objects", () => {
        const obj1 = { a: 1, b: 2, c: 3, d: "hey", e: "there" };
        const obj2 = { b: 2, c: 3, a: 1, d: "hey", e: "there" };

        assert(deepEqual(obj1, obj2));
    });

    it("fails unequal objects with undefined properties with different names", () => {
        const obj1 = { a: 1, b: 2, c: 3 };
        const obj2 = { a: 1, b: 2, foo: undefined };

        assert.isFalse(deepEqual(obj1, obj2));
    });

    it("fails unequal objects with undefined properties with different names (different arg order)", () => {
        const obj1 = { a: 1, b: 2, foo: undefined };
        const obj2 = { a: 1, b: 2, c: 3 };

        assert.isFalse(deepEqual(obj1, obj2));
    });

    it("passes equal dates", () => {
        const date1 = new Date(2012, 3, 5);
        const date2 = new Date(2012, 3, 5);

        assert(deepEqual(date1, date2));
    });

    it("fails different dates", () => {
        const date1 = new Date(2012, 3, 5);
        const date2 = new Date(2013, 3, 5);

        assert.isFalse(deepEqual(date1, date2));
    });

    it("passes deep objects", () => {
        const func = function () {};

        const obj1 = {
            a: 1,
            b: 2,
            c: 3,
            d: "hey",
            e: "there",
            f: func,
            g: {
                a1: [1, 2, "3", {
                    prop: [func, "b"]
                }]
            }
        };

        const obj2 = {
            a: 1,
            b: 2,
            c: 3,
            d: "hey",
            e: "there",
            f: func,
            g: {
                a1: [1, 2, "3", {
                    prop: [func, "b"]
                }]
            }
        };

        assert(deepEqual(obj1, obj2));
    });

    it("passes object without prototype compared to equal object with prototype", () => {
        const obj1 = Object.create(null);
        obj1.a = 1;
        obj1.b = 2;
        obj1.c = "hey";

        const obj2 = { a: 1, b: 2, c: "hey" };

        assert(deepEqual(obj1, obj2));
    });

    it("passes object with prototype compared to equal object without prototype", () => {
        const obj1 = { a: 1, b: 2, c: "hey" };

        const obj2 = Object.create(null);
        obj2.a = 1;
        obj2.b = 2;
        obj2.c = "hey";

        assert(deepEqual(obj1, obj2));
    });

    it("passes equal objects without prototypes", () => {
        const obj1 = Object.create(null);
        obj1.a = 1;
        obj1.b = 2;
        obj1.c = "hey";

        const obj2 = Object.create(null);
        obj2.a = 1;
        obj2.b = 2;
        obj2.c = "hey";

        assert(deepEqual(obj1, obj2));
    });

    it("passes equal objects that override hasOwnProperty", () => {
        const obj1 = { a: 1, b: 2, c: "hey", hasOwnProperty: "silly" };
        const obj2 = { a: 1, b: 2, c: "hey", hasOwnProperty: "silly" };

        assert(deepEqual(obj1, obj2));
    });

    it("does not run matchers against each other when using a matcher library", () => {
        const matchDeepEqual = deepEqual.use(match);

        const spyA = createSpy();
        const matchA = match(spyA);

        const spyB = createSpy();
        const matchB = match(spyB);

        matchDeepEqual(matchA, matchB);

        assert.equal(spyA.callCount, 0);
        assert.equal(spyB.callCount, 0);
    });

    it("strictly compares instances when passed two matchers and using a matcher library", () => {
        const matchDeepEqual = deepEqual.use(match);

        const matchA = match(function a() {
            return "a";
        });

        const matchB = match(function b() {
            return "b";
        });

        const duplicateA = matchA;

        assert(matchDeepEqual(matchA, duplicateA));
        assert.isFalse(matchDeepEqual(matchA, matchB));
    });
});
