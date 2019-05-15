const exact = require("./support/exact");
const { fillRange } = adone.glob.match;

describe("steps", () => {
    describe("steps: numbers", () => {
        it("should increment ranges using the given step", () => {
            exact(fillRange("1", "10", "1"), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
            exact(fillRange("1", "10", "2"), ["1", "3", "5", "7", "9"]);
            exact(fillRange("0", "1000", "200"), ["0", "200", "400", "600", "800", "1000"]);
            exact(fillRange("1", "10", 2), ["1", "3", "5", "7", "9"]);
            exact(fillRange("1", "20", "2"), ["1", "3", "5", "7", "9", "11", "13", "15", "17", "19"]);
            exact(fillRange("1", "20", "20"), ["1"]);
            exact(fillRange("10", "1", "2"), ["10", "8", "6", "4", "2"]);
            exact(fillRange("10", "1", "-2"), ["10", "8", "6", "4", "2"]);
            exact(fillRange("10", "1", "2"), ["10", "8", "6", "4", "2"]);
            exact(fillRange(2, 10, "2"), [2, 4, 6, 8, 10]);
            exact(fillRange(2, 10, 1), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
            exact(fillRange(2, 10, 2), [2, 4, 6, 8, 10]);
            exact(fillRange(2, 10, 3), [2, 5, 8]);
            exact(fillRange(0, 5, 2), [0, 2, 4]);
            exact(fillRange(5, 0, 2), [5, 3, 1]);
            exact(fillRange(1, 5, 2), [1, 3, 5]);
            exact(fillRange(2, "10", 2), ["2", "4", "6", "8", "10"]);
            exact(fillRange(2, 10, "2"), [2, 4, 6, 8, 10]);
            exact(fillRange(2, "10", 1), ["2", "3", "4", "5", "6", "7", "8", "9", "10"]);
            exact(fillRange(2, "10", "2"), ["2", "4", "6", "8", "10"]);
            exact(fillRange("2", 10, "3"), ["2", "5", "8"]);
        });

        it("should fill in negative ranges using the given step (strings)", () => {
            exact(fillRange("0", "-10", "-2"), ["0", "-2", "-4", "-6", "-8", "-10"]);
            exact(fillRange("-0", "-10", "-2"), ["0", "-2", "-4", "-6", "-8", "-10"]);
            exact(fillRange("-1", "-10", "-2"), ["-1", "-3", "-5", "-7", "-9"]);
            exact(fillRange("-1", "-10", "2"), ["-1", "-3", "-5", "-7", "-9"]);
            exact(fillRange("1", "10", "2"), ["1", "3", "5", "7", "9"]);
            exact(fillRange("1", "20", "2"), ["1", "3", "5", "7", "9", "11", "13", "15", "17", "19"]);
            exact(fillRange("1", "20", "20"), ["1"]);
            exact(fillRange("10", "1", "-2"), ["10", "8", "6", "4", "2"]);
            exact(fillRange("-10", "0", "2"), ["-10", "-8", "-6", "-4", "-2", "0"]);
            exact(fillRange("-10", "-0", "2"), ["-10", "-8", "-6", "-4", "-2", "0"]);
            exact(fillRange("-0", "-10", "0"), ["0", "-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8", "-9", "-10"]);
            exact(fillRange("0", "-10", "-0"), ["0", "-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8", "-9", "-10"]);
        });

        it("should fill in negative ranges using the given step (numbers)", () => {
            exact(fillRange(-10, 0, 2), [-10, -8, -6, -4, -2, 0]);
            exact(fillRange(-10, -2, 2), [-10, -8, -6, -4, -2]);
            exact(fillRange(-2, -10, 1), [-2, -3, -4, -5, -6, -7, -8, -9, -10]);
            exact(fillRange(0, -10, 2), [0, -2, -4, -6, -8, -10]);
            exact(fillRange(-2, -10, 2), [-2, -4, -6, -8, -10]);
            exact(fillRange(-2, -10, 3), [-2, -5, -8]);
            exact(fillRange(-9, 9, 3), [-9, -6, -3, 0, 3, 6, 9]);
        });

        it("should fill in negative ranges when negative zero is passed", () => {
            exact(fillRange(-10, -0, 2), [-10, -8, -6, -4, -2, 0]);
            exact(fillRange(-0, -10, 2), [0, -2, -4, -6, -8, -10]);
        });
    });

    describe("steps: letters", () => {
        it("should use increments with alphabetical ranges", () => {
            exact(fillRange("z", "a", -2), ["z", "x", "v", "t", "r", "p", "n", "l", "j", "h", "f", "d", "b"]);
            exact(fillRange("a", "e", 2), ["a", "c", "e"]);
            exact(fillRange("E", "A", 2), ["E", "C", "A"]);
        });
    });

    describe("options: step", () => {
        it("should use the step defined on the options:", () => {
            const options = { step: 2 };
            exact(fillRange("a", "e", options), ["a", "c", "e"]);
            exact(fillRange("E", "A", options), ["E", "C", "A"]);
        });
    });
});
