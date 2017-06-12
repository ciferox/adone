describe("examples", function () {
    const { database: { mongo } } = adone;

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
        await db.collection("inventory").updateOne(
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
});
