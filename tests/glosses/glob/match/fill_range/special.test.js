const exact = require("./support/exact");
const { fillRange } = adone.glob.match;

describe("special cases", () => {
    describe("negative zero", () => {
        it("should handle negative zero", () => {
            exact(fillRange("-5", "-0", "-1"), ["-5", "-4", "-3", "-2", "-1", "0"]);
            exact(fillRange("1", "-0", 1), ["1", "0"]);
            exact(fillRange("1", "-0", 0), ["1", "0"]);
            exact(fillRange("1", "-0", "0"), ["1", "0"]);
            exact(fillRange("1", "-0", "1"), ["1", "0"]);
            exact(fillRange("-0", "-0", "1"), ["0"]);
            exact(fillRange("-0", "0", "1"), ["0"]);
            exact(fillRange("-0", "5", "1"), ["0", "1", "2", "3", "4", "5"]);
            exact(fillRange(-0, 5), [0, 1, 2, 3, 4, 5]);
            exact(fillRange(5, -0, 5), [5, 0]);
            exact(fillRange(5, -0, 2), [5, 3, 1]);
            exact(fillRange(0, 5, 2), [0, 2, 4]);
        });

        it("should adjust padding for negative numbers:", () => {
            exact(fillRange("-01", "5"), ["-01", "000", "001", "002", "003", "004", "005"]);
        });
    });
});
