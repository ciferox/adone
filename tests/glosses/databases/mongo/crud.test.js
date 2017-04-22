import mongodbVersionManager from "mongodb-version-manager";
import { sharded, replicaset, single } from "./topology";

const { promise: { promisify } } = adone;

describe("glosses", "databases", "mongo", "CRUD", () => {
    before("mondodb check", async () => {
        const version = await promisify(mongodbVersionManager.current)();
        adone.info(`Running tests against MongoDB version ${version}`);
    });

    for (const topology of [
        "single",
        "sharded",
        "replicaset"
    ]) {
        describe(topology, () => {
            const context = { tmpdir: null, server: null, DB: null };
            let db = null;

            before("create tmpdir", async () => {
                context.tmpdir = await adone.fs.Directory.createTmp();
            });

            after("unlink tmpdir", async () => {
                await context.tmpdir.unlink();
            });

            switch (topology) {
                case "single": {
                    single(context);
                    break;
                }
                case "sharded": {
                    sharded(context);
                    break;
                }
                case "replicaset": {
                    replicaset(context);
                    break;
                }
            }

            beforeEach("open connection", async () => {
                db = await context.DB.open();
            });

            afterEach("close connection", async () => {
                if (db) {
                    await db.close();
                    db = null;
                }
            });

            for (const type of ["read", "write"]) {
                describe(type, () => {
                    const dirp = adone.std.path.resolve(__dirname, "crud_specs", type);
                    const files = adone.fs.readdirSync(dirp);
                    for (const file of files) {
                        const filep = adone.std.path.resolve(dirp, file);
                        const content = adone.fs.readFileSync(filep);
                        const spec = adone.data.yaml.safeLoad(content);
                        describe(adone.std.path.basename(file, ".yml"), () => {
                            for (const test of spec.tests) {
                                specify(test.description, async () => {
                                    const col = db.collection("crud_spec_tests");
                                    await col.drop().catch(() => { });
                                    if (test.outcome.collection && test.outcome.collection.name) {
                                        await db.collection(test.outcome.collection.name).drop().catch(() => { });
                                    }
                                    if (spec.data) {
                                        await col.insertMany(spec.data);
                                    }
                                    switch (test.operation.name) {
                                        case "aggregate": {
                                            const options = {};
                                            if (test.operation.arguments.collation) {
                                                options.collation = test.operation.arguments.collation;
                                            }

                                            const results = await col.aggregate(
                                                test.operation.arguments.pipeline, options
                                            )
                                                .toArray();

                                            if (test.outcome.collection) {
                                                const collectionResults = await db
                                                    .collection(test.outcome.collection.name)
                                                    .find({})
                                                    .toArray();
                                                expect(collectionResults).to.be.deep.equal(test.outcome.result);
                                            } else {
                                                expect(results).to.be.deep.equal(test.outcome.result);
                                            }
                                            break;
                                        }
                                        case "count": {
                                            const args = test.operation.arguments;
                                            const filter = args.filter;
                                            const options = Object.assign({}, args);
                                            delete options.filter;

                                            expect(await col.count(filter, options)).to.be.equal(test.outcome.result);
                                            break;
                                        }
                                        case "distinct": {
                                            const args = test.operation.arguments;
                                            const fieldName = args.fieldName;
                                            const options = Object.assign({}, args);
                                            const filter = args.filter || {};
                                            delete options.fieldName;
                                            delete options.filter;

                                            const result = await col.distinct(fieldName, filter, options);
                                            expect(result).to.be.deep.equal(test.outcome.result);
                                            break;
                                        }
                                        case "find": {
                                            const args = test.operation.arguments;
                                            const filter = args.filter;
                                            const options = Object.assign({}, args);
                                            delete options.filter;

                                            const results = await col.find(filter, options).toArray();
                                            expect(results).to.be.deep.equal(test.outcome.result);
                                            break;
                                        }
                                        case "deleteMany":
                                        case "deleteOne": {
                                            // Unpack the scenario test
                                            const args = test.operation.arguments;
                                            const filter = args.filter;
                                            const options = Object.assign({}, args);
                                            delete options.filter;

                                            // Get the results
                                            const result = await col[test.operation.name](filter, options);

                                            // Go over the results
                                            for (const name in test.outcome.result) {
                                                expect(result[name]).to.be.deep.equal(test.outcome.result[name]);
                                            }

                                            if (test.outcome.collection) {
                                                const results = await col.find({}).toArray();
                                                expect(results).to.be.deep.equal(test.outcome.collection.data);
                                            }
                                            break;
                                        }
                                        case "replaceOne": {
                                            // Unpack the scenario test
                                            const args = test.operation.arguments;
                                            const filter = args.filter;
                                            const replacement = args.replacement;
                                            const options = Object.assign({}, args);
                                            delete options.filter;
                                            delete options.replacement;

                                            // Get the results
                                            const result = await col[test.operation.name](filter, replacement, options);

                                            // Go over the results
                                            for (const name in test.outcome.result) {
                                                if (name == "upsertedId") {
                                                    expect(result[name]._id).to.be.deep.equal(test.outcome.result[name]);
                                                } else {
                                                    expect(result[name]).to.be.deep.equal(test.outcome.result[name]);
                                                }
                                            }

                                            if (test.outcome.collection) {
                                                const results = await col.find({}).toArray();
                                                expect(results).to.be.deep.equal(test.outcome.collection.data);
                                            }
                                            break;
                                        }
                                        case "updateOne":
                                        case "updateMany": {
                                            // Unpack the scenario test
                                            const args = test.operation.arguments;
                                            const filter = args.filter;
                                            const update = args.update;
                                            const options = Object.assign({}, args);
                                            delete options.filter;
                                            delete options.update;

                                            // Get the results
                                            const result = await col[test.operation.name](filter, update, options);

                                            // Go over the results
                                            for (const name in test.outcome.result) {
                                                if (name == "upsertedId") {
                                                    expect(result[name]._id).to.be.deep.equal(test.outcome.result[name]);
                                                } else {
                                                    expect(result[name]).to.be.deep.equal(test.outcome.result[name]);
                                                }
                                            }

                                            if (test.outcome.collection) {
                                                const results = await col.find({}).toArray();
                                                expect(results).to.be.deep.equal(test.outcome.collection.data);
                                            }
                                            break;
                                        }
                                        case "findOneAndReplace":
                                        case "findOneAndUpdate":
                                        case "findOneAndDelete": {
                                            // Unpack the scenario test
                                            const args = test.operation.arguments;
                                            const filter = args.filter;
                                            const second = args.update || args.replacement;
                                            const options = Object.assign({}, args);
                                            if (options.returnDocument) {
                                                options.returnOriginal = options.returnDocument == "After" ? false : true;
                                            }

                                            delete options.filter;
                                            delete options.update;
                                            delete options.replacement;
                                            delete options.returnDocument;

                                            let result;
                                            if (test.operation.name == "findOneAndDelete") {
                                                result = await col[test.operation.name](filter, options);
                                            } else {
                                                result = await col[test.operation.name](filter, second, options);
                                            }

                                            if (test.outcome.result) {
                                                expect(result.value).to.be.deep.equal(test.outcome.result);
                                            }

                                            if (test.outcome.collection) {
                                                const results = await col.find({}).toArray();
                                                expect(results).to.be.deep.equal(test.outcome.collection.data);
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }
});
