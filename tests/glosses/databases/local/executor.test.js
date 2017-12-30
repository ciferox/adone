describe("database", "local", "Executor", () => {
    const { database: { local: { Datastore } } } = adone;

    describe("With persistent database", () => {
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
            dbFile = await tmpdir.getFile("db.db");
            testDb = dbFile.path();
            d = new Datastore({ filename: testDb, timestampData: true });
            expect(d.filename).to.be.equal(testDb);
            expect(d.inMemoryOnly).to.be.false();
            await d.load();
            expect(d.getAllData()).to.be.empty();
        });

        it("Operations are executed in the right order", async () => {
            let docs = await d.find({});
            expect(docs).to.be.empty();

            await d.insert({ a: 1 });
            await d.update({ a: 1 }, { a: 2 }, {});

            docs = await d.find({});
            expect(docs[0].a).to.be.equal(2);

            await d.update({ a: 2 }, { a: 3 });

            docs = await d.find({});
            expect(docs[0].a).to.be.equal(3);
        });

        it("Works in the right order even if we dont wait for resolving", async () => {
            const [doc1, doc2] = await Promise.all([d.insert({ a: 1 }), d.insert({ a: 2 }, false)]);
            const docs = await d.find({});
            expect(docs).to.have.lengthOf(2);
            expect(doc1.createdAt.getTime()).to.be.at.most(doc2.createdAt.getTime());
        });

    });

    describe("With non persistent database", () => {
        let d;

        beforeEach(async () => {
            d = new Datastore({ inMemoryOnly: true, timestampData: true });
            expect(d.inMemoryOnly).to.be.true();

            await d.load();
            expect(d.getAllData()).to.be.empty();
        });

        it("Operations are executed in the right order", async () => {
            let docs = await d.find({});
            expect(docs).to.be.empty();

            await d.insert({ a: 1 });
            await d.update({ a: 1 }, { a: 2 }, {});

            docs = await d.find({});
            expect(docs[0].a).to.be.equal(2);

            await d.update({ a: 2 }, { a: 3 });

            docs = await d.find({});
            expect(docs[0].a).to.be.equal(3);
        });

        it("Works in the right order even if we dont wait for resolving", async () => {
            const [doc1, doc2] = await Promise.all([d.insert({ a: 1 }), d.insert({ a: 2 }, false)]);
            const docs = await d.find({});
            expect(docs).to.have.lengthOf(2);
            expect(doc1.createdAt.getTime()).to.be.at.most(doc2.createdAt.getTime());
        });
    });
});
