const { Index } = adone.database.db;

describe("Indexes", () => {

    describe("Insertion", () => {

        it("Can insert pointers to documents in the index correctly when they have the field", () => {
            let idx = new Index({ fieldName: "_id" })
                , doc1 = { a: 5, _id: "hello" }
                , doc2 = { a: 8, _id: "world" }
                , doc3 = { a: 2, _id: "bloup" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            // The underlying BST now has 3 nodes which contain the docs where it's expected
            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.deepEqual(idx.tree.search("hello"), ["hello"]);
            assert.deepEqual(idx.tree.search("world"), ["world"]);
            assert.deepEqual(idx.tree.search("bloup"), ["bloup"]);

            // The nodes contain _id of the actual documents
            assert.equal(idx.tree.search("world")[0], doc2._id);
        });

        it("Inserting twice for the same fieldName in a unique index will result in an error thrown", () => {
            let idx = new Index({ fieldName: "tf", unique: true })
                , doc1 = { a: 5, tf: "hello" }
                ;

            idx.insert(doc1);
            assert.equal(idx.tree.getNumberOfKeys(), 1);
            assert.throws(() => idx.insert(doc1));
        });

        it("Inserting twice for a fieldName the docs dont have with a unique index results in an error thrown", () => {
            let idx = new Index({ fieldName: "nope", unique: true })
                , doc1 = { a: 5, tf: "hello" }
                , doc2 = { a: 5, tf: "world" }
                ;

            idx.insert(doc1);
            assert.equal(idx.tree.getNumberOfKeys(), 1);
            assert.throws(() => idx.insert(doc2));
        });

        it("Inserting twice for a fieldName the docs dont have with a unique and sparse index will not throw, since the docs will be non indexed", () => {
            let idx = new Index({ fieldName: "nope", unique: true, sparse: true })
                , doc1 = { a: 5, tf: "hello" }
                , doc2 = { a: 5, tf: "world" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            assert.equal(idx.tree.getNumberOfKeys(), 0);   // Docs are not indexed
        });

        it("Works with dot notation", () => {
            let idx = new Index({ fieldName: "tf.nested" })
                , doc1 = { _id: 5, tf: { nested: "hello" } }
                , doc2 = { _id: 8, tf: { nested: "world", additional: true } }
                , doc3 = { _id: 2, tf: { nested: "bloup", age: 42 } }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            // The underlying BST now has 3 nodes which contain the docs where it's expected
            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.deepEqual(idx.tree.search("hello"), [doc1._id]);
            assert.deepEqual(idx.tree.search("world"), [doc2._id]);
            assert.deepEqual(idx.tree.search("bloup"), [doc3._id]);
        });

        it("Can insert an array of documents", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 8, tf: "world" }
                , doc3 = { _id: 2, tf: "bloup" }
                ;

            idx.insert([doc1, doc2, doc3]);
            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.deepEqual(idx.tree.search("hello"), [doc1._id]);
            assert.deepEqual(idx.tree.search("world"), [doc2._id]);
            assert.deepEqual(idx.tree.search("bloup"), [doc3._id]);
        });

        it("When inserting an array of elements, if an error is thrown all inserts need to be rolled back", () => {
            let idx = new Index({ fieldName: "tf", unique: true })
                , doc1 = { a: 5, tf: "hello" }
                , doc2 = { a: 8, tf: "world" }
                , doc2b = { a: 84, tf: "world" }
                , doc3 = { a: 2, tf: "bloup" }
                ;

            try {
                idx.insert([doc1, doc2, doc2b, doc3]);
            } catch (e) {
                assert.equal(e.errorType, "uniqueViolated");
            }
            assert.equal(idx.tree.getNumberOfKeys(), 0);
            assert.deepEqual(idx.tree.search("hello"), []);
            assert.deepEqual(idx.tree.search("world"), []);
            assert.deepEqual(idx.tree.search("bloup"), []);
        });

        describe("Array fields", () => {

            it("Inserts one entry per array element in the index", () => {
                let obj = { tf: ["aa", "bb"], really: "yeah", _id: 1 }
                    , obj2 = { tf: "normal", yes: "indeed", _id: 2 }
                    , idx = new Index({ fieldName: "tf" })
                    ;

                idx.insert(obj);
                assert.equal(idx.getAll().length, 2);
                assert.equal(idx.getAll()[0], obj._id);
                assert.equal(idx.getAll()[1], obj._id);

                idx.insert(obj2);
                assert.equal(idx.getAll().length, 3);
            });

            it("Inserts one entry per array element in the index, type-checked", () => {
                let obj = { tf: ["42", 42, new Date(42), 42], really: "yeah", _id: 1 }
                    , idx = new Index({ fieldName: "tf" })
                    ;

                idx.insert(obj);
                assert.equal(idx.getAll().length, 3);
                assert.equal(idx.getAll()[0], obj._id);
                assert.equal(idx.getAll()[1], obj._id);
                assert.equal(idx.getAll()[2], obj._id);
            });

            it("Inserts one entry per unique array element in the index, the unique constraint only holds across documents", () => {
                let obj = { tf: ["aa", "aa"], really: "yeah", _id: 1 }
                    , obj2 = { tf: ["cc", "yy", "cc"], yes: "indeed", _id: 2 }
                    , idx = new Index({ fieldName: "tf", unique: true })
                    ;

                idx.insert(obj);
                assert.equal(idx.getAll().length, 1);
                assert.equal(idx.getAll()[0], obj._id);

                idx.insert(obj2);
                assert.equal(idx.getAll().length, 3);
            });

            it("The unique constraint holds across documents", () => {
                let obj = { tf: ["aa", "aa"], really: "yeah", _id: 1 }
                    , obj2 = { tf: ["cc", "aa", "cc"], yes: "indeed", _id: 2 }
                    , idx = new Index({ fieldName: "tf", unique: true })
                    ;

                idx.insert(obj);
                assert.equal(idx.getAll().length, 1);
                assert.equal(idx.getAll()[0], obj._id);

                assert.throws(() => idx.insert(obj2));
            });

            it("When removing a document, remove it from the index at all unique array elements", () => {
                let obj = { tf: ["aa", "aa"], really: "yeah", _id: 1 }
                    , obj2 = { tf: ["cc", "aa", "cc"], yes: "indeed", _id: 2 }
                    , idx = new Index({ fieldName: "tf" })
                    ;

                idx.insert(obj);
                idx.insert(obj2);
                assert.equal(idx.getMatching("aa").length, 2);
                assert.notEqual(idx.getMatching("aa").indexOf(obj._id), -1);
                assert.notEqual(idx.getMatching("aa").indexOf(obj2._id), -1);
                assert.equal(idx.getMatching("cc").length, 1);

                idx.remove(obj2);
                assert.equal(idx.getMatching("aa").length, 1);
                assert.notEqual(idx.getMatching("aa").indexOf(obj._id), -1);
                assert.equal(idx.getMatching("aa").indexOf(obj2._id), -1);
                assert.equal(idx.getMatching("cc").length, 0);
            });

            it("If a unique constraint is violated when inserting an array key, roll back all inserts before the key", () => {
                let obj = { tf: ["aa", "bb"], really: "yeah" }
                    , obj2 = { tf: ["cc", "dd", "aa", "ee"], yes: "indeed" }
                    , idx = new Index({ fieldName: "tf", unique: true })
                    ;

                idx.insert(obj);
                assert.equal(idx.getAll().length, 2);
                assert.equal(idx.getMatching("aa").length, 1);
                assert.equal(idx.getMatching("bb").length, 1);
                assert.equal(idx.getMatching("cc").length, 0);
                assert.equal(idx.getMatching("dd").length, 0);
                assert.equal(idx.getMatching("ee").length, 0);

                assert.throws(() => idx.insert(obj2));
                assert.equal(idx.getAll().length, 2);
                assert.equal(idx.getMatching("aa").length, 1);
                assert.equal(idx.getMatching("bb").length, 1);
                assert.equal(idx.getMatching("cc").length, 0);
                assert.equal(idx.getMatching("dd").length, 0);
                assert.equal(idx.getMatching("ee").length, 0);
            });

        });   // ==== End of 'Array fields' ==== //

    });   // ==== End of 'Insertion' ==== //


    describe("Removal", () => {

        it("Can remove pointers from the index, even when multiple documents have the same key", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { a: 5, tf: "hello", _id: 1 }
                , doc2 = { a: 8, tf: "world", _id: 2 }
                , doc3 = { a: 2, tf: "bloup", _id: 3 }
                , doc4 = { a: 23, tf: "world", _id: 4 }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);
            assert.equal(idx.tree.getNumberOfKeys(), 3);

            idx.remove(doc1);
            assert.equal(idx.tree.getNumberOfKeys(), 2);
            assert.equal(idx.tree.search("hello").length, 0);

            idx.remove(doc2);
            assert.equal(idx.tree.getNumberOfKeys(), 2);
            assert.equal(idx.tree.search("world").length, 1);
            assert.equal(idx.tree.search("world")[0], doc4._id);
        });

        it("If we have a sparse index, removing a non indexed doc has no effect", () => {
            let idx = new Index({ fieldName: "nope", sparse: true })
                , doc1 = { a: 5, tf: "hello" }
                , doc2 = { a: 5, tf: "world" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            assert.equal(idx.tree.getNumberOfKeys(), 0);

            idx.remove(doc1);
            assert.equal(idx.tree.getNumberOfKeys(), 0);
        });

        it("Works with dot notation", () => {
            let idx = new Index({ fieldName: "tf.nested" })
                , doc1 = { _id: 5, tf: { nested: "hello" } }
                , doc2 = { _id: 8, tf: { nested: "world", additional: true } }
                , doc3 = { _id: 2, tf: { nested: "bloup", age: 42 } }
                , doc4 = { _id: 2, tf: { nested: "world", fruits: ["apple", "carrot"] } }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);
            assert.equal(idx.tree.getNumberOfKeys(), 3);

            idx.remove(doc1);
            assert.equal(idx.tree.getNumberOfKeys(), 2);
            assert.equal(idx.tree.search("hello").length, 0);

            idx.remove(doc2);
            assert.equal(idx.tree.getNumberOfKeys(), 2);
            assert.equal(idx.tree.search("world").length, 1);
            assert.equal(idx.tree.search("world")[0], doc4._id);
        });

        it("Can remove an array of documents", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 8, tf: "world" }
                , doc3 = { _id: 2, tf: "bloup" }
                ;

            idx.insert([doc1, doc2, doc3]);
            assert.equal(idx.tree.getNumberOfKeys(), 3);
            idx.remove([doc1, doc3]);
            assert.equal(idx.tree.getNumberOfKeys(), 1);
            assert.deepEqual(idx.tree.search("hello"), []);
            assert.deepEqual(idx.tree.search("world"), [doc2._id]);
            assert.deepEqual(idx.tree.search("bloup"), []);
        });

    });   // ==== End of 'Removal' ==== //


    describe("Update", () => {

        it("Can update a document whose key did or didnt change", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 8, tf: "world" }
                , doc3 = { _id: 2, tf: "bloup" }
                , doc4 = { _id: 23, tf: "world" }
                , doc5 = { _id: 1, tf: "changed" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.deepEqual(idx.tree.search("world"), [doc2._id]);

            idx.update(doc2, doc4);
            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.deepEqual(idx.tree.search("world"), [doc4._id]);

            idx.update(doc1, doc5);
            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.deepEqual(idx.tree.search("hello"), []);
            assert.deepEqual(idx.tree.search("changed"), [doc5._id]);
        });

        it("If a simple update violates a unique constraint, changes are rolled back and an error thrown", () => {
            let idx = new Index({ fieldName: "tf", unique: true })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 8, tf: "world" }
                , doc3 = { _id: 2, tf: "bloup" }
                , bad = { _id: 23, tf: "world" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.deepEqual(idx.tree.search("hello"), [doc1._id]);
            assert.deepEqual(idx.tree.search("world"), [doc2._id]);
            assert.deepEqual(idx.tree.search("bloup"), [doc3._id]);

            try {
                idx.update(doc3, bad);
            } catch (e) {
                assert.equal(e.errorType, "uniqueViolated");
            }

            // No change
            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.deepEqual(idx.tree.search("hello"), [doc1._id]);
            assert.deepEqual(idx.tree.search("world"), [doc2._id]);
            assert.deepEqual(idx.tree.search("bloup"), [doc3._id]);
        });

        it("Can update an array of documents", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 8, tf: "world" }
                , doc3 = { _id: 2, tf: "bloup" }
                , doc1b = { _id: 23, tf: "world" }
                , doc2b = { _id: 1, tf: "changed" }
                , doc3b = { _id: 44, tf: "bloup" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            assert.equal(idx.tree.getNumberOfKeys(), 3);

            idx.update([{ oldDoc: doc1, newDoc: doc1b }, { oldDoc: doc2, newDoc: doc2b }, { oldDoc: doc3, newDoc: doc3b }]);

            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.equal(idx.getMatching("world").length, 1);
            assert.equal(idx.getMatching("world")[0], doc1b._id);
            assert.equal(idx.getMatching("changed").length, 1);
            assert.equal(idx.getMatching("changed")[0], doc2b._id);
            assert.equal(idx.getMatching("bloup").length, 1);
            assert.equal(idx.getMatching("bloup")[0], doc3b._id);
        });

        it("If a unique constraint is violated during an array-update, all changes are rolled back and an error thrown", () => {
            let idx = new Index({ fieldName: "tf", unique: true })
                , doc0 = { _id: 432, tf: "notthistoo" }
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 8, tf: "world" }
                , doc3 = { _id: 2, tf: "bloup" }
                , doc1b = { _id: 23, tf: "changed" }
                , doc2b = { _id: 1, tf: "changed" }   // Will violate the constraint (first try)
                , doc2c = { _id: 1, tf: "notthistoo" }   // Will violate the constraint (second try)
                , doc3b = { _id: 44, tf: "alsochanged" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            assert.equal(idx.tree.getNumberOfKeys(), 3);

            try {
                idx.update([{ oldDoc: doc1, newDoc: doc1b }, { oldDoc: doc2, newDoc: doc2b }, { oldDoc: doc3, newDoc: doc3b }]);
            } catch (e) {
                assert.equal(e.errorType, "uniqueViolated");
            }

            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.equal(idx.getMatching("hello").length, 1);
            assert.equal(idx.getMatching("hello")[0], doc1._id);
            assert.equal(idx.getMatching("world").length, 1);
            assert.equal(idx.getMatching("world")[0], doc2._id);
            assert.equal(idx.getMatching("bloup").length, 1);
            assert.equal(idx.getMatching("bloup")[0], doc3._id);

            try {
                idx.update([{ oldDoc: doc1, newDoc: doc1b }, { oldDoc: doc2, newDoc: doc2b }, { oldDoc: doc3, newDoc: doc3b }]);
            } catch (e) {
                assert.equal(e.errorType, "uniqueViolated");
            }

            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.equal(idx.getMatching("hello").length, 1);
            assert.equal(idx.getMatching("hello")[0], doc1._id);
            assert.equal(idx.getMatching("world").length, 1);
            assert.equal(idx.getMatching("world")[0], doc2._id);
            assert.equal(idx.getMatching("bloup").length, 1);
            assert.equal(idx.getMatching("bloup")[0], doc3._id);
        });

        it("If an update doesnt change a document, the unique constraint is not violated", () => {
            let idx = new Index({ fieldName: "tf", unique: true })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 8, tf: "world" }
                , doc3 = { _id: 2, tf: "bloup" }
                , noChange = { _id: 8, tf: "world" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.deepEqual(idx.tree.search("world"), [doc2._id]);

            idx.update(doc2, noChange);   // No error thrown
            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.deepEqual(idx.tree.search("world"), [noChange._id]);
        });

        it("Can revert simple and batch updates", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 8, tf: "world" }
                , doc3 = { _id: 2, tf: "bloup" }
                , doc1b = { _id: 23, tf: "world" }
                , doc2b = { _id: 1, tf: "changed" }
                , doc3b = { _id: 44, tf: "bloup" }
                , batchUpdate = [{ oldDoc: doc1, newDoc: doc1b }, { oldDoc: doc2, newDoc: doc2b }, { oldDoc: doc3, newDoc: doc3b }]
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            assert.equal(idx.tree.getNumberOfKeys(), 3);

            idx.update(batchUpdate);

            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.equal(idx.getMatching("world").length, 1);
            assert.equal(idx.getMatching("world")[0], doc1b._id);
            assert.equal(idx.getMatching("changed").length, 1);
            assert.equal(idx.getMatching("changed")[0], doc2b._id);
            assert.equal(idx.getMatching("bloup").length, 1);
            assert.equal(idx.getMatching("bloup")[0], doc3b._id);

            idx.revertUpdate(batchUpdate);

            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.equal(idx.getMatching("hello").length, 1);
            assert.equal(idx.getMatching("hello")[0], doc1._id);
            assert.equal(idx.getMatching("world").length, 1);
            assert.equal(idx.getMatching("world")[0], doc2._id);
            assert.equal(idx.getMatching("bloup").length, 1);
            assert.equal(idx.getMatching("bloup")[0], doc3._id);

            // Now a simple update
            idx.update(doc2, doc2b);

            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.equal(idx.getMatching("hello").length, 1);
            assert.equal(idx.getMatching("hello")[0], doc1._id);
            assert.equal(idx.getMatching("changed").length, 1);
            assert.equal(idx.getMatching("changed")[0], doc2b._id);
            assert.equal(idx.getMatching("bloup").length, 1);
            assert.equal(idx.getMatching("bloup")[0], doc3._id);

            idx.revertUpdate(doc2, doc2b);

            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.equal(idx.getMatching("hello").length, 1);
            assert.equal(idx.getMatching("hello")[0], doc1._id);
            assert.equal(idx.getMatching("world").length, 1);
            assert.equal(idx.getMatching("world")[0], doc2._id);
            assert.equal(idx.getMatching("bloup").length, 1);
            assert.equal(idx.getMatching("bloup")[0], doc3._id);
        });

    });   // ==== End of 'Update' ==== //


    describe("Get matching documents", () => {

        it("Get all documents where fieldName is equal to the given value, or an empty array if no match", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 8, tf: "world" }
                , doc3 = { _id: 2, tf: "bloup" }
                , doc4 = { _id: 23, tf: "world" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);

            assert.deepEqual(idx.getMatching("bloup"), [doc3._id]);
            assert.deepEqual(idx.getMatching("world"), [doc2._id, doc4._id]);
            assert.deepEqual(idx.getMatching("nope"), []);
        });

        it("Can get all documents for a given key in a unique index", () => {
            let idx = new Index({ fieldName: "tf", unique: true })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 8, tf: "world" }
                , doc3 = { _id: 2, tf: "bloup" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            assert.deepEqual(idx.getMatching("bloup"), [doc3._id]);
            assert.deepEqual(idx.getMatching("world"), [doc2._id]);
            assert.deepEqual(idx.getMatching("nope"), []);
        });

        it("Can get all documents for which a field is undefined", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 2, nottf: "bloup" }
                , doc3 = { _id: 8, tf: "world" }
                , doc4 = { _id: 7, nottf: "yes" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            assert.deepEqual(idx.getMatching("bloup"), []);
            assert.deepEqual(idx.getMatching("hello"), [doc1._id]);
            assert.deepEqual(idx.getMatching("world"), [doc3._id]);
            assert.deepEqual(idx.getMatching("yes"), []);
            assert.deepEqual(idx.getMatching(undefined), [doc2._id]);

            idx.insert(doc4);

            assert.deepEqual(idx.getMatching("bloup"), []);
            assert.deepEqual(idx.getMatching("hello"), [doc1._id]);
            assert.deepEqual(idx.getMatching("world"), [doc3._id]);
            assert.deepEqual(idx.getMatching("yes"), []);
            assert.deepEqual(idx.getMatching(undefined), [doc2._id, doc4._id]);
        });

        it("Can get all documents for which a field is null", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 2, tf: null }
                , doc3 = { _id: 8, tf: "world" }
                , doc4 = { _id: 7, tf: null }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            assert.deepEqual(idx.getMatching("bloup"), []);
            assert.deepEqual(idx.getMatching("hello"), [doc1._id]);
            assert.deepEqual(idx.getMatching("world"), [doc3._id]);
            assert.deepEqual(idx.getMatching("yes"), []);
            assert.deepEqual(idx.getMatching(null), [doc2._id]);

            idx.insert(doc4);

            assert.deepEqual(idx.getMatching("bloup"), []);
            assert.deepEqual(idx.getMatching("hello"), [doc1._id]);
            assert.deepEqual(idx.getMatching("world"), [doc3._id]);
            assert.deepEqual(idx.getMatching("yes"), []);
            assert.deepEqual(idx.getMatching(null), [doc2._id, doc4._id]);
        });

        it("Can get all documents for a given key in a sparse index, but not unindexed docs (= field undefined)", () => {
            let idx = new Index({ fieldName: "tf", sparse: true })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 2, nottf: "bloup" }
                , doc3 = { _id: 8, tf: "world" }
                , doc4 = { _id: 7, nottf: "yes" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);

            assert.deepEqual(idx.getMatching("bloup"), []);
            assert.deepEqual(idx.getMatching("hello"), [doc1._id]);
            assert.deepEqual(idx.getMatching("world"), [doc3._id]);
            assert.deepEqual(idx.getMatching("yes"), []);
            assert.deepEqual(idx.getMatching(undefined), []);
        });

        it("Can get all documents whose key is in an array of keys", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 2, tf: "bloup" }
                , doc3 = { _id: 8, tf: "world" }
                , doc4 = { _id: 7, tf: "yes" }
                , doc5 = { _id: 7, tf: "yes" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);
            idx.insert(doc5);

            assert.deepEqual(idx.getMatching([]), []);
            assert.deepEqual(idx.getMatching(["bloup"]), [doc2._id]);
            assert.deepEqual(idx.getMatching(["bloup", "yes"]), [doc2._id, doc4._id, doc5._id]);
            assert.deepEqual(idx.getMatching(["hello", "no"]), [doc1._id]);
            assert.deepEqual(idx.getMatching(["nope", "no"]), []);
        });

        it("Can get all documents whose key is between certain bounds", () => {
            let idx = new Index({ fieldName: "_id" })
                , doc1 = { _id: 5, tf: "hello" }
                , doc2 = { _id: 2, tf: "bloup" }
                , doc3 = { _id: 8, tf: "world" }
                , doc4 = { _id: 7, tf: "yes" }
                , doc5 = { _id: 10, tf: "yes" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);
            idx.insert(doc5);

            assert.deepEqual(idx.getBetweenBounds({ $lt: 10, $gte: 5 }), [doc1._id, doc4._id, doc3._id]);
            assert.deepEqual(idx.getBetweenBounds({ $lte: 8 }), [doc2._id, doc1._id, doc4._id, doc3._id]);
            assert.deepEqual(idx.getBetweenBounds({ $gt: 7 }), [doc3._id, doc5._id]);
        });

    });   // ==== End of 'Get matching documents' ==== //


    describe("Resetting", () => {

        it("Can reset an index without any new data, the index will be empty afterwards", () => {
            let idx = new Index({ fieldName: "tf" })
                , doc1 = { a: 5, tf: "hello" }
                , doc2 = { a: 8, tf: "world" }
                , doc3 = { a: 2, tf: "bloup" }
                ;

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            assert.equal(idx.tree.getNumberOfKeys(), 3);
            assert.equal(idx.getMatching("hello").length, 1);
            assert.equal(idx.getMatching("world").length, 1);
            assert.equal(idx.getMatching("bloup").length, 1);

            idx.reset();
            assert.equal(idx.tree.getNumberOfKeys(), 0);
            assert.equal(idx.getMatching("hello").length, 0);
            assert.equal(idx.getMatching("world").length, 0);
            assert.equal(idx.getMatching("bloup").length, 0);
        });

        /* OBSOLETE FUNCTIONALITY
        it('Can reset an index and initialize it with one document', function () {
          var idx = new Index({ fieldName: 'tf' })
            , doc1 = { a: 5, tf: 'hello' }
            , doc2 = { a: 8, tf: 'world' }
            , doc3 = { a: 2, tf: 'bloup' }
            , newDoc = { a: 555, tf: 'new' }
            ;
    
          idx.insert(doc1);
          idx.insert(doc2);
          idx.insert(doc3);
    
          idx.tree.getNumberOfKeys(), 3);
          idx.getMatching('hello').length, 1);
          idx.getMatching('world').length, 1);
          idx.getMatching('bloup').length, 1);
    
          idx.reset(newDoc);
          idx.tree.getNumberOfKeys(), 1);
          idx.getMatching('hello').length, 0);
          idx.getMatching('world').length, 0);
          idx.getMatching('bloup').length, 0);
          idx.getMatching('new')[0].a, 555);
        });
    
        it('Can reset an index and initialize it with an array of documents', function () {
          var idx = new Index({ fieldName: 'tf' })
            , doc1 = { a: 5, tf: 'hello' }
            , doc2 = { a: 8, tf: 'world' }
            , doc3 = { a: 2, tf: 'bloup' }
            , newDocs = [{ a: 555, tf: 'new' }, { a: 666, tf: 'again' }]
            ;
    
          idx.insert(doc1);
          idx.insert(doc2);
          idx.insert(doc3);
    
          idx.tree.getNumberOfKeys(), 3);
          idx.getMatching('hello').length, 1);
          idx.getMatching('world').length, 1);
          idx.getMatching('bloup').length, 1);
    
          idx.reset(newDocs);
          idx.tree.getNumberOfKeys(), 2);
          idx.getMatching('hello').length, 0);
          idx.getMatching('world').length, 0);
          idx.getMatching('bloup').length, 0);
          idx.getMatching('new')[0].a, 555);
          idx.getMatching('again')[0].a, 666);
        });
        */
    });   // ==== End of 'Resetting' ==== //

    it("Get all elements in the index", () => {
        let idx = new Index({ fieldName: "a" })
            , doc1 = { a: 5, _id: "hello" }
            , doc2 = { a: 8, _id: "world" }
            , doc3 = { a: 2, _id: "bloup" }
            ;

        idx.insert(doc1);
        idx.insert(doc2);
        idx.insert(doc3);

        assert.deepEqual(idx.getAll(), ["bloup", "hello", "world"]);
    });


});
