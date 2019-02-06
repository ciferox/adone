const {
    data: { bson }
} = adone;

describe("serializeWithBuffer", () => {
    /**
     * @ignore
     */
    it("correctly serialize into buffer using serializeWithBufferAndIndex", (done) => {
    // Create a buffer
        const b = Buffer.alloc(256);
        // Serialize from index 0
        let r = bson.encodeWithBufferAndIndex({ a: 1 }, b);
        expect(11).to.equal(r);

        // Serialize from index r+1
        r = bson.encodeWithBufferAndIndex({ a: 1 }, b, {
            index: r + 1
        });
        expect(23).to.equal(r);

        // Deserialize the buffers
        let doc = bson.decode(b.slice(0, 12));
        expect({ a: 1 }).to.deep.equal(doc);
        doc = bson.decode(b.slice(12, 24));
        expect({ a: 1 }).to.deep.equal(doc);
        done();
    });

    it("correctly serialize 3 different docs into buffer using serializeWithBufferAndIndex", (done) => {
        const MAXSIZE = 1024 * 1024 * 17;
        const bf = Buffer.alloc(MAXSIZE);

        const data = [
            {
                a: 1,
                b: new Date("2019-01-01")
            },
            {
                a: 2,
                b: new Date("2019-01-02")
            },
            {
                a: 3,
                b: new Date("2019-01-03")
            }
        ];

        let idx = 0;
        data.forEach((item) => {
            idx =
        bson.encodeWithBufferAndIndex(item, bf, {
            index: idx
        }) + 1;
        });

        expect(bson.decode(bf.slice(0, 23))).to.deep.equal(data[0]);
        expect(bson.decode(bf.slice(23, 46))).to.deep.equal(data[1]);
        expect(bson.decode(bf.slice(46, 69))).to.deep.equal(data[2]);
        done();
    });
});
