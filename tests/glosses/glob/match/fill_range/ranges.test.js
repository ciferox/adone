const exact = require("./support/exact");
const { fillRange } = adone.glob.match;

describe("ranges", () => {
    describe("alphabetical", () => {
        it("should increment alphabetical ranges", () => {
            exact(fillRange("a"), ["a"]);
            exact(fillRange("a", "a"), ["a"]);
            exact(fillRange("a", "b"), ["a", "b"]);
            exact(fillRange("a", "e"), ["a", "b", "c", "d", "e"]);
            exact(fillRange("A", "E"), ["A", "B", "C", "D", "E"]);
        });

        it("should decrement alphabetical ranges", () => {
            exact(fillRange("E", "A"), ["E", "D", "C", "B", "A"]);
            exact(fillRange("a", "C"), ["a", "`", "_", "^", "]", "\\", "[", "Z", "Y", "X", "W", "V", "U", "T", "S", "R", "Q", "P", "O", "N", "M", "L", "K", "J", "I", "H", "G", "F", "E", "D", "C"]);
            exact(fillRange("z", "m"), ["z", "y", "x", "w", "v", "u", "t", "s", "r", "q", "p", "o", "n", "m"]);
        });
    });

    describe("alphanumeric", () => {
        it("should increment alphanumeric ranges", () => {
            exact(fillRange("9", "B"), ["9", ":", ";", "<", "=", ">", "?", "@", "A", "B"]);
            exact(fillRange("A", "10"), ["A", "@", "?", ">", "=", "<", ";", ":", "9", "8", "7", "6", "5", "4", "3", "2", "1"]);
            exact(fillRange("a", "10"), ["a", "`", "_", "^", "]", "\\", "[", "Z", "Y", "X", "W", "V", "U", "T", "S", "R", "Q", "P", "O", "N", "M", "L", "K", "J", "I", "H", "G", "F", "E", "D", "C", "B", "A", "@", "?", ">", "=", "<", ";", ":", "9", "8", "7", "6", "5", "4", "3", "2", "1"]);
        });

        it("should step alphanumeric ranges", () => {
            exact(fillRange("9", "B", 3), ["9", "<", "?", "B"]);
        });

        it("should decrement alphanumeric ranges", () => {
            exact(fillRange("C", "9"), ["C", "B", "A", "@", "?", ">", "=", "<", ";", ":", "9"]);
        });
    });

    describe("ranges: letters", () => {
        it("should increment alphabetical ranges", () => {
            exact(fillRange("a"), ["a"]);
            exact(fillRange("a", "a"), ["a"]);
            exact(fillRange("a", "b"), ["a", "b"]);
            exact(fillRange("a", "e"), ["a", "b", "c", "d", "e"]);
            exact(fillRange("A", "E"), ["A", "B", "C", "D", "E"]);
        });

        it("should decrement alphabetical ranges", () => {
            exact(fillRange("E", "A"), ["E", "D", "C", "B", "A"]);
            exact(fillRange("a", "C"), ["a", "`", "_", "^", "]", "\\", "[", "Z", "Y", "X", "W", "V", "U", "T", "S", "R", "Q", "P", "O", "N", "M", "L", "K", "J", "I", "H", "G", "F", "E", "D", "C"]);
            exact(fillRange("z", "m"), ["z", "y", "x", "w", "v", "u", "t", "s", "r", "q", "p", "o", "n", "m"]);
        });
    });

    describe("numbers", () => {
        it("should increment numerical *string* ranges", () => {
            exact(fillRange("1"), ["1"]);
            exact(fillRange("1", "1"), ["1"]);
            exact(fillRange("1", "2"), ["1", "2"]);
            exact(fillRange("1", "10"), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
            exact(fillRange("1", "3"), ["1", "2", "3"]);
            exact(fillRange("5", "8"), ["5", "6", "7", "8"]);
            exact(fillRange("1", "9"), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
        });

        it("should increment numerical *number* ranges", () => {
            exact(fillRange(1, 3), [1, 2, 3]);
            exact(fillRange(1, 9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
            exact(fillRange(5, 8), [5, 6, 7, 8]);
        });

        it("should increment numerical ranges that are a combination of number and string", () => {
            exact(fillRange("1", 9), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
            exact(fillRange("2", 5), ["2", "3", "4", "5"]);
        });

        it("should decrement numerical *string* ranges", () => {
            exact(fillRange("0", "-5"), ["0", "-1", "-2", "-3", "-4", "-5"]);
            exact(fillRange("-1", "-5"), ["-1", "-2", "-3", "-4", "-5"]);
        });

        it("should decrement numerical *number* ranges", () => {
            exact(fillRange(-10, -1), [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1]);
            exact(fillRange(0, -5), [0, -1, -2, -3, -4, -5]);
        });

        it("should handle *string* ranges ranges that are positive and negative:", () => {
            exact(fillRange("9", "-4"), ["9", "8", "7", "6", "5", "4", "3", "2", "1", "0", "-1", "-2", "-3", "-4"]);
            exact(fillRange("-5", "5"), ["-5", "-4", "-3", "-2", "-1", "0", "1", "2", "3", "4", "5"]);
        });

        it("should handle *number* ranges ranges that are positive and negative:", () => {
            exact(fillRange(9, -4), [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4]);
            exact(fillRange(-5, 5), [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
        });
    });
});
