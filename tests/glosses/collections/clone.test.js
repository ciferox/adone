const { Set, Map } = adone.collection;

describe("clone", function () {
    it("should deeply clone custom collections", function () {
        const a = new Set([new Map([["a", {}]])]);
        const b = Object.clone(a);

        // equal maps are not consistently hashed
        expect(Object.equals(a, b)).to.be.false;
        expect(a.equals(b)).to.be.false;

        expect(a.one()).to.not.be.equal(b.one());
        expect(a.one().equals(b.one())).to.be.true;
        expect(a.one().get("a")).to.not.be.equal(b.one().get("a"));
        expect(a.one().get("a")).to.be.eql(b.one().get("a"));
    });

});
