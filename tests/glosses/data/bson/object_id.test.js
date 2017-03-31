/* global describe it */


const ObjectID = adone.data.bson.ObjectID;

describe("bson", () => {
    describe("object id", () => {
        it("should correctly handle objectId timestamps", function () {
            // var test_number = {id: ObjectI()};
            const a = ObjectID.createFromTime(1);
            expect(new Buffer([0, 0, 0, 1])).to.be.deep.equal(a.id.slice(0, 4));
            expect(1000).to.be.equal(a.getTimestamp().getTime());

            const b = new ObjectID();
            b.generationTime = 1;
            expect(new Buffer([0, 0, 0, 1])).to.be.deep.equal(b.id.slice(0, 4));
            expect(1).to.be.equal(b.generationTime);
            expect(1000).to.be.equal(b.getTimestamp().getTime());
        });

        /**
         * @ignore
         */
        it("should correctly create ObjectID from uppercase hexstring", function () {
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

        it("should correctly create ObjectID from Buffer", function () {
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

        it("should correctly allow for node.js inspect to work with ObjectID", function () {
            const a = "AAAAAAAAAAAAAAAAAAAAAAAA";
            const b = new ObjectID(a);
            adone.std.util.inspect(b);

            // var c = b.equals(a); // => false
            // test.equal(true, c);
            //
            // var a = 'aaaaaaaaaaaaaaaaaaaaaaaa';
            // var b = new ObjectID(a);
            // var c = b.equals(a); // => true
            // test.equal(true, c);
            // test.equal(a, b.toString());
        });
    });
});
