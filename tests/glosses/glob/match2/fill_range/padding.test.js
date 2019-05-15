const util = require("util");
const { fillRange } = adone.glob.match;

describe("padding: numbers", () => {
    it("should pad incremented numbers:", () => {
        assert.deepEqual(fillRange("01", "03"), ["01", "02", "03"]);
        assert.deepEqual(fillRange("01", "3"), ["01", "02", "03"]);
        assert.deepEqual(fillRange("1", "03"), ["01", "02", "03"]);
        assert.deepEqual(fillRange("0001", "0003"), ["0001", "0002", "0003"]);
        assert.deepEqual(fillRange("-10", "00"), ["-10", "-09", "-08", "-07", "-06", "-05", "-04", "-03", "-02", "-01", "000"]);
        assert.deepEqual(fillRange("05", "010"), ["005", "006", "007", "008", "009", "010"]);
        assert.deepEqual(fillRange("05", "100"), ["005", "006", "007", "008", "009", "010", "011", "012", "013", "014", "015", "016", "017", "018", "019", "020", "021", "022", "023", "024", "025", "026", "027", "028", "029", "030", "031", "032", "033", "034", "035", "036", "037", "038", "039", "040", "041", "042", "043", "044", "045", "046", "047", "048", "049", "050", "051", "052", "053", "054", "055", "056", "057", "058", "059", "060", "061", "062", "063", "064", "065", "066", "067", "068", "069", "070", "071", "072", "073", "074", "075", "076", "077", "078", "079", "080", "081", "082", "083", "084", "085", "086", "087", "088", "089", "090", "091", "092", "093", "094", "095", "096", "097", "098", "099", "100"]);
    });

    it("should pad decremented numbers:", () => {
        assert.deepEqual(fillRange("03", "01"), ["03", "02", "01"]);
        assert.deepEqual(fillRange("3", "01"), ["03", "02", "01"]);
        assert.deepEqual(fillRange("003", "1"), ["003", "002", "001"]);
        assert.deepEqual(fillRange("003", "001"), ["003", "002", "001"]);
        assert.deepEqual(fillRange("3", "001"), ["003", "002", "001"]);
        assert.deepEqual(fillRange("03", "001"), ["003", "002", "001"]);
    });

    it("should pad decremented numbers with regex source string", () => {
        assert.deepEqual(fillRange("03", "01", { toRegex: true }), "0?[1-3]");
        assert.deepEqual(fillRange("3", "01", { toRegex: true }), "0?[1-3]");
        assert.deepEqual(fillRange("003", "1", { toRegex: true }), "0{0,2}[1-3]");
        assert.deepEqual(fillRange("003", "001", { toRegex: true }), "0{0,2}[1-3]");
        assert.deepEqual(fillRange("3", "001", { toRegex: true }), "0{0,2}[1-3]");
        assert.deepEqual(fillRange("03", "001", { toRegex: true }), "0{0,2}[1-3]");
        assert.deepEqual(fillRange("001", "020", { toRegex: true }), "0{0,2}[1-9]|0?1[0-9]|0?20");
    });

    it("should pad with strict zeros", () => {
        assert.deepEqual(fillRange("03", "01", { toRegex: true, strictZeros: true }), "0[1-3]");
        assert.deepEqual(fillRange("3", "01", { toRegex: true, strictZeros: true }), "0[1-3]");
        assert.deepEqual(fillRange("003", "1", { toRegex: true, strictZeros: true }), "00[1-3]");
        assert.deepEqual(fillRange("003", "001", { toRegex: true, strictZeros: true }), "00[1-3]");
        assert.deepEqual(fillRange("3", "001", { toRegex: true, strictZeros: true }), "00[1-3]");
        assert.deepEqual(fillRange("03", "001", { toRegex: true, strictZeros: true }), "00[1-3]");
        assert.deepEqual(fillRange("001", "020", { toRegex: true, strictZeros: true }), "00[1-9]|01[0-9]|020");
    });

    it("should pad stepped numbers", () => {
        assert.deepEqual(fillRange("1", "05", "3"), ["01", "04"]);
        assert.deepEqual(fillRange("1", "5", "03"), ["01", "04"]);
        assert.deepEqual(fillRange("1", "5", "0003"), ["0001", "0004"]);
        assert.deepEqual(fillRange("1", "005", "3"), ["001", "004"]);
        assert.deepEqual(fillRange("00", "1000", "200"), ["0000", "0200", "0400", "0600", "0800", "1000"]);
        assert.deepEqual(fillRange("0", "01000", "200"), ["00000", "00200", "00400", "00600", "00800", "01000"]);
        assert.deepEqual(fillRange("001", "5", "3"), ["001", "004"]);
        assert.deepEqual(fillRange("02", "10", 2), ["02", "04", "06", "08", "10"]);
        assert.deepEqual(fillRange("002", "10", 2), ["002", "004", "006", "008", "010"]);
        assert.deepEqual(fillRange("002", "010", 2), ["002", "004", "006", "008", "010"]);
        assert.deepEqual(fillRange("-04", 4, 2), ["-04", "-02", "000", "002", "004"]);
    });
});
