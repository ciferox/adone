describe("apm", function () {
    if (this.topology === "sharded") {
        return;
    }
    const { is, database: { mongo }, fs, util } = adone;
    const { range } = util;

    it("correctly receive the APM events for an insert", async () => {
        const started = [];
        const succeeded = [];
        let callbackTriggered = false;

        const listener = mongo.instrument(() => {
            callbackTriggered = true;
        });

        listener.on("started", (event) => {
            if (event.commandName === "insert") {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (event.commandName === "insert") {
                succeeded.push(event);
            }
        });

        const r = await this.db.collection("apm_test").insertOne({ a: 1 });

        expect(r.insertedCount).to.be.equal(1);
        expect(started).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("insert");
        expect(started[0].command.insert).to.be.equal("apm_test");
        expect(succeeded).to.have.lengthOf(1);
        expect(callbackTriggered).to.be.true;
        listener.uninstrument();
    });

    it("correctly handle cursor.close when no cursor existed", async () => {
        let callbackTriggered = false;

        const listener = mongo.instrument(() => {
            callbackTriggered = true;
        });

        const collection = this.db.collection("apm_test_cursor");

        const r = await collection.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);
        expect(r.insertedCount).to.be.equal(3);
        expect(callbackTriggered).to.be.true;

        const cursor = collection.find({});
        expect(await cursor.count()).to.be.equal(3);
        cursor.close();  // <-- Will cause error in APM module.
        listener.uninstrument();
    });

    if (this.topology === "replicaset") {
        it("correctly receive the APM events for a listCollections command", async () => {
            const started = [];

            const r = await this.db.collection("apm_test_list_collections").insertOne({ a: 1 });
            expect(r.insertedCount).to.be.equal(1);
            const listener = mongo.instrument(() => { });


            listener.on("started", (event) => {
                if (event.commandName === "listCollections" || event.commandName === "find") {
                    started.push(event);
                }
            });

            {
                const cols = await this.db
                    .listCollections({}, { readPreference: mongo.ReadPreference.PRIMARY })
                    .toArray();
                expect(cols).not.to.be.empty;
            }
            {
                const cols = await this.db
                    .listCollections({}, { readPreference: mongo.ReadPreference.SECONDARY })
                    .toArray();
                expect(cols).not.to.be.empty;
            }
            expect(started).to.have.lengthOf(2);
            expect(started[0].connectionId.prot).not.to.be.equal(started[1].connectionId.port);
            listener.uninstrument();
        });

        it("correctly receive the APM events for a listIndexes command", async () => {
            const started = [];
            const succeeded = [];

            const r = await this.db.collection("apm_test_list_collections").insertOne({ a: 1 });
            expect(r.insertedCount).to.be.equal(1);

            const listener = mongo.instrument(() => { });

            listener.on("started", (event) => {
                if (event.commandName === "listIndexes" || event.commandName === "find") {
                    started.push(event);
                }
            });

            listener.on("succeeded", (event) => {
                if (event.commandName === "listIndexes" || event.commandName === "find") {
                    succeeded.push(event);
                }
            });

            const collection = this.db.collection("apm_test_list_collections");

            await collection.listIndexes({ readPreference: mongo.ReadPreference.PRIMARY }).toArray();
            await collection.listIndexes({ readPreference: mongo.ReadPreference.SECONDARY }).toArray();

            expect(started).to.have.lengthOf(2);
            expect(started[0].connectionId.port).not.to.be.equal(started[1].connectionId.port);
            listener.uninstrument();
        });

        it("correctly receive the APM events for an insert using custom operationId and time generator", async () => {
            const started = [];
            const succeeded = [];
            let callbackTriggered = false;

            const listener = mongo.instrument({
                operationIdGenerator: {
                    next() {
                        return 10000;
                    }
                },
                timestampGenerator: {
                    current() {
                        return 1;
                    },
                    duration(start, end) {
                        return end - start;
                    }
                }
            }, () => {
                callbackTriggered = true;
            });

            listener.on("started", (event) => {
                if (event.commandName === "insert") {
                    started.push(event);
                }
            });

            listener.on("succeeded", (event) => {
                if (event.commandName === "insert") {
                    succeeded.push(event);
                }
            });

            await this.db.collection("apm_test_1").insertOne({ a: 1 });
            expect(started).to.have.lengthOf(1);
            expect(succeeded).to.have.lengthOf(1);
            expect(started[0].commandName).to.be.equal("insert");
            expect(started[0].command.insert).to.be.equal("apm_test_1");
            expect(started[0].operationId).to.be.equal(10000);
            expect(succeeded[0].duration).to.be.equal(0);
            expect(callbackTriggered).to.be.true;
            listener.uninstrument();
        });
    }

    describe("JSON APM Tests", () => {
        before(async function () {
            this.timeout(300000);
            await this.server.restart(true);
        });

        const validateExpecations = (expectation, results) => {
            if (expectation.command_started_event) {
                // Get the command
                const obj = expectation.command_started_event;
                // Unpack the expectation
                const command = obj.command;
                const databaseName = obj.database_name;
                const commandName = obj.command_name;

                // Get the result
                const result = results.starts.shift();

                // Validate the test
                expect(result.commandName).to.be.equal(commandName);
                expect(result.databaseName).to.be.equal(databaseName);

                // Do we have a getMore command or killCursor command
                if (commandName === "getMore") {
                    expect(result.command.getMore.isZero()).to.be.false;
                } else if (commandName === "killCursors") {
                    //
                } else {
                    expect(result.command).to.be.deep.equal(command);
                }
            } else if (expectation.command_succeeded_event) {
                const obj = expectation.command_succeeded_event;
                // Unpack the expectation
                const reply = obj.reply;
                // const databaseName = obj.database_name;
                const commandName = obj.command_name;

                // Get the result
                const result = results.successes.shift();

                // Validate the test
                expect(result.commandName).to.be.equal(commandName);
                // Do we have a getMore command
                if (commandName.toLowerCase() === "getmore" ||
                    commandName.toLowerCase() === "find") {
                    reply.cursor.id = result.reply.cursor.id;
                    expect(result.reply).to.be.deep.equal(reply);
                }
            } else if (expectation.command_failed_event) {
                const obj = expectation.command_failed_event;
                // Unpack the expectation
                // const reply = obj.reply;
                // const databaseName = obj.database_name;
                const commandName = obj.command_name;

                // Get the result
                const result = results.failures.shift();

                // Validate the test
                expect(result.commandName).to.be.equal(commandName);
            }
        };

        const executeOperation = async (client, listener, scenario, test) => {
            const successes = [];
            const failures = [];
            const starts = [];

            // Get the operation
            const operation = test.operation;
            // Get the command name
            const commandName = operation.name;
            // Get the arguments
            const args = operation.arguments || {};
            // Get the database instance
            const db = client.db(scenario.database_name);
            // Get the collection
            const collection = db.collection(scenario.collection_name);
            // Parameters
            const params = [];
            // Options
            let options = null;
            // Get the data
            const data = scenario.data;

            // Drop the collection
            await collection.drop().catch(() => { });
            // Insert the data
            const r = await collection.insertMany(data);
            expect(data.length).to.be.equal(r.insertedCount);

            // Set up the listeners
            listener.on("started", (event) => {
                starts.push(event);
            });

            listener.on("succeeded", (event) => {
                successes.push(event);
            });

            listener.on("failed", (event) => {
                failures.push(event);
            });

            // Cleanup the listeners
            const cleanUpListeners = function (_listener) {
                _listener.removeAllListeners("started");
                _listener.removeAllListeners("succeeded");
                _listener.removeAllListeners("failed");
            };

            // Unpack the operation
            if (args.filter) {
                params.push(args.filter);
            }

            if (args.deletes) {
                params.push(args.deletes);
            }

            if (args.document) {
                params.push(args.document);
            }

            if (args.documents) {
                params.push(args.documents);
            }

            if (args.update) {
                params.push(args.update);
            }

            if (args.requests) {
                params.push(args.requests);
            }

            if (args.writeConcern) {
                if (is.nil(options)) {
                    options = args.writeConcern;
                } else {
                    for (const name in args.writeConcern) {
                        options[name] = args.writeConcern[name];
                    }
                }
            }

            if (is.boolean(args.ordered)) {
                if (is.nil(options)) {
                    options = { ordered: args.ordered };
                } else {
                    options.ordered = args.ordered;
                }
            }

            if (is.boolean(args.upsert)) {
                if (is.nil(options)) {
                    options = { upsert: args.upsert };
                } else {
                    options.upsert = args.upsert;
                }
            }

            // Find command is special needs to executed using toArray
            if (operation.name === "find") {
                let cursor = collection[commandName]();

                // Set the options
                if (args.filter) {
                    cursor = cursor.filter(args.filter);
                }
                if (args.batchSize) {
                    cursor = cursor.batchSize(args.batchSize);
                }
                if (args.limit) {
                    cursor = cursor.limit(args.limit);
                }
                if (args.skip) {
                    cursor = cursor.skip(args.skip);
                }
                if (args.sort) {
                    cursor = cursor.sort(args.sort);
                }

                // Set any modifiers
                if (args.modifiers) {
                    for (const name in args.modifiers) {
                        cursor.addQueryModifier(name, args.modifiers[name]);
                    }
                }

                // Execute find
                await cursor.toArray().catch(() => { });
                test.expectations.forEach((x) => {
                    validateExpecations(x, {
                        successes, failures, starts
                    });
                });

                // Cleanup listeners
                cleanUpListeners(listener);
            } else {
                // Add options if they exists
                if (options) {
                    params.push(options);
                }
                await collection[commandName](...params).catch(() => { });
                test.expectations.forEach((x) => {
                    validateExpecations(x, {
                        successes, failures, starts
                    });
                });

                // Cleanup listeners
                cleanUpListeners(listener);
            }
        };

        const executeTests = async (client, listener, scenario, tests) => {
            for (const test of tests) {
                await executeOperation(client, listener, scenario, test);
            }
        };

        const scenarios = new fs.Directory(__dirname, "apm_cases").filesSync();

        for (const scenario of scenarios) {
            specify(scenario.stem(), async () => {
                const data = JSON.parse(await scenario.content());
                const listener = mongo.instrument(() => { });
                const client = await mongo.connect(this.url());
                await executeTests(client, listener, data, data.tests);
                listener.uninstrument();
                await client.close();
            });
        }
    });

    it("correctly receive the APM events for a find with getmore and killcursor", async () => {
        const started = [];
        const succeeded = [];
        const failed = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "find" || event.commandName === "getMore" || event.commandName === "killCursors") {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (event.commandName === "find" || event.commandName === "getMore" || event.commandName === "killCursors") {
                succeeded.push(event);
            }
        });

        listener.on("failed", (event) => {
            if (event.commandName === "find" || event.commandName === "getMore" || event.commandName === "killCursors") {
                failed.push(event);
            }
        });

        const collection = this.db.collection("apm_test_0");

        await collection.drop().catch(() => { });

        // Insert test documents
        const r = await collection.insertMany([
            { a: 1 },
            { a: 1 },
            { a: 1 },
            { a: 1 },
            { a: 1 },
            { a: 1 }
        ], { w: 1 });
        expect(r.insertedCount).to.be.equal(6);

        const docs = await collection.find({ a: 1 })
            .project({ _id: 1, a: 1 })
            .hint({ _id: 1 })
            .skip(1)
            .limit(100)
            .batchSize(2)
            .comment("some comment")
            .maxScan(1000)
            .maxTimeMS(5000)
            .setReadPreference(mongo.ReadPreference.PRIMARY)
            .addCursorFlag("noCursorTimeout", true)
            .toArray();

        expect(docs).to.have.lengthOf(5);
        expect(started).to.have.lengthOf(3);
        expect(succeeded).to.have.lengthOf(3);
        expect(failed).to.be.empty;

        expect(succeeded[0].reply).to.be.ok;

        expect(succeeded[0].operationId).to.be.equal(succeeded[1].operationId);
        expect(succeeded[0].operationId).to.be.equal(succeeded[2].operationId);
        expect(succeeded[1].reply).to.be.ok;
        expect(succeeded[2].reply).to.be.ok;

        // Started
        expect(started[0].operationId).to.be.equal(started[1].operationId);
        expect(started[0].operationId).to.be.equal(started[2].operationId);
        listener.uninstrument();
    });

    it("correctly receive the APM failure event for find", async () => {
        const started = [];
        const succeeded = [];
        const failed = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "find" || event.commandName === "getMore" || event.commandName === "killCursors") {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (event.commandName === "find" || event.commandName === "getMore" || event.commandName === "killCursors") {
                succeeded.push(event);
            }
        });

        listener.on("failed", (event) => {
            if (event.commandName === "find" || event.commandName === "getMore" || event.commandName === "killCursors") {
                failed.push(event);
            }
        });

        const collection = this.db.collection("apm_test_1");

        await collection.drop().catch(() => { });

        const r = await collection.insertMany([{ a: 1 }, { a: 1 }, { a: 1 }, { a: 1 }, { a: 1 }, { a: 1 }]);
        expect(r.insertedCount).to.be.equal(6);

        await assert.throws(async () => {
            await collection.find({ $illegalfield: 1 })
                .project({ _id: 1, a: 1 })
                .hint({ _id: 1 })
                .skip(1)
                .limit(100)
                .batchSize(2)
                .comment("some comment")
                .maxScan(1000)
                .maxTimeMS(5000)
                .setReadPreference(mongo.ReadPreference.PRIMARY)
                .addCursorFlag("noCursorTimeout", true)
                .toArray();
        }, "unknown top level operator: $illegalfield");
        expect(failed).to.have.lengthOf(1);
        listener.uninstrument();
    });

    it("correctly receive the APM events for a bulk operation", async () => {
        const started = [];
        const succeeded = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "insert" || event.commandName === "update" || event.commandName === "delete") {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (event.commandName === "insert" || event.commandName === "update" || event.commandName === "delete") {
                succeeded.push(event);
            }
        });

        await this.db.collection("apm_test_2").bulkWrite([
            { insertOne: { a: 1 } },
            { updateOne: { q: { a: 2 }, u: { $set: { a: 2 } }, upsert: true } },
            { deleteOne: { q: { c: 1 } } }
        ], { ordered: true });

        expect(started).to.have.lengthOf(3);
        expect(succeeded).to.have.lengthOf(3);
        expect(started[0].operationId).to.be.equal(started[1].operationId);
        expect(succeeded[0].operationId).to.be.equal(succeeded[1].operationId);
        expect(succeeded[0].operationId).to.be.equal(succeeded[2].operationId);

        listener.uninstrument();
    });

    it("correctly receive the APM explain command", async () => {
        const started = [];
        const succeeded = [];
        const failed = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (
                event.commandName === "find" ||
                event.commandName === "getMore" ||
                event.commandName === "killCursors" ||
                event.commandName === "explain"
            ) {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (
                event.commandName === "find" ||
                event.commandName === "getMore" ||
                event.commandName === "killCursors" ||
                event.commandName === "explain"
            ) {
                succeeded.push(event);
            }
        });

        listener.on("failed", (event) => {
            if (
                event.commandName === "find" ||
                event.commandName === "getMore" ||
                event.commandName === "killCursors" ||
                event.commandName === "explain"
            ) {
                failed.push(event);
            }
        });

        const collection = this.db.collection("apm_test_3");

        await collection.drop().catch(() => { });

        const r = await collection.insertMany([
            { a: 1 },
            { a: 1 },
            { a: 1 },
            { a: 1 },
            { a: 1 },
            { a: 1 }
        ], { w: 1 });

        expect(r.insertedCount).to.be.equal(6);

        expect(await collection.find({ a: 1 }).explain()).to.be.ok;

        expect(started).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("explain");
        expect(started[0].command.explain.find).to.be.equal("apm_test_3");
        expect(succeeded).to.have.lengthOf(1);
        expect(succeeded[0].commandName).to.be.equal("explain");

        expect(started[0].operationId).to.be.equal(succeeded[0].operationId);
        listener.uninstrument();
    });

    it("correctly filter out sensitive commands", async () => {
        const started = [];
        const succeeded = [];
        const failed = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "getnonce") {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (event.commandName === "getnonce") {
                succeeded.push(event);
            }
        });

        listener.on("failed", (event) => {
            if (event.commandName === "getnonce") {
                failed.push(event);
            }
        });

        expect(await this.db.command({ getnonce: true })).to.be.ok;
        expect(started).to.have.lengthOf(1);
        expect(succeeded).to.have.lengthOf(1);
        expect(failed).to.be.empty;
        expect(started[0].commandObj).to.be.deep.equal({ getnonce: true });
        expect(succeeded[0].reply).to.be.empty;
        listener.uninstrument();
    });

    it("correctly receive the APM events for an updateOne", async () => {
        const started = [];
        const succeeded = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "update") {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (event.commandName === "update") {
                succeeded.push(event);
            }
        });

        await this.db.collection("apm_test_u_1").updateOne({ a: 1 }, { $set: { b: 1 } }, { upsert: true });
        expect(started).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("update");
        expect(started[0].command.update).to.be.equal("apm_test_u_1");
        expect(succeeded).to.have.lengthOf(1);
        listener.uninstrument();
    });

    it("correctly receive the APM events for an updateMany", async () => {
        const started = [];
        const succeeded = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "update") {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (event.commandName === "update") {
                succeeded.push(event);
            }
        });

        await this.db.collection("apm_test_u_2").updateMany({ a: 1 }, { $set: { b: 1 } }, { upsert: true });
        expect(started).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("update");
        expect(started[0].command.update).to.be.equal("apm_test_u_2");
        expect(succeeded).to.have.lengthOf(1);
        listener.uninstrument();
    });

    it("correctly receive the APM events for deleteOne", async () => {
        const started = [];
        const succeeded = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "delete") {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (event.commandName === "delete") {
                succeeded.push(event);
            }
        });

        await this.db.collection("apm_test_u_3").deleteOne({ a: 1 });
        expect(started).to.have.lengthOf(1);
        expect(started[0].commandName).to.be.equal("delete");
        expect(started[0].command.delete).to.be.equal("apm_test_u_3");
        expect(succeeded).to.have.lengthOf(1);
        listener.uninstrument();
    });

    it.skip("ensure killcursor commands are sent on 3.0 or earlier when APM is enabled", async () => {
        //
    });

    it("correcly decorate the apm result for aggregation with cursorId", async () => {
        const started = [];
        const succeeded = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "aggregate" || event.commandName === "getMore") {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (event.commandName === "aggregate" || event.commandName === "getMore") {
                succeeded.push(event);
            }
        });

        // Generate docs
        const docs = [];
        for (let i = 0; i < 2500; i++) {
            docs.push({ a: i });
        }

        const collection = this.db.collection("apm_test_u_4");

        await collection.insertMany(range(2500).map((i) => ({ a: i })));

        await collection.aggregate([{ $match: {} }]).toArray();

        expect(started).to.have.lengthOf(3);
        expect(succeeded).to.have.lengthOf(3);
        const cursors = succeeded.map((x) => x.reply.cursor);

        expect(cursors[0].id).to.be.ok;
        expect(cursors[0].id.toString()).to.be.equal(cursors[1].id.toString());
        expect(cursors[2].id.toString()).to.be.equal("0");
        listener.uninstrument();
    });

    it("Correcly decorate the apm result for listCollections with cursorId", async () => {
        const started = [];
        const succeeded = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "listCollections") {
                started.push(event);
            }
        });

        listener.on("succeeded", (event) => {
            if (event.commandName === "listCollections") {
                succeeded.push(event);
            }
        });

        await Promise.all(range(20).map((i) => this.db.collection(`_mass_collection_${i}`).insertOne({ a: 1 })));
        await this.db.listCollections().batchSize(10).toArray();
        expect(started).to.have.lengthOf(1);
        expect(succeeded).to.have.lengthOf(1);
        const cursor = succeeded[0].reply.cursor;
        expect(cursor.id).to.be.ok;
        listener.uninstrument();
    });
});
