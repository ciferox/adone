const { transform } = adone.js.compiler.core;

describe("glosses", "js", "compiler", "plugins", "importReplace", () => {
    before(() => {
        process.chdir(__dirname);
    });

    it("in current dir", () => {
        const actual = 'import test from "hello"';
        const expected = 'import test from "./world";';

        const { code } = transform(actual, {
            plugins: [
                ["transform.importReplace", {
                    old: "hello",
                    new: adone.std.path.resolve(__dirname, "world")
                }]
            ]
        });

        assert.equal(code, expected);
    });

    it("above current dir", () => {
        const actual = 'import test from "hello"';
        const expected = 'import test from "./../world";';

        const { code } = transform(actual, {
            plugins: [
                ["transform.importReplace", {
                    old: "hello",
                    new: adone.std.path.resolve(__dirname, "..", "world")
                }]
            ]
        });

        assert.equal(code, expected);
    });

    it("below current dir", () => {
        const actual = 'import test from "hello"';
        const expected = 'import test from "./world1/world2/world3";';

        const { code } = transform(actual, {
            plugins: [
                ["transform.importReplace", {
                    old: "hello",
                    new: adone.std.path.resolve(__dirname, "world1", "world2", "world3")
                }]
            ]
        });

        assert.equal(code, expected);
    });
});
