require("./node.setup");
/* jshint maxlen: false */
const rfcRegexp = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function makeUuids(count, length, radix) {
    count = count || 1;
    let i = -1;
    const out = [];
    while (++i < count) {
        out.push(testUtils.uuid(length, radix));
    }
    return out;
}

describe("test.uuid.js", () => {

    it("UUID RFC4122 test", () => {
        assert.equal(rfcRegexp.test(makeUuids()[0]), true, "Single UUID complies with RFC4122.");
        assert.equal(rfcRegexp.test(testUtils.uuid()), true, "Single UUID through Pouch.utils.uuid complies with RFC4122.");
    });

    it("UUID generation uniqueness", () => {
        const count = 1000;
        const uuids = makeUuids(count);
        assert.lengthOf(testUtils.eliminateDuplicates(uuids), count, "Generated UUIDS are unique.");
    });

    it("Test small uuid uniqness", () => {
        const length = 8;
        const count = 2000;
        const uuids = makeUuids(count, length);
        assert.lengthOf(testUtils.eliminateDuplicates(uuids), count, "Generated small UUIDS are unique.");
    });

    it("Test custom length", () => {
        const length = 32;
        const count = 10;
        const uuids = makeUuids(count, length);
        // Test single UUID wrapper
        uuids.push(testUtils.uuid(length));
        uuids.map((uuid) => {
            assert.lengthOf(uuid, length, "UUID length is correct.");
        });
    });

    it("Test custom length, redix", () => {
        const length = 32;
        const count = 10;
        const radix = 5;
        const uuids = makeUuids(count, length, radix);
        // Test single UUID wrapper
        uuids.push(testUtils.uuid(length, radix));
        uuids.map((uuid) => {
            const nums = uuid.split("").map((character) => {
                return parseInt(character, radix);
            });
            const max = Math.max.apply(Math, nums);
            const min = Math.min.apply(Math, nums);
            assert.isBelow(max, radix, "Maximum character is less than radix");
            assert.isAtLeast(min, 0, "Min character is greater than or equal to 0");
        });
    });
});
