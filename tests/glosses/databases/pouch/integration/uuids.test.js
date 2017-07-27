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

    it("_rev generation", () => {
        let _rev = testUtils.rev();
        assert.match(_rev, /^[0-9a-fA-F]{32}$/);
    });
});
