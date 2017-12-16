const start = require("./common");
const mongoose = adone.odm;
const DocumentObjectId = mongoose.Types.ObjectId;
const Schema = mongoose.Schema;
const random = adone.odm.utils.random;
const { Query } = adone.odm;

const {
    is
} = adone;

/**
 * Test.
 */

describe("Query", () => {
    let Comment;
    let Product;
    let p1;

    before(() => {
        Comment = new Schema({
            text: String
        });

        Product = new Schema({
            tags: {}, // mixed
            array: Array,
            ids: [Schema.ObjectId],
            strings: [String],
            numbers: [Number],
            comments: [Comment]
        });

        mongoose.model("Product", Product);
        mongoose.model("Comment", Comment);
    });

    before(() => {
        const Prod = mongoose.model("Product");
        p1 = new Prod();
    });

    describe("constructor", () => {
        it("should not corrupt options", (done) => {
            const opts = {};
            const query = new Query({}, opts, null, p1.collection);
            assert.notEqual(opts, query._mongooseOptions);
            done();
        });
    });

    describe("select", () => {
        it("(object)", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.select({ a: 1, b: 1, c: 0 });
            assert.deepEqual(query._fields, { a: 1, b: 1, c: 0 });
            done();
        });

        it("(string)", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.select(" a  b -c ");
            assert.deepEqual(query._fields, { a: 1, b: 1, c: 0 });
            done();
        });

        it('("a","b","c")', (done) => {
            assert.throws(() => {
                const query = new Query({}, {}, null, p1.collection);
                query.select("a", "b", "c");
            }, /Invalid select/);
            done();
        });

        it("should not overwrite fields set in prior calls", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.select("a");
            assert.deepEqual(query._fields, { a: 1 });
            query.select("b");
            assert.deepEqual(query._fields, { a: 1, b: 1 });
            query.select({ c: 0 });
            assert.deepEqual(query._fields, { a: 1, b: 1, c: 0 });
            query.select("-d");
            assert.deepEqual(query._fields, { a: 1, b: 1, c: 0, d: 0 });
            done();
        });
    });

    describe("where", () => {
        it("works", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("name", "guillermo");
            assert.deepEqual(query._conditions, { name: "guillermo" });
            query.where("a");
            query.equals("b");
            assert.deepEqual(query._conditions, { name: "guillermo", a: "b" });
            done();
        });
        it("throws if non-string or non-object path is passed", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            assert.throws(() => {
                query.where(50);
            });
            assert.throws(() => {
                query.where([]);
            });
            done();
        });
        it("does not throw when 0 args passed", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            assert.doesNotThrow(() => {
                query.where();
            });
            done();
        });
    });

    describe("equals", () => {
        it("works", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("name").equals("guillermo");
            assert.deepEqual(query._conditions, { name: "guillermo" });
            done();
        });
    });

    describe("gte", () => {
        it("with 2 args", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.gte("age", 18);
            assert.deepEqual(query._conditions, { age: { $gte: 18 } });
            done();
        });
        it("with 1 arg", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").gte(18);
            assert.deepEqual(query._conditions, { age: { $gte: 18 } });
            done();
        });
    });

    describe("gt", () => {
        it("with 1 arg", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").gt(17);
            assert.deepEqual(query._conditions, { age: { $gt: 17 } });
            done();
        });
        it("with 2 args", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.gt("age", 17);
            assert.deepEqual(query._conditions, { age: { $gt: 17 } });
            done();
        });
    });

    describe("lte", () => {
        it("with 1 arg", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").lte(65);
            assert.deepEqual(query._conditions, { age: { $lte: 65 } });
            done();
        });
        it("with 2 args", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.lte("age", 65);
            assert.deepEqual(query._conditions, { age: { $lte: 65 } });
            done();
        });
    });

    describe("lt", () => {
        it("with 1 arg", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").lt(66);
            assert.deepEqual(query._conditions, { age: { $lt: 66 } });
            done();
        });
        it("with 2 args", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.lt("age", 66);
            assert.deepEqual(query._conditions, { age: { $lt: 66 } });
            done();
        });
    });

    describe("combined", () => {
        describe("lt and gt", () => {
            it("works", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.where("age").lt(66).gt(17);
                assert.deepEqual(query._conditions, { age: { $lt: 66, $gt: 17 } });
                done();
            });
        });
    });

    describe("tl on one path and gt on another", () => {
        it("works", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query
                .where("age").lt(66)
                .where("height").gt(5);
            assert.deepEqual(query._conditions, { age: { $lt: 66 }, height: { $gt: 5 } });
            done();
        });
    });

    describe("ne", () => {
        it("with 1 arg", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").ne(21);
            assert.deepEqual(query._conditions, { age: { $ne: 21 } });
            done();
        });
        it("with 2 args", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.ne("age", 21);
            assert.deepEqual(query._conditions, { age: { $ne: 21 } });
            done();
        });
    });

    describe("in", () => {
        it("with 1 arg", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").in([21, 25, 30]);
            assert.deepEqual(query._conditions, { age: { $in: [21, 25, 30] } });
            done();
        });
        it("with 2 args", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.in("age", [21, 25, 30]);
            assert.deepEqual(query._conditions, { age: { $in: [21, 25, 30] } });
            done();
        });
        it("where a non-array value no via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.in("age", 21);
            assert.deepEqual(query._conditions, { age: { $in: 21 } });
            done();
        });
        it("where a non-array value via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").in(21);
            assert.deepEqual(query._conditions, { age: { $in: 21 } });
            done();
        });
    });

    describe("nin", () => {
        it("with 1 arg", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").nin([21, 25, 30]);
            assert.deepEqual(query._conditions, { age: { $nin: [21, 25, 30] } });
            done();
        });
        it("with 2 args", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.nin("age", [21, 25, 30]);
            assert.deepEqual(query._conditions, { age: { $nin: [21, 25, 30] } });
            done();
        });
        it("with a non-array value not via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.nin("age", 21);
            assert.deepEqual(query._conditions, { age: { $nin: 21 } });
            done();
        });
        it("with a non-array value via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").nin(21);
            assert.deepEqual(query._conditions, { age: { $nin: 21 } });
            done();
        });
    });

    describe("mod", () => {
        it("not via where, where [a, b] param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.mod("age", [5, 2]);
            assert.deepEqual(query._conditions, { age: { $mod: [5, 2] } });
            done();
        });
        it("not via where, where a and b params", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.mod("age", 5, 2);
            assert.deepEqual(query._conditions, { age: { $mod: [5, 2] } });
            done();
        });
        it("via where, where [a, b] param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").mod([5, 2]);
            assert.deepEqual(query._conditions, { age: { $mod: [5, 2] } });
            done();
        });
        it("via where, where a and b params", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("age").mod(5, 2);
            assert.deepEqual(query._conditions, { age: { $mod: [5, 2] } });
            done();
        });
    });

    describe("near", () => {
        it("via where, where { center :[lat, long]} param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("checkin").near({ center: [40, -72] });
            assert.deepEqual(query._conditions, { checkin: { $near: [40, -72] } });
            done();
        });
        it("via where, where [lat, long] param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("checkin").near([40, -72]);
            assert.deepEqual(query._conditions, { checkin: { $near: [40, -72] } });
            done();
        });
        it("via where, where lat and long params", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("checkin").near(40, -72);
            assert.deepEqual(query._conditions, { checkin: { $near: [40, -72] } });
            done();
        });
        it("not via where, where [lat, long] param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.near("checkin", [40, -72]);
            assert.deepEqual(query._conditions, { checkin: { $near: [40, -72] } });
            done();
        });
        it("not via where, where lat and long params", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.near("checkin", 40, -72);
            assert.deepEqual(query._conditions, { checkin: { $near: [40, -72] } });
            done();
        });
        it("via where, where GeoJSON param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("numbers").near({ center: { type: "Point", coordinates: [40, -72] } });
            assert.deepEqual(query._conditions, { numbers: { $near: { $geometry: { type: "Point", coordinates: [40, -72] } } } });
            assert.doesNotThrow(() => {
                query.cast(p1.constructor);
            });
            done();
        });
        it("with path, where GeoJSON param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.near("loc", { center: { type: "Point", coordinates: [40, -72] } });
            assert.deepEqual(query._conditions, { loc: { $near: { $geometry: { type: "Point", coordinates: [40, -72] } } } });
            done();
        });
    });

    describe("nearSphere", () => {
        it("via where, where [lat, long] param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("checkin").nearSphere([40, -72]);
            assert.deepEqual(query._conditions, { checkin: { $nearSphere: [40, -72] } });
            done();
        });
        it("via where, where lat and long params", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("checkin").nearSphere(40, -72);
            assert.deepEqual(query._conditions, { checkin: { $nearSphere: [40, -72] } });
            done();
        });
        it("not via where, where [lat, long] param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.nearSphere("checkin", [40, -72]);
            assert.deepEqual(query._conditions, { checkin: { $nearSphere: [40, -72] } });
            done();
        });
        it("not via where, where lat and long params", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.nearSphere("checkin", 40, -72);
            assert.deepEqual(query._conditions, { checkin: { $nearSphere: [40, -72] } });
            done();
        });

        it("via where, with object", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("checkin").nearSphere({ center: [20, 23], maxDistance: 2 });
            assert.deepEqual(query._conditions, { checkin: { $nearSphere: [20, 23], $maxDistance: 2 } });
            done();
        });

        it("via where, where GeoJSON param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("numbers").nearSphere({ center: { type: "Point", coordinates: [40, -72] } });
            assert.deepEqual(query._conditions, { numbers: { $nearSphere: { $geometry: { type: "Point", coordinates: [40, -72] } } } });
            assert.doesNotThrow(() => {
                query.cast(p1.constructor);
            });
            done();
        });

        it("with path, with GeoJSON", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.nearSphere("numbers", { center: { type: "Point", coordinates: [40, -72] } });
            assert.deepEqual(query._conditions, { numbers: { $nearSphere: { $geometry: { type: "Point", coordinates: [40, -72] } } } });
            assert.doesNotThrow(() => {
                query.cast(p1.constructor);
            });
            done();
        });
    });

    describe("maxDistance", () => {
        it("via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("checkin").near([40, -72]).maxDistance(1);
            assert.deepEqual(query._conditions, { checkin: { $near: [40, -72], $maxDistance: 1 } });
            done();
        });
    });

    describe("within", () => {
        describe("box", () => {
            it("via where", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.where("gps").within().box({ ll: [5, 25], ur: [10, 30] });
                const match = { gps: { $within: { $box: [[5, 25], [10, 30]] } } };
                if (Query.use$geoWithin) {
                    match.gps.$geoWithin = match.gps.$within;
                    delete match.gps.$within;
                }
                assert.deepEqual(query._conditions, match);
                done();
            });
            it("via where, no object", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.where("gps").within().box([5, 25], [10, 30]);
                const match = { gps: { $within: { $box: [[5, 25], [10, 30]] } } };
                if (Query.use$geoWithin) {
                    match.gps.$geoWithin = match.gps.$within;
                    delete match.gps.$within;
                }
                assert.deepEqual(query._conditions, match);
                done();
            });
        });

        describe("center", () => {
            it("via where", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.where("gps").within().center({ center: [5, 25], radius: 5 });
                const match = { gps: { $within: { $center: [[5, 25], 5] } } };
                if (Query.use$geoWithin) {
                    match.gps.$geoWithin = match.gps.$within;
                    delete match.gps.$within;
                }
                assert.deepEqual(query._conditions, match);
                done();
            });
        });

        describe("centerSphere", () => {
            it("via where", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.where("gps").within().centerSphere({ center: [5, 25], radius: 5 });
                const match = { gps: { $within: { $centerSphere: [[5, 25], 5] } } };
                if (Query.use$geoWithin) {
                    match.gps.$geoWithin = match.gps.$within;
                    delete match.gps.$within;
                }
                assert.deepEqual(query._conditions, match);
                done();
            });
        });

        describe("polygon", () => {
            it("via where", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.where("gps").within().polygon({ a: { x: 10, y: 20 }, b: { x: 15, y: 25 }, c: { x: 20, y: 20 } });
                const match = { gps: { $within: { $polygon: [{ a: { x: 10, y: 20 }, b: { x: 15, y: 25 }, c: { x: 20, y: 20 } }] } } };
                if (Query.use$geoWithin) {
                    match.gps.$geoWithin = match.gps.$within;
                    delete match.gps.$within;
                }
                assert.deepEqual(query._conditions, match);
                done();
            });
        });
    });

    describe("exists", () => {
        it("0 args via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("username").exists();
            assert.deepEqual(query._conditions, { username: { $exists: true } });
            done();
        });
        it("1 arg via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("username").exists(false);
            assert.deepEqual(query._conditions, { username: { $exists: false } });
            done();
        });
        it("where 1 argument not via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.exists("username");
            assert.deepEqual(query._conditions, { username: { $exists: true } });
            done();
        });

        it("where 2 args not via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.exists("username", false);
            assert.deepEqual(query._conditions, { username: { $exists: false } });
            done();
        });
    });

    describe("all", () => {
        it("via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("pets").all(["dog", "cat", "ferret"]);
            assert.deepEqual(query._conditions, { pets: { $all: ["dog", "cat", "ferret"] } });
            done();
        });
        it("not via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.all("pets", ["dog", "cat", "ferret"]);
            assert.deepEqual(query._conditions, { pets: { $all: ["dog", "cat", "ferret"] } });
            done();
        });
    });

    describe("find", () => {
        it("strict array equivalence condition v", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.find({ pets: ["dog", "cat", "ferret"] });
            assert.deepEqual(query._conditions, { pets: ["dog", "cat", "ferret"] });
            done();
        });
        it("with no args", (done) => {
            let threw = false;
            const q = new Query({}, {}, null, p1.collection);

            try {
                q.find();
            } catch (err) {
                threw = true;
            }

            assert.ok(!threw);
            done();
        });
        it("works with overwriting previous object args (1176)", (done) => {
            const q = new Query({}, {}, null, p1.collection);
            assert.doesNotThrow(() => {
                q.find({ age: { $lt: 30 } });
                q.find({ age: 20 }); // overwrite
            });
            assert.deepEqual({ age: 20 }, q._conditions);
            done();
        });
    });

    describe("size", () => {
        it("via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("collection").size(5);
            assert.deepEqual(query._conditions, { collection: { $size: 5 } });
            done();
        });
        it("not via where", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.size("collection", 5);
            assert.deepEqual(query._conditions, { collection: { $size: 5 } });
            done();
        });
    });

    describe("slice", () => {
        it("where and positive limit param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("collection").slice(5);
            assert.deepEqual(query._fields, { collection: { $slice: 5 } });
            done();
        });
        it("where just negative limit param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("collection").slice(-5);
            assert.deepEqual(query._fields, { collection: { $slice: -5 } });
            done();
        });
        it("where [skip, limit] param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("collection").slice([14, 10]); // Return the 15th through 25th
            assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });
            done();
        });
        it("where skip and limit params", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("collection").slice(14, 10); // Return the 15th through 25th
            assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });
            done();
        });
        it("where just positive limit param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("collection").slice(5);
            assert.deepEqual(query._fields, { collection: { $slice: 5 } });
            done();
        });
        it("where just negative limit param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("collection").slice(-5);
            assert.deepEqual(query._fields, { collection: { $slice: -5 } });
            done();
        });
        it("where the [skip, limit] param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("collection").slice([14, 10]); // Return the 15th through 25th
            assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });
            done();
        });
        it("where the skip and limit params", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.where("collection").slice(14, 10); // Return the 15th through 25th
            assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });
            done();
        });
        it("not via where, with just positive limit param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.slice("collection", 5);
            assert.deepEqual(query._fields, { collection: { $slice: 5 } });
            done();
        });
        it("not via where, where just negative limit param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.slice("collection", -5);
            assert.deepEqual(query._fields, { collection: { $slice: -5 } });
            done();
        });
        it("not via where, where [skip, limit] param", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.slice("collection", [14, 10]); // Return the 15th through 25th
            assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });
            done();
        });
        it("not via where, where skip and limit params", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.slice("collection", 14, 10); // Return the 15th through 25th
            assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });
            done();
        });
    });

    describe("elemMatch", () => {
        describe("not via where", () => {
            it("works", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.elemMatch("comments", { author: "bnoguchi", votes: { $gte: 5 } });
                assert.deepEqual(query._conditions, { comments: { $elemMatch: { author: "bnoguchi", votes: { $gte: 5 } } } });
                done();
            });
            it("where block notation", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.elemMatch("comments", (elem) => {
                    elem.where("author", "bnoguchi");
                    elem.where("votes").gte(5);
                });
                assert.deepEqual(query._conditions, { comments: { $elemMatch: { author: "bnoguchi", votes: { $gte: 5 } } } });
                done();
            });
        });
        describe("via where", () => {
            it("works", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.where("comments").elemMatch({ author: "bnoguchi", votes: { $gte: 5 } });
                assert.deepEqual(query._conditions, { comments: { $elemMatch: { author: "bnoguchi", votes: { $gte: 5 } } } });
                done();
            });
            it("where block notation", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.where("comments").elemMatch((elem) => {
                    elem.where("author", "bnoguchi");
                    elem.where("votes").gte(5);
                });
                assert.deepEqual(query._conditions, { comments: { $elemMatch: { author: "bnoguchi", votes: { $gte: 5 } } } });
                done();
            });
        });
    });

    describe("$where", () => {
        it("function arg", (done) => {
            const query = new Query({}, {}, null, p1.collection);

            function filter() {
                return this.lastName === this.firstName;
            }

            query.$where(filter);
            assert.deepEqual(query._conditions, { $where: filter });
            done();
        });
        it("string arg", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.$where("this.lastName === this.firstName");
            assert.deepEqual(query._conditions, { $where: "this.lastName === this.firstName" });
            done();
        });
    });

    describe("limit", () => {
        it("works", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.limit(5);
            assert.equal(query.options.limit, 5);
            done();
        });
    });

    describe("skip", () => {
        it("works", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            query.skip(9);
            assert.equal(query.options.skip, 9);
            done();
        });
    });

    describe("sort", () => {
        it("works", (done) => {
            let query = new Query({}, {}, null, p1.collection);
            query.sort("a -c b");
            assert.deepEqual(query.options.sort, { a: 1, c: -1, b: 1 });
            query = new Query({}, {}, null, p1.collection);
            query.sort({ a: 1, c: -1, b: "asc", e: "descending", f: "ascending" });
            assert.deepEqual(query.options.sort, { a: 1, c: -1, b: 1, e: -1, f: 1 });

            if (!is.undefined(global.Map)) {
                query = new Query({}, {}, null, p1.collection);
                query.sort(new global.Map().set("a", 1).set("b", 2));
                assert.equal(query.options.sort.get("a"), 1);
                assert.equal(query.options.sort.get("b"), 2);
            }

            query = new Query({}, {}, null, p1.collection);
            let e;

            try {
                query.sort(["a", 1]);
            } catch (err) {
                e = err;
            }

            assert.ok(e, "uh oh. no error was thrown");
            assert.equal(e.message, "Invalid sort() argument, must be array of arrays");

            e = undefined;
            try {
                query.sort("a", 1, "c", -1, "b", 1);
            } catch (err) {
                e = err;
            }
            assert.ok(e, "uh oh. no error was thrown");
            assert.equal(e.message, "sort() only takes 1 Argument");
            done();
        });
    });

    describe("or", () => {
        it("works", (done) => {
            const query = new Query();
            query.find({ $or: [{ x: 1 }, { x: 2 }] });
            assert.equal(query._conditions.$or.length, 2);
            query.or([{ y: "We're under attack" }, { z: 47 }]);
            assert.equal(query._conditions.$or.length, 4);
            assert.equal(query._conditions.$or[3].z, 47);
            query.or({ z: "phew" });
            assert.equal(query._conditions.$or.length, 5);
            assert.equal(query._conditions.$or[3].z, 47);
            assert.equal(query._conditions.$or[4].z, "phew");
            done();
        });
    });

    describe("and", () => {
        it("works", (done) => {
            const query = new Query();
            query.find({ $and: [{ x: 1 }, { y: 2 }] });
            assert.equal(query._conditions.$and.length, 2);
            query.and([{ z: "We're under attack" }, { w: 47 }]);
            assert.equal(query._conditions.$and.length, 4);
            assert.equal(query._conditions.$and[3].w, 47);
            query.and({ a: "phew" });
            assert.equal(query._conditions.$and.length, 5);
            assert.equal(query._conditions.$and[0].x, 1);
            assert.equal(query._conditions.$and[1].y, 2);
            assert.equal(query._conditions.$and[2].z, "We're under attack");
            assert.equal(query._conditions.$and[3].w, 47);
            assert.equal(query._conditions.$and[4].a, "phew");
            done();
        });
    });

    describe("populate", () => {
        it("converts to PopulateOptions objects", (done) => {
            const q = new Query({}, {}, null, p1.collection);
            const o = {
                path: "yellow.brick",
                match: { bricks: { $lt: 1000 } },
                select: undefined,
                model: undefined,
                options: undefined,
                _docs: {}
            };
            q.populate(o);
            assert.deepEqual(o, q._mongooseOptions.populate["yellow.brick"]);
            done();
        });

        it("overwrites duplicate paths", (done) => {
            const q = new Query({}, {}, null, p1.collection);
            const o = {
                path: "yellow.brick",
                match: { bricks: { $lt: 1000 } },
                select: undefined,
                model: undefined,
                options: undefined,
                _docs: {}
            };
            q.populate(o);
            assert.equal(Object.keys(q._mongooseOptions.populate).length, 1);
            assert.deepEqual(o, q._mongooseOptions.populate["yellow.brick"]);
            q.populate("yellow.brick");
            assert.equal(Object.keys(q._mongooseOptions.populate).length, 1);
            o.match = undefined;
            assert.deepEqual(o, q._mongooseOptions.populate["yellow.brick"]);
            done();
        });

        it("accepts space delimited strings", (done) => {
            const q = new Query({}, {}, null, p1.collection);
            q.populate("yellow.brick dirt");
            const o = {
                path: "yellow.brick",
                match: undefined,
                select: undefined,
                model: undefined,
                options: undefined,
                _docs: {}
            };
            assert.equal(Object.keys(q._mongooseOptions.populate).length, 2);
            assert.deepEqual(o, q._mongooseOptions.populate["yellow.brick"]);
            o.path = "dirt";
            assert.deepEqual(o, q._mongooseOptions.populate.dirt);
            done();
        });
    });

    describe("casting", () => {
        let db;

        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("to an array of mixed", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            const Product = db.model("Product");
            const params = { _id: new DocumentObjectId(), tags: { $in: [4, 8, 15, 16] } };
            query.cast(Product, params);
            assert.deepEqual(params.tags.$in, [4, 8, 15, 16]);
            done();
        });

        it("find $ne should not cast single value to array for schematype of Array", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            const Product = db.model("Product");
            const Comment = db.model("Comment");

            const id = new DocumentObjectId();
            const castedComment = { _id: id, text: "hello there" };
            const comment = new Comment(castedComment);

            const params = {
                array: { $ne: 5 },
                ids: { $ne: id },
                comments: { $ne: comment },
                strings: { $ne: "Hi there" },
                numbers: { $ne: 10000 }
            };

            query.cast(Product, params);
            assert.equal(params.array.$ne, 5);
            assert.equal(params.ids.$ne, id);
            params.comments.$ne._id.toHexString();
            assert.deepEqual(params.comments.$ne.toObject(), castedComment);
            assert.equal(params.strings.$ne, "Hi there");
            assert.equal(params.numbers.$ne, 10000);

            params.array.$ne = [5];
            params.ids.$ne = [id];
            params.comments.$ne = [comment];
            params.strings.$ne = ["Hi there"];
            params.numbers.$ne = [10000];
            query.cast(Product, params);
            assert.ok(params.array.$ne instanceof Array);
            assert.equal(params.array.$ne[0], 5);
            assert.ok(params.ids.$ne instanceof Array);
            assert.equal(params.ids.$ne[0].toString(), id.toString());
            assert.ok(params.comments.$ne instanceof Array);
            assert.deepEqual(params.comments.$ne[0].toObject(), castedComment);
            assert.ok(params.strings.$ne instanceof Array);
            assert.equal(params.strings.$ne[0], "Hi there");
            assert.ok(params.numbers.$ne instanceof Array);
            assert.equal(params.numbers.$ne[0], 10000);
            done();
        });

        it("subdocument array with $ne: null should not throw", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            const Product = db.model("Product");

            const params = {
                comments: { $ne: null }
            };

            query.cast(Product, params);
            assert.strictEqual(params.comments.$ne, null);
            done();
        });

        it("find should not cast single value to array for schematype of Array", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            const Product = db.model("Product");
            const Comment = db.model("Comment");

            const id = new DocumentObjectId();
            const castedComment = { _id: id, text: "hello there" };
            const comment = new Comment(castedComment);

            const params = {
                array: 5,
                ids: id,
                comments: comment,
                strings: "Hi there",
                numbers: 10000
            };

            query.cast(Product, params);
            assert.equal(params.array, 5);
            assert.equal(params.ids, id);
            params.comments._id.toHexString();
            assert.deepEqual(params.comments.toObject(), castedComment);
            assert.equal(params.strings, "Hi there");
            assert.equal(params.numbers, 10000);

            params.array = [5];
            params.ids = [id];
            params.comments = [comment];
            params.strings = ["Hi there"];
            params.numbers = [10000];
            query.cast(Product, params);
            assert.ok(params.array instanceof Array);
            assert.equal(params.array[0], 5);
            assert.ok(params.ids instanceof Array);
            assert.equal(params.ids[0].toString(), id.toString());
            assert.ok(params.comments instanceof Array);
            assert.deepEqual(params.comments[0].toObject(), castedComment);
            assert.ok(params.strings instanceof Array);
            assert.equal(params.strings[0], "Hi there");
            assert.ok(params.numbers instanceof Array);
            assert.equal(params.numbers[0], 10000);
            done();
        });

        it("an $elemMatch with $in works (gh-1100)", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            const Product = db.model("Product");
            const ids = [String(new DocumentObjectId()), String(new DocumentObjectId())];
            const params = { ids: { $elemMatch: { $in: ids } } };
            query.cast(Product, params);
            assert.ok(params.ids.$elemMatch.$in[0] instanceof DocumentObjectId);
            assert.ok(params.ids.$elemMatch.$in[1] instanceof DocumentObjectId);
            assert.deepEqual(params.ids.$elemMatch.$in[0].toString(), ids[0]);
            assert.deepEqual(params.ids.$elemMatch.$in[1].toString(), ids[1]);
            done();
        });

        it("inequality operators for an array", (done) => {
            const query = new Query({}, {}, null, p1.collection);
            const Product = db.model("Product");
            const Comment = db.model("Comment");

            const id = new DocumentObjectId();
            const castedComment = { _id: id, text: "hello there" };
            const comment = new Comment(castedComment);

            const params = {
                ids: { $gt: id },
                comments: { $gt: comment },
                strings: { $gt: "Hi there" },
                numbers: { $gt: 10000 }
            };

            query.cast(Product, params);
            assert.equal(params.ids.$gt, id);
            assert.deepEqual(params.comments.$gt.toObject(), castedComment);
            assert.equal(params.strings.$gt, "Hi there");
            assert.equal(params.numbers.$gt, 10000);
            done();
        });
    });

    describe("distinct", () => {
        it("op", (done) => {
            const db = start();
            const Product = db.model("Product");
            const prod = new Product({});
            var q = new Query({}, {}, Product, prod.collection).distinct("blah", () => {
                assert.equal(q.op, "distinct");
                db.close(done);
            });
        });
    });

    describe("without a callback", () => {
        it("count, update, remove works", (done) => {
            const db = start();
            const Product = db.model("Product", `update_products_${random()}`);
            new Query(p1.collection, {}, Product).count();
            Product.create({ tags: 12345 }, (err) => {
                assert.ifError(err);
                const time = 20;
                Product.find({ tags: 12345 }).update({ $set: { tags: 123456 } });

                setTimeout(() => {
                    Product.find({ tags: 12345 }, (err, p) => {
                        assert.ifError(err);
                        assert.equal(p.length, 1);

                        Product.find({ tags: 123456 }).remove();
                        setTimeout(() => {
                            Product.find({ tags: 123456 }, (err, p) => {
                                assert.ifError(err);
                                assert.equal(p.length, 0);
                                db.close();
                                done();
                            });
                        }, time);
                    });
                }, time);
            });
        });
    });

    describe("findOne", () => {
        it("sets the op", (done) => {
            const db = start();
            const Product = db.model("Product");
            const prod = new Product({});
            const q = new Query(prod.collection, {}, Product).distinct();
            // use a timeout here because we have to wait for the connection to start
            // before any ops will get set
            setTimeout(() => {
                assert.equal(q.op, "distinct");
                q.findOne();
                assert.equal(q.op, "findOne");
                db.close();
                done();
            }, 50);
        });

        it("works as a promise", (done) => {
            const db = start();
            const Product = db.model("Product");
            const promise = Product.findOne();

            promise.then(() => {
                db.close(done);
            }, (err) => {
                assert.ifError(err);
            });
        });
    });

    describe("deleteOne/deleteMany", () => {
        let db;

        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        it("handles deleteOne", (done) => {
            const M = db.model("deleteOne", new Schema({ name: "String" }));
            M.create([{ name: "Eddard Stark" }, { name: "Robb Stark" }], (error) => {
                assert.ifError(error);
                M.deleteOne({ name: /Stark/ }, (error) => {
                    assert.ifError(error);
                    M.count({}, (error, count) => {
                        assert.ifError(error);
                        assert.equal(count, 1);
                        done();
                    });
                });
            });
        });

        it("handles deleteMany", (done) => {
            const M = db.model("deleteMany", new Schema({ name: "String" }));
            M.create([{ name: "Eddard Stark" }, { name: "Robb Stark" }], (error) => {
                assert.ifError(error);
                M.deleteMany({ name: /Stark/ }, (error) => {
                    assert.ifError(error);
                    M.count({}, (error, count) => {
                        assert.ifError(error);
                        assert.equal(count, 0);
                        done();
                    });
                });
            });
        });
    });

    describe("remove", () => {
        it("handles cast errors async", (done) => {
            const db = start();
            const Product = db.model("Product");

            assert.doesNotThrow(() => {
                Product.where({ numbers: [[[]]] }).remove((err) => {
                    db.close();
                    assert.ok(err);
                    done();
                });
            });
        });

        it("supports a single conditions arg", (done) => {
            const db = start();
            const Product = db.model("Product");

            Product.create({ strings: ["remove-single-condition"] }).then(() => {
                db.close();
                const q = Product.where().remove({ strings: "remove-single-condition" });
                assert.ok(q instanceof mongoose.Query);
                done();
            }, done);
        });

        it("supports a single callback arg", (done) => {
            const db = start();
            const Product = db.model("Product");
            const val = "remove-single-callback";

            Product.create({ strings: [val] }).then(() => {
                Product.where({ strings: val }).remove((err) => {
                    assert.ifError(err);
                    Product.findOne({ strings: val }, (err, doc) => {
                        db.close();
                        assert.ifError(err);
                        assert.ok(!doc);
                        done();
                    });
                });
            }, done);
        });

        it("supports conditions and callback args", (done) => {
            const db = start();
            const Product = db.model("Product");
            const val = "remove-cond-and-callback";

            Product.create({ strings: [val] }).then(() => {
                Product.where().remove({ strings: val }, (err) => {
                    assert.ifError(err);
                    Product.findOne({ strings: val }, (err, doc) => {
                        db.close();
                        assert.ifError(err);
                        assert.ok(!doc);
                        done();
                    });
                });
            }, done);
        });

        it("single option, default", (done) => {
            const db = start();
            const Test = db.model("Test_single", new Schema({ name: String }));

            Test.create([{ name: "Eddard Stark" }, { name: "Robb Stark" }], (error) => {
                assert.ifError(error);
                Test.remove({ name: /Stark/ }).exec((error, res) => {
                    assert.ifError(error);
                    assert.equal(res.result.n, 2);
                    Test.count({}, (error, count) => {
                        assert.ifError(error);
                        assert.equal(count, 0);
                        done();
                    });
                });
            });
        });

        it("single option, false", (done) => {
            const db = start();
            const Test = db.model("Test_single", new Schema({ name: String }));

            Test.create([{ name: "Eddard Stark" }, { name: "Robb Stark" }], (error) => {
                assert.ifError(error);
                Test.remove({ name: /Stark/ }).setOptions({ single: false }).exec((error, res) => {
                    assert.ifError(error);
                    assert.equal(res.result.n, 2);
                    Test.count({}, (error, count) => {
                        assert.ifError(error);
                        assert.equal(count, 0);
                        done();
                    });
                });
            });
        });

        it("single option, true", (done) => {
            const db = start();
            const Test = db.model("Test_single", new Schema({ name: String }));

            Test.create([{ name: "Eddard Stark" }, { name: "Robb Stark" }], (error) => {
                assert.ifError(error);
                Test.remove({ name: /Stark/ }).setOptions({ single: true }).exec((error, res) => {
                    assert.ifError(error);
                    assert.equal(res.result.n, 1);
                    Test.count({}, (error, count) => {
                        assert.ifError(error);
                        assert.equal(count, 1);
                        done();
                    });
                });
            });
        });
    });

    describe("querying/updating with model instance containing embedded docs should work (#454)", () => {
        it("works", (done) => {
            const db = start();
            const Product = db.model("Product");

            const proddoc = { comments: [{ text: "hello" }] };
            const prod2doc = { comments: [{ text: "goodbye" }] };

            const prod = new Product(proddoc);
            prod.save((err) => {
                assert.ifError(err);

                Product.findOne({ _id: prod._id }, (err, product) => {
                    assert.ifError(err);
                    assert.equal(product.comments.length, 1);
                    assert.equal(product.comments[0].text, "hello");

                    Product.update({ _id: prod._id }, prod2doc, (err) => {
                        assert.ifError(err);

                        Product.collection.findOne({ _id: product._id }, (err, doc) => {
                            assert.ifError(err);
                            assert.equal(doc.comments.length, 1);
                            // ensure hidden private props were not saved to db
                            assert.ok(!doc.comments[0].hasOwnProperty("parentArry"));
                            assert.equal(doc.comments[0].text, "goodbye");
                            db.close(done);
                        });
                    });
                });
            });
        });
    });

    describe("optionsForExecute", () => {
        it("should retain key order", (done) => {
            // this is important for query hints
            const hint = { x: 1, y: 1, z: 1 };
            const a = JSON.stringify({ hint, safe: true });

            const q = new Query();
            q.hint(hint);

            const options = q._optionsForExec({ schema: { options: { safe: true } } });
            assert.equal(JSON.stringify(options), a);
            done();
        });
    });

    // Advanced Query options

    describe("options", () => {
        describe("maxscan", () => {
            it("works", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.maxscan(100);
                assert.equal(query.options.maxScan, 100);
                done();
            });
        });

        describe("slaveOk", () => {
            it("works", (done) => {
                let query = new Query({}, {}, null, p1.collection);
                query.slaveOk();
                assert.equal(query.options.slaveOk, true);

                query = new Query({}, {}, null, p1.collection);
                query.slaveOk(true);
                assert.equal(query.options.slaveOk, true);

                query = new Query({}, {}, null, p1.collection);
                query.slaveOk(false);
                assert.equal(query.options.slaveOk, false);
                done();
            });
        });

        describe("tailable", () => {
            it("works", (done) => {
                let query = new Query({}, {}, null, p1.collection);
                query.tailable();
                assert.equal(query.options.tailable, true);

                query = new Query({}, {}, null, p1.collection);
                query.tailable(true);
                assert.equal(query.options.tailable, true);

                query = new Query({}, {}, null, p1.collection);
                query.tailable(false);
                assert.equal(query.options.tailable, false);
                done();
            });
            it("supports passing the `await` option", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.tailable({ awaitdata: true });
                assert.equal(query.options.tailable, true);
                assert.equal(query.options.awaitdata, true);
                done();
            });
        });

        describe("comment", () => {
            it("works", (done) => {
                const query = new Query();
                assert.equal(typeof query.comment, "function");
                assert.equal(query.comment("Lowpass is more fun"), query);
                assert.equal(query.options.comment, "Lowpass is more fun");
                done();
            });
        });

        describe("hint", () => {
            it("works", (done) => {
                const query2 = new Query({}, {}, null, p1.collection);
                query2.hint({ indexAttributeA: 1, indexAttributeB: -1 });
                assert.deepEqual(query2.options.hint, { indexAttributeA: 1, indexAttributeB: -1 });

                const query3 = new Query({}, {}, null, p1.collection);
                query3.hint("indexAttributeA_1");
                assert.deepEqual(query3.options.hint, "indexAttributeA_1");

                done();
            });
        });

        describe("snapshot", () => {
            it("works", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.snapshot(true);
                assert.equal(query.options.snapshot, true);
                done();
            });
        });

        describe("batchSize", () => {
            it("works", (done) => {
                const query = new Query({}, {}, null, p1.collection);
                query.batchSize(10);
                assert.equal(query.options.batchSize, 10);
                done();
            });
        });

        describe("read", () => {
            const P = adone.database.mongo.ReadPreference;

            describe("without tags", () => {
                it("works", (done) => {
                    const query = new Query({}, {}, null, p1.collection);
                    query.read("primary");
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "primary");

                    query.read("p");
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "primary");

                    query.read("primaryPreferred");
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "primaryPreferred");

                    query.read("pp");
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "primaryPreferred");

                    query.read("secondary");
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "secondary");

                    query.read("s");
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "secondary");

                    query.read("secondaryPreferred");
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "secondaryPreferred");

                    query.read("sp");
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "secondaryPreferred");

                    query.read("nearest");
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "nearest");

                    query.read("n");
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "nearest");

                    done();
                });
            });

            describe("with tags", () => {
                it("works", (done) => {
                    const query = new Query({}, {}, null, p1.collection);
                    const tags = [{ dc: "sf", s: 1 }, { dc: "jp", s: 2 }];

                    query.read("pp", tags);
                    assert.ok(query.options.readPreference instanceof P);
                    assert.ok(query.options.readPreference.isValid());
                    assert.equal(query.options.readPreference.mode, "primaryPreferred");
                    assert.ok(is.array(query.options.readPreference.tags));
                    assert.equal(query.options.readPreference.tags[0].dc, "sf");
                    assert.equal(query.options.readPreference.tags[0].s, 1);
                    assert.equal(query.options.readPreference.tags[1].dc, "jp");
                    assert.equal(query.options.readPreference.tags[1].s, 2);
                    done();
                });
            });

            describe("inherits its models schema read option", () => {
                let schema, M, called;
                before(() => {
                    schema = new Schema({}, { read: "p" });
                    M = mongoose.model("schemaOptionReadPrefWithQuery", schema);
                });

                it("if not set in query", (done) => {
                    const options = M.where()._optionsForExec(M);
                    assert.ok(options.readPreference instanceof P);
                    assert.equal(options.readPreference.mode, "primary");
                    done();
                });

                it("if set in query", (done) => {
                    const options = M.where().read("s")._optionsForExec(M);
                    assert.ok(options.readPreference instanceof P);
                    assert.equal(options.readPreference.mode, "secondary");
                    done();
                });

                it("and sends it though the driver", (done) => {
                    const db = start();
                    const options = { read: "secondary", safe: { w: "majority" } };
                    const schema = new Schema({ name: String }, options);
                    const M = db.model(random(), schema);
                    const q = M.find();

                    // stub the internal query options call
                    const getopts = q._optionsForExec;
                    q._optionsForExec = function (model) {
                        q._optionsForExec = getopts;

                        const ret = getopts.call(this, model);

                        assert.ok(ret.readPreference);
                        assert.equal(ret.readPreference.mode, "secondary");
                        assert.deepEqual({ w: "majority" }, ret.safe);
                        called = true;

                        return ret;
                    };

                    q.exec((err) => {
                        if (err) {
                            return done(err);
                        }
                        assert.ok(called);
                        db.close(done);
                    });
                });
            });
        });
    });

    describe("setOptions", () => {
        it("works", (done) => {
            const q = new Query();
            q.setOptions({ thing: "cat" });
            q.setOptions({ populate: ["fans"] });
            q.setOptions({ batchSize: 10 });
            q.setOptions({ limit: 4 });
            q.setOptions({ skip: 3 });
            q.setOptions({ sort: "-blah" });
            q.setOptions({ sort: { woot: -1 } });
            q.setOptions({ hint: { index1: 1, index2: -1 } });
            q.setOptions({ read: ["s", [{ dc: "eu" }]] });

            assert.equal(q.options.thing, "cat");
            assert.deepEqual(q._mongooseOptions.populate.fans, { path: "fans", select: undefined, match: undefined, options: undefined, model: undefined, _docs: {} });
            assert.equal(q.options.batchSize, 10);
            assert.equal(q.options.limit, 4);
            assert.equal(q.options.skip, 3);
            assert.equal(Object.keys(q.options.sort).length, 2);
            assert.equal(q.options.sort.blah, -1);
            assert.equal(q.options.sort.woot, -1);
            assert.equal(q.options.hint.index1, 1);
            assert.equal(q.options.hint.index2, -1);
            assert.equal(q.options.readPreference.mode, "secondary");
            assert.equal(q.options.readPreference.tags[0].dc, "eu");

            const db = start();
            const Product = db.model("Product", "Product_setOptions_test");
            Product.create(
                { numbers: [3, 4, 5] },
                { strings: "hi there".split(" ") }, (err, doc1, doc2) => {
                    assert.ifError(err);
                    Product.find().setOptions({ limit: 1, sort: { _id: -1 }, read: "n" }).exec((err, docs) => {
                        db.close();
                        assert.ifError(err);
                        assert.equal(docs.length, 1);
                        assert.equal(docs[0].id, doc2.id);
                        done();
                    });
                });
        });

        it("populate as array in options (gh-4446)", (done) => {
            const q = new Query();
            q.setOptions({ populate: [{ path: "path1" }, { path: "path2" }] });
            assert.deepEqual(Object.keys(q._mongooseOptions.populate),
                ["path1", "path2"]);
            done();
        });
    });

    describe("update", () => {
        it("when empty, nothing is run", (done) => {
            const q = new Query();
            assert.equal(false, Boolean(q._castUpdate({})));
            done();
        });
    });

    describe("bug fixes", () => {
        let db;

        before(() => {
            db = start();
        });

        after((done) => {
            db.close(done);
        });

        describe("collations", {
            async skip() {
                return new Promise((resolve, reject) => {
                    start.mongodVersion((err, version) => {
                        if (err) {
                            return reject(err);
                        }
                        const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
                        if (!mongo34) {
                            return resolve(true);
                        }

                        resolve(false);
                    });
                });

            }
        }, () => {
            it("collation support (gh-4839)", (done) => {
                const schema = new Schema({
                    name: String
                });

                const MyModel = db.model("gh4839", schema);
                const collation = { locale: "en_US", strength: 1 };

                MyModel.create([{ name: "a" }, { name: "A" }]).
                    then(() => {
                        return MyModel.find({ name: "a" }).collation(collation);
                    }).
                    then((docs) => {
                        assert.equal(docs.length, 2);
                        return MyModel.find({ name: "a" }, null, { collation });
                    }).
                    then((docs) => {
                        assert.equal(docs.length, 2);
                        return MyModel.find({ name: "a" }, null, { collation }).
                            sort({ _id: -1 }).
                            cursor().
                            next();
                    }).
                    then((doc) => {
                        assert.equal(doc.name, "A");
                        return MyModel.find({ name: "a" });
                    }).
                    then((docs) => {
                        assert.equal(docs.length, 1);
                        done();
                    }).
                    catch(done);
            });

            it("set on schema (gh-5295)", (done) => {
                const schema = new Schema({
                    name: String
                }, { collation: { locale: "en_US", strength: 1 } });

                const MyModel = db.model("gh5295", schema);

                MyModel.create([{ name: "a" }, { name: "A" }]).
                    then(() => {
                        return MyModel.find({ name: "a" });
                    }).
                    then((docs) => {
                        assert.equal(docs.length, 2);
                        done();
                    }).
                    catch(done);
            });
        });

        describe("gh-1950", () => {
            it("ignores sort when passed to count", (done) => {
                const Product = db.model("Product", "Product_setOptions_test");
                Product.find().sort({ _id: 1 }).count({}).exec((error) => {
                    assert.ifError(error);
                    done();
                });
            });

            it("ignores count when passed to sort", (done) => {
                const Product = db.model("Product", "Product_setOptions_test");
                Product.find().count({}).sort({ _id: 1 }).exec((error) => {
                    assert.ifError(error);
                    done();
                });
            });
        });

        it("excludes _id when select false and inclusive mode (gh-3010)", (done) => {
            const User = db.model("gh3010", {
                _id: {
                    select: false,
                    type: Schema.Types.ObjectId,
                    default: mongoose.Types.ObjectId
                },
                username: String
            });

            User.create({ username: "Val" }, (error, user) => {
                assert.ifError(error);
                User.find({ _id: user._id }).select("username").exec((error, users) => {
                    assert.ifError(error);
                    assert.equal(users.length, 1);
                    assert.ok(!users[0]._id);
                    assert.equal(users[0].username, "Val");
                    done();
                });
            });
        });

        it("doesnt reverse key order for update docs (gh-3215)", (done) => {
            const Test = db.model("gh3215", {
                arr: [{ date: Date, value: Number }]
            });

            const q = Test.update({}, {
                $push: {
                    arr: {
                        $each: [{ date: new Date(), value: 1 }],
                        $sort: { value: -1, date: -1 }
                    }
                }
            });

            assert.deepEqual(Object.keys(q.getUpdate().$push.arr.$sort),
                ["value", "date"]);
            done();
        });

        it("timestamps with $each (gh-4805)", (done) => {
            const nestedSchema = new Schema({ value: Number }, { timestamps: true });
            const Test = db.model("gh4805", new Schema({
                arr: [nestedSchema]
            }, { timestamps: true }));

            Test.update({}, {
                $push: {
                    arr: {
                        $each: [{ value: 1 }]
                    }
                }
            }).exec((error) => {
                assert.ifError(error);
                done();
            });
        });

        it("allows sort with count (gh-3914)", (done) => {
            const Post = db.model("gh3914_0", {
                title: String
            });

            Post.count({}).sort({ title: 1 }).exec((error, count) => {
                assert.ifError(error);
                assert.strictEqual(count, 0);
                done();
            });
        });

        it("allows sort with select (gh-3914)", (done) => {
            const Post = db.model("gh3914_1", {
                title: String
            });

            Post.count({}).select({ _id: 0 }).exec((error, count) => {
                assert.ifError(error);
                assert.strictEqual(count, 0);
                done();
            });
        });

        it("handles nested $ (gh-3265)", (done) => {
            const Post = db.model("gh3265", {
                title: String,
                answers: [{
                    details: String,
                    stats: {
                        votes: Number,
                        count: Number
                    }
                }]
            });

            const answersUpdate = { details: "blah", stats: { votes: 1, count: "3" } };
            const q = Post.update(
                { "answers._id": "507f1f77bcf86cd799439011" },
                { $set: { "answers.$": answersUpdate } });

            assert.deepEqual(q.getUpdate().$set["answers.$"].stats.toObject(),
                { votes: 1, count: 3 });
            done();
        });

        it("$geoWithin with single nested schemas (gh-4044)", (done) => {
            const locationSchema = new Schema({
                type: { type: String },
                coordinates: []
            }, { _id: false });

            const schema = new Schema({
                title: String,
                location: { type: locationSchema, required: true }
            });
            schema.index({ location: "2dsphere" });

            const Model = db.model("gh4044", schema);

            const query = {
                location: {
                    $geoWithin: {
                        $geometry: {
                            type: "Polygon",
                            coordinates: [[[-1, 0], [-1, 3], [4, 3], [4, 0], [-1, 0]]]
                        }
                    }
                }
            };
            Model.find(query, (error) => {
                assert.ifError(error);
                done();
            });
        });

        it("setDefaultsOnInsert with empty update (gh-3825)", (done) => {
            const schema = new mongoose.Schema({
                test: { type: Number, default: 8472 },
                name: String
            });

            const MyModel = db.model("gh3825", schema);

            const opts = { setDefaultsOnInsert: true, upsert: true };
            MyModel.update({}, {}, opts, (error) => {
                assert.ifError(error);
                MyModel.findOne({}, (error, doc) => {
                    assert.ifError(error);
                    assert.ok(doc);
                    assert.strictEqual(doc.test, 8472);
                    assert.ok(!doc.name);
                    done();
                });
            });
        });

        it("custom query methods (gh-3714)", (done) => {
            const schema = new mongoose.Schema({
                name: String
            });

            schema.query.byName = function (name) {
                return this.find({ name });
            };

            const MyModel = db.model("gh3714", schema);

            MyModel.create({ name: "Val" }, (error) => {
                assert.ifError(error);
                MyModel.find().byName("Val").exec((error, docs) => {
                    assert.ifError(error);
                    assert.equal(docs.length, 1);
                    assert.equal(docs[0].name, "Val");
                    done();
                });
            });
        });

        it("string as input (gh-4378)", (done) => {
            const schema = new mongoose.Schema({
                name: String
            });

            const MyModel = db.model("gh4378", schema);

            MyModel.findOne("", (error) => {
                assert.ok(error);
                assert.equal(error.name, "ObjectParameterError");
                done();
            });
        });

        it("handles geoWithin with $center and mongoose object (gh-4419)", (done) => {
            const areaSchema = new Schema({
                name: String,
                circle: Array
            });
            const Area = db.model("gh4419", areaSchema);

            const placeSchema = new Schema({
                name: String,
                geometry: {
                    type: {
                        type: String,
                        enum: ["Point"],
                        default: "Point"
                    },
                    coordinates: { type: [Number] }
                }
            });
            placeSchema.index({ geometry: "2dsphere" });
            const Place = db.model("gh4419_0", placeSchema);

            const tromso = new Area({
                name: "Tromso, Norway",
                circle: [[18.89, 69.62], 10 / 3963.2]
            });
            tromso.save((error) => {
                assert.ifError(error);

                const airport = {
                    name: "Center",
                    geometry: {
                        type: "Point",
                        coordinates: [18.895, 69.67]
                    }
                };
                Place.create(airport, (error) => {
                    assert.ifError(error);
                    const q = {
                        geometry: {
                            $geoWithin: {
                                $centerSphere: tromso.circle
                            }
                        }
                    };
                    Place.find(q).exec((error, docs) => {
                        assert.ifError(error);
                        assert.equal(docs.length, 1);
                        assert.equal(docs[0].name, "Center");
                        done();
                    });
                });
            });
        });

        it("$not with objects (gh-4495)", (done) => {
            const schema = new Schema({
                createdAt: Date
            });

            const M = db.model("gh4495", schema);
            const q = M.find({
                createdAt: {
                    $not: {
                        $gte: "2016/09/02 00:00:00",
                        $lte: "2016/09/02 23:59:59"
                    }
                }
            });
            q._castConditions();

            assert.ok(q._conditions.createdAt.$not.$gte instanceof Date);
            assert.ok(q._conditions.createdAt.$not.$lte instanceof Date);
            done();
        });

        it("geoIntersects with mongoose doc as coords (gh-4408)", (done) => {
            const lineStringSchema = new Schema({
                name: String,
                geo: {
                    type: { type: String, default: "LineString" },
                    coordinates: [[Number]]
                }
            });

            const LineString = db.model("gh4408", lineStringSchema);

            const ls = {
                name: "test",
                geo: {
                    coordinates: [[14.59, 24.847], [28.477, 15.961]]
                }
            };
            const ls2 = {
                name: "test2",
                geo: {
                    coordinates: [[27.528, 25.006], [14.063, 15.591]]
                }
            };
            LineString.create(ls, ls2, (error, ls1) => {
                assert.ifError(error);
                const query = {
                    geo: {
                        $geoIntersects: {
                            $geometry: {
                                type: "LineString",
                                coordinates: ls1.geo.coordinates
                            }
                        }
                    }
                };
                LineString.find(query, (error, results) => {
                    assert.ifError(error);
                    assert.equal(results.length, 2);
                    done();
                });
            });
        });

        it("string with $not (gh-4592)", (done) => {
            const TestSchema = new Schema({
                test: String
            });

            const Test = db.model("gh4592", TestSchema);

            Test.findOne({ test: { $not: /test/ } }, (error) => {
                assert.ifError(error);
                done();
            });
        });

        it("runSettersOnQuery works with _id field (gh-5351)", (done) => {
            const testSchema = new Schema({
                val: { type: String }
            }, { runSettersOnQuery: true });

            const Test = db.model("gh5351", testSchema);
            Test.create({ val: "A string" }).
                then(() => {
                    return Test.findOne({});
                }).
                then((doc) => {
                    return Test.findOneAndUpdate({ _id: doc._id }, {
                        $set: {
                            val: "another string"
                        }
                    }, { new: true });
                }).
                then((doc) => {
                    assert.ok(doc);
                    assert.equal(doc.val, "another string");
                }).
                then(done).
                catch(done);
        });

        it("$exists under $not (gh-4933)", (done) => {
            const TestSchema = new Schema({
                test: String
            });

            const Test = db.model("gh4933", TestSchema);

            Test.findOne({ test: { $not: { $exists: true } } }, (error) => {
                assert.ifError(error);
                done();
            });
        });

        it("geojson underneath array (gh-5467)", (done) => {
            const storySchema = new Schema({
                name: String,
                gallery: [{
                    src: String,
                    location: {
                        type: { type: String, enum: ["Point"] },
                        coordinates: { type: [Number], default: void 0 }
                    },
                    timestamp: Date
                }]
            });
            storySchema.index({ "gallery.location": "2dsphere" });

            const Story = db.model("gh5467", storySchema);

            const q = {
                "gallery.location": {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [51.53377166666667, -0.1197471666666667]
                        },
                        $maxDistance: 500
                    }
                }
            };
            Story.once("index", (error) => {
                assert.ifError(error);
                Story.update(q, { name: "test" }, { upsert: true }, (error) => {
                    assert.ifError(error);
                    done();
                });
            });
        });

        it("slice respects schema projections (gh-5450)", (done) => {
            const gameSchema = new Schema({
                name: String,
                developer: {
                    type: String,
                    select: false
                },
                arr: [Number]
            });
            const Game = db.model("gh5450", gameSchema);

            Game.create({ name: "Mass Effect", developer: "BioWare", arr: [1, 2, 3] }, (error) => {
                assert.ifError(error);
                Game.findOne({ name: "Mass Effect" }).slice({ arr: 1 }).exec((error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc.name, "Mass Effect");
                    assert.deepEqual(doc.toObject().arr, [1]);
                    assert.ok(!doc.developer);
                    done();
                });
            });
        });

        it("$exists for arrays and embedded docs (gh-4937)", (done) => {
            const subSchema = new Schema({
                name: String
            });
            const TestSchema = new Schema({
                test: [String],
                sub: subSchema
            });

            const Test = db.model("gh4937", TestSchema);

            const q = { test: { $exists: true }, sub: { $exists: false } };
            Test.findOne(q, (error) => {
                assert.ifError(error);
                done();
            });
        });

        it.todo("report error in pre hook (gh-5520)", (done) => {
            const TestSchema = new Schema({ name: String });

            const ops = [
                "count",
                "find",
                "findOne",
                "findOneAndRemove",
                "findOneAndUpdate",
                "replaceOne",
                "update",
                "updateOne",
                "updateMany"
            ];

            ops.forEach((op) => {
                TestSchema.pre(op, function (next) {
                    this.error(new Error(`${op} error`));
                    next();
                });
            });

            const TestModel = db.model("gh5520", TestSchema);

            let numOps = ops.length;

            ops.forEach((op) => {
                TestModel.find({}).update({ name: "test" })[op]((error) => {
                    assert.ok(error);
                    assert.equal(error.message, `${op} error`);
                    --numOps || done();
                });
            });
        });

        it("cast error with custom error (gh-5520)", (done) => {
            const TestSchema = new Schema({ name: Number });

            const TestModel = db.model("gh5520_0", TestSchema);

            TestModel.
                find({ name: "not a number" }).
                error(new Error("woops")).
                exec((error) => {
                    assert.ok(error);
                    // CastError check happens **after** `.error()`
                    assert.equal(error.name, "CastError");
                    done();
                });
        });

        it("change deleteOne to updateOne for soft deletes using $isDeleted (gh-4428)", (done) => {
            const schema = new mongoose.Schema({
                name: String,
                isDeleted: Boolean
            });

            schema.pre("remove", function (next) {
                const _this = this;
                this.update({ isDeleted: true }, (error) => {
                    // Force mongoose to consider this doc as deleted.
                    _this.$isDeleted(true);
                    next(error);
                });
            });

            const M = db.model("gh4428", schema);

            M.create({ name: "test" }, (error, doc) => {
                assert.ifError(error);
                doc.remove((error) => {
                    assert.ifError(error);
                    M.findById(doc._id, (error, doc) => {
                        assert.ifError(error);
                        assert.ok(doc);
                        assert.equal(doc.isDeleted, true);
                        done();
                    });
                });
            });
        });

        it("child schema with select: false in multiple paths (gh-5603)", (done) => {
            const ChildSchema = new mongoose.Schema({
                field: {
                    type: String,
                    select: false
                },
                _id: false
            }, { id: false });

            const ParentSchema = new mongoose.Schema({
                child: ChildSchema,
                child2: ChildSchema
            });
            const Parent = db.model("gh5603", ParentSchema);
            const ogParent = new Parent();
            ogParent.child = { field: "test" };
            ogParent.child2 = { field: "test" };
            ogParent.save((error) => {
                assert.ifError(error);
                Parent.findById(ogParent._id).exec((error, doc) => {
                    assert.ifError(error);
                    assert.ok(!doc.child.field);
                    assert.ok(!doc.child2.field);
                    done();
                });
            });
        });

        it("errors in post init (gh-5592)", (done) => {
            const TestSchema = new Schema();

            let count = 0;
            TestSchema.post("init", (model, next) => {
                return next(new Error(`Failed! ${count++}`));
            });

            const TestModel = db.model("gh5592", TestSchema);

            const docs = [];
            for (let i = 0; i < 10; ++i) {
                docs.push({});
            }

            TestModel.create(docs, (error) => {
                assert.ifError(error);
                TestModel.find({}, (error) => {
                    assert.ok(error);
                    assert.equal(error.message, "Failed! 0");
                    assert.equal(count, 10);
                    done();
                });
            });
        });

        it("with non-object args (gh-1698)", (done) => {
            const schema = new mongoose.Schema({
                email: String
            });
            const M = db.model("gh1698", schema);

            M.find(42, (error) => {
                assert.ok(error);
                assert.equal(error.name, "ObjectParameterError");
                done();
            });
        });

        it.todo("queries with BSON overflow (gh-5812)", function (done) {
            this.timeout(10000);

            const schema = new mongoose.Schema({
                email: String
            });

            const model = db.model("gh5812", schema);
            const bigData = new Array(800000);

            for (let i = 0; i < bigData.length; ++i) {
                bigData[i] = "test1234567890";
            }

            model.find({ email: { $in: bigData } }).lean().then(() => {
                done(new Error("Expected an error"));
            }).catch((error) => {
                assert.ok(error);
                assert.ok(error.message !== "Expected error");
                done();
            });
        });

        it("handles geoWithin with mongoose docs (gh-4392)", (done) => {
            const areaSchema = new Schema({
                name: { type: String },
                loc: {
                    type: {
                        type: String,
                        enum: ["Polygon"],
                        default: "Polygon"
                    },
                    coordinates: [[[Number]]]
                }
            });

            const Area = db.model("gh4392_0", areaSchema);

            const observationSchema = new Schema({
                geometry: {
                    type: {
                        type: String,
                        enum: ["Point"],
                        default: "Point"
                    },
                    coordinates: { type: [Number] }
                },
                properties: {
                    temperature: { type: Number }
                }
            });
            observationSchema.index({ geometry: "2dsphere" });

            const Observation = db.model("gh4392_1", observationSchema);

            Observation.on("index", (error) => {
                assert.ifError(error);
                const tromso = new Area({
                    name: "Tromso, Norway",
                    loc: {
                        type: "Polygon",
                        coordinates: [[
                            [18.89, 69.62],
                            [18.89, 69.72],
                            [19.03, 69.72],
                            [19.03, 69.62],
                            [18.89, 69.62]
                        ]]
                    }
                });
                tromso.save((error) => {
                    assert.ifError(error);
                    const observation = {
                        geometry: {
                            type: "Point",
                            coordinates: [18.895, 69.67]
                        }
                    };
                    Observation.create(observation, (error) => {
                        assert.ifError(error);

                        Observation.
                            find().
                            where("geometry").within().geometry(tromso.loc).
                            exec((error, docs) => {
                                assert.ifError(error);
                                assert.equal(docs.length, 1);
                                done();
                            });
                    });
                });
            });
        });
    });

    describe("handles falsy and object projections with defaults (gh-3256)", () => {
        let db;
        let MyModel;

        before((done) => {
            db = start();

            const PersonSchema = new Schema({
                name: String,
                lastName: String,
                dependents: [String]
            });

            const m = db.model("gh3256", PersonSchema, "gh3256");

            const obj = {
                name: "John",
                lastName: "Doe",
                dependents: ["Jake", "Jill", "Jane"]
            };
            m.create(obj, (error) => {
                assert.ifError(error);

                const PersonSchema = new Schema({
                    name: String,
                    lastName: String,
                    dependents: [String],
                    salary: { type: Number, default: 25000 }
                });

                MyModel = db.model("gh3256-salary", PersonSchema, "gh3256");

                done();
            });
        });

        after((done) => {
            db.close(done);
        });

        it("falsy projection", (done) => {
            MyModel.findOne({ name: "John" }, { lastName: false }).
                exec((error, person) => {
                    assert.ifError(error);
                    assert.equal(person.salary, 25000);
                    done();
                });
        });

        it("slice projection", (done) => {
            MyModel.findOne({ name: "John" }, { dependents: { $slice: 1 } }).exec((error, person) => {
                assert.ifError(error);
                assert.equal(person.salary, 25000);
                done();
            });
        });

        it("empty projection", (done) => {
            MyModel.findOne({ name: "John" }, {}).
                exec((error, person) => {
                    assert.ifError(error);
                    assert.equal(person.salary, 25000);
                    done();
                });
        });
    });
});
