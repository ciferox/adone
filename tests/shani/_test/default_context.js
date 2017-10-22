import $assert from "assert";

describe("Contexts", () => {
    it("Buffer", () => {
        $assert.ok(Buffer);
    });

    it("setTimeout && clearTimeout", () => {
        $assert.ok(setTimeout);
        $assert.ok(clearTimeout);

    });

    it("setInterval && clearInterval", () => {
        $assert.ok(setInterval);
        $assert.ok(clearInterval);
    });

    it("setImmediate && clearImmediate", () => {
        $assert.ok(setImmediate);
        $assert.ok(clearImmediate);
    });

    it("console", () => {
        $assert.ok(console);
        $assert.ok(console.log);
        $assert.ok(console.error);
        $assert.ok(console.dir);
    });

    it("process", () => {
        $assert.ok(process);
    });

    it("mock", () => {
        $assert.ok(spy);
        $assert.ok(stub);
        $assert.ok(mock);
        $assert.ok(match);
    });

    it("assert", () => {
        $assert.ok(assert);
        $assert.ok(expect);
    });

    it("FS", () => {
        $assert.ok(FS);
    });

    it("the $ object", () => {
        $assert.ok($);
        $assert.ok($.spy === spy);
        $assert.ok($.stub === stub);
        $assert.ok($.mock === mock);
        $assert.ok($.match === match);
        $assert.ok($.assert === assert);
        $assert.ok($.expect === expect);
        $assert.ok($.FS === FS);
    });
});
