describe("ObjectId", function () {
    const { data: { bson }, promise } = adone;

    it("should correctly generate ObjectId", async () => {
        const { db } = this;
        const collection = db.collection("test_object_id_generation.data");
        {
            const r = await collection.insert({ name: "Fred", age: 42 }, { w: 1 });
            expect(r.ops).to.have.lengthOf(1);
            expect(r.ops[0]._id.toHexString()).to.have.lengthOf(24);
            const doc = await collection.findOne({ name: "Fred" });
            expect(doc._id.toHexString()).to.be.equal(r.ops[0]._id.toHexString());
        }
        {
            const r = await collection.insert({ name: "Pat", age: 21 }, { w: 1 });
            expect(r.ops).to.have.lengthOf(1);
            expect(r.ops[0]._id.toHexString()).to.have.lengthOf(24);
            const doc = await collection.findOne(r.ops[0]._id);
            expect(doc._id.toHexString()).to.be.equal(r.ops[0]._id.toHexString());
        }
        {
            const objectId = new bson.ObjectId(null);
            const r = await collection.insert({ _id: objectId, name: "Donald", age: 95 }, { w: 1 });
            expect(r.ops).to.have.lengthOf(1);
            expect(r.ops[0]._id.toHexString()).to.have.lengthOf(24);
            expect(r.ops[0]._id.toHexString()).to.be.equal(objectId.toHexString());
            const doc = await collection.findOne(r.ops[0]._id);
            expect(doc._id.toHexString()).to.be.equal(r.ops[0]._id.toHexString());
            expect(doc._id.toHexString()).to.be.equal(objectId.toHexString());
        }
    });

    it("should correctly retrieve 24 character hex string from toString", async () => {
        const objectId = new bson.ObjectId();
        expect(objectId.toString()).to.have.lengthOf(24);
    });

    it("should correctly retrieve 24 character hex string from toJSON", async () => {
        const objectId = new bson.ObjectId();
        expect(objectId.toJSON()).to.have.lengthOf(24);
    });

    it("should correctly create OID not using ObjectId", async () => {
        const { db } = this;
        const collection = db.collection("test_non_oid_id");
        const date = new Date();
        date.setUTCDate(12);
        date.setUTCFullYear(2009);
        date.setUTCMonth(11 - 1);
        date.setUTCHours(12);
        date.setUTCMinutes(0);
        date.setUTCSeconds(30);

        await collection.insert({ _id: date }, { w: 1 });
        const items = await collection.find({ _id: date }).toArray();
        expect(String(items[0]._id)).to.be.equal(String(date));
    });

    it("should correctly generate ObjectId from timestamp", async () => {
        const timestamp = Math.floor(new Date().getTime() / 1000);
        const objectId = new bson.ObjectId(timestamp);
        expect(objectId.generationTime).to.be.equal(timestamp);
    });

    it("should correctly create an ObjectId and override the timestamp", async () => {
        const timestamp = 1000;
        const objectID = new bson.ObjectId();
        const id1 = objectID.id;
        objectID.generationTime = timestamp;
        const id2 = objectID.id;
        expect(id1.slice(0, 4)).to.be.deep.equal(id2.slice(0, 4));
    });

    it("should correctly insert with ObjectId", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyInsertWithObjectId");
        await collection.insert({}, { w: 1 });
        await promise.delay(2000);
        const compareDate = adone.datetime();
        await collection.insert({}, { w: 1 });
        const items = await collection.find().toArray();

        const date1 = adone.datetime.unix(items[0]._id.generationTime);
        const date2 = adone.datetime.unix(items[1]._id.generationTime);

        expect(compareDate.diff(date1)).to.be.at.least(2000);
        expect(compareDate.diff(date2)).to.be.below(1000);
    });
});
