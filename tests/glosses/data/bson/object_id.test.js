describe("data", "bson", "object id", () => {
    const { data: { bson: { ObjectID } } } = adone;

    it("should correctly handle objectId timestamps", () => {
        const a = ObjectID.createFromTime(1);
        expect(new Buffer([0, 0, 0, 1])).to.be.deep.equal(a.id.slice(0, 4));
        expect(1000).to.be.equal(a.getTimestamp().getTime());

        const b = new ObjectID();
        b.generationTime = 1;
        expect(new Buffer([0, 0, 0, 1])).to.be.deep.equal(b.id.slice(0, 4));
        expect(1).to.be.equal(b.generationTime);
        expect(1000).to.be.equal(b.getTimestamp().getTime());
    });

    it("should correctly create ObjectID from uppercase hexstring", () => {
        let a = "AAAAAAAAAAAAAAAAAAAAAAAA";
        let b = new ObjectID(a);
        let c = b.equals(a); // => false
        expect(true).to.be.equal(c);

        a = "aaaaaaaaaaaaaaaaaaaaaaaa";
        b = new ObjectID(a);
        c = b.equals(a); // => true
        expect(true).to.be.equal(c);
        expect(a).to.be.equal(b.toString());
    });

    it("should correctly create ObjectID from Buffer", () => {
        let a = "AAAAAAAAAAAAAAAAAAAAAAAA";
        let b = new ObjectID(new Buffer(a, "hex"));
        let c = b.equals(a); // => false
        expect(true).to.be.equal(c);

        a = "aaaaaaaaaaaaaaaaaaaaaaaa";
        b = new ObjectID(new Buffer(a, "hex"));
        c = b.equals(a); // => true
        expect(a).to.be.equal(b.toString());
        expect(true).to.be.equal(c);
    });
});
