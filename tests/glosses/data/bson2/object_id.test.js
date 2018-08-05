const {
    data: { bson2 },
    std: { util }
} = adone;

const {
    ObjectId
} = bson2;

describe("data", "bson", "ObjectId", () => {
    it("should correctly handle objectId timestamps", (done) => {
        // var test_number = {id: ObjectI()};
        const a = ObjectId.createFromTime(1);
        expect(Buffer.from([0, 0, 0, 1])).to.deep.equal(a.id.slice(0, 4));
        expect(1000).to.equal(a.getTimestamp().getTime());

        const b = new ObjectId();
        b.generationTime = 1;
        expect(Buffer.from([0, 0, 0, 1])).to.deep.equal(b.id.slice(0, 4));
        expect(1).to.equal(b.generationTime);
        expect(1000).to.equal(b.getTimestamp().getTime());

        done();
    });

    /**
     * @ignore
     */
    it("should correctly create ObjectId from uppercase hexstring", (done) => {
        let a = "AAAAAAAAAAAAAAAAAAAAAAAA";
        let b = new ObjectId(a);
        let c = b.equals(a); // => false
        expect(true).to.equal(c);

        a = "aaaaaaaaaaaaaaaaaaaaaaaa";
        b = new ObjectId(a);
        c = b.equals(a); // => true
        expect(true).to.equal(c);
        expect(a).to.equal(b.toString());

        done();
    });

    /**
     * @ignore
     */
    it("should correctly create ObjectId from Buffer", (done) => {
        if (!Buffer.from) { 
return done(); 
}
        let a = "AAAAAAAAAAAAAAAAAAAAAAAA";
        let b = new ObjectId(new Buffer(a, "hex"));
        let c = b.equals(a); // => false
        expect(true).to.equal(c);

        a = "aaaaaaaaaaaaaaaaaaaaaaaa";
        b = new ObjectId(new Buffer(a, "hex"));
        c = b.equals(a); // => true
        expect(a).to.equal(b.toString());
        expect(true).to.equal(c);
        done();
    });

    /**
     * @ignore
     */
    it("should correctly allow for node.js inspect to work with ObjectId", (done) => {
        const a = "AAAAAAAAAAAAAAAAAAAAAAAA";
        const b = new ObjectId(a);
        util.inspect(b);

        // var c = b.equals(a); // => false
        // expect(true).to.equal(c);
        //
        // var a = 'aaaaaaaaaaaaaaaaaaaaaaaa';
        // var b = new ObjectId(a);
        // var c = b.equals(a); // => true
        // expect(true).to.equal(c);
        // expect(a).to.equal(b.toString());

        done();
    });
});
