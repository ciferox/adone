const { Model: model, Datastore } = adone.database.local;

const reloadTimeUpperBound = 60;

describe("Database", () => {
    let tmpdir;
    let d;
    let dbFile;
    let testDb;

    before(async () => {
        tmpdir = await adone.fs.Directory.createTmp();
    });

    after(async () => {
        await tmpdir.unlink();
    });

    afterEach(async () => {
        await tmpdir.clean();
    });

    beforeEach(async () => {
        dbFile = tmpdir.getVirtualFile("db.db");
        testDb = dbFile.path();
        d = new Datastore({ filename: testDb });
        expect(d.filename).to.be.equal(testDb);
        expect(d.inMemoryOnly).to.be.false;
        await d.load();
        expect(d.getAllData()).to.be.empty;
    });

    describe("Insert", () => {

        it("Able to insert a document in the database, setting an _id if none provided, and retrieve it even after a reload", async () => {
            let docs = await d.find({});
            expect(docs).to.be.empty;

            await d.insert({ somedata: "ok" });

            docs = await d.find({});
            expect(docs).to.have.lengthOf(1);
            expect(docs[0]).to.have.property("somedata");
            expect(docs[0].somedata).to.be.equal("ok");
            expect(docs[0]).to.have.property("_id");

            await d.load();

            docs = await d.find({});
            expect(docs).to.have.lengthOf(1);
            expect(docs[0]).to.have.property("somedata");
            expect(docs[0].somedata).to.be.equal("ok");
            expect(docs[0]).to.have.property("_id");
        });

        it("Can insert multiple documents in the database", async () => {
            let docs = await d.find({});
            expect(docs).to.be.empty;

            await d.insert({ somedata: "ok" });
            await d.insert({ somedata: "another" });
            await d.insert({ somedata: "again" });

            docs = await d.find({});

            expect(docs).to.have.lengthOf(3);

            docs = docs.map((x) => x.somedata);

            expect(docs).to.include("ok");
            expect(docs).to.include("another");
            expect(docs).to.include("again");
        });

        it("Can insert and get back from DB complex objects with all primitive and secondary types", async () => {
            const da = new Date();
            const obj = { a: ["ee", "ff", 42], date: da, subobj: { a: "b", b: "c" } };


            await d.insert(obj);

            const res = await d.findOne({});

            expect(res.a).to.have.lengthOf(3);
            expect(res.a[0]).to.be.equal("ee");
            expect(res.a[1]).to.be.equal("ff");
            expect(res.a[2]).to.be.equal(42);

            expect(res.date.getTime()).to.be.equal(da.getTime());

            expect(res.subobj.a).to.be.equal("b");
            expect(res.subobj.b).to.be.equal("c");
        });

        it("If an object returned from the DB is modified and refetched, the original value should be found", async () => {
            await d.insert({ a: "something" });

            let doc = await d.findOne({});
            expect(doc.a).to.be.equal("something");
            doc.a = "another thing";
            expect(doc.a).to.be.equal("another thing");

            doc = await d.findOne({});

            expect(doc.a).to.be.equal("something");
            doc.a = "another thing";
            expect(doc.a).to.be.equal("another thing");

            const docs = await d.find({});

            expect(docs).to.have.lengthOf(1);
            expect(docs[0].a).to.be.equal("something");
        });

        it("Cannot insert a doc that has a field beginning with a $ sign", async () => {
            let err = null;
            try {
                await d.insert({ $something: "atest" });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
            expect(err.message).to.be.equal("Field names cannot begin with the $ character");
        });

        it("If an _id is already given when we insert a document, use that instead of generating a random one", async () => {
            const newDoc = await d.insert({ _id: "test", stuff: true });

            expect(newDoc.stuff).to.be.true;
            expect(newDoc._id).to.be.equal("test");

            try {
                await d.insert({ _id: "test", otherstuff: 42 });
                throw new Error("inserted");
            } catch (err) {
                expect(err.errorType).to.be.equal("uniqueViolated");
            }
        });

        it("Modifying the insertedDoc after an insert doesnt change the copy saved in the database", async () => {
            const newDoc = await d.insert({ a: 2, hello: "world" });

            newDoc.hello = "changed";

            const doc = await d.findOne({ a: 2 });

            expect(doc.hello).to.be.equal("world");
        });

        it("Can insert an array of documents at once", async () => {
            let docs = [{ a: 5, b: "hello" }, { a: 42, b: "world" }];

            await d.insert(docs);

            docs = await d.find({});

            expect(docs).to.have.lengthOf(2);

            expect(docs.find((doc) => doc.a === 5).b).to.be.equal("hello");
            expect(docs.find((doc) => doc.a === 42).b).to.be.equal("world");

            const data = adone.std.fs.readFileSync(testDb, "utf8").split("\n").filter((line) => line.length > 0);

            expect(data).to.have.lengthOf(2);
            expect(model.deserialize(data[0]).a).to.be.equal(5);
            expect(model.deserialize(data[0]).b).to.be.equal("hello");
            expect(model.deserialize(data[1]).a).to.be.equal(42);
            expect(model.deserialize(data[1]).b).to.be.equal("world");
        });

        it("If a bulk insert violates a constraint, all changes are rolled back", async () => {
            let docs = [{ a: 5, b: "hello" }, { a: 42, b: "world" }, { a: 5, b: "bloup" }, { a: 7 }];

            await d.ensureIndex({ fieldName: "a", unique: true });

            try {
                await d.insert(docs);
                throw new Error("inserted");
            } catch (err) {
                expect(err.errorType).to.be.equal("uniqueViolated");
            }
            docs = await d.find({});

            const datafileContents = model.deserialize(adone.std.fs.readFileSync(testDb, "utf-8"));
            expect(datafileContents).to.be.deep.equal({ $$indexCreated: { fieldName: "a", unique: true } });
            expect(docs).to.be.empty;
        });

        it("If timestampData option is set, a createdAt field is added and persisted", async () => {
            const newDoc = { hello: "world" };
            const beginning = Date.now();

            d = new Datastore({ filename: testDb, timestampData: true });
            await d.load();
            let docs = await d.find({});

            expect(docs).to.be.empty;
            const insertedDoc = await d.insert(newDoc);
            expect(newDoc).to.be.deep.equal({ hello: "world" });
            expect(insertedDoc).to.have.property("createdAt");
            expect(insertedDoc).to.have.property("updatedAt");
            expect(insertedDoc.createdAt).to.be.equal(insertedDoc.updatedAt);
            expect(insertedDoc).to.have.property("_id");
            expect(Object.keys(insertedDoc)).to.have.lengthOf(4);
            expect(Math.abs(insertedDoc.createdAt.getTime() - beginning)).to.be.below(reloadTimeUpperBound);

            insertedDoc.bloup = "another";

            expect(Object.keys(insertedDoc)).to.have.lengthOf(5);

            docs = await d.find({});

            expect(docs).to.have.lengthOf(1);

            expect(newDoc).to.be.deep.equal({ hello: "world" });

            expect(docs[0]).to.be.deep.equal({ hello: "world", _id: insertedDoc._id, createdAt: insertedDoc.createdAt, updatedAt: insertedDoc.updatedAt });

            await d.load();

            docs = await d.find({});

            expect(docs).to.have.lengthOf(1);

            expect(newDoc).to.be.deep.equal({ hello: "world" });

            expect(docs[0]).to.be.deep.equal({ hello: "world", _id: insertedDoc._id, createdAt: insertedDoc.createdAt, updatedAt: insertedDoc.updatedAt });
        });

        it("If timestampData option not set, don't create a createdAt and a updatedAt field", async () => {
            const insertedDoc = await d.insert({ hello: "world" });

            expect(Object.keys(insertedDoc)).to.have.lengthOf(2);

            expect(insertedDoc.createdAt).to.be.undefined;
            expect(insertedDoc.updatedAt).to.be.undefined;

            const docs = await d.find({});

            expect(docs).to.have.lengthOf(1);
            expect(docs[0]).to.be.deep.equal(insertedDoc);
        });

        it("If timestampData is set but createdAt is specified by user, don't change it", async () => {
            const newDoc = { hello: "world", createdAt: new Date(234) };
            const beginning = Date.now();

            d = new Datastore({ filename: testDb, timestampData: true });

            await d.load();

            const insertedDoc = await d.insert(newDoc);

            expect(Object.keys(insertedDoc)).to.have.lengthOf(4);
            expect(insertedDoc.createdAt.getTime()).to.be.equal(234);

            expect(insertedDoc.updatedAt.getTime() - beginning).to.be.below(reloadTimeUpperBound);

            let docs = await d.find({});

            expect(docs[0]).to.be.deep.equal(insertedDoc);

            await d.load();

            docs = await d.find({});

            expect(docs[0]).to.be.deep.equal(insertedDoc);
        });

        it("If timestampData is set but updatedAt is specified by user, don't change it", async () => {
            const newDoc = { hello: "world", updatedAt: new Date(234) };
            const beginning = Date.now();

            d = new Datastore({ filename: testDb, timestampData: true });
            await d.load();

            const insertedDoc = await d.insert(newDoc);

            expect(Object.keys(insertedDoc)).to.have.lengthOf(4);
            expect(insertedDoc.updatedAt.getTime()).to.be.equal(234);
            expect(insertedDoc.updatedAt.getTime() - beginning).to.be.below(reloadTimeUpperBound);

            let docs = await d.find({});

            expect(docs[0]).to.be.deep.equal(insertedDoc);

            await d.load();

            docs = await d.find({});

            expect(docs[0]).to.be.deep.equal(insertedDoc);
        });

        it("Can insert a doc with id 0", async () => {
            const doc = await d.insert({ _id: 0, hello: "world" });
            expect(doc._id).to.be.equal(0);
            expect(doc.hello).to.be.equal("world");
        });

        it("can insert a document with null values", async () => {
            await d.insert({ key: null });
            expect(await d.find({ key: null })).to.have.lengthOf(1);
        });
    }); // ==== End of 'Insert' ==== //


    describe("#getCandidates", () => {

        it("Can use an index to get docs with a basic match", async () => {
            await d.ensureIndex({ fieldName: "tf" });
            const _doc1 = await d.insert({ tf: 4 });
            await d.insert({ tf: 6 });
            const _doc2 = await d.insert({ tf: 4, an: "other" });
            await d.insert({ tf: 9 });

            const data = await d.getCandidates({ r: 6, tf: 4 });
            const doc1 = data.find((d) => d._id === _doc1._id);
            const doc2 = data.find((d) => d._id === _doc2._id);

            expect(data).to.have.lengthOf(2);
            expect(doc1).to.be.deep.equal({ _id: doc1._id, tf: 4 });
            expect(doc2).to.be.deep.equal({ _id: doc2._id, tf: 4, an: "other" });
        });

        it("Can use an index to get docs with a $in match", async () => {
            await d.ensureIndex({ fieldName: "tf" });
            await d.insert({ tf: 4 });
            const _doc1 = await d.insert({ tf: 6 });
            await d.insert({ tf: 4, an: "other" });
            const _doc2 = await d.insert({ tf: 9 });

            const data = await d.getCandidates({ r: 6, tf: { $in: [6, 9, 5] } });
            const doc1 = data.find((d) => d._id === _doc1._id);
            const doc2 = data.find((d) => d._id === _doc2._id);

            expect(data).to.have.lengthOf(2);
            expect(doc1).to.be.deep.equal({ _id: doc1._id, tf: 6 });
            expect(doc2).to.be.deep.equal({ _id: doc2._id, tf: 9 });
        });

        it("If no index can be used, return the whole database", async () => {
            await d.ensureIndex({ fieldName: "tf" });
            const _doc1 = await d.insert({ tf: 4 });
            const _doc2 = await d.insert({ tf: 6 });
            const _doc3 = await d.insert({ tf: 4, an: "other" });
            const _doc4 = await d.insert({ tf: 9 });

            const data = await d.getCandidates({ r: 6, notf: { $in: [6, 9, 5] } });
            const doc1 = data.find((d) => d._id === _doc1._id);
            const doc2 = data.find((d) => d._id === _doc2._id);
            const doc3 = data.find((d) => d._id === _doc3._id);
            const doc4 = data.find((d) => d._id === _doc4._id);

            expect(data).to.have.lengthOf(4);
            expect(doc1).to.be.deep.equal({ _id: doc1._id, tf: 4 });
            expect(doc2).to.be.deep.equal({ _id: doc2._id, tf: 6 });
            expect(doc3).to.be.deep.equal({ _id: doc3._id, tf: 4, an: "other" });
            expect(doc4).to.be.deep.equal({ _id: doc4._id, tf: 9 });
        });

        it("Can use indexes for comparison matches", async () => {
            await d.ensureIndex({ fieldName: "tf" });
            await d.insert({ tf: 4 });
            const _doc2 = await d.insert({ tf: 6 });
            await d.insert({ tf: 4, an: "other" });
            const _doc4 = await d.insert({ tf: 9 });

            const data = await d.getCandidates({ r: 6, tf: { $lte: 9, $gte: 6 } });
            const doc2 = data.find((d) => d._id === _doc2._id);
            const doc4 = data.find((d) => d._id === _doc4._id);

            expect(data).to.have.lengthOf(2);
            expect(doc2).to.be.deep.equal({ _id: doc2._id, tf: 6 });
            expect(doc4).to.be.deep.equal({ _id: doc4._id, tf: 9 });
        });

        it("Can set a TTL index that expires documents", async () => {
            await d.ensureIndex({ fieldName: "exp", expireAfterSeconds: 0.2 });
            await d.insert({ hello: "world", exp: new Date() });
            await adone.promise.delay(100);
            let doc = await d.findOne({});
            expect(doc.hello).to.be.equal("world");
            await adone.promise.delay(101);
            doc = await d.findOne({});
            expect(doc).to.be.null;
            await d.persistence.compactDatafile();


            const datafileContents = adone.std.fs.readFileSync(testDb, "utf-8");
            expect(datafileContents.split("\n")).to.have.lengthOf(2);
            expect(datafileContents.match(/world/)).to.be.null;
            const d2 = new Datastore({ filename: testDb });
            await d2.load();
            doc = await d2.findOne({});
            expect(doc).to.be.null;
        });

        it("TTL indexes can expire multiple documents and only what needs to be expired", async () => {
            await d.ensureIndex({ fieldName: "exp", expireAfterSeconds: 0.2 });
            await d.insert({ hello: "world1", exp: new Date() });
            await d.insert({ hello: "world2", exp: new Date() });
            await d.insert({ hello: "world3", exp: new Date(new Date().getTime() + 100) });
            await adone.promise.delay(100);
            let docs = await d.find({});
            expect(docs).to.have.length(3);
            await adone.promise.delay(101);
            docs = await d.find({});
            expect(docs).to.have.length(1);
            expect(docs[0].hello).to.be.equal("world3");
            await adone.promise.delay(101);
            docs = await d.find({});
            expect(docs).to.be.empty;
        });

        it("Document where indexed field is absent or not a date are ignored", async () => {
            await d.ensureIndex({ fieldName: "exp", expireAfterSeconds: 0.2 });
            await d.insert({ hello: "world1", exp: new Date() });
            await d.insert({ hello: "world2", exp: "not a date" });
            await d.insert({ hello: "world3" });

            await adone.promise.delay(100);

            let docs = await d.find({});

            expect(docs).to.have.lengthOf(3);

            await adone.promise.delay(101);

            docs = await d.find({});

            expect(docs).to.have.lengthOf(2);
            expect(docs[0].hello).to.be.not.equal("world1");
            expect(docs[1].hello).to.be.not.equal("world1");
        });
    }); // ==== End of '#getCandidates' ==== //


    describe("Find", () => {

        it("Can find all documents if an empty query is used", async () => {
            await d.insert({ somedata: "ok" });
            await d.insert({ somedata: "another", plus: "additional data" });
            await d.insert({ somedata: "again" });

            const docs = await d.find({});

            expect(docs).to.have.lengthOf(3);

            const somedata = docs.map((x) => x.somedata);

            expect(somedata).to.include("ok");
            expect(somedata).to.include("another");
            expect(docs.find((d) => d.somedata === "another").plus).to.be.equal("additional data");
            expect(somedata).to.contain("again");
        });

        it("Can find all documents matching a basic query", async () => {
            await d.insert({ somedata: "ok" });
            await d.insert({ somedata: "again", plus: "additional data" });
            await d.insert({ somedata: "again" });

            let docs = await d.find({ somedata: "again" });
            expect(docs).to.have.lengthOf(2);
            expect(docs.map((x) => x.somedata)).to.not.contain("ok");

            docs = await d.find({ somedata: "nope" });
            expect(docs).to.be.empty;
        });

        it("Can find one document matching a basic query and return null if none is found", async () => {
            await d.insert({ somedata: "ok" });
            await d.insert({ somedata: "again", plus: "additional data" });
            await d.insert({ somedata: "again" });

            let doc = await d.findOne({ somedata: "ok" });

            expect(Object.keys(doc)).to.have.lengthOf(2);
            expect(doc.somedata).to.be.equal("ok");
            expect(doc).to.have.property("_id");

            doc = await d.findOne({ somedata: "nope" });
            expect(doc).to.be.null;
        });

        it("Can find dates and objects (non JS-native types)", async () => {
            const date1 = new Date(1234543);
            const date2 = new Date(9999);

            await d.insert({ now: date1, sth: { name: "nedb" } });
            let doc = await d.findOne({ now: date1 });
            expect(doc.sth.name).to.be.equal("nedb");

            doc = await d.findOne({ now: date2 });
            expect(doc).to.be.null;

            doc = await d.findOne({ sth: { name: "nedb" } });
            expect(doc.sth.name).to.be.equal("nedb");

            doc = await d.findOne({ sth: { name: "other" } });
            expect(doc).to.be.null;
        });

        it("Can use dot-notation to query subfields", async () => {
            await d.insert({ greeting: { english: "hello" } });
            let doc = await d.findOne({ "greeting.english": "hello" });
            expect(doc.greeting.english).to.be.equal("hello");

            doc = await d.findOne({ "greeting.english": "helloooo" });
            expect(doc).to.be.null;

            doc = await d.findOne({ "greeting.englis": "hello" });
            expect(doc).to.be.null;
        });

        it("Array fields match if any element matches", async () => {

            const doc1 = await d.insert({ fruits: ["pear", "apple", "banana"] });
            const doc2 = await d.insert({ fruits: ["coconut", "orange", "pear"] });
            const doc3 = await d.insert({ fruits: ["banana"] });
            let docs = await d.find({ fruits: "pear" });
            expect(docs).to.have.lengthOf(2);
            let ids = docs.map((x) => x._id);
            expect(ids).to.contain(doc1._id);
            expect(ids).to.contain(doc2._id);

            docs = await d.find({ fruits: "banana" });
            expect(docs).to.have.lengthOf(2);
            ids = docs.map((x) => x._id);
            expect(ids).to.contain(doc3._id);

            docs = await d.find({ fruits: "dontexist" });
            expect(docs).to.be.empty;
        });

        it("Returns an error if the query is not well formed", async () => {
            await d.insert({ hello: "world" });
            let err = null;
            try {
                await d.find({ $or: { hello: "world" } });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
            err = null;
            try {
                await d.findOne({ $or: { hello: "world" } });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
        });

        it("Changing the documents returned by find or findOne do not change the database state", async () => {
            await d.insert({ a: 2, hello: "world" });
            let doc = await d.findOne({ a: 2 });
            doc.hello = "changed";

            doc = await d.findOne({ a: 2 });
            expect(doc.hello).to.be.equal("world");

            const docs = await d.find({ a: 2 });
            docs[0].hello = "changed";

            doc = await d.findOne({ a: 2 });
            expect(doc.hello).to.be.equal("world");
        });

        it("Can use sort, skip and limit if the callback is not passed to find but to exec", async () => {
            await d.insert({ a: 2, hello: "world" });
            await d.insert({ a: 24, hello: "earth" });
            await d.insert({ a: 13, hello: "blueplanet" });
            await d.insert({ a: 15, hello: "home" });
            const docs = await d.find({}, {}, { exec: false }).sort({ a: 1 }).limit(2).exec();

            expect(docs).to.have.lengthOf(2);
            expect(docs[0].hello).to.be.equal("world");
            expect(docs[1].hello).to.be.equal("blueplanet");
        });

        it("Can use sort and skip if the callback is not passed to findOne but to exec", async () => {
            await d.insert({ a: 2, hello: "world" });
            await d.insert({ a: 24, hello: "earth" });
            await d.insert({ a: 13, hello: "blueplanet" });
            await d.insert({ a: 15, hello: "home" });
            let doc = await d.findOne({}, {}, { exec: false }).sort({ a: 1 }).exec();
            expect(doc.hello).to.be.equal("world");
            doc = await d.findOne({ a: { $gt: 14 } }, {}, { exec: false }).sort({ a: 1 }).exec();
            expect(doc.hello).to.be.equal("home");
            doc = await d.findOne({ a: { $gt: 14 } }, {}, { exec: false }).sort({ a: 1 }).skip(1).exec();
            expect(doc.hello).to.be.equal("earth");
            doc = await d.findOne({ a: { $gt: 14 } }, {}, { exec: false }).sort({ a: 1 }).skip(2).exec();
            expect(doc).to.be.null;
        });

        it("Can use projections in find, normal or cursor way", async () => {
            await d.insert({ a: 2, hello: "world" });
            await d.insert({ a: 24, hello: "earth" });
            let doc = await d.find({ a: 2 }, { a: 0, _id: 0 });
            expect(doc).to.be.deep.equal([{ hello: "world" }]);
            doc = await d.find({ a: 2 }, { a: 0, _id: 0 }, { exec: false }).exec();
            expect(doc).to.be.deep.equal([{ hello: "world" }]);
            let err = null;
            try {
                doc = await d.find({ a: 2 }, { a: 0, hello: 1 });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
            err = null;
            try {
                doc = await d.find({ a: 2 }, { a: 0, hello: 1 }, { exec: false }).exec();
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
        });

        it("Can use projections in findOne, normal or cursor way", async () => {
            await d.insert({ a: 2, hello: "world" });
            await d.insert({ a: 24, hello: "earth" });
            let doc = await d.findOne({ a: 2 }, { a: 0, _id: 0 });
            expect(doc).to.be.deep.equal({ hello: "world" });
            doc = await d.findOne({ a: 2 }, { a: 0, _id: 0 }, { exec: false }).exec();
            expect(doc).to.be.deep.equal({ hello: "world" });
            let err = null;
            try {
                doc = await d.findOne({ a: 2 }, { a: 0, hello: 1 });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
            err = null;
            try {
                doc = await d.findOne({ a: 2 }, { a: 0, hello: 1 }, { exec: false }).exec();
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
        });
    }); // ==== End of 'Find' ==== //

    describe("Count", () => {

        it("Count all documents if an empty query is used", async () => {
            await d.insert({ somedata: "ok" });
            await d.insert({ somedata: "another", plus: "additional data" });
            await d.insert({ somedata: "again" });
            const docs = await d.count({});
            expect(docs).to.be.equal(3);
        });

        it("Count all documents matching a basic query", async () => {
            await d.insert({ somedata: "ok" });
            await d.insert({ somedata: "again", plus: "additional data" });
            await d.insert({ somedata: "again" });
            let docs = await d.count({ somedata: "again" });
            expect(docs).to.be.equal(2);
            docs = await d.count({ somedata: "nope" });
            expect(docs).to.be.equal(0);
        });

        it("Array fields match if any element matches", async () => {
            await d.insert({ fruits: ["pear", "apple", "banana"] });
            await d.insert({ fruits: ["coconut", "orange", "pear"] });
            await d.insert({ fruits: ["banana"] });
            let docs = await d.count({ fruits: "pear" });
            expect(docs).to.be.equal(2);
            docs = await d.count({ fruits: "banana" });
            expect(docs).to.be.equal(2);
            docs = await d.count({ fruits: "dontexist" });
            expect(docs).to.be.equal(0);
        });

        it("Returns an error if the query is not well formed", async (done) => {
            await d.insert({ hello: "world" });
            try {
                await d.count({ $or: { hello: "world" } });
                done(new Error("no error"));
            } catch (err) {
                done();
            }
        });
    });

    describe("Update", () => {

        it("If the query doesn't match anything, database is not modified", async () => {
            await d.insert({ somedata: "ok" });
            await d.insert({ somedata: "again", plus: "additional data" });
            await d.insert({ somedata: "another" });
            const [numReplaced] = await d.update({ somedata: "nope" }, { newDoc: "yes" }, { multi: true });
            expect(numReplaced).to.be.equal(0);
            const docs = await d.find({});
            const doc1 = docs.find((x) => x.somedata === "ok");
            const doc2 = docs.find((x) => x.somedata === "again");
            const doc3 = docs.find((x) => x.somedata === "another");

            expect(docs).to.have.lengthOf(3);
            expect(docs.find(() => d.newDoc === "yes")).to.be.undefined;

            expect(doc1).to.be.deep.equal({ _id: doc1._id, somedata: "ok" });
            expect(doc2).to.be.deep.equal({ _id: doc2._id, somedata: "again", plus: "additional data" });
            expect(doc3).to.be.deep.equal({ _id: doc3._id, somedata: "another" });
        });

        it("If timestampData option is set, update the updatedAt field", async () => {
            const beginning = new Date();
            const d = new Datastore({ filename: testDb, timestampData: true });
            await d.load();
            const insertedDoc = await d.insert({ hello: "world" });

            expect(insertedDoc.updatedAt.getTime() - beginning).to.be.below(reloadTimeUpperBound);
            expect(insertedDoc.createdAt.getTime() - beginning).to.be.below(reloadTimeUpperBound);
            expect(Object.keys(insertedDoc)).to.have.lengthOf(4);

            await adone.promise.delay(100);
            const step1 = new Date();

            await d.update({ _id: insertedDoc._id }, { $set: { hello: "mars" } }, {});
            const docs = await d.find({ _id: insertedDoc._id });
            expect(docs).to.have.lengthOf(1);
            expect(Object.keys(docs[0])).to.have.lengthOf(4);
            expect(docs[0].createdAt).to.be.equal(insertedDoc.createdAt);
            expect(docs[0].hello).to.be.equal("mars");
            expect(docs[0].updatedAt.getTime() - beginning).to.be.above(99);
            expect(docs[0].updatedAt.getTime() - step1).to.be.below(reloadTimeUpperBound);
        });

        it("Can update multiple documents matching the query", async () => {
            const doc1 = await d.insert({ somedata: "ok" });
            const id1 = doc1._id;
            const doc2 = await d.insert({ somedata: "again", plus: "additional data" });
            const id2 = doc2._id;
            const doc3 = await d.insert({ somedata: "again" });
            const id3 = doc3._id;

            const [numReplaced] = await d.update({ somedata: "again" }, { newDoc: "yes" }, { multi: true });
            expect(numReplaced).to.be.equal(2);

            const testPostUpdateState = async () => {
                const docs = await d.find({});

                const doc1 = docs.find((x) => x._id === id1);
                const doc2 = docs.find((x) => x._id === id2);
                const doc3 = docs.find((x) => x._id === id3);

                expect(docs).to.have.lengthOf(3);

                expect(Object.keys(doc1)).to.have.lengthOf(2);
                expect(doc1.somedata).to.be.equal("ok");
                expect(doc1._id).to.be.equal(id1);

                expect(Object.keys(doc2)).to.have.lengthOf(2);
                expect(doc2.newDoc).to.be.equal("yes");
                expect(doc2._id).to.be.equal(id2);

                expect(Object.keys(doc3)).to.have.lengthOf(2);
                expect(doc3.newDoc).to.be.equal("yes");
                expect(doc3._id).to.be.equal(id3);
            };

            await testPostUpdateState();
            await d.load();
            await testPostUpdateState();
        });

        it("Can update only one document matching the query", async () => {
            const doc1 = await d.insert({ somedata: "ok" });
            const id1 = doc1._id;
            const doc2 = await d.insert({ somedata: "again", plus: "additional data" });
            const id2 = doc2._id;
            const doc3 = await d.insert({ somedata: "again" });
            const id3 = doc3._id;

            const [numReplaced] = await d.update({ somedata: "again" }, { newDoc: "yes" }, { multi: false });
            expect(numReplaced).to.be.equal(1);

            const testPostUpdateState = async () => {
                const docs = await d.find({});

                const doc1 = docs.find((x) => x._id === id1);
                const doc2 = docs.find((x) => x._id === id2);
                const doc3 = docs.find((x) => x._id === id3);

                expect(docs).to.have.length(3);

                expect(doc1).to.be.deep.equal({ somedata: "ok", _id: doc1._id });

                try {
                    expect(doc2).to.be.deep.equal({ newDoc: "yes", _id: doc2._id });
                    expect(doc3).to.be.deep.equal({ somedata: "again", _id: doc3._id });
                } catch (e) {
                    expect(doc2).to.be.deep.equal({ somedata: "again", plus: "additional data", _id: doc2._id });
                    expect(doc3).to.be.deep.equal({ newDoc: "yes", _id: doc3._id });
                }
            };

            await testPostUpdateState();
            await d.load();
            await testPostUpdateState();
        });

        describe("Upserts", () => {

            it("Can perform upserts if needed", async () => {
                const [numReplaced] = await d.update({ impossible: "db is empty anyway" }, { newDoc: true }, {});
                expect(numReplaced).to.be.equal(0);

                let docs = await d.find({});
                expect(docs).to.be.empty;

                const [_numReplaced, updatedDoc] = await d.update({ impossible: "db is empty anyway" }, { something: "created ok" }, { upsert: true });
                expect(_numReplaced).to.be.equal(1);
                expect(updatedDoc.something).to.be.equal("created ok");
                expect(updatedDoc).to.have.property("_id");

                docs = await d.find({});
                expect(docs).to.have.lengthOf(1);
                expect(docs[0].something).to.be.equal("created ok");
                updatedDoc.newField = true;
                docs = await d.find({});
                expect(docs[0].something).to.be.equal("created ok");
                expect(docs[0]).to.not.have.property("newField");
            });

            it("If the update query is a normal object with no modifiers, it is the doc that will be upserted", async () => {
                await d.update({ $or: [{ a: 4 }, { a: 5 }] }, { hello: "world", bloup: "blap" }, { upsert: true });
                const docs = await d.find({});
                expect(docs).to.have.lengthOf(1);
                const doc = docs[0];
                expect(Object.keys(doc)).to.have.lengthOf(3);
                expect(doc.hello).to.be.equal("world");
                expect(doc.bloup).to.be.equal("blap");
            });

            it("If the update query contains modifiers, it is applied to the object resulting from removing all operators from the find query 1", async () => {
                await d.update({ $or: [{ a: 4 }, { a: 5 }] }, { $set: { hello: "world" }, $inc: { bloup: 3 } }, { upsert: true });
                const docs = await d.find({ hello: "world" });
                expect(docs).to.have.lengthOf(1);
                const doc = docs[0];
                expect(Object.keys(doc)).to.have.lengthOf(3);
                expect(doc.hello).to.be.equal("world");
                expect(doc.bloup).to.be.equal(3);
            });

            it("If the update query contains modifiers, it is applied to the object resulting from removing all operators from the find query 2", async () => {
                await d.update({ $or: [{ a: 4 }, { a: 5 }], cac: "rrr" }, { $set: { hello: "world" }, $inc: { bloup: 3 } }, { upsert: true });
                const docs = await d.find({ hello: "world" });
                expect(docs).to.have.lengthOf(1);
                const doc = docs[0];
                expect(Object.keys(doc)).to.have.lengthOf(4);
                expect(doc.cac).to.be.equal("rrr");
                expect(doc.hello).to.be.equal("world");
                expect(doc.bloup).to.be.equal(3);
            });

            it("Performing upsert with badly formatted fields yields a standard error not an exception", async (done) => {
                try {
                    await d.update({ _id: "1234" }, { $set: { $$badfield: 5 } }, { upsert: true });
                    done(new Error("updated"));
                } catch (err) {
                    done();
                }
            });
        }); // ==== End of 'Upserts' ==== //

        it("Cannot perform update if the update query is not either registered-modifiers-only or copy-only, or contain badly formatted fields", async () => {
            await d.insert({ something: "yup" });

            let err = null;
            try {
                await d.update({}, { boom: { $badfield: 5 } }, { multi: false });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
            err = null;
            try {
                await d.update({}, { boom: { "bad.field": 5 } }, { multi: false });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
            err = null;
            try {
                await d.update({}, { $inc: { test: 5 }, mixed: "rrr" }, { multi: false });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
            err = null;
            try {
                await d.update({}, { $inexistent: { test: 5 } }, { multi: false });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
        });

        it("Can update documents using multiple modifiers", async () => {
            const newDoc = await d.insert({ something: "yup", other: 40 });
            const id = newDoc._id;
            const [numReplaced] = await d.update({}, { $set: { something: "changed" }, $inc: { other: 10 } }, { multi: false });
            expect(numReplaced).to.be.equal(1);
            const doc = await d.findOne({ _id: id });
            expect(Object.keys(doc)).to.have.lengthOf(3);
            expect(doc._id).to.be.equal(id);
            expect(doc.something).to.be.equal("changed");
            expect(doc.other).to.be.equal(50);
        });

        it("Can upsert a document even with modifiers", async () => {
            const [nr, newDoc] = await d.update({ bloup: "blap" }, { $set: { hello: "world" } }, { upsert: true });
            expect(nr).to.be.equal(1);
            expect(newDoc.bloup).to.be.equal("blap");
            expect(newDoc.hello).to.be.equal("world");
            expect(newDoc).to.have.property("_id");

            const docs = await d.find({});
            expect(docs).to.have.lengthOf(1);
            expect(Object.keys(docs[0])).to.have.lengthOf(3);
            expect(docs[0].hello).to.be.equal("world");
            expect(docs[0].bloup).to.be.equal("blap");
            expect(docs[0]).to.have.property("_id");
        });

        it("When using modifiers, the only way to update subdocs is with the dot-notation", async () => {
            await d.insert({ bloup: { blip: "blap", other: true } });
            await d.update({}, { $set: { "bloup.blip": "hello" } }, {});
            let doc = await d.findOne({});
            expect(doc.bloup.blip).to.be.equal("hello");
            expect(doc.bloup.other).to.be.true;
            await d.update({}, { $set: { bloup: { blip: "ola" } } }, {});
            doc = await d.findOne({});
            expect(doc.bloup.blip).to.be.equal("ola");
            expect(doc.bloup.other).to.be.undefined;
        });

        it("Returns an error if the query is not well formed", async (done) => {
            await d.insert({ hello: "world" });
            try {
                await d.update({ $or: { hello: "world" } }, { a: 1 }, {});
                done(new Error("no error"));
            } catch (err) {
                done();
            }
        });

        it("If an error is thrown by a modifier, the database state is not changed", async (done) => {
            const newDoc = await d.insert({ hello: "world" });
            try {
                await d.update({}, { $inc: { hello: 4 } }, {});
                done(new Error("no error"));
                return;
            } catch (err) {
                //
            }
            const docs = await d.find({});
            expect(docs).to.be.deep.equal([{ _id: newDoc._id, hello: "world" }]);
            done();
        });

        it("Cant change the _id of a document", async () => {
            const newDoc = await d.insert({ a: 2 });
            let err = null;
            try {
                await d.update({ a: 2 }, { a: 2, _id: "nope" });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
            err = null;

            let docs = await d.find({});
            expect(docs).to.have.lengthOf(1);
            expect(Object.keys(docs[0])).to.have.lengthOf(2);
            expect(docs[0].a).to.be.equal(2);
            expect(docs[0]._id).to.be.equal(newDoc._id);
            try {
                await d.update({ a: 2 }, { $set: { _id: "nope" } }, {});
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
            err = null;

            docs = await d.find({});
            expect(docs).to.have.lengthOf(1);
            expect(Object.keys(docs[0])).to.have.lengthOf(2);
            expect(docs[0].a).to.be.equal(2);
            expect(docs[0]._id).to.be.equal(newDoc._id);
        });

        it("Non-multi updates are persistent", async () => {
            const doc1 = await d.insert({ a: 1, hello: "world" });
            const doc2 = await d.insert({ a: 2, hello: "earth" });
            await d.update({ a: 2 }, { $set: { hello: "changed" } }, {});

            let docs = await d.find({});
            docs.sort((a, b) => a.a - b.a);
            expect(docs).to.have.lengthOf(2);
            expect(docs[0]).to.be.deep.equal({ _id: doc1._id, a: 1, hello: "world" });
            expect(docs[1]).to.be.deep.equal({ _id: doc2._id, a: 2, hello: "changed" });

            await d.load();

            docs = await d.find({});
            docs.sort((a, b) => a.a - b.a);
            expect(docs).to.have.lengthOf(2);
            expect(docs[0]).to.be.deep.equal({ _id: doc1._id, a: 1, hello: "world" });
            expect(docs[1]).to.be.deep.equal({ _id: doc2._id, a: 2, hello: "changed" });
        });

        it("Multi updates are persistent", async () => {
            const doc1 = await d.insert({ a: 1, hello: "world" });
            const doc2 = await d.insert({ a: 2, hello: "earth" });
            const doc3 = await d.insert({ a: 5, hello: "pluton" });
            await d.update({ a: { $in: [1, 2] } }, { $set: { hello: "changed" } }, { multi: true });

            let docs = await d.find({});
            docs.sort((a, b) => a.a - b.a);
            expect(docs[0]).to.be.deep.equal({ _id: doc1._id, a: 1, hello: "changed" });
            expect(docs[1]).to.be.deep.equal({ _id: doc2._id, a: 2, hello: "changed" });
            expect(docs[2]).to.be.deep.equal({ _id: doc3._id, a: 5, hello: "pluton" });

            await d.load();

            docs = await d.find({});
            docs.sort((a, b) => a.a - b.a);
            expect(docs[0]).to.be.deep.equal({ _id: doc1._id, a: 1, hello: "changed" });
            expect(docs[1]).to.be.deep.equal({ _id: doc2._id, a: 2, hello: "changed" });
            expect(docs[2]).to.be.deep.equal({ _id: doc3._id, a: 5, hello: "pluton" });
        });

        it("Can update without the options arg (will use defaults then)", async () => {
            const doc1 = await d.insert({ a: 1, hello: "world" });
            const doc2 = await d.insert({ a: 2, hello: "earth" });
            const doc3 = await d.insert({ a: 5, hello: "pluton" });

            const [nr] = await d.update({ a: 2 }, { $inc: { a: 10 } });

            expect(nr).to.be.equal(1);

            const docs = await d.find({});

            const d1 = docs.find((x) => x._id === doc1._id);
            const d2 = docs.find((x) => x._id === doc2._id);
            const d3 = docs.find((x) => x._id === doc3._id);

            expect(d1.a).to.be.equal(1);
            expect(d2.a).to.be.equal(12);
            expect(d3.a).to.be.equal(5);
        });

        it("If a multi update fails on one document, previous updates should be rolled back", async () => {
            await d.ensureIndex({ fieldName: "a" });
            const doc1 = await d.insert({ a: 4 });
            const doc2 = await d.insert({ a: 5 });
            const doc3 = await d.insert({ a: "abc" });
            // With this query, candidates are always returned in the order 4, 5, 'abc' so it's always the last one which fails
            let err = null;
            try {
                await d.update({ a: { $in: [4, 5, "abc"] } }, { $inc: { a: 10 } }, { multi: true });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;

            // No index modified
            for (const k of Object.keys(d.indexes)) {
                const index = d.indexes[k];
                const docs = index.getAll();
                const d1 = docs.find((x) => x._id === doc1._id);
                const d2 = docs.find((x) => x._id === doc2._id);
                const d3 = docs.find((x) => x._id === doc3._id);
                // All changes rolled back, including those that didn't trigger an error
                expect(d1.a).to.be.equal(4);
                expect(d2.a).to.be.equal(5);
                expect(d3.a).to.be.equal("abc");
            }
        });

        it("If an index constraint is violated by an update, all changes should be rolled back", async () => {
            await d.ensureIndex({ fieldName: "a", unique: true });
            const doc1 = await d.insert({ a: 4 });
            const doc2 = await d.insert({ a: 5 });
            // With this query, candidates are always returned in the order 4, 5, 'abc' so it's always the last one which fails
            let err = null;
            try {
                await d.update({ a: { $in: [4, 5, "abc"] } }, { $set: { a: 10 } }, { multi: true });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;

            // Check that no index was modified
            for (const k of Object.keys(d.indexes)) {
                const index = d.indexes[k];
                const docs = index.getAll();
                const d1 = docs.find((x) => x._id === doc1._id);
                const d2 = docs.find((x) => x._id === doc2._id);

                expect(d1.a).to.be.equal(4);
                expect(d2.a).to.be.equal(5);
            }
        });

        it("If options.returnUpdatedDocs is true, return all matched docs", async () => {
            const docs = await d.insert([{ a: 4 }, { a: 5 }, { a: 6 }]);
            expect(docs).to.have.lengthOf(3);
            let [num, updatedDocs] = await d.update({ a: 7 }, { $set: { u: 1 } }, { multi: true, returnUpdatedDocs: true });
            expect(num).to.be.equal(0);
            expect(updatedDocs).to.be.empty;

            [num, updatedDocs] = await d.update({ a: 5 }, { $set: { u: 2 } }, { multi: true, returnUpdatedDocs: true });
            expect(num).to.be.equal(1);
            expect(updatedDocs).to.have.lengthOf(1);
            expect(updatedDocs[0].a).to.be.equal(5);
            expect(updatedDocs[0].u).to.be.equal(2);

            [num, updatedDocs] = await d.update({ a: { $in: [4, 6] } }, { $set: { u: 3 } }, { multi: true, returnUpdatedDocs: true });
            expect(num).to.be.equal(2);
            expect(updatedDocs).to.have.lengthOf(2);
            expect(updatedDocs[0].u).to.be.equal(3);
            expect(updatedDocs[1].u).to.be.equal(3);
            if (updatedDocs[0].a === 4) {
                expect(updatedDocs[0].a).to.be.equal(4);
                expect(updatedDocs[1].a).to.be.equal(6);
            } else {
                expect(updatedDocs[0].a).to.be.equal(6);
                expect(updatedDocs[1].a).to.be.equal(4);
            }
        });

        it("createdAt property is unchanged and updatedAt correct after an update, even a complete document replacement", async () => {
            const d2 = new Datastore({ inMemoryOnly: true, timestampData: true });
            await d2.insert({ a: 1 });
            let doc = await d2.findOne({ a: 1 });
            const createdAt = doc.createdAt.getTime();
            await adone.promise.delay(20);
            await d2.update({ a: 1 }, { $set: { b: 2 } }, {});
            doc = await d2.findOne({ a: 1 });
            expect(doc.createdAt.getTime()).to.be.equal(createdAt);
            expect(new Date() - doc.updatedAt).to.be.below(5);
            await adone.promise.delay(20);
            await d2.update({ a: 1 }, { c: 3 }, {});
            doc = await d2.findOne({ c: 3 });
            expect(doc.createdAt.getTime()).to.be.equal(createdAt);
            expect(new Date() - doc.updatedAt).to.be.below(5);
        });

        describe("Callback signature", () => {

            it("Regular update, multi false", async () => {
                await d.insert({ a: 1 });
                await d.insert({ a: 2 });

                // returnUpdatedDocs set to false
                let [numAffected, affectedDocuments, upsert] = await d.update({ a: 1 }, { $set: { b: 20 } }, {});
                expect(numAffected).to.be.equal(1);
                expect(affectedDocuments).to.be.undefined;
                expect(upsert).to.be.undefined;

                // returnUpdatedDocs set to true
                [numAffected, affectedDocuments, upsert] = await d.update({ a: 1 }, { $set: { b: 21 } }, { returnUpdatedDocs: true });
                expect(numAffected).to.be.equal(1);
                expect(affectedDocuments.a).to.be.equal(1);
                expect(affectedDocuments.b).to.be.equal(21);
                expect(upsert).to.be.undefined;
            });

            it("Regular update, multi true", async () => {
                await d.insert({ a: 1 });
                await d.insert({ a: 2 });

                // returnUpdatedDocs set to false
                let [numAffected, affectedDocuments, upsert] = await d.update({}, { $set: { b: 20 } }, { multi: true });
                expect(numAffected).to.be.equal(2);
                expect(affectedDocuments).to.be.undefined;
                expect(upsert).to.be.undefined;

                // returnUpdatedDocs set to true
                [numAffected, affectedDocuments, upsert] = await d.update({}, { $set: { b: 21 } }, { multi: true, returnUpdatedDocs: true });
                expect(numAffected).to.be.equal(2);
                expect(affectedDocuments).to.have.lengthOf(2);
                expect(upsert).to.be.undefined;
            });

            it("Upsert", async () => {
                await d.insert({ a: 1 });
                await d.insert({ a: 2 });

                // Upsert flag not set
                let [numAffected, affectedDocuments, upsert] = await d.update({ a: 3 }, { $set: { b: 20 } }, {});
                expect(numAffected).to.be.equal(0);
                expect(affectedDocuments).to.be.undefined;
                expect(upsert).to.be.undefined;

                // Upsert flag set
                [numAffected, affectedDocuments, upsert] = await d.update({ a: 3 }, { $set: { b: 21 } }, { upsert: true });
                expect(numAffected).to.be.equal(1);
                expect(affectedDocuments.a).to.be.equal(3);
                expect(affectedDocuments.b).to.be.equal(21);
                expect(upsert).to.be.true;

                const docs = await d.find({});
                expect(docs).to.have.lengthOf(3);
            });
        }); // ==== End of 'Update - Callback signature' ==== //
    }); // ==== End of 'Update' ==== //


    describe("Remove", () => {

        it("Can remove multiple documents", async () => {
            const doc1 = await d.insert({ somedata: "ok" });
            const id1 = doc1._id;

            await d.insert({ somedata: "again", plus: "additional data" });

            await d.insert({ somedata: "again" });

            const n = await d.remove({ somedata: "again" }, { multi: true });
            expect(n).to.be.equal(2);

            const testPostUpdateState = async () => {
                const docs = await d.find({});
                expect(docs).to.have.lengthOf(1);
                expect(Object.keys(docs[0])).to.have.lengthOf(2);
                expect(docs[0]._id).to.be.equal(id1);
                expect(docs[0].somedata).to.be.equal("ok");
            };


            await testPostUpdateState();
            await d.load();
            await testPostUpdateState();
        });

        // This tests concurrency issues
        it("Remove can be called multiple times in parallel and everything that needs to be removed will be", async () => {
            await d.insert({ planet: "Earth" });
            await d.insert({ planet: "Mars" });
            await d.insert({ planet: "Saturn" });
            let docs = await d.find({});
            expect(docs).to.have.lengthOf(3);
            await Promise.all(["Mars", "Saturn"].map((planet) => d.remove({ planet })));
            docs = await d.find({});
            expect(docs).to.have.lengthOf(1);
        });

        it("Returns an error if the query is not well formed", async () => {
            await d.insert({ hello: "world" });
            let err = null;
            try {
                await d.remove({ $or: { hello: "world" } }, {});
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;
        });

        it("Non-multi removes are persistent", async () => {
            const doc1 = await d.insert({ a: 1, hello: "world" });
            await d.insert({ a: 2, hello: "earth" });
            const doc3 = await d.insert({ a: 3, hello: "moto" });
            await d.remove({ a: 2 }, {});

            let docs = await d.find({});
            docs.sort((a, b) => a.a - b.a);
            expect(docs).to.have.lengthOf(2);
            expect(docs[0]).to.be.deep.equal({ _id: doc1._id, a: 1, hello: "world" });
            expect(docs[1]).to.be.deep.equal({ _id: doc3._id, a: 3, hello: "moto" });

            // Even after a reload the database state hasn't changed
            await d.load();
            docs = await d.find({});
            docs.sort((a, b) => a.a - b.a);
            expect(docs).to.have.lengthOf(2);
            expect(docs[0]).to.be.deep.equal({ _id: doc1._id, a: 1, hello: "world" });
            expect(docs[1]).to.be.deep.equal({ _id: doc3._id, a: 3, hello: "moto" });
        });

        it("Multi removes are persistent", async () => {
            await d.insert({ a: 1, hello: "world" });
            const doc2 = await d.insert({ a: 2, hello: "earth" });
            await d.insert({ a: 3, hello: "moto" });

            await d.remove({ a: { $in: [1, 3] } }, { multi: true });

            let docs = await d.find({});
            expect(docs).to.have.lengthOf(1);
            expect(docs[0]).to.be.deep.equal({ _id: doc2._id, a: 2, hello: "earth" });

            // Even after a reload the database state hasn't changed
            await d.load();

            docs = await d.find({});
            expect(docs).to.have.lengthOf(1);
            expect(docs[0]).to.be.deep.equal({ _id: doc2._id, a: 2, hello: "earth" });
        });

        it("Can remove without the options arg (will use defaults then)", async () => {
            const doc1 = await d.insert({ a: 1, hello: "world" });
            const doc2 = await d.insert({ a: 2, hello: "earth" });
            const doc3 = await d.insert({ a: 5, hello: "pluton" });
            await d.remove({ a: 2 });
            const docs = await d.find({});
            const d1 = docs.find((x) => x._id === doc1._id);
            const d2 = docs.find((x) => x._id === doc2._id);
            const d3 = docs.find((x) => x._id === doc3._id);

            expect(d1.a).to.be.equal(1);
            expect(d2).to.be.undefined;
            expect(d3.a).to.be.equal(5);
        });
    }); // ==== End of 'Remove' ==== //


    describe("Using indexes", () => {

        describe("ensureIndex and index initialization in database loading", () => {

            it("ensureIndex can be called right after a loadDatabase and be initialized and filled correctly", async () => {
                const now = new Date();
                const rawData = `${model.serialize({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ _id: "bbb", z: "2", hello: "world" })}\n${model.serialize({ _id: "ccc", z: "3", nested: { today: now } })}`;

                expect(d.getAllData()).to.be.empty;

                await adone.fs.writeFile(testDb, rawData, "utf8");
                await d.load();

                expect(d.getAllData()).to.have.lengthOf(3);

                expect([...d.indexes.keys()]).to.be.deep.equal(["_id"]);

                await d.ensureIndex({ fieldName: "z" });

                const z = d.indexes.get("z");

                expect(z.fieldName).to.be.equal("z");
                expect(z.unique).to.be.false;
                expect(z.sparse).to.be.false;
                expect(z.tree.getNumberOfKeys()).to.be.equal(3);
                expect(z.tree.search("1")[0]).to.be.equal(d.getAllData()[0]);
                expect(z.tree.search("2")[0]).to.be.equal(d.getAllData()[1]);
                expect(z.tree.search("3")[0]).to.be.equal(d.getAllData()[2]);
            });

            it("ensureIndex can be called twice on the same field, the second call will ahve no effect", async () => {
                expect([...d.indexes.keys()]).to.have.lengthOf(1);
                expect([...d.indexes.keys()][0]).to.be.equal("_id");

                await d.insert({ planet: "Earth" });
                await d.insert({ planet: "Mars" });
                const docs = await d.find({});
                expect(docs).to.have.lengthOf(2);

                await d.ensureIndex({ fieldName: "planet" });

                expect([...d.indexes.keys()]).to.have.lengthOf(2);
                expect([...d.indexes.keys()][0]).to.be.equal("_id");
                expect([...d.indexes.keys()][1]).to.be.equal("planet");

                expect(d.indexes.get("planet").getAll()).to.have.lengthOf(2);

                // This second call has no effect, documents don't get inserted twice in the index
                await d.ensureIndex({ fieldName: "planet" });

                expect(d.indexes.size).to.be.equal(2);
                expect(d.indexes.has("_id")).to.be.true;
                expect(d.indexes.has("planet")).to.be.true;

                expect(d.indexes.get("planet").getAll()).to.have.lengthOf(2);
            });

            it("ensureIndex can be called after the data set was modified and the index still be correct", async () => {
                const rawData = `${model.serialize({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ _id: "bbb", z: "2", hello: "world" })}`;

                expect(d.getAllData()).to.be.empty;

                await adone.fs.writeFile(testDb, rawData, "utf-8");
                await d.load();

                expect(d.getAllData()).to.have.lengthOf(2);

                expect(d.indexes.size).to.be.equal(1);
                expect(d.indexes.has("_id")).to.be.true;

                const newDoc1 = await d.insert({ z: "12", yes: "yes" });
                const newDoc2 = await d.insert({ z: "14", nope: "nope" });
                await d.remove({ z: "2" }, {});
                await d.update({ z: "1" }, { $set: { yes: "yep" } }, {});

                expect(d.indexes.size).to.be.equal(1);
                expect(d.indexes.has("_id")).to.be.true;


                await d.ensureIndex({ fieldName: "z" });
                const z = d.indexes.get("z");
                expect(z.fieldName).to.be.equal("z");
                expect(z.unique).to.be.false;
                expect(z.sparse).to.be.false;
                expect(z.tree.getNumberOfKeys()).to.be.equal(3);

                // The pointers in the _id and z indexes are the same
                const _id = d.indexes.get("_id");
                expect(z.tree.search("1")[0]).to.be.equal(_id.getMatching("aaa")[0]);
                expect(z.tree.search("12")[0]).to.be.equal(_id.getMatching(newDoc1._id)[0]);
                expect(z.tree.search("14")[0]).to.be.equal(_id.getMatching(newDoc2._id)[0]);

                // The data in the z index is correct
                const docs = await d.find({});
                const doc0 = docs.find((doc) => doc._id === "aaa");
                const doc1 = docs.find((doc) => doc._id === newDoc1._id);
                const doc2 = docs.find((doc) => doc._id === newDoc2._id);

                expect(docs).to.have.lengthOf(3);

                expect(doc0).to.be.deep.equal({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12], yes: "yep" });
                expect(doc1).to.be.deep.equal({ _id: newDoc1._id, z: "12", yes: "yes" });
                expect(doc2).to.be.deep.equal({ _id: newDoc2._id, z: "14", nope: "nope" });
            });

            it("ensureIndex can be called before a loadDatabase and still be initialized and filled correctly", async () => {
                const now = new Date();
                const rawData = `${model.serialize({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ _id: "bbb", z: "2", hello: "world" })}\n${model.serialize({ _id: "ccc", z: "3", nested: { today: now } })}`;

                expect(d.getAllData()).to.be.empty;

                await d.ensureIndex({ fieldName: "z" });

                const z = d.indexes.get("z");
                expect(z.fieldName).to.be.equal("z");
                expect(z.unique).to.be.false;
                expect(z.sparse).to.be.false;
                expect(z.tree.getNumberOfKeys()).to.be.equal(0);

                await adone.fs.writeFile(testDb, rawData, "utf8");
                await d.load();
                const doc1 = d.getAllData().find((doc) => doc.z === "1");
                const doc2 = d.getAllData().find((doc) => doc.z === "2");
                const doc3 = d.getAllData().find((doc) => doc.z === "3");

                expect(d.getAllData()).to.have.lengthOf(3);

                expect(z.tree.getNumberOfKeys()).to.be.equal(3);
                expect(z.tree.search("1")[0]).to.be.equal(doc1);
                expect(z.tree.search("2")[0]).to.be.equal(doc2);
                expect(z.tree.search("3")[0]).to.be.equal(doc3);
            });

            it("Can initialize multiple indexes on a database load", async () => {
                const now = new Date();
                const rawData = `${model.serialize({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ _id: "bbb", z: "2", a: "world" })}\n${model.serialize({ _id: "ccc", z: "3", a: { today: now } })}`;

                expect(d.getAllData()).to.be.empty;

                await d.ensureIndex({ fieldName: "z" });
                await d.ensureIndex({ fieldName: "a" });

                const z = d.indexes.get("z");
                const a = d.indexes.get("a");

                expect(a.tree.getNumberOfKeys()).to.be.equal(0);
                expect(z.tree.getNumberOfKeys()).to.be.equal(0);

                await adone.fs.writeFile(testDb, rawData, "utf8");
                await d.load();
                const doc1 = d.getAllData().find((doc) => doc.z === "1");
                const doc2 = d.getAllData().find((doc) => doc.z === "2");
                const doc3 = d.getAllData().find((doc) => doc.z === "3");

                expect(d.getAllData()).to.have.lengthOf(3);

                expect(z.tree.getNumberOfKeys()).to.be.equal(3);
                expect(z.tree.search("1")[0]).to.be.equal(doc1);
                expect(z.tree.search("2")[0]).to.be.equal(doc2);
                expect(z.tree.search("3")[0]).to.be.equal(doc3);

                expect(a.tree.getNumberOfKeys()).to.be.equal(3);
                expect(a.tree.search(2)[0]).to.be.equal(doc1);
                expect(a.tree.search("world")[0]).to.be.equal(doc2);
                expect(a.tree.search({ today: now })[0]).to.be.equal(doc3);
            });

            it("If a unique constraint is not respected, database loading will not work and no data will be inserted", async () => {
                const now = new Date();
                const rawData = `${model.serialize({ _id: "aaa", z: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ _id: "bbb", z: "2", a: "world" })}\n${model.serialize({ _id: "ccc", z: "1", a: { today: now } })}`;
                expect(d.getAllData()).to.be.empty;

                await d.ensureIndex({ fieldName: "z", unique: true });
                const z = d.indexes.get("z");
                expect(z.tree.getNumberOfKeys()).to.be.equal(0);

                await adone.fs.writeFile(testDb, rawData, "utf8");

                try {
                    await d.load();
                } catch (err) {
                    expect(err.errorType).to.be.equal("uniqueViolated");
                    expect(err.key).to.be.equal("1");
                    expect(d.getAllData()).to.be.empty;
                    expect(z.tree.getNumberOfKeys()).to.be.equal(0);
                    return;
                }
                throw new Error("fail");
            });

            it("If a unique constraint is not respected, ensureIndex will return an error and not create an index", async () => {
                await d.insert({ a: 1, b: 4 });
                await d.insert({ a: 2, b: 45 });
                await d.insert({ a: 1, b: 3 });
                await d.ensureIndex({ fieldName: "b" });
                try {
                    await d.ensureIndex({ fieldName: "a", unique: true });
                } catch (err) {
                    expect(err.errorType).to.be.equal("uniqueViolated");
                    expect([...d.indexes.keys()]).to.be.deep.equal(["_id", "b"]);
                    return;
                }
                throw new Error("fail");
            });

            it("Can remove an index", async () => {
                await d.ensureIndex({ fieldName: "e" });

                expect([...d.indexes.keys()]).to.have.lengthOf(2);
                expect(d.indexes.get("e")).to.be.ok;

                await d.removeIndex("e");
                expect([...d.indexes.keys()]).to.have.lengthOf(1);
                expect(d.indexes.e).to.be.undefined;
            });
        }); // ==== End of 'ensureIndex and index initialization in database loading' ==== //


        describe("Indexing newly inserted documents", () => {

            it("Newly inserted documents are indexed", async () => {
                await d.ensureIndex({ fieldName: "z" });
                const z = d.indexes.get("z");
                expect(z.tree.getNumberOfKeys()).to.be.equal(0);

                let newDoc = await d.insert({ a: 2, z: "yes" });

                expect(z.tree.getNumberOfKeys()).to.be.equal(1);
                expect(z.getMatching("yes")).to.be.deep.equal([newDoc]);

                newDoc = await d.insert({ a: 5, z: "nope" });
                expect(z.tree.getNumberOfKeys()).to.be.equal(2);
                expect(z.getMatching("nope")).to.be.deep.equal([newDoc]);
            });

            it("If multiple indexes are defined, the document is inserted in all of them", async () => {
                await d.ensureIndex({ fieldName: "z" });
                await d.ensureIndex({ fieldName: "ya" });

                const z = d.indexes.get("z");
                const ya = d.indexes.get("ya");

                expect(z.tree.getNumberOfKeys()).to.be.equal(0);

                const newDoc = await d.insert({ a: 2, z: "yes", ya: "indeed" });

                expect(z.tree.getNumberOfKeys()).to.be.equal(1);
                expect(ya.tree.getNumberOfKeys()).to.be.equal(1);
                expect(z.getMatching("yes")).to.be.deep.equal([newDoc]);
                expect(ya.getMatching("indeed")).to.be.deep.equal([newDoc]);

                const newDoc2 = await d.insert({ a: 5, z: "nope", ya: "sure" });
                expect(z.tree.getNumberOfKeys()).to.be.equal(2);
                expect(ya.tree.getNumberOfKeys()).to.be.equal(2);
                expect(z.getMatching("nope"), [newDoc2]);
                expect(ya.getMatching("sure")).to.be.deep.equal([newDoc2]);
            });

            it("Can insert two docs at the same key for a non unique index", async () => {
                await d.ensureIndex({ fieldName: "z" });
                const z = d.indexes.get("z");
                expect(z.tree.getNumberOfKeys()).to.be.equal(0);

                const newDoc = await d.insert({ a: 2, z: "yes" });
                expect(z.tree.getNumberOfKeys()).to.be.equal(1);
                expect(z.getMatching("yes")).to.be.deep.equal([newDoc]);

                const newDoc2 = await d.insert({ a: 5, z: "yes" });
                expect(z.tree.getNumberOfKeys()).to.be.equal(1);
                expect(z.getMatching("yes")).to.be.deep.equal([newDoc, newDoc2]);
            });

            it("If the index has a unique constraint, an error is thrown if it is violated and the data is not modified", async () => {
                await d.ensureIndex({ fieldName: "z", unique: true });
                const z = d.indexes.get("z");
                expect(z.tree.getNumberOfKeys()).to.be.equal(0);

                const newDoc = await d.insert({ a: 2, z: "yes" });

                expect(z.tree.getNumberOfKeys()).to.be.equal(1);
                expect(z.getMatching("yes")).to.be.deep.equal([newDoc]);

                try {
                    await d.insert({ a: 5, z: "yes" });
                } catch (err) {
                    expect(err.errorType).to.be.equal("uniqueViolated");
                    expect(err.key).to.be.equal("yes");
                    // Index didn't change
                    expect(z.tree.getNumberOfKeys()).to.be.equal(1);
                    expect(z.getMatching("yes")).to.be.deep.equal([newDoc]);

                    // Data didn't change
                    expect(d.getAllData()).to.be.deep.equal([newDoc]);
                    await d.load();
                    expect(d.getAllData()).to.have.lengthOf(1);
                    expect(d.getAllData()[0]).to.be.deep.equal(newDoc);
                    return;
                }
                throw new Error("fail");
            });

            it("If an index has a unique constraint, other indexes cannot be modified when it raises an error", async () => {
                await d.ensureIndex({ fieldName: "nonu1" });
                await d.ensureIndex({ fieldName: "uni", unique: true });
                await d.ensureIndex({ fieldName: "nonu2" });

                const nonu1 = d.indexes.get("nonu1");
                const nonu2 = d.indexes.get("nonu2");
                const uni = d.indexes.get("uni");

                const newDoc = await d.insert({ nonu1: "yes", nonu2: "yes2", uni: "willfail" });
                expect(nonu1.tree.getNumberOfKeys()).to.be.equal(1);
                expect(uni.tree.getNumberOfKeys()).to.be.equal(1);
                expect(nonu2.tree.getNumberOfKeys()).to.be.equal(1);

                try {
                    await d.insert({ nonu1: "no", nonu2: "no2", uni: "willfail" });
                } catch (err) {
                    expect(err.errorType).to.be.equal("uniqueViolated");
                    // No index was modified
                    expect(nonu1.tree.getNumberOfKeys()).to.be.equal(1);
                    expect(uni.tree.getNumberOfKeys()).to.be.equal(1);
                    expect(nonu2.tree.getNumberOfKeys()).to.be.equal(1);

                    expect(nonu1.getMatching("yes")).to.be.deep.equal([newDoc]);
                    expect(uni.getMatching("willfail")).to.be.deep.equal([newDoc]);
                    expect(nonu2.getMatching("yes2")).to.be.deep.equal([newDoc]);
                    return;
                }
                throw new Error("fail");
            });

            it("Unique indexes prevent you from inserting two docs where the field is undefined except if theyre sparse", async () => {
                await d.ensureIndex({ fieldName: "zzz", unique: true });
                const zzz = d.indexes.get("zzz");
                expect(zzz.tree.getNumberOfKeys()).to.be.equal(0);

                const newDoc = await d.insert({ a: 2, z: "yes" });
                expect(zzz.tree.getNumberOfKeys()).to.be.equal(1);
                expect(zzz.getMatching(undefined)).to.be.deep.equal([newDoc]);

                try {
                    await d.insert({ a: 5, z: "other" });
                } catch (err) {
                    expect(err.errorType).to.be.equal("uniqueViolated");
                    expect(err.key).to.be.undefined;
                    await d.ensureIndex({ fieldName: "yyy", unique: true, sparse: true });
                    const yyy = d.indexes.get("yyy");
                    await d.insert({ a: 5, z: "other", zzz: "set" });
                    expect(yyy.getAll()).to.be.empty; // Nothing indexed
                    expect(zzz.getAll()).to.have.lengthOf(2);
                    return;
                }
                throw new Error("fail");
            });

            it("Insertion still works as before with indexing", async () => {
                await d.ensureIndex({ fieldName: "a" });
                await d.ensureIndex({ fieldName: "b" });

                const doc1 = await d.insert({ a: 1, b: "hello" });
                const doc2 = await d.insert({ a: 2, b: "si" });
                const docs = await d.find({});
                expect(doc1).to.be.deep.equal(docs.find((d) => d._id === doc1._id));
                expect(doc2).to.be.deep.equal(docs.find((d) => d._id === doc2._id));
            });

            it("All indexes point to the same data as the main index on _id", async () => {
                await d.ensureIndex({ fieldName: "a" });
                const a = d.indexes.get("a");
                const _id = d.indexes.get("_id");

                const doc1 = await d.insert({ a: 1, b: "hello" });
                const doc2 = await d.insert({ a: 2, b: "si" });
                const docs = await d.find({});
                expect(docs).to.have.lengthOf(2);
                expect(d.getAllData()).to.have.lengthOf(2);

                expect(_id.getMatching(doc1._id)).to.have.lengthOf(1);
                expect(a.getMatching(1)).to.have.lengthOf(1);
                expect(_id.getMatching(doc1._id)[0]).to.be.equal(a.getMatching(1)[0]);

                expect(_id.getMatching(doc2._id)).to.have.lengthOf(1);
                expect(a.getMatching(2)).to.have.lengthOf(1);
                expect(_id.getMatching(doc2._id)[0]).to.be.equal(a.getMatching(2)[0]);
            });

            it("If a unique constraint is violated, no index is changed, including the main one", async () => {
                await d.ensureIndex({ fieldName: "a", unique: true });
                const a = d.indexes.get("a");
                const _id = d.indexes.get("_id");

                const doc1 = await d.insert({ a: 1, b: "hello" });
                let err;
                try {
                    await d.insert({ a: 1, b: "si" });
                } catch (_err) {
                    err = _err;
                }
                expect(err).to.be.ok;

                const docs = await d.find({});
                expect(docs).to.have.lengthOf(1);
                expect(d.getAllData()).to.have.lengthOf(1);

                expect(_id.getMatching(doc1._id)).to.have.lengthOf(1);
                expect(a.getMatching(1)).to.have.lengthOf(1);
                expect(_id.getMatching(doc1._id)[0]).to.be.equal(a.getMatching(1)[0]);

                expect(a.getMatching(2)).to.be.empty;
            });
        }); // ==== End of 'Indexing newly inserted documents' ==== //

        describe("Updating indexes upon document update", () => {

            it("Updating docs still works as before with indexing", async () => {
                await d.ensureIndex({ fieldName: "a" });

                const _doc1 = await d.insert({ a: 1, b: "hello" });
                const _doc2 = await d.insert({ a: 2, b: "si" });
                let [nr] = await d.update({ a: 1 }, { $set: { a: 456, b: "no" } }, {});
                let data = d.getAllData();
                let doc1 = data.find((doc) => doc._id === _doc1._id);
                let doc2 = data.find((doc) => doc._id === _doc2._id);

                expect(nr).to.be.equal(1);

                expect(data).to.have.lengthOf(2);
                expect(doc1).to.be.deep.equal({ a: 456, b: "no", _id: _doc1._id });
                expect(doc2).to.be.deep.equal({ a: 2, b: "si", _id: _doc2._id });

                [nr] = await d.update({}, { $inc: { a: 10 }, $set: { b: "same" } }, { multi: true });
                data = d.getAllData();
                doc1 = data.find((doc) => doc._id === _doc1._id);
                doc2 = data.find((doc) => doc._id === _doc2._id);
                expect(nr).to.be.equal(2);

                expect(data).to.have.lengthOf(2);
                expect(doc1).to.be.deep.equal({ a: 466, b: "same", _id: _doc1._id });
                expect(doc2).to.be.deep.equal({ a: 12, b: "same", _id: _doc2._id });
            });

            it("Indexes get updated when a document (or multiple documents) is updated", async () => {
                await d.ensureIndex({ fieldName: "a" });
                await d.ensureIndex({ fieldName: "b" });

                const a = d.indexes.get("a");
                const b = d.indexes.get("b");
                const _id = d.indexes.get("_id");

                const doc1 = await d.insert({ a: 1, b: "hello" });
                const doc2 = await d.insert({ a: 2, b: "si" });

                // Simple update
                let [nr] = await d.update({ a: 1 }, { $set: { a: 456, b: "no" } }, {});
                expect(nr).to.be.equal(1);

                expect(a.tree.getNumberOfKeys()).to.be.equal(2);
                expect(a.getMatching(456)[0]._id).to.be.equal(doc1._id);
                expect(a.getMatching(2)[0]._id).to.be.equal(doc2._id);

                expect(b.tree.getNumberOfKeys()).to.be.equal(2);
                expect(b.getMatching("no")[0]._id).to.be.equal(doc1._id);
                expect(b.getMatching("si")[0]._id).to.be.equal(doc2._id);

                // The same pointers are shared between all indexes
                expect(a.tree.getNumberOfKeys()).to.be.equal(2);
                expect(b.tree.getNumberOfKeys()).to.be.equal(2);
                expect(_id.tree.getNumberOfKeys()).to.be.equal(2);
                expect(a.getMatching(456)[0]).to.be.equal(_id.getMatching(doc1._id)[0]);
                expect(b.getMatching("no")[0]).to.be.equal(_id.getMatching(doc1._id)[0]);
                expect(a.getMatching(2)[0]).to.be.equal(_id.getMatching(doc2._id)[0]);
                expect(b.getMatching("si")[0]).to.be.equal(_id.getMatching(doc2._id)[0]);

                // Multi update
                [nr] = await d.update({}, { $inc: { a: 10 }, $set: { b: "same" } }, { multi: true });
                expect(nr).to.be.equal(2);

                expect(a.tree.getNumberOfKeys()).to.be.equal(2);
                expect(a.getMatching(466)[0]._id).to.be.equal(doc1._id);
                expect(a.getMatching(12)[0]._id).to.be.equal(doc2._id);

                expect(b.tree.getNumberOfKeys()).to.be.equal(1);
                expect(b.getMatching("same")).to.have.lengthOf(2);
                expect(b.getMatching("same").map((x) => x._id)).to.contain(doc1._id);
                expect(b.getMatching("same").map((x) => x._id)).to.contain(doc2._id);

                // The same pointers are shared between all indexes
                expect(a.tree.getNumberOfKeys()).to.be.equal(2);
                expect(b.tree.getNumberOfKeys()).to.be.equal(1);
                expect(b.getAll()).to.have.lengthOf(2);
                expect(_id.tree.getNumberOfKeys()).to.be.equal(2);
                expect(a.getMatching(466)[0]).to.be.equal(_id.getMatching(doc1._id)[0]);
                expect(a.getMatching(12)[0]).to.be.equal(_id.getMatching(doc2._id)[0]);
                // Can't test the pointers in b as their order is randomized, but it is the same as with a
            });

            it("If a simple update violates a contraint, all changes are rolled back and an error is thrown", async () => {
                await d.ensureIndex({ fieldName: "a", unique: true });
                await d.ensureIndex({ fieldName: "b", unique: true });
                await d.ensureIndex({ fieldName: "c", unique: true });

                const a = d.indexes.get("a");
                const b = d.indexes.get("b");
                const c = d.indexes.get("c");

                const _doc1 = await d.insert({ a: 1, b: 10, c: 100 });
                const _doc2 = await d.insert({ a: 2, b: 20, c: 200 });
                const _doc3 = await d.insert({ a: 3, b: 30, c: 300 });
                // Will conflict with doc3
                try {
                    await d.update({ a: 2 }, { $inc: { a: 10, c: 1000 }, $set: { b: 30 } }, {});
                } catch (err) {
                    const data = d.getAllData();
                    const doc1 = data.find((doc) => doc._id === _doc1._id);
                    const doc2 = data.find((doc) => doc._id === _doc2._id);
                    const doc3 = data.find((doc) => doc._id === _doc3._id);
                    expect(err.errorType).to.be.equal("uniqueViolated");

                    // Data left unchanged
                    expect(data).to.have.lengthOf(3);
                    expect(doc1).to.be.deep.equal({ a: 1, b: 10, c: 100, _id: _doc1._id });
                    expect(doc2).to.be.deep.equal({ a: 2, b: 20, c: 200, _id: _doc2._id });
                    expect(doc3).to.be.deep.equal({ a: 3, b: 30, c: 300, _id: _doc3._id });

                    // All indexes left unchanged and pointing to the same docs
                    expect(a.tree.getNumberOfKeys()).to.be.equal(3);
                    expect(a.getMatching(1)[0]).to.be.equal(doc1);
                    expect(a.getMatching(2)[0]).to.be.equal(doc2);
                    expect(a.getMatching(3)[0]).to.be.equal(doc3);

                    expect(b.tree.getNumberOfKeys()).to.be.equal(3);
                    expect(b.getMatching(10)[0]).to.be.equal(doc1);
                    expect(b.getMatching(20)[0]).to.be.equal(doc2);
                    expect(b.getMatching(30)[0]).to.be.equal(doc3);

                    expect(c.tree.getNumberOfKeys()).to.be.equal(3);
                    expect(c.getMatching(100)[0]).to.be.equal(doc1);
                    expect(c.getMatching(200)[0]).to.be.equal(doc2);
                    expect(c.getMatching(300)[0]).to.be.equal(doc3);
                    return;
                }
                throw new Error("fail");
            });

            it("If a multi update violates a contraint, all changes are rolled back and an error is thrown", async () => {
                await d.ensureIndex({ fieldName: "a", unique: true });
                await d.ensureIndex({ fieldName: "b", unique: true });
                await d.ensureIndex({ fieldName: "c", unique: true });

                const a = d.indexes.get("a");
                const b = d.indexes.get("b");
                const c = d.indexes.get("c");

                const _doc1 = await d.insert({ a: 1, b: 10, c: 100 });
                const _doc2 = await d.insert({ a: 2, b: 20, c: 200 });
                const _doc3 = await d.insert({ a: 3, b: 30, c: 300 });
                // Will conflict with doc3
                try {
                    await d.update({ a: { $in: [1, 2] } }, { $inc: { a: 10, c: 1000 }, $set: { b: 30 } }, { multi: true });
                } catch (err) {
                    const data = d.getAllData();
                    const doc1 = data.find((doc) => doc._id === _doc1._id);
                    const doc2 = data.find((doc) => doc._id === _doc2._id);
                    const doc3 = data.find((doc) => doc._id === _doc3._id);

                    expect(err.errorType).to.be.equal("uniqueViolated");

                    // Data left unchanged
                    expect(data).to.have.lengthOf(3);
                    expect(doc1).to.be.deep.equal({ a: 1, b: 10, c: 100, _id: _doc1._id });
                    expect(doc2).to.be.deep.equal({ a: 2, b: 20, c: 200, _id: _doc2._id });
                    expect(doc3).to.be.deep.equal({ a: 3, b: 30, c: 300, _id: _doc3._id });

                    // All indexes left unchanged and pointing to the same docs
                    expect(a.tree.getNumberOfKeys()).to.be.equal(3);
                    expect(a.getMatching(1)[0]).to.be.equal(doc1);
                    expect(a.getMatching(2)[0]).to.be.equal(doc2);
                    expect(a.getMatching(3)[0]).to.be.equal(doc3);

                    expect(b.tree.getNumberOfKeys()).to.be.equal(3);
                    expect(b.getMatching(10)[0]).to.be.equal(doc1);
                    expect(b.getMatching(20)[0]).to.be.equal(doc2);
                    expect(b.getMatching(30)[0]).to.be.equal(doc3);

                    expect(c.tree.getNumberOfKeys()).to.be.equal(3);
                    expect(c.getMatching(100)[0]).to.be.equal(doc1);
                    expect(c.getMatching(200)[0]).to.be.equal(doc2);
                    expect(c.getMatching(300)[0]).to.be.equal(doc3);
                    return;
                }
                throw new Error("fail");
            });
        }); // ==== End of 'Updating indexes upon document update' ==== //

        describe("Updating indexes upon document remove", () => {

            it("Removing docs still works as before with indexing", async () => {
                await d.ensureIndex({ fieldName: "a" });

                await d.insert({ a: 1, b: "hello" });
                const _doc2 = await d.insert({ a: 2, b: "si" });
                const _doc3 = await d.insert({ a: 3, b: "coin" });
                let nr = await d.remove({ a: 1 }, {});
                let data = d.getAllData();
                const doc2 = data.find((doc) => doc._id === _doc2._id);
                const doc3 = data.find((doc) => doc._id === _doc3._id);

                expect(nr).to.be.equal(1);

                expect(data).to.have.lengthOf(2);
                expect(doc2).to.be.deep.equal({ a: 2, b: "si", _id: _doc2._id });
                expect(doc3).to.be.deep.equal({ a: 3, b: "coin", _id: _doc3._id });

                nr = await d.remove({ a: { $in: [2, 3] } }, { multi: true });

                data = d.getAllData();

                expect(nr).to.be.equal(2);
                expect(data).to.be.empty;
            });

            it("Indexes get updated when a document (or multiple documents) is removed", async () => {
                await d.ensureIndex({ fieldName: "a" });
                await d.ensureIndex({ fieldName: "b" });

                const a = d.indexes.get("a");
                const b = d.indexes.get("b");
                const _id = d.indexes.get("_id");

                await d.insert({ a: 1, b: "hello" });
                const doc2 = await d.insert({ a: 2, b: "si" });
                const doc3 = await d.insert({ a: 3, b: "coin" });
                // Simple remove
                let nr = await d.remove({ a: 1 }, {});
                expect(nr).to.be.equal(1);

                expect(a.tree.getNumberOfKeys()).to.be.equal(2);
                expect(a.getMatching(2)[0]._id).to.be.equal(doc2._id);
                expect(a.getMatching(3)[0]._id).to.be.equal(doc3._id);

                expect(b.tree.getNumberOfKeys()).to.be.equal(2);
                expect(b.getMatching("si")[0]._id).to.be.equal(doc2._id);
                expect(b.getMatching("coin")[0]._id).to.be.equal(doc3._id);

                // The same pointers are shared between all indexes
                expect(a.tree.getNumberOfKeys()).to.be.equal(2);
                expect(b.tree.getNumberOfKeys()).to.be.equal(2);
                expect(_id.tree.getNumberOfKeys()).to.be.equal(2);
                expect(a.getMatching(2)[0]).to.be.equal(_id.getMatching(doc2._id)[0]);
                expect(b.getMatching("si")[0]).to.be.equal(_id.getMatching(doc2._id)[0]);
                expect(a.getMatching(3)[0]).to.be.equal(_id.getMatching(doc3._id)[0]);
                expect(b.getMatching("coin")[0]).to.be.equal(_id.getMatching(doc3._id)[0]);

                // Multi remove
                nr = await d.remove({}, { multi: true });
                expect(nr).to.be.equal(2);

                expect(a.tree.getNumberOfKeys()).to.be.equal(0);
                expect(b.tree.getNumberOfKeys()).to.be.equal(0);
                expect(_id.tree.getNumberOfKeys()).to.be.equal(0);
            });
        }); // ==== End of 'Updating indexes upon document remove' ==== //


        describe("Persisting indexes", () => {

            it("Indexes are persisted to a separate file and recreated upon reload", async () => {
                const persDb = tmpdir.getVirtualFile("persistIndexes.db");

                await persDb.unlink().catch(adone.noop);

                let db = new Datastore({ filename: persDb.path(), autoload: true });
                await db.load();
                expect(db.indexes.size).to.be.equal(1);
                expect(db.indexes.has("_id")).to.be.true;

                await db.insert({ planet: "Earth" });
                await db.insert({ planet: "Mars" });

                await db.ensureIndex({ fieldName: "planet" });


                expect(db.indexes.size).to.be.equal(2);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("planet")).to.be.true;
                let _id = db.indexes.get("_id");
                let planet = db.indexes.get("planet");
                expect(_id.getAll()).to.have.lengthOf(2);
                expect(planet.getAll()).to.have.lengthOf(2);
                expect(planet.fieldName).to.be.equal("planet");

                // After a reload the indexes are recreated
                db = new Datastore({ filename: persDb.path() });
                await db.load();
                expect(db.indexes.size).to.be.equal(2);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("planet")).to.be.true;
                _id = db.indexes.get("_id");
                planet = db.indexes.get("planet");
                expect(_id.getAll()).to.have.lengthOf(2);
                expect(planet.getAll()).to.have.lengthOf(2);
                expect(planet.fieldName).to.be.equal("planet");

                // After another reload the indexes are still there (i.e. they are preserved during autocompaction)
                db = new Datastore({ filename: persDb.path() });
                await db.load();
                expect(db.indexes.size).to.be.equal(2);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("planet")).to.be.true;
                _id = db.indexes.get("_id");
                planet = db.indexes.get("planet");
                expect(_id.getAll()).to.have.lengthOf(2);
                expect(planet.getAll()).to.have.lengthOf(2);
                expect(planet.fieldName).to.be.equal("planet");
            });

            it("Indexes are persisted with their options and recreated even if some db operation happen between loads", async () => {
                const persDb = tmpdir.getVirtualFile("persistIndexes.db");

                await persDb.unlink().catch(adone.noop);

                let db = new Datastore({ filename: persDb.path(), autoload: true });
                await db.load();
                expect(db.indexes.size).to.be.equal(1);
                expect(db.indexes.has("_id")).to.be.true;

                await db.insert({ planet: "Earth" });
                await db.insert({ planet: "Mars" });
                await db.ensureIndex({ fieldName: "planet", unique: true, sparse: false });

                expect(db.indexes.size).to.be.equal(2);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("planet")).to.be.true;
                let _id = db.indexes.get("_id");
                let planet = db.indexes.get("planet");
                expect(_id.getAll()).to.have.lengthOf(2);
                expect(planet.getAll()).to.have.lengthOf(2);
                expect(planet.unique).to.be.true;
                expect(planet.sparse).to.be.false;

                await db.insert({ planet: "Jupiter" });
                // After a reload the indexes are recreated
                db = new Datastore({ filename: persDb.path() });
                await db.load();
                expect(db.indexes.size).to.be.equal(2);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("planet")).to.be.true;
                _id = db.indexes.get("_id");
                planet = db.indexes.get("planet");
                expect(_id.getAll()).to.have.lengthOf(3);
                expect(planet.getAll()).to.have.lengthOf(3);
                expect(planet.unique).to.be.true;
                expect(planet.sparse).to.be.false;


                await db.ensureIndex({ fieldName: "bloup", unique: false, sparse: true });

                expect(db.indexes.size).to.be.equal(3);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("planet")).to.be.true;
                expect(db.indexes.has("bloup")).to.be.true;
                _id = db.indexes.get("_id");
                planet = db.indexes.get("planet");
                let bloup = db.indexes.get("bloup");
                expect(_id.getAll()).to.have.lengthOf(3);
                expect(planet.getAll()).to.have.lengthOf(3);
                expect(bloup.getAll()).to.be.empty;
                expect(planet.unique).to.be.true;
                expect(planet.sparse).to.be.false;
                expect(bloup.unique).to.be.false;
                expect(bloup.sparse).to.be.true;

                // After another reload the indexes are still there (i.e. they are preserved during autocompaction)
                db = new Datastore({ filename: persDb.path() });
                await db.load();
                expect(db.indexes.size).to.be.equal(3);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("planet")).to.be.true;
                expect(db.indexes.has("bloup")).to.be.true;
                _id = db.indexes.get("_id");
                planet = db.indexes.get("planet");
                bloup = db.indexes.get("bloup");
                expect(_id.getAll()).to.have.lengthOf(3);
                expect(planet.getAll()).to.have.lengthOf(3);
                expect(bloup.getAll()).to.be.empty;
                expect(planet.unique).to.be.true;
                expect(planet.sparse).to.be.false;
                expect(bloup.unique).to.be.false;
                expect(bloup.sparse).to.be.true;
            });

            it("Indexes can also be removed and the remove persisted", async () => {
                const persDb = tmpdir.getVirtualFile("persistIndexes.db");

                await persDb.unlink().catch(adone.noop);
                let db = new Datastore({ filename: persDb.path() });
                await db.load();

                expect(db.indexes.size).be.equal(1);
                expect(db.indexes.has("_id")).to.be.true;

                await db.insert({ planet: "Earth" });
                await db.insert({ planet: "Mars" });

                await db.ensureIndex({ fieldName: "planet" });
                await db.ensureIndex({ fieldName: "another" });

                expect(db.indexes.size).to.be.equal(3);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("planet")).to.be.true;
                expect(db.indexes.has("another")).to.be.true;

                let _id = db.indexes.get("_id");
                let planet = db.indexes.get("planet");

                expect(_id.getAll()).to.have.lengthOf(2);
                expect(planet.getAll()).to.have.lengthOf(2);
                expect(planet.fieldName).to.be.equal("planet");

                // After a reload the indexes are recreated
                db = new Datastore({ filename: persDb.path() });
                await db.load();
                expect(db.indexes.size).to.be.equal(3);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("planet")).to.be.true;
                expect(db.indexes.has("another")).to.be.true;
                _id = db.indexes.get("_id");
                planet = db.indexes.get("planet");
                expect(_id.getAll()).to.have.lengthOf(2);
                expect(planet.getAll()).to.have.lengthOf(2);
                expect(planet.fieldName).to.be.equal("planet");

                // Index is removed
                await db.removeIndex("planet");
                expect(db.indexes.size).to.be.equal(2);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("another")).to.be.true;
                _id = db.indexes.get("_id");
                expect(_id.getAll()).to.have.lengthOf(2);
                // After a reload indexes are preserved
                db = new Datastore({ filename: persDb.path() });
                await db.load();
                expect(db.indexes.size).to.be.equal(2);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("another")).to.be.true;
                _id = db.indexes.get("_id");
                expect(_id.getAll()).to.have.lengthOf(2);

                // After another reload the indexes are still there (i.e. they are preserved during autocompaction)
                db = new Datastore({ filename: persDb.path() });
                await db.load();
                expect(db.indexes.size).to.be.equal(2);
                expect(db.indexes.has("_id")).to.be.true;
                expect(db.indexes.has("another")).to.be.true;
                expect(_id.getAll()).to.have.lengthOf(2);
            });
        });

        it("Results of getMatching should never contain duplicates", async () => {
            await d.ensureIndex({ fieldName: "bad" });
            await d.insert({ bad: ["a", "b"] });
            const res = await d.getCandidates({ bad: { $in: ["a", "b"] } });
            expect(res).to.have.lengthOf(1);
        });
    });
});
