const exact = require("./support/exact");
const { fillRange } = adone.glob.match;

describe("custom function for expansions:", () => {
    it("should expose the current value as the first param.", () => {
        exact(fillRange(1, 5, (value) => value), [1, 2, 3, 4, 5]);
    });

    it("should expose the character code for non-integers", () => {
        const arr = fillRange("a", "e", (code) => String.fromCharCode(code));
        exact(arr, ["a", "b", "c", "d", "e"]);
    });

    it("should expose padding `maxLength` on options", () => {
        const arr = fillRange("01", "05", (value) => {
            return String(value).padStart(String(value).length + 3, "0");
        });
        exact(arr, ["0001", "0002", "0003", "0004", "0005"]);
    });

    it("should expose the index as the fifth param.", () => {
        const arr = fillRange("a", "e", (code, index) => {
            return String.fromCharCode(code) + index;
        });
        exact(arr, ["a0", "b1", "c2", "d3", "e4"]);
    });
});
