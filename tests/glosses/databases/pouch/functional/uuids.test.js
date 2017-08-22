import * as util from "./utils";

const rfcRegexp = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const makeUuids = (count, length, radix) => {
    count = count || 1;
    let i = -1;
    const out = [];
    while (++i < count) {
        out.push(util.uuid(length, radix));
    }
    return out;
};

describe("database", "pouch", "uuid", () => {
    it("UUID RFC4122 test", () => {
        assert.equal(rfcRegexp.test(makeUuids()[0]), true, "Single UUID complies with RFC4122.");
        assert.equal(rfcRegexp.test(util.uuid()), true, "Single UUID through Pouch.utils.uuid complies with RFC4122.");
    });

    it("UUID generation uniqueness", () => {
        const count = 1000;
        const uuids = makeUuids(count);
        assert.lengthOf(adone.util.unique(uuids), count, "Generated UUIDS are unique.");
    });

    it("Test small uuid uniqness", () => {
        const length = 8;
        const count = 2000;
        const uuids = makeUuids(count, length);
        assert.lengthOf(adone.util.unique(uuids), count, "Generated small UUIDS are unique.");
    });

    it("_rev generation", () => {
        const _rev = util.rev();
        assert.match(_rev, /^[0-9a-fA-F]{32}$/);
    });
});
