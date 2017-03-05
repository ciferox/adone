/* global describe it */

import M from "adone/glosses/data/bson/lib/map";
const { BSON } = adone.data.bson;

function createBSON() {
    return new BSON([BSON.Binary, BSON.Code, BSON.DBRef, BSON.Decimal128,
        BSON.Double, BSON.Int32, BSON.Long, BSON.Map, BSON.MaxKey, BSON.MinKey,
        BSON.ObjectId, BSON.BSONRegExp, BSON.Symbol, BSON.Timestamp]);
}

describe("bson", () => {
    describe("map", () => {
        it("should correctly exercise the map", function () {
            const m = new M([["a", 1], ["b", 2]]);
            expect(m.has("a")).to.be.ok;
            expect(m.has("b")).to.be.ok;
            expect(1).to.be.equal(m.get("a"));
            expect(2).to.be.equal(m.get("b"));
            expect(m.set("a", 3) === m).to.be.ok;
            expect(m.has("a")).to.be.ok;
            expect(3).to.be.equal(m.get("a"));

            // Get the values
            let iterator = m.values();
            expect(3).to.be.equal(iterator.next().value);
            expect(2).to.be.equal(iterator.next().value);
            expect(true).to.be.equal(iterator.next().done);

            // Get the entries
            iterator = m.entries();
            expect(["a", 3]).to.be.deep.equal(iterator.next().value);
            expect(["b", 2]).to.be.deep.equal(iterator.next().value);
            expect(true).to.be.deep.equal(iterator.next().done);

            // Get the keys
            iterator = m.keys();
            expect("a").to.be.deep.equal(iterator.next().value);
            expect("b").to.be.deep.equal(iterator.next().value);
            expect(true).to.be.deep.equal(iterator.next().done);

            // Collect values
            const values = [];
            // Get entries forEach
            m.forEach(function (value, key, map) {
                expect(value !== null).to.be.ok;
                expect(key !== null).to.be.ok;
                expect(map !== null).to.be.ok;
                expect(m === this).to.be.ok;
                values.push([key, value]);
            }, m);

            expect([["a", 3], ["b", 2]]).to.be.deep.equal(values);

            // Modify the state
            expect(true).to.be.equal(m.delete("a"));
            m.set("c", 5);
            m.set("a", 7);

            // Validate order is preserved
            // Get the keys
            iterator = m.keys();
            expect("b").to.be.deep.equal(iterator.next().value);
            expect("c").to.be.deep.equal(iterator.next().value);
            expect("a").to.be.deep.equal(iterator.next().value);
            expect(true).to.be.deep.equal(iterator.next().done);

            // Get the entries
            iterator = m.entries();
            expect(["b", 2]).to.be.deep.equal(iterator.next().value);
            expect(["c", 5]).to.be.deep.equal(iterator.next().value);
            expect(["a", 7]).to.be.deep.equal(iterator.next().value);
            expect(true).to.be.deep.equal(iterator.next().done);

            // Get the values
            iterator = m.values();
            expect(2).to.be.equal(iterator.next().value);
            expect(5).to.be.equal(iterator.next().value);
            expect(7).to.be.equal(iterator.next().value);
            expect(true).to.be.equal(iterator.next().done);
        });

        /**
         * @ignore
         */
        it("should serialize a map", function () {
            // Serialize top level map only
            let m = new M([["a", 1], ["b", 2]]);
            let bson = createBSON();
            // Serialize the map
            let data = bson.serialize(m, false, true);
            // Deserialize the data
            let object = bson.deserialize(data);
            expect({ a: 1, b: 2 }).to.be.deep.equal(object);

            // Serialize nested maps
            const m1 = new M([["a", 1], ["b", 2]]);
            m = new M([["c", m1]]);
            // Serialize the map
            data = bson.serialize(m, false, true);
            // Deserialize the data
            object = bson.deserialize(data);
            expect({ c: { a: 1, b: 2 } }).to.be.deep.equal(object);


            // Serialize top level map only
            m = new M([["1", 1], ["0", 2]]);
            bson = createBSON();
            // Serialize the map, validating that the order in the resulting BSON is preserved
            data = bson.serialize(m, false, true);
            expect("13000000103100010000001030000200000000").to.be.equal(data.toString("hex"));
        });

        it("should not crash due to object that looks like map", function () {
            if (typeof global.Map === "undefined") {
                return;
            }

            // Serialize top level map only
            const m = { entries: "test" };
            const bson = createBSON();
            // Serialize the map
            const data = bson.serialize(m, false, true);
            // Deserialize the data
            const object = bson.deserialize(data);
            expect(m).to.be.deep.equal(object);
        });
    });
});
