describe("database", "local", "Cursor", () => {
    const { Datastore, Cursor } = adone.database.local;

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
        dbFile = await tmpdir.getVirtualFile("db.db");
        testDb = dbFile.path();
        d = new Datastore({ filename: testDb });
        expect(d.filename).to.be.equal(testDb);
        expect(d.inMemoryOnly).to.be.false;
        await d.load();
        expect(d.getAllData()).to.be.empty;
    });

    describe("Without sorting", () => {
        beforeEach(async () => {
            await d.insert({ age: 5 });
            await d.insert({ age: 57 });
            await d.insert({ age: 52 });
            await d.insert({ age: 23 });
            await d.insert({ age: 89 });
        });

        it("Without query, an empty query or a simple query and no skip or limit", async () => {
            {
                const cursor = new Cursor(d);
                const docs = await cursor.exec();
                expect(docs).to.have.lengthOf(5);
                expect(docs.find((doc) => doc.age === 5).age).to.be.equal(5);
                expect(docs.find((doc) => doc.age === 57).age).to.be.equal(57);
                expect(docs.find((doc) => doc.age === 52).age).to.be.equal(52);
                expect(docs.find((doc) => doc.age === 23).age).to.be.equal(23);
                expect(docs.find((doc) => doc.age === 89).age).to.be.equal(89);
            }
            {
                const cursor = new Cursor(d, {});
                const docs = await cursor.exec();
                expect(docs).to.have.lengthOf(5);
                expect(docs.find((doc) => doc.age === 5).age).to.be.equal(5);
                expect(docs.find((doc) => doc.age === 57).age).to.be.equal(57);
                expect(docs.find((doc) => doc.age === 52).age).to.be.equal(52);
                expect(docs.find((doc) => doc.age === 23).age).to.be.equal(23);
                expect(docs.find((doc) => doc.age === 89).age).to.be.equal(89);
            }
            {
                const cursor = new Cursor(d, { age: { $gt: 23 } });
                const docs = await cursor.exec();
                expect(docs).to.have.lengthOf(3);
                expect(docs.find((doc) => doc.age === 57).age).to.be.equal(57);
                expect(docs.find((doc) => doc.age === 52).age).to.be.equal(52);
                expect(docs.find((doc) => doc.age === 89).age).to.be.equal(89);
            }
        });

        it("With an empty collection", async () => {
            await d.remove({}, { multi: true });
            const cursor = new Cursor(d);
            const docs = await cursor.exec();
            expect(docs).to.be.empty;
        });

        it("With a limit", async () => {
            const cursor = new Cursor(d);
            cursor.limit(3);
            const docs = await cursor.exec();
            expect(docs).to.have.lengthOf(3);
            // No way to predict which results are returned of course ...
        });

        it("With a skip", async () => {
            const cursor = new Cursor(d);
            const docs = await cursor.skip(2).exec();
            expect(docs).to.have.lengthOf(3);
            // No way to predict which results are returned of course ...
        });

        it("With a limit and a skip and method chaining", async () => {
            const cursor = new Cursor(d);
            cursor.limit(4).skip(3);   // Only way to know that the right number of results was skipped is if limit + skip > number of results
            const docs = await cursor.exec();

            expect(docs).to.have.lengthOf(2);
            // No way to predict which results are returned of course ...
        });

    });

    describe("Sorting of the results", () => {
        beforeEach(async () => {
            // We don't know the order in which docs wil be inserted but we ensure correctness by testing both sort orders
            await d.insert({ age: 5 });
            await d.insert({ age: 57 });
            await d.insert({ age: 52 });
            await d.insert({ age: 23 });
            await d.insert({ age: 89 });
        });

        it("Using one sort", async () => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });
            {
                const docs = await cursor.exec();
                for (let i = 0; i < docs.length - 1; ++i) {
                    expect(docs[i].age).to.be.below(docs[i + 1].age);
                }
            }
            cursor.sort({ age: -1 });
            {
                const docs = await cursor.exec();
                for (let i = 0; i < docs.length - 1; ++i) {
                    expect(docs[i].age).to.be.above(docs[i + 1].age);
                }
            }
        });

        it("Sorting strings with custom string comparison function", async () => {
            const db = new Datastore({
                inMemoryOnly: true,
                compareStrings: (a, b) => a.length - b.length
            });

            await db.insert({ name: "alpha" });
            await db.insert({ name: "charlie" });
            await db.insert({ name: "zulu" });

            {
                const docs = await db.find({}, {}, { exec: false }).sort({ name: 1 }).exec();
                expect(docs.map((x) => x.name)).to.be.deep.equal(["zulu", "alpha", "charlie"]);
            }
            delete db.compareStrings;
            {
                const docs = await db.find({}, {}, { exec: false }).sort({ name: 1 }).exec();
                expect(docs.map((x) => x.name)).to.be.deep.equal(["alpha", "charlie", "zulu"]);
            }
        });

        it("With an empty collection", async () => {
            await d.remove({}, { multi: true });
            const cursor = new Cursor(d);
            cursor.sort({ age: 1 });
            const docs = await cursor.exec();
            expect(docs).to.be.empty;
        });

        it("Ability to chain sorting and exec", async () => {
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: 1 }).exec();
                for (let i = 0; i < docs.length - 1; ++i) {
                    expect(docs[i].age).to.be.below(docs[i + 1].age);
                }
            }
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: -1 }).exec();
                for (let i = 0; i < docs.length - 1; ++i) {
                    expect(docs[i].age).to.be.above(docs[i + 1].age);
                }
            }
        });

        it("Using limit and sort", async () => {
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: 1 }).limit(3).exec();

                expect(docs).to.have.lengthOf(3);
                expect(docs.map((x) => x.age)).to.be.deep.equal([5, 23, 52]);
            }
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: -1 }).limit(2).exec();

                expect(docs).to.have.lengthOf(2);
                expect(docs.map((x) => x.age)).to.be.deep.equal([89, 57]);
            }
        });

        it("Using a limit higher than total number of docs shouldnt cause an error", async () => {
            const cursor = new Cursor(d);
            const docs = await cursor.sort({ age: 1 }).limit(7).exec();
            expect(docs.map((x) => x.age)).to.be.deep.equal([5, 23, 52, 57, 89]);
        });

        it("Using limit and skip with sort", async () => {
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: 1 }).limit(1).skip(2).exec();
                expect(docs).to.have.lengthOf(1);
                expect(docs.map((x) => x.age)).to.be.deep.equal([52]);
            }
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: 1 }).limit(3).skip(2).exec();
                expect(docs).to.have.lengthOf(3);
                expect(docs.map((x) => x.age)).to.be.deep.equal([52, 57, 89]);
            }
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: 1 }).limit(2).skip(2).exec();
                expect(docs).to.have.lengthOf(2);
                expect(docs.map((x) => x.age)).to.be.deep.equal([52, 57]);
            }
        });

        it("Using too big a limit and a skip with sort", async () => {
            const cursor = new Cursor(d);
            const docs = await cursor.sort({ age: 1 }).limit(8).skip(2).exec();
            expect(docs).to.have.lengthOf(3);
        });

        it("Using too big a skip with sort should return no result", async () => {
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: 1 }).skip(5).exec();
                expect(docs).to.be.empty;
            }
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: 1 }).skip(7).exec();
                expect(docs).to.be.empty;
            }
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: 1 }).limit(3).skip(7).exec();
                expect(docs).to.be.empty;
            }
            {
                const cursor = new Cursor(d);
                const docs = await cursor.sort({ age: 1 }).limit(6).skip(7).exec();
                expect(docs).to.be.empty;
            }
        });

        it("Sorting strings", async () => {
            await d.remove({}, { multi: true });
            await d.insert({ name: "jako" });
            await d.insert({ name: "jakeb" });
            await d.insert({ name: "sue" });
            {
                const cursor = new Cursor(d, {});
                const docs = await cursor.sort({ name: 1 }).exec();
                expect(docs).to.have.lengthOf(3);
                expect(docs.map((x) => x.name)).to.be.deep.equal(["jakeb", "jako", "sue"]);
            }
            {
                const cursor = new Cursor(d, {});
                const docs = await cursor.sort({ name: -1 }).exec();
                expect(docs).to.have.lengthOf(3);
                expect(docs.map((x) => x.name)).to.be.deep.equal(["sue", "jako", "jakeb"]);
            }
        });

        it("Sorting nested fields with dates", async () => {
            await d.remove({}, { multi: true });
            const doc1 = await d.insert({ event: { recorded: new Date(400) } });
            const doc2 = await d.insert({ event: { recorded: new Date(60000) } });
            const doc3 = await d.insert({ event: { recorded: new Date(32) } });
            {
                const cursor = new Cursor(d, {});
                const docs = await cursor.sort({ "event.recorded": 1 }).exec();
                expect(docs).to.have.lengthOf(3);
                expect(docs.map((x) => x._id)).to.be.deep.equal([doc3._id, doc1._id, doc2._id]);
            }
            {
                const cursor = new Cursor(d, {});
                const docs = await cursor.sort({ "event.recorded": -1 }).exec();
                expect(docs).to.have.lengthOf(3);
                expect(docs.map((x) => x._id)).to.be.deep.equal([doc2._id, doc1._id, doc3._id]);
            }
        });

        it("Sorting when some fields are undefined", async () => {
            await d.remove({}, { multi: true });
            await d.insert({ name: "jako", other: 2 });
            await d.insert({ name: "jakeb", other: 3 });
            await d.insert({ name: "sue" });
            await d.insert({ name: "henry", other: 4 });
            {
                const cursor = new Cursor(d, {});
                const docs = await cursor.sort({ other: 1 }).exec();
                expect(docs).to.have.lengthOf(4);
                expect(docs.map((x) => [x.name, x.other])).to.be.deep.equal([
                    ["sue", undefined],
                    ["jako", 2],
                    ["jakeb", 3],
                    ["henry", 4]
                ]);
            }
            {
                const cursor = new Cursor(d, { name: { $in: ["suzy", "jakeb", "jako"] } });
                const docs = await cursor.sort({ other: -1 }).exec();
                expect(docs).to.have.lengthOf(2);
                expect(docs.map((x) => [x.name, x.other])).to.be.deep.equal([
                    ["jakeb", 3],
                    ["jako", 2]
                ]);
            }
        });

        it("Sorting when all fields are undefined", async () => {
            await d.remove({}, { multi: true });
            await d.insert({ name: "jako" });
            await d.insert({ name: "jakeb" });
            await d.insert({ name: "sue" });
            {
                const cursor = new Cursor(d, {});
                const docs = await cursor.sort({ other: 1 }).exec();
                expect(docs).to.have.lengthOf(3);
            }
            {
                const cursor = new Cursor(d, { name: { $in: ["sue", "jakeb", "jakob"] } });
                const docs = await cursor.sort({ other: -1 }).exec();
                expect(docs).to.have.lengthOf(2);
            }
        });

        it("Multiple consecutive sorts", async () => {
            await d.remove({}, { multi: true });
            await d.insert({ name: "jako", age: 43, nid: 1 });
            await d.insert({ name: "jakeb", age: 43, nid: 2 });
            await d.insert({ name: "sue", age: 12, nid: 3 });
            await d.insert({ name: "zoe", age: 23, nid: 4 });
            await d.insert({ name: "jako", age: 35, nid: 5 });
            {
                const cursor = new Cursor(d, {});
                const docs = await cursor.sort({ name: 1, age: -1 }).exec();
                expect(docs).to.have.lengthOf(5);
                expect(docs.map((x) => x.nid)).to.be.deep.equal([2, 1, 5, 3, 4]);
            }
            {
                const cursor = new Cursor(d, {});
                const docs = await cursor.sort({ name: 1, age: 1 }).exec();
                expect(docs).to.have.lengthOf(5);
                expect(docs.map((x) => x.nid)).to.be.deep.equal([2, 5, 1, 3, 4]);
            }
            {
                const cursor = new Cursor(d, {});
                const docs = await cursor.sort({ age: 1, name: -1 }).exec();
                expect(docs).to.have.lengthOf(5);
                expect(docs.map((x) => x.nid)).to.be.deep.equal([3, 4, 5, 1, 2]);
            }
        });

        it("Similar data, multiple consecutive sorts", async () => {
            await d.remove({}, { multi: true });
            const companies = ["acme", "milkman", "zoinks"];
            const entities = [];
            let id = 1;
            for (const company of companies) {
                for (let cost = 5; cost <= 100; cost += 5) {
                    entities.push({ company, cost, nid: id++ });
                }
            }
            await Promise.all(entities.map((x) => d.insert(x)));

            const cursor = new Cursor(d, {});
            const docs = await cursor.sort({ company: 1, cost: 1 }).exec();
            expect(docs).to.have.lengthOf(60);
            for (let i = 0; i < docs.length; ++i) {
                expect(docs[i].nid).to.be.equal(i + 1);
            }
        });

    });


    describe("Projections", () => {
        let doc1;
        let doc2;
        let doc3;
        let doc4;
        let doc0;

        beforeEach(async () => {
            // We don't know the order in which docs wil be inserted but we ensure correctness by testing both sort orders
            doc0 = await d.insert({ age: 5, name: "Jo", planet: "B", toys: { bebe: true, ballon: "much" } });
            doc1 = await d.insert({ age: 57, name: "Louis", planet: "R", toys: { ballon: "yeah", bebe: false } });
            doc2 = await d.insert({ age: 52, name: "Grafitti", planet: "C", toys: { bebe: "kind of" } });
            doc3 = await d.insert({ age: 23, name: "LM", planet: "S" });
            doc4 = await d.insert({ age: 89, planet: "Earth" });
        });

        it("Takes all results if no projection or empty object given", async () => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });   // For easier finding

            let docs = await cursor.exec();
            expect(docs).to.have.lengthOf(5);
            expect(docs).to.be.deep.equal([doc0, doc3, doc2, doc1, doc4]);

            cursor.projection({});

            docs = await cursor.exec();
            expect(docs).to.have.lengthOf(5);
            expect(docs).to.be.deep.equal([doc0, doc3, doc2, doc1, doc4]);
        });

        it("Can take only the expected fields", async () => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });   // For easier finding
            cursor.projection({ age: 1, name: 1 });

            let docs = await cursor.exec();
            expect(docs).to.have.lengthOf(5);
            expect(docs).to.be.deep.equal([
                { age: 5, name: "Jo", _id: doc0._id },
                { age: 23, name: "LM", _id: doc3._id },
                { age: 52, name: "Grafitti", _id: doc2._id },
                { age: 57, name: "Louis", _id: doc1._id },
                { age: 89, _id: doc4._id }  // No problems if one field to take doesn't exist
            ]);

            cursor.projection({ age: 1, name: 1, _id: 0 });

            docs = await cursor.exec();
            expect(docs).to.have.lengthOf(5);
            expect(docs).to.be.deep.equal([
                { age: 5, name: "Jo" },
                { age: 23, name: "LM" },
                { age: 52, name: "Grafitti" },
                { age: 57, name: "Louis" },
                { age: 89 }  // No problems if one field to take doesn't exist
            ]);
        });

        it("Can omit only the expected fields", async () => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });   // For easier finding
            cursor.projection({ age: 0, name: 0 });

            let docs = await cursor.exec();
            expect(docs).to.have.lengthOf(5);
            expect(docs).to.be.deep.equal([
                { planet: "B", _id: doc0._id, toys: { bebe: true, ballon: "much" } },
                { planet: "S", _id: doc3._id },
                { planet: "C", _id: doc2._id, toys: { bebe: "kind of" } },
                { planet: "R", _id: doc1._id, toys: { bebe: false, ballon: "yeah" } },
                { planet: "Earth", _id: doc4._id }
            ]);

            cursor.projection({ age: 0, name: 0, _id: 0 });

            docs = await cursor.exec();
            expect(docs).to.have.lengthOf(5);
            expect(docs).to.be.deep.equal([
                { planet: "B", toys: { bebe: true, ballon: "much" } },
                { planet: "S" },
                { planet: "C", toys: { bebe: "kind of" } },
                { planet: "R", toys: { bebe: false, ballon: "yeah" } },
                { planet: "Earth" }
            ]);
        });

        it("Cannot use both modes except for _id", async () => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });   // For easier finding
            cursor.projection({ age: 1, name: 0 });

            let err = null;
            try {
                await cursor.exec();
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.not.null;

            cursor.projection({ age: 1, _id: 0 });

            let docs = await cursor.exec();

            expect(docs).to.be.deep.equal([
                { age: 5 },
                { age: 23 },
                { age: 52 },
                { age: 57 },
                { age: 89 }
            ]);

            cursor.projection({ age: 0, toys: 0, planet: 0, _id: 1 });

            docs = await cursor.exec();
            expect(docs).to.be.deep.equal([
                { name: "Jo", _id: doc0._id },
                { name: "LM", _id: doc3._id },
                { name: "Grafitti", _id: doc2._id },
                { name: "Louis", _id: doc1._id },
                { _id: doc4._id }
            ]);
        });

        it("Projections on embedded documents - omit type", async () => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });   // For easier finding
            cursor.projection({ name: 0, planet: 0, "toys.bebe": 0, _id: 0 });

            const docs = await cursor.exec();
            expect(docs).to.be.deep.equal([
                { age: 5, toys: { ballon: "much" } },
                { age: 23 },
                { age: 52, toys: {} },
                { age: 57, toys: { ballon: "yeah" } },
                { age: 89 }
            ]);
        });

        it("Projections on embedded documents - pick type", async () => {
            const cursor = new Cursor(d, {});
            cursor.sort({ age: 1 });   // For easier finding
            cursor.projection({ name: 1, "toys.ballon": 1, _id: 0 });

            const docs = await cursor.exec();
            expect(docs).to.be.deep.equal([
                { name: "Jo", toys: { ballon: "much" } },
                { name: "LM" },
                { name: "Grafitti" },
                { name: "Louis", toys: { ballon: "yeah" } },
                {}
            ]);
        });
    });
});








