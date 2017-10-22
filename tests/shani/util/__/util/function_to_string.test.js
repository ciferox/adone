describe("shani", "util", "__", "util", "functionToString", () => {
    const {
        spy: createSpy,
        __: { util: { functionToString } }
    } = adone.shani.util;

    it("returns function's displayName property", () => {
        const fn = function () {};
        fn.displayName = "Larry";

        assert.equal(functionToString.call(fn), "Larry");
    });

    it("guesses name from last call's this object", () => {
        const obj = {};
        obj.doStuff = createSpy();
        obj.doStuff.call({});
        obj.doStuff();

        assert.equal(functionToString.call(obj.doStuff), "doStuff");
    });

    it("guesses name from any call where property can be located", () => {
        const obj = {};
        const otherObj = { id: 42 };

        obj.doStuff = createSpy();
        obj.doStuff.call({});
        obj.doStuff();
        obj.doStuff.call(otherObj);

        assert.equal(functionToString.call(obj.doStuff), "doStuff");
    });
});
