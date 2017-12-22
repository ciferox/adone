describe("aggregation", function () {
    it("should correctly execute simple aggregation pipeline using array", async () => {
        const collection = this.db.collection("shouldCorrectlyExecuteSimpleAggregationPipelineUsingArray");
        await collection.insert([{
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
        }]);
        const result = await collection.aggregate([
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
        ]);
        expect(result).to.be.deep.equal([
            { _id: { tags: "good" }, authors: ["bob"] },
            { _id: { tags: "fun" }, authors: ["bob"] }
        ]);
    });

    it("should correctly execute simple aggregation pipeline using arguments", async () => {
        const collection = this.db.collection("shouldCorrectlyExecuteSimpleAggregationPipelineUsingArguments");
        await collection.insert([{
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
        // Execute aggregate, notice the pipeline is expressed as function call parameters
        // instead of an Array.
        const result = await collection.aggregate({
            $project: {
                author: 1,
                tags: 1
            }
        }, {
            $unwind: "$tags"
        }, {
            $group: {
                _id: { tags: "$tags" },
                authors: { $addToSet: "$author" }
            }
        });
        expect(result).to.be.deep.equal([
            { _id: { tags: "good" }, authors: ["bob"] },
            { _id: { tags: "fun" }, authors: ["bob"] }
        ]);
    });

    it.skip("should fail when executing simple aggregation pipeline using arguments using single object", async () => {
        //
    });

    it("should correctly return and iterate over all the cursor results", async () => {
        const collection = this.db.collection("shouldCorrectlyDoAggWithCursorGet");
        await collection.insert([{
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
        ], { cursor: true });

        expect(await cursor.toArray()).to.be.deep.equal([
            { _id: { tags: "good" }, authors: ["bob"] },
            { _id: { tags: "fun" }, authors: ["bob"] }
        ]);
    });

    it("should correctly return a cursor and call explain", async () => {
        const collection = this.db.collection("shouldCorrectlyDoAggWithCursorGet");
        await collection.insert([{
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

        // Execute aggregate, notice the pipeline is expressed as an Array
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
        ], {
            cursor: { batchSize: 100 }
        });

        const result = await cursor.explain();
        expect(result.stages).to.have.lengthOf(4);
    });

    it("should correctly return a cursor with batchSize 1 and call next", async () => {
        // Create a collection
        const collection = this.db.collection("shouldCorrectlyDoAggWithCursorGet");
        // Insert the docs
        collection.insert([{
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

        // Execute aggregate, notice the pipeline is expressed as an Array
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
        ], {
            cursor: { batchSize: 1 }
        });

        expect(await cursor.next()).to.be.deep.equal({ _id: { tags: "good" }, authors: ["bob"] });
        expect(await cursor.next()).to.be.deep.equal({ _id: { tags: "fun" }, authors: ["bob"] });
        expect(await cursor.next()).to.be.null();
        expect(cursor.isClosed()).to.be.true();
    });

    it("should correctly write the results out to a new collection", async () => {
        const collection = this.db.collection("shouldCorrectlyDoAggWithCursorGet");
        await collection.insert([{
            title: "this is my title", author: "bob", posted: new Date(),
            pageViews: 5, tags: ["fun", "good", "fun"], other: { foo: 5 },
            comments: [
                { author: "joe", text: "this is cool" }, { author: "sam", text: "this is bad" }
            ]
        }], { w: 1 });

        // Execute aggregate, notice the pipeline is expressed as an Array
        const results = await collection.aggregate([
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
        ], {
            out: "testingOutCollectionForAggregation"
        });
        expect(results).to.be.empty();
    });

    it("should correctly use allowDiskUse when performing an aggregation", async () => {
        const collection = this.db.collection("shouldCorrectlyDoAggWithCursorGet");
        await collection.insert([{
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

        // Execute aggregate, notice the pipeline is expressed as an Array
        const result = await collection.aggregate([
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
        ], {
            allowDiskUse: true
        });
        expect(result).to.be.deep.equal([
            { _id: { tags: "good" }, authors: ["bob"] },
            { _id: { tags: "fun" }, authors: ["bob"] }
        ]);
    });

    it("should perform a simple group aggregation", async () => {
        const collection = this.db.collection("shouldPerformSimpleGroupAggregation");
        const r = await collection.insert([{ a: 1 }, { a: 1 }, { a: 1 }]);
        expect(r.result.n).to.be.equal(3);
        const cursor = collection.aggregate([
            { $match: {} },
            {
                $group:
                { _id: "$a", total: { $sum: "$a" } }
            }
        ], { cursor: true });

        expect(await cursor.toArray()).to.be.deep.equal([{
            _id: 1,
            total: 3
        }]);
    });

    it("should correctly perform an aggregation using a collection name with dot in it", async () => {
        const collection = this.db.collection("te.st");
        const r = await collection.insert([{ a: 1 }, { a: 1 }, { a: 1 }]);
        expect(r.result.n).to.be.equal(3);
        const result = await collection.aggregate([
            { $project: { a: 1 } }
        ]);
        expect(result).to.be.have.lengthOf(3);
        let count = 0;
        await collection.aggregate([{ $project: { a: 1 } }], { cursor: { batchSize: 10000 } })
            .forEach(() => {
                ++count;
            });
        expect(count).to.be.equal(3);
    });

    it("ensure maxTimeMS is correctly passed down into command execution when using a cursor", async () => {
        const collection = this.db.collection("shouldCorrectlyDoAggWithCursorMaxTimeMSSet");
        await collection.insert([{
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
        const s = spy(this.db, "command");
        // Execute aggregate, notice the pipeline is expressed as an Array
        await collection.aggregate([
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
        ], {
            maxTimeMS: 1000
        });
        expect(s).to.have.been.calledOnce;
        expect(s.getCall(0).args[0]).to.include({ maxTimeMS: 1000 });
        s.restore();
    });

    it("should correctly handle ISODate date matches in aggregation framework", async () => {
        const date1 = new Date();
        date1.setHours(date1.getHours() - 1);
        const docs = [{
            a: date1, b: 1
        }, {
            a: new Date(), b: 2
        }];
        const collection = this.db.collection("shouldCorrectlyQueryUsingISODate");
        await collection.insertMany(docs, { w: 1 });

        const cursor = collection.aggregate([{
            $match: {
                a: new Date(date1.toISOString())
            }
        }], { cursor: true });


        expect(await cursor.next()).to.include({ b: 1 });
        expect(await cursor.next()).to.be.null();
    });

    it("should correctly exercise hasNext function on aggregation cursor", async () => {
        const collection = this.db.collection("shouldCorrectlyQueryUsingISODate3");
        await collection.insertMany([
            { a: 1 }, { b: 1 }
        ], { w: 1 });

        const cursor = collection.aggregate([{
            $match: {}
        }], { cursor: true });

        expect(await cursor.hasNext()).to.be.true();
        expect(await cursor.next()).to.include({ a: 1 });
    });
});
