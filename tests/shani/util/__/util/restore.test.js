describe("shani", "util", "__", "util", "restore", () => {
    const {
        __: { util: { restore } },
        stub: createStub
    } = adone.shani.util;

    it("restores all methods of supplied object", () => {
        const methodA = function () {};
        const methodB = function () {};
        const nonEnumerableMethod = function () {};
        const obj = { methodA, methodB, nonEnumerableMethod };
        Object.defineProperty(obj, "nonEnumerableMethod", {
            enumerable: false
        });

        createStub(obj);
        restore(obj);

        assert.equal(obj.methodA, methodA);
        assert.equal(obj.methodB, methodB);
        assert.equal(obj.nonEnumerableMethod, nonEnumerableMethod);
    });

    it("only restores restorable methods", () => {
        const stubbedMethod = function () {};
        const vanillaMethod = function () {};
        const obj = { stubbedMethod, vanillaMethod };

        createStub(obj, "stubbedMethod");
        restore(obj);

        assert.equal(obj.stubbedMethod, stubbedMethod);
    });

    it("restores a single stubbed method", () => {
        const method = function () {};
        const obj = { method };

        createStub(obj);
        restore(obj.method);

        assert.equal(obj.method, method);
    });
});
