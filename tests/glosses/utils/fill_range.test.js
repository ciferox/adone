const { util: { fillRange, range, repeat } } = adone;

const toRegex = (...args) => {
    const str = fillRange(...args);
    return new RegExp(`^(${str})$`);
};
const matcher = (...args) => {
    const regex = toRegex(...args);
    return function (num) {
        return regex.test(String(num));
    };
};

const verifyRange = (min, max, from, to) => {
    const fn = matcher(min, max, { makeRe: true });
    const r = range(from, to);
    const len = r.length;
    let i = -1;

    while (++i < len) {
        const num = r[i];
        if (min <= num && num <= max) {
            assert(fn(num));
        } else {
            assert(!fn(num));
        }
    }
};

const exact = (a, b) => expect(a).to.be.deep.equal(b);

describe("util", "fillRange", () => {
    describe("validate ranges", () => {
        it("should support equal numbers", () => {
            verifyRange(1, 1, 0, 100);
            verifyRange(65443, 65443, 65000, 66000);
            verifyRange(192, 1000, 0, 1000);
        });

        it("should support large numbers", () => {
            verifyRange(100019999300000, 100020000300000, 100019999999999, 100020000100000);
        });

        it("should support repeated digits", () => {
            verifyRange(10331, 20381, 0, 99999);
        });

        it("should support repeated zeros", () => {
            verifyRange(10031, 20081, 0, 59999);
            verifyRange(10000, 20000, 0, 59999);
        });

        it("should support zero one", () => {
            verifyRange(10301, 20101, 0, 99999);
        });

        it("should support repetead ones", () => {
            verifyRange(102, 111, 0, 1000);
        });

        it("should support small diffs", () => {
            verifyRange(102, 110, 0, 1000);
            verifyRange(102, 130, 0, 1000);
        });

        it("should support random ranges", () => {
            verifyRange(4173, 7981, 0, 99999);
        });

        it("should support one digit numbers", () => {
            verifyRange(3, 7, 0, 99);
        });

        it("should support one digit at bounds", () => {
            verifyRange(1, 9, 0, 1000);
        });

        it("should support power of ten", () => {
            verifyRange(1000, 8632, 0, 99999);
        });

        it("should work with numbers of varying lengths", () => {
            verifyRange(1030, 20101, 0, 99999);
            verifyRange(13, 8632, 0, 10000);
        });

        it("should support small ranges", () => {
            verifyRange(9, 11, 0, 100);
            verifyRange(19, 21, 0, 100);
        });

        it("should support big ranges", () => {
            verifyRange(90, 98009, 0, 98999);
            verifyRange(999, 10000, 1, 20000);
        });
    });

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
                exact(fillRange(2, 10, "2"), ["2", "4", "6", "8", "10"]);
                exact(fillRange(2, 10, 1), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
                exact(fillRange(2, 10, 2), [2, 4, 6, 8, 10]);
                exact(fillRange(2, 10, 3), [2, 5, 8]);
                exact(fillRange(0, 5, 2), [0, 2, 4]);
                exact(fillRange(5, 0, 2), [5, 3, 1]);
                exact(fillRange(1, 5, 2), [1, 3, 5]);
                exact(fillRange(2, "10", "2"), ["2", "4", "6", "8", "10"]);
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
                exact(fillRange("a", "e", 2), ["a", "c", "e"]);
                exact(fillRange("E", "A", 2), ["E", "C", "A"]);
            });
        });

        describe("options: step", () => {
            it("should use the step defined on the options", () => {
                const opts = { step: 2 };
                exact(fillRange("a", "e", opts), ["a", "c", "e"]);
                exact(fillRange("E", "A", opts), ["E", "C", "A"]);
            });
        });
    });

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

            it("should adjust padding for negative numbers", () => {
                exact(fillRange("-01", "5"), ["-01", "000", "001", "002", "003", "004", "005"]);
            });
        });
    });

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
                exact(fillRange("9", "B"), ["9", "", ";", "<", "=", ">", "?", "@", "A", "B"]);
                exact(fillRange("A", "10"), ["A", "@", "?", ">", "=", "<", ";", "", "9", "8", "7", "6", "5", "4", "3", "2", "1"]);
                exact(fillRange("a", "10"), ["a", "`", "_", "^", "]", "\\", "[", "Z", "Y", "X", "W", "V", "U", "T", "S", "R", "Q", "P", "O", "N", "M", "L", "K", "J", "I", "H", "G", "F", "E", "D", "C", "B", "A", "@", "?", ">", "=", "<", ";", "", "9", "8", "7", "6", "5", "4", "3", "2", "1"]);
            });

            it("should step alphanumeric ranges", () => {
                exact(fillRange("9", "B", 3), ["9", "<", "?", "B"]);
            });

            it("should decrement alphanumeric ranges", () => {
                exact(fillRange("C", "9"), ["C", "B", "A", "@", "?", ">", "=", "<", ";", "", "9"]);
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
                exact(fillRange(1, "9"), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
            });

            it("should increment numerical *number* ranges", () => {
                exact(fillRange(1, 3), [1, 2, 3]);
                exact(fillRange(1, 9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
                exact(fillRange(5, 8), [5, 6, 7, 8]);
            });

            it("should increment numerical ranges that are a combination of number and string", () => {
                exact(fillRange(1, "9"), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
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

            it("should handle *string* ranges ranges that are positive and negative", () => {
                exact(fillRange("9", "-4"), ["9", "8", "7", "6", "5", "4", "3", "2", "1", "0", "-1", "-2", "-3", "-4"]);
                exact(fillRange("-5", "5"), ["-5", "-4", "-3", "-2", "-1", "0", "1", "2", "3", "4", "5"]);
            });

            it("should handle *number* ranges ranges that are positive and negative", () => {
                exact(fillRange(9, -4), [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4]);
                exact(fillRange(-5, 5), [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
            });
        });
    });

    describe("padding: numbers", () => {
        it("should pad incremented numbers", () => {
            exact(fillRange("1", "3"), ["1", "2", "3"]);
            exact(fillRange("01", "03"), ["01", "02", "03"]);
            exact(fillRange("01", "3"), ["01", "02", "03"]);
            exact(fillRange("1", "03"), ["01", "02", "03"]);
            exact(fillRange("0001", "0003"), ["0001", "0002", "0003"]);
            exact(fillRange("-10", "00"), ["-10", "-09", "-08", "-07", "-06", "-05", "-04", "-03", "-02", "-01", "000"]);
            exact(fillRange("05", "010"), ["005", "006", "007", "008", "009", "010"]);
            exact(fillRange("05", "100"), ["005", "006", "007", "008", "009", "010", "011", "012", "013", "014", "015", "016", "017", "018", "019", "020", "021", "022", "023", "024", "025", "026", "027", "028", "029", "030", "031", "032", "033", "034", "035", "036", "037", "038", "039", "040", "041", "042", "043", "044", "045", "046", "047", "048", "049", "050", "051", "052", "053", "054", "055", "056", "057", "058", "059", "060", "061", "062", "063", "064", "065", "066", "067", "068", "069", "070", "071", "072", "073", "074", "075", "076", "077", "078", "079", "080", "081", "082", "083", "084", "085", "086", "087", "088", "089", "090", "091", "092", "093", "094", "095", "096", "097", "098", "099", "100"]);
        });

        it("should pad decremented numbers", () => {
            exact(fillRange("03", "01"), ["03", "02", "01"]);
            exact(fillRange("3", "01"), ["03", "02", "01"]);
            exact(fillRange("003", "1"), ["003", "002", "001"]);
            exact(fillRange("003", "001"), ["003", "002", "001"]);
            exact(fillRange("3", "001"), ["003", "002", "001"]);
            exact(fillRange("03", "001"), ["003", "002", "001"]);
        });

        it("should pad stepped numbers", () => {
            exact(fillRange("1", "05", "3"), ["01", "04"]);
            exact(fillRange("1", "005", "3"), ["001", "004"]);
            exact(fillRange("00", "1000", "200"), ["0000", "0200", "0400", "0600", "0800", "1000"]);
            exact(fillRange("0", "01000", "200"), ["00000", "00200", "00400", "00600", "00800", "01000"]);
            exact(fillRange("001", "5", "3"), ["001", "004"]);
            exact(fillRange("02", "10", 2), ["02", "04", "06", "08", "10"]);
            exact(fillRange("002", "10", 2), ["002", "004", "006", "008", "010"]);
            exact(fillRange("002", "010", 2), ["002", "004", "006", "008", "010"]);
            exact(fillRange("-04", 4, 2), ["-04", "-02", "000", "002", "004"]);
        });
    });

    describe("options", () => {
        describe("options.stringify", () => {
            it("should cast values to strings", () => {
                exact(fillRange("1", "10", "1", { stringify: true }), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
                exact(fillRange(2, 10, "2", { stringify: true }), ["2", "4", "6", "8", "10"]);
                exact(fillRange(2, 10, 1, { stringify: true }), ["2", "3", "4", "5", "6", "7", "8", "9", "10"]);
                exact(fillRange(2, 10, 3, { stringify: true }), ["2", "5", "8"]);
            });
        });

        describe("options.strict", () => {
            it("should return an empty array by default", () => {
                assert.deepEqual(fillRange("1.1", "2.1"), []);
                assert.deepEqual(fillRange("1.2", "2"), []);
                assert.deepEqual(fillRange("1.20", "2"), []);
                assert.deepEqual(fillRange("1", "0f"), []);
                assert.deepEqual(fillRange("1", "10", "ff"), []);
                assert.deepEqual(fillRange("1", "10.f"), []);
                assert.deepEqual(fillRange("1", "10f"), []);
                assert.deepEqual(fillRange("1", "20", "2f"), []);
                assert.deepEqual(fillRange("1", "20", "f2"), []);
                assert.deepEqual(fillRange("1", "2f", "2"), []);
                assert.deepEqual(fillRange("1", "ff", "2"), []);
                assert.deepEqual(fillRange("1", "ff"), []);
            });

            it("should throw on invalid range arguments are invalid and options.strict is true", () => {
                assert.throws(() => {
                    fillRange("0a", "0z", { strictRanges: true });
                }, /invalid range arguments: \[ \'0a\', \'0z\' \]/);

                assert.throws(() => {
                    fillRange("", "*", 2, { strictRanges: true });
                }, /invalid range arguments: \[ \'\.\', \'\*\' \]/);

                assert.throws(() => {
                    fillRange("!", "$", { strictRanges: true });
                }, /invalid range arguments: \[ \'\!\', \'\$\' \]/);
            });

            it("should throw when args are incompatible", () => {
                assert.throws(() => {
                    fillRange("a8", 10, { strictRanges: true });
                }, /invalid range arguments: \[ \'a8\', 10 \]/);

                assert.throws(() => {
                    fillRange(1, "zz", { strictRanges: true });
                }, /invalid range arguments: \[ 1, \'zz\' \]/);
            });

            it("should throw when the step is bad", () => {
                assert.throws(() => {
                    fillRange("1", "10", "z", { strictRanges: true });
                }, /expected options\.step to be a number/);
                assert.throws(() => {
                    fillRange("a", "z", "a", { strictRanges: true });
                }, /expected options\.step to be a number/);
                assert.throws(() => {
                    fillRange("a", "z", "0a", { strictRanges: true });
                }, /expected options\.step to be a number/);
            });
        });

        describe("options.toRegex", () => {
            it("should create regex ranges for numbers in ascending order", () => {
                assert.equal(fillRange(2, 8, { toRegex: true }), "[2-8]");
                assert.equal(fillRange(2, 10, { toRegex: true }), "[2-9]|10");
                assert.equal(fillRange(2, 100, { toRegex: true }), "[2-9]|[1-9][0-9]|100");
            });

            it("should support zero-padding", () => {
                assert.equal(fillRange("002", "008", { toRegex: true }), "0{2}[2-8]");
                assert.equal(fillRange("02", "08", { toRegex: true }), "0[2-8]");
                assert.equal(fillRange("02", "10", { toRegex: true }), "0[2-9]|10");
                assert.equal(fillRange("002", "100", { toRegex: true }), "0{2}[2-9]|0[1-9][0-9]|100");
            });

            it("should support negative zero-padding", () => {
                assert.equal(fillRange("-02", "-08", { toRegex: true }), "-0*[2-8]");
                assert.equal(fillRange("-02", "100", { toRegex: true }), "-0*[12]|0{2}[0-9]|0[1-9][0-9]|100");
                assert.equal(fillRange("-02", "-100", { toRegex: true }), "-0*[2-9]|-0*[1-9][0-9]|-0*100");
                assert.equal(fillRange("-002", "-100", { toRegex: true }), "-0*[2-9]|-0*[1-9][0-9]|-0*100");
            });

            it("should create regex ranges for alpha chars defined in ascending order", () => {
                assert.equal(fillRange("a", "b", { toRegex: true }), "[a-b]");
                assert.equal(fillRange("A", "b", { toRegex: true }), "[A-b]");
                assert.equal(fillRange("Z", "a", { toRegex: true }), "[Z-a]");
            });

            it("should create regex ranges for alpha chars defined in descending order", () => {
                assert.equal(fillRange("z", "A", { toRegex: true }), "[A-z]");
            });

            it("should create regex ranges with positive and negative numbers", () => {
                assert.equal(fillRange(-10, 10, { toRegex: true }), "-[1-9]|-?10|[0-9]");
                assert.equal(fillRange(-10, 10, 2, { toRegex: true }), "0|2|4|6|8|10|-(10|8|6|4|2)");
            });

            it("should create regex ranges for numbers in descending order", () => {
                assert.equal(fillRange(8, 2, { toRegex: true }), "[2-8]");
            });

            it("should create regex ranges when a step is given", () => {
                assert.equal(fillRange(8, 2, { toRegex: true, step: 2 }), "8|6|4|2");
                assert.equal(fillRange(2, 8, { toRegex: true, step: 2 }), "2|4|6|8");
            });
        });

        describe("options.capture", () => {
            it("should wrap the returned string in parans", () => {
                assert.equal(fillRange(-10, 10, { toRegex: true, capture: true }), "(-[1-9]|-?10|[0-9])");
                assert.equal(fillRange(-10, 10, 2, { toRegex: true, capture: true }), "(0|2|4|6|8|10|-(10|8|6|4|2))");
            });
        });
    });

    describe("when options.toRegex is used", () => {
        const isMatch = (...args) => {
            const last = args.pop();
            const fn = matcher.apply(null, args);
            return fn(last);
        };

        it("should create regex ranges for numbers in ascending order", () => {
            assert(!isMatch(2, 8, { toRegex: true }, "10"));
            assert(isMatch(2, 8, { toRegex: true }, "3"));
            assert(isMatch(2, 10, { toRegex: true }, "10"));
            assert(isMatch(2, 100, { toRegex: true }, "10"));
            assert(!isMatch(2, 100, { toRegex: true }, "101"));
        });

        it("should create regex ranges with positive and negative numbers", () => {
            assert(isMatch(-10, 10, { toRegex: true }, "10"));
            assert(isMatch(-10, 10, 2, { toRegex: true }, "10"));
        });

        it("should create regex ranges for numbers in descending order", () => {
            assert(isMatch(8, 2, { toRegex: true }, "2"));
            assert(isMatch(8, 2, { toRegex: true }, "8"));
            assert(!isMatch(8, 2, { toRegex: true }, "10"));
        });

        it("should create regex ranges when a step is given", () => {
            assert(!isMatch(8, 2, { toRegex: true, step: 2 }, "10"));
            assert(!isMatch(8, 2, { toRegex: true, step: 2 }, "3"));
            assert(!isMatch(8, 2, { toRegex: true, step: 2 }, "5"));
            assert(isMatch(8, 2, { toRegex: true, step: 2 }, "8"));
            assert(!isMatch(2, 8, { toRegex: true, step: 2 }, "10"));
            assert(!isMatch(2, 8, { toRegex: true, step: 2 }, "3"));
            assert(isMatch(2, 8, { toRegex: true, step: 2 }, "8"));
        });
    });

    describe("custom function for expansions", () => {
        it("should expose the current value as the first param", () => {
            const arr = fillRange(1, 5, (val, a, b, step, idx, arr, options) => {
                return val;
            });
            exact(arr, [1, 2, 3, 4, 5]);
        });

        it("should expose the `isNumber` boolean as the second param", () => {
            const arr = fillRange("a", "e", (val, a, b, step, idx, arr, options) => {
                return options.isNumber ? String.fromCharCode(val) : val;
            });
            exact(arr, ["a", "b", "c", "d", "e"]);
        });

        it("should expose padding `maxLength` on options", () => {
            const arr = fillRange("01", "05", (val, a, b, step, idx, arr, options) => {
                // increase padding by two
                return "0".repeat(options.maxLength + 2 - val.length) + val;
            });
            exact(arr, ["0001", "0002", "0003", "0004", "0005"]);
        });

        it("should expose the index as the fifth param", () => {
            const arr = fillRange("a", "e", (val, a, b, step, idx, arr, options) => {
                return val + (idx - 1);
            });
            exact(arr, ["a0", "b1", "c2", "d3", "e4"]);
        });
    });
});
