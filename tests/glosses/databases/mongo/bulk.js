describe("bulk", function () {
    const { is } = adone;

    it("should correctly handle ordered single batch api write command error", async () => {
        // Get the collection
        const collection = this.db.collection("batch_write_ordered_ops_1");

        // Add unique index on b field causing all updates to fail
        await collection.ensureIndex({ a: 1 }, { unique: true, sparse: false });

        // Initialize the Ordered Batch
        const batch = collection.initializeOrderedBulkOp();

        // Add some operations to be executed in order
        batch.insert({ b: 1, a: 1 });
        batch.find({ b: 2 }).upsert().updateOne({ $set: { a: 1 } });
        batch.insert({ b: 3, a: 2 });

        // Execute the operations
        const [err, result] = await new Promise((resolve) => batch.execute((err, res) => resolve([err, res])));
        expect(err).to.be.an("error");
        // Basic properties check
        expect(result.nInserted).to.be.equal(1);
        expect(result.hasWriteErrors()).to.be.true;
        expect(result.getWriteErrorCount()).to.be.equal(1);

        // Get the write error
        const error = result.getWriteErrorAt(0);
        expect(error.code).to.be.equal(11000);
        expect(error.errmsg).to.be.ok;

        // Get the operation that caused the error
        const op = error.getOperation();
        expect(op.q.b).to.be.equal(2);
        expect(op.u.$set.a).to.be.equal(1);
        expect(op.multi).to.be.false;
        expect(op.upsert).to.be.true;

        // Get the first error
        expect(result.getWriteErrorAt(1)).to.be.null;
    });

    it("should correctly handle ordered multiple batch api write command error", async () => {
        const collection = this.db.collection("batch_write_ordered_ops_2");

        // Add unique index on b field causing all updates to fail
        await collection.ensureIndex({ a: 1 }, { unique: true, sparse: false });
        // Initialize the Ordered Batch
        const batch = collection.initializeOrderedBulkOp();

        // Add some operations to be executed in order
        batch.insert({ b: 1, a: 1 });
        batch.find({ b: 2 }).upsert().updateOne({ $set: { a: 1 } });
        batch.find({ b: 3 }).upsert().updateOne({ $set: { a: 2 } });
        batch.find({ b: 2 }).upsert().updateOne({ $set: { a: 1 } });
        batch.insert({ b: 4, a: 3 });
        batch.insert({ b: 5, a: 1 });

        const [err, result] = await new Promise((resolve) => batch.execute((err, res) => resolve([err, res])));
        expect(err).to.be.an("error");
        expect(result.nInserted).to.be.equal(1);
        expect(result.hasWriteErrors()).to.be.true;
        expect(result.getWriteErrorCount()).to.be.equal(1);

        const error = result.getWriteErrorAt(0);
        expect(error.index).to.be.equal(1);
        expect(error.code).to.be.equal(11000);
        expect(error.errmsg).to.be.ok;
        expect(error.getOperation().q.b).to.be.equal(2);
        expect(error.getOperation().multi).to.be.false;
        expect(error.getOperation().upsert).to.be.true;
    });

    it("should fail due to ordered document being to big", async () => {
        const collection = this.db.collection("batch_write_ordered_ops_3");
        // Set up a giant string to blow through the max message size
        // >16MB
        const hugeString = "1234567890123456".repeat(1024 * 1100);

        // Set up the batch
        const batch = collection.initializeOrderedBulkOp();
        batch.insert({ b: 1, a: 1 });
        // Should fail on insert due to string being to big
        expect(() => {
            batch.insert({ string: hugeString });
        }).to.throw("document is larger than the maximum size 16777216");
    });

    it("should correctly split up ordered messages into more batches", async () => {
        const collection = this.db.collection("batch_write_ordered_ops_4");
        // Set up a giant string to blow through the max message size
        const hugeString = "1234567890123456".repeat(1024 * 256);

        // Insert the string a couple of times, should force split into multiple batches
        const batch = collection.initializeOrderedBulkOp();
        batch.insert({ a: 1, b: hugeString });
        batch.insert({ a: 2, b: hugeString });
        batch.insert({ a: 3, b: hugeString });
        batch.insert({ a: 4, b: hugeString });
        batch.insert({ a: 5, b: hugeString });
        batch.insert({ a: 6, b: hugeString });

        const result = await batch.execute();

        expect(result.nInserted).to.be.equal(6);
        expect(result.hasWriteErrors()).to.be.false;
    });

    it("should correctly fail ordered batch operation due to illegal operations using write commands", async () => {
        const collection = this.db.collection("batch_write_ordered_ops_5");

        await collection.ensureIndex({ b: 1 }, { unique: true, sparse: false });
        {
            const batch = collection.initializeOrderedBulkOp();

            // Add illegal insert operation
            batch.insert({ $set: { a: 1 } });

            await assert.throws(async () => {
                await batch.execute();
            });
        }
        {
            const batch = collection.initializeOrderedBulkOp();
            // Add illegal remove
            batch.find({ $set: { a: 1 } }).removeOne();
            await assert.throws(async () => {
                await batch.execute();
            });
        }
        {
            const batch = collection.initializeOrderedBulkOp();
            // Add illegal update
            batch.find({ a: { $set2: 1 } }).updateOne({ c: { $set: { a: 1 } } });
            await assert.throws(async () => {
                await batch.execute();
            });
        }
    });

    it("should correctly execute ordered batch of write operations with duplicate key errors on updates", async () => {
        const collection = this.db.collection("batch_write_ordered_ops_6");

        // Add unique index on b field causing all updates to fail
        await collection.ensureIndex({ b: 1 }, { unique: true, sparse: false });
        const batch = collection.initializeOrderedBulkOp();

        // Add some operations to be executed in order
        batch.insert({ a: 1 });
        batch.find({ a: 1 }).update({ $set: { b: 1 } });
        batch.insert({ b: 1 });

        const [err, result] = await new Promise((resolve) => batch.execute((err, res) => resolve([err, res])));
        expect(err).to.be.an("error");
        expect(result.nInserted).to.be.equal(1);
        expect(result.nMatched).to.be.equal(1);
        expect(result.nModified === 1 || is.nil(result.nModified)).to.be.true;
        expect(result.hasWriteErrors()).to.be.true;
        expect(result.getWriteErrorCount()).to.be.equal(1);

        // Individual error checking
        const error = result.getWriteErrorAt(0);
        expect(error.index).to.be.equal(2);
        expect(error.code).to.be.equal(11000);
        expect(error.errmsg).to.be.ok;
        expect(error.getOperation().b).to.be.equal(1);
    });

    it("should correctly execute ordered batch of write operations with upserts causing duplicate key errors on updates", async () => {
        const collection = this.db.collection("batch_write_ordered_ops_7");

        // Add unique index on b field causing all updates to fail
        await collection.ensureIndex({ b: 1 }, { unique: true, sparse: false });

        const batch = collection.initializeOrderedBulkOp();

        // Add some operations to be executed in order
        batch.insert({ a: 1 });
        batch.find({ a: 1 }).update({ $set: { b: 1 } });
        batch.find({ a: 2 }).upsert().update({ $set: { b: 2 } });
        batch.find({ a: 3 }).upsert().update({ $set: { b: 3 } });
        batch.insert({ b: 1 });

        const [err, result] = await new Promise((resolve) => batch.execute((err, res) => resolve([err, res])));
        expect(err).to.be.an("error");

        expect(result.nInserted).to.be.equal(1);
        expect(result.nUpserted).to.be.equal(2);
        expect(result.nMatched).to.be.equal(1);
        expect(result.nModified === 1 || is.nil(result.nModified)).to.be.true;
        expect(result.hasWriteErrors()).to.be.true;
        expect(result.getWriteErrorCount()).to.be.equal(1);

        // Individual error checking
        const error = result.getWriteErrorAt(0);
        expect(error.index).to.be.equal(4);
        expect(error.code).to.be.equal(11000);
        expect(error.errmsg).to.be.ok;
        expect(error.getOperation().b).to.be.equal(1);

        // Check for upserted values
        const ids = result.getUpsertedIds();
        expect(ids).to.have.lengthOf(2);
        expect(ids[0].index).to.be.equal(2);
        expect(ids[0]._id).to.be.ok;
        expect(ids[1].index).to.be.equal(3);
        expect(ids[1]._id).to.be.ok;
    });

    it("should correctly perform ordered upsert with custom _id", async () => {
        const collection = this.db.collection("batch_write_ordered_ops_8");
        const batch = collection.initializeOrderedBulkOp();

        // Add some operations to be executed in order
        batch.find({ _id: 2 }).upsert().updateOne({ $set: { b: 2 } });

        const result = await batch.execute();
        expect(result).to.include({
            nUpserted: 1,
            nInserted: 0,
            nMatched: 0,
            nRemoved: 0
        });
        expect(result.nModified === 0 || is.nil(result.nModified)).to.be.true;
        const upserts = result.getUpsertedIds();
        expect(upserts).to.have.lengthOf(1);
        expect(upserts[0]).to.include({
            index: 0,
            _id: 2
        });
    });

    it("should throw an error when no operations in ordered batch", async () => {
        const collection = this.db.collection("batch_write_ordered_ops_8");
        expect(() => {
            collection.initializeOrderedBulkOp().execute(() => { });
        }).to.throw("Invalid Operation, No operations in bulk");
    });

    it("should correctly execute ordered batch using w:0", async () => {
        const collection = this.db.collection("batch_write_ordered_ops_9");

        const bulk = collection.initializeOrderedBulkOp();
        for (let i = 0; i < 100; i++) {
            bulk.insert({ a: 1 });
        }

        bulk.find({ b: 1 }).upsert().update({ b: 1 });
        bulk.find({ c: 1 }).remove();

        const result = await bulk.execute({ w: 0 });
        expect(result).to.include({
            nUpserted: 0,
            nInserted: 0,
            nMatched: 0,
            nRemoved: 0
        });
        expect(result.nModified === 0 || is.nil(result.nModified)).to.be.true;
    });

    if (this.topology === "single" || this.topology === "replicaset") {
        it("should correctly handle single unordered batch API", async () => {
            const collection = this.db.collection("batch_write_unordered_ops_legacy_1");

            // Add unique index on b field causing all updates to fail
            await collection.ensureIndex({ a: 1 }, { unique: true, sparse: false });

            const batch = collection.initializeUnorderedBulkOp();

            // Add some operations to be executed in order
            batch.insert({ b: 1, a: 1 });
            batch.find({ b: 2 }).upsert().updateOne({ $set: { a: 1 } });
            batch.insert({ b: 3, a: 2 });

            const [err, result] = await new Promise((resolve) => batch.execute((err, result) => resolve([err, result])));
            expect(err).to.be.an("error");
            expect(result).to.include({
                nInserted: 2,
                nUpserted: 0,
                nMatched: 0
            });
            expect(result.nModified === 0 || is.nil(result.nModified)).to.be.true;
            expect(result.hasWriteErrors()).to.be.true;
            expect(result.getWriteErrorCount()).to.be.equal(1);

            const error = result.getWriteErrorAt(0);
            expect(error.code).to.be.equal(11000);
            expect(error.errmsg).to.be.ok;

            const op = error.getOperation();
            expect(op.q.b).to.be.equal(2);
            expect(op.u.$set.a).to.be.equal(1);
            expect(op.multi).to.be.false;
            expect(op.upsert).to.be.true;

            expect(result.getWriteErrorAt(1)).to.be.null;
        });

        it("should correctly handle multiple unordered batch API", async () => {
            const collection = this.db.collection("batch_write_unordered_ops_legacy_2");

            // Add unique index on b field causing all updates to fail
            await collection.ensureIndex({ a: 1 }, { unique: true, sparse: false });

            const batch = collection.initializeUnorderedBulkOp({ useLegacyOps: true });

            batch.insert({ b: 1, a: 1 });
            batch.find({ b: 2 }).upsert().updateOne({ $set: { a: 1 } });
            batch.find({ b: 3 }).upsert().updateOne({ $set: { a: 2 } });
            batch.find({ b: 2 }).upsert().updateOne({ $set: { a: 1 } });
            batch.insert({ b: 4, a: 3 });
            batch.insert({ b: 5, a: 1 });

            const [err, result] = await new Promise((resolve) => {
                batch.execute((err, result) => resolve([err, result]));
            });
            expect(err).to.be.an("error");
            expect(result.nInserted).to.be.equal(2);
            expect(result.hasWriteErrors()).to.be.true;
            expect(result.getWriteErrorCount()).to.be.equal(3);

            for (let i = 0; i < result.getWriteErrorCount(); ++i) {
                const error = result.getWriteErrorAt(i);
                expect(error.code).to.be.equal(11000);
                expect(error.errmsg).to.be.ok;
                switch (error.index) {
                    case 3:
                    case 1: {
                        expect(error.getOperation().q.b).to.be.equal(2);
                        expect(error.getOperation().u.$set.a).to.be.equal(1);
                        expect(error.getOperation()).to.include({
                            multi: false,
                            upsert: true
                        });
                        break;
                    }
                    case 5:
                    case 2: {
                        expect(error.getOperation()).to.include({
                            a: 1,
                            b: 5
                        });
                        break;
                    }
                    default: {
                        throw new Error(`Unexpected error index ${error.index}`);
                    }
                }
            }
        });

        it("should fail due to document being to big for unordered batch", async () => {
            const collection = this.db.collection("batch_write_unordered_ops_legacy_3");
            const hugeString = "1234567890123456".repeat(1024 * 1100);
            const batch = collection.initializeUnorderedBulkOp();
            batch.insert({ b: 1, a: 1 });
            expect(() => {
                batch.insert({ string: hugeString });
            }).to.throw("document is larger than the maximum size 16777216");
        });

        it("should correctly split up messages into more batches for unordered batches", async () => {
            const collection = this.db.collection("batch_write_unordered_ops_legacy_4");
            const hugeString = "1234567890123456".repeat(1024 * 256);
            // Insert the string a couple of times, should force split into multiple batches
            const batch = collection.initializeUnorderedBulkOp();
            batch.insert({ a: 1, b: hugeString });
            batch.insert({ a: 2, b: hugeString });
            batch.insert({ a: 3, b: hugeString });
            batch.insert({ a: 4, b: hugeString });
            batch.insert({ a: 5, b: hugeString });
            batch.insert({ a: 6, b: hugeString });

            const result = await batch.execute();
            expect(result.nInserted).to.be.equal(6);
            expect(result.hasWriteErrors()).to.be.false;
        });

        it("should correctly fail unordered batch operation due to illegal operations", async () => {
            const collection = this.db.collection("batch_write_unordered_ops_legacy_5");

            // Write concern
            const writeConcern = { w: 1 };
            writeConcern.unique = true;
            writeConcern.sparse = false;

            // Add unique index on b field causing all updates to fail
            await collection.ensureIndex({ b: 1 }, { w: 1, unique: true, sparse: false });

            {
                const batch = collection.initializeUnorderedBulkOp();
                // Add illegal insert operation
                batch.insert({ $set: { a: 1 } });
                await assert.throws(async () => {
                    await batch.execute();
                });
            }
            {
                const batch = collection.initializeUnorderedBulkOp();
                // Add illegal remove
                batch.find({ $set: { a: 1 } }).removeOne();
                await assert.throws(async () => {
                    await batch.execute();
                });
            }
            {
                const batch = collection.initializeUnorderedBulkOp();
                // Add illegal update
                batch.find({ $set: { a: 1 } }).updateOne({ c: { $set: { a: 1 } } });
                await assert.throws(async () => {
                    await batch.execute();
                });
            }
        });

        it("should correctly execute unordered batch with duplicate key errors on updates", async () => {
            const collection = this.db.collection("batch_write_unordered_ops_legacy_6");

            await collection.ensureIndex({ b: 1 }, { w: 1, unique: true, sparse: false });
            const batch = collection.initializeUnorderedBulkOp();

            batch.insert({ a: 1 });
            batch.find({ a: 1 }).update({ $set: { b: 1 } });
            batch.insert({ b: 1 });
            batch.insert({ b: 1 });
            batch.insert({ b: 1 });
            batch.insert({ b: 1 });

            const [err, result] = await new Promise((resolve) => batch.execute((err, result) => resolve([err, result])));
            expect(err).to.be.an("error");
            expect(result.nInserted).to.be.equal(2);
            expect(result.hasWriteErrors()).to.be.true;
            expect(result.getWriteErrorCount()).to.be.oneOf([3, 4]);

            const error = result.getWriteErrorAt(0);
            expect(error.code).to.be.oneOf([11000, 11001]);
            expect(error.errmsg).to.be.ok;
        });

        it("should correctly execute unordered batch of with upserts causing duplicate key errors on updates", async () => {
            const collection = this.db.collection("batch_write_unordered_ops_legacy_7");

            // Add unique index on b field causing all updates to fail
            await collection.ensureIndex({ b: 1 }, { unique: true, sparse: false });

            const batch = collection.initializeUnorderedBulkOp();

            batch.insert({ a: 1 });
            batch.find({ a: 1 }).update({ $set: { b: 1 } });
            batch.find({ a: 2 }).upsert().update({ $set: { b: 2 } });
            batch.find({ a: 3 }).upsert().update({ $set: { b: 3 } });
            batch.find({ a: 1 }).update({ $set: { b: 1 } });
            batch.insert({ b: 1 });

            const [err, result] = await new Promise((resolve) => batch.execute((err, result) => resolve([err, result])));
            expect(err).to.be.an("error");

            expect(result).to.include({
                nInserted: 2,
                nUpserted: 2,
                nRemoved: 0
            });
            expect(result.nModified === 0 || is.nil(result.nModified)).to.be.true;
            expect(result.hasWriteErrors()).to.be.true;
            expect(result.getWriteErrorCount()).to.be.equal(2);

            const error = result.getWriteErrorAt(0);
            expect(error.code).to.be.oneOf([11000, 11001]);
            expect(error.errmsg).to.be.ok;
            expect(error.getOperation().u.$set.b).to.be.equal(1);

            const ids = result.getUpsertedIds();
            expect(ids).to.have.lengthOf(2);
            expect(ids[0].index).to.be.equal(2);
            expect(ids[0]._id).to.be.ok;
            expect(ids[1].index).to.be.equal(3);
            expect(ids[1]._id).to.be.ok;
        });

        it("should correctly perform unordered upsert with custom _id", async () => {
            const collection = this.db.collection("batch_write_unordered_ops_legacy_8");
            const batch = collection.initializeUnorderedBulkOp();
            batch.find({ _id: 2 }).upsert().updateOne({ $set: { b: 2 } });
            const result = await batch.execute();
            expect(result).to.include({
                nUpserted: 1,
                nInserted: 0,
                nMatched: 0,
                nRemoved: 0
            });
            expect(result.nModified === 0 || is.nul(result.nModified)).to.be.ok;

            const upserts = result.getUpsertedIds();
            expect(upserts).to.have.lengthOf(1);
            expect(upserts[0]).to.include({
                index: 0,
                _id: 2
            });
        });

        it("should prohibit batch finds with no selector", async () => {
            const collection = this.db.collection("batch_write_unordered_ops_legacy_9");

            const unorderedBatch = collection.initializeUnorderedBulkOp();
            const orderedBatch = collection.initializeOrderedBulkOp();

            expect(() => {
                unorderedBatch.find();
            }).to.throw("Bulk find operation must specify a selector");

            expect(() => {
                orderedBatch.find();
            }).to.throw("Bulk find operation must specify a selector");
        });

        it("should throw an error when no operations in unordered batch", async () => {
            const collection = this.db.collection("batch_write_ordered_ops_8");
            expect(() => {
                collection.initializeUnorderedBulkOp().execute(() => { });
            }).to.throw("Invalid Operation, No operations in bulk");
        });

        it("should correctly execute unordered batch using w:0", async () => {
            const collection = this.db.collection("batch_write_ordered_ops_9");

            const bulk = collection.initializeUnorderedBulkOp();
            for (let i = 0; i < 100; i++) {
                bulk.insert({ a: 1 });
            }

            bulk.find({ b: 1 }).upsert().update({ b: 1 });
            bulk.find({ c: 1 }).remove();

            const result = await bulk.execute({ w: 0 });
            expect(result).to.include({
                nUpserted: 0,
                nInserted: 0,
                nMatched: 0,
                nRemoved: 0
            });
            expect(result.nModified === 0 || is.nil(result.nModified)).to.be.true;
            expect(result.hasWriteErrors()).to.be.false;
        });
    }

    if (this.topology === "single") {
        it("should fail with w:2 and wtimeout write concern due single mongod instance ordered", async () => {
            const collection = this.db.collection("batch_write_concerns_ops_1");
            const batch = collection.initializeOrderedBulkOp();
            // Add some operations to be executed in order
            batch.insert({ a: 1 });
            batch.insert({ a: 2 });

            const err = await assert.throws(async () => {
                await batch.execute({ w: 2, wtimeout: 1000 });
            });
            expect(err.code).to.be.ok;
            expect(err.errmsg).to.be.ok;
        });

        it("should correctly handle bulk operation split for ordered bulk operation", async () => {
            const docs = [];
            for (let i = 0; i < 5; i++) {
                docs.push({
                    s: new Array(6000000).join("x")
                });
            }

            const collection = this.db.collection("bigdocs_ordered");

            await collection.insertMany(docs);
            expect(await collection.count()).to.be.equal(5);
        });

        it("should fail with w:2 and wtimeout write concern due single mongod instance unordered", async () => {
            const collection = this.db.collection("batch_write_concerns_ops_1");
            const batch = collection.initializeUnorderedBulkOp();
            batch.insert({ a: 1 });
            batch.insert({ a: 2 });

            const err = await assert.throws(async () => {
                await batch.execute({ w: 2, wtimeout: 1000 });
            });
            expect(err.code).to.be.ok;
            expect(err.errmsg).to.be.ok;
        });

        it("should correctly return the number of operations in the bulk", async () => {
            const collecion = this.db.collection("batch_write_concerns_ops_1");
            {
                const batch = collecion.initializeOrderedBulkOp();
                batch.insert({ a: 1 });
                batch.find({}).upsert().update({ $set: { b: 1 } });
                expect(batch.length).to.be.equal(2);
            }
            {
                const batch = collecion.initializeUnorderedBulkOp();
                batch.insert({ a: 1 });
                batch.find({}).upsert().update({ $set: { b: 1 } });
                expect(batch.length).to.be.equal(2);
            }
        });

        it("should correctly split unordered bulk batch", async () => {
            const batchSize = 1000;
            const collection = this.db.collection("batch_write_unordered_split_test");
            const documents = [];
            {
                const operation = collection.initializeUnorderedBulkOp();
                for (let i = 0; i < 10000; i++) {
                    const document = { name: `bob${i}` };
                    documents.push(document);
                    operation.insert(document);
                }
                await operation.execute();
            }
            {
                const operation = collection.initializeUnorderedBulkOp();
                for (let i = 10000; i < 10200; i++) {
                    operation.insert({ name: `bob${i}` });
                }
                for (let i = 0; i < batchSize; i++) {
                    operation.find({ _id: documents[i]._id }).replaceOne({ name: `joe${i}` });
                }
                await operation.execute();
            }
        });

        it("should correctly split ordered bulk batch", async () => {
            const batchSize = 1000;
            const collection = this.db.collection("batch_write_ordered_split_test");
            const documents = [];
            {
                const operation = collection.initializeOrderedBulkOp();
                for (let i = 0; i < 10000; i++) {
                    const document = { name: `bob${i}` };
                    documents.push(document);
                    operation.insert(document);
                }
                await operation.execute();
            }
            {
                const operation = collection.initializeOrderedBulkOp();
                for (let i = 10000; i < 10200; i++) {
                    operation.insert({ name: `bob${i}` });
                }
                for (let i = 0; i < batchSize; i++) {
                    operation.find({ _id: documents[i]._id }).replaceOne({ name: `joe${i}` });
                }
                await operation.execute();
            }
        });

        it("should correctly handle bulk operation split for unordered bulk operation", async () => {
            const docs = [];
            for (let i = 0; i < 5; i++) {
                docs.push({
                    s: new Array(6000000).join("x")
                });
            }

            const collection = this.db.collection("bigdocs_unordered");

            await collection.insertMany(docs, { ordered: false });
            expect(await collection.count()).to.be.equal(5);
        });
    }
});
