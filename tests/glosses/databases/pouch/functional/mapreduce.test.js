import * as util from "./utils";

describe("database", "pouch", "mapreduce", () => {
    const createView = function (db, viewObj) {
        const storableViewObj = {
            map: viewObj.map.toString()
        };
        if (viewObj.reduce) {
            storableViewObj.reduce = viewObj.reduce.toString();
        }
        return Promise.resolve(db.put({
            _id: "_design/theViewDoc",
            views: {
                theView: storableViewObj
            }
        })).then(() => "theViewDoc/theView");
    };

    const dbName = "testdb";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    it("Test basic view", async () => {
        const db = new DB(dbName);
        const view = await createView(db, {
            map: (doc) => {
                emit(doc.foo, doc);
            }
        });
        await db.bulkDocs({
            docs: [
                { foo: "bar" },
                { _id: "volatile", foo: "baz" }
            ]
        });
        const doc = await db.get("volatile");
        await db.remove(doc);
        const res = await db.query(view, { include_docs: true, reduce: false });

        expect(res.rows).to.have.length(1, "Dont include deleted documents");
        expect(res.total_rows).to.be.equal(1, "Include total_rows property.");
        res.rows.forEach((x) => {
            expect(x.id).to.exist();
            expect(x.key).to.exist();
            expect(x.value).to.exist();
            expect(x.value._rev).to.exist();
            expect(x.doc).to.exist();
            expect(x.doc._rev).to.exist();
        });
    });

    it("Test basic view, no emitted value", async () => {
        const db = new DB(dbName);
        const view = await createView(db, {
            map: (doc) => {
                emit(doc.foo);
            }
        });
        await db.bulkDocs({
            docs: [
                { foo: "bar" },
                { _id: "volatile", foo: "baz" }
            ]
        });
        await db.remove(await db.get("volatile"));
        const res = await db.query(view, { include_docs: true, reduce: false });
        expect(res.rows).to.have.length(1, "Dont include deleted documents");
        expect(res.total_rows).to.be.equal(1, "Include total_rows property.");
        res.rows.forEach((x) => {
            expect(x.id).to.exist();
            expect(x.key).to.exist();
            expect(x.value, null).to.equal;
            expect(x.doc).to.exist();
            expect(x.doc._rev).to.exist();
        });
    });

    it("with a closure", async () => {
        const db = new DB(dbName);
        await db.bulkDocs({
            docs: [
                { foo: "bar" },
                { _id: "volatile", foo: "baz" }
            ]
        });
        const queryFun = (function (test) {
            return function (doc, emit) {
                if (doc._id === test) {
                    emit(doc.foo);
                }
            };
        }("volatile"));
        const res = await db.query(queryFun, { reduce: false });
        expect(res).to.be.deep.equal({
            total_rows: 1,
            offset: 0,
            rows: [
                {
                    id: "volatile",
                    key: "baz",
                    value: null
                }
            ]
        });
    });

    it("Test opts.startkey/opts.endkey", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: (doc) => {
                emit(doc.key, doc);
            }
        });
        await db.bulkDocs({
            docs: [
                { key: "key1" },
                { key: "key2" },
                { key: "key3" },
                { key: "key4" },
                { key: "key5" }
            ]
        });
        {
            const res = await db.query(queryFun, { reduce: false, startkey: "key2" });
            expect(res.rows).to.have.length(4);
        }
        {
            const res = await db.query(queryFun, { reduce: false, endkey: "key3" });
            expect(res.rows).to.have.length(3);
        }
        {
            const res = await db.query(queryFun, {
                reduce: false,
                startkey: "key2",
                endkey: "key3"
            });
            expect(res.rows).to.have.length(2);
        }
        {
            const res = await db.query(queryFun, {
                reduce: false,
                startkey: "key4",
                endkey: "key4"
            });
            expect(res.rows).to.have.length(1);
        }
    });

    it("#4154 opts.start_key/opts.end_key are synonyms", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: (doc) => {
                emit(doc.key, doc);
            }
        });
        await db.bulkDocs({
            docs: [
                { key: "key1" },
                { key: "key2" },
                { key: "key3" },
                { key: "key4" },
                { key: "key5" }
            ]
        });
        {
            const res = await db.query(queryFun, { reduce: false, start_key: "key2" });
            expect(res.rows).to.have.length(4);
        }
        {
            const res = await db.query(queryFun, { reduce: false, end_key: "key3" });
            expect(res.rows).to.have.length(3);
        }
        {
            const res = await db.query(queryFun, {
                reduce: false,
                start_key: "key2",
                end_key: "key3"
            });
            expect(res.rows).to.have.length(2);
        }
        {
            const res = await db.query(queryFun, {
                reduce: false,
                start_key: "key4",
                end_key: "key4"
            });
            expect(res.rows).to.have.length(1);
        }
    });

    //TODO: split this to their own tests within a describe block
    it("Test opts.inclusive_end = false", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: (doc) => {
                emit(doc.key, doc);
            }
        });
        await db.bulkDocs({
            docs: [
                { key: "key1" },
                { key: "key2" },
                { key: "key3" },
                { key: "key4" },
                { key: "key4" },
                { key: "key5" }
            ]
        });
        {
            const res = await db.query(queryFun, {
                reduce: false,
                endkey: "key4",
                inclusive_end: false
            });
            expect(res.rows).to.have.length(3);
            expect(res.rows[0].key).to.be.equal("key1");
            expect(res.rows[2].key).to.be.equal("key3");
        }
        {
            const res = await db.query(queryFun, {
                reduce: false,
                startkey: "key3",
                endkey: "key4",
                inclusive_end: false
            });
            expect(res.rows).to.have.length(1);
            expect(res.rows[0].key).to.be.equal("key3");
        }
        {
            const res = await db.query(queryFun, {
                reduce: false,
                startkey: "key4",
                endkey: "key1",
                descending: true,
                inclusive_end: false
            });
            expect(res.rows).to.have.length(4);
            expect(res.rows[0].key).to.be.equal("key4");
        }
    });

    it("Test opts.key", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: (doc) => {
                emit(doc.key, doc);
            }
        });
        await db.bulkDocs({
            docs: [
                { key: "key1" },
                { key: "key2" },
                { key: "key3" },
                { key: "key3" }
            ]
        });
        {
            const res = await db.query(queryFun, { reduce: false, key: "key2" });
            expect(res.rows).to.have.length(1);
        }
        {
            const res = await db.query(queryFun, { reduce: false, key: "key3" });
            expect(res.rows).to.have.length(2);
        }
    });

    it("Test basic view collation", async () => {
        const values = [];

        // special values sort before all other types
        values.push(null);
        values.push(false);
        values.push(true);

        // then numbers
        values.push(1);
        values.push(2);
        values.push(3.0);
        values.push(4);

        // then text, case sensitive
        // currently chrome uses ascii ordering and so wont handle caps properly
        values.push("a");
        //values.push("A");
        values.push("aa");
        values.push("b");
        //values.push("B");
        values.push("ba");
        values.push("bb");

        // then arrays. compared element by element until different.
        // Longer arrays sort after their prefixes
        values.push(["a"]);
        values.push(["b"]);
        values.push(["b", "c"]);
        values.push(["b", "c", "a"]);
        values.push(["b", "d"]);
        values.push(["b", "d", "e"]);

        // then object, compares each key value in the list until different.
        // larger objects sort after their subset objects.
        values.push({ a: 1 });
        values.push({ a: 2 });
        values.push({ b: 1 });
        values.push({ b: 2 });
        values.push({ b: 2, a: 1 }); // Member order does matter for collation.
        // CouchDB preserves member order
        // but doesn't require that clients will.
        // (this test might fail if used with a js engine
        // that doesn't preserve order)
        values.push({ b: 2, c: 2 });
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: (doc) => {
                emit(doc.foo);
            }
        });

        const docs = values.map((x, i) => {
            return { _id: (i).toString(), foo: x };
        });
        await db.bulkDocs({ docs });
        {
            const res = await db.query(queryFun, { reduce: false });
            expect(res.rows).not.to.be.empty();
            res.rows.forEach((x, i) => {
                expect(JSON.stringify(x.key)).to.be.equal(JSON.stringify(values[i]));
            });
        }
        {
            const res = await db.query(queryFun, { descending: true, reduce: false });
            expect(res.rows).not.to.be.empty();
            res.rows.forEach((x, i) => {
                expect(JSON.stringify(x.key)).to.be.equal(JSON.stringify(values[values.length - 1 - i]));
            });
        }
    });

    it("Test complex key collation", async () => {
        const map = function () {
            emit(null);
            emit(false);
            emit(true);
            emit(1);
            emit(2);
            emit(3);
            emit(4);
            emit("a");
            emit("aa");
            emit("b");
            emit("ba");
            emit("bb");
            emit(["a"]);
            emit(["b"]);
            emit(["b", "c"]);
            emit(["b", "c", "a"]);
            emit(["b", "d"]);
            emit(["b", "d", "e"]);
            emit({ a: 1 });
            emit({ a: 2 });
            emit({ b: 1 });
            emit({ b: 2 });
            emit({ b: 2, a: 1 });
            emit({ b: 2, c: 2 });
        };
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, { map });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: null, value: null },
            { id: "2", key: null, value: null },
            { id: "1", key: false, value: null },
            { id: "2", key: false, value: null },
            { id: "1", key: true, value: null },
            { id: "2", key: true, value: null },
            { id: "1", key: 1, value: null },
            { id: "2", key: 1, value: null },
            { id: "1", key: 2, value: null },
            { id: "2", key: 2, value: null },
            { id: "1", key: 3, value: null },
            { id: "2", key: 3, value: null },
            { id: "1", key: 4, value: null },
            { id: "2", key: 4, value: null },
            { id: "1", key: "a", value: null },
            { id: "2", key: "a", value: null },
            { id: "1", key: "aa", value: null },
            { id: "2", key: "aa", value: null },
            { id: "1", key: "b", value: null },
            { id: "2", key: "b", value: null },
            { id: "1", key: "ba", value: null },
            { id: "2", key: "ba", value: null },
            { id: "1", key: "bb", value: null },
            { id: "2", key: "bb", value: null },
            { id: "1", key: ["a"], value: null },
            { id: "2", key: ["a"], value: null },
            { id: "1", key: ["b"], value: null },
            { id: "2", key: ["b"], value: null },
            { id: "1", key: ["b", "c"], value: null },
            { id: "2", key: ["b", "c"], value: null },
            { id: "1", key: ["b", "c", "a"], value: null },
            { id: "2", key: ["b", "c", "a"], value: null },
            { id: "1", key: ["b", "d"], value: null },
            { id: "2", key: ["b", "d"], value: null },
            { id: "1", key: ["b", "d", "e"], value: null },
            { id: "2", key: ["b", "d", "e"], value: null },
            { id: "1", key: { a: 1 }, value: null },
            { id: "2", key: { a: 1 }, value: null },
            { id: "1", key: { a: 2 }, value: null },
            { id: "2", key: { a: 2 }, value: null },
            { id: "1", key: { b: 1 }, value: null },
            { id: "2", key: { b: 1 }, value: null },
            { id: "1", key: { b: 2 }, value: null },
            { id: "2", key: { b: 2 }, value: null },
            { id: "1", key: { b: 2, a: 1 }, value: null },
            { id: "2", key: { b: 2, a: 1 }, value: null },
            { id: "1", key: { b: 2, c: 2 }, value: null },
            { id: "2", key: { b: 2, c: 2 }, value: null }
        ]);
    });

    it("Test duplicate collation of objects", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit({ a: "a" }, { b: "b" });
                emit({ a: "a" }, { b: "b" });
            }
        });

        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: { a: "a" }, value: { b: "b" } },
            { id: "1", key: { a: "a" }, value: { b: "b" } },
            { id: "2", key: { a: "a" }, value: { b: "b" } },
            { id: "2", key: { a: "a" }, value: { b: "b" } }
        ]);
    });

    it("Test collation of undefined/null", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit();
                emit(null);
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: null, value: null },
            { id: "1", key: null, value: null },
            { id: "2", key: null, value: null },
            { id: "2", key: null, value: null }
        ]);
    });

    it("Test collation of null/undefined", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit(null);
                emit();
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: null, value: null },
            { id: "1", key: null, value: null },
            { id: "2", key: null, value: null },
            { id: "2", key: null, value: null }
        ]);
    });

    it("Test duplicate collation of nulls", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit(null);
                emit(null);
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: null, value: null },
            { id: "1", key: null, value: null },
            { id: "2", key: null, value: null },
            { id: "2", key: null, value: null }
        ]);
    });

    it("Test duplicate collation of booleans", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit(true);
                emit(true);
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: true, value: null },
            { id: "1", key: true, value: null },
            { id: "2", key: true, value: null },
            { id: "2", key: true, value: null }
        ]);
    });

    it("Test collation of different objects", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit({ a: "b" }, { a: "a" });
                emit({ a: "a" }, { b: "b" });
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: { a: "a" }, value: { b: "b" } },
            { id: "2", key: { a: "a" }, value: { b: "b" } },
            { id: "1", key: { a: "b" }, value: { a: "a" } },
            { id: "2", key: { a: "b" }, value: { a: "a" } }
        ]);
    });

    it("Test collation of different objects 2", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit({ a: "b", b: "c" }, { a: "a" });
                emit({ a: "a" }, { b: "b" });
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: { a: "a" }, value: { b: "b" } },
            { id: "2", key: { a: "a" }, value: { b: "b" } },
            { id: "1", key: { a: "b", b: "c" }, value: { a: "a" } },
            { id: "2", key: { a: "b", b: "c" }, value: { a: "a" } }
        ]);
    });

    it("Test collation of different objects 3", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit({ a: "a" }, { b: "b" });
                emit({ a: "b" }, { a: "a" });
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: { a: "a" }, value: { b: "b" } },
            { id: "2", key: { a: "a" }, value: { b: "b" } },
            { id: "1", key: { a: "b" }, value: { a: "a" } },
            { id: "2", key: { a: "b" }, value: { a: "a" } }
        ]);
    });

    it("Test collation of different objects 4", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit({ a: "a" });
                emit({ b: "b" });
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: { a: "a" }, value: null },
            { id: "2", key: { a: "a" }, value: null },
            { id: "1", key: { b: "b" }, value: null },
            { id: "2", key: { b: "b" }, value: null }
        ]);
    });

    it("Test collation of different objects 5", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit({ a: "a" });
                emit({ a: "a", b: "b" });
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: { a: "a" }, value: null },
            { id: "2", key: { a: "a" }, value: null },
            { id: "1", key: { a: "a", b: "b" }, value: null },
            { id: "2", key: { a: "a", b: "b" }, value: null }
        ]);
    });

    it("Test collation of different objects 6", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit({ a: "a" });
                emit({ a: "a", b: "b" });
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: { a: "a" }, value: null },
            { id: "2", key: { a: "a" }, value: null },
            { id: "1", key: { a: "a", b: "b" }, value: null },
            { id: "2", key: { a: "a", b: "b" }, value: null }
        ]);
    });

    it("Test collation of different booleans", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit(true);
                emit(false);
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: false, value: null },
            { id: "2", key: false, value: null },
            { id: "1", key: true, value: null },
            { id: "2", key: true, value: null }
        ]);
    });

    it("Test collation of different booleans 2", async () => {
        const db = new DB(dbName);
        await db.bulkDocs([
            { _id: "1" },
            { _id: "2" }
        ]);
        const queryFun = await createView(db, {
            map: () => {
                emit(false);
                emit(true);
            }
        });
        const res = await db.query(queryFun);
        const rows = res.rows.map((x) => {
            return {
                id: x.id,
                key: x.key,
                value: x.value
            };
        });
        assert.deepEqual(rows, [
            { id: "1", key: false, value: null },
            { id: "2", key: false, value: null },
            { id: "1", key: true, value: null },
            { id: "2", key: true, value: null }
        ]);
    });

    it("Test joins", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: (doc) => {
                if (doc.doc_id) {
                    emit(doc._id, { _id: doc.doc_id });
                }
            }
        });
        await db.bulkDocs({
            docs: [
                { _id: "mydoc", foo: "bar" },
                { doc_id: "mydoc" }
            ]
        });
        const res = await db.query(queryFun, { include_docs: true, reduce: false });
        expect(res.rows[0].doc).to.exist();
        expect(res.rows[0].doc._id).to.be.equal("mydoc");
    });

    it("No reduce function", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: () => {
                emit("key", "val");
            }
        });
        await db.post({ foo: "bar" });
        await db.query(queryFun);
    });

    it("Query after db.close", async () => {
        let db = new DB(dbName);
        const queryFun = await createView(db, {
            map: (doc) => {
                emit(doc.foo, "val");
            }
        });
        await db.put({ _id: "doc", foo: "bar" });
        let res = await db.query(queryFun);
        expect(res.rows).to.be.deep.equal([
            {
                id: "doc",
                key: "bar",
                value: "val"
            }
        ]);
        await db.close();
        db = new DB(dbName);
        res = await db.query(queryFun);
        expect(res.rows).to.be.deep.equal([
            {
                id: "doc",
                key: "bar",
                value: "val"
            }
        ]);
    });

    it("Built in _sum reduce function", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: (doc) => {
                emit(doc.val, 1);
            },
            reduce: "_sum"
        });
        await db.bulkDocs({
            docs: [
                { val: "bar" },
                { val: "bar" },
                { val: "baz" }
            ]
        });
        const res = await db.query(queryFun, { reduce: true, group_level: 999 });
        expect(res.rows.map((x) => x.value)).to.be.deep.equal([2, 1]);
    });

    it("Built in _count reduce function", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: (doc) => {
                emit(doc.val, doc.val);
            },
            reduce: "_count"
        });
        await db.bulkDocs({
            docs: [
                { val: "bar" },
                { val: "bar" },
                { val: "baz" }
            ]
        });
        const res = await db.query(queryFun, { reduce: true, group_level: 999 });
        expect(res.rows.map((x) => x.value)).to.be.deep.equal([2, 1]);
    });

    it("Built in _stats reduce function", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: "function(doc){emit(doc.val, 1);}",
            reduce: "_stats"
        });
        await db.bulkDocs({
            docs: [
                { val: "bar" },
                { val: "bar" },
                { val: "baz" }
            ]
        });
        const res = await db.query(queryFun, { reduce: true, group_level: 999 });
        expect(res.rows[0].value).to.be.deep.equal({
            sum: 2,
            count: 2,
            min: 1,
            max: 1,
            sumsqr: 2
        });
    });

    it("Built in _stats reduce function should throw an error with a promise", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: "function(doc){emit(doc.val, 'lala');}",
            reduce: "_stats"
        });
        await db.bulkDocs({
            docs: [
                { val: "bar" },
                { val: "bar" },
                { val: "baz" }
            ]
        });
        await assert.throws(async () => {
            await db.query(queryFun, { reduce: true, group_level: 999 });
        });
    });

    it("Built in _sum reduce function should throw an error with a promise", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: "function(doc){emit(null, doc.val);}",
            reduce: "_sum"
        });
        await db.bulkDocs({
            docs: [
                { val: 1 },
                { val: 2 },
                { val: "baz" }
            ]
        });
        await assert.throws(async () => {
            await db.query(queryFun, { reduce: true, group: true });
        });
    });

    it("Built in _sum reduce function with num arrays should throw an error", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: "function(doc){emit(null, doc.val);}",
            reduce: "_sum"
        });
        await db.bulkDocs({
            docs: [
                { val: [1, 2, 3] },
                { val: 2 },
                { val: ["baz"] }
            ]
        });
        await assert.throws(async () => {
            await db.query(queryFun, { reduce: true, group: true });

        });
    });

    it("Built in _sum can be used with lists of numbers", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: "function(doc){emit(null, doc.val);}",
            reduce: "_sum"
        });
        await db.bulkDocs({
            docs: [
                { _id: "1", val: 2 },
                { _id: "2", val: [1, 2, 3, 4] },
                { _id: "3", val: [3, 4] },
                { _id: "4", val: 1 }
            ]
        });
        const res = await db.query(queryFun, { reduce: true, group: true });
        expect(res).to.be.deep.equal({
            rows: [{
                key: null,
                value: [7, 6, 3, 4]
            }]
        });
    });

    it("#6364 Recognize built in reduce functions with trailing garbage", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: (doc) => {
                emit(doc.val, 1);
            },
            reduce: "_sum\n \r\nandothergarbage"
        });
        await db.bulkDocs({
            docs: [
                { val: "bar" },
                { val: "bar" },
                { val: "baz" }
            ]
        });
        const res = await db.query(queryFun, { reduce: true, group_level: 999 });
        expect(res.rows.map((x) => x.value)).to.be.deep.equal([2, 1]);
    });

    it("Starts with _ but not a built in reduce function should throw", async () => {
        const db = new DB(dbName);
        const queryFun = await createView(db, {
            map: "function(doc){emit(null, doc.val);}",
            reduce: "_product"
        });
        await db.bulkDocs({
            docs: [
                { val: 1 },
                { val: 2 },
                { val: 3 }
            ]
        });
        await assert.throws(async () => {
            await db.query(queryFun, { reduce: true, group: true });
        });
    });

    it("Query result should include _conflicts", async () => {
        const db2name = `test2b${Math.random()}`;
        const cleanup = function () {
            return new DB(db2name).destroy();
        };
        const doc1 = { _id: "1", foo: "bar" };
        const doc2 = { _id: "1", foo: "baz" };
        const db = new DB(dbName);
        try {
            await db.info();
            const remote = new DB(db2name);
            await remote.info();
            await db.post(doc1);
            await remote.post(doc2);
            const replicate = adone.promise.promisify(db.replicate.from, { context: db.replicate });
            await replicate(remote);
            let res = await db.query((doc) => {
                if (doc._conflicts) {
                    emit(doc._conflicts, null);
                }
            }, { include_docs: true, conflicts: true });
            expect(res.rows[0].doc._conflicts).to.exist();
            res = await db.get(res.rows[0].doc._id, { conflicts: true });
            expect(res._conflicts).to.exist();
        } finally {
            await cleanup();
        }
    });

    /* jshint maxlen:false */
    const icons = [
        "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"
    ];

    /* jshint maxlen:100 */

    const iconDigests = [
        "md5-Mf8m9ehZnCXC717bPkqkCA==",
        "md5-fdEZBYtnvr+nozYVDzzxpA==",
        "md5-ImDARszfC+GA3Cv9TVW4HA==",
        "md5-hBsgoz3ujHM4ioa72btwow==",
        "md5-jDUyV6ySnTVANn2qq3332g=="
    ];

    const iconLengths = [1047, 789, 967, 527, 1108];

    it("#190 Query works with attachments=true", () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 5; i++) {
            docs.push({
                _id: i.toString(),
                _attachments: {
                    "foo.png": {
                        data: icons[i],
                        content_type: "image/png"
                    }
                }
            });
        }
        return db.bulkDocs(docs).then(() => {
            return createView(db, {
                map: (doc) => {
                    emit(doc._id);
                }
            });
        }).then((queryFun) => {
            return db.query(queryFun, {
                include_docs: true,
                attachments: true
            }).then((res) => {
                const attachments = res.rows.map((row) => {
                    const doc = row.doc;
                    delete doc._attachments["foo.png"].revpos;
                    return doc._attachments;
                });
                expect(attachments).to.be.deep.equal(icons.map((icon, i) => {
                    return {
                        "foo.png": {
                            content_type: "image/png",
                            data: icon,
                            digest: iconDigests[i]
                        }
                    };
                }), "works with attachments=true");
                return db.query(queryFun, { include_docs: true });
            }).then((res) => {
                const attachments = res.rows.map((row) => {
                    const doc = row.doc;
                    delete doc._attachments["foo.png"].revpos;
                    return doc._attachments["foo.png"];
                });
                expect(attachments).to.be.deep.equal(icons.map((icon, i) => {
                    return {
                        content_type: "image/png",
                        stub: true,
                        digest: iconDigests[i],
                        length: iconLengths[i]
                    };
                }), "works with attachments=false");

                return db.query(queryFun, { attachments: true });
            }).then((res) => {
                expect(res.rows).to.have.length(5);
                res.rows.forEach((row) => {
                    expect(row.doc).to.not.exist();
                });
            });
        });
    });

    it("#2858 Query works with attachments=true, binary=true 1", () => {
        // Need to avoid the cache to workaround
        // https://issues.apache.org/jira/browse/COUCHDB-2880
        const db = new DB(dbName, { ajax: { cache: false } });
        const docs = [];
        for (let i = 0; i < 5; i++) {
            docs.push({
                _id: i.toString(),
                _attachments: {
                    "foo.png": {
                        data: icons[i],
                        content_type: "image/png"
                    }
                }
            });
        }
        return db.bulkDocs(docs).then(() => {
            return createView(db, {
                map: (doc) => {
                    emit(doc._id);
                }
            });
        }).then((queryFun) => {
            return db.query(queryFun, {
                include_docs: true,
                attachments: true,
                binary: true
            }).then((res) => {
                res.rows.forEach((row) => {
                    const doc = row.doc;
                    Object.keys(doc._attachments).forEach((attName) => {
                        const att = doc._attachments[attName];
                        expect(att.strub).to.not.exist();
                        expect(att.data).to.be.not.a("string");
                    });
                });
            });
        });
    });

    it("#2858 Query works with attachments=true, binary=true 2", () => {
        // Need to avoid the cache to workaround
        // https://issues.apache.org/jira/browse/COUCHDB-2880
        const db = new DB(dbName, { ajax: { cache: false } });
        const docs = [];
        for (let i = 0; i < 5; i++) {
            docs.push({
                _id: i.toString()
            });
        }
        return db.bulkDocs(docs).then(() => {
            return createView(db, {
                map: (doc) => {
                    emit(doc._id);
                }
            });
        }).then((queryFun) => {
            return db.query(queryFun, {
                include_docs: true,
                attachments: true,
                binary: true
            }).then((res) => {
                res.rows.forEach((row) => {
                    const doc = row.doc;
                    expect(doc._attachments).to.not.exist();
                });
            });
        });
    });

    it("#242 conflicts at the root level", () => {
        const db = new DB(dbName);

        return db.bulkDocs([
            {
                foo: "1",
                _id: "foo",
                _rev: "1-w",
                _revisions: { start: 1, ids: ["w"] }
            }
        ], { new_edits: false }).then(() => {
            return createView(db, {
                map: (doc) => {
                    emit(doc.foo);
                }
            }).then((queryFun) => {
                return db.query(queryFun).then((res) => {
                    expect(res.rows[0].key).to.be.equal("1");
                    return db.bulkDocs([
                        {
                            foo: "2",
                            _id: "foo",
                            _rev: "1-x",
                            _revisions: { start: 1, ids: ["x"] }
                        }
                    ], { new_edits: false }).then(() => {
                        return db.query(queryFun);
                    }).then((res) => {
                        expect(res.rows[0].key).to.be.equal("2");
                        return db.bulkDocs([
                            {
                                foo: "3",
                                _id: "foo",
                                _rev: "1-y",
                                _deleted: true,
                                _revisions: { start: 1, ids: ["y"] }
                            }
                        ], { new_edits: false });
                    }).then(() => {
                        return db.query(queryFun);
                    }).then((res) => {
                        expect(res.rows[0].key).to.be.equal("2");
                    });
                });
            });
        });
    });

    it("#242 conflicts at the root+1 level", () => {
        const db = new DB(dbName);

        return db.bulkDocs([
            {
                foo: "2",
                _id: "foo",
                _rev: "1-x",
                _revisions: { start: 1, ids: ["x"] }
            },
            {
                foo: "3",
                _id: "foo",
                _rev: "2-y",
                _deleted: true,
                _revisions: { start: 2, ids: ["y", "x"] }
            }

        ], { new_edits: false }).then(() => {
            return createView(db, {
                map: (doc) => {
                    emit(doc.foo);
                }
            }).then((queryFun) => {
                return db.query(queryFun).then((res) => {
                    expect(res.rows).to.be.empty();
                    return db.bulkDocs([
                        {
                            foo: "1",
                            _id: "foo",
                            _rev: "1-w",
                            _revisions: { start: 1, ids: ["w"] }
                        }
                    ], { new_edits: false }).then(() => {
                        return db.query(queryFun);
                    }).then((res) => {
                        expect(res.rows[0].key).to.be.equal("1");
                        return db.bulkDocs([
                            {
                                foo: "4",
                                _id: "foo",
                                _rev: "1-z",
                                _revisions: { start: 1, ids: ["z"] }
                            }
                        ], { new_edits: false });
                    }).then(() => {
                        return db.query(queryFun);
                    }).then((res) => {
                        expect(res.rows[0].key).to.be.equal("4");
                    });
                });
            });
        });
    });

    it("Views should include _conflicts", async () => {
        const db2name = `test2${Math.random()}`;
        const cleanup = function () {
            return new DB(db2name).destroy();
        };
        const doc1 = { _id: "1", foo: "bar" };
        const doc2 = { _id: "1", foo: "baz" };
        const db = new DB(dbName);
        try {
            await db.info();
            const remote = new DB(db2name);
            await remote.info();
            const queryFun = await createView(db, {
                map: (doc) => {
                    emit(doc._id, Boolean(doc._conflicts));
                }
            });
            const replicate = adone.promise.promisify(db.replicate.from, db.replicate);
            await db.post(doc1);
            await remote.post(doc2);
            await replicate(remote);
            {
                const res = await db.get(doc1._id, { conflicts: true });
                expect(res._conflicts).to.exist();
            }
            {
                const res = await db.query(queryFun);
                expect(res.rows[0].value).to.be.true(););
            }
        } finally {
            await cleanup();
        }
    });

    it("Test view querying with limit option", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                if (doc.foo === "bar") {
                    emit(doc.foo);
                }
            }
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { foo: "bar" },
                    { foo: "bar" },
                    { foo: "baz" }
                ]
            }).then(() => {
                return db.query(queryFun, { limit: 1 });
            }).then((res) => {
                expect(res.total_rows).to.be.equal(2, "Correctly returns total rows");
                expect(res.rows).to.have.length(1, "Correctly limits returned rows");
            });
        });
    });

    it("Test view querying with custom reduce function", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo);
            },
            reduce: (keys) => {
                return keys.map((keyId) => {
                    const key = keyId[0];
                    // var id = keyId[1];
                    return key.join("");
                });
            }
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { foo: ["foo", "bar"] },
                    { foo: ["foo", "bar"] },
                    { foo: ["foo", "bar", "baz"] },
                    { foo: ["baz"] },
                    { foo: ["baz", "bar"] }
                ]
            }).then(() => {
                return db.query(queryFun, { reduce: true });
            }).then((res) => {
                // We're using `chai.assert` here because the usual `chai.should()`
                // object extension magic won't work when executing functions in a
                // sandbox using node's `vm` module.
                // c.f. https://stackoverflow.com/a/16273649/680742
                assert.lengthOf(res.rows, 1, "Correctly reduced returned rows");
                assert.null(res.rows[0].key, "Correct, non-existing key");
                assert.lengthOf(res.rows[0].value, 5);
                assert.include(res.rows[0].value, "foobarbaz");
                assert.include(res.rows[0].value, "foobar"); // twice
                assert.include(res.rows[0].value, "bazbar");
                assert.include(res.rows[0].value, "baz");
                return db.query(queryFun, { group_level: 1, reduce: true });
            }).then((res) => {
                // We're using `chai.assert` here because the usual `chai.should()`
                // object extension magic won't work when executing functions in a
                // sandbox using node's `vm` module.
                // c.f. https://stackoverflow.com/a/16273649/680742
                assert.lengthOf(res.rows, 2, "Correctly group reduced rows");
                assert.deepEqual(res.rows[0].key, ["baz"]);
                assert.lengthOf(res.rows[0].value, 2);
                assert.include(res.rows[0].value, "bazbar");
                assert.include(res.rows[0].value, "baz");
                assert.deepEqual(res.rows[1].key, ["foo"]);
                assert.lengthOf(res.rows[1].value, 3);
                assert.include(res.rows[1].value, "foobarbaz");
                assert.include(res.rows[1].value, "foobar"); // twice
            });
        });
    });

    it("Test view querying with group_level option and reduce", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo);
            },
            reduce: "_count"
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { foo: ["foo", "bar"] },
                    { foo: ["foo", "bar"] },
                    { foo: ["foo", "bar", "baz"] },
                    { foo: ["baz"] },
                    { foo: ["baz", "bar"] }
                ]
            }).then(() => {
                return db.query(queryFun, { group_level: 1, reduce: true });
            }).then((res) => {
                expect(res.rows).to.have.length(2, "Correctly group returned rows");
                expect(res.rows[0].key).to.be.deep.equal(["baz"]);
                expect(res.rows[0].value).to.be.equal(2);
                expect(res.rows[1].key).to.be.deep.equal(["foo"]);
                expect(res.rows[1].value).to.be.equal(3);
                return db.query(queryFun, { group_level: 999, reduce: true });
            }).then((res) => {
                expect(res.rows).to.have.length(4, "Correctly group returned rows");
                expect(res.rows[2].key).to.be.deep.equal(["foo", "bar"]);
                expect(res.rows[2].value).to.be.equal(2);
                return db.query(queryFun, { group_level: "999", reduce: true });
            }).then((res) => {
                expect(res.rows).to.have.length(4, "Correctly group returned rows");
                expect(res.rows[2].key).to.be.deep.equal(["foo", "bar"]);
                expect(res.rows[2].value).to.be.equal(2);
                return db.query(queryFun, { group_level: 0, reduce: true });
            }).then((res) => {
                expect(res.rows).to.have.length(1, "Correctly group returned rows");
                expect(res.rows[0].value).to.be.equal(5);
            });
        });
    });

    it("Test view querying with invalid group_level options", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo);
            },
            reduce: "_count"
        }).then((queryFun) => {
            return db.query(queryFun, { group_level: -1, reduce: true })
                .then((res) => {
                    expect(res).to.not.exist();
                }).catch((err) => {
                    expect(err.status).to.be.equal(400);
                    expect(err.message).to.be.a("string");
                    return db.query(queryFun, { group_level: "exact", reduce: true });
                }).then((res) => {
                    expect(res).to.not.exist();
                }).catch((err) => {
                    expect(err.status).to.be.equal(400);
                    expect(err.message).to.be.a("string");
                });
        });
    });

    it("Test view querying with limit option and reduce", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo);
            },
            reduce: "_count"
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { foo: "bar" },
                    { foo: "bar" },
                    { foo: "baz" }
                ]
            }).then(() => {
                return db.query(queryFun, { limit: 1, group: true, reduce: true });
            }).then((res) => {
                expect(res.rows).to.have.length(1, "Correctly limits returned rows");
                expect(res.rows[0].key).to.be.equal("bar");
                expect(res.rows[0].value).to.be.equal(2);
            }).then(() => {
                return db.query(queryFun, { limit: "1", group: true, reduce: true });
            }).then((res) => {
                expect(res.rows).to.have.length(1, "Correctly limits returned rows");
                expect(res.rows[0].key).to.be.equal("bar");
                expect(res.rows[0].value).to.be.equal(2);
            });
        });
    });

    it("Test view querying with invalid limit option and reduce", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo);
            },
            reduce: "_count"
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { foo: "bar" },
                    { foo: "bar" },
                    { foo: "baz" }
                ]
            }).then(() => {
                return db.query(queryFun, { limit: -1, group: true, reduce: true });
            }).then((res) => {
                expect(res).to.not.exist();
            }).catch((err) => {
                expect(err.status).to.be.equal(400);
                expect(err.message).to.be.a("string");
                return db.query(queryFun, { limit: "1a", group: true, reduce: true });
            }).then((res) => {
                expect(res).to.not.exist();
            }).catch((err) => {
                expect(err.status).to.be.equal(400);
                expect(err.message).to.be.a("string");
            });
        });
    });

    it("Test unsafe object usage (#244)", () => {
        const db = new DB(dbName);
        return db.bulkDocs([
            { _id: "constructor" }
        ]).then((res) => {
            let rev = res[0].rev;
            return createView(db, {
                map: (doc) => {
                    emit(doc._id);
                }
            }).then((queryFun) => {
                return db.query(queryFun, { include_docs: true }).then((res) => {
                    expect(res.rows).to.be.deep.equal([
                        {
                            key: "constructor",
                            id: "constructor",
                            value: null,
                            doc: {
                                _id: "constructor",
                                _rev: rev
                            }
                        }
                    ]);
                    return db.bulkDocs([
                        { _id: "constructor", _rev: rev }
                    ]);
                }).then((res) => {
                    rev = res[0].rev;
                    return db.query(queryFun, { include_docs: true });
                }).then((res) => {
                    expect(res.rows).to.be.deep.equal([
                        {
                            key: "constructor",
                            id: "constructor",
                            value: null,
                            doc: {
                                _id: "constructor",
                                _rev: rev
                            }
                        }
                    ]);
                    return db.bulkDocs([
                        { _id: "constructor", _rev: rev, _deleted: true }
                    ]);
                }).then((res) => {
                    rev = res[0].rev;
                    return db.query(queryFun, { include_docs: true });
                }).then((res) => {
                    expect(res.rows).to.be.deep.equal([]);
                });
            });
        });
    });

    it("Test view querying with a skip option and reduce", () => {
        let qf;
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo);
            },
            reduce: "_count"
        }).then((queryFun) => {
            qf = queryFun;
            return db.bulkDocs({
                docs: [
                    { foo: "bar" },
                    { foo: "bar" },
                    { foo: "baz" }
                ]
            }).then(() => {
                return db.query(queryFun, { skip: 1, group: true, reduce: true });
            });
        }).then((res) => {
            expect(res.rows).to.have.length(1, "Correctly limits returned rows");
            expect(res.rows[0].key).to.be.equal("baz");
            expect(res.rows[0].value).to.be.equal(1);
        }).then(() => {
            return db.query(qf, { skip: "1", group: true, reduce: true });
        }).then((res) => {
            expect(res.rows).to.have.length(1, "Correctly limits returned rows");
            expect(res.rows[0].key).to.be.equal("baz");
            expect(res.rows[0].value).to.be.equal(1);
        });
    });

    it("Test view querying with invalid skip option and reduce", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo);
            },
            reduce: "_count"
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { foo: "bar" },
                    { foo: "bar" },
                    { foo: "baz" }
                ]
            }).then(() => {
                return db.query(queryFun, { skip: -1, group: true, reduce: true });
            }).then((res) => {
                expect(res).to.not.exist();
            }).catch((err) => {
                expect(err.status).to.be.equal(400);
                expect(err.message).to.be.a("string");
                return db.query(queryFun, { skip: "1a", group: true, reduce: true });
            }).then((res) => {
                expect(res).to.not.exist();
            }).catch((err) => {
                expect(err.status).to.be.equal(400);
                expect(err.message).to.be.a("string");
            });
        });
    });

    it("Special document member _doc_id_rev should never leak outside", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                if (doc.foo === "bar") {
                    emit(doc.foo);
                }
            }
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { foo: "bar" }
                ]
            }).then(() => {
                return db.query(queryFun, { include_docs: true });
            }).then((res) => {
                expect(res.rows[0].doc._doc_id_rev).to.not.exist();
            });
        });
    });

    it("multiple view creations and cleanups", () => {
        const db = new DB(dbName);
        const map = function (doc) {
            emit(doc.num);
        };
        const createView = (name) => {
            const storableViewObj = {
                map: map.toString()
            };
            return db.put({
                _id: `_design/${name}`,
                views: {
                    theView: storableViewObj
                }
            });
        };
        return db.bulkDocs({
            docs: [
                { _id: "test1" }
            ]
        }).then(() => {
            const sequence = (name) => {
                return createView(name).then(() => {
                    return db.query(`${name}/theView`).then(() => {
                        return db.viewCleanup();
                    });
                });
            };
            const attempts = [];
            const numAttempts = 10;
            for (let i = 0; i < numAttempts; i++) {
                attempts.push(sequence(`test${i}`));
            }
            return Promise.all(attempts).then(() => {
                const keys = [];
                for (let i = 0; i < numAttempts; i++) {
                    keys.push(`_design/test${i}`);
                }
                return db.allDocs({ keys, include_docs: true });
            }).then((res) => {
                const docs = res.rows.map((row) => {
                    row.doc._deleted = true;
                    return row.doc;
                });
                return db.bulkDocs({ docs });
            }).then(() => {
                return db.viewCleanup();
            }).then((res) => {
                expect(res.ok).to.be.true(););
            });
        });
    });

    it("If reduce function returns 0, resulting value should not be null", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo);
            },
            reduce: () => {
                return 0;
            }
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { foo: "bar" }
                ]
            }).then(() => {
                return db.query(queryFun).then((data) => {
                    expect(data.rows[0].value).to.exist();
                });
            });
        });
    });

    it("Testing skip with a view", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo);
            }
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { foo: "bar" },
                    { foo: "baz" },
                    { foo: "baf" }
                ]
            }).then(() => {
                return db.query(queryFun, { skip: 1 });
            }).then((data) => {
                expect(data.rows).to.have.length(2);
                expect(data.offset).to.be.equal(1);
                expect(data.total_rows).to.be.equal(3);
            });
        });
    });

    it("Map documents on 0/null/undefined/empty string", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.num);
            }
        }).then((mapFunction) => {
            const docs = [
                { _id: "0", num: 0 },
                { _id: "1", num: 1 },
                { _id: "undef" /* num is undefined */ },
                { _id: "null", num: null },
                { _id: "empty", num: "" },
                { _id: "nan", num: NaN },
                { _id: "inf", num: Infinity },
                { _id: "neginf", num: -Infinity }
            ];
            return db.bulkDocs({ docs }).then(() => {
                return db.query(mapFunction, { key: 0 });
            }).then((data) => {
                expect(data.rows).to.have.length(1);
                expect(data.rows[0].id).to.be.equal("0");

                return db.query(mapFunction, { key: "" });
            }).then((data) => {
                expect(data.rows).to.have.length(1);
                expect(data.rows[0].id).to.be.equal("empty");

                return db.query(mapFunction, { key: undefined });
            }).then((data) => {
                expect(data.rows).to.have.length(8); // everything

                // keys that should all resolve to null
                const emptyKeys = [null, NaN, Infinity, -Infinity];
                return Promise.all(emptyKeys.map((emptyKey) => {
                    return db.query(mapFunction, { key: emptyKey }).then((data) => {
                        expect(data.rows.map((row) => {
                            return row.id;
                        })).to.be.deep.equal(["inf", "nan", "neginf", "null", "undef"]);
                    });
                }));
            });
        });
    });

    it("Testing query with keys", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.field);
            }
        }).then((queryFun) => {
            const opts = { include_docs: true };
            return db.bulkDocs({
                docs: [
                    { _id: "doc_0", field: 0 },
                    { _id: "doc_1", field: 1 },
                    { _id: "doc_2", field: 2 },
                    { _id: "doc_empty", field: "" },
                    { _id: "doc_null", field: null },
                    { _id: "doc_undefined" /* field undefined */ },
                    { _id: "doc_foo", field: "foo" }
                ]
            }).then(() => {
                return db.query(queryFun, opts);
            }).then((data) => {
                expect(data.rows).to.have.length(7, "returns all docs");
                opts.keys = [];
                return db.query(queryFun, opts);
            }).then((data) => {
                expect(data.rows).to.have.length(0, "returns 0 docs");

                opts.keys = [0];
                return db.query(queryFun, opts);
            }).then((data) => {
                expect(data.rows).to.have.length(1, "returns one doc");
                expect(data.rows[0].doc._id).to.be.equal("doc_0");

                opts.keys = [2, "foo", 1, 0, null, ""];
                return db.query(queryFun, opts);
            }).then((data) => {
                // check that the returned ordering fits opts.keys
                expect(data.rows).to.have.length(7, "returns 7 docs in correct order");
                expect(data.rows[0].doc._id).to.be.equal("doc_2");
                expect(data.rows[1].doc._id).to.be.equal("doc_foo");
                expect(data.rows[2].doc._id).to.be.equal("doc_1");
                expect(data.rows[3].doc._id).to.be.equal("doc_0");
                expect(data.rows[4].doc._id).to.be.equal("doc_null");
                expect(data.rows[5].doc._id).to.be.equal("doc_undefined");
                expect(data.rows[6].doc._id).to.be.equal("doc_empty");

                opts.keys = [3, 1, 4, 2];
                return db.query(queryFun, opts);
            }).then((data) => {
                // nonexistent keys just give us holes in the list
                expect(data.rows).to.have.length(2, "returns 2 non-empty docs");
                expect(data.rows[0].key).to.be.equal(1);
                expect(data.rows[0].doc._id).to.be.equal("doc_1");
                expect(data.rows[1].key).to.be.equal(2);
                expect(data.rows[1].doc._id).to.be.equal("doc_2");

                opts.keys = [2, 1, 2, 0, 2, 1];
                return db.query(queryFun, opts);
            }).then((data) => {
                // with duplicates, we return multiple docs
                expect(data.rows).to.have.length(6, "returns 6 docs with duplicates");
                expect(data.rows[0].doc._id).to.be.equal("doc_2");
                expect(data.rows[1].doc._id).to.be.equal("doc_1");
                expect(data.rows[2].doc._id).to.be.equal("doc_2");
                expect(data.rows[3].doc._id).to.be.equal("doc_0");
                expect(data.rows[4].doc._id).to.be.equal("doc_2");
                expect(data.rows[5].doc._id).to.be.equal("doc_1");

                opts.keys = [2, 1, 2, 3, 2];
                return db.query(queryFun, opts);
            }).then((data) => {
                // duplicates and unknowns at the same time, for maximum weirdness
                expect(data.rows).to.have.length(4, "returns 2 docs with duplicates/unknowns");
                expect(data.rows[0].doc._id).to.be.equal("doc_2");
                expect(data.rows[1].doc._id).to.be.equal("doc_1");
                expect(data.rows[2].doc._id).to.be.equal("doc_2");
                expect(data.rows[3].doc._id).to.be.equal("doc_2");

                opts.keys = [3];
                return db.query(queryFun, opts);
            }).then((data) => {
                expect(data.rows).to.have.length(0, "returns 0 doc due to unknown key");

                opts.include_docs = false;
                opts.keys = [3, 2];
                return db.query(queryFun, opts);
            }).then((data) => {
                expect(data.rows).to.have.length(1, "returns 1 doc due to unknown key");
                expect(data.rows[0].id).to.be.equal("doc_2");
                expect(data.rows[0].doc).to.not.exist();
            });
        });
    });

    it("Testing query with multiple keys, multiple docs", () => {
        const ids = (row) => {
            return row.id;
        };
        const opts = { keys: [0, 1, 2] };
        let spec;
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.field1);
                emit(doc.field2);
            }
        }).then((mapFunction) => {
            return db.bulkDocs({
                docs: [
                    { _id: "0", field1: 0 },
                    { _id: "1a", field1: 1 },
                    { _id: "1b", field1: 1 },
                    { _id: "1c", field1: 1 },
                    { _id: "2+3", field1: 2, field2: 3 },
                    { _id: "4+5", field1: 4, field2: 5 },
                    { _id: "3+5", field1: 3, field2: 5 },
                    { _id: "3+4", field1: 3, field2: 4 }
                ]
            }).then(() => {
                spec = ["0", "1a", "1b", "1c", "2+3"];
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(spec);

                opts.keys = [3, 5, 4, 3];
                spec = ["2+3", "3+4", "3+5", "3+5", "4+5", "3+4", "4+5", "2+3", "3+4", "3+5"];
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(spec);
            });
        });
    });

    it("Testing multiple emissions (issue #14)", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo);
                emit(doc.bar);
                emit(doc.foo);
                emit(doc.bar, "multiple values!");
                emit(doc.bar, "crayon!");
            }
        }).then((mapFunction) => {
            return db.bulkDocs({
                docs: [
                    { _id: "doc1", foo: "foo", bar: "bar" },
                    { _id: "doc2", foo: "foo", bar: "bar" }
                ]
            }).then(() => {
                const opts = { keys: ["foo", "bar"] };

                return db.query(mapFunction, opts);
            });
        }).then((data) => {
            expect(data.rows).to.have.length(10);

            expect(data.rows[0].key).to.be.equal("foo");
            expect(data.rows[0].id).to.be.equal("doc1");
            expect(data.rows[1].key).to.be.equal("foo");
            expect(data.rows[1].id).to.be.equal("doc1");

            expect(data.rows[2].key).to.be.equal("foo");
            expect(data.rows[2].id).to.be.equal("doc2");
            expect(data.rows[3].key).to.be.equal("foo");
            expect(data.rows[3].id).to.be.equal("doc2");

            expect(data.rows[4].key).to.be.equal("bar");
            expect(data.rows[4].id).to.be.equal("doc1");
            expect(data.rows[4].value).to.not.exist();
            expect(data.rows[5].key).to.be.equal("bar");
            expect(data.rows[5].id).to.be.equal("doc1");
            expect(data.rows[5].value).to.be.equal("crayon!");
            expect(data.rows[6].key).to.be.equal("bar");
            expect(data.rows[6].id).to.be.equal("doc1");
            expect(data.rows[6].value).to.be.equal("multiple values!");

            expect(data.rows[7].key).to.be.equal("bar");
            expect(data.rows[7].id).to.be.equal("doc2");
            expect(data.rows[7].value).to.not.exist();
            expect(data.rows[8].key).to.be.equal("bar");
            expect(data.rows[8].id).to.be.equal("doc2");
            expect(data.rows[8].value).to.be.equal("crayon!");
            expect(data.rows[9].key).to.be.equal("bar");
            expect(data.rows[9].id).to.be.equal("doc2");
            expect(data.rows[9].value).to.be.equal("multiple values!");
        });
    });

    it("Testing multiple emissions (complex keys)", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: () => {
                emit(["a"], 1);
                emit(["b"], 3);
                emit(["a"], 2);
            }
        }).then((mapFunction) => {
            return db.bulkDocs({
                docs: [
                    { _id: "doc1", foo: "foo", bar: "bar" }
                ]
            }).then(() => {
                return db.query(mapFunction);
            });
        }).then((data) => {
            expect(data.rows).to.have.length(3);
            expect(data.rows[0].key).to.be.eql(["a"]);
            expect(data.rows[0].value).to.be.equal(1);
            expect(data.rows[1].key).to.be.eql(["a"]);
            expect(data.rows[1].value).to.be.equal(2);
            expect(data.rows[2].key).to.be.eql(["b"]);
            expect(data.rows[2].value).to.be.equal(3);
        });
    });

    it("Testing empty startkeys and endkeys", () => {
        let opts = { startkey: null, endkey: "" };
        const ids = (row) => {
            return row.id;
        };
        let spec;
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.field);
            }
        }).then((mapFunction) => {
            return db.bulkDocs({
                docs: [
                    { _id: "doc_empty", field: "" },
                    { _id: "doc_null", field: null },
                    { _id: "doc_undefined" /* field undefined */ },
                    { _id: "doc_foo", field: "foo" }
                ]
            }).then(() => {
                spec = ["doc_null", "doc_undefined", "doc_empty"];
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(spec);

                opts = { startkey: "", endkey: "foo" };
                spec = ["doc_empty", "doc_foo"];
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(spec);

                opts = { startkey: null, endkey: null };
                spec = ["doc_null", "doc_undefined"];
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(spec);

                opts.descending = true;
                spec.reverse();
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(spec);
            });
        });
    });

    it("#238 later non-winning revisions", () => {
        const db = new DB(dbName);

        return createView(db, {
            map: (doc) => {
                emit(doc.name);
            }
        }).then((mapFun) => {
            return db.bulkDocs([{
                _id: "doc",
                name: "zoot",
                _rev: "2-x",
                _revisions: {
                    start: 2,
                    ids: ["x", "y"]
                }
            }], { new_edits: false }).then(() => {
                return db.query(mapFun);
            }).then((res) => {
                expect(res.rows).to.have.length(1);
                expect(res.rows[0].id).to.be.equal("doc");
                expect(res.rows[0].key).to.be.equal("zoot");
                return db.bulkDocs([{
                    _id: "doc",
                    name: "suit",
                    _rev: "2-w",
                    _revisions: {
                        start: 2,
                        ids: ["w", "y"]
                    }
                }], { new_edits: false });
            }).then(() => {
                return db.query(mapFun);
            }).then((res) => {
                expect(res.rows).to.have.length(1);
                expect(res.rows[0].id).to.be.equal("doc");
                expect(res.rows[0].key).to.be.equal("zoot");
            });
        });
    });

    it("#238 later non-winning deleted revisions", () => {
        const db = new DB(dbName);

        return createView(db, {
            map: (doc) => {
                emit(doc.name);
            }
        }).then((mapFun) => {
            return db.bulkDocs([{
                _id: "doc",
                name: "zoot",
                _rev: "2-x",
                _revisions: {
                    start: 2,
                    ids: ["x", "y"]
                }
            }], { new_edits: false }).then(() => {
                return db.query(mapFun);
            }).then((res) => {
                expect(res.rows).to.have.length(1);
                expect(res.rows[0].id).to.be.equal("doc");
                expect(res.rows[0].key).to.be.equal("zoot");
                return db.bulkDocs([{
                    _id: "doc",
                    name: "suit",
                    _deleted: true,
                    _rev: "2-z",
                    _revisions: {
                        start: 2,
                        ids: ["z", "y"]
                    }
                }], { new_edits: false });
            }).then(() => {
                return db.query(mapFun);
            }).then((res) => {
                expect(res.rows).to.have.length(1);
                expect(res.rows[0].id).to.be.equal("doc");
                expect(res.rows[0].key).to.be.equal("zoot");
            });
        });
    });

    it("#238 query with conflicts", () => {
        const db = new DB(dbName);

        return createView(db, {
            map: (doc) => {
                emit(doc.name);
            }
        }).then((mapFun) => {
            return db.bulkDocs([

                {
                    _id: "doc",
                    name: "zab",
                    _rev: "2-y",
                    _revisions: {
                        start: 1,
                        ids: ["y"]
                    }
                }, {
                    _id: "doc",
                    name: "zoot",
                    _rev: "2-x",
                    _revisions: {
                        start: 2,
                        ids: ["x", "y"]
                    }
                }
            ], { new_edits: false }).then(() => {
                return db.query(mapFun);
            }).then((res) => {
                expect(res.rows).to.have.length(1);
                expect(res.rows[0].id).to.be.equal("doc");
                expect(res.rows[0].key).to.be.equal("zoot");
                return db.bulkDocs([
                    {
                        _id: "doc",
                        name: "suit",
                        _rev: "2-w",
                        _revisions: {
                            start: 2,
                            ids: ["w", "y"]
                        }
                    }, {
                        _id: "doc",
                        name: "zorb",
                        _rev: "2-z",
                        _revisions: {
                            start: 2,
                            ids: ["z", "y"]
                        }
                    }
                ], { new_edits: false });
            }).then(() => {
                return db.query(mapFun);
            }).then((res) => {
                expect(res.rows).to.have.length(1);
                expect(res.rows[0].id).to.be.equal("doc");
                expect(res.rows[0].key).to.be.equal("zorb");
            });
        });
    });

    it("Testing ordering with startkey/endkey/key", () => {
        let opts = { startkey: "1", endkey: "4" };
        const ids = (row) => {
            return row.id;
        };
        let spec;
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.field, null);
            }
        }).then((mapFunction) => {
            return db.bulkDocs({
                docs: [
                    { _id: "h", field: "4" },
                    { _id: "a", field: "1" },
                    { _id: "e", field: "2" },
                    { _id: "c", field: "1" },
                    { _id: "f", field: "3" },
                    { _id: "g", field: "4" },
                    { _id: "d", field: "2" },
                    { _id: "b", field: "1" }
                ]
            }).then(() => {
                spec = ["a", "b", "c", "d", "e", "f", "g", "h"];
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(spec);

                opts = { key: "1" };
                spec = ["a", "b", "c"];
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(spec);

                opts = { key: "2" };
                spec = ["d", "e"];
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(spec);

                opts.descending = true;
                spec.reverse();
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(spec, "reverse order");
            });
        });
    });

    it("opts.keys should work with complex keys", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo, doc.foo);
            }
        }).then((mapFunction) => {
            const keys = [
                { key: "missing" },
                ["test", 1],
                { key1: "value1" },
                ["missing"],
                [0, 0]
            ];
            return db.bulkDocs({
                docs: [
                    { foo: { key2: "value2" } },
                    { foo: { key1: "value1" } },
                    { foo: [0, 0] },
                    { foo: ["test", 1] },
                    { foo: [0, false] }
                ]
            }).then(() => {
                const opts = { keys };
                return db.query(mapFunction, opts);
            }).then((data) => {
                expect(data.rows).to.have.length(3);
                expect(data.rows[0].value).to.be.deep.equal(keys[1]);
                expect(data.rows[1].value).to.be.deep.equal(keys[2]);
                expect(data.rows[2].value).to.be.deep.equal(keys[4]);
            });
        });
    });

    it("Testing ordering with dates", () => {
        const ids = (row) => {
            return row.id;
        };
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.date, null);
            }
        }).then((mapFunction) => {
            return db.bulkDocs({
                docs: [
                    { _id: "1969", date: "1969 was when Space Oddity hit" },
                    { _id: "1971", date: new Date("1971-12-17T00:00:00.000Z") }, // Hunky Dory was released
                    { _id: "1972", date: "1972 was when Ziggy landed on Earth" },
                    { _id: "1977", date: new Date("1977-01-14T00:00:00.000Z") }, // Low was released
                    { _id: "1985", date: "1985+ is better left unmentioned" }
                ]
            }).then(() => {
                return db.query(mapFunction);
            }).then((data) => {
                expect(data.rows.map(ids)).to.be.deep.equal(["1969", "1971", "1972", "1977", "1985"]);
            });
        });
    });

    it("should work with a joined doc", () => {
        const change = (row) => {
            return [row.key, row.doc._id, row.doc.val];
        };
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                if (doc.join) {
                    emit(doc.color, { _id: doc.join });
                }
            }
        }).then((mapFunction) => {
            return db.bulkDocs({
                docs: [
                    { _id: "a", join: "b", color: "green" },
                    { _id: "b", val: "c" },
                    { _id: "d", join: "f", color: "red" }
                ]
            }).then(() => {
                return db.query(mapFunction, { include_docs: true });
            }).then((resp) => {
                expect(change(resp.rows[0])).to.be.deep.equal(["green", "b", "c"]);
            });
        });
    });

    it("should query correctly with a variety of criteria", () => {
        const db = new DB(dbName);

        return createView(db, {
            map: (doc) => {
                emit(doc._id);
            }
        }).then((mapFun) => {

            const docs = [
                { _id: "0" },
                { _id: "1" },
                { _id: "2" },
                { _id: "3" },
                { _id: "4" },
                { _id: "5" },
                { _id: "6" },
                { _id: "7" },
                { _id: "8" },
                { _id: "9" }
            ];
            return db.bulkDocs({ docs }).then((res) => {
                docs[3]._deleted = true;
                docs[7]._deleted = true;
                docs[3]._rev = res[3].rev;
                docs[7]._rev = res[7].rev;
                return db.remove(docs[3]);
            }).then(() => {
                return db.remove(docs[7]);
            }).then(() => {
                return db.query(mapFun, {});
            }).then((res) => {
                expect(res.rows).to.have.length(8, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { startkey: "5" });
            }).then((res) => {
                expect(res.rows).to.have.length(4, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { startkey: "5", skip: 2, limit: 10 });
            }).then((res) => {
                expect(res.rows).to.have.length(2, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { startkey: "5", descending: true, skip: 1 });
            }).then((res) => {
                expect(res.rows).to.have.length(4, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { startkey: "5", endkey: "z" });
            }).then((res) => {
                expect(res.rows).to.have.length(4, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { startkey: "5", endkey: "5" });
            }).then((res) => {
                expect(res.rows).to.have.length(1, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { startkey: "5", endkey: "4", descending: true });
            }).then((res) => {
                expect(res.rows).to.have.length(2, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { startkey: "3", endkey: "7", descending: false });
            }).then((res) => {
                expect(res.rows).to.have.length(3, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { startkey: "7", endkey: "3", descending: true });
            }).then((res) => {
                expect(res.rows).to.have.length(3, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { startkey: "", endkey: "0" });
            }).then((res) => {
                expect(res.rows).to.have.length(1, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { keys: ["0", "1", "3"] });
            }).then((res) => {
                expect(res.rows).to.have.length(2, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { keys: ["0", "1", "0", "2", "1", "1"] });
            }).then((res) => {
                expect(res.rows).to.have.length(6, "correctly return rows");
                expect(res.rows.map((row) => {
                    return row.key;
                })).to.be.deep.equal(["0", "1", "0", "2", "1", "1"]);
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { keys: [] });
            }).then((res) => {
                expect(res.rows).to.have.length(0, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { keys: ["7"] });
            }).then((res) => {
                expect(res.rows).to.have.length(0, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { key: "3" });
            }).then((res) => {
                expect(res.rows).to.have.length(0, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { key: "2" });
            }).then((res) => {
                expect(res.rows).to.have.length(1, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");
                return db.query(mapFun, { key: "z" });
            }).then((res) => {
                expect(res.rows).to.have.length(0, "correctly return rows");
                expect(res.total_rows).to.be.equal(8, "correctly return total_rows");

                return db.query(mapFun, { startkey: "5", endkey: "4" }).then((res) => {
                    expect(res).to.not.exist();
                }).catch((err) => {
                    expect(err.status).to.be.equal(400);
                    expect(err.message).to.be.a("string");
                });
            });
        });
    });

    it("should query correctly with skip/limit and multiple keys/values", () => {
        const db = new DB(dbName);
        const docs = {
            docs: [
                { _id: "doc1", foo: "foo", bar: "bar" },
                { _id: "doc2", foo: "foo", bar: "bar" }
            ]
        };
        const getValues = function (res) {
            return res.value;
        };
        const getIds = function (res) {
            return res.id;
        };

        return createView(db, {
            map: (doc) => {
                emit(doc.foo, "fooValue");
                emit(doc.foo);
                emit(doc.bar);
                emit(doc.bar, "crayon!");
                emit(doc.bar, "multiple values!");
                emit(doc.bar, "crayon!");
            }
        }).then((mapFun) => {

            return db.bulkDocs(docs).then(() => {
                return db.query(mapFun, {});
            }).then((res) => {
                expect(res.rows).to.have.length(12, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                expect(res.rows.map(getValues)).to.be.deep.equal([null, "crayon!", "crayon!", "multiple values!", null, "crayon!", "crayon!", "multiple values!", null, "fooValue", null, "fooValue"]);
                expect(res.rows.map(getIds)).to.be.deep.equal(["doc1", "doc1", "doc1", "doc1", "doc2", "doc2", "doc2", "doc2", "doc1", "doc1", "doc2", "doc2"]);
                return db.query(mapFun, { startkey: "foo" });
            }).then((res) => {
                expect(res.rows).to.have.length(4, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                expect(res.rows.map(getValues)).to.be.deep.equal([null, "fooValue", null, "fooValue"]);
                expect(res.rows.map(getIds)).to.be.deep.equal(["doc1", "doc1", "doc2", "doc2"]);
                return db.query(mapFun, { startkey: "foo", endkey: "foo" });
            }).then((res) => {
                expect(res.rows).to.have.length(4, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                return db.query(mapFun, { startkey: "bar", endkey: "bar" });
            }).then((res) => {
                expect(res.rows).to.have.length(8, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                return db.query(mapFun, { startkey: "foo", limit: 1 });
            }).then((res) => {
                expect(res.rows).to.have.length(1, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                expect(res.rows.map(getValues)).to.be.deep.equal([null]);
                expect(res.rows.map(getIds)).to.be.deep.equal(["doc1"]);
                return db.query(mapFun, { startkey: "foo", limit: 2 });
            }).then((res) => {
                expect(res.rows).to.have.length(2, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                return db.query(mapFun, { startkey: "foo", limit: 1000 });
            }).then((res) => {
                expect(res.rows).to.have.length(4, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                return db.query(mapFun, { startkey: "foo", skip: 1 });
            }).then((res) => {
                expect(res.rows).to.have.length(3, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                return db.query(mapFun, { startkey: "foo", skip: 3, limit: 0 });
            }).then((res) => {
                expect(res.rows).to.have.length(0, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                return db.query(mapFun, { startkey: "foo", skip: 3, limit: 1 });
            }).then((res) => {
                expect(res.rows).to.have.length(1, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                expect(res.rows.map(getValues)).to.be.deep.equal(["fooValue"]);
                expect(res.rows.map(getIds)).to.be.deep.equal(["doc2"]);
                return db.query(mapFun, { startkey: "quux", skip: 3, limit: 1 });
            }).then((res) => {
                expect(res.rows).to.have.length(0, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
                return db.query(mapFun, { startkey: "bar", limit: 2 });
            }).then((res) => {
                expect(res.rows).to.have.length(2, "correctly return rows");
                expect(res.total_rows).to.be.equal(12, "correctly return total_rows");
            });
        });
    });

    it("should query correctly with undefined key/values", () => {
        const db = new DB(dbName);
        const docs = {
            docs: [
                { _id: "doc1" },
                { _id: "doc2" }
            ]
        };
        return createView(db, {
            map: () => {
                emit();
            }
        }).then((mapFun) => {
            return db.bulkDocs(docs).then(() => {
                return db.query(mapFun, {});
            }).then((res) => {
                expect(res.total_rows).to.be.equal(2, "correctly return total_rows");
                expect(res.rows).to.be.deep.equal([
                    {
                        key: null,
                        value: null,
                        id: "doc1"
                    },
                    {
                        key: null,
                        value: null,
                        id: "doc2"
                    }
                ]);
            });
        });
    });

    it("should query correctly with no docs", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: () => {
                emit();
            }
        }).then((queryFun) => {
            return db.query(queryFun).then((res) => {
                expect(res.total_rows).to.be.equal(0, "total_rows");
                expect(res.offset).to.be.equal(0);
                expect(res.rows).to.be.deep.equal([]);
            });
        });
    });

    it("should query correctly with no emits", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: () => {
            }
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { _id: "foo" },
                    { _id: "bar" }
                ]
            }).then(() => {
                return db.query(queryFun).then((res) => {
                    expect(res.total_rows).to.be.equal(0, "total_rows");
                    expect(res.offset).to.be.equal(0);
                    expect(res.rows).to.be.deep.equal([]);
                });
            });
        });
    });

    it("should correctly return results when reducing or not reducing", () => {
        const keyValues = (row) => {
            return { key: row.key, value: row.value };
        };
        const keys = (row) => {
            return row.key;
        };
        const values = (row) => {
            return row.value;
        };
        const docIds = (row) => {
            return row.doc._id;
        };
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.name);
            },
            reduce: "_count"
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { name: "foo", _id: "1" },
                    { name: "bar", _id: "2" },
                    { name: "foo", _id: "3" },
                    { name: "quux", _id: "4" },
                    { name: "foo", _id: "5" },
                    { name: "foo", _id: "6" },
                    { name: "foo", _id: "7" }

                ]
            }).then(() => {
                return db.query(queryFun);
            }).then((res) => {
                expect(res.rows[0]).to.have.all.keys(["key", "value"]);
                expect(res.total_rows).to.not.exist();
                expect(res.offset).to.not.exist();
                expect(res.rows.map(keyValues)).to.be.deep.equal([
                    {
                        key: null,
                        value: 7
                    }
                ]);
                return db.query(queryFun, { group: true });
            }).then((res) => {
                expect(res.rows[0]).to.have.all.keys(["key", "value"]);
                expect(res.total_rows).to.not.exist();
                expect(res.offset).to.not.exist();
                expect(res.rows.map(keyValues)).to.be.deep.equal([
                    {
                        key: "bar",
                        value: 1
                    },
                    {
                        key: "foo",
                        value: 5
                    },
                    {
                        key: "quux",
                        value: 1
                    }
                ]);
                return db.query(queryFun, { reduce: false });
            }).then((res) => {
                expect(res.rows[0]).to.have.all.keys(["id", "key", "value"]);
                expect(res.total_rows).to.be.equal(7, "total_rows1");
                expect(res.offset).to.be.equal(0, "offset1");
                expect(res.rows.map(keys)).to.be.deep.equal([
                    "bar", "foo", "foo", "foo", "foo", "foo", "quux"
                ]);
                expect(res.rows.map(values)).to.be.deep.equal([
                    null, null, null, null, null, null, null
                ]);
                return db.query(queryFun, { reduce: false, skip: 3 });
            }).then((res) => {
                expect(res.rows[0]).to.have.all.keys(["id", "key", "value"]);
                expect(res.total_rows).to.be.equal(7, "total_rows2");
                expect(res.offset).to.be.equal(3, "offset2");
                expect(res.rows.map(keys)).to.be.deep.equal([
                    "foo", "foo", "foo", "quux"
                ]);
                return db.query(queryFun, { reduce: false, include_docs: true });
            }).then((res) => {
                expect(res.rows[0]).to.have.all.keys(["doc", "id", "key", "value"]);
                expect(res.total_rows).to.be.equal(7, "total_rows3");
                expect(res.offset).to.be.equal(0, "offset3");
                expect(res.rows.map(keys)).to.be.deep.equal([
                    "bar", "foo", "foo", "foo", "foo", "foo", "quux"
                ]);
                expect(res.rows.map(values)).to.be.deep.equal([
                    null, null, null, null, null, null, null
                ]);
                expect(res.rows.map(docIds)).to.be.deep.equal([
                    "2", "1", "3", "5", "6", "7", "4"
                ]);
                return db.query(queryFun, { include_docs: true }).then((res) => {
                    expect(res).to.not.exist();
                }).catch((err) => {
                    expect(err.status).to.be.equal(400);
                    expect(err.message).to.be.a("string");
                    // include_docs is invalid for reduce
                });
            });
        });
    });

    it("should query correctly after replicating and other ddoc", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.name);
            }
        }).then((queryFun) => {
            return db.bulkDocs({ docs: [{ name: "foobar" }] }).then(() => {
                return db.query(queryFun);
            }).then((res) => {
                expect(res.rows.map((x) => {
                    return x.key;
                })).to.be.deep.equal([
                    "foobar"
                ], "test db before replicating");
                const db2 = new DB("local-other");
                return db.replicate.to(db2).then(() => {
                    return db.query(queryFun);
                }).then((res) => {
                    expect(res.rows.map((x) => {
                        return x.key;
                    })).to.be.deep.equal([
                        "foobar"
                    ], "test db after replicating");
                    return db.put({
                        _id: "_design/other_ddoc", views: {
                            map: "function(doc) { emit(doc._id); }"
                        }
                    });
                }).then(() => {
                    // the random ddoc adds a single change that we don't
                    // care about. testing this increases our coverage
                    return db.query(queryFun);
                }).then((res) => {
                    expect(res.rows.map((x) => {
                        return x.key;
                    })).to.be.deep.equal([
                        "foobar"
                    ], "test db after adding random ddoc");
                    return db2.query(queryFun);
                }).then((res) => {
                    expect(res.rows.map((x) => {
                        return x.key;
                    })).to.be.deep.equal([
                        "foobar"
                    ], "test db2");
                }).catch((err) => {
                    return new DB("local-other").destroy().then(() => {
                        throw err;
                    });
                }).then(() => {
                    return new DB("local-other").destroy();
                });
            });
        });
    });

    it("should query correctly after many edits", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.name, doc.likes);
            }
        }).then((queryFun) => {
            const docs = [
                { _id: "1", name: "leonardo" },
                { _id: "2", name: "michelangelo" },
                { _id: "3", name: "donatello" },
                { _id: "4", name: "rafael" },
                { _id: "5", name: "april o'neil" },
                { _id: "6", name: "splinter" },
                { _id: "7", name: "shredder" },
                { _id: "8", name: "krang" },
                { _id: "9", name: "rocksteady" },
                { _id: "a", name: "bebop" },
                { _id: "b", name: "casey jones" },
                { _id: "c", name: "casey jones" },
                { _id: "d", name: "baxter stockman" },
                { _id: "e", name: "general chaos" },
                { _id: "f", name: "rahzar" },
                { _id: "g", name: "tokka" },
                { _id: "h", name: "usagi yojimbo" },
                { _id: "i", name: "rat king" },
                { _id: "j", name: "metalhead" },
                { _id: "k", name: "slash" },
                { _id: "l", name: "ace duck" }
            ];

            for (let i = 0; i < 100; i++) {
                docs.push({
                    _id: `z-${i + 1000}`, // for correct string ordering
                    name: `random foot soldier #${i}`
                });
            }

            const update = (res, docFun) => {
                for (let i = 0; i < res.length; i++) {
                    docs[i]._rev = res[i].rev;
                    docFun(docs[i]);
                }
                return db.bulkDocs({ docs });
            };
            return db.bulkDocs({ docs }).then((res) => {
                return update(res, (doc) => {
                    doc.likes = "pizza";
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc.knows = "kung fu";
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc.likes = "fighting";
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc._deleted = true;
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc._deleted = false;
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc.name = `${doc.name}1`;
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc.name = `${doc.name}2`;
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc.name = "nameless";
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc._deleted = true;
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc.likes = "turtles";
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc._deleted = false;
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc.whatever = "quux";
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc.stuff = "baz";
                });
            }).then((res) => {
                return update(res, (doc) => {
                    doc.things = "foo";
                });
            }).then(() => {
                return db.query(queryFun);
            }).then((res) => {
                expect(res.total_rows).to.be.equal(docs.length, "expected total_rows");
                expect(res.rows.map((row) => {
                    return [row.id, row.key, row.value];
                })).to.be.deep.equal(docs.map((doc) => {
                    return [doc._id, "nameless", "turtles"];
                }), "key values match");
            });
        });
    });

    it("should query correctly with staggered seqs", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.name);
            }
        }).then((queryFun) => {
            const docs = [];

            for (let i = 0; i < 200; i++) {
                docs.push({
                    _id: `doc-${i + 1000}`, // for correct string ordering
                    name: "gen1"
                });
            }
            return db.bulkDocs({ docs }).then((infos) => {
                docs.forEach((doc, i) => {
                    doc._rev = infos[i].rev;
                    doc.name = "gen2";
                });
                docs.reverse();
                return db.bulkDocs({ docs });
            }).then((infos) => {
                docs.forEach((doc, i) => {
                    doc._rev = infos[i].rev;
                    doc.name = "gen-3";
                });
                docs.reverse();
                return db.bulkDocs({ docs });
            }).then((infos) => {
                docs.forEach((doc, i) => {
                    doc._rev = infos[i].rev;
                    doc.name = "gen-4-odd";
                });
                const docsToUpdate = docs.filter((doc, i) => {
                    return i % 2 === 1;
                });
                docsToUpdate.reverse();
                return db.bulkDocs({ docs: docsToUpdate });
            }).then(() => {
                return db.query(queryFun);
            }).then((res) => {
                const expected = docs.map((doc, i) => {
                    const key = i % 2 === 1 ? "gen-4-odd" : "gen-3";
                    return { key, id: doc._id, value: null };
                });
                expected.sort((a, b) => {
                    if (a.key !== b.key) {
                        return a.key < b.key ? -1 : 1;
                    }
                    return a.id < b.id ? -1 : 1;
                });
                expect(res.rows).to.be.deep.equal(expected);
            });
        });
    });

    it("should return error when multi-key fetch & group=false", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc._id);
            },
            reduce: "_sum"
        }).then((queryFun) => {
            const keys = ["1", "2"];
            let opts = {
                keys,
                group: false
            };
            return db.query(queryFun, opts).then((res) => {
                expect(res).to.not.exist();
            }).catch((err) => {
                expect(err.status).to.be.equal(400);
                opts = { keys };
                return db.query(queryFun, opts).then((res) => {
                    expect(res).to.not.exist();
                }).catch((err) => {
                    expect(err.status).to.be.equal(400);
                    opts = { keys, reduce: false };
                    return db.query(queryFun, opts).then(() => {
                        opts = { keys, group: true };
                        return db.query(queryFun, opts);
                    });
                });
            });
        });
    });

    it("should handle user errors in map functions", () => {
        const db = new DB(dbName);
        let err;
        db.on("error", (e) => {
            err = e;
        });
        return createView(db, {
            map: (doc) => {
                emit(doc.nonexistent.foo);
            }
        }).then((queryFun) => {
            return db.put({ name: "bar", _id: "1" }).then(() => {
                return db.query(queryFun);
            }).then((res) => {
                expect(res.rows).to.have.length(0);
                expect(err).to.exist();
            });
        });
    });

    it("should handle user errors in reduce functions", () => {
        const db = new DB(dbName);
        let err;
        db.on("error", (e) => {
            err = e;
        });
        return createView(db, {
            map: (doc) => {
                emit(doc.name);
            },
            reduce: (keys) => {
                return keys[0].foo.bar;
            }
        }).then((queryFun) => {
            return db.put({ name: "bar", _id: "1" }).then(() => {
                return db.query(queryFun, { group: true });
            }).then((res) => {
                expect(res.rows.map((row) => {
                    return row.key;
                })).to.be.deep.equal(["bar"]);
                return db.query(queryFun, { reduce: false });
            }).then((res) => {
                expect(res.rows.map((row) => {
                    return row.key;
                })).to.deep.equal(["bar"]);
                expect(err).to.exist();
            });
        });
    });

    it("should handle reduce returning undefined", () => {
        const db = new DB(dbName);
        let err;
        db.on("error", (e) => {
            err = e;
        });
        return createView(db, {
            map: (doc) => {
                emit(doc.name);
            },
            reduce: () => {
            }
        }).then((queryFun) => {
            return db.put({ name: "bar", _id: "1" }).then(() => {
                return db.query(queryFun, { group: true });
            }).then((res) => {
                expect(res.rows.map((row) => {
                    return row.key;
                })).to.be.deep.equal(["bar"]);
                return db.query(queryFun, { reduce: false });
            }).then((res) => {
                expect(res.rows.map((row) => {
                    return row.key;
                })).to.be.deep.equal(["bar"]);
                expect(err).to.not.exist();
            });
        });
    });

    it("should properly query custom reduce functions", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.name, doc.count);
            },
            reduce: (keys, values, rereduce) => {
                // calculate the average count per name
                if (!rereduce) {
                    const result = {
                        sum: sum(values),
                        count: values.length
                    };
                    result.average = result.sum / result.count;
                    return result;
                }
                const thisSum = sum(values.map((value) => {
                    return value.sum;
                }));
                const thisCount = sum(values.map((value) => {
                    return value.count;
                }));
                return {
                    sum: thisSum,
                    count: thisCount,
                    average: (thisSum / thisCount)
                };

            }
        }).then((queryFun) => {
            return db.bulkDocs({
                docs: [
                    { name: "foo", count: 1 },
                    { name: "bar", count: 7 },
                    { name: "foo", count: 3 },
                    { name: "quux", count: 3 },
                    { name: "foo", count: 3 },
                    { name: "foo", count: 0 },
                    { name: "foo", count: 4 },
                    { name: "baz", count: 3 },
                    { name: "baz", count: 0 },
                    { name: "baz", count: 2 }
                ]
            }).then(() => {
                return db.query(queryFun, { group: true });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                        {
                            key: "bar",
                            value: { sum: 7, count: 1, average: 7 }
                        },
                        {
                            key: "baz",
                            value: { sum: 5, count: 3, average: (5 / 3) }
                        },
                        {
                            key: "foo",
                            value: { sum: 11, count: 5, average: (11 / 5) }
                        },
                        {
                            key: "quux",
                            value: { sum: 3, count: 1, average: 3 }
                        }
                    ]
                }, "all");
                return db.query(queryFun, { group: false });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                        {
                            key: null,
                            value: { sum: 26, count: 10, average: 2.6 }
                        }
                    ]
                }, "group=false");
                return db.query(queryFun, { group: true, startkey: "bar", endkey: "baz", skip: 1 });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                        {
                            key: "baz",
                            value: { sum: 5, count: 3, average: (5 / 3) }
                        }
                    ]
                }, "bar-baz skip 1");
                return db.query(queryFun, { group: true, endkey: "baz" });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                        {
                            key: "bar",
                            value: { sum: 7, count: 1, average: 7 }
                        },
                        {
                            key: "baz",
                            value: { sum: 5, count: 3, average: (5 / 3) }
                        }
                    ]
                }, "-baz");
                return db.query(queryFun, { group: true, startkey: "foo" });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                        {
                            key: "foo",
                            value: { sum: 11, count: 5, average: (11 / 5) }
                        },
                        {
                            key: "quux",
                            value: { sum: 3, count: 1, average: 3 }
                        }
                    ]
                }, "foo-");
                return db.query(queryFun, { group: true, startkey: "foo", descending: true });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                        {
                            key: "foo",
                            value: { sum: 11, count: 5, average: (11 / 5) }
                        },
                        {
                            key: "baz",
                            value: { sum: 5, count: 3, average: (5 / 3) }
                        },
                        {
                            key: "bar",
                            value: { sum: 7, count: 1, average: 7 }
                        }
                    ]
                }, "foo- descending=true");
                return db.query(queryFun, { group: true, startkey: "quux", skip: 1 });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                    ]
                }, "quux skip 1");
                return db.query(queryFun, { group: true, startkey: "quux", limit: 0 });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                    ]
                }, "quux limit 0");
                return db.query(queryFun, { group: true, startkey: "bar", endkey: "baz" });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                        {
                            key: "bar",
                            value: { sum: 7, count: 1, average: 7 }
                        },
                        {
                            key: "baz",
                            value: { sum: 5, count: 3, average: (5 / 3) }
                        }
                    ]
                }, "bar-baz");
                return db.query(queryFun, { group: true, keys: ["bar", "baz"], limit: 1 });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                        {
                            key: "bar",
                            value: { sum: 7, count: 1, average: 7 }
                        }
                    ]
                }, "bar & baz");
                return db.query(queryFun, { group: true, keys: ["bar", "baz"], limit: 0 });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                    ]
                }, "bar & baz limit 0");
                return db.query(queryFun, { group: true, key: "bar", limit: 0 });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                    ]
                }, "key=bar limit 0");
                return db.query(queryFun, { group: true, key: "bar" });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                        {
                            key: "bar",
                            value: { sum: 7, count: 1, average: 7 }
                        }
                    ]
                }, "key=bar");
                return db.query(queryFun, { group: true, key: "zork" });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                    ]
                }, "zork");
                return db.query(queryFun, { group: true, keys: [] });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                    ]
                }, "keys=[]");
                return db.query(queryFun, { group: true, key: null });
            }).then((res) => {
                expect(res).to.be.deep.equal({
                    rows: [
                    ]
                }, "key=null");
            });
        });
    });

    it("should handle many doc changes", () => {
        let docs = [{ _id: "0" }, { _id: "1" }, { _id: "2" }];

        const keySets = [
            [1],
            [2, 3],
            [4],
            [5],
            [6, 7, 3],
            [],
            [2, 3],
            [1, 2],
            [],
            [9],
            [9, 3, 2, 1]
        ];

        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                doc.keys.forEach((key) => {
                    emit(key);
                });
            }
        }).then((mapFun) => {
            return db.bulkDocs({ docs }).then(() => {
                const tasks = keySets.map((keys, i) => {
                    return function () {
                        const expectedResponseKeys = [];
                        return db.allDocs({
                            keys: ["0", "1", "2"],
                            include_docs: true
                        }).then((res) => {
                            docs = res.rows.map((x) => {
                                return x.doc;
                            });
                            docs.forEach((doc, j) => {
                                doc.keys = keySets[(i + j) % keySets.length];
                                doc.keys.forEach((key) => {
                                    expectedResponseKeys.push(key);
                                });
                            });
                            expectedResponseKeys.sort();
                            return db.bulkDocs({ docs });
                        }).then(() => {
                            return db.query(mapFun);
                        }).then((res) => {
                            const actualKeys = res.rows.map((x) => {
                                return x.key;
                            });
                            expect(actualKeys).to.be.deep.equal(expectedResponseKeys);
                        });
                    };
                });
                const chain = tasks.shift()();
                const getNext = () => {
                    const task = tasks.shift();
                    return task && function () {
                        return task().then(getNext());
                    };
                };
                return chain.then(getNext());
            });
        });
    });

    it("should work with post", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc._id);
            }
        }).then((mapFun) => {
            return db.bulkDocs({ docs: [{ _id: "bazbazbazb" }] }).then(() => {
                let i = 300;
                const keys = [];
                while (i--) {
                    keys.push("bazbazbazb");
                }
                return db.query(mapFun, { keys }).then((resp) => {
                    expect(resp.total_rows).to.be.equal(1);
                    expect(resp.rows).to.have.length(300);
                    return resp.rows.every((row) => {
                        return row.id === "bazbazbazb" && row.key === "bazbazbazb";
                    });
                });
            });
        }).then((res) => {
            expect(res).to.be.true(););
        });
    });

    it("should accept trailing ';' in a map definition (#178)", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: "function(doc){};\n"
        }).then((queryFun) => {
            return db.query(queryFun);
        }).then((res) => {
            expect(res).to.be.deep.equal({
                offset: 0,
                rows: [],
                total_rows: 0
            });
        });
    });

    it("should throw a 404 when no funcs found in ddoc (#181)", async () => {
        const db = new DB(dbName);
        await db.put({
            _id: "_design/test"
        });
        const err = await assert.throws(async () => {
            await db.query("test/unexisting");
        });
        expect(err.status).to.be.equal(404);
    });

    it("should continue indexing when map eval fails (#214)", () => {
        const db = new DB(dbName);
        let err;
        db.on("error", (e) => {
            err = e;
        });
        return createView(db, {
            map: (doc) => {
                emit(doc.foo.bar, doc);
            }
        }).then((view) => {
            return db.bulkDocs({
                docs: [
                    {
                        foo: {
                            bar: "foobar"
                        }
                    },
                    { notfoo: "thisWillThrow" },
                    {
                        foo: {
                            bar: "otherFoobar"
                        }
                    }
                ]
            }).then(() => {
                return db.query(view);
            }).then((res) => {
                expect(err).to.exist();
                expect(res.rows).to.have.length(2, "Ignore the wrongly formatted doc");
                return db.query(view);
            }).then((res) => {
                expect(res.rows).to.have.length(2, "Ignore the wrongly formatted doc");
            });

        });
    });

    it("should continue indexing when map eval fails, even without a listener (#214)", () => {
        const db = new DB(dbName);
        return createView(db, {
            map: (doc) => {
                emit(doc.foo.bar, doc);
            }
        }).then((view) => {
            return db.bulkDocs({
                docs: [
                    {
                        foo: {
                            bar: "foobar"
                        }
                    },
                    { notfoo: "thisWillThrow" },
                    {
                        foo: {
                            bar: "otherFoobar"
                        }
                    }
                ]
            }).then(() => {
                return db.query(view);
            }).then((res) => {
                expect(res.rows).to.have.length(2, "Ignore the wrongly formatted doc");
                return db.query(view);
            }).then((res) => {
                expect(res.rows).to.have.length(2, "Ignore the wrongly formatted doc");
            });
        });
    });

    it("should update the emitted value", { timeout: 120000 }, () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 300; i++) {
            docs.push({
                _id: i.toString(),
                name: "foo",
                count: 1
            });
        }

        return createView(db, {
            map: "function(doc){emit(doc.name, doc.count);};\n"
        }).then((queryFun) => {
            return db.bulkDocs({ docs }).then((res) => {
                for (let i = 0; i < res.length; i++) {
                    docs[i]._rev = res[i].rev;
                }
                return db.query(queryFun);
            }).then((res) => {
                const values = res.rows.map((x) => {
                    return x.value;
                });
                expect(values).to.have.length(docs.length);
                expect(values[0]).to.be.equal(1);
                docs.forEach((doc) => {
                    doc.count = 2;
                });
                return db.bulkDocs({ docs });
            }).then(() => {
                return db.query(queryFun);
            }).then((res) => {
                const values = res.rows.map((x) => {
                    return x.value;
                });
                expect(values).to.have.length(docs.length);
                expect(values[0]).to.be.equal(2);
            });
        });
    });

    it.only("#6230 Test db.query() opts update_seq: false", () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 4; i++) {
            docs.push({
                _id: i.toString(),
                name: "foo"
            });
        }
        return createView(db, {
            map: "function(doc){emit(doc.name);};\n"
        }).then((queryFun) => {
            return db.bulkDocs({ docs }).then(() => {
                return db.query(queryFun, { update_seq: false });
            }).then((result) => {
                assert.lengthOf(result.rows, 4);
                assert.notExists(result.update_seq);
            });
        });
    });


    it.skip("#6230 Test db.query() opts update_seq: true", (done) => {
        const db = new DB(dbName);
        testUtils.isPouchDbServer((isPouchDbServer) => {
            if (isPouchDbServer) {
                // pouchdb-server does not currently support opts.update_seq
                return done();
            }
            const docs = [];
            for (let i = 0; i < 4; i++) {
                docs.push({
                    _id: i.toString(),
                    name: "foo"
                });
            }
            return db.bulkDocs({ docs }).then(() => {
                return createView(db, {
                    map: "function(doc){emit(doc.name);};\n"
                });
            }).then((queryFun) => {
                return db.query(queryFun, { update_seq: true });
            }).then((result) => {
                result.rows.should.have.length(4);
                should.exist(result.update_seq);
                result.update_seq.should.satisfy((update_seq) => {
                    if (typeof update_seq === 'number' || typeof update_seq === 'string') {
                        return true;
                    } else {
                        return false;
                    }
                });
                let normSeq = normalizeSeq(result.update_seq);
                normSeq.should.be.a("number");
            }).then(done, done);

            function normalizeSeq(seq) {
                try {
                    if (is.string(seq) && seq.indexOf("-") > 0) {
                        return parseInt(seq.substring(0, seq.indexOf("-")));
                    }
                    return seq;
                } catch (err) {
                    return seq;
                }
            }
        });
    });

    it("#6230 Test db.query() opts with update_seq missing", () => {
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 4; i++) {
            docs.push({
                _id: i.toString(),
                name: "foo"
            });
        }
        return createView(db, {
            map: "function(doc){emit(doc.name);};\n"
        }).then((queryFun) => {
            return db.bulkDocs({ docs }).then(() => {
                return db.query(queryFun);
            }).then((result) => {
                assert.lengthOf(result.rows, 4);
                assert.notExists(result.update_seq);
            });
        });
    });
});
