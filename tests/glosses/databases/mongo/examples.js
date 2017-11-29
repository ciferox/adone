describe("examples", function () {
    const { database: { mongo }, util } = adone;
    const { range } = util;

    it("insert/count", async () => {
        const db = await mongo.connect(this.url());
        await db.collection("inventory").deleteMany({});

        await db.collection("inventory").insertOne({
            item: "canvas",
            qty: 100,
            tags: ["cotton"],
            size: { h: 28, w: 35.5, uom: "cm" }
        });
        expect(await db.collection("inventory").count({})).to.be.equal(1);

        expect(await db.collection("inventory").find({
            item: "canvas"
        }).count()).to.be.equal(1);

        await db.collection("inventory").insertMany([
            {
                item: "journal",
                qty: 25,
                tags: ["blank", "red"],
                size: { h: 14, w: 21, uom: "cm" }
            },
            {
                item: "mat",
                qty: 85,
                tags: ["gray"],
                size: { h: 27.9, w: 35.5, uom: "cm" }
            },
            {
                item: "mousepad",
                qty: 25,
                tags: ["gel", "blue"],
                size: { h: 19, w: 22.85, uom: "cm" }
            }
        ]);

        expect(await db.collection("inventory").count({})).to.be.equal(4);
    });

    it("query top level fields", async () => {
        const db = await mongo.connect(this.url());
        await db.collection("inventory").deleteMany({});
        await db.collection("inventory").insertMany([
            {
                item: "journal",
                qty: 25,
                size: { h: 14, w: 21, uom: "cm" },
                status: "A"
            },
            {
                item: "notebook",
                qty: 50,
                size: { h: 8.5, w: 11, uom: "in" },
                status: "A"
            },
            {
                item: "paper",
                qty: 100,
                size: { h: 8.5, w: 11, uom: "in" },
                status: "D"
            },
            {
                item: "planner",
                qty: 75, size: { h: 22.85, w: 30, uom: "cm" },
                status: "D"
            },
            {
                item: "postcard",
                qty: 45,
                size: { h: 10, w: 15.25, uom: "cm" },
                status: "A"
            }
        ]);
        expect(await db.collection("inventory").count()).to.be.equal(5);
        expect(await db.collection("inventory").find({}).count()).to.be.equal(5);
        expect(await db.collection("inventory").find({ status: "D" }).count()).to.be.equal(2);
        expect(await db.collection("inventory").find({
            status: { $in: ["A", "D"] }
        }).count()).to.be.equal(5);
        expect(await db.collection("inventory").find({
            status: "A",
            qty: { $lt: 30 }
        }).count()).to.be.equal(1);
        expect(await db.collection("inventory").find({
            $or: [{ status: "A" }, { qty: { $lt: 30 } }]
        }).count()).to.be.equal(3);
        expect(await db.collection("inventory").find({
            status: "A",
            $or: [{ qty: { $lt: 30 } }, { item: { $regex: "^p" } }]
        }).count()).to.be.equal(2);
    });

    it("query embedded documents", async () => {
        const db = await mongo.connect(this.url());
        await db.collection("inventory").deleteMany({});
        await db.collection("inventory").insertMany([
            {
                item: "journal",
                qty: 25,
                size: { h: 14, w: 21, uom: "cm" },
                status: "A"
            },
            {
                item: "notebook",
                qty: 50,
                size: { h: 8.5, w: 11, uom: "in" },
                status: "A"
            },
            {
                item: "paper",
                qty: 100,
                size: { h: 8.5, w: 11, uom: "in" },
                status: "D"
            },
            {
                item: "planner",
                qty: 75, size: { h: 22.85, w: 30, uom: "cm" },
                status: "D"
            },
            {
                item: "postcard",
                qty: 45,
                size: { h: 10, w: 15.25, uom: "cm" },
                status: "A"
            }
        ]);
        expect(await db.collection("inventory").find({
            size: { h: 14, w: 21, uom: "cm" }
        }).count()).to.be.equal(1);
        expect(await db.collection("inventory").find({
            size: { w: 21, h: 14, uom: "cm" }
        }).count()).to.be.equal(0);
        expect(await db.collection("inventory").find({
            "size.uom": "in"
        }).count()).to.be.equal(2);
        expect(await db.collection("inventory").find({
            "size.h": { $lt: 15 }
        }).count()).to.be.equal(4);
        expect(await db.collection("inventory").find({
            "size.h": { $lt: 15 },
            "size.uom": "in",
            status: "D"
        }).count()).to.be.equal(1);
    });

    it("query arrays", async () => {
        const db = await mongo.connect(this.url());
        await db.collection("inventory").deleteMany({});
        await db.collection("inventory").insertMany([
            {
                item: "journal",
                qty: 25,
                tags: ["blank", "red"],
                dimCm: [14, 21]
            },
            {
                item: "notebook",
                qty: 50,
                tags: ["red", "blank"],
                dimCm: [14, 21]
            },
            {
                item: "paper",
                qty: 100,
                tags: ["red", "blank", "plain"],
                dimCm: [14, 21]
            },
            {
                item: "planner",
                qty: 75,
                tags: ["blank", "red"],
                dimCm: [22.85, 30]
            },
            {
                item: "postcard",
                qty: 45,
                tags: ["blue"],
                dimCm: [10, 15.25]
            }
        ]);
        expect(await db.collection("inventory").find({
            tags: ["red", "blank"]
        }).count()).to.be.equal(1);
        expect(await db.collection("inventory").find({
            tags: { $all: ["red", "blank"] }
        }).count()).to.be.equal(4);
        expect(await db.collection("inventory").find({
            tags: "red"
        }).count()).to.be.equal(4);
        expect(await db.collection("inventory").find({
            dimCm: { $gt: 25 }
        }).count()).to.be.equal(1);
        expect(await db.collection("inventory").find({
            dimCm: { $gt: 15, $lt: 20 }
        }).count()).to.be.equal(4);
        expect(await db.collection("inventory").find({
            dimCm: { $elemMatch: { $gt: 22, $lt: 30 } }
        }).count()).to.be.equal(1);
        expect(await db.collection("inventory").find({
            "dimCm.1": { $gt: 25 }
        }).count()).to.be.equal(1);
        expect(await db.collection("inventory").find({
            tags: { $size: 3 }
        }).count()).to.be.equal(1);
    });

    it("query array of documents", async () => {
        const db = await mongo.connect(this.url());
        await db.collection("inventory").deleteMany({});
        await db.collection("inventory").insertMany([
            {
                item: "journal",
                instock: [
                    { warehouse: "A", qty: 5 },
                    { warehouse: "C", qty: 15 }]
            },
            {
                item: "notebook",
                instock: [
                    { warehouse: "C", qty: 5 }]
            },
            {
                item: "paper",
                instock: [
                    { warehouse: "A", qty: 60 },
                    { warehouse: "B", qty: 15 }]
            },
            {
                item: "planner",
                instock: [
                    { warehouse: "A", qty: 40 },
                    { warehouse: "B", qty: 5 }]
            },
            {
                item: "postcard",
                instock: [
                    { warehouse: "B", qty: 15 },
                    { warehouse: "C", qty: 35 }]
            }
        ]);
        expect(await db.collection("inventory").find({
            instock: { warehouse: "A", qty: 5 }
        }).count()).to.be.equal(1);
        expect(await db.collection("inventory").find({
            instock: { qty: 5, warehouse: "A" }
        }).count()).to.be.equal(0);
        expect(await db.collection("inventory").find({
            "instock.0.qty": { $lte: 20 }
        }).count()).to.be.equal(3);
        expect(await db.collection("inventory").find({
            "instock.qty": { $lte: 20 }
        }).count()).to.be.equal(5);
        expect(await db.collection("inventory").find({
            instock: { $elemMatch: { qty: 5, warehouse: "A" } }
        }).count()).to.be.equal(1);
        expect(await db.collection("inventory").find({
            instock: { $elemMatch: { qty: { $gt: 10, $lte: 20 } } }
        }).count()).to.be.equal(3);
        expect(await db.collection("inventory").find({
            "instock.qty": { $gt: 10, $lte: 20 }
        }).count()).to.be.equal(4);
        expect(await db.collection("inventory").find({
            "instock.qty": 5, "instock.warehouse": "A"
        }).count()).to.be.equal(2);
    });

    it("query null", async () => {
        const db = await mongo.connect(this.url());
        await db.collection("inventory").deleteMany({});
        await db.collection("inventory").insertMany([
            { _id: 1, item: null },
            { _id: 2 }
        ]);
        expect(await db.collection("inventory").find({
            item: null
        }).count()).to.be.equal(2);
        expect(await db.collection("inventory").find({
            item: { $type: 10 }
        }).count()).to.be.equal(1);
        expect(await db.collection("inventory").find({
            item: { $exists: false }
        }).count()).to.be.equal(1);
    });

    it("projection", async () => {
        const db = await mongo.connect(this.url());
        await db.collection("inventory").deleteMany({});
        await db.collection("inventory").insertMany([
            {
                item: "journal",
                status: "A",
                size: { h: 14, w: 21, uom: "cm" },
                instock: [{ warehouse: "A", qty: 5 }]
            },
            {
                item: "notebook",
                status: "A",
                size: { h: 8.5, w: 11, uom: "in" },
                instock: [{ warehouse: "C", qty: 5 }]
            },
            {
                item: "paper",
                status: "D",
                size: { h: 8.5, w: 11, uom: "in" },
                instock: [{ warehouse: "A", qty: 60 }]
            },
            {
                item: "planner",
                status: "D",
                size: { h: 22.85, w: 30, uom: "cm" },
                instock: [{ warehouse: "A", qty: 40 }]
            },
            {
                item: "postcard",
                status: "A",
                size: { h: 10, w: 15.25, uom: "cm" },
                instock: [
                    { warehouse: "B", qty: 15 },
                    { warehouse: "C", qty: 35 }]
            }
        ]);
        expect(await db.collection("inventory").find({
            status: "A"
        }).count()).to.be.equal(3);
        {
            const docs = await db.collection("inventory").find({
                status: "A"
            }).project({ item: 1, status: 1 }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.keys("_id", "item", "status");
                expect(doc).not.to.have.any.keys("size", "instock");
            }
        }
        {
            const docs = await db.collection("inventory").find({
                status: "A"
            }).project({ item: 1, status: 1, _id: 0 }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.keys("item", "status");
                expect(doc).not.to.have.any.keys("_id", "size", "instock");
            }
        }
        {
            const docs = await db.collection("inventory").find({
                status: "A"
            }).project({ status: 0, instock: 0 }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.keys("_id", "item", "size");
                expect(doc).not.to.have.any.keys("status", "instock");
            }
        }
        {
            const docs = await db.collection("inventory").find({
                status: "A"
            }).project({ status: 0, instock: 0 }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.keys("_id", "item", "size");
                expect(doc).not.to.have.any.keys("status", "instock");
            }
        }
        {
            const docs = await db.collection("inventory").find({
                status: "A"
            }).project({ item: 1, status: 1, "size.uom": 1 }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.keys("_id", "item", "status", "size");
                expect(doc).not.to.have.property("instock");
                expect(doc.size).to.have.property("uom");
                expect(doc.size).not.to.have.any.keys("h", "w");
            }
        }
        {
            const docs = await db.collection("inventory").find({
                status: "A"
            }).project({ "size.uom": 0 }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.keys("_id", "item", "status", "size", "instock");
                expect(doc.size).not.to.have.property("uom");
                expect(doc.size).to.have.keys("h", "w");
            }
        }
        {
            const docs = await db.collection("inventory").find({
                status: "A"
            }).project({ item: 1, status: 1, "instock.qty": 1 }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.keys("_id", "item", "status", "instock");
                expect(doc).not.to.have.property("size");
                expect(doc.instock).to.be.an("array");
                for (const subdoc of doc.instock) {
                    expect(subdoc).not.to.have.property("warehouse");
                    expect(subdoc).to.have.property("qty");
                }
            }
        }
        {
            const docs = await db.collection("inventory").find({
                status: "A"
            }).project({ item: 1, status: 1, instock: { $slice: -1 } }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.keys("_id", "item", "status", "instock");
                expect(doc).not.to.have.property("size");
                expect(doc.instock).to.be.an("array");
                expect(doc.instock).to.have.lengthOf(1);
            }
        }
    });

    it("update and replace", async () => {
        const db = await mongo.connect(this.url());
        await db.collection("inventory").deleteMany({});
        await db.collection("inventory").insertMany([
            {
                item: "canvas",
                qty: 100,
                size: { h: 28, w: 35.5, uom: "cm" },
                status: "A"
            },
            {
                item: "journal",
                qty: 25,
                size: { h: 14, w: 21, uom: "cm" },
                status: "A"
            },
            {
                item: "mat",
                qty: 85,
                size: { h: 27.9, w: 35.5, uom: "cm" },
                status: "A"
            },
            {
                item: "mousepad",
                qty: 25,
                size: { h: 19, w: 22.85, uom: "cm" },
                status: "P"
            },
            {
                item: "notebook",
                qty: 50,
                size: { h: 8.5, w: 11, uom: "in" },
                status: "P"
            },
            {
                item: "paper",
                qty: 100,
                size: { h: 8.5, w: 11, uom: "in" },
                status: "D"
            },
            {
                item: "planner",
                qty: 75,
                size: { h: 22.85, w: 30, uom: "cm" },
                status: "D"
            },
            {
                item: "postcard",
                qty: 45,
                size: { h: 10, w: 15.25, uom: "cm" },
                status: "A"
            },
            {
                item: "sketchbook",
                qty: 80,
                size: { h: 14, w: 21, uom: "cm" },
                status: "A"
            },
            {
                item: "sketch pad",
                qty: 95,
                size: { h: 22.85, w: 30.5, uom: "cm" },
                status: "A"
            }
        ]);
        await db.collection("inventory").replaceOne(
            { item: "paper" },
            {
                $set: { "size.uom": "cm", status: "P" },
                $currentDate: { lastModified: true }
            }
        );
        {
            const docs = await db.collection("inventory").find({
                item: "paper"
            }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.nested.property("size.uom", "cm");
                expect(doc).to.have.property("status", "P");
                expect(doc.lastModified).to.be.ok;
            }
        }

        await db.collection("inventory").updateMany(
            { qty: { $lt: 50 } },
            {
                $set: { "size.uom": "in", status: "P" },
                $currentDate: { lastModified: true }
            }
        );
        {
            const docs = await db.collection("inventory").find({
                qty: { $lt: 50 }
            }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.nested.property("size.uom", "in");
                expect(doc).to.have.property("status", "P");
                expect(doc.lastModified).to.be.ok;
            }
        }
        await db.collection("inventory").updateOne(
            { item: "paper" },
            {
                item: "paper",
                instock: [
                    { warehouse: "A", qty: 60 },
                    { warehouse: "B", qty: 40 }
                ]
            }
        );
        {
            const docs = await db.collection("inventory").find({
                item: "paper"
            }).project({ _id: 0 }).toArray();
            expect(docs).not.to.be.empty;
            for (const doc of docs) {
                expect(doc).to.have.keys("item", "instock");
                expect(doc.instock).to.be.an("array");
                expect(doc.instock).to.have.lengthOf(2);
            }
        }
    });

    it("aggregation", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("aggregationExample2_with_promise");
        await collection.insertMany([{
            title: "this is my title",
            author: "bob",
            posted: new Date(),
            pageViews: 5,
            tags: ["fun", "good", "fun"],
            other: { foo: 5 },
            comments: [
                { author: "joe", text: "this is cool" },
                { author: "sam", text: "this is bad" }
            ]
        }], { w: 1 });
        const cursor = collection.aggregate([
            {
                $project: {
                    author: 1,
                    tags: 1
                }
            },
            { $unwind: "$tags" },
            {
                $group: {
                    _id: { tags: "$tags" },
                    authors: { $addToSet: "$author" }
                }
            }
        ], { cursor: { batchSize: 1 } });
        const docs = await cursor.toArray();
        expect(docs).to.have.lengthOf(2);
        await db.close();
    });

    it("aggregation cursor next", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("aggregation_next_example_with_promise");
        await collection.insertMany([{
            title: "this is my title", author: "bob", posted: new Date(),
            pageViews: 5,
            tags: ["fun", "good", "fun"],
            other: { foo: 5 },
            comments: [
                { author: "joe", text: "this is cool" },
                { author: "sam", text: "this is bad" }
            ]
        }], { w: 1 });
        const cursor = collection.aggregate([
            {
                $project: {
                    author: 1,
                    tags: 1
                }
            },
            { $unwind: "$tags" },
            {
                $group: {
                    _id: { tags: "$tags" },
                    authors: { $addToSet: "$author" }
                }
            }
        ], { cursor: { batchSize: 1 } });
        const doc = await cursor.next();
        expect(doc).be.deep.equal({ _id: { tags: "good" }, authors: ["bob"] });
        await db.close();
    });

    it("should create complex index on two fields", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("createIndexExample1_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4 }
        ]);
        await collection.createIndex({ a: 1, b: 1 }, { unique: true, background: true, w: 1 });
        const items = await collection.find({}).toArray();
        expect(items).to.have.lengthOf(4);
        const explanation = await collection.find({ a: 2 }).explain();
        expect(explanation).to.be.ok;
        await db.close();
    });

    it("should correctly handle distinct indexes with sub query filter", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("distinctExample1_with_promise");
        await collection.insertMany([
            { a: 0, b: { c: "a" } },
            { a: 1, b: { c: "b" } },
            { a: 1, b: { c: "c" } },
            { a: 2, b: { c: "a" } },
            { a: 3 },
            { a: 3 }
        ]);
        expect((await collection.distinct("a")).sort()).to.be.deep.equal([0, 1, 2, 3]);
        expect((await collection.distinct("b.c")).sort()).to.be.deep.equal(["a", "b", "c"]);
        await db.close();
    });

    it("should correctly handle distinct indexes", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("distinctExample2_with_promise");
        await collection.insertMany([
            { a: 0, b: { c: "a" } },
            { a: 1, b: { c: "b" } },
            { a: 1, b: { c: "c" } },
            { a: 2, b: { c: "a" } },
            { a: 3 },
            { a: 3 },
            { a: 5, c: 1 }
        ]);
        expect(await collection.distinct("a", { c: 1 })).to.be.deep.equal([5]);
        await db.close();
    });

    it("should correctly drop collection", async () => {
        const db = await mongo.connect(this.url());
        const collection = await db.createCollection("test_other_drop_with_promise");
        await collection.drop();
        const collections = await db.listCollections().toArray();
        expect(collections.map((x) => x.name)).not.to.include("test_other_drop_with_promise");
        await db.close();
    });

    it("drop all indexes", async () => {
        const db = await mongo.connect(this.url());
        await db.createCollection("dropExample1_with_promise");
        await db.collection("dropExample1_with_promise");
        await db.close();
    });

    it("should correctly create and drop index", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("dropIndexExample1_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4 }
        ], { w: 1 });
        await collection.ensureIndex({ a: 1, b: 1 }, { unique: true, background: true, w: 1 });
        await collection.dropIndex("a_1_b_1");
        const info = await collection.indexInformation();
        expect(info._id_).to.be.deep.equal([["_id", 1]]);
        expect(info).not.to.have.property("a_1_b_1");
        await db.close();
    });

    it("should create complex ensure index", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("ensureIndexExample1_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4 }
        ]);
        await db.ensureIndex("ensureIndexExample1_with_promise", {
            a: 1,
            b: 1
        }, {
            unique: true,
            background: true,
            w: 1
        });
        const docs = await collection.find({}).toArray();
        expect(docs).to.have.lengthOf(4);
        const explanation = await collection.find({ a: 2 }).explain();
        expect(explanation).to.be.ok;
        await db.close();
    });

    it("ensure index with compount index", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("ensureIndexExample2_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4 }
        ], { w: 1 });
        await collection.ensureIndex({ a: 1, b: 1 }, { unique: true, background: true, w: 1 });
        const items = await collection.find({}).toArray();
        expect(items).to.have.lengthOf(4);
        const explanation = await collection.find({ a: 2 }).explain();
        expect(explanation).to.be.ok;
        await db.close();
    });

    it("should perform a simple explain query", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("simple_explain_query_with_promise");
        await collection.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);
        const docs = await collection.find({}).explain();
        expect(docs).to.be.ok;
        await db.close();
    });

    it("should perform a simple limit/skip query", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("simple_limit_skip_query_with_promise");
        await collection.insertMany([{ a: 1, b: 1 }, { a: 2, b: 2 }, { a: 3, b: 3 }]);
        const docs = await collection.find({})
            .skip(1)
            .limit(1)
            .project({ b: 1 })
            .toArray();
        expect(docs).to.have.lengthOf(1);
        expect(docs[0]).not.to.have.property("a");
        expect(docs[0]).to.have.property("b", 2);
        await db.close();
    });

    it("should perform simple findAndModify operations", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("simple_find_and_modify_operations_with_promise");
        await collection.insertMany([{ a: 1 }, { b: 1 }, { c: 1 }]);
        {
            const doc = await collection.findAndModify({ a: 1 }, [["a", 1]], { $set: { b1: 1 } }, { new: true });
            expect(doc.value).to.include({ a: 1, b1: 1 });
        }
        {
            await collection.findAndModify({ b: 1 }, [["b", 1]], { $set: { b: 2 } }, { remove: true });
            expect(await collection.findOne({ b: 1 })).to.be.null;
        }
        {
            const doc = await collection.findAndModify({ d: 1 }, [["b", 1]], { d: 1, f: 1 }, { new: true, upsert: true, w: 1 });
            expect(doc.value).to.include({ d: 1, f: 1 });
        }
        await db.close();
    });

    it("should perform simple findAndRemove", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("simple_find_and_modify_operations_2_with_promise");
        await collection.insertMany([
            { a: 1 },
            { b: 1, d: 1 },
            { c: 1 }
        ]);
        const doc = await collection.findAndRemove({ b: 1 }, [["b", 1]]);
        expect(doc.value).to.include({ b: 1, d: 1 });
        expect(await collection.findOne({ b: 1 })).to.be.null;
        await db.close();
    });

    it("should perform a simple limit skip findOne query", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("simple_limit_skip_find_one_query_with_promise");
        await collection.insertMany([{ a: 1, b: 1 }, { a: 2, b: 2 }, { a: 3, b: 3 }]);
        const doc = await collection.findOne({ a: 2 }, { fields: { b: 1 } });
        expect(doc).not.to.have.property("a");
        expect(doc).to.have.property("b", 2);
        await db.close();
    });

    it("should correctly perform simple geoNear command", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("simple_geo_near_command_with_promise");
        await collection.ensureIndex({ loc: "2d" });
        await collection.insertMany([{ a: 1, loc: [50, 30] }, { a: 1, loc: [30, 50] }]);
        const docs = await collection.geoNear(50, 50, { query: { a: 1 }, num: 1 });
        expect(docs.results).to.have.lengthOf(1);
        await db.close();
    });

    if (this.topology !== "sharded") {
        // https://docs.mongodb.com/manual/reference/command/geoSearch
        // geoSearch is not supported for sharded clusters.
        it("should correctly perform simple geoHaystack search command", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("simple_geo_haystack_command_with_promise");
            await collection.ensureIndex({ loc: "geoHaystack", type: 1 }, { bucketSize: 1 });
            await collection.insertMany([{ a: 1, loc: [50, 30] }, { a: 1, loc: [30, 50] }]);
            const docs = await collection.geoHaystackSearch(50, 50, { search: { a: 1 }, limit: 1, maxDistance: 100 });
            expect(docs.results).to.have.lengthOf(1);
            await db.close();
        });
    }

    it("should correctly execute group function", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("test_group_with_promise");
        {
            const results = await collection.group([], {}, { count: 0 }, "function (obj, prev) { prev.count++; }");
            expect(results).to.be.empty;
        }
        await collection.insertMany([{ a: 2 }, { b: 5 }, { a: 1 }], { w: 1 });
        {
            const results = await collection.group([], {}, { count: 0 }, "function (obj, prev) { prev.count++; }");
            expect(results[0].count).to.be.equal(3);
        }
        {
            const results = await collection.group([], {}, { count: 0 }, "function (obj, prev) { prev.count++; }", false);
            expect(results[0].count).to.be.equal(3);
        }
        {
            const results = await collection.group([], { a: { $gt: 1 } }, { count: 0 }, "function (obj, prev) { prev.count++; }");
            expect(results[0].count).to.be.equal(1);
        }
        {
            const results = await collection.group([], { a: { $gt: 1 } }, { count: 0 }, "function (obj, prev) { prev.count++; }", false);
            expect(results[0].count).to.be.equal(1);
        }
        await collection.insertMany([{ a: 2 }, { b: 3 }], { w: 1 });
        {
            const results = await collection.group(["a"], {}, { count: 0 }, "function (obj, prev) { prev.count++; }");
            expect(results).to.have.lengthOf(3);
            expect(results[0].a).to.be.equal(2);
            expect(results[0].count).to.be.equal(2);
            expect(results[1].a).to.be.null;
            expect(results[1].count).to.be.equal(2);
            expect(results[2].a).to.be.equal(1);
            expect(results[2].count).to.be.equal(1);
        }
        {
            const results = await collection.group({ a: true }, {}, { count: 0 }, (obj, prev) => {
                prev.count++;
            }, true);
            expect(results).to.have.lengthOf(3);
            expect(results[0].a).to.be.equal(2);
            expect(results[0].count).to.be.equal(2);
            expect(results[1].a).to.be.null;
            expect(results[1].count).to.be.equal(2);
            expect(results[2].a).to.be.equal(1);
            expect(results[2].count).to.be.equal(1);
        }
        {
            await assert.throws(async () => {
                await collection.group([], {}, {}, "5 ++ 5");
            });
        }
        {
            const keyf = function (doc) {
                return { a: doc.a };
            };
            const results = await collection.group(keyf, { a: { $gt: 0 } }, { count: 0, value: 0 }, (obj, prev) => {
                prev.count++;
                prev.value += obj.a;
            }, true);
            results.sort((a, b) => b.count - a.count);
            expect(results[0].count).to.be.equal(2);
            expect(results[0].a).to.be.equal(2);
            expect(results[0].value).to.be.equal(4);
            expect(results[1].count).to.be.equal(1);
            expect(results[1].a).to.be.equal(1);
            expect(results[1].value).to.be.equal(1);
        }
        {
            // requires a function
            const keyf = new mongo.Code(function (doc) {  // eslint-disable-line
                return { a: doc.a };
            });
            const results = await collection.group(keyf, { a: { $gt: 0 } }, { count: 0, value: 0 }, (obj, prev) => {
                prev.count++;
                prev.value += obj.a;
            }, true);
            results.sort((a, b) => b.count - a.count);
            expect(results[0].count).to.be.equal(2);
            expect(results[0].a).to.be.equal(2);
            expect(results[0].value).to.be.equal(4);
            expect(results[1].count).to.be.equal(1);
            expect(results[1].a).to.be.equal(1);
            expect(results[1].value).to.be.equal(1);
        }
        {
            await assert.throws(async () => {
                await collection.group([], {}, {}, "5 ++ 5", false);
            });
        }
        await db.close();
    });

    it("should perform simple mapReduce functions", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("test_map_reduce_functions_with_promise");
        await collection.insertMany([{ userId: 1 }, { userId: 2 }], { w: 1 });
        const map = function () {
            emit(this.userId, 1);
        };
        const reduce = function (k, vals) {
            return 1;
        };
        // Mapreduce returns the temporary collection with the results
        const tmp = await collection.mapReduce(map, reduce, { out: { replace: "tempCollection" } });
        {
            const result = await tmp.findOne({ _id: 1 });
            expect(result.value).to.be.equal(1);
        }
        {
            const result = await tmp.findOne({ _id: 2 });
            expect(result.value).to.be.equal(1);
        }
        await db.close();
    });

    it("should perform mapReduce function inline", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("test_map_reduce_functions_inline_with_promise");
        await collection.insertMany([{ userId: 1 }, { userId: 2 }], { w: 1 });
        const map = function () {
            emit(this.userId, 1);
        };
        // Reduce function
        const reduce = function (k, vals) {
            return 1;
        };
        {
            const result = await collection.mapReduce(map, reduce, { out: { inline: 1 }, verbose: true });
            expect(result.results).to.have.lengthOf(2);
            expect(result.stats).to.be.ok;
        }
        {
            const result = await collection.mapReduce(map, reduce, { out: { replace: "mapreduce_integration_test" }, verbose: true });
            expect(result.stats).to.be.ok;
        }
        await db.close();
    });

    it("should perform mapReduce with context", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("test_map_reduce_functions_scope_with_promise");
        await collection.insertMany([
            { userId: 1, timestamp: new Date() },
            { userId: 2, timestamp: new Date() }
        ], { w: 1 });

        const map = function () {
            emit(fn(this.timestamp.getYear()), 1);
        };
        const reduce = function (k, v) {
            let count = 0;
            for (let i = 0; i < v.length; i++) {
                count += v[i];
            }
            return count;
        };
        // Javascript function available in the map reduce scope
        const t = function (val) {
            return val + 1;
        };
        {
            // Execute the map reduce with the custom scope
            const o = {};
            o.scope = { fn: new mongo.Code(t.toString()) };
            o.out = { replace: "replacethiscollection" };
            const tmp = await collection.mapReduce(map, reduce, o);
            const results = await tmp.find().toArray();
            expect(results[0].value).to.be.equal(2);
        }
        {
            // mapReduce with scope containing plain function
            const o = {};
            o.scope = { fn: t };
            o.out = { replace: "replacethiscollection" };
            const tmp = await collection.mapReduce(map, reduce, o);
            const results = await tmp.find().toArray();
            expect(results[0].value).to.be.equal(2);
        }
        await db.close();
    });

    it("should perform mapReduce in context objects", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("test_map_reduce_functions_scope_objects_with_promise");
        await collection.insertMany([
            { userId: 1, timestamp: new Date() },
            { userId: 2, timestamp: new Date() }
        ], { w: 1 });
        const map = function () {
            emit(obj.fn(this.timestamp.getYear()), 1);
        };
        const reduce = function (k, v) {
            let count = 0;
            for (let i = 0; i < v.length; i++) {
                count += v[i];
            }
            return count;
        };
        // Javascript function available in the map reduce scope
        const t = function (val) {
            return val + 1;
        };
        {
            // Execute the map reduce with the custom scope containing objects
            const o = {};
            o.scope = { obj: { fn: new mongo.Code(t.toString()) } };
            o.out = { replace: "replacethiscollection" };
            const tmp = await collection.mapReduce(map, reduce, o);
            const results = await tmp.find().toArray();
            expect(results[0].value).to.be.equal(2);
        }
        {
            // mapReduce with scope containing plain function
            const o = {};
            o.scope = { obj: { fn: t } };
            o.out = { replace: "replacethiscollection" };
            const tmp = await collection.mapReduce(map, reduce, o);
            const results = await tmp.find().toArray();
            expect(results[0].value).to.be.equal(2);
        }
        await db.close();
    });

    it("should correctly retrive collections indexes", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("simple_key_based_distinct_with_promise");
        await collection.ensureIndex({ loc: "2d" });
        await collection.ensureIndex({ a: 1 });
        const indexes = await collection.indexes();
        expect(indexes).to.have.lengthOf(3);
        await db.close();
    });

    it("should correctly execute index exists", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("test_collection_index_exists_with_promise");
        await collection.createIndex("a");
        expect(await collection.indexExists("a_1")).to.be.true;
        expect(await collection.indexExists(["a_1", "_id_"])).to.be.true;
        expect(await collection.indexExists("c_1")).to.be.false;
        await db.close();
    });

    it("should correctly show the results from index information", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("more_index_information_test_2_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4 }
        ]);
        await collection.ensureIndex({ a: 1, b: 1 }, { unique: true, background: true, w: 1 });
        {
            const info = await db.indexInformation("more_index_information_test_2_with_promise");
            expect(info._id_).to.be.deep.equal([["_id", 1]]);
            expect(info.a_1_b_1).to.be.deep.equal([["a", 1], ["b", 1]]);
        }
        {
            const info = await collection.indexInformation({ full: true });
            expect(info[0].key).to.be.deep.equal({ _id: 1 });
            expect(info[1].key).to.be.deep.equal({ a: 1, b: 1 });
        }
        await db.close();
    });

    it("should correctly show all the results from index information", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("more_index_information_test_3_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4 }
        ], { w: 1 });
        await collection.ensureIndex({ a: 1, b: 1 }, { unique: true, background: true, w: 1 });
        {
            const info = await collection.indexInformation();
            expect(info._id_).to.be.deep.equal([["_id", 1]], );
            expect(info.a_1_b_1).to.be.deep.equal([["a", 1], ["b", 1]], );
        }
        {
            const info = await collection.indexInformation({ full: true });
            expect(info[0].key).to.be.deep.equal({ _id: 1 });
            expect(info[1].key).to.be.deep.equal({ a: 1, b: 1 });
        }
        await db.close();
    });

    it("should correctly perform a batch document insert safe", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("batch_document_insert_collection_safe_with_promise");
        await collection.insertMany([{ hello: "world_safe1" }, { hello: "world_safe2" }], { w: 1 });
        const item = await collection.findOne({ hello: "world_safe2" });
        expect(item.hello).to.be.equal("world_safe2");
        await db.close();
    });

    it("should correctly perform a simple document insert with function safe", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("simple_document_insert_with_function_safe_with_promise");
        await collection.insertOne({
            hello: "world",
            func: function () { }  // eslint-disable-line
        }, { w: 1, serializeFunctions: true });
        const item = await collection.findOne({ hello: "world" });
        expect(item.func.code).to.be.equal("function () {}");
        await db.close();
    });

    if (this.topology === "single") {
        it("Should correctly execute insert with keepGoing option on mongod >= 1.9.1", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("keepGoingExample_with_promise");
            await collection.drop().catch(() => { });
            await collection.ensureIndex({ title: 1 }, { unique: true });
            await collection.insertMany([
                { name: "Jim" },
                { name: "Sarah", title: "Princess" }
            ]);
            await collection.insert([
                { name: "Jim" },
                { name: "Sarah", title: "Princess" },
                { name: "Gump", title: "Gump" }
            ], { w: 1, keepGoing: true }).catch(() => { });
            expect(await collection.count()).to.be.equal(3);
            await db.close();
        });
    }

    it("should correctly execute isCapped", async () => {
        const db = await mongo.connect(this.url());
        const collection = await db.createCollection("test_collection_is_capped_with_promise", { capped: true, size: 1024 });
        expect(collection.collectionName).to.be.equal("test_collection_is_capped_with_promise");
        expect(await collection.isCapped()).to.be.true;
        await db.close();
    });

    it("should correctly retrive collection options", async () => {
        const db = await mongo.connect(this.url());
        const collection = await db.createCollection("test_collection_options_with_promise", { capped: true, size: 1024 });
        expect(collection.collectionName).to.be.equal("test_collection_options_with_promise");
        const options = await collection.options();
        expect(options.capped).to.be.true;
        expect(options.size).to.be.at.least(1024);
        await db.close();
    });

    if (this.topology === "single" || this.topology === "replicaset") {
        it("should correctly execute parallelCollectionScan with multiple cursors", async () => {
            const db = await mongo.connect(this.url());
            const docs = [];

            // Insert some documents
            for (let i = 0; i < 1000; i++) {
                docs.push({ a: i });
            }

            const collection = db.collection("parallelCollectionScan_with_promise");
            await collection.insertMany(range(1000).map((i) => ({ a: i })));
            const numCursors = 3;
            const cursors = await collection.parallelCollectionScan({ numCursors });
            expect(cursors).not.to.be.empty;
            const results = [];
            for (const cursor of cursors) {
                results.push(...(await cursor.toArray()));
            }
            expect(results).to.have.lengthOf(1000);
            await db.close();
        });
    }

    it("should correctly index and force reindex on collection", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("shouldCorrectlyForceReindexOnCollection_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4, c: 4 }
        ], { w: 1 });
        await collection.ensureIndex({ a: 1, b: 1 }, { unique: true, background: true, w: 1 });
        expect(await collection.reIndex()).to.be.true;
        const info = await collection.indexInformation();
        expect(info._id_).to.be.deep.equal([["_id", 1]]);
        expect(info.a_1_b_1).to.be.deep.equal([["a", 1], ["b", 1]]);
        await db.close();
    });

    it("should remove all documents no safe", async () => {
        const db = await mongo.connect(this.url(), { w: 0 });
        const collection = db.collection("remove_all_documents_no_safe_with_promise");
        await collection.insertMany([{ a: 1 }, { b: 2 }], { w: 1 });
        await collection.removeMany();
        expect(await collection.find().toArray()).to.be.empty;
        await db.close();
    });

    it("should remove subset of documents safe mode", async () => {
        const db = await mongo.connect(this.url(), { w: 0 });
        const collection = db.collection("remove_subset_of_documents_safe_with_promise");
        await collection.insertMany([{ a: 1 }, { b: 2 }], { w: 1 });
        const r = await collection.removeOne({ a: 1 }, { w: 1 });
        expect(r.result.n).to.be.equal(1);
        await db.close();
    });

    it("should correctly rename collection", async () => {
        const db = await mongo.connect(this.url());
        let collection1 = await db.createCollection("test_rename_collection_with_promise");
        await db.createCollection("test_rename_collection2_with_promise");
        await assert.throws(async () => {
            await collection1.rename(5);
        }, Error, "must be a String");
        await assert.throws(async () => {
            await collection1.rename("");
        }, Error, "cannot be empty");
        await assert.throws(async () => {
            await collection1.rename("te$t");
        }, Error, "must not contain '$'");
        await assert.throws(async () => {
            await collection1.rename(".test");
        }, Error, "must not start or end with '.'");
        await assert.throws(async () => {
            await collection1.rename("test.");
        }, Error, "must not start or end with '.'");
        await assert.throws(async () => {
            await collection1.rename("tes..t");
        }, "names cannot be empty");
        await collection1.insertMany([{ x: 1 }, { x: 2 }]);
        await assert.throws(async () => {
            await collection1.rename("test_rename_collection2_with_promise");
        }, "exists");
        collection1 = await collection1.rename("test_rename_collection3_with_promise");
        expect(collection1.collectionName).to.be.equal("test_rename_collection3_with_promise");
        expect(await collection1.count()).to.be.equal(2);
        await db.close();
    });

    it("should correctly save a simple document with promises", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("save_a_simple_document_with_promise");
        await collection.save({ hello: "world" });
        const item = await collection.findOne({ hello: "world" });
        expect(item.hello).to.be.equal("world");
        await db.close();
    });

    it("should correctly save a simple document, modify it and resave it", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("save_a_simple_document_modify_it_and_resave_it_with_promise");
        await collection.save({ hello: "world" });
        {
            const item = await collection.findOne({ hello: "world" });
            expect(item.hello).to.be.equal("world");
            item.hello2 = "world2";
            await collection.save(item);
        }
        {
            const item = await collection.findOne({ hello: "world" });
            expect(item).to.include({
                hello: "world",
                hello2: "world2"
            });
        }
        await db.close();
    });

    it("should correctly update a simple document", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("update_a_simple_document_with_promise");
        await collection.insertOne({ a: 1 });
        await collection.updateOne({ a: 1 }, { $set: { b: 2 } });
        const item = await collection.findOne({ a: 1 });
        expect(item).to.include({
            a: 1,
            b: 2
        });
        await db.close();
    });

    it("should correctly upsert a simple document", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("update_a_simple_document_upsert_with_promise");
        const r = await collection.updateOne({ a: 1 }, { b: 2, a: 1 }, { upsert: true, w: 1 });
        expect(r.result.n).to.be.equal(1);
        const item = await collection.findOne({ a: 1 });
        expect(item).to.include({
            a: 1,
            b: 2
        });
        await db.close();
    });

    it("should correctly update multiple documents", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("update_a_simple_document_multi_with_promise");
        await collection.insertMany([{ a: 1, b: 1 }, { a: 1, b: 2 }]);
        const r = await collection.updateMany({ a: 1 }, { $set: { b: 0 } });
        expect(r.result.n).to.be.equal(2);
        const items = await collection.find().toArray();
        expect(items).to.have.lengthOf(2);
        expect(items[0]).to.include({
            a: 1,
            b: 0
        });
        expect(items[1]).to.include({
            a: 1,
            b: 0
        });
        await db.close();
    });

    it("should correctly return a collections stats", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("collection_stats_test_with_promise");
        await collection.insertMany([{ a: 1 }, { hello: "world" }]);
        const stats = await collection.stats();
        expect(stats.count).to.be.equal(2);
        await db.close();
    });

    it("should correctly create and drop all index", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("shouldCorrectlyCreateAndDropAllIndex_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4, c: 4 }
        ], { w: 1 });
        await collection.ensureIndex({ a: 1, b: 1 }, { unique: true, background: true, w: 1 });
        await collection.ensureIndex({ c: 1 }, { unique: true, background: true, sparse: true, w: 1 });
        await collection.dropAllIndexes();
        const info = await collection.indexInformation();
        expect(info._id_).to.be.deep.equal([["_id", 1]]);
        expect(info).not.to.have.any.keys("a_1_b_1", "c_1");
        await db.close();
    });

    it("should correctly fail on retry due to app close of db", async () => {
        const db = await mongo.connect(this.url(), { autoReconnect: false });
        const collection = db.collection("shouldCorrectlyFailOnRetryDueToAppCloseOfDb_with_promise");
        await collection.insertOne({ a: 1 });
        await db.close(true);
        await assert.throws(async () => {
            await collection.insertOne({ a: 2 });
        });
    });

    it("should correctly execute eval functions", async () => {
        const db = await mongo.connect(this.url());
        expect(await db.eval("function (x) {return x;}", [3])).to.be.equal(3);
        expect(await db.eval("function (x) {return x;}", [3], { nolock: true })).to.be.equal(3);
        await db.eval("function (x) {db.test_eval_with_promise.save({y:x});}", [5], { readPreference: mongo.ReadPreference.PRIMARY });
        const collection = await db.collection("test_eval_with_promise");
        const item = await collection.findOne();
        expect(item.y).to.be.equal(5);
        expect(await db.eval("function (x, y) {return x + y;}", [2, 3])).to.be.equal(5);
        expect(await db.eval("function () {return 5;}")).to.be.equal(5);
        expect(await db.eval("2 + 3;")).to.be.equal(5);
        expect(await db.eval(new mongo.Code("2 + 3;"))).to.be.equal(5);
        expect(await db.eval(new mongo.Code("return i;", { i: 2 }))).to.be.equal(2);
        expect(await db.eval(new mongo.Code("i + 3;", { i: 2 }))).to.be.equal(5);
        await assert.throws(async () => {
            await db.eval("5 ++ 5;");
        }, Error);
        await db.close();
    });

    it("should correctly define system level function and execute", async () => {
        const db = await mongo.connect(this.url());
        await db.collection("system.js").deleteMany();
        await db.collection("system.js").insertOne({ _id: "echo", value: new mongo.Code("function(x) { return x; }") });
        expect(await db.eval("echo(5)")).to.be.equal(5);
        await db.close();
    });

    it("should correctly retrieve list of collections", async () => {
        const db = await mongo.connect(this.url());
        const db1 = db.db("listCollectionTestDb2");
        const collection = db1.collection("shouldCorrectlyRetrievelistCollections_with_promise");
        await collection.insertOne({ a: 1 });
        const items = await db1.listCollections({ name: "shouldCorrectlyRetrievelistCollections_with_promise" }).toArray();
        expect(items).to.have.lengthOf(1);
        expect(await db1.listCollections().toArray()).to.have.length.at.least(1);
        await db.close();
    });

    it("should correctly retrieve all collections", async () => {
        const db = await mongo.connect(this.url());
        await db.createCollection("test_correctly_access_collections2_with_promise");
        expect(await db.collections()).to.have.length.at.least(1);
        await db.close();
    });

    it("should correctly logout from the database", async () => {
        const db = await mongo.connect(this.url());
        await db.addUser("user3", "name");
        expect(await db.authenticate("user3", "name")).to.be.true;
        expect(await db.logout()).to.be.true;
        expect(await db.removeUser("user3")).to.be.true;
        await db.close();
    });

    it("should correctly authenticate against the database", async () => {
        const db = await mongo.connect(this.url());
        await db.addUser("user2", "name");
        expect(await db.authenticate("user2", "name")).to.be.true;
        await db.removeUser("user2");
        await db.close();
    });

    it("should correctly add user to db", async () => {
        const db = await mongo.connect(this.url());
        await db.addUser("user", "name");
        await db.removeUser("user");
        await db.close();
    });

    it("should correctly add and remove user", async () => {
        const db = await mongo.connect(this.url());
        await db.addUser("user", "name");
        expect(await db.authenticate("user", "name")).to.be.true;
        expect(await db.logout()).to.be.true;
        await db.removeUser("user");
        await assert.throws(async () => {
            await db.authenticate("user", "name");
        }, /authentication fail/i);
        await db.close();
    });

    it("should correctly create a collection", async () => {
        const db = await mongo.connect(this.url());
        const collection = await db.createCollection("a_simple_collection_with_promise", { capped: true, size: 10000, max: 1000, w: 1 });
        await collection.insertOne({ a: 1 });
        await db.close();
    });

    it("should correctly execute a command against the server", async () => {
        const db = await mongo.connect(this.url());
        await db.command({ ping: 1 });
        await db.close();
    });

    it("should correctly create drop and verify that collection is gone", async () => {
        const db = await mongo.connect(this.url());
        await db.command({ ping: 1 });
        const collection = await db.createCollection("a_simple_create_drop_collection_with_promise", { capped: true, size: 10000, max: 1000, w: 1 });
        await collection.insertOne({ a: 1 });
        await db.dropCollection("a_simple_create_drop_collection_with_promise");
        const collections = await db.listCollections({ name: "a_simple_create_drop_collection_with_promise" }).toArray();
        expect(collections).to.be.empty;
        await db.close();
    });

    it("should correctly rename a collection", async () => {
        const db = await mongo.connect(this.url());
        const collection = await db.createCollection("simple_rename_collection_with_promise");
        await collection.insertOne({ a: 1 });
        expect(await collection.count()).to.be.equal(1);
        const collection2 = await db.renameCollection("simple_rename_collection_with_promise", "simple_rename_collection_2_with_promise");
        expect(await collection2.count()).to.be.equal(1);
        expect(await db.listCollections({ name: "simple_rename_collection_with_promise" }).toArray()).to.be.empty;
        expect(await db.listCollections({ name: "simple_rename_collection_2_with_promise" }).toArray()).to.have.lengthOf(1);
        await db.close();
    });

    it("should create on db complex index on two fields", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("more_complex_index_test_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4 }
        ]);
        await db.createIndex("more_complex_index_test_with_promise", { a: 1, b: 1 }, { unique: true, background: true, w: 1 });
        expect(await collection.find({}).toArray()).to.have.lengthOf(4);
        expect(await collection.find({ a: 2 }).explain()).to.be.ok;
        await db.close();
    });

    it("should create complex ensure index db", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("more_complex_ensure_index_db_test_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4 }
        ]);
        await db.ensureIndex("more_complex_ensure_index_db_test_with_promise", { a: 1, b: 1 }, { unique: true, background: true, w: 1 });
        expect(await collection.find({}).toArray()).to.have.lengthOf(4);
        expect(await collection.find({ a: 2 }).explain()).to.be.ok;
        await db.close();
    });

    it("should correctly drop the database", async () => {
        const db = await mongo.connect(this.url());
        const collection = db.collection("more_index_information_test_1_with_promise");
        await collection.insertMany([
            { a: 1, b: 1 },
            { a: 1, b: 1 },
            { a: 2, b: 2 },
            { a: 3, b: 3 },
            { a: 4, b: 4 }
        ]);
        await db.dropDatabase();
        const { databases } = await db.admin().listDatabases();
        const names = databases.map((x) => x.name);
        expect(names).not.to.include(this.database);
        await db.close();
    });

    it("should correctly retrieve db stats", async () => {
        const db = await mongo.connect(this.url());
        expect(await db.stats()).to.be.ok;
        await db.close();
    });

    it("should correctly share connection pools across multiple db instances", async () => {
        const db = await mongo.connect(this.url());
        const secondDb = db.db("integration_tests_2");
        const multipleColl1 = db.collection("multiple_db_instances_with_promise");
        const multipleColl2 = secondDb.collection("multiple_db_instances_with_promise");
        await multipleColl1.insertOne({ a: 1 }, { w: 1 });
        await multipleColl2.insertOne({ a: 1 }, { w: 1 });
        expect(await multipleColl1.count()).to.be.equal(1);
        expect(await multipleColl2.count()).to.be.equal(1);
        await db.close();
    });

    describe("admin", () => {
        it("should correctly authenticate", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("test_with_promise1");
            await collection.insertOne({ a: 1 }, { w: 1 });
            const adminDb = db.admin();
            await adminDb.addUser("admin2", "admin2");
            expect(await adminDb.authenticate("admin2", "admin2")).to.be.true;
            expect(await adminDb.removeUser("admin2")).to.be.true;
            await db.close();
        });

        it("should correctly retrieve build info", async () => {
            const db = await mongo.connect(this.url());
            const adminDb = db.admin();
            await adminDb.addUser("admin3", "admin3");
            expect(await adminDb.authenticate("admin3", "admin3")).to.be.true;
            expect(await adminDb.buildInfo()).to.be.ok;
            expect(await adminDb.removeUser("admin3")).to.be.true;
            await db.close();
        });

        it("should correctly retrieve build info using command", async () => {
            const db = await mongo.connect(this.url());
            const adminDb = db.admin();
            await adminDb.addUser("admin4", "admin4");
            expect(await adminDb.authenticate("admin4", "admin4")).to.be.true;
            expect(await adminDb.command({ buildInfo: 1 })).to.be.ok;
            expect(await adminDb.removeUser("admin4")).to.be.true;
            await db.close();
        });


        if (this.topology !== "sharded") {
            it("should correctly retrieve profiling level", async () => {
                const db = await mongo.connect(this.url());
                const collection = db.collection("test_with_promise2");
                await collection.insertOne({ a: 1 }, { w: 1 });
                const adminDb = db.admin();
                await adminDb.addUser("admin5", "admin5");
                await adminDb.authenticate("admin5", "admin5");
                expect(await adminDb.profilingLevel()).to.be.equal("off");
                expect(await adminDb.removeUser("admin5")).to.be.true;
                await db.close();
            });

            it("should correctly change profiling level", async () => {
                const db = await mongo.connect(this.url());
                const collection = db.collection("test_with_promise3");
                await collection.insertOne({ a: 1 }, { w: 1 });
                const adminDb = db.admin();
                await adminDb.addUser("admin6", "admin6");
                await adminDb.authenticate("admin6", "admin6");
                await adminDb.setProfilingLevel("slow_only");
                expect(await adminDb.profilingLevel()).to.be.equal("slow_only");
                await adminDb.setProfilingLevel("off");
                expect(await adminDb.profilingLevel()).to.be.equal("off");
                await adminDb.setProfilingLevel("all");
                expect(await adminDb.profilingLevel()).to.be.equal("all");
                await assert.throws(async () => {
                    await adminDb.setProfilingLevel("medium");
                }, "illegal profiling level value medium");
                await adminDb.setProfilingLevel("off");
                expect(await adminDb.removeUser("admin6")).to.be.true;
                await db.close();
            });

            it.skip("should correctly set and extract profiling info", async () => {
                const db = await mongo.connect(this.url());
                const collection = db.collection("test_with_promise4");
                await collection.insertOne({ a: 1 }, { w: 1 });
                const adminDb = db.admin();
                await adminDb.addUser("admin7", "admin7");
                await adminDb.authenticate("admin7", "admin7");
                await adminDb.setProfilingLevel("all");
                await collection.find().toArray();
                await adminDb.setProfilingLevel("off");
                const info = await adminDb.profilingInfo();
                // wtf, returns [] for my 3.4.4
                expect(info).to.be.an("array");
                expect(info).to.have.length.at.least(1);
                expect(info[0].ts).to.be.a("date");
                expect(info[0].millis).to.be.a("number");
                expect(await adminDb.removeUser("admin7")).to.be.true;
                await db.close();
            });
        }

        it("should correctly call validate collection", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("test_with_promise5");
            await collection.insertOne({ a: 1 }, { w: 1 });
            const adminDb = db.admin();
            await adminDb.addUser("admin8", "admin8");
            await adminDb.authenticate("admin8", "admin8");
            await adminDb.validateCollection("test_with_promise5");
            expect(await adminDb.removeUser("admin8")).to.be.true;
            await db.close();
        });

        it("should correctly ping the mongodb instance", async () => {
            const db = await mongo.connect(this.url());
            const adminDb = db.admin();
            await adminDb.addUser("admin9", "admin9");
            expect(await adminDb.authenticate("admin9", "admin9")).to.be.true;
            expect(await adminDb.ping()).to.be.deep.equal({ ok: 1 });
            expect(await adminDb.removeUser("admin9")).to.be.true;
            await db.close();
        });

        it("should correctly use logout function", async () => {
            const db = await mongo.connect(this.url());
            const adminDb = db.admin();
            await adminDb.addUser("admin10", "admin10");
            expect(await adminDb.authenticate("admin10", "admin10")).to.be.true;
            expect(await adminDb.logout()).to.be.true;
            expect(await adminDb.removeUser("admin10")).to.be.true;
            await db.close();
        });

        it("should correctly add a user to admin db", async () => {
            const db = await mongo.connect(this.url());
            const adminDb = db.admin();
            await adminDb.addUser("admin11", "admin11");
            expect(await adminDb.authenticate("admin11", "admin11")).to.be.true;
            expect(await adminDb.removeUser("admin11")).to.be.true;
            await db.close();
        });

        it("should correctly add a user and remove it from admin db", async () => {
            const db = await mongo.connect(this.url());
            const adminDb = db.admin();
            await adminDb.addUser("admin12", "admin12");
            expect(await adminDb.authenticate("admin12", "admin12")).to.be.true;
            expect(await adminDb.removeUser("admin12")).to.be.true;
            await assert.throws(async () => {
                await adminDb.authenticate("admin12", "admin12");
            });
            await db.close();
        });

        it("should correctly list all available databases", async () => {
            const db = await mongo.connect(this.url());
            const adminDb = db.admin();
            const { databases } = await adminDb.listDatabases();
            expect(databases).not.to.be.empty;
            await db.close();
        });

        it("should correctly retrieve server info", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("test_with_promise");
            await collection.insertOne({ a: 1 }, { w: 1 });
            const adminDb = db.admin();
            await adminDb.addUser("admin13", "admin13");
            await adminDb.authenticate("admin13", "admin13");
            expect(await adminDb.serverStatus()).to.be.ok;
            expect(await adminDb.removeUser("admin13")).to.be.true;
            await db.close();
        });
    });

    describe("cursors", () => {
        it("should correctly execute toArray", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("test_array_with_promise");
            await collection.insertOne({ b: [1, 2, 3] });
            const docs = await collection.find().toArray();
            expect(docs).to.have.lengthOf(1);
            expect(docs[0].b).to.be.deep.equal([1, 2, 3]);
            await db.close();
        });

        it("should correctly use cursor count function", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("cursor_count_collection_with_promise");
            await collection.insertMany([{ a: 1 }, { a: 2 }]);
            expect(await collection.find().count()).to.be.equal(2);
            await db.close();
        });

        it("should correctly perform nextOobject on cursor", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("simple_next_object_collection_with_promise");
            await collection.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);
            const item = await collection.find().nextObject();
            expect(item.a).to.be.equal(1);
            await db.close();
        });

        it("should correctly perform simple explain", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("simple_explain_collection_with_promise");
            await collection.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);
            expect(await collection.find().explain()).to.be.ok;
            await db.close();
        });

        it("should stream documents using the close function", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("test_close_function_on_cursor_with_promise");
            await collection.insertMany(range(1000).map((i) => ({ a: i })));
            const cursor = collection.find();
            await cursor.nextObject();
            await cursor.close();
            await db.close();
            // ?
        });
    });

    describe("grid store", () => {
        const { fs } = adone;
        const { GridStore, ObjectId } = mongo;

        it("should correctly execute grid store exists by object id", async () => {
            const db = await mongo.connect(this.url());
            const gridStore = new GridStore(db, null, "w");
            await gridStore.open();
            await gridStore.write("hello world!");
            const result = await gridStore.close();
            expect(await GridStore.exist(db, result._id)).to.be.true;
            expect(await GridStore.exist(db, new ObjectId())).to.be.false;
            expect(await GridStore.exist(db, result._id, "another_root")).to.be.false;
            await db.close();
        });

        it("should correctly execute grid store list", async () => {
            const db = await mongo.connect(this.url());
            const fileId = new ObjectId();
            const gridStore = new GridStore(db, fileId, "foobar2", "w");
            await gridStore.open();
            await gridStore.write("hello world!");
            await gridStore.close();
            expect(await GridStore.list(db)).to.include("foobar2");
            {
                const items = await GridStore.list(db, { id: true });
                expect(items).to.be.an("array");
                expect(items).not.to.be.empty;
                for (const id of items) {
                    expect(id).to.be.instanceOf(ObjectId);
                }
            }

            expect(await GridStore.list(db, "fs")).to.include("foobar2");
            expect(await GridStore.list(db, "my_fs")).not.to.include("foobar2");

            const fileId2 = new ObjectId();
            const gridStore2 = new GridStore(db, fileId2, "foobar3", "w");
            await gridStore2.open();
            await gridStore2.write("my file");
            await gridStore2.close();
            {
                const items = await GridStore.list(db);
                expect(items).to.include("foobar2");
                expect(items).to.include("foobar3");
            }
            await db.close();
        });

        it("should correctly readlines and put lines", async () => {
            const db = await mongo.connect(this.url());
            const gridStore = new GridStore(db, "test_gs_puts_and_readlines", "w");
            await gridStore.open();
            await gridStore.puts("line one");
            await gridStore.close();
            const data = await GridStore.read(db, "test_gs_puts_and_readlines");
            expect(data.toString()).to.be.equal("line one\n");
            await db.close();
        });

        it("should correctly unlink", async () => {
            const db = await mongo.connect(this.url());
            const gridStore = new GridStore(db, "test_gs_unlink", "w");
            await db.dropDatabase();
            await gridStore.open();
            await gridStore.write("hello, world!");
            await gridStore.close();
            const files = db.collection("fs.files");
            const chunks = db.collection("fs.chunks");
            expect(await files.count()).to.be.equal(1);
            expect(await chunks.count()).to.be.equal(1);
            await GridStore.unlink(db, "test_gs_unlink");
            expect(await files.count()).to.be.equal(0);
            expect(await chunks.count()).to.be.equal(0);
            await db.close();
        });

        it("should correctly write and read jpg image", async () => {
            const db = await mongo.connect(this.url());
            const file = new fs.File(__dirname, "fixtures", "iya_logo_final_bw.jpg");
            const data = await file.contents("buffer");

            let gridStore = new GridStore(db, "test", "w");
            await gridStore.open();
            await gridStore.write(data);
            await gridStore.close();

            gridStore = new GridStore(db, "test", "r");
            await gridStore.open();
            await gridStore.seek(0);
            expect(await gridStore.read()).to.be.deep.equal(data);
            await gridStore.close();
            await db.close();
        });

        it("should correctly save simple file to grid store using filename", async () => {
            const db = await mongo.connect(this.url());
            const gridStore = new GridStore(db, "ourexamplefiletowrite.txt", "w");
            await gridStore.open();
            await gridStore.write("bar");
            await gridStore.close();
            expect(await GridStore.exist(db, "ourexamplefiletowrite.txt")).to.be.true;
            await db.close();
        });

        it("should correctly save simple file to grid store using ObjectId", async () => {
            const db = await mongo.connect(this.url());
            const fileId = new ObjectId();
            const gridStore = new GridStore(db, fileId, "w");
            await gridStore.open();
            await gridStore.write("bar");
            await gridStore.close();
            expect(await GridStore.exist(db, fileId)).to.be.true;
            await db.close();
        });

        it("should correctly save simple file to grid store using writeFile", async () => {
            const db = await mongo.connect(this.url());
            const file = new fs.File(__dirname, "fixtures", "test_gs_weird_bug.png");
            const fileId = new ObjectId();
            const gridStore = new GridStore(db, fileId, "w");
            await gridStore.open();
            await gridStore.writeFile(file.path());
            expect(await GridStore.read(db, fileId)).to.be.deep.equal(await file.contents("buffer"));
            await gridStore.close();
            await db.close();
        });

        it("should correctly save simple file to grid store using writeFile with handle", async () => {
            const db = await mongo.connect(this.url());
            const file = new fs.File(__dirname, "fixtures", "test_gs_weird_bug.png");
            const fileId = new ObjectId();
            const gridStore = new GridStore(db, fileId, "w");
            const fd = await fs.open(file.path(), "r");
            await gridStore.open();
            await gridStore.writeFile(fd);
            expect(await GridStore.read(db, fileId)).to.be.deep.equal(await file.contents("buffer"));
            await gridStore.close();
            await db.close();
        });

        it("should correctly save simple file to grid store using write with strings and buffers", async () => {
            const db = await mongo.connect(this.url());
            const fileId = new ObjectId();
            const gridStore = new GridStore(db, fileId, "w");
            await gridStore.open();
            await gridStore.write("Hello world");
            await gridStore.write(Buffer.from("Buffer Hello world"));
            await gridStore.close();
            expect(await GridStore.read(db, fileId)).to.be.deep.equal(Buffer.from("Hello worldBuffer Hello world"));
            await db.close();
        });

        it("should correctly save simple file to grid store using close", async () => {
            const db = await mongo.connect(this.url());
            const fileId = new ObjectId();
            const gridStore = new GridStore(db, fileId, "w");
            await gridStore.open();
            await gridStore.write("Hello world");
            await gridStore.close();
            await db.close();
        });

        it("should correctly save simple file to grid store using close and then unlink it", async () => {
            const db = await mongo.connect(this.url());
            const fileId = new ObjectId();
            let gridStore = new GridStore(db, fileId, "w");
            await gridStore.open();
            await gridStore.puts("line one");
            await gridStore.puts("line two");
            await gridStore.puts("line three");
            await gridStore.close();
            expect(await GridStore.readlines(db, fileId)).to.be.deep.equal([
                "line one\n",
                "line two\n",
                "line three\n"
            ]);
            gridStore = new GridStore(db, fileId, "r");
            await gridStore.unlink();
            await gridStore.close();
            expect(await GridStore.exist(db, fileId)).to.be.false;
            await db.close();
        });

        it("should correctly put a couple of lines in grid store and use instance readlines", async () => {
            const db = await mongo.connect(this.url());
            const fileId = new ObjectId();
            const gridStore = new GridStore(db, fileId, "w");
            await gridStore.open();
            await gridStore.puts("line one");
            await gridStore.puts("line two");
            await gridStore.puts("line three");
            await gridStore.close();
            expect(await GridStore.readlines(db, fileId)).to.be.deep.equal([
                "line one\n",
                "line two\n",
                "line three\n"
            ]);
            await db.close();
        });

        it("should correctly put a couple of lines in grid store and read", async () => {
            const db = await mongo.connect(this.url());
            const file = new fs.File(__dirname, "fixtures", "test_gs_weird_bug.png");
            const data = await file.contents("buffer");
            const gridStore = new GridStore(db, null, "w");
            await gridStore.open();
            await gridStore.write(data);
            const result = await gridStore.close();
            expect(await GridStore.read(db, result._id)).to.be.deep.equal(data);
            await db.close();
        });

        it("should correctly seek with buffer", async () => {
            const db = await mongo.connect(this.url());
            let gridStore = new GridStore(db, "test_gs_seek_with_buffer", "w");
            await gridStore.open();
            await gridStore.write(Buffer.from("hello, world!", "utf8"));
            await gridStore.close();

            gridStore = new GridStore(db, "test_gs_seek_with_buffer", "r");
            await gridStore.open();
            await gridStore.seek(0);
            expect((await gridStore.getc()).toString()).to.be.equal("h");
            await gridStore.close();

            gridStore = new GridStore(db, "test_gs_seek_with_buffer", "r");
            await gridStore.open();
            await gridStore.seek(7);
            expect((await gridStore.getc()).toString()).to.be.equal("w");
            await gridStore.close();

            gridStore = new GridStore(db, "test_gs_seek_with_buffer", "r");
            await gridStore.open();
            await gridStore.seek(-1, GridStore.IO_SEEK_END);
            expect((await gridStore.getc()).toString()).to.be.equal("!");
            await gridStore.close();

            gridStore = new GridStore(db, "test_gs_seek_with_buffer", "r");
            await gridStore.open();
            await gridStore.seek(-6, GridStore.IO_SEEK_END);
            expect((await gridStore.getc()).toString()).to.be.equal("w");
            await gridStore.close();

            gridStore = new GridStore(db, "test_gs_seek_with_buffer", "r");
            await gridStore.open();
            await gridStore.seek(7, GridStore.IO_SEEK_CUR);
            expect((await gridStore.getc()).toString()).to.be.equal("w");
            await gridStore.seek(-1, GridStore.IO_SEEK_CUR);
            expect((await gridStore.getc()).toString()).to.be.equal("w");
            await gridStore.seek(-4, GridStore.IO_SEEK_CUR);
            expect((await gridStore.getc()).toString()).to.be.equal("o");
            await gridStore.seek(3, GridStore.IO_SEEK_CUR);
            expect((await gridStore.getc()).toString()).to.be.equal("o");
            await gridStore.close();
            await db.close();
        });

        it("should correctly rewind and truncate on write", async () => {
            const db = await mongo.connect(this.url());
            const fileId = new ObjectId();
            let gridStore = new GridStore(db, fileId, "w");
            await gridStore.open();
            await gridStore.write("hello, world!");
            await gridStore.close();

            gridStore = new GridStore(db, fileId, "w");
            await gridStore.open();
            await gridStore.write("some text is inserted here");
            await gridStore.rewind();
            await gridStore.write("abc");
            await gridStore.close();

            expect(await GridStore.read(db, fileId)).to.be.deep.equal(Buffer.from("abc"));
            await db.close();
        });

        it("should correctly execute grid store tell", async () => {
            const db = await mongo.connect(this.url());
            let gridStore = new GridStore(db, "test_gs_tell", "w");
            await gridStore.open();
            await gridStore.write("hello, world!");
            await gridStore.close();

            gridStore = new GridStore(db, "test_gs_tell", "r");
            await gridStore.open();
            expect(await gridStore.read(5)).to.be.deep.equal(Buffer.from("hello"));
            expect(await gridStore.tell()).to.be.equal(5);
            await gridStore.close();
            await db.close();
        });

        it("should correctly retrieve single character using getc", async () => {
            const db = await mongo.connect(this.url());
            let gridStore = new GridStore(db, "test_gs_getc_file", "w");
            await gridStore.open();
            await gridStore.write(Buffer.from("hello, world!", "utf8"));
            await gridStore.close();

            gridStore = new GridStore(db, "test_gs_getc_file", "r");
            await gridStore.open();
            expect((await gridStore.getc()).toString()).to.be.equal("h");
            await gridStore.close();
            await db.close();
        });

        it("should correctly retrieve single character using getc", async () => {
            const db = await mongo.connect(this.url());
            let gridStore = new GridStore(db, new ObjectId(), "test_gs_getc_file", "w");
            await gridStore.open();
            await gridStore.write(Buffer.from("hello, world!", "utf8"));
            await gridStore.close();

            gridStore = new GridStore(db, new ObjectId(), "test_gs_getc_file", "w");
            await gridStore.open();
            await gridStore.write(Buffer.from("hello, world!", "utf8"));
            const fileData = await gridStore.close();

            gridStore = new GridStore(db, "test_gs_getc_file", "r");
            await gridStore.open();
            expect((await gridStore.getc()).toString()).to.be.equal("h");
            await gridStore.close();

            gridStore = new GridStore(db, fileData._id, "r");
            await gridStore.open();
            expect((await gridStore.getc()).toString()).to.be.equal("h");
            await gridStore.close();
            await db.close();
        });
    });

    describe("bulk", () => {
        it("should correctly execute ordered batch with no errors using write commands", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("batch_write_ordered_ops_0_with_promise");
            const batch = collection.initializeOrderedBulkOp();
            batch.insert({ a: 1 });
            batch.find({ a: 1 }).updateOne({ $set: { b: 1 } });
            batch.find({ a: 2 }).upsert().updateOne({ $set: { b: 2 } });
            batch.insert({ a: 3 });
            batch.find({ a: 3 }).remove({ a: 3 });

            const result = await batch.execute();
            expect(result).to.include({
                nInserted: 2,
                nUpserted: 1,
                nMatched: 1,
                nRemoved: 1
            });
            expect(result.nModified).to.be.oneOf([0, 1, null, undefined]);

            const upserts = result.getUpsertedIds();
            expect(upserts).to.have.lengthOf(1);
            expect(upserts[0].index).to.be.equal(2);
            expect(upserts[0]._id).to.be.ok;

            const upsert = result.getUpsertedIdAt(0);
            expect(upsert.index).to.be.equal(2);
            expect(upsert._id).to.be.ok;
            await db.close();
        });

        it("should correctly execute unordered batch with no errors", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("batch_write_unordered_ops_legacy_0_with_promise");
            const batch = collection.initializeUnorderedBulkOp();

            batch.insert({ a: 1 });
            batch.find({ a: 1 }).updateOne({ $set: { b: 1 } });
            batch.find({ a: 2 }).upsert().updateOne({ $set: { b: 2 } });
            batch.insert({ a: 3 });
            batch.find({ a: 3 }).remove({ a: 3 });

            const result = await batch.execute();
            expect(result).to.include({
                nInserted: 2,
                nUpserted: 1,
                // nMatched: 1 // correct ?
            });
            expect(result.nModified).to.be.oneOf([0, 1, null, undefined]);

            const upserts = result.getUpsertedIds();
            expect(upserts).to.have.lengthOf(1);
            expect(upserts[0].index).to.be.equal(2);
            expect(upserts[0]._id).to.be.ok;

            const upsert = result.getUpsertedIdAt(0);
            expect(upsert.index).to.be.equal(2);
            expect(upsert._id).to.be.ok;
            await db.close();
        });
    });

    describe("crud", () => {
        it("should correctly execute insertOne operation", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("insert_one_with_promise");
            const r = await collection.insertOne({ a: 1 });
            expect(r.insertedCount).to.be.equal(1);
            await db.close();
        });

        it("should correctly execute insertMany operation", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("insert_many_with_promise");
            const r = await collection.insertMany([{ a: 1 }, { a: 2 }]);
            expect(r.insertedCount).to.be.equal(2);
            await db.close();
        });

        it("should correctly execute updateOne operation", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("update_one_with_promise");
            const r = await collection.updateOne({ a: 1 }, { $set: { a: 2 } }, { upsert: true });
            expect(r.matchedCount).to.be.equal(0);
            expect(r.upsertedCount).to.be.equal(1);
            await db.close();
        });

        it("should correctly execute updateMany operation", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("update_many_with_promise");
            let r = await collection.insertMany([{ a: 1 }, { a: 1 }]);
            expect(r.insertedCount).to.be.equal(2);
            r = await collection.updateMany({ a: 1 }, { $set: { b: 1 } });
            expect(r.matchedCount).to.be.equal(2);
            expect(r.modifiedCount).to.be.equal(2);
            await db.close();
        });

        it("should correctly execute removeOne operation", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("remove_one_with_promise");
            let r = await collection.insertMany([{ a: 1 }, { a: 1 }]);
            expect(r.insertedCount).to.be.equal(2);
            r = await collection.removeOne({ a: 1 });
            expect(r.deletedCount).to.be.equal(1);
            await db.close();
        });

        it("should correctly execute removeMany operation", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("remove_many_with_promise");
            let r = await collection.insertMany([{ a: 1 }, { a: 1 }]);
            expect(r.insertedCount).to.be.equal(2);
            r = await collection.removeMany({ a: 1 });
            expect(r.deletedCount).to.be.equal(2);
            await db.close();
        });

        it("should correctly execute bulkWrite operation", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("bulk_write_with_promise");
            const r = await collection.bulkWrite([
                { insertOne: { document: { a: 1 } } },
                { updateOne: { filter: { a: 2 }, update: { $set: { a: 2 } }, upsert: true } },
                { updateMany: { filter: { a: 2 }, update: { $set: { a: 2 } }, upsert: true } },
                { deleteOne: { filter: { c: 1 } } },
                { deleteMany: { filter: { c: 1 } } },
                { replaceOne: { filter: { c: 3 }, replacement: { c: 4 }, upsert: true } }
            ], { ordered: true, w: 1 });
            expect(r).to.include({
                nInserted: 1,
                nUpserted: 2,
                nRemoved: 0,
                insertedCount: 1,
                matchedCount: 1,
                deletedCount: 0,
                upsertedCount: 2
            });
            expect(r.modifiedCount).to.be.oneOf([0, 1]);
            expect(Object.keys(r.insertedIds)).to.have.lengthOf(1);
            expect(Object.keys(r.upsertedIds)).to.have.lengthOf(2);
            await db.close();
        });

        it("should correctly handle duplicate key error with bulkWrite", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("bulk_write_with_promise_write_error");
            const r = await collection.bulkWrite([
                { insertOne: { document: { _id: 1 } } },
                { insertOne: { document: { _id: 1 } } }
            ], { ordered: true, w: 1 });
            expect(r.hasWriteErrors()).to.be.true;
            await db.close();
        });

        it("should correctly execute findOneAndDelete operation", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("find_one_and_delete_with_promise");
            let r = await collection.insertMany([{ a: 1, b: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(1);
            r = await collection.findOneAndDelete({ a: 1 }, { projection: { b: 1 }, sort: { a: 1 } });
            expect(r.lastErrorObject.n).to.be.equal(1);
            expect(r.value.b).to.be.equal(1);
            await db.close();
        });

        it("should correctly execute findOneAndReplace operation", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("find_one_and_replace_with_promise");
            let r = await collection.insertMany([{ a: 1, b: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(1);
            r = await collection.findOneAndReplace({ a: 1 }, { c: 1, b: 1 }, {
                projection: { b: 1, c: 1 },
                sort: { a: 1 },
                returnOriginal: false,
                upsert: true
            });
            expect(r.lastErrorObject.n).to.be.equal(1);
            expect(r.value).to.include({ b: 1, c: 1 });
            await db.close();
        });

        it("should correctly execute findOneAndUpdate operation", async () => {
            const db = await mongo.connect(this.url());
            const collection = db.collection("find_one_and_update_with_promise");
            let r = await collection.insertMany([{ a: 1, b: 1 }], { w: 1 });
            expect(r.result.n).to.be.equal(1);
            r = await collection.findOneAndUpdate({ a: 1 }, { $set: { d: 1 } }, {
                projection: { b: 1, d: 1 },
                sort: { a: 1 },
                returnOriginal: false,
                upsert: true
            });
            expect(r.lastErrorObject.n).to.be.equal(1);
            expect(r.value).to.include({ b: 1, d: 1 });
            await db.close();
        });

        it.skip("should correctly add capped collection options to cursor", async () => {
            const db = await mongo.connect(this.url());
            const collection = await db.createCollection("a_simple_collection_2_with_promise", { capped: true, size: 100000, max: 10000, w: 1 });
            const docs = [];
            for (let i = 0; i < 1000; i++) {
                docs.push({ a: i });
            }
            await collection.insertMany(range(1000).map((i) => ({ a: i })));
            const s = new Date();
            const cursor = collection.find({ a: { $gte: 0 } })
                .addCursorFlag("tailable", true)
                .addCursorFlag("awaitData", true);
            const stream = cursor.stream();
            const end = new Promise((resolve) => stream.once("end", resolve));
            let total = 0;
            stream.on("data", () => {
                total = total + 1;

                if (total === 1000) {
                    cursor.kill();
                }
            });
            await end;
            expect(new Date().getTime() - s.getTime()).to.be.above(1000);
            await db.close();
        });
    });
});
