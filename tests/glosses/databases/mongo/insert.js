describe("insert", function () {
    const { data: { bson }, promise, is, database: { mongo }, util } = adone;
    const { range } = util;

    it("should correctly perform single insert", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyPerformSingleInsert");
        await collection.insert({ a: 1 });
        const item = await collection.findOne();
        expect(item).to.include({ a: 1 });
    });

    it("should correctly handle multiple document insert", async () => {
        const { db } = this;
        const collection = db.collection("test_multiple_insert");
        const r = await collection.insert([{ a: 1 }, { a: 2 }]);
        expect(r.result.n).to.be.equal(2);
        expect(r.ops).to.have.lengthOf(2);
        expect(r.insertedCount).to.be.equal(2);
        expect(r.insertedIds).to.have.lengthOf(2);
        expect(r.insertedIds[0]._bsontype).to.be.equal("ObjectId");
        expect(r.insertedIds[1]._bsontype).to.be.equal("ObjectId");
        expect(r.ops.map((x) => x._id._bsontype)).to.be.deep.equal(["ObjectId", "ObjectId"]);
        const docs = await collection.find().toArray();
        expect(docs).to.have.lengthOf(2);
        expect(docs.map((x) => x.a).sort()).to.be.deep.equal([1, 2]);
    });

    it("should correctly execute save insert update", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyExecuteSaveInsertUpdate");
        await collection.save({ email: "save" });
        await collection.insert({ email: "insert" });
        await collection.update({ email: "update" }, { email: "update" }, { upsert: true, w: 1 });
        const docs = await collection.find().toArray();
        expect(docs).to.have.lengthOf(3);
    });

    it("should correctly insert and retrieve large integrated array document", async () => {
        const { db } = this;
        const collection = db.collection("test_should_deserialize_large_integrated_array");
        const doc = {
            a: 0,
            b: ["tmp1", "tmp2", "tmp3", "tmp4", "tmp5", "tmp6", "tmp7", "tmp8", "tmp9", "tmp10", "tmp11", "tmp12", "tmp13", "tmp14", "tmp15", "tmp16"]
        };
        await collection.insert(doc);
        const result = await collection.findOne({ a: 0 });
        expect(result.a).to.be.equal(doc.a);
        expect(result.b).to.be.deep.equal(doc.b);
    });

    it("shouldCorrectlyInsertAndRetrieveDocumentWithAllTypes", async () => {
        const { db } = this;
        const collection = db.collection("test_all_serialization_types");

        const date = new Date();
        const oid = new bson.ObjectId();
        const string = "binstring";
        const bin = new bson.Binary();
        for (let index = 0; index < string.length; index++) {
            bin.put(string.charAt(index));
        }

        const motherOfAllDocuments = {
            string: "hello",
            array: [1, 2, 3],
            hash: { a: 1, b: 2 },
            date,
            oid,
            binary: bin,
            int: 42,
            float: 33.3333,
            regexp: /regexp/,
            boolean: true,
            long: date.getTime(),
            where: new bson.Code("this.a > i", { i: 1 }),
            dbref: new bson.DBRef("namespace", oid, "integration_tests_")
        };

        await collection.insert(motherOfAllDocuments);
        const doc = await collection.findOne();
        expect(doc.string).to.be.equal(motherOfAllDocuments.string);
        expect(doc.array).to.be.deep.equal(motherOfAllDocuments.array);
        expect(doc.hash.a).to.be.equal(motherOfAllDocuments.hash.a);
        expect(doc.hash.b).to.be.equal(motherOfAllDocuments.hash.b);
        expect(doc.long).to.be.equal(date.getTime());
        expect(doc.date.toString()).to.be.equal(date.toString());
        expect(doc.date.getTime()).to.be.equal(date.getTime());
        expect(doc.oid.toHexString()).to.be.equal(motherOfAllDocuments.oid.toHexString());
        expect(doc.binary.value()).to.be.equal(motherOfAllDocuments.binary.value());

        expect(doc.int).to.be.equal(motherOfAllDocuments.int);
        expect(doc.long).to.be.equal(motherOfAllDocuments.long);
        expect(doc.float).to.be.equal(motherOfAllDocuments.float);
        expect(doc.regexp.toString()).to.be.equal(motherOfAllDocuments.regexp.toString());
        expect(doc.boolean).to.be.equal(motherOfAllDocuments.boolean);
        expect(doc.where.code).to.be.equal(motherOfAllDocuments.where.code);
        expect(doc.where.scope.i).to.be.equal(motherOfAllDocuments.where.scope.i);

        expect(doc.dbref.namespace).to.be.equal(motherOfAllDocuments.dbref.namespace);
        expect(doc.dbref.oid.toHexString()).to.be.equal(motherOfAllDocuments.dbref.oid.toHexString());
        expect(doc.dbref.db).to.be.equal(motherOfAllDocuments.dbref.db);
    });

    it("should correctly insert and update document with new script context", async () => {
        const { db } = this;
        const users = db.collection("users");
        await users.remove();
        const newUser = { name: "Test Account", settings: {} };
        const { ops: [user] } = await users.insert(newUser);
        const scriptCode = "settings.block = []; settings.block.push('test');";
        const context = { settings: { thisOneWorks: "somestring" } };
        adone.std.vm.runInNewContext(scriptCode, context, "testScript");
        const updateCommand = { $set: context };
        await users.update({ _id: user._id }, updateCommand);
        const doc = await users.findOne({ _id: user._id });
        expect(doc.name).to.be.equal("Test Account");
        expect(doc.settings.thisOneWorks).to.be.equal("somestring");
        expect(doc.settings.block[0]).to.be.equal("test");
    });

    it("should correctly serialize document with all types in new context", async () => {
        const { db } = this;
        const collection = db.collection("test_all_serialization_types_new_context");

        const date = new Date();
        const scriptCode =
            "var string = 'binstring'\n" +
            "var bin = new mongo.Binary()\n" +
            "for(var index = 0; index < string.length; index++) {\n" +
            "  bin.put(string.charAt(index))\n" +
            "}\n" +
            "motherOfAllDocuments['string'] = 'hello';" +
            "motherOfAllDocuments['array'] = [1,2,3];" +
            "motherOfAllDocuments['hash'] = {'a':1, 'b':2};" +
            "motherOfAllDocuments['date'] = date;" +
            "motherOfAllDocuments['oid'] = new mongo.ObjectId();" +
            "motherOfAllDocuments['binary'] = bin;" +
            "motherOfAllDocuments['int'] = 42;" +
            "motherOfAllDocuments['float'] = 33.3333;" +
            "motherOfAllDocuments['regexp'] = /regexp/;" +
            "motherOfAllDocuments['boolean'] = true;" +
            "motherOfAllDocuments['long'] = motherOfAllDocuments['date'].getTime();" +
            "motherOfAllDocuments['where'] = new mongo.Code('this.a > i', {i:1});" +
            "motherOfAllDocuments['dbref'] = new mongo.DBRef('namespace', motherOfAllDocuments['oid'], 'integration_tests_');";

        const context = {
            motherOfAllDocuments: {},
            mongo: {
                ObjectId: bson.ObjectId,
                Binary: bson.Binary,
                Code: bson.Code,
                DBRef: bson.DBRef
            },
            date
        };

        adone.std.vm.runInNewContext(scriptCode, context, "testScript");
        const motherOfAllDocuments = context.motherOfAllDocuments;

        await collection.insert(context.motherOfAllDocuments);
        const doc = await collection.findOne();

        expect(doc.string).to.be.equal(motherOfAllDocuments.string);
        expect(doc.array).to.be.deep.equal(motherOfAllDocuments.array);
        expect(doc.hash.a).to.be.equal(motherOfAllDocuments.hash.a);
        expect(doc.hash.b).to.be.equal(motherOfAllDocuments.hash.b);
        expect(doc.long).to.be.equal(date.getTime());
        expect(doc.date.toString()).to.be.equal(date.toString());
        expect(doc.date.getTime()).to.be.equal(date.getTime());
        expect(doc.oid.toHexString()).to.be.equal(motherOfAllDocuments.oid.toHexString());
        expect(doc.binary.value()).to.be.equal(motherOfAllDocuments.binary.value());

        expect(doc.int).to.be.equal(motherOfAllDocuments.int);
        expect(doc.long).to.be.equal(motherOfAllDocuments.long);
        expect(doc.float).to.be.equal(motherOfAllDocuments.float);
        expect(doc.regexp.toString()).to.be.equal(motherOfAllDocuments.regexp.toString());
        expect(doc.boolean).to.be.equal(motherOfAllDocuments.boolean);
        expect(doc.where.code).to.be.equal(motherOfAllDocuments.where.code);
        expect(doc.where.scope.i).to.be.equal(motherOfAllDocuments.where.scope.i);

        expect(doc.dbref.namespace).to.be.equal(motherOfAllDocuments.dbref.namespace);
        expect(doc.dbref.oid.toHexString()).to.be.equal(motherOfAllDocuments.dbref.oid.toHexString());
        expect(doc.dbref.db).to.be.equal(motherOfAllDocuments.dbref.db);
    });

    it("should correctly do toJson for long value", async () => {
        const { db } = this;
        const collection = db.collection("test_to_json_for_long");
        await collection.insert([{ value: bson.Long.fromNumber(32222432) }]);
        const item = await collection.findOne({});
        expect(item.value).to.be.equal(32222432);
    });

    it.skip("should correctly insert and update with no callback", async () => {
        const { db } = this;
        const collection = db.collection("test_insert_and_update_no_callback");
        collection.insert({ i: 1 });
        collection.update({ i: 1 }, { $set: { i: 2 } });
        // Make sure we leave enough time for mongodb to record the data
        await promise.delay(500);
        const item = await collection.findOne();
        expect(item.i).to.be.equal(2);
    });

    it("should insert and query timestamp", async () => {
        const { db } = this;
        const collection = db.collection("test_insert_and_query_timestamp");

        await collection.insert({ i: bson.Timestamp.fromNumber(100), j: bson.Long.fromNumber(200) });
        const item = await collection.findOne({});
        expect(item.i._bsontype).to.be.equal("Timestamp");
        expect(item.i.toInt()).to.be.equal(100);
        expect(item.j).to.be.equal(200);
    });

    it("should correctly insert and query undefined", async () => {
        const { db } = this;
        const collection = db.collection("test_insert_and_query_undefined");

        await collection.insert({ i: undefined });
        const item = await collection.findOne();
        expect(item.i).to.be.null;
    });

    it("should not throw error if serializing function ordered", async () => {
        const { db } = this;
        const collection = db.collection("test_should_throw_error_if_serializing_function");
        const func = function () {
            return 1;
        };
        const result = await collection.insert({ i: 1, z: func }, { w: 1, serializeFunctions: true, ordered: true });
        const object = await collection.findOne({ _id: result.ops[0]._id });
        expect(object.z.code).to.be.equal(func.toString());
        expect(object.i).to.be.equal(1);
    });

    it("should not throw error if serializing function unordered", async () => {
        const { db } = this;
        const collection = db.collection("test_should_throw_error_if_serializing_function_1");
        const func = function () {
            return 1;
        };
        const result = await collection.insert({ i: 1, z: func }, { w: 1, serializeFunctions: true, ordered: false });
        const object = await collection.findOne({ _id: result.ops[0]._id });
        expect(object.z.code).to.be.equal(func.toString());
        expect(object.i).to.be.equal(1);
    });

    it("shouldCorrectlyInsertDocumentWithUUID", async () => {
        const { db } = this;
        const collection = db.collection("insert_doc_with_uuid");

        await collection.insert({ _id: "12345678123456781234567812345678", field: "1" });
        {
            const items = await collection.find({ _id: "12345678123456781234567812345678" }).toArray();
            expect(items[0]._id).to.be.equal("12345678123456781234567812345678");
            expect(items[0].field).to.be.equal("1");
        }
        const binaryUUID = new bson.Binary("00000078123456781234567812345678", bson.Binary.SUBTYPE_UUID);
        await collection.insert({ _id: binaryUUID, field: "2" });
        {
            const items = await collection.find({ _id: binaryUUID }).toArray();
            expect(items[0].field).to.be.equal("2");
        }
    });

    it("should correctly insert/update with db driver in strict node", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_insert_and_update_no_callback_strict", { strict: true });
        await collection.insert({ _id: "12345678123456781234567812345678", field: "1" });
        const r = await collection.update({ _id: "12345678123456781234567812345678" }, { $set: { field: 0 } });
        expect(r.result.n).to.be.equal(1);
    });

    it("shouldCorrectlyInsertDBRefWithDbNotDefined", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyInsertDBRefWithDbNotDefined");

        const doc = { _id: new bson.ObjectId() };
        const doc2 = { _id: new bson.ObjectId() };
        const doc3 = { _id: new bson.ObjectId() };

        await collection.insert(doc);
        doc2.ref = new bson.DBRef("shouldCorrectlyInsertDBRefWithDbNotDefined", doc._id);
        doc3.ref = new bson.DBRef("shouldCorrectlyInsertDBRefWithDbNotDefined", doc._id, this.database);
        await collection.insert([doc2, doc3]);
        const items = await collection.find().toArray();
        expect(items[1].ref.namespace).to.be.equal("shouldCorrectlyInsertDBRefWithDbNotDefined");
        expect(items[1].ref.oid.toString()).to.be.equal(doc._id.toString());
        expect(items[1].ref.db).to.be.undefined;

        expect(items[2].ref.namespace).to.be.equal("shouldCorrectlyInsertDBRefWithDbNotDefined");
        expect(items[2].ref.oid.toString()).to.be.equal(doc._id.toString());
        expect(items[2].ref.db).to.be.equal(this.database);
    });

    it("should correctly insert update remove with no o ptions", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyInsertUpdateRemoveWithNoOptions");

        await collection.insert({ a: 1 });
        await collection.update({ a: 1 }, { a: 2 });
        await collection.remove({ a: 2 });
        expect(await collection.count()).to.be.equal(0);
    });

    it("should correctly execute multiple fetches", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyExecuteMultipleFetches");
        await collection.insert({ addresses: { localPart: "ralph" } });
        const to = "ralph";
        const doc = await collection.findOne({ "addresses.localPart": to });
        expect(doc.addresses.localPart).to.be.equal(to);
    });

    it("should correctly fail when no object to update", async () => {
        // ?
        const { db } = this;
        const collection = db.collection("shouldCorrectlyFailWhenNoObjectToUpdate");

        const result = await collection.update({ _id: new bson.ObjectId() }, { email: "update" });
        expect(result.result.n).to.be.equal(0);
    });

    const ISODate = function (string) {
        if (is.function(string.getTime)) {
            return string;
        }
        const match = string.match(/^(\d{4})(-(\d{2})(-(\d{2})(T(\d{2}):(\d{2})(:(\d{2})(\.(\d+))?)?(Z|((\+|-)(\d{2}):(\d{2}))))?)?)?$/);
        if (!match) {
            throw new Error("Invalid ISO 8601 date given.");
        }
        const date = new Date();
        date.setUTCFullYear(Number(match[1]));
        date.setUTCMonth(Number(match[3]) - 1 || 0);
        date.setUTCDate(Number(match[5]) || 0);
        date.setUTCHours(Number(match[7]) || 0);
        date.setUTCMinutes(Number(match[8]) || 0);
        date.setUTCSeconds(Number(match[10]) || 0);
        date.setUTCMilliseconds(Number(`.${match[12]}`) * 1000 || 0);

        if (match[13] && match[13] !== "Z") {
            let h = Number(match[16]) || 0;
            let m = Number(match[17]) || 0;

            h *= 3600000;
            m *= 60000;

            let offset = h + m;
            if (match[15] === "+") {
                offset = -offset;
            }

            new Date(date.valueOf() + offset);
        }

        return date;
    };

    it("should correctly insert object and retrieve it when containing array and iso date", async () => {
        const { db } = this;
        const doc = {
            _id: new bson.ObjectId("4e886e687ff7ef5e00000162"),
            str: "foreign",
            type: 2,
            timestamp: new Date("2011-10-02T14:00:08.383Z"),
            links: [
                "http://www.reddit.com/r/worldnews/comments/kybm0/uk_home_secretary_calls_for_the_scrapping_of_the/"
            ]
        };

        const collection = db.collection("Should_correctly_insert_object_and_retrieve_it_when_containing_array_and_IsoDate");
        await collection.insert(doc);
        const item = await collection.findOne();
        expect(item).to.be.deep.equal(doc);
    });

    it("should correctly insert object with timestamps", async () => {
        const { db } = this;
        const doc = {
            _id: new bson.ObjectId("4e886e687ff7ef5e00000162"),
            str: "foreign",
            type: 2,
            timestamp: new bson.Timestamp(10000),
            links: [
                "http://www.reddit.com/r/worldnews/comments/kybm0/uk_home_secretary_calls_for_the_scrapping_of_the/"
            ],
            timestamp2: new bson.Timestamp(33333)
        };
        const collection = db.collection("Should_correctly_insert_object_with_timestamps");
        await collection.insert(doc);
        const item = await collection.findOne();
        expect(item).to.be.deep.equal(doc);
    });

    it("should fail on insert due to key starting with $", async () => {
        const { db } = this;
        const doc = {
            _id: new bson.ObjectId("4e886e687ff7ef5e00000162"),
            $key: "foreign"
        };
        const collection = db.collection("Should_fail_on_insert_due_to_key_starting_with");
        await assert.throws(async () => {
            await collection.insert(doc);
        }, "key $key must not start with '$'");
    });

    it("should Correctly allow for control of serialization of functions on command level", async () => {
        const { db } = this;
        const doc = {
            str: "String",
            func() { }
        };
        const collection = db.collection("Should_Correctly_allow_for_control_of_serialization_of_functions_on_command_level");
        await collection.insert(doc);
        {
            const r = await collection.update({ str: "String" }, {
                $set: { c: 1, d() { } }
            }, { w: 1, serializeFunctions: false });
            expect(r.result.n).to.be.equal(1);
        }
        const item = await collection.findOne({ str: "String" });
        expect(item).not.to.have.property("d");
        {
            const r = await collection.findAndModify({ str: "String" }, [["a", 1]], {
                $set: { f() { } }
            }, { new: true, safe: true, serializeFunctions: true });
            expect(r.value.f._bsontype).to.be.equal("Code");
        }
    });

    it("should correctly allow for control of serialization of functions on collection level", async () => {
        const { db } = this;
        const doc = {
            str: "String",
            func() { }
        };

        const collection = db.collection("Should_Correctly_allow_for_control_of_serialization_of_functions_on_collection_level", {
            serializeFunctions: true
        });
        await collection.insert(doc);
        const item = await collection.findOne({ str: "String" });
        expect(item.func._bsontype).to.be.equal("Code");
    });

    it("should Correctly allow for using a Date object as _id", async () => {
        const { db } = this;
        const doc = {
            _id: new Date(),
            str: "hello"
        };

        const collection = db.collection("Should_Correctly_allow_for_using_a_Date_object_as__id");
        await collection.insert(doc);
        const item = await collection.findOne({ str: "hello" });
        expect(item._id).to.be.instanceOf(Date);
    });

    it("should correctly fail to update returning 0 results", async () => {
        const { db } = this;
        const collection = db.collection("Should_Correctly_fail_to_update_returning_0_results");
        const r = await collection.update({ a: 1 }, { $set: { a: 1 } });
        expect(r.result.n).to.be.equal(0);
    });

    it("should Correctly update two fields including a sub field", async () => {
        const { db } = this;
        const doc = {
            _id: new bson.ObjectId(),
            Prop1: "p1",
            Prop2: "p2",
            More: {
                Sub1: "s1",
                Sub2: "s2",
                Sub3: "s3"
            }
        };
        const collection = db.collection("Should_Correctly_update_two_fields_including_a_sub_field");
        await collection.insert(doc);
        const r = await collection.update({ _id: doc._id }, { $set: { Prop1: "p1_2", "More.Sub2": "s2_2" } });
        expect(r.result.n).to.be.equal(1);
        const item = await collection.findOne({ _id: doc._id });
        expect(item.Prop1).to.be.equal("p1_2");
        expect(item.More.Sub2).to.be.equal("s2_2");
    });

    it("should correctly fail due to duplicate key for _id", async () => {
        const { db } = this;
        const collection = db.collection("Should_Correctly_update_two_fields_including_a_sub_field_2");
        await collection.insert({ _id: 1 });
        await assert.throws(async () => {
            await collection.insert({ _id: 1 });
        }, "duplicate key");
    });

    it("should correctly insert doc with custom id", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyInsertDocWithCustomId");
        await collection.insert({ _id: 0, test: "hello" });
        const item = await collection.findOne({ _id: 0 });
        expect(item._id).to.be.equal(0);
        expect(item.test).to.be.equal("hello");
    });

    it("should correctly perform upsert against new document and existing one", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyPerformUpsertAgainstNewDocumentAndExistingOne");
        {
            const result = await collection.update({ a: 1 }, { a: 1 }, { upsert: true, w: 1, fullResult: true });
            // expect(result.result).not.to.have.property("updatedExisting");
            expect(result.result.n).to.be.equal(1);
            expect(result.result.upserted).to.be.ok;
        }
        {
            const result = await collection.update({ a: 1 }, { a: 1 }, { upsert: true, w: 1, fullResult: true });
            expect(result.result.n).to.be.equal(1);
            expect(result.result.nModified).to.be.equal(1);
        }
    });

    it("shouldCorrectlyPerformLargeTextInsert", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyPerformLargeTextInsert");
        const string = "a".repeat(50000);
        await collection.insert({ a: 1, string });
        const doc = await collection.findOne({ a: 1 });
        expect(doc.string).to.have.lengthOf(50000);
    });

    it("should correctly perform insert of objects using toBSON", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyPerformInsertOfObjectsUsingToBSON");
        const doc = { a: 1, b: 1 };
        doc.toBSON = function () {
            return { c: this.a };
        };
        await collection.insert(doc);
        {
            const doc = await collection.findOne({ c: 1 });
            expect(doc.c).to.be.equal(1);
        }
    });

    it("should attemp to force bson size", async () => {
        const { db } = this;
        const collection = await db.createCollection("shouldAttempToForceBsonSize");
        const doc = [
            { a: 1, b: new bson.Binary(Buffer.allocUnsafe(16777216 / 3)) },
            { a: 1, b: new bson.Binary(Buffer.allocUnsafe(16777216 / 3)) },
            { a: 1, b: new bson.Binary(Buffer.allocUnsafe(16777216 / 3)) }
        ];

        await collection.insert(doc);
        {
            const doc = await collection.findOne({ a: 1 });
            expect(doc.a).to.be.equal(1);
        }
    });

    it("should correctly use custom object to update document", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyUseCustomObjectToUpdateDocument");

        await collection.insert({ a: { b: { c: 1 } } });
        const query = {};
        query.a = {};
        query.a.b = {};
        query.a.b.c = 1;
        const r = await collection.update(query, { $set: { "a.b.d": 1 } });
        expect(r.result.n).to.be.equal(1);
    });

    it.skip("should execute insert with no callback and write concern", async () => {
        const { db } = this;
        const collection = db.collection("shouldExecuteInsertWithNoCallbackAndWriteConcern");
        collection.insert({ a: { b: { c: 1 } } });
    });

    it.skip("executes callback once with overidden default db write concern", async () => {
        //
    });

    it.skip("executes callback once with overidden default db write concern with update", async () => {
        //
    });

    it.skip("executes callback once with overidden default db write concern with remove", async () => {
        //
    });

    it("handle BSON type inserts correctly", async () => {
        const { db } = this;
        const collection = db.collection("bson_types_insert");

        const doc = {
            symbol: new bson.Symbol("abcdefghijkl"),
            objid: new bson.ObjectId("abcdefghijkl"),
            double: new bson.Double(1),
            binary: new bson.Binary(Buffer.from("hello world")),
            minkey: new bson.MinKey(),
            maxkey: new bson.MaxKey(),
            code: new bson.Code("function () {}", { a: 55 })
        };

        await collection.insert(doc);
        {
            const doc = await collection.findOne({ symbol: new bson.Symbol("abcdefghijkl") });
            expect(doc.symbol.toString(), "abcdefghijkl");
        }
        {
            const doc = await collection.findOne({ objid: new bson.ObjectId("abcdefghijkl") });
            expect(doc.objid.toString()).to.be.equal("6162636465666768696a6b6c");
        }
        {
            const doc = await collection.findOne({ double: new bson.Double(1) });
            expect(doc.double).to.be.equal(1);
        }
        {
            const doc = await collection.findOne({ binary: new bson.Binary(Buffer.from("hello world")) });
            expect(doc.binary.toString()).to.be.equal("hello world");
        }
        {
            const doc = await collection.findOne({ minkey: new bson.MinKey() });
            expect(doc.minkey._bsontype).to.be.equal("MinKey");
        }
        {
            const doc = await collection.findOne({ maxkey: new bson.MaxKey() });
            expect(doc.maxkey._bsontype).to.be.equal("MaxKey");
        }
        {
            const doc = await collection.findOne({ code: new bson.Code("function () {}", { a: 55 }) });
            expect(doc).to.be.ok;
        }
    });

    it("mixed timestamp and date query", async () => {
        const { db } = this;
        const collection = db.collection("timestamp_date");
        const d = new Date();
        const documents = [
            { x: new bson.Timestamp(1, 2) },
            { x: d }
        ];
        await collection.insert(documents);
        {
            const doc = await collection.findOne({ x: new bson.Timestamp(1, 2) });
            expect(doc).to.be.ok;
        }
        {
            const doc = await collection.findOne({ x: d });
            expect(doc).to.be.ok;
        }
    });

    it("positive and negative infinity", async () => {
        const { db } = this;
        const collection = db.collection("negative_pos");
        const document = {
            pos: Number.POSITIVE_INFINITY,
            neg: Number.NEGATIVE_INFINITY
        };
        await collection.insert(document);
        const doc = await collection.findOne({});
        expect(doc.pos).to.be.equal(Number.POSITIVE_INFINITY);
        expect(doc.neg).to.be.equal(Number.NEGATIVE_INFINITY);
    });

    it("should correctly insert simple regexp document", async () => {
        const { db } = this;
        const regexp = /foobar/i;
        const collection = await db.createCollection("test_regex");
        await collection.insert({ b: regexp });
        const items = await collection.find({}, { fields: ["b"] }).toArray();
        expect(String(items[0].b)).to.be.deep.equal(String(regexp));
    });

    it("should correctly insert simple UTF8 regexp", async () => {
        const { db } = this;
        const regexp = /foobaré/;
        const collection = db.collection("shouldCorrectlyInsertSimpleUTF8Regexp");
        await collection.insert({ b: regexp });
        const items = await collection.find({}, { fields: ["b"] }).toArray();
        expect(String(items[0].b)).to.be.equal(String(regexp));
    });

    it("shouldCorrectlyThrowDueToIllegalCollectionName", async () => {
        const { db } = this;
        const k = Buffer.alloc(15);
        k.write("hello");
        k[6] = 0x06;
        k.write("world", 10);
        expect(() => {
            db.collection(k.toString());
        }).to.throw("collection names cannot contain a null character");
    });

    it("should correctly honor promote long false", async () => {
        const db = await mongo.connect(this.url(), { promoteLongs: false });
        await db.collection("shouldCorrectlyHonorPromoteLong").insert({
            doc: bson.Long.fromNumber(10),
            array: [[bson.Long.fromNumber(10)]]
        });
        const doc = await db.collection("shouldCorrectlyHonorPromoteLong").findOne();
        expect(doc.doc._bsontype).to.be.equal("Long");
        expect(doc.array[0][0]._bsontype).to.be.equal("Long");
        await db.close();
    });

    it("should correctly honor promote long false BSON with get more", async () => {
        const db = await mongo.connect(this.url(), { promoteLongs: false });
        const collection = db.collection("shouldCorrectlyHonorPromoteLongFalseNativeBSONWithGetMore");
        await collection.insertMany(range(25).map(() => ({ a: bson.Long.fromNumber(10) })));
        const docs = await collection.find({}).batchSize(2).toArray();
        for (const doc of docs) {
            expect(doc.a._bsontype).to.be.equal("Long");
        }
    });

    it("should correctly honor promote long true BSON", async () => {
        const db = await mongo.connect(this.url(), { promoteLongs: true });
        const collection = db.collection("shouldCorrectlyHonorPromoteLongTrueNativeBSON");
        await collection.insert({
            doc: bson.Long.fromNumber(10),
            array: [[bson.Long.fromNumber(10)]]
        });
        const doc = await collection.findOne();
        expect(doc.doc).to.be.a("number");
        expect(doc.array[0][0]).to.be.a("number");
    });

    it("should correctly work with check keys", async () => {
        const { db } = this;
        await db.collection("shouldCorrectlyOverrideCheckKeysJSOnUpdate").update({
            "ps.op.t": 1
        }, {
            $set: { b: 1 }
        }, { checkKeys: false });
    });

    it("should correctly apply bit operator", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyApplyBitOperator");
        await collection.insert({ a: 1, b: 1 });
        await collection.update({ a: 1 }, { $bit: { b: { and: 0 } } });
        const doc = await collection.findOne({ a: 1 });
        expect(doc).to.include({ a: 1, b: 0 });
    });

    it("should correctly perform insert and update with function serialization", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyPerformInsertAndUpdateWithFunctionSerialization", {
            serializeFunctions: true
        });

        await collection.insert({
            a: 1, f(x) {
                return x;
            }
        });
        const f = function (y) {
            return y;
        };
        await collection.update({ a: 1 }, {
            $set: { f }
        });
        const doc = await collection.findOne({ a: 1 });
        expect(doc.f.code).to.be.equal(f.toString());
    });

    it("should correctly insert > 1000 docs using insert and insertMany", async () => {
        const { db } = this;
        const collection = db.collection("shouldCorrectlyAllowforMoreThanAThousandDocsInsert", {
            serializeFunctions: true
        });
        {
            const doc = await collection.insert(range(2000).map((i) => ({ a: i })));
            expect(doc.result.n).to.be.equal(2000);
        }
        {
            const doc = await collection.insertMany(range(2000).map((i) => ({ a: i })));
            expect(doc.result.n).to.be.equal(2000);
        }
        expect(await collection.count()).to.be.equal(4000);
    });

    it("should return error on unordered insertMany with multiple unique key constraints", async () => {
        const { db } = this;
        const collection = db.collection("insertManyMultipleWriteErrors");
        await collection.drop().catch(() => { });
        await collection.createIndex({ a: 1 }, { unique: true });
        const err = await assert.throws(async () => {
            await collection.insertMany([{ a: 1 }, { a: 2 }, { a: 1 }, { a: 3 }, { a: 1 }], { ordered: false });
        });
        expect(err.writeErrors).to.have.lengthOf(2);
    });

    it("should return error on unordered insert with multiple unique key constraints", async () => {
        const { db } = this;
        const col = db.collection("insertManyMultipleWriteErrors1");
        await col.drop().catch(() => { });
        await col.createIndex({ a: 1 }, { unique: true });
        const err = await assert.throws(async () => {
            await col.insert([{ a: 1 }, { a: 2 }, { a: 1 }, { a: 3 }, { a: 1 }], { ordered: false });
        });
        expect(err.writeErrors).to.have.lengthOf(2);
    });

    it("should return error on ordered insertMany with multiple unique key constraints", async () => {
        const { db } = this;
        const col = db.collection("insertManyMultipleWriteErrors2");
        await col.drop().catch(() => { });
        await col.createIndex({ a: 1 }, { unique: true });
        await assert.throws(async () => {
            await col.insertMany([{ a: 1 }, { a: 2 }, { a: 1 }, { a: 3 }, { a: 1 }], { ordered: true });
        });
    });

    it("should return error on ordered insert with multiple unique key constraints", async () => {
        const { db } = this;
        const col = db.collection("insertManyMultipleWriteErrors3");
        await col.drop().catch(() => { });
        await col.createIndex({ a: 1 }, { unique: true });
        await assert.throws(async () => {
            await col.insert([{ a: 1 }, { a: 2 }, { a: 1 }, { a: 3 }, { a: 1 }], { ordered: true });
        });
    });

    it("correctly allow forceServerObjectId for insertOne", async () => {
        const { db } = this;
        const started = [];
        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "insert") {
                started.push(event);
            }
        });
        await db.collection("insert_apm_test").insertOne({ a: 1 }, { forceServerObjectId: true });
        expect(started[0].command.documents[0]._id).to.be.undefined;
        listener.uninstrument();
    });

    it("correctly allow forceServerObjectId for insertMany", async () => {
        const { db } = this;
        const started = [];
        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "insert") {
                started.push(event);
            }
        });
        await db.collection("insert_apm_test").insertMany([{ a: 1 }], { forceServerObjectId: true });
        expect(started[0].command.documents[0]._id).to.be.undefined;
        listener.uninstrument();
    });

    it("should return correct number of ids for insertMany { ordered: true }", async () => {
        const { db } = this;
        const r = await db.collection("inserted_ids_test").insertMany([{}, {}, {}], { ordered: true });
        expect(r.insertedIds).to.have.lengthOf(3);
    });

    it("should return correct number of ids for insertMany { ordered: false }", async () => {
        const { db } = this;
        const r = await db.collection("inserted_ids_test").insertMany([{}, {}, {}], { ordered: false });
        expect(r.insertedIds).to.have.lengthOf(3);
    });

    it("insert document including sub documents", async () => {
        const { db } = this;
        const shipment = {
            shipment1: "a"
        };
        const supplier = {
            shipments: [shipment]
        };
        const product = {
            suppliers: [supplier]
        };
        const doc = {
            a: 1, products: [product]
        };
        const collection = db.collection("sub_documents");
        await collection.insertOne(doc);
        const v = await collection.find({}).next();
        expect(v.products[0].suppliers[0].shipments[0].shipment1).to.be.equal("a");
    });
});
