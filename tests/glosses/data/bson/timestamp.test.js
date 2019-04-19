const {
    data: { bson }
} = adone;

describe("Timestamp", () => {
    it("should have a MAX_VALUE equal to Long.MAX_UNSIGNED_VALUE", () => {
        expect(bson.Timestamp.MAX_VALUE).to.equal(bson.Long.MAX_UNSIGNED_VALUE);
    });

    it("should always be an unsigned value", () => {
        [
            new bson.Timestamp(),
            new bson.Timestamp(0xff, 0xffffffff),
            new bson.Timestamp(0xffffffff, 0xffffffff),
            new bson.Timestamp(-1, -1),
            new bson.Timestamp(new bson.Timestamp(0xffffffff, 0xffffffff)),
            new bson.Timestamp(new bson.Long(0xffffffff, 0xfffffffff, false)),
            new bson.Timestamp(new bson.Long(0xffffffff, 0xfffffffff, true))
        ].forEach((timestamp) => {
            expect(timestamp).to.have.property("unsigned", true);
        });
    });

    it("should print out an unsigned number", () => {
        const timestamp = new bson.Timestamp(0xffffffff, 0xffffffff);
        expect(timestamp.toString()).to.equal("18446744073709551615");
        expect(timestamp.toJSON()).to.deep.equal({ $timestamp: "18446744073709551615" });
        expect(timestamp.toExtendedJSON()).to.deep.equal({
            $timestamp: { t: 4294967295, i: 4294967295 }
        });
    });
});
