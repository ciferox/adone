describe("cursor stream", function () {
    const { util, data: { bson } } = adone;
    const { range } = util;

    it("should stream documents with pause and resume for fetching", async () => {
        const docs = range(3000).map((i) => ({ a: i }));
        const collection = await this.db.createCollection("test_streaming_function_with_limit_for_fetching2");
        while (docs.length > 0) {
            await collection.insert(docs.splice(0, 1000));
        }
        const stream = collection.find().stream();
        const data = [];
        await new Promise((resolve) => {
            stream.on("data", (item) => {
                data.push(item);
                stream.pause();
                setImmediate(() => {
                    stream.resume();
                });
            });
            stream.on("end", resolve);
        });

        expect(data).to.have.lengthOf(3000);
    });

    it("should stream 10k documents", async () => {
        const docs = range(10000).map((i) => ({ a: i, bin: new bson.Binary(Buffer.allocUnsafe(256)) }));
        const collection = await this.db.createCollection("test_streaming_function_with_limit_for_fetching_2");
        while (docs.length > 0) {
            await collection.insert(docs.splice(0, 1000));
        }
        const stream = collection.find().stream();
        const data = [];
        await new Promise((resolve) => {
            stream.on("data", (item) => {
                data.push(item);
                stream.pause();
                setImmediate(() => {
                    stream.resume();
                });
            });
            stream.on("end", resolve);
        });
        expect(data).to.have.lengthOf(10000);
    });

    it("should trigger massive amount of get mores", async () => {
        const docs = range(1000).map((i) => ({ a: i, bin: new bson.Binary(Buffer.allocUnsafe(256)) }));
        const collection = await this.db.createCollection("test_streaming_function_with_limit_for_fetching_3");
        await collection.insert(docs);
        let counter1 = 0;
        let counter2 = 0;
        const stream = collection.find().stream();
        await new Promise((resolve) => {
            stream.on("data", () => {
                ++counter1;
                stream.pause();
                stream.resume();
                ++counter2;
            });
            stream.on("end", resolve);
        });
        expect(counter1).to.be.equal(1000);
        expect(counter2).to.be.equal(1000);
    });

    it("should stream documents across getMore command and count correctly", async () => {
        const docs = range(2000).map((i) => ({ a: i, bin: new bson.Binary(Buffer.allocUnsafe(1024)) }));
        const collection = this.db.collection("test_streaming_function_with_limit_for_fetching");
        const updateCollection = this.db.collection("test_streaming_function_with_limit_for_fetching_update");
        while (docs.length > 0) {
            await collection.insert(docs.splice(0, 1000));
        }
        const cursor = collection.find();
        await new Promise((resolve) => {
            const stream = cursor.stream();
            stream.on("data", () => {
                stream.pause();
                updateCollection.update({ id: 1 }, { $inc: { count: 1 } }, { w: 1, upsert: true }).then(() => {
                    stream.resume();
                });
            });
            stream.on("end", resolve);
        });
        const doc = await updateCollection.findOne({ id: 1 });
        expect(doc.count).to.be.equal(2000);
    });

    it("should correctly error out stream", async () => {
        const cursor = this.db.collection("myCollection").find({
            timestamp: { $ltx: "1111" } // Error in query.
        }).stream();

        let error;

        await new Promise((resolve) => {
            cursor.on("error", (err) => {
                error = err;
            });
            cursor.on("end", resolve);
            cursor.resume();
        });
        expect(error).to.be.an("error");
    });

    it("should correctly stream cursor after stream", async () => {
        const docs = range(1000).map((i) => ({ a: i, field: "hello world" }));
        const collection = this.db.collection("cursor_sort_stream");
        await collection.insertMany(docs);
        const cursor = collection.find().project({ a: 1 }).sort({ a: -1 });
        const data = [];
        await new Promise((resolve) => {
            const stream = cursor.stream();
            stream.on("data", (item) => {
                data.push(item);
            });
            stream.on("end", () => {
                resolve();
            });
        });
        expect(data).to.have.lengthOf(1000);
        expect(data.map((x) => x.a)).to.be.deep.equal(docs.reverse().map((x) => x.a));
    });
});
