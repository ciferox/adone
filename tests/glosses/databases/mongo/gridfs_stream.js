describe("gridfs stream", function () {
    const { is, database: { mongo }, std: { fs, crypto, path }, data: { bson }, stream } = adone;

    if (this.topology === "single") {
        it("should upload from file stream", async () => {
            const { db } = this;
            await db.dropDatabase();
            const bucket = new mongo.GridFSBucket(db);
            const readStream = fs.createReadStream(__filename);
            const uploadStream = bucket.openUploadStream("test.dat");
            const thisFile = fs.readFileSync(__filename);
            const id = uploadStream.id;
            await new Promise((resolve) => {
                readStream.pipe(uploadStream);
                uploadStream.once("finish", resolve);
            });
            const chunksColl = db.collection("fs.chunks");
            const chunksQuery = chunksColl.find({ files_id: id });
            {
                const docs = await chunksQuery.toArray();
                expect(docs).to.have.lengthOf(1);
                expect(docs[0].data.toString("hex")).to.be.equal(thisFile.toString("hex"));
            }
            const filesColl = db.collection("fs.files");
            const filesQuery = filesColl.find({ _id: id });
            {
                const docs = await filesQuery.toArray();
                expect(docs).to.have.lengthOf(1);
                const hash = crypto.createHash("md5");
                hash.update(thisFile);
                expect(docs[0].md5).to.be.equal(hash.digest("hex"));
            }
            {
                const indexes = await filesColl.listIndexes().toArray();
                expect(indexes).to.have.lengthOf(2);
                expect(indexes[1].name).to.be.equal("filename_1_uploadDate_1");
            }
            {
                const indexes = await chunksColl.listIndexes().toArray();
                expect(indexes).to.have.lengthOf(2);
                expect(indexes[1].name).to.be.equal("files_id_1_n_1");
            }
        });

        it("should upload from file stream with custom id", async () => {
            const { db } = this;
            await db.dropDatabase();
            const bucket = new mongo.GridFSBucket(db);
            const readStream = fs.createReadStream(__filename);
            const uploadStream = bucket.openUploadStreamWithId(1, "test.dat");
            const thisFile = fs.readFileSync(__filename);
            uploadStream.id = "my_file";
            await new Promise((resolve) => {
                readStream.pipe(uploadStream);
                uploadStream.once("finish", resolve);
            });
            const chunksColl = db.collection("fs.chunks");
            const chunksQuery = chunksColl.find({ files_id: "my_file" });
            {
                const docs = await chunksQuery.toArray();
                expect(docs).to.have.lengthOf(1);
                expect(docs[0].data.toString("hex")).to.be.equal(thisFile.toString("hex"));
            }
            const filesColl = db.collection("fs.files");
            const filesQuery = filesColl.find({ _id: "my_file" });
            {
                const docs = await filesQuery.toArray();
                expect(docs).to.have.lengthOf(1);
                const hash = crypto.createHash("md5");
                hash.update(thisFile);
                expect(docs[0].md5).to.be.equal(hash.digest("hex"));
            }
            {
                const indexes = await filesColl.listIndexes().toArray();
                expect(indexes).to.have.lengthOf(2);
                expect(indexes[1].name).to.be.equal("filename_1_uploadDate_1");
            }
            {
                const indexes = await chunksColl.listIndexes().toArray();
                expect(indexes).to.have.lengthOf(2);
                expect(indexes[1].name).to.be.equal("files_id_1_n_1");
            }
        });

        it("should download to upload stream", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "gridfsdownload" });
            const CHUNKS_COLL = "gridfsdownload.chunks";
            const FILES_COLL = "gridfsdownload.files";
            const readStream = fs.createReadStream(__filename);
            let uploadStream = bucket.openUploadStream("test.dat");
            const thisFile = fs.readFileSync(__filename);
            let id = uploadStream.id;
            await new Promise((resolve) => {
                uploadStream.once("finish", resolve);
                readStream.pipe(uploadStream);
            });
            const downloadStream = bucket.openDownloadStream(id);
            uploadStream = bucket.openUploadStream("test2.dat");
            id = uploadStream.id;
            await new Promise((resolve) => {
                uploadStream.once("finish", resolve);
                downloadStream.pipe(uploadStream);
            });
            {
                const chunksQuery = db.collection(CHUNKS_COLL).find({ files_id: id });
                const docs = await chunksQuery.toArray();
                expect(docs).to.have.lengthOf(1);
                expect(docs[0].data.toString("hex")).to.be.equal(thisFile.toString("hex"));
            }
            {
                const filesQuery = db.collection(FILES_COLL).find({ _id: id });
                const docs = await filesQuery.toArray();
                expect(docs).to.have.lengthOf(1);
                const hash = crypto.createHash("md5");
                hash.update(thisFile);
                expect(docs[0].md5).to.be.equal(hash.digest("hex"));
            }
        });

        it("should fail to locate gridfs stream", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "gridfsdownload" });
            const downloadStream = bucket.openDownloadStream(new bson.ObjectID());
            const err = await new Promise((resolve) => {
                downloadStream.on("data", () => {
                    //
                });

                downloadStream.on("error", (err) => {
                    resolve(err);
                });
            });
            expect(err).to.be.an("error");
            expect(err).to.have.property("code", "ENOENT");
        });

        it("open download stream by name", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "gridfsdownload" });
            const readStream = fs.createReadStream(__filename);
            const uploadStream = bucket.openUploadStream("test.dat");
            const thisFile = fs.readFileSync(__filename);
            await new Promise((resolve) => {
                uploadStream.once("finish", resolve);
                readStream.pipe(uploadStream);
            });
            const downloadStream = bucket.openDownloadStreamByName("test.dat");
            const data = await new Promise((resolve) => {
                const chunks = [];
                downloadStream.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                downloadStream.once("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            });
            expect(data.toString("hex")).to.be.equal(thisFile.toString("hex"));
        });

        it("start/end options for openDownloadStream", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, {
                bucketName: "gridfsdownload",
                chunkSizeBytes: 2
            });
            const readStream = fs.createReadStream(__filename);
            const uploadStream = bucket.openUploadStream("teststart.dat");
            const thisFile = fs.readFileSync(__filename);
            await new Promise((resolve) => {
                uploadStream.once("finish", resolve);
                readStream.pipe(uploadStream);
            });
            const downloadStream = bucket.openDownloadStreamByName("teststart.dat", { start: 1 }).end(6);
            const data = await new Promise((resolve) => {
                const chunks = [];
                downloadStream.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                downloadStream.once("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            });
            expect(data).to.have.lengthOf(5);
            expect(data).to.be.deep.equal(thisFile.slice(1, 6));
        });

        it("deleting a file", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "gridfsdownload" });
            const CHUNKS_COLL = "gridfsdownload.chunks";
            const FILES_COLL = "gridfsdownload.files";
            const readStream = fs.createReadStream(__filename);
            const uploadStream = bucket.openUploadStream("test.dat");
            const id = uploadStream.id;
            await new Promise((resolve) => {
                uploadStream.once("finish", resolve);
                readStream.pipe(uploadStream);
            });
            await bucket.delete(id);
            {
                const chunksQuery = db.collection(CHUNKS_COLL).find({ files_id: id });
                const docs = await chunksQuery.toArray();
                expect(docs).to.be.empty;
            }
            {
                const filesQuery = db.collection(FILES_COLL).find({ _id: id });
                const docs = await filesQuery.toArray();
                expect(docs).to.be.empty;

            }
        });

        it("aborting an upload", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "gridfsabort", chunkSizeBytes: 1 });
            const CHUNKS_COLL = "gridfsabort.chunks";
            const uploadStream = bucket.openUploadStream("test.dat");
            const id = uploadStream.id;
            const query = { files_id: id };
            await new Promise((resolve, reject) => {
                uploadStream.write("a", "utf8", (err) => {
                    err ? reject(err) : resolve();
                });
            });
            expect(await db.collection(CHUNKS_COLL).count(query)).to.be.equal(1);
            await uploadStream.abort();
            expect(await db.collection(CHUNKS_COLL).count(query)).to.be.equal(0);
            {
                await assert.throws(async () => {
                    await new Promise((resolve, reject) => {
                        uploadStream.write("b", "utf8", (err) => {
                            err ? reject(err) : resolve();
                        });
                    });
                }, Error, "this stream has been aborted");
            }
            {
                await assert.throws(async () => {
                    await new Promise((resolve, reject) => {
                        uploadStream.end("b", "utf8", (err) => {
                            err ? reject(err) : resolve();
                        });
                    });
                }, Error, "this stream has been aborted");
            }
            {
                await assert.throws(async () => {
                    await uploadStream.abort();
                }, Error, "Cannot call abort() on a stream twice");
            }
        });

        it("aborting a download stream", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "gridfsdestroy", chunkSizeBytes: 10 });
            const readStream = fs.createReadStream(__filename);
            const uploadStream = bucket.openUploadStream("test.dat");
            await new Promise((resolve) => {
                uploadStream.once("finish", resolve);
                readStream.pipe(uploadStream);
            });
            const id = uploadStream.id;
            const downloadStream = bucket.openDownloadStream(id);
            const done = {};
            await new Promise((resolve, reject) => {
                downloadStream.once("data", () => {
                    reject(new Error("got some data"));
                });
                downloadStream.on("error", () => {
                    reject(new Error("got an error"));
                });
                downloadStream.on("end", () => {
                    if (done.close) {
                        return resolve();
                    }
                    done.end = true;
                });
                downloadStream.on("close", () => {
                    if (done.end) {
                        return resolve();
                    }
                    done.close = true;
                });
                downloadStream.abort();
            });
            expect(downloadStream.s.cursor).to.be.null;
        });

        it("find()", async () => {
            const bucket = new mongo.GridFSBucket(this.db, { bucketName: "fs" });

            // We're only making sure this doesn't throw
            bucket.find({
                batchSize: 1,
                limit: 2,
                maxTimeMS: 3,
                noCursorTimeout: true,
                skip: 4,
                sort: { _id: 1 }
            });
        });

        it("drop example", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "gridfsdownload" });
            const CHUNKS_COLL = "gridfsdownload.chunks";
            const FILES_COLL = "gridfsdownload.files";
            const readStream = fs.createReadStream(__filename);
            const uploadStream = bucket.openUploadStream("test.dat");
            const id = uploadStream.id;
            await new Promise((resolve) => {
                uploadStream.once("finish", resolve);
                readStream.pipe(uploadStream);
            });
            await bucket.drop();
            {
                const chunksQuery = db.collection(CHUNKS_COLL).find({ files_id: id });
                const docs = await chunksQuery.toArray();
                expect(docs).to.be.empty;
            }
            {
                const filesQuery = db.collection(FILES_COLL).find({ _id: id });
                const docs = await filesQuery.toArray();
                expect(docs).to.be.empty;
            }
        });

        it("find example", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "gridfsdownload_2" });
            const readStream = fs.createReadStream(__filename);
            const uploadStream = bucket.openUploadStream("test.dat");
            await new Promise((resolve) => {
                uploadStream.once("finish", resolve);
                readStream.pipe(uploadStream);
            });
            const files = await bucket.find({}, { batchSize: 1 }).toArray();
            expect(files).to.have.lengthOf(1);
        });

        it("rename example", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "gridfsdownload_3" });
            const readStream = fs.createReadStream(__filename);
            const uploadStream = bucket.openUploadStream("test.dat");
            await new Promise((resolve) => {
                uploadStream.once("finish", resolve);
                readStream.pipe(uploadStream);
            });
            await bucket.rename(uploadStream.id, "renamed_it.dat");
        });

        it("download empty doc", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "fs" });

            const r = await db.collection("fs.files").insert({ length: 0 });
            expect(r.insertedIds).to.have.lengthOf(1);
            const [id] = r.insertedIds;
            const stream = bucket.openDownloadStream(id);
            await new Promise((resolve, reject) => {
                stream.on("error", (error) => {
                    reject(error);
                });

                stream.on("data", () => {
                    reject(new Error("got some data"));
                });

                stream.on("end", () => {
                    // As per spec, make sure we didn't actually fire a query
                    // because the document length is 0
                    resolve();
                });
            });
            expect(stream.s.cursor).to.be.null;
        });

        describe("spec", () => {
            describe("upload", () => {
                const testResultDoc = (test, specDoc, resDoc, result) => {
                    const specKeys = Object.keys(specDoc);
                    const resKeys = Object.keys(resDoc);

                    expect(resKeys.length).to.be.equal(specKeys.length);

                    for (let i = 0; i < specKeys.length; ++i) {
                        const key = specKeys[i];
                        expect(resKeys[i]).to.be.equal(specKeys[i]);
                        if (specDoc[key] === "*actual") {
                            expect(resDoc[key]).to.be.ok;
                        } else if (specDoc[key] === "*result") {
                            expect(result.toString()).to.be.equal(resDoc[key].toString());
                        } else if (specDoc[key].$hex) {
                            expect(resDoc[key]._bsontype).to.be.equal("Binary");
                            expect(specDoc[key].$hex).to.be.equal(resDoc[key].toString("hex"));
                        } else {
                            if (typeof specDoc[key] === "object") {
                                expect(resDoc[key]).to.be.deep.equal(specDoc[key]);
                            } else {
                                expect(resDoc[key]).to.be.equal(specDoc[key]);
                            }
                        }
                    }
                };

                const spec = JSON.parse(fs.readFileSync(path.resolve(__dirname, "gridfs_spec", "upload.json")));
                for (const test of spec.tests) {
                    it(test.description, async () => {
                        const { db } = this;
                        await db.dropDatabase();
                        const bucket = new mongo.GridFSBucket(db, { bucketName: "expected" });

                        const res = bucket.openUploadStream(test.act.arguments.filename, test.act.arguments.options);

                        await new Promise((resolve, reject) => {
                            res.once("error", reject);
                            res.once("finish", resolve);
                            res.end(Buffer.from(test.act.arguments.source.$hex, "hex"));
                        });

                        for (const data of test.assert.data) {
                            const collection = data.insert;
                            const docs = await db.collection(collection).find({}).toArray();
                            expect(data.documents.length).to.be.equal(docs.length);
                            for (let i = 0; i < docs.length; ++i) {
                                testResultDoc(test, data.documents[i], docs[i], res.id);
                            }
                        }
                    });
                }
            });

            describe("download", () => {
                const deserialize = (document) => {
                    if (document && is.object(document)) {
                        const doc = {};

                        for (const name in document) {
                            if (is.array(document[name])) {
                                // Create a new array
                                doc[name] = new Array(document[name].length);
                                // Process all the items
                                for (let i = 0; i < document[name].length; i++) {
                                    doc[name][i] = deserialize(document[name][i]);
                                }
                            } else if (document[name] && is.object(document[name])) {
                                if (!is.nil(document[name].$binary)) {
                                    const buffer = Buffer.from(document[name].$binary, "base64");
                                    const type = Buffer.from(document[name].$type, "hex")[0];
                                    doc[name] = new bson.Binary(buffer, type);
                                } else if (!is.nil(document[name].$code)) {
                                    const code = document[name].$code;
                                    const scope = document[name].$scope;
                                    doc[name] = new bson.Code(code, scope);
                                } else if (!is.nil(document[name].$date)) {
                                    if (is.string(document[name].$date)) {
                                        doc[name] = new Date(document[name].$date);
                                    } else if (is.object(document[name].$date) && document[name].$date.$numberLong) {
                                        const time = parseInt(document[name].$date.$numberLong, 10);
                                        const date = new Date();
                                        date.setTime(time);
                                        doc[name] = date;
                                    }
                                } else if (!is.undefined(document[name].$numberLong)) {
                                    doc[name] = bson.Long.fromString(document[name].$numberLong);
                                } else if (!is.undefined(document[name].$maxKey)) {
                                    doc[name] = new bson.MaxKey();
                                } else if (!is.undefined(document[name].$minKey)) {
                                    doc[name] = new bson.MinKey();
                                } else if (!is.undefined(document[name].$oid)) {
                                    doc[name] = new bson.ObjectID(Buffer.from(document[name].$oid, "hex"));
                                } else if (!is.undefined(document[name].$regex)) {
                                    doc[name] = new bson.BSONRegExp(document[name].$regex, document[name].$options);
                                } else if (!is.undefined(document[name].$timestamp)) {
                                    doc[name] = new bson.Timestamp(
                                        document[name].$timestamp.i,
                                        document[name].$timestamp.t
                                    );
                                } else if (!is.undefined(document[name].$numberDecimal)) {
                                    doc[name] = bson.Decimal128.fromString(document[name].$numberDecimal);
                                } else if (!is.undefined(document[name].$undefined)) {
                                    doc[name] = undefined;
                                } else {
                                    doc[name] = deserialize(document[name]);
                                }
                            } else {
                                doc[name] = document[name];
                            }
                        }

                        return doc;
                    }

                    return document;
                };

                const convert$hexToBuffer = (doc) => {
                    const keys = Object.keys(doc);
                    keys.forEach((key) => {
                        if (doc[key] && is.object(doc[key])) {
                            if (!is.nil(doc[key].$hex)) {
                                doc[key] = Buffer.from(doc[key].$hex, "hex");
                            } else {
                                convert$hexToBuffer(doc[key]);
                            }
                        }
                    });
                };

                const deflateTestDoc = (doc) => {
                    const ret = deserialize(doc);
                    convert$hexToBuffer(ret);
                    return ret;
                };

                const applyArrange = async (db, command) => {
                    // Don't count on commands being there since we need to test on 2.2 and 2.4
                    if (command.delete) {
                        if (command.deletes.length !== 1) {
                            throw new Error("can only arrange with 1 delete");
                        }
                        if (command.deletes[0].limit !== 1) {
                            throw new Error("can only arrange with delete limit 1");
                        }
                        await db.collection(command.delete).deleteOne(command.deletes[0].q);
                    } else if (command.insert) {
                        await db.collection(command.insert).insertMany(command.documents);
                    } else if (command.update) {
                        const bulk = [];
                        for (let i = 0; i < command.updates.length; ++i) {
                            bulk.push({
                                updateOne: {
                                    filter: command.updates[i].q,
                                    update: command.updates[i].u
                                }
                            });
                        }

                        await db.collection(command.update).bulkWrite(bulk);
                    } else {
                        throw new Error(`Command not recognized: ${require("util").inspect(command)}`);
                    }
                };

                const spec = JSON.parse(fs.readFileSync(path.resolve(__dirname, "gridfs_spec", "download.json")));
                for (const test of spec.tests) {
                    it(test.description, async () => {
                        const { db } = this;
                        await db.dropDatabase();
                        const BUCKET_NAME = "fs";

                        const _runTest = async () => {
                            const bucket = new mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
                            const download = bucket.openDownloadStream(new bson.ObjectID(test.act.arguments.id.$oid));
                            const ret = await new Promise((resolve, reject) => {
                                let res = Buffer.alloc(0);
                                download.on("data", (chunk) => {
                                    res = Buffer.concat([res, chunk]);
                                });

                                download.on("error", (error) => {
                                    if (!test.assert.error) {
                                        return reject(error);
                                    }
                                    resolve(error);
                                });

                                download.on("end", () => {
                                    resolve(res);
                                });
                            });
                            if (test.assert.error) {
                                expect(ret).to.be.an("error");
                                expect(ret.toString()).to.include(test.assert.error);
                            } else {
                                expect(ret).to.be.instanceOf(Buffer);
                                expect(ret.toString("hex")).to.be.equal(test.assert.result.$hex);
                            }
                        };

                        const keys = Object.keys(spec.data);
                        for (const collection of keys) {
                            const data = spec.data[collection].map(deflateTestDoc);
                            await db.collection(`${BUCKET_NAME}.${collection}`).insertMany(data);
                        }
                        if (test.arrange) {
                            expect(test.arrange.data).to.have.lengthOf(1);
                            await applyArrange(db, deflateTestDoc(test.arrange.data[0]));
                        }
                        await _runTest();
                    });
                }
            });
        });

        it("should correctly handle calling end function with only a callback", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, { bucketName: "gridfsabort", chunkSizeBytes: 1 });
            const CHUNKS_COLL = "gridfsabort.chunks";
            const uploadStream = bucket.openUploadStream("test.dat");
            const id = uploadStream.id;
            const query = { files_id: id };
            await new Promise((resolve, reject) => {
                uploadStream.write("a", "utf8", (err) => {
                    err ? reject(err) : resolve();
                });
            });
            expect(await db.collection(CHUNKS_COLL).count(query)).to.be.equal(1);
            await uploadStream.abort();
            expect(await db.collection(CHUNKS_COLL).count(query)).to.be.equal(0);
            await assert.throws(async () => {
                await new Promise((resolve, reject) => {
                    uploadStream.write("b", "utf8", (err) => {
                        err ? reject(err) : resolve();
                    });
                });
            }, Error, "this stream has been aborted");
            await assert.throws(async () => {
                await new Promise((resolve, reject) => {
                    uploadStream.end((err) => {
                        err ? reject(err) : resolve();
                    });
                });
            }, Error, "this stream has been aborted");
            await assert.throws(async () => {
                await uploadStream.abort();
            }, Error, "Cannot call abort() on a stream twice");
        });

        it("start/end options for openDownloadStream where start-end is < size of chunk", async () => {
            const { db } = this;
            const bucket = new mongo.GridFSBucket(db, {
                bucketName: "gridfsdownload",
                chunkSizeBytes: 20
            });
            const readStream = fs.createReadStream(__filename);
            const uploadStream = bucket.openUploadStream("teststart.dat");
            const thisFile = fs.readFileSync(__filename);
            await new Promise((resolve) => {
                uploadStream.once("finish", resolve);
                readStream.pipe(uploadStream);
            });
            const downloadStream = bucket.openDownloadStreamByName("teststart.dat", { start: 1 }).end(6);
            const data = await downloadStream.pipe(stream.concat());
            expect(data).to.be.deep.equal(thisFile.slice(1, 6));
        });
    }
});
