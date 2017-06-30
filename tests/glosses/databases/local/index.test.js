describe("database", "local", "Indexes", () => {
    const { database: { local: { Index } } } = adone;

    describe("Insertion", () => {
        it("Can insert pointers to documents in the index correctly when they have the field", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            // The underlying BST now has 3 nodes which contain the docs where it's expected
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.tree.search("hello")).to.be.deep.equal([{ a: 5, tf: "hello" }]);
            expect(idx.tree.search("world")).to.be.deep.equal([{ a: 8, tf: "world" }]);
            expect(idx.tree.search("bloup")).to.be.deep.equal([{ a: 2, tf: "bloup" }]);

            // The nodes contain pointers to the actual documents
            expect(idx.tree.search("world")[0]).to.be.equal(doc2);
            idx.tree.search("bloup")[0].a = 42;
            expect(doc3.a).to.be.equal(42);
        });

        it("Inserting twice for the same fieldName in a unique index will result in an error thrown", () => {
            const idx = new Index({ fieldName: "tf", unique: true });
            const doc1 = { a: 5, tf: "hello" };

            idx.insert(doc1);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(1);
            expect(() => idx.insert(doc1)).to.throw();
        });

        it("Inserting twice for a fieldName the docs dont have with a unique index results in an error thrown", () => {
            const idx = new Index({ fieldName: "nope", unique: true });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 5, tf: "world" };

            idx.insert(doc1);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(1);
            expect(() => idx.insert(doc2)).to.throw();
        });

        it("Inserting twice for a fieldName the docs dont have with a unique and sparse index will not throw, since the docs will be non indexed", () => {
            const idx = new Index({ fieldName: "nope", unique: true, sparse: true });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 5, tf: "world" };

            idx.insert(doc1);
            idx.insert(doc2);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(0);   // Docs are not indexed
        });

        it("Works with dot notation", () => {
            const idx = new Index({ fieldName: "tf.nested" });
            const doc1 = { a: 5, tf: { nested: "hello" } };
            const doc2 = { a: 8, tf: { nested: "world", additional: true } };
            const doc3 = { a: 2, tf: { nested: "bloup", age: 42 } };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            // The underlying BST now has 3 nodes which contain the docs where it's expected
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.tree.search("hello")).to.be.deep.equal([doc1]);
            expect(idx.tree.search("world")).to.be.deep.equal([doc2]);
            expect(idx.tree.search("bloup")).to.be.deep.equal([doc3]);

            // The nodes contain pointers to the actual documents
            idx.tree.search("bloup")[0].a = 42;
            expect(doc3.a).to.be.equal(42);
        });

        it("Can insert an array of documents", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };

            idx.insert([doc1, doc2, doc3]);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.tree.search("hello")).to.be.deep.equal([doc1]);
            expect(idx.tree.search("world")).to.be.deep.equal([doc2]);
            expect(idx.tree.search("bloup")).to.be.deep.equal([doc3]);
        });

        it("When inserting an array of elements, if an error is thrown all inserts need to be rolled back", () => {
            const idx = new Index({ fieldName: "tf", unique: true });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc2b = { a: 84, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };


            try {
                idx.insert([doc1, doc2, doc2b, doc3]);
            } catch (e) {
                expect(e.errorType).to.be.equal("uniqueViolated");
            }
            expect(idx.tree.getNumberOfKeys()).to.be.equal(0);
            expect(idx.tree.search("hello")).to.be.empty;
            expect(idx.tree.search("world")).to.be.empty;
            expect(idx.tree.search("bloup")).to.be.empty;
        });

        describe("Array fields", () => {
            it("Inserts one entry per array element in the index", () => {
                const obj = { tf: ["aa", "bb"], really: "yeah" };
                const obj2 = { tf: "normal", yes: "indeed" };
                const idx = new Index({ fieldName: "tf" });


                idx.insert(obj);
                expect(idx.getAll()).to.have.lengthOf(2);
                expect(idx.getAll()[0]).to.be.equal(obj);
                expect(idx.getAll()[1]).to.be.equal(obj);

                idx.insert(obj2);
                expect(idx.getAll()).to.have.lengthOf(3);
            });

            it("Inserts one entry per array element in the index, type-checked", () => {
                const obj = { tf: ["42", 42, new Date(42), 42], really: "yeah" };
                const idx = new Index({ fieldName: "tf" });

                idx.insert(obj);
                expect(idx.getAll()).to.have.lengthOf(3);
                expect(idx.getAll()[0]).to.be.equal(obj);
                expect(idx.getAll()[1]).to.be.equal(obj);
                expect(idx.getAll()[2]).to.be.equal(obj);
            });

            it("Inserts one entry per unique array element in the index, the unique constraint only holds across documents", () => {
                const obj = { tf: ["aa", "aa"], really: "yeah" };
                const obj2 = { tf: ["cc", "yy", "cc"], yes: "indeed" };
                const idx = new Index({ fieldName: "tf", unique: true });


                idx.insert(obj);
                expect(idx.getAll()).to.have.lengthOf(1);
                expect(idx.getAll()[0]).to.be.equal(obj);

                idx.insert(obj2);
                expect(idx.getAll()).to.have.lengthOf(3);
            });

            it("The unique constraint holds across documents", () => {
                const obj = { tf: ["aa", "aa"], really: "yeah" };
                const obj2 = { tf: ["cc", "aa", "cc"], yes: "indeed" };
                const idx = new Index({ fieldName: "tf", unique: true });


                idx.insert(obj);
                expect(idx.getAll()).to.have.lengthOf(1);
                expect(idx.getAll()[0]).to.be.equal(obj);

                expect(() => idx.insert(obj2)).to.throw();
            });

            it("When removing a document, remove it from the index at all unique array elements", () => {
                const obj = { tf: ["aa", "aa"], really: "yeah" };
                const obj2 = { tf: ["cc", "aa", "cc"], yes: "indeed" };
                const idx = new Index({ fieldName: "tf" });


                idx.insert(obj);
                idx.insert(obj2);
                expect(idx.getMatching("aa")).to.have.lengthOf(2);
                expect(idx.getMatching("aa").indexOf(obj)).to.be.not.equal(-1);
                expect(idx.getMatching("aa").indexOf(obj2)).to.be.not.equal(-1);
                expect(idx.getMatching("cc")).to.have.lengthOf(1);

                idx.remove(obj2);
                expect(idx.getMatching("aa")).to.have.lengthOf(1);
                expect(idx.getMatching("aa").indexOf(obj)).to.be.not.equal(-1);
                expect(idx.getMatching("aa").indexOf(obj2)).to.be.equal(-1);
                expect(idx.getMatching("cc")).to.be.empty;
            });

            it("If a unique constraint is violated when inserting an array key, roll back all inserts before the key", () => {
                const obj = { tf: ["aa", "bb"], really: "yeah" };
                const obj2 = { tf: ["cc", "dd", "aa", "ee"], yes: "indeed" };
                const idx = new Index({ fieldName: "tf", unique: true });


                idx.insert(obj);
                expect(idx.getAll()).to.have.lengthOf(2);
                expect(idx.getMatching("aa")).to.have.lengthOf(1);
                expect(idx.getMatching("bb")).to.have.lengthOf(1);
                expect(idx.getMatching("cc")).to.be.empty;
                expect(idx.getMatching("dd")).to.be.empty;
                expect(idx.getMatching("ee")).to.be.empty;

                expect(() => idx.insert(obj2)).to.throw();
                expect(idx.getAll()).to.have.lengthOf(2);
                expect(idx.getMatching("aa")).to.have.lengthOf(1);
                expect(idx.getMatching("bb")).to.have.lengthOf(1);
                expect(idx.getMatching("cc")).to.be.empty;
                expect(idx.getMatching("dd")).to.be.empty;
                expect(idx.getMatching("ee")).to.be.empty;
            });
        });
    });

    describe("Removal", () => {
        it("Can remove pointers from the index, even when multiple documents have the same key", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };
            const doc4 = { a: 23, tf: "world" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);

            idx.remove(doc1);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(2);
            expect(idx.tree.search("hello")).to.be.empty;

            idx.remove(doc2);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(2);
            expect(idx.tree.search("world")).to.have.lengthOf(1);
            expect(idx.tree.search("world")[0]).to.be.equal(doc4);
        });

        it("If we have a sparse index, removing a non indexed doc has no effect", () => {
            const idx = new Index({ fieldName: "nope", sparse: true });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 5, tf: "world" };

            idx.insert(doc1);
            idx.insert(doc2);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(0);

            idx.remove(doc1);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(0);
        });

        it("Works with dot notation", () => {
            const idx = new Index({ fieldName: "tf.nested" });
            const doc1 = { a: 5, tf: { nested: "hello" } };
            const doc2 = { a: 8, tf: { nested: "world", additional: true } };
            const doc3 = { a: 2, tf: { nested: "bloup", age: 42 } };
            const doc4 = { a: 2, tf: { nested: "world", fruits: ["apple", "carrot"] } };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);

            idx.remove(doc1);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(2);
            expect(idx.tree.search("hello")).to.be.empty;

            idx.remove(doc2);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(2);
            expect(idx.tree.search("world")).to.have.lengthOf(1);
            expect(idx.tree.search("world")[0]).to.be.equal(doc4);
        });

        it("Can remove an array of documents", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };

            idx.insert([doc1, doc2, doc3]);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            idx.remove([doc1, doc3]);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(1);
            expect(idx.tree.search("hello")).to.be.empty;
            expect(idx.tree.search("world")).to.be.deep.equal([doc2]);
            expect(idx.tree.search("bloup")).to.be.empty;
        });
    });

    describe("Update", () => {
        it("Can update a document whose key did or didnt change", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };
            const doc4 = { a: 23, tf: "world" };
            const doc5 = { a: 1, tf: "changed" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.tree.search("world")).to.be.deep.equal([doc2]);

            idx.update(doc2, doc4);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.tree.search("world")).to.be.deep.equal([doc4]);

            idx.update(doc1, doc5);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.tree.search("hello")).to.be.empty;
            expect(idx.tree.search("changed")).to.be.deep.equal([doc5]);
        });

        it("If a simple update violates a unique constraint, changes are rolled back and an error thrown", () => {
            const idx = new Index({ fieldName: "tf", unique: true });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };
            const bad = { a: 23, tf: "world" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.tree.search("hello")).to.be.deep.equal([doc1]);
            expect(idx.tree.search("world")).to.be.deep.equal([doc2]);
            expect(idx.tree.search("bloup")).to.be.deep.equal([doc3]);

            try {
                idx.update(doc3, bad);
            } catch (e) {
                expect(e.errorType).to.be.equal("uniqueViolated");
            }

            // No change
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.tree.search("hello")).to.be.deep.equal([doc1]);
            expect(idx.tree.search("world")).to.be.deep.equal([doc2]);
            expect(idx.tree.search("bloup")).to.be.deep.equal([doc3]);
        });

        it("Can update an array of documents", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };
            const doc1b = { a: 23, tf: "world" };
            const doc2b = { a: 1, tf: "changed" };
            const doc3b = { a: 44, tf: "bloup" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);

            idx.update([{
                oldDoc: doc1,
                newDoc: doc1b
            }, {
                oldDoc: doc2,
                newDoc: doc2b
            }, {
                oldDoc: doc3,
                newDoc: doc3b
            }]);

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.getMatching("world")).to.have.lengthOf(1);
            expect(idx.getMatching("world")[0]).to.be.equal(doc1b);
            expect(idx.getMatching("changed")).to.have.lengthOf(1);
            expect(idx.getMatching("changed")[0]).to.be.equal(doc2b);
            expect(idx.getMatching("bloup")).to.have.lengthOf(1);
            expect(idx.getMatching("bloup")[0]).to.be.equal(doc3b);
        });

        it("If a unique constraint is violated during an array-update, all changes are rolled back and an error thrown", () => {
            const idx = new Index({ fieldName: "tf", unique: true });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };
            const doc1b = { a: 23, tf: "changed" };
            const doc2b = { a: 1, tf: "changed" };   // Will violate the constraint (first try)
            const doc3b = { a: 44, tf: "alsochanged" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);

            try {
                idx.update([{
                    oldDoc: doc1,
                    newDoc: doc1b
                }, {
                    oldDoc: doc2,
                    newDoc: doc2b
                }, {
                    oldDoc: doc3,
                    newDoc: doc3b
                }]);
            } catch (e) {
                expect(e.errorType).to.be.equal("uniqueViolated");
            }

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.getMatching("hello")).to.have.lengthOf(1);
            expect(idx.getMatching("hello")[0]).to.be.equal(doc1);
            expect(idx.getMatching("world")).to.have.lengthOf(1);
            expect(idx.getMatching("world")[0]).to.be.equal(doc2);
            expect(idx.getMatching("bloup")).to.have.lengthOf(1);
            expect(idx.getMatching("bloup")[0]).to.be.equal(doc3);

            try {
                idx.update([{
                    oldDoc: doc1,
                    newDoc: doc1b
                }, {
                    oldDoc: doc2,
                    newDoc: doc2b
                }, {
                    oldDoc: doc3,
                    newDoc: doc3b
                }]);
            } catch (e) {
                expect(e.errorType).to.be.equal("uniqueViolated");
            }

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.getMatching("hello")).to.have.lengthOf(1);
            expect(idx.getMatching("hello")[0]).to.be.equal(doc1);
            expect(idx.getMatching("world")).to.have.lengthOf(1);
            expect(idx.getMatching("world")[0]).to.be.equal(doc2);
            expect(idx.getMatching("bloup")).to.have.lengthOf(1);
            expect(idx.getMatching("bloup")[0]).to.be.equal(doc3);
        });

        it("If an update doesnt change a document, the unique constraint is not violated", () => {
            const idx = new Index({ fieldName: "tf", unique: true });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };
            const noChange = { a: 8, tf: "world" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.tree.search("world")).to.be.deep.equal([doc2]);

            idx.update(doc2, noChange);   // No error thrown
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.tree.search("world")).to.be.deep.equal([noChange]);
        });

        it("Can revert simple and batch updates", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };
            const doc1b = { a: 23, tf: "world" };
            const doc2b = { a: 1, tf: "changed" };
            const doc3b = { a: 44, tf: "bloup" };
            const batchUpdate = [{
                oldDoc: doc1,
                newDoc: doc1b
            }, {
                oldDoc: doc2,
                newDoc: doc2b
            }, {
                oldDoc: doc3,
                newDoc: doc3b
            }];

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);

            idx.update(batchUpdate);

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.getMatching("world")).to.have.lengthOf(1);
            expect(idx.getMatching("world")[0]).to.be.equal(doc1b);
            expect(idx.getMatching("changed")).to.have.lengthOf(1);
            expect(idx.getMatching("changed")[0]).to.be.equal(doc2b);
            expect(idx.getMatching("bloup")).to.have.lengthOf(1);
            expect(idx.getMatching("bloup")[0]).to.be.equal(doc3b);

            idx.revertUpdate(batchUpdate);

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.getMatching("hello")).to.have.lengthOf(1);
            expect(idx.getMatching("hello")[0]).to.be.equal(doc1);
            expect(idx.getMatching("world")).to.have.lengthOf(1);
            expect(idx.getMatching("world")[0]).to.be.equal(doc2);
            expect(idx.getMatching("bloup")).to.have.lengthOf(1);
            expect(idx.getMatching("bloup")[0]).to.be.equal(doc3);

            // Now a simple update
            idx.update(doc2, doc2b);

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.getMatching("hello")).to.have.lengthOf(1);
            expect(idx.getMatching("hello")[0]).to.be.equal(doc1);
            expect(idx.getMatching("changed")).to.have.lengthOf(1);
            expect(idx.getMatching("changed")[0]).to.be.equal(doc2b);
            expect(idx.getMatching("bloup")).to.have.lengthOf(1);
            expect(idx.getMatching("bloup")[0]).to.be.equal(doc3);

            idx.revertUpdate(doc2, doc2b);

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.getMatching("hello")).to.have.lengthOf(1);
            expect(idx.getMatching("hello")[0]).to.be.equal(doc1);
            expect(idx.getMatching("world")).to.have.lengthOf(1);
            expect(idx.getMatching("world")[0]).to.be.equal(doc2);
            expect(idx.getMatching("bloup")).to.have.lengthOf(1);
            expect(idx.getMatching("bloup")[0]).to.be.equal(doc3);
        });
    });

    describe("Get matching documents", () => {
        it("Get all documents where fieldName is equal to the given value, or an empty array if no match", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };
            const doc4 = { a: 23, tf: "world" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);

            expect(idx.getMatching("bloup")).to.be.deep.equal([doc3]);
            expect(idx.getMatching("world")).to.be.deep.equal([doc2, doc4]);
            expect(idx.getMatching("nope")).to.be.empty;
        });

        it("Can get all documents for a given key in a unique index", () => {
            const idx = new Index({ fieldName: "tf", unique: true });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            expect(idx.getMatching("bloup")).to.be.deep.equal([doc3]);
            expect(idx.getMatching("world")).to.be.deep.equal([doc2]);
            expect(idx.getMatching("nope")).to.be.empty;
        });

        it("Can get all documents for which a field is undefined", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 2, nottf: "bloup" };
            const doc3 = { a: 8, tf: "world" };
            const doc4 = { a: 7, nottf: "yes" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            expect(idx.getMatching("bloup")).to.be.empty;
            expect(idx.getMatching("hello")).to.be.deep.equal([doc1]);
            expect(idx.getMatching("world")).to.be.deep.equal([doc3]);
            expect(idx.getMatching("yes")).to.be.empty;
            expect(idx.getMatching(undefined)).to.be.deep.equal([doc2]);

            idx.insert(doc4);

            expect(idx.getMatching("bloup")).to.be.empty;
            expect(idx.getMatching("hello")).to.be.deep.equal([doc1]);
            expect(idx.getMatching("world")).to.be.deep.equal([doc3]);
            expect(idx.getMatching("yes")).to.be.empty;
            expect(idx.getMatching(undefined)).to.be.deep.equal([doc2, doc4]);
        });

        it("Can get all documents for which a field is null", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 2, tf: null };
            const doc3 = { a: 8, tf: "world" };
            const doc4 = { a: 7, tf: null };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            expect(idx.getMatching("bloup")).to.be.empty;
            expect(idx.getMatching("hello")).to.be.deep.equal([doc1]);
            expect(idx.getMatching("world")).to.be.deep.equal([doc3]);
            expect(idx.getMatching("yes")).to.be.empty;
            expect(idx.getMatching(null)).to.be.deep.equal([doc2]);

            idx.insert(doc4);

            expect(idx.getMatching("bloup")).to.be.empty;
            expect(idx.getMatching("hello")).to.be.deep.equal([doc1]);
            expect(idx.getMatching("world")).to.be.deep.equal([doc3]);
            expect(idx.getMatching("yes")).to.be.empty;
            expect(idx.getMatching(null)).to.be.deep.equal([doc2, doc4]);
        });

        it("Can get all documents for a given key in a sparse index, but not unindexed docs (= field undefined)", () => {
            const idx = new Index({ fieldName: "tf", sparse: true });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 2, nottf: "bloup" };
            const doc3 = { a: 8, tf: "world" };
            const doc4 = { a: 7, nottf: "yes" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);

            expect(idx.getMatching("bloup")).to.be.empty;
            expect(idx.getMatching("hello")).to.be.deep.equal([doc1]);
            expect(idx.getMatching("world")).to.be.deep.equal([doc3]);
            expect(idx.getMatching("yes")).to.be.empty;
            expect(idx.getMatching(undefined)).to.be.empty;
        });

        it("Can get all documents whose key is in an array of keys", () => {
            // For this test only we have to use objects with _ids as the array version of getMatching
            // relies on the _id property being set, otherwise we have to use a quadratic algorithm
            // or a fingerprinting algorithm, both solutions too complicated and slow given that live nedb
            // indexes documents with _id always set
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello", _id: "1" };
            const doc2 = { a: 2, tf: "bloup", _id: "2" };
            const doc3 = { a: 8, tf: "world", _id: "3" };
            const doc4 = { a: 7, tf: "yes", _id: "4" };
            const doc5 = { a: 7, tf: "yes", _id: "5" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);
            idx.insert(doc5);

            expect(idx.getMatching([])).to.be.empty;
            expect(idx.getMatching(["bloup"])).to.be.deep.equal([doc2]);
            expect(idx.getMatching(["bloup", "yes"])).to.be.deep.equal([doc2, doc4, doc5]);
            expect(idx.getMatching(["hello", "no"])).to.be.deep.equal([doc1]);
            expect(idx.getMatching(["nope", "no"])).to.be.empty;
        });

        it("Can get all documents whose key is between certain bounds", () => {
            const idx = new Index({ fieldName: "a" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 2, tf: "bloup" };
            const doc3 = { a: 8, tf: "world" };
            const doc4 = { a: 7, tf: "yes" };
            const doc5 = { a: 10, tf: "yes" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);
            idx.insert(doc4);
            idx.insert(doc5);

            expect(idx.getBetweenBounds({ $lt: 10, $gte: 5 })).to.be.deep.equal([doc1, doc4, doc3]);
            expect(idx.getBetweenBounds({ $lte: 8 })).to.be.deep.equal([doc2, doc1, doc4, doc3]);
            expect(idx.getBetweenBounds({ $gt: 7 })).to.be.deep.equal([doc3, doc5]);
        });
    });

    describe("Resetting", () => {
        it("Can reset an index without any new data, the index will be empty afterwards", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.getMatching("hello")).to.have.lengthOf(1);
            expect(idx.getMatching("world")).to.have.lengthOf(1);
            expect(idx.getMatching("bloup")).to.have.lengthOf(1);

            idx.reset();
            expect(idx.tree.getNumberOfKeys()).to.be.equal(0);
            expect(idx.getMatching("hello")).to.be.empty;
            expect(idx.getMatching("world")).to.be.empty;
            expect(idx.getMatching("bloup")).to.be.empty;
        });

        it("Can reset an index and initialize it with one document", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };
            const newDoc = { a: 555, tf: "new" };

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.getMatching("hello")).to.have.lengthOf(1);
            expect(idx.getMatching("world")).to.have.lengthOf(1);
            expect(idx.getMatching("bloup")).to.have.lengthOf(1);

            idx.reset(newDoc);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(1);
            expect(idx.getMatching("hello")).to.be.empty;
            expect(idx.getMatching("world")).to.be.empty;
            expect(idx.getMatching("bloup")).to.be.empty;
            expect(idx.getMatching("new")[0].a).to.be.equal(555);
        });

        it("Can reset an index and initialize it with an array of documents", () => {
            const idx = new Index({ fieldName: "tf" });
            const doc1 = { a: 5, tf: "hello" };
            const doc2 = { a: 8, tf: "world" };
            const doc3 = { a: 2, tf: "bloup" };
            const newDocs = [{ a: 555, tf: "new" }, { a: 666, tf: "again" }];

            idx.insert(doc1);
            idx.insert(doc2);
            idx.insert(doc3);

            expect(idx.tree.getNumberOfKeys()).to.be.equal(3);
            expect(idx.getMatching("hello")).to.have.lengthOf(1);
            expect(idx.getMatching("world")).to.have.lengthOf(1);
            expect(idx.getMatching("bloup")).to.have.lengthOf(1);

            idx.reset(newDocs);
            expect(idx.tree.getNumberOfKeys()).to.be.equal(2);
            expect(idx.getMatching("hello")).to.be.empty;
            expect(idx.getMatching("world")).to.be.empty;
            expect(idx.getMatching("bloup")).to.be.empty;
            expect(idx.getMatching("new")[0].a).to.be.equal(555);
            expect(idx.getMatching("again")[0].a).to.be.equal(666);
        });
    });

    it("Get all elements in the index", () => {
        const idx = new Index({ fieldName: "a" });
        const doc1 = { a: 5, tf: "hello" };
        const doc2 = { a: 8, tf: "world" };
        const doc3 = { a: 2, tf: "bloup" };

        idx.insert(doc1);
        idx.insert(doc2);
        idx.insert(doc3);

        expect(idx.getAll()).to.be.deep.equal([{ a: 2, tf: "bloup" }, { a: 5, tf: "hello" }, { a: 8, tf: "world" }]);
    });
});
