describe("database", "local", "Persistence", () => {
    const {
        std: { fs, path, child_process: cp },
        database: { local: { Model: model, Datastore, Persistence, Storage: storage } }
    } = adone;

    let d;
    let tmpdir;
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
        dbFile = await tmpdir.getVirtualFile("db.db");
        testDb = dbFile.path();
        d = new Datastore({ filename: testDb });
        expect(d.filename).to.be.equal(testDb);

        await Persistence.ensureDirectoryExists(path.dirname(testDb));

        await new Promise((resolve, reject) => {
            adone.std.fs.stat(testDb, (err) => {
                if (!err) {
                    return adone.std.fs.unlink(testDb, (err) => {
                        err ? reject(err) : resolve();
                    });
                }
                resolve();
            });
        });

        await d.load();
        expect(d.getAllData()).to.be.empty;
    });

    it("Every line represents a document", () => {
        const now = new Date();
        const rawData = `${model.serialize({ _id: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ _id: "2", hello: "world" })}\n${model.serialize({ _id: "3", nested: { today: now } })}`;
        const treatedData = d.persistence.treatRawData(rawData).data;

        treatedData.sort((a, b) => {
            return a._id - b._id;
        });
        expect(treatedData).to.have.lengthOf(3);
        expect(treatedData[0]).to.be.deep.equal({ _id: "1", a: 2, ages: [1, 5, 12] });
        expect(treatedData[1]).to.be.deep.equal({ _id: "2", hello: "world" });
        expect(treatedData[2]).to.be.deep.equal({ _id: "3", nested: { today: now } });
    });

    it("Badly formatted lines have no impact on the treated data", () => {
        const now = new Date();
        const rawData = `${model.serialize({ _id: "1", a: 2, ages: [1, 5, 12] })}\n` + `garbage\n${model.serialize({ _id: "3", nested: { today: now } })}`;
        const treatedData = d.persistence.treatRawData(rawData).data;

        treatedData.sort((a, b) => {
            return a._id - b._id;
        });
        expect(treatedData).to.have.lengthOf(2);
        expect(treatedData[0]).to.be.deep.equal({ _id: "1", a: 2, ages: [1, 5, 12] });
        expect(treatedData[1]).to.be.deep.equal({ _id: "3", nested: { today: now } });
    });

    it("Well formatted lines that have no _id are not included in the data", () => {
        const now = new Date();
        const rawData = `${model.serialize({ _id: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ _id: "2", hello: "world" })}\n${model.serialize({ nested: { today: now } })}`;
        const treatedData = d.persistence.treatRawData(rawData).data;

        treatedData.sort((a, b) => {
            return a._id - b._id;
        });
        expect(treatedData).to.have.lengthOf(2);
        expect(treatedData[0]).to.be.deep.equal({ _id: "1", a: 2, ages: [1, 5, 12] });
        expect(treatedData[1]).to.be.deep.equal({ _id: "2", hello: "world" });
    });

    it("If two lines concern the same doc (= same _id), the last one is the good version", () => {
        const now = new Date();
        const rawData = `${model.serialize({ _id: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ _id: "2", hello: "world" })}\n${model.serialize({ _id: "1", nested: { today: now } })}`;
        const treatedData = d.persistence.treatRawData(rawData).data;

        treatedData.sort((a, b) => {
            return a._id - b._id;
        });
        expect(treatedData).to.have.lengthOf(2);
        expect(treatedData[0]).to.be.deep.equal({ _id: "1", nested: { today: now } });
        expect(treatedData[1]).to.be.deep.equal({ _id: "2", hello: "world" });
    });

    it("If a doc contains $$deleted: true, that means we need to remove it from the data", () => {
        const now = new Date();
        const rawData = `${model.serialize({ _id: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ _id: "2", hello: "world" })}\n${model.serialize({ _id: "1", $$deleted: true })}\n${model.serialize({ _id: "3", today: now })}`;
        const treatedData = d.persistence.treatRawData(rawData).data;

        treatedData.sort((a, b) => {
            return a._id - b._id;
        });
        expect(treatedData).to.have.lengthOf(2);
        expect(treatedData[0]).to.be.deep.equal({ _id: "2", hello: "world" });
        expect(treatedData[1]).to.be.deep.equal({ _id: "3", today: now });
    });

    it("If a doc contains $$deleted: true, no error is thrown if the doc wasnt in the list before", () => {
        const now = new Date();
        const rawData = `${model.serialize({ _id: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ _id: "2", $$deleted: true })}\n${model.serialize({ _id: "3", today: now })}`;
        const treatedData = d.persistence.treatRawData(rawData).data;

        treatedData.sort((a, b) => {
            return a._id - b._id;
        });
        expect(treatedData).to.have.lengthOf(2);
        expect(treatedData[0]).to.be.deep.equal({ _id: "1", a: 2, ages: [1, 5, 12] });
        expect(treatedData[1]).to.be.deep.equal({ _id: "3", today: now });
    });

    it("If a doc contains $$indexCreated, no error is thrown during treatRawData and we can get the index options", () => {
        const now = new Date();
        const rawData = `${model.serialize({ _id: "1", a: 2, ages: [1, 5, 12] })}\n${model.serialize({ $$indexCreated: { fieldName: "test", unique: true } })}\n${model.serialize({ _id: "3", today: now })}`;
        const treatedData = d.persistence.treatRawData(rawData).data;
        const indexes = d.persistence.treatRawData(rawData).indexes;

        expect(Object.keys(indexes)).to.have.lengthOf(1);
        expect(indexes.test).to.be.deep.equal({ fieldName: "test", unique: true });

        treatedData.sort((a, b) => {
            return a._id - b._id;
        });
        expect(treatedData).to.have.lengthOf(2);
        expect(treatedData[0]).to.be.deep.equal({ _id: "1", a: 2, ages: [1, 5, 12] });
        expect(treatedData[1]).to.be.deep.equal({ _id: "3", today: now });
    });

    it("Compact database on load", async () => {
        await d.insert({ a: 2 });
        await d.insert({ a: 4 });
        await d.remove({ a: 2 }, {});
        // Here, the underlying file is 3 lines long for only one document
        {
            const data = fs.readFileSync(d.filename, "utf8").split("\n");
            let filledCount = 0;

            data.forEach((item) => {
                if (item.length > 0) {
                    filledCount += 1;
                }
            });
            expect(filledCount).to.be.equal(3);
        }

        await d.load();

        {
            const data = fs.readFileSync(d.filename, "utf8").split("\n");
            let filledCount = 0;

            data.forEach((item) => {
                if (item.length > 0) {
                    filledCount += 1;
                }
            });
            expect(filledCount).to.be.equal(1);
        }
    });

    it("Calling loadDatabase after the data was modified doesnt change its contents", async () => {
        await d.load();
        await d.insert({ a: 1 });
        await d.insert({ a: 2 });
        {
            const data = d.getAllData();
            const doc1 = data.find((x) => x.a === 1);
            const doc2 = data.find((x) => x.a === 2);
            expect(data).to.have.lengthOf(2);
            expect(doc1.a).to.be.equal(1);
            expect(doc2.a).to.be.equal(2);
        }

        await d.load();

        {
            const data = d.getAllData();
            const doc1 = data.find((x) => x.a === 1);
            const doc2 = data.find((x) => x.a === 2);
            expect(data).to.have.lengthOf(2);
            expect(doc1.a).to.be.equal(1);
            expect(doc2.a).to.be.equal(2);
        }
    });

    it("Calling loadDatabase after the datafile was removed will reset the database", async () => {
        await d.load();
        await d.insert({ a: 1 });
        await d.insert({ a: 2 });
        {
            const data = d.getAllData();
            const doc1 = data.find((x) => x.a === 1);
            const doc2 = data.find((x) => x.a === 2);
            expect(data).to.have.lengthOf(2);
            expect(doc1.a).to.be.equal(1);
            expect(doc2.a).to.be.equal(2);
        }

        fs.unlinkSync(testDb);

        await d.load();
        expect(d.getAllData()).to.be.empty;
    });

    it("Calling loadDatabase after the datafile was modified loads the new data", async () => {
        await d.load();
        await d.insert({ a: 1 });
        await d.insert({ a: 2 });
        {
            const data = d.getAllData();
            const doc1 = data.find((x) => x.a === 1);
            const doc2 = data.find((x) => x.a === 2);
            expect(data).to.have.lengthOf(2);
            expect(doc1.a).to.be.equal(1);
            expect(doc2.a).to.be.equal(2);
        }

        fs.writeFileSync(testDb, "{\"a\":3,\"_id\":\"aaa\"}", "utf-8");

        await d.load();

        {
            const data = d.getAllData();
            const doc1 = data.find((x) => x.a === 1);
            const doc2 = data.find((x) => x.a === 2);
            const doc3 = data.find((x) => x.a === 3);
            expect(data).to.have.lengthOf(1);
            expect(doc3.a).to.be.equal(3);
            expect(doc1).to.be.undefined;
            expect(doc2).to.be.undefined;
        }
    });

    it("When treating raw data, refuse to proceed if too much data is corrupt, to avoid data loss", async () => {
        const fakeData = "{\"_id\":\"one\",\"hello\":\"world\"}\n" + "Some corrupt data\n" + "{\"_id\":\"two\",\"hello\":\"earth\"}\n" + "{\"_id\":\"three\",\"hello\":\"you\"}\n";

        const corruptFile = await tmpdir.addFile("corruptTest.db", {
            content: fakeData
        });

        // Default corruptAlertThreshold
        let d = new Datastore({ filename: corruptFile.path() });

        let err = null;
        try {
            await d.load();
        } catch (_err) {
            err = _err;
        }
        expect(err).to.be.not.null;

        await corruptFile.write(fakeData);

        d = new Datastore({ filename: corruptFile.path(), corruptAlertThreshold: 1 });
        await d.load();

        await corruptFile.write(fakeData);

        d = new Datastore({ filename: corruptFile.path(), corruptAlertThreshold: 0 });
        err = null;
        try {
            await d.load();
        } catch (_err) {
            err = _err;
        }
        expect(err).to.be.not.null;
    });

    it("Can wait for compaction", async () => {
        await d.persistence.compactDatafile();
    });

    describe("Serialization hooks", () => {
        const as = function (s) {
            return `before_${s}_after`;
        };
        const bd = function (s) {
            return s.substring(7, s.length - 6);
        };

        it("Declaring only one hook will throw an exception to prevent data loss", async () => {
            const hookFile = await tmpdir.getVirtualFile("hookTest.db");

            await storage.ensureFileDoesntExist(hookFile.path());

            await hookFile.write("Some content");

            let err = null;
            try {
                const d = new Datastore({ filename: hookFile.path(), afterSerialization: as });
                await d.load();
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;

            // Data file left untouched
            expect(await hookFile.contents()).to.be.equal("Some content");

            err = null;
            try {
                const d = new Datastore({ filename: hookFile.path(), beforeDeserialization: bd });
                await d.load();
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;

            expect(await hookFile.contents()).to.be.equal("Some content");
        });

        it.skip("Declaring two hooks that are not reverse of one another will cause an exception to prevent data loss", async () => {
            const hookFile = await tmpdir.getVirtualFile("hookTest.db");
            await storage.ensureFileDoesntExist(hookFile.path());
            await hookFile.write("Some content");

            let err = null;
            try {
                const d = new Datastore({
                    filename: hookFile.path(),
                    afterSerialization: as,
                    beforeDeserialization: (s) => s
                });
                await d.load();
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;

            // Data file left untouched
            expect(await hookFile.contents()).to.be.equal("Some content");
        });

        it("A serialization hook can be used to transform data before writing new state to disk", async () => {
            const hookFile = await tmpdir.getVirtualFile("hookTest.db");
            await storage.ensureFileDoesntExist(hookFile.path());
            const d = new Datastore({ filename: hookFile.path(), afterSerialization: as, beforeDeserialization: bd });
            await d.load();
            await d.insert({ hello: "world" });
            {
                const _data = await hookFile.contents();
                const data = _data.split("\n");
                let doc0 = bd(data[0]);

                expect(data).to.have.lengthOf(2);
                expect(data[0].substring(0, 7)).to.be.equal("before_");
                expect(data[0].substring(data[0].length - 6)).to.be.equal("_after");

                doc0 = model.deserialize(doc0);
                expect(Object.keys(doc0)).to.have.lengthOf(2);
                expect(doc0.hello).to.be.equal("world");
            }
            await d.insert({ p: "Mars" });
            {
                const _data = await hookFile.contents();
                const data = _data.split("\n");
                let doc0 = bd(data[0]);
                let doc1 = bd(data[1]);

                expect(data).to.have.lengthOf(3);

                expect(data[0].substring(0, 7)).to.be.equal("before_");
                expect(data[0].substring(data[0].length - 6)).to.be.equal("_after");
                expect(data[1].substring(0, 7)).to.be.equal("before_");
                expect(data[1].substring(data[1].length - 6)).to.be.equal("_after");

                doc0 = model.deserialize(doc0);
                expect(Object.keys(doc0)).to.have.lengthOf(2);
                expect(doc0.hello).to.be.equal("world");

                doc1 = model.deserialize(doc1);
                expect(Object.keys(doc1)).to.have.lengthOf(2);
                expect(doc1.p).to.be.equal("Mars");
            }
            await d.ensureIndex({ fieldName: "idefix" });
            {
                const _data = await hookFile.contents();
                const data = _data.split("\n");
                let doc0 = bd(data[0]);
                let doc1 = bd(data[1]);
                let idx = bd(data[2]);

                expect(data).to.have.lengthOf(4);

                expect(data[0].substring(0, 7)).to.be.equal("before_");
                expect(data[0].substring(data[0].length - 6)).to.be.equal("_after");
                expect(data[1].substring(0, 7)).to.be.equal("before_");
                expect(data[1].substring(data[1].length - 6)).to.be.equal("_after");

                doc0 = model.deserialize(doc0);
                expect(Object.keys(doc0)).to.have.lengthOf(2);
                expect(doc0.hello).to.be.equal("world");

                doc1 = model.deserialize(doc1);
                expect(Object.keys(doc1)).to.have.lengthOf(2);
                expect(doc1.p).to.be.equal("Mars");

                idx = model.deserialize(idx);
                expect(idx).to.be.deep.equal({ $$indexCreated: { fieldName: "idefix" } });
            }
        });

        it("Use serialization hook when persisting cached database or compacting", async () => {
            const hookFile = await tmpdir.getVirtualFile("hookTest.db");
            await storage.ensureFileDoesntExist(hookFile.path());
            const d = new Datastore({ filename: hookFile.path(), afterSerialization: as, beforeDeserialization: bd });
            await d.load();

            await d.insert({ hello: "world" });
            await d.update({ hello: "world" }, { $set: { hello: "earth" } }, {});
            await d.ensureIndex({ fieldName: "idefix" });
            let _id;
            {
                const _data = await hookFile.contents();
                const data = _data.split("\n");
                let doc0 = bd(data[0]);
                let doc1 = bd(data[1]);
                let idx = bd(data[2]);

                expect(data).to.have.lengthOf(4);

                doc0 = model.deserialize(doc0);
                expect(Object.keys(doc0)).to.have.lengthOf(2);
                expect(doc0.hello).to.be.equal("world");

                doc1 = model.deserialize(doc1);
                expect(Object.keys(doc1)).to.have.lengthOf(2);
                expect(doc1.hello).to.be.equal("earth");

                expect(doc0._id).to.be.equal(doc1._id);
                _id = doc0._id;

                idx = model.deserialize(idx);
                expect(idx).to.be.deep.equal({ $$indexCreated: { fieldName: "idefix" } });
            }
            await d.persistence.persistCachedDatabase();
            {
                const _data = await hookFile.contents();
                const data = _data.split("\n");
                let doc0 = bd(data[0]);
                let idx = bd(data[1]);

                expect(data).to.have.lengthOf(3);

                doc0 = model.deserialize(doc0);
                expect(Object.keys(doc0)).to.have.lengthOf(2);
                expect(doc0.hello).to.be.equal("earth");

                expect(doc0._id).to.be.equal(_id);

                idx = model.deserialize(idx);
                expect(idx).to.be.deep.equal({ $$indexCreated: { fieldName: "idefix", unique: false, sparse: false } });
            }
        });

        it("Deserialization hook is correctly used when loading data", async () => {
            const hookFile = await tmpdir.getVirtualFile("hookTest.db");
            await storage.ensureFileDoesntExist(hookFile.path());
            let d = new Datastore({ filename: hookFile.path(), afterSerialization: as, beforeDeserialization: bd });
            await d.load();

            const doc = await d.insert({ hello: "world" });
            const _id = doc._id;
            await d.insert({ yo: "ya" });
            await d.update({ hello: "world" }, { $set: { hello: "earth" } }, {});
            await d.remove({ yo: "ya" }, {});
            await d.ensureIndex({ fieldName: "idefix" });

            const _data = await hookFile.contents();
            const data = _data.split("\n");
            expect(data).to.have.lengthOf(6);

            // Everything is deserialized correctly, including deletes and indexes
            d = new Datastore({ filename: hookFile.path(), afterSerialization: as, beforeDeserialization: bd });
            await d.load();

            const docs = await d.find({});
            expect(docs).to.have.lengthOf(1);
            expect(docs[0].hello).to.be.equal("earth");
            expect(docs[0]._id).to.be.equal(_id);
            expect(d.indexes.size).to.be.equal(2);
            expect(d.indexes.has("idefix")).to.be.true;
        });
    });

    describe("Prevent dataloss when persisting data", () => {

        it("Creating a datastore with in memory as true and a bad filename wont cause an error", () => {
            new Datastore({ filename: tmpdir.getVirtualFile("bad.db~").path(), inMemoryOnly: true });
        });

        it("Creating a persistent datastore with a bad filename will cause an error", () => {
            expect(() => {
                new Datastore({ filename: tmpdir.getVirtualFile("bad.db~").path() });
            }).to.throw();
        });

        it("If no file exists, ensureDatafileIntegrity creates an empty datafile", async () => {
            const file = tmpdir.getVirtualFile("it.db");
            const sfile = tmpdir.getVirtualFile("it.db~");
            const p = new Persistence({ db: { inMemoryOnly: false, filename: file.path() } });

            await file.unlink().catch(adone.noop);
            await sfile.unlink().catch(adone.noop);

            await storage.ensureDatafileIntegrity(p.filename);

            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.false;
            expect(await file.contents()).to.be.empty;
        });

        it("If only datafile exists, ensureDatafileIntegrity will use it", async () => {
            const file = tmpdir.getVirtualFile("it.db");
            const sfile = tmpdir.getVirtualFile("it.db~");
            const p = new Persistence({ db: { inMemoryOnly: false, filename: file.path() } });

            await file.unlink().catch(adone.noop);
            await sfile.unlink().catch(adone.noop);

            await file.write("something");

            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.false;

            await storage.ensureDatafileIntegrity(p.filename);

            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.false;

            expect(await file.contents()).to.be.equal("something");
        });

        it("If temp datafile exists and datafile doesnt, ensureDatafileIntegrity will use it (cannot happen except upon first use)", async () => {
            const file = tmpdir.getVirtualFile("it.db");
            const sfile = tmpdir.getVirtualFile("it.db~");
            const p = new Persistence({ db: { inMemoryOnly: false, filename: file.path() } });

            await file.unlink().catch(adone.noop);
            await sfile.unlink().catch(adone.noop);

            await sfile.write("something");

            expect(await file.exists()).to.be.false;
            expect(await sfile.exists()).to.be.true;

            await storage.ensureDatafileIntegrity(p.filename);

            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.false;

            expect(await file.contents()).to.be.equal("something");
        });

        // Technically it could also mean the write was successful but the rename wasn't, but there is in any case no guarantee that the data in the temp file is whole so we have to discard the whole file
        it("If both temp and current datafiles exist, ensureDatafileIntegrity will use the datafile, as it means that the write of the temp file failed", async () => {
            const file = tmpdir.getVirtualFile("it.db");
            const sfile = tmpdir.getVirtualFile("it.db~");
            const theDb = new Datastore({ filename: file.path() });

            await file.unlink().catch(adone.noop);
            await sfile.unlink().catch(adone.noop);


            await file.write("{\"_id\":\"0\",\"hello\":\"world\"}");
            await sfile.write("{\"_id\":\"0\",\"hello\":\"other\"}");

            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.true;

            await storage.ensureDatafileIntegrity(theDb.persistence.filename);

            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.true;

            expect(await file.contents()).to.be.equal("{\"_id\":\"0\",\"hello\":\"world\"}");

            await theDb.load();
            const docs = await theDb.find({});
            expect(docs).to.have.lengthOf(1);
            expect(docs[0].hello).to.be.equal("world");
            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.false;
        });

        it("persistCachedDatabase should update the contents of the datafile and leave a clean state", async () => {
            await d.insert({ hello: "world" });
            const docs = await d.find({});
            expect(docs).to.have.lengthOf(1);

            if (fs.existsSync(testDb)) {
                fs.unlinkSync(testDb);
            }
            if (fs.existsSync(`${testDb}~`)) {
                fs.unlinkSync(`${testDb}~`);
            }
            expect(fs.existsSync(testDb)).to.be.false;

            fs.writeFileSync(`${testDb}~`, "something", "utf8");
            expect(fs.existsSync(`${testDb}~`)).to.be.true;

            await d.persistence.persistCachedDatabase();

            const contents = fs.readFileSync(testDb, "utf8");
            expect(fs.existsSync(testDb)).to.be.true;
            expect(fs.existsSync(`${testDb}~`)).to.be.false;
            expect(contents).to.match(/^{"hello":"world","_id":"[0-9a-zA-Z]{16}"}\n$/);
        });

        it("After a persistCachedDatabase, there should be no temp or old filename", async () => {
            await d.insert({ hello: "world" });
            const docs = await d.find({});
            expect(docs).to.have.lengthOf(1);

            if (fs.existsSync(testDb)) {
                fs.unlinkSync(testDb);
            }
            if (fs.existsSync(`${testDb}~`)) {
                fs.unlinkSync(`${testDb}~`);
            }
            expect(fs.existsSync(testDb)).to.be.false;
            expect(fs.existsSync(`${testDb}~`)).to.be.false;

            fs.writeFileSync(`${testDb}~`, "bloup", "utf8");
            expect(fs.existsSync(`${testDb}~`)).to.be.true;

            await d.persistence.persistCachedDatabase();

            const contents = fs.readFileSync(testDb, "utf8");
            expect(fs.existsSync(testDb)).to.be.true;
            expect(fs.existsSync(`${testDb}~`)).to.be.false;
            expect(contents).to.match(/^{"hello":"world","_id":"[0-9a-zA-Z]{16}"}\n$/);
        });

        it("persistCachedDatabase should update the contents of the datafile and leave a clean state even if there is a temp datafile", async () => {
            await d.insert({ hello: "world" });
            const docs = await d.find({});

            expect(docs).to.have.lengthOf(1);

            if (fs.existsSync(testDb)) {
                fs.unlinkSync(testDb);
            }
            fs.writeFileSync(`${testDb}~`, "blabla", "utf8");

            expect(fs.existsSync(testDb)).to.be.false;
            expect(fs.existsSync(`${testDb}~`)).to.be.true;

            await d.persistence.persistCachedDatabase();

            const contents = fs.readFileSync(testDb, "utf8");
            expect(fs.existsSync(testDb)).to.be.true;
            expect(fs.existsSync(`${testDb}~`)).to.be.false;
            expect(contents).to.match(/^{"hello":"world","_id":"[0-9a-zA-Z]{16}"}\n$/);
        });

        it("persistCachedDatabase should update the contents of the datafile and leave a clean state even if there is a temp datafile", async () => {
            const file = tmpdir.getVirtualFile("test2.db");
            const sfile = tmpdir.getVirtualFile("test2.db~");

            await file.unlink().catch(adone.noop);
            await sfile.unlink().catch(adone.noop);

            const theDb = new Datastore({ filename: file.path() });

            await theDb.load();

            const contents = await file.contents();
            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.false;
            expect(contents).to.be.empty;
        });

        it("Persistence works as expected when everything goes fine", async () => {
            const file = tmpdir.getVirtualFile("test2.db");
            const sfile = tmpdir.getVirtualFile("test2.db~");

            await file.unlink().catch(adone.noop);
            await sfile.unlink().catch(adone.noop);

            const theDb = new Datastore({ filename: file.path() });

            await theDb.load();
            {
                const docs = await theDb.find({});
                expect(docs).to.be.empty;
            }

            const doc1 = await theDb.insert({ a: "hello" });
            const doc2 = await theDb.insert({ a: "world" });
            {
                const docs = await theDb.find({});
                expect(docs).to.have.lengthOf(2);
                expect(docs.find((item) => item._id === doc1._id).a).to.be.equal("hello");
                expect(docs.find((item) => item._id === doc2._id).a).to.be.equal("world");
            }
            await theDb.load();
            {
                // No change
                const docs = await theDb.find({});
                expect(docs).to.have.lengthOf(2);
                expect(docs.find((item) => item._id === doc1._id).a).to.be.equal("hello");
                expect(docs.find((item) => item._id === doc2._id).a).to.be.equal("world");
            }
            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.false;
            const theDb2 = new Datastore({ filename: file.path() });
            await theDb2.load();
            {
                // No change in second db
                const docs = await theDb2.find({});
                expect(docs).to.have.lengthOf(2);
                expect(docs.find((item) => item._id === doc1._id).a).to.be.equal("hello");
                expect(docs.find((item) => item._id === doc2._id).a).to.be.equal("world");
            }
            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.false;
        });

        // The child process will load the database with the given datafile, but the fs.writeFile function
        // is rewritten to crash the process before it finished (after 5000 bytes), to ensure data was not lost
        it.skip("If system crashes during a loadDatabase, the former version is not lost", async () => {
            const N = 500;
            const file = tmpdir.getVirtualFile("lac.db");
            const sfile = tmpdir.getVirtualFile("lac.db~");

            await file.unlink().catch(adone.noop);
            await sfile.unlink().catch(adone.noop);

            // Creating a db file with 150k records (a bit long to load)
            let toWrite = "";
            for (let i = 0; i < N; ++i) {
                toWrite += `${model.serialize({ _id: `anid_${i}`, hello: "world" })}\n`;
            }
            await file.write(toWrite);

            const datafileLength = (await file.contents()).length;

            // Loading it in a separate process that we will crash before finishing the loadDatabase
            const code = await new Promise((resolve) => {
                cp.fork(adone.std.path.join(__dirname, "load_and_crash"), [file.path()]).on("exit", resolve);
            });

            expect(code).to.be.equal(1); // See loadAndCrash.js
            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.true;
            expect((await file.contents()).length).to.be.equal(datafileLength);
            expect((await sfile.contents()).length).to.be.equal(5000);

            // Reload database without a crash, check that no data was lost and fs state is clean (no temp file)
            const db = new Datastore({ filename: file.path() });
            await db.load();
            expect(await file.exists()).to.be.true;
            expect(await sfile.exists()).to.be.false;
            expect((await file.contents()).length).to.be.equal(datafileLength);

            const docs = await db.find({});
            expect(docs).to.have.lengthOf(N);
            for (let i = 0; i < N; ++i) {
                const doc = docs.find((d) => d._id === `anid_${i}`);
                expect(doc).to.be.deep.equal({ hello: "world", _id: `anid_${i}` });
            }
        });
    });

    describe("ensureFileDoesntExist", () => {

        it("Doesnt do anything if file already doesnt exist", async () => {
            const file = tmpdir.getVirtualFile("nonexisting");
            await storage.ensureFileDoesntExist(file.path());
            expect(await file.exists()).to.be.false;
        });

        it("Deletes file if it exists", async () => {
            const file = await tmpdir.addFile("existing", {
                content: "hello world"
            });
            await storage.ensureFileDoesntExist(file.path());
            expect(await file.exists()).to.be.false;
        });
    });
});
