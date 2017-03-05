/* global describe it */


const ObjectId = adone.data.bson.BSON.ObjectId;

describe("bson", () => {
    describe("object id", () => {
        it("should correctly handle objectId timestamps", function () {
            // var test_number = {id: ObjectI()};
            const a = ObjectId.createFromTime(1);
            expect(new Buffer([0, 0, 0, 1])).to.be.deep.equal(a.id.slice(0, 4));
            expect(1000).to.be.equal(a.getTimestamp().getTime());

            const b = new ObjectId();
            b.generationTime = 1;
            expect(new Buffer([0, 0, 0, 1])).to.be.deep.equal(b.id.slice(0, 4));
            expect(1).to.be.equal(b.generationTime);
            expect(1000).to.be.equal(b.getTimestamp().getTime());
        });

        /**
         * @ignore
         */
        it("should correctly create ObjectId from uppercase hexstring", function () {
            let a = "AAAAAAAAAAAAAAAAAAAAAAAA";
            let b = new ObjectId(a);
            let c = b.equals(a); // => false
            expect(true).to.be.equal(c);

            a = "aaaaaaaaaaaaaaaaaaaaaaaa";
            b = new ObjectId(a);
            c = b.equals(a); // => true
            expect(true).to.be.equal(c);
            expect(a).to.be.equal(b.toString());
        });

        it("should correctly create ObjectId from Buffer", function () {
            let a = "AAAAAAAAAAAAAAAAAAAAAAAA";
            let b = new ObjectId(new Buffer(a, "hex"));
            let c = b.equals(a); // => false
            expect(true).to.be.equal(c);

            a = "aaaaaaaaaaaaaaaaaaaaaaaa";
            b = new ObjectId(new Buffer(a, "hex"));
            c = b.equals(a); // => true
            expect(a).to.be.equal(b.toString());
            expect(true).to.be.equal(c);
        });

        it("should correctly allow for node.js inspect to work with ObjectId", function () {
            const a = "AAAAAAAAAAAAAAAAAAAAAAAA";
            const b = new ObjectId(a);
            adone.std.util.inspect(b);

            // var c = b.equals(a); // => false
            // test.equal(true, c);
            //
            // var a = 'aaaaaaaaaaaaaaaaaaaaaaaa';
            // var b = new ObjectId(a);
            // var c = b.equals(a); // => true
            // test.equal(true, c);
            // test.equal(a, b.toString());
        });
    });
});
