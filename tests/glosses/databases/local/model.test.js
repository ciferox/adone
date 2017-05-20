const {
    std: { util },
    database: { local: { Model: model, Datastore } }
} = adone;


describe("Model", () => {

    describe("Serialization, deserialization", () => {

        let tmpdir;

        before(async () => {
            tmpdir = await adone.fs.Directory.createTmp();
        });

        afterEach(async () => {
            await tmpdir.clean();
        });

        after(async () => {
            await tmpdir.unlink();
        });

        it("Can serialize and deserialize strings", () => {
            let a;
            let b;
            let c;

            a = { test: "Some string" };
            b = model.serialize(a);
            c = model.deserialize(b);
            expect(b.indexOf("\n")).to.be.equal(-1);
            expect(c.test).to.be.equal("Some string");

            // Even if a property is a string containing a new line, the serialized
            // version doesn't. The new line must still be there upon deserialization
            a = { test: "With a new\nline" };
            b = model.serialize(a);
            c = model.deserialize(b);
            expect(c.test).to.be.equal("With a new\nline");
            expect(a.test.indexOf("\n")).to.be.not.equal(-1);
            expect(b.indexOf("\n")).to.be.equal(-1);
            expect(c.test.indexOf("\n")).to.be.not.equal(-1);
        });

        it("Can serialize and deserialize booleans", () => {
            const a = { test: true };
            const b = model.serialize(a);
            const c = model.deserialize(b);
            expect(b.indexOf("\n")).to.be.equal(-1);
            expect(c.test).to.be.true;
        });

        it("Can serialize and deserialize numbers", () => {
            const a = { test: 5 };
            const b = model.serialize(a);
            const c = model.deserialize(b);
            expect(b.indexOf("\n")).to.be.equal(-1);
            expect(c.test).to.be.equal(5);
        });

        it("Can serialize and deserialize null", () => {
            const a = { test: null };
            const b = model.serialize(a);
            model.deserialize(b);
            expect(b.indexOf("\n")).to.be.equal(-1);
            expect(a.test).to.be.null;
        });

        it("undefined fields are removed when serialized", () => {
            const a = { bloup: undefined, hello: "world" };
            const b = model.serialize(a);
            const c = model.deserialize(b);
            expect(Object.keys(c)).to.have.lengthOf(1);
            expect(c.hello).to.be.equal("world");
            expect(c.bloup).to.be.undefined;
        });

        it("Can serialize and deserialize a date", () => {
            const d = new Date();
            const a = { test: d };
            const b = model.serialize(a);
            const c = model.deserialize(b);
            expect(b.indexOf("\n")).to.be.equal(-1);
            expect(b).to.be.equal(`{"test":{"$$date":${d.getTime()}}}`);
            expect(util.isDate(c.test)).to.be.true;
            expect(c.test.getTime()).to.be.equal(d.getTime());
        });

        it("Can serialize and deserialize sub objects", () => {
            const d = new Date();
            const a = { test: { something: 39, also: d, yes: { again: "yes" } } };
            const b = model.serialize(a);
            const c = model.deserialize(b);
            expect(b.indexOf("\n")).to.be.equal(-1);
            expect(c.test.something).to.be.equal(39);
            expect(c.test.also.getTime()).to.be.equal(d.getTime());
            expect(c.test.yes.again).to.be.equal("yes");
        });

        it("Can serialize and deserialize sub arrays", () => {
            const d = new Date();
            const a = { test: [39, d, { again: "yes" }] };
            const b = model.serialize(a);
            const c = model.deserialize(b);
            expect(b.indexOf("\n")).to.be.equal(-1);
            expect(c.test[0]).to.be.equal(39);
            expect(c.test[1].getTime()).to.be.equal(d.getTime());
            expect(c.test[2].again).to.be.equal("yes");
        });

        it("Reject field names beginning with a $ sign or containing a dot, except the four edge cases", () => {
            const a1 = { $something: "totest" };
            const a2 = { "with.dot": "totest" };
            const e1 = { $$date: 4321 };
            const e2 = { $$deleted: true };
            const e3 = { $$indexCreated: "indexName" };
            const e4 = { $$indexRemoved: "indexName" };
            // Normal cases
            expect(() => {
                model.serialize(a1);
            }).to.throw();
            expect(() => {
                model.serialize(a2);
            }).to.throw();

            // Edge cases
            model.serialize(e1);
            model.serialize(e2);
            model.serialize(e3);
            model.serialize(e4);
        });

        it("Can serialize string fields with a new line without breaking the DB", async () => {
            const badString = "world\r\nearth\nother\rline";

            const file = tmpdir.getVirtualFile("test1.db");

            await file.unlink().catch(adone.noop);

            expect(await file.exists()).to.be.false;

            const db1 = new Datastore({ filename: file.path() });
            await db1.load();
            await db1.insert({ hello: badString });
            const db2 = new Datastore({ filename: file.path() });
            await db2.load();
            const docs = await db2.find({});
            expect(docs).to.have.lengthOf(1);
            expect(docs[0].hello).to.be.equal(badString);
        });

        it("Can accept objects whose keys are numbers", () => {
            const o = { 42: true };

            model.serialize(o);
        });
    }); // ==== End of 'Serialization, deserialization' ==== //
    describe("Object checking", () => {

        it("Field names beginning with a $ sign are forbidden", () => {
            expect(model.checkObject).to.be.ok;

            expect(() => {
                model.checkObject({ $bad: true });
            }).to.throw();

            expect(() => {
                model.checkObject({ some: 42, nested: { again: "no", $worse: true } });
            }).to.throw();

            // This shouldn't throw since "$actuallyok" is not a field name
            model.checkObject({ some: 42, nested: [5, "no", "$actuallyok", true] });

            expect(() => {
                model.checkObject({ some: 42, nested: [5, "no", "$actuallyok", true, { $hidden: "useless" }] });
            }).to.throw();
        });

        it("Field names cannot contain a .", () => {
            expect(model.checkObject).to.be.ok;

            expect(() => {
                model.checkObject({ "so.bad": true });
            }).to.throw();

            // Recursive behaviour testing done in the above test on $ signs
        });

        it("Properties with a null value dont trigger an error", () => {
            const obj = { prop: null };

            model.checkObject(obj);
        });

        it("Can check if an object is a primitive or not", () => {
            expect(model.isPrimitiveType(5)).to.be.true;
            expect(model.isPrimitiveType("sdsfdfs")).to.be.true;
            expect(model.isPrimitiveType(0)).to.be.true;
            expect(model.isPrimitiveType(true)).to.be.true;
            expect(model.isPrimitiveType(false)).to.be.true;
            expect(model.isPrimitiveType(new Date())).to.be.true;
            expect(model.isPrimitiveType([])).to.be.true;
            expect(model.isPrimitiveType([3, "try"])).to.be.true;
            expect(model.isPrimitiveType(null)).to.be.true;

            expect(model.isPrimitiveType({})).to.be.false;
            expect(model.isPrimitiveType({ a: 42 })).to.be.false;
        });
    }); // ==== End of 'Object checking' ==== //
    describe("Deep copying", () => {

        it("Should be able to deep copy any serializable model", () => {
            const d = new Date();
            const obj = { a: ["ee", "ff", 42], date: d, subobj: { a: "b", b: "c" } };
            const res = model.deepCopy(obj);
            expect(res.a).to.have.lengthOf(3);
            expect(res.a[0]).to.be.equal("ee");
            expect(res.a[1]).to.be.equal("ff");
            expect(res.a[2]).to.be.equal(42);
            expect(res.date.getTime()).to.be.equal(d.getTime());
            expect(res.subobj.a).to.be.equal("b");
            expect(res.subobj.b).to.be.equal("c");

            obj.a.push("ggg");
            obj.date = "notadate";
            obj.subobj = [];

            // Even if the original object is modified, the copied one isn't
            expect(res.a).to.have.lengthOf(3);
            expect(res.a[0]).to.be.equal("ee");
            expect(res.a[1]).to.be.equal("ff");
            expect(res.a[2]).to.be.equal(42);
            expect(res.date.getTime()).to.be.equal(d.getTime());
            expect(res.subobj.a).to.be.equal("b");
            expect(res.subobj.b).to.be.equal("c");
        });

        it("Should deep copy the contents of an array", () => {
            const a = [{ hello: "world" }];
            const b = model.deepCopy(a);
            expect(b[0].hello).to.be.equal("world");
            b[0].hello = "another";
            expect(b[0].hello).to.be.equal("another");
            expect(a[0].hello).to.be.equal("world");
        });

        it("Without the strictKeys option, everything gets deep copied", () => {
            const a = { a: 4, $e: "rrr", "eee.rt": 42, nested: { yes: 1, "tt.yy": 2, $nopenope: 3 }, array: [{ "rr.hh": 1 }, { yes: true }, { $yes: false }] };
            const b = model.deepCopy(a);
            expect(a).to.be.deep.equal(b);
        });

        it("With the strictKeys option, only valid keys gets deep copied", () => {
            const a = { a: 4, $e: "rrr", "eee.rt": 42, nested: { yes: 1, "tt.yy": 2, $nopenope: 3 }, array: [{ "rr.hh": 1 }, { yes: true }, { $yes: false }] };
            const b = model.deepCopy(a, true);
            expect(b).to.be.deep.equal({ a: 4, nested: { yes: 1 }, array: [{}, { yes: true }, {}] });
        });
    }); // ==== End of 'Deep copying' ==== //
    describe("Modifying documents", () => {

        it("Queries not containing any modifier just replace the document by the contents of the query but keep its _id", () => {
            const obj = { some: "thing", _id: "keepit" };
            const updateQuery = { replace: "done", bloup: [1, 8] };
            const t = model.modify(obj, updateQuery);
            expect(t.replace).to.be.equal("done");
            expect(t.bloup).to.have.lengthOf(2);
            expect(t.bloup[0]).to.be.equal(1);
            expect(t.bloup[1]).to.be.equal(8);

            expect(t.some).to.be.undefined;
            expect(t._id).to.be.equal("keepit");
        });

        it("Throw an error if trying to change the _id field in a copy-type modification", () => {
            const obj = { some: "thing", _id: "keepit" };
            const updateQuery = { replace: "done", bloup: [1, 8], _id: "donttryit" };
            expect(() => {
                model.modify(obj, updateQuery);
            }).to.throw("You cannot change a document's _id");

            updateQuery._id = "keepit";
            model.modify(obj, updateQuery); // No error thrown
        });

        it("Throw an error if trying to use modify in a mixed copy+modify way", () => {
            const obj = { some: "thing" };
            const updateQuery = { replace: "me", $modify: "metoo" };
            expect(() => {
                model.modify(obj, updateQuery);
            }).to.throw("You cannot mix modifiers and normal fields");
        });

        it("Throw an error if trying to use an inexistent modifier", () => {
            const obj = { some: "thing" };
            const updateQuery = { $set: { it: "exists" }, $modify: "not this one" };
            expect(() => {
                model.modify(obj, updateQuery);
            }).to.throw(/^Unknown modifier .modify/);
        });

        it("Throw an error if a modifier is used with a non-object argument", () => {
            const obj = { some: "thing" };
            const updateQuery = { $set: "this exists" };
            expect(() => {
                model.modify(obj, updateQuery);
            }).to.throw(/Modifier .set's argument must be an object/);
        });

        describe("$set modifier", () => {
            it("Can change already set fields without modfifying the underlying object", () => {
                const obj = { some: "thing", yup: "yes", nay: "noes" };
                const updateQuery = { $set: { some: "changed", nay: "yes indeed" } };
                const modified = model.modify(obj, updateQuery);
                expect(Object.keys(modified)).to.have.lengthOf(3);
                expect(modified.some).to.be.equal("changed");
                expect(modified.yup).to.be.equal("yes");
                expect(modified.nay).to.be.equal("yes indeed");

                expect(Object.keys(obj)).to.have.lengthOf(3);
                expect(obj.some).to.be.equal("thing");
                expect(obj.yup).to.be.equal("yes");
                expect(obj.nay).to.be.equal("noes");
            });

            it("Creates fields to set if they dont exist yet", () => {
                const obj = { yup: "yes" };
                const updateQuery = { $set: { some: "changed", nay: "yes indeed" } };
                const modified = model.modify(obj, updateQuery);
                expect(Object.keys(modified)).to.have.lengthOf(3);
                expect(modified.some).to.be.equal("changed");
                expect(modified.yup).to.be.equal("yes");
                expect(modified.nay).to.be.equal("yes indeed");
            });

            it("Can set sub-fields and create them if necessary", () => {
                const obj = { yup: { subfield: "bloup" } };
                const updateQuery = { $set: { "yup.subfield": "changed", "yup.yop": "yes indeed", "totally.doesnt.exist": "now it does" } };
                const modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ yup: { subfield: "changed", yop: "yes indeed" }, totally: { doesnt: { exist: "now it does" } } });
            });

            it("Doesn't replace a falsy field by an object when recursively following dot notation", () => {
                const obj = { nested: false };
                const updateQuery = { $set: { "nested.now": "it is" } };
                const modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ nested: false }); // Object not modified as the nested field doesn't exist
            });
        }); // End of '$set modifier'

        describe("$unset modifier", () => {

            it("Can delete a field, not throwing an error if the field doesnt exist", () => {
                let obj;
                let updateQuery;
                let modified;
                obj = { yup: "yes", other: "also" };
                updateQuery = { $unset: { yup: true } };
                modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ other: "also" });

                obj = { yup: "yes", other: "also" };
                updateQuery = { $unset: { nope: true } };
                modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal(obj);

                obj = { yup: "yes", other: "also" };
                updateQuery = { $unset: { nope: true, other: true } };
                modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ yup: "yes" });
            });

            it("Can unset sub-fields and entire nested documents", () => {
                let obj;
                let updateQuery;
                let modified;
                obj = { yup: "yes", nested: { a: "also", b: "yeah" } };
                updateQuery = { $unset: { nested: true } };
                modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ yup: "yes" });

                obj = { yup: "yes", nested: { a: "also", b: "yeah" } };
                updateQuery = { $unset: { "nested.a": true } };
                modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ yup: "yes", nested: { b: "yeah" } });

                obj = { yup: "yes", nested: { a: "also", b: "yeah" } };
                updateQuery = { $unset: { "nested.a": true, "nested.b": true } };
                modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ yup: "yes", nested: {} });
            });

            it("When unsetting nested fields, should not create an empty parent to nested field", () => {
                let obj = model.modify({ argh: true }, { $unset: { "bad.worse": true } });
                expect(obj).to.be.deep.equal({ argh: true });

                obj = model.modify({ argh: true, bad: { worse: "oh" } }, { $unset: { "bad.worse": true } });
                expect(obj).to.be.deep.equal({ argh: true, bad: {} });

                obj = model.modify({ argh: true, bad: {} }, { $unset: { "bad.worse": true } });
                expect(obj).to.be.deep.equal({ argh: true, bad: {} });
            });
        }); // End of '$unset modifier'

        describe("$inc modifier", () => {
            it("Throw an error if you try to use it with a non-number or on a non number field", () => {
                expect(() => {
                    const obj = { some: "thing", yup: "yes", nay: 2 };
                    const updateQuery = { $inc: { nay: "notanumber" } };
                    model.modify(obj, updateQuery);
                }).to.throw();

                expect(() => {
                    const obj = { some: "thing", yup: "yes", nay: "nope" };
                    const updateQuery = { $inc: { nay: 1 } };
                    model.modify(obj, updateQuery);
                }).to.throw();
            });

            it("Can increment number fields or create and initialize them if needed", () => {
                const obj = { some: "thing", nay: 40 };
                let modified;
                modified = model.modify(obj, { $inc: { nay: 2 } });
                expect(modified).to.be.deep.equal({ some: "thing", nay: 42 });

                // Incidentally, this tests that obj was not modified
                modified = model.modify(obj, { $inc: { inexistent: -6 } });
                expect(modified).to.be.deep.equal({ some: "thing", nay: 40, inexistent: -6 });
            });

            it("Works recursively", () => {
                const obj = { some: "thing", nay: { nope: 40 } };
                const modified = model.modify(obj, { $inc: { "nay.nope": -2, "blip.blop": 123 } });
                expect(modified).to.be.deep.equal({ some: "thing", nay: { nope: 38 }, blip: { blop: 123 } });
            });
        }); // End of '$inc modifier'

        describe("$push modifier", () => {

            it("Can push an element to the end of an array", () => {
                const obj = { arr: ["hello"] };
                const modified = model.modify(obj, { $push: { arr: "world" } });
                expect(modified).to.be.deep.equal({ arr: ["hello", "world"] });
            });

            it("Can push an element to a non-existent field and will create the array", () => {
                const obj = {};
                const modified = model.modify(obj, { $push: { arr: "world" } });
                expect(modified).to.be.deep.equal({ arr: ["world"] });
            });

            it("Can push on nested fields", () => {
                let obj = { arr: { nested: ["hello"] } };
                let modified;
                modified = model.modify(obj, { $push: { "arr.nested": "world" } });
                expect(modified).to.be.deep.equal({ arr: { nested: ["hello", "world"] } });

                obj = { arr: { a: 2 } };
                modified = model.modify(obj, { $push: { "arr.nested": "world" } });
                expect(modified).to.be.deep.equal({ arr: { a: 2, nested: ["world"] } });
            });

            it("Throw if we try to push to a non-array", () => {
                let obj = { arr: "hello" };
                expect(() => {
                    model.modify(obj, { $push: { arr: "world" } });
                }).to.throw();

                obj = { arr: { nested: 45 } };
                expect(() => {
                    model.modify(obj, { $push: { "arr.nested": "world" } });
                }).to.throw();
            });

            it("Can use the $each modifier to add multiple values to an array at once", () => {
                const obj = { arr: ["hello"] };
                let modified;
                modified = model.modify(obj, { $push: { arr: { $each: ["world", "earth", "everything"] } } });
                expect(modified).to.be.deep.equal({ arr: ["hello", "world", "earth", "everything"] });

                expect(() => {
                    modified = model.modify(obj, { $push: { arr: { $each: 45 } } });
                }).to.throw();

                expect(() => {
                    modified = model.modify(obj, { $push: { arr: { $each: ["world"], unauthorized: true } } });
                }).to.throw();
            });

            it("Can use the $slice modifier to limit the number of array elements", () => {
                const obj = { arr: ["hello"] };
                let modified;
                modified = model.modify(obj, { $push: { arr: { $each: ["world", "earth", "everything"], $slice: 1 } } });
                expect(modified).to.be.deep.equal({ arr: ["hello"] });

                modified = model.modify(obj, { $push: { arr: { $each: ["world", "earth", "everything"], $slice: -1 } } });
                expect(modified).to.be.deep.equal({ arr: ["everything"] });

                modified = model.modify(obj, { $push: { arr: { $each: ["world", "earth", "everything"], $slice: 0 } } });
                expect(modified).to.be.deep.equal({ arr: [] });

                modified = model.modify(obj, { $push: { arr: { $each: ["world", "earth", "everything"], $slice: 2 } } });
                expect(modified).to.be.deep.equal({ arr: ["hello", "world"] });

                modified = model.modify(obj, { $push: { arr: { $each: ["world", "earth", "everything"], $slice: -2 } } });
                expect(modified).to.be.deep.equal({ arr: ["earth", "everything"] });

                modified = model.modify(obj, { $push: { arr: { $each: ["world", "earth", "everything"], $slice: -20 } } });
                expect(modified).to.be.deep.equal({ arr: ["hello", "world", "earth", "everything"] });

                modified = model.modify(obj, { $push: { arr: { $each: ["world", "earth", "everything"], $slice: 20 } } });
                expect(modified).to.be.deep.equal({ arr: ["hello", "world", "earth", "everything"] });

                modified = model.modify(obj, { $push: { arr: { $each: [], $slice: 1 } } });
                expect(modified).to.be.deep.equal({ arr: ["hello"] });

                // $each not specified, but $slice is
                modified = model.modify(obj, { $push: { arr: { $slice: 1 } } });
                expect(modified).to.be.deep.equal({ arr: ["hello"] });

                expect(() => {
                    modified = model.modify(obj, { $push: { arr: { $slice: 1, unauthorized: true } } });
                }).to.throw();

                expect(() => {
                    modified = model.modify(obj, { $push: { arr: { $each: [], unauthorized: true } } });
                }).to.throw();
            });
        }); // End of '$push modifier'

        describe("$addToSet modifier", () => {

            it("Can add an element to a set", () => {
                let obj = { arr: ["hello"] };
                let modified;
                modified = model.modify(obj, { $addToSet: { arr: "world" } });
                expect(modified).to.be.deep.equal({ arr: ["hello", "world"] });

                obj = { arr: ["hello"] };
                modified = model.modify(obj, { $addToSet: { arr: "hello" } });
                expect(modified).to.be.deep.equal({ arr: ["hello"] });
            });

            it("Can add an element to a non-existent set and will create the array", () => {
                const obj = { arr: [] };
                const modified = model.modify(obj, { $addToSet: { arr: "world" } });
                expect(modified).to.be.deep.equal({ arr: ["world"] });
            });

            it("Throw if we try to addToSet to a non-array", () => {
                const obj = { arr: "hello" };
                expect(() => {
                    model.modify(obj, { $addToSet: { arr: "world" } });
                }).to.throw();
            });

            it("Use deep-equality to check whether we can add a value to a set", () => {
                let obj = { arr: [{ b: 2 }] };
                let modified;
                modified = model.modify(obj, { $addToSet: { arr: { b: 3 } } });
                expect(modified).to.be.deep.equal({ arr: [{ b: 2 }, { b: 3 }] });

                obj = { arr: [{ b: 2 }] };
                modified = model.modify(obj, { $addToSet: { arr: { b: 2 } } });
                expect(modified).to.be.deep.equal({ arr: [{ b: 2 }] });
            });

            it("Can use the $each modifier to add multiple values to a set at once", () => {
                const obj = { arr: ["hello"] };
                let modified;
                modified = model.modify(obj, { $addToSet: { arr: { $each: ["world", "earth", "hello", "earth"] } } });
                expect(modified).to.be.deep.equal({ arr: ["hello", "world", "earth"] });

                expect(() => {
                    modified = model.modify(obj, { $addToSet: { arr: { $each: 45 } } });
                }).to.throw();

                expect(() => {
                    modified = model.modify(obj, { $addToSet: { arr: { $each: ["world"], unauthorized: true } } });
                }).to.throw();
            });
        }); // End of '$addToSet modifier'

        describe("$pop modifier", () => {

            it("Throw if called on a non array, a non defined field or a non integer", () => {
                let obj = { arr: "hello" };
                expect(() => {
                    model.modify(obj, { $pop: { arr: 1 } });
                }).to.throw();

                obj = { bloup: "nope" };
                expect(() => {
                    model.modify(obj, { $pop: { arr: 1 } });
                }).to.throw();

                obj = { arr: [1, 4, 8] };
                expect(() => {
                    model.modify(obj, { $pop: { arr: true } });
                }).to.throw();
            });

            it("Can remove the first and last element of an array", () => {
                let obj = { arr: [1, 4, 8] };
                let modified = model.modify(obj, { $pop: { arr: 1 } });
                expect(modified).to.be.deep.equal({ arr: [1, 4] });

                obj = { arr: [1, 4, 8] };
                modified = model.modify(obj, { $pop: { arr: -1 } });
                expect(modified).to.be.deep.equal({ arr: [4, 8] });

                // Empty arrays are not changed
                obj = { arr: [] };
                modified = model.modify(obj, { $pop: { arr: 1 } });
                expect(modified).to.be.deep.equal({ arr: [] });
                modified = model.modify(obj, { $pop: { arr: -1 } });
                expect(modified).to.be.deep.equal({ arr: [] });
            });
        }); // End of '$pop modifier'

        describe("$pull modifier", () => {

            it("Can remove an element from a set", () => {
                let obj = { arr: ["hello", "world"] };
                let modified;
                modified = model.modify(obj, { $pull: { arr: "world" } });
                expect(modified).to.be.deep.equal({ arr: ["hello"] });

                obj = { arr: ["hello"] };
                modified = model.modify(obj, { $pull: { arr: "world" } });
                expect(modified).to.be.deep.equal({ arr: ["hello"] });
            });

            it("Can remove multiple matching elements", () => {
                const obj = { arr: ["hello", "world", "hello", "world"] };
                const modified = model.modify(obj, { $pull: { arr: "world" } });
                expect(modified).to.be.deep.equal({ arr: ["hello", "hello"] });
            });

            it("Throw if we try to pull from a non-array", () => {
                const obj = { arr: "hello" };
                expect(() => {
                    model.modify(obj, { $pull: { arr: "world" } });
                }).to.throw();
            });

            it("Use deep-equality to check whether we can remove a value from a set", () => {
                let obj = { arr: [{ b: 2 }, { b: 3 }] };
                let modified;
                modified = model.modify(obj, { $pull: { arr: { b: 3 } } });
                expect(modified).to.be.deep.equal({ arr: [{ b: 2 }] });

                obj = { arr: [{ b: 2 }] };
                modified = model.modify(obj, { $pull: { arr: { b: 3 } } });
                expect(modified).to.be.deep.equal({ arr: [{ b: 2 }] });
            });

            it("Can use any kind of nedb query with $pull", () => {
                let obj = { arr: [4, 7, 12, 2], other: "yup" };
                let modified;
                modified = model.modify(obj, { $pull: { arr: { $gte: 5 } } });
                expect(modified).to.be.deep.equal({ arr: [4, 2], other: "yup" });

                obj = { arr: [{ b: 4 }, { b: 7 }, { b: 1 }], other: "yeah" };
                modified = model.modify(obj, { $pull: { arr: { b: { $gte: 5 } } } });
                expect(modified).to.be.deep.equal({ arr: [{ b: 4 }, { b: 1 }], other: "yeah" });
            });
        }); // End of '$pull modifier'

        describe("$max modifier", () => {
            it("Will set the field to the updated value if value is greater than current one, without modifying the original object", () => {
                const obj = { some: "thing", number: 10 };
                const updateQuery = { $max: { number: 12 } };
                const modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ some: "thing", number: 12 });
                expect(obj).to.be.deep.equal({ some: "thing", number: 10 });
            });

            it("Will not update the field if new value is smaller than current one", () => {
                const obj = { some: "thing", number: 10 };
                const updateQuery = { $max: { number: 9 } };
                const modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ some: "thing", number: 10 });
            });

            it("Will create the field if it does not exist", () => {
                const obj = { some: "thing" };
                const updateQuery = { $max: { number: 10 } };
                const modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ some: "thing", number: 10 });
            });

            it("Works on embedded documents", () => {
                const obj = { some: "thing", somethingElse: { number: 10 } };
                const updateQuery = { $max: { "somethingElse.number": 12 } };
                const modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ some: "thing", somethingElse: { number: 12 } });
            });
        }); // End of '$max modifier'

        describe("$min modifier", () => {
            it("Will set the field to the updated value if value is smaller than current one, without modifying the original object", () => {
                const obj = { some: "thing", number: 10 };
                const updateQuery = { $min: { number: 8 } };
                const modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ some: "thing", number: 8 });
                expect(obj).to.be.deep.equal({ some: "thing", number: 10 });
            });

            it("Will not update the field if new value is greater than current one", () => {
                const obj = { some: "thing", number: 10 };
                const updateQuery = { $min: { number: 12 } };
                const modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ some: "thing", number: 10 });
            });

            it("Will create the field if it does not exist", () => {
                const obj = { some: "thing" };
                const updateQuery = { $min: { number: 10 } };
                const modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ some: "thing", number: 10 });
            });

            it("Works on embedded documents", () => {
                const obj = { some: "thing", somethingElse: { number: 10 } };
                const updateQuery = { $min: { "somethingElse.number": 8 } };
                const modified = model.modify(obj, updateQuery);
                expect(modified).to.be.deep.equal({ some: "thing", somethingElse: { number: 8 } });
            });
        }); // End of '$min modifier'
    }); // ==== End of 'Modifying documents' ==== //
    describe("Comparing things", () => {

        it("undefined is the smallest", () => {
            const otherStuff = [null, "string", "", -1, 0, 5.3, 12, true, false, new Date(12345), {}, { hello: "world" }, [], ["quite", 5]];

            expect(model.compareThings(undefined, undefined)).to.be.equal(0);

            otherStuff.forEach((stuff) => {
                expect(model.compareThings(undefined, stuff)).to.be.equal(-1);
                expect(model.compareThings(stuff, undefined)).to.be.equal(1);
            });
        });

        it("Then null", () => {
            const otherStuff = ["string", "", -1, 0, 5.3, 12, true, false, new Date(12345), {}, { hello: "world" }, [], ["quite", 5]];

            expect(model.compareThings(null, null)).to.be.equal(0);

            otherStuff.forEach((stuff) => {
                expect(model.compareThings(null, stuff)).to.be.equal(-1);
                expect(model.compareThings(stuff, null)).to.be.equal(1);
            });
        });

        it("Then numbers", () => {
            const otherStuff = ["string", "", true, false, new Date(4312), {}, { hello: "world" }, [], ["quite", 5]];
            const numbers = [-12, 0, 12, 5.7];
            expect(model.compareThings(-12, 0)).to.be.equal(-1);
            expect(model.compareThings(0, -3)).to.be.equal(1);
            expect(model.compareThings(5.7, 2)).to.be.equal(1);
            expect(model.compareThings(5.7, 12.3)).to.be.equal(-1);
            expect(model.compareThings(0, 0)).to.be.equal(0);
            expect(model.compareThings(-2.6, -2.6)).to.be.equal(0);
            expect(model.compareThings(5, 5)).to.be.equal(0);

            otherStuff.forEach((stuff) => {
                numbers.forEach((number) => {
                    expect(model.compareThings(number, stuff)).to.be.equal(-1);
                    expect(model.compareThings(stuff, number)).to.be.equal(1);
                });
            });
        });

        it("Then strings", () => {
            const otherStuff = [true, false, new Date(4321), {}, { hello: "world" }, [], ["quite", 5]];
            const strings = ["", "string", "hello world"];
            expect(model.compareThings("", "hey")).to.be.equal(-1);
            expect(model.compareThings("hey", "")).to.be.equal(1);
            expect(model.compareThings("hey", "hew")).to.be.equal(1);
            expect(model.compareThings("hey", "hey")).to.be.equal(0);

            otherStuff.forEach((stuff) => {
                strings.forEach((string) => {
                    expect(model.compareThings(string, stuff)).to.be.equal(-1);
                    expect(model.compareThings(stuff, string)).to.be.equal(1);
                });
            });
        });

        it("Then booleans", () => {
            const otherStuff = [new Date(4321), {}, { hello: "world" }, [], ["quite", 5]];
            const bools = [true, false];
            expect(model.compareThings(true, true)).to.be.equal(0);
            expect(model.compareThings(false, false)).to.be.equal(0);
            expect(model.compareThings(true, false)).to.be.equal(1);
            expect(model.compareThings(false, true)).to.be.equal(-1);

            otherStuff.forEach((stuff) => {
                bools.forEach((bool) => {
                    expect(model.compareThings(bool, stuff)).to.be.equal(-1);
                    expect(model.compareThings(stuff, bool)).to.be.equal(1);
                });
            });
        });

        it("Then dates", () => {
            const otherStuff = [{}, { hello: "world" }, [], ["quite", 5]];
            const dates = [new Date(-123), new Date(), new Date(5555), new Date(0)];
            const now = new Date();
            expect(model.compareThings(now, now)).to.be.equal(0);
            expect(model.compareThings(new Date(54341), now)).to.be.equal(-1);
            expect(model.compareThings(now, new Date(54341))).to.be.equal(1);
            expect(model.compareThings(new Date(0), new Date(-54341))).to.be.equal(1);
            expect(model.compareThings(new Date(123), new Date(4341))).to.be.equal(-1);

            otherStuff.forEach((stuff) => {
                dates.forEach((date) => {
                    expect(model.compareThings(date, stuff)).to.be.equal(-1);
                    expect(model.compareThings(stuff, date)).to.be.equal(1);
                });
            });
        });

        it("Then arrays", () => {
            const otherStuff = [{}, { hello: "world" }];
            const arrays = [[], ["yes"], ["hello", 5]];
            expect(model.compareThings([], [])).to.be.equal(0);
            expect(model.compareThings(["hello"], [])).to.be.equal(1);
            expect(model.compareThings([], ["hello"])).to.be.equal(-1);
            expect(model.compareThings(["hello"], ["hello", "world"])).to.be.equal(-1);
            expect(model.compareThings(["hello", "earth"], ["hello", "world"])).to.be.equal(-1);
            expect(model.compareThings(["hello", "zzz"], ["hello", "world"])).to.be.equal(1);
            expect(model.compareThings(["hello", "world"], ["hello", "world"])).to.be.equal(0);

            otherStuff.forEach((stuff) => {
                arrays.forEach((array) => {
                    expect(model.compareThings(array, stuff)).to.be.equal(-1);
                    expect(model.compareThings(stuff, array)).to.be.equal(1);
                });
            });
        });

        it("And finally objects", () => {
            expect(model.compareThings({}, {})).to.be.equal(0);
            expect(model.compareThings({ a: 42 }, { a: 312 })).to.be.equal(-1);
            expect(model.compareThings({ a: "42" }, { a: "312" })).to.be.equal(1);
            expect(model.compareThings({ a: 42, b: 312 }, { b: 312, a: 42 })).to.be.equal(0);
            expect(model.compareThings({ a: 42, b: 312, c: 54 }, { b: 313, a: 42 })).to.be.equal(-1);
        });

        it("Can specify custom string comparison function", () => {
            expect(model.compareThings("hello", "bloup", (a, b) => {
                return a < b ? -1 : 1;
            })).to.be.equal(1);
            expect(model.compareThings("hello", "bloup", (a, b) => {
                return a > b ? -1 : 1;
            })).to.be.equal(-1);
        });
    }); // ==== End of 'Comparing things' ==== //
    describe("Querying", () => {

        describe("Comparing things", () => {

            it("Two things of different types cannot be equal, two identical native things are equal", () => {
                const toTest = [null, "somestring", 42, true, new Date(72998322), { hello: "world" }];
                const toTestAgainst = [null, "somestring", 42, true, new Date(72998322), { hello: "world" }] // Use another array so that we don't test pointer equality
                ;
                let i;
                let j;
                for (i = 0; i < toTest.length; i += 1) {
                    for (j = 0; j < toTestAgainst.length; j += 1) {
                        expect(model.areThingsEqual(toTest[i], toTestAgainst[j])).to.be.equal(i === j);
                    }
                }
            });

            it("Can test native types null undefined string number boolean date equality", () => {
                const toTest = [null, undefined, "somestring", 42, true, new Date(72998322), { hello: "world" }];
                const toTestAgainst = [undefined, null, "someotherstring", 5, false, new Date(111111), { hello: "mars" }];
                let i;
                for (i = 0; i < toTest.length; i += 1) {
                    expect(model.areThingsEqual(toTest[i], toTestAgainst[i])).to.be.false;
                }
            });

            it("If one side is an array or undefined, comparison fails", () => {
                const toTestAgainst = [null, undefined, "somestring", 42, true, new Date(72998322), { hello: "world" }];
                let i;
                for (i = 0; i < toTestAgainst.length; i += 1) {
                    expect(model.areThingsEqual([1, 2, 3], toTestAgainst[i])).to.be.false;
                    expect(model.areThingsEqual(toTestAgainst[i], [])).to.be.false;

                    expect(model.areThingsEqual(undefined, toTestAgainst[i])).to.be.false;
                    expect(model.areThingsEqual(toTestAgainst[i], undefined)).to.be.false;
                }
            });

            it("Can test objects equality", () => {
                expect(model.areThingsEqual({ hello: "world" }, {})).to.be.false;
                expect(model.areThingsEqual({ hello: "world" }, { hello: "mars" })).to.be.false;
                expect(model.areThingsEqual({ hello: "world" }, { hello: "world", temperature: 42 })).to.be.false;
                expect(model.areThingsEqual({ hello: "world", other: { temperature: 42 } }, { hello: "world", other: { temperature: 42 } })).to.be.true;
            });
        });

        describe("Getting a fields value in dot notation", () => {

            it("Return first-level and nested values", () => {
                expect(model.getDotValue({ hello: "world" }, "hello")).to.be.equal("world");
                expect(model.getDotValue({ hello: "world", type: { planet: true, blue: true } }, "type.planet")).to.be.true;
            });

            it("Return undefined if the field cannot be found in the object", () => {
                expect(model.getDotValue({ hello: "world" }, "helloo")).to.be.undefined;
                expect(model.getDotValue({ hello: "world", type: { planet: true } }, "type.plane")).to.be.undefined;
            });

            it("Can navigate inside arrays with dot notation, and return the array of values in that case", () => {
                let dv;

                // Simple array of subdocuments
                dv = model.getDotValue({ planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] }, "planets.name");
                expect(dv).to.be.deep.equal(["Earth", "Mars", "Pluton"]);

                // Nested array of subdocuments
                dv = model.getDotValue({ nedb: true, data: { planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] } }, "data.planets.number");
                expect(dv).to.be.deep.equal([3, 2, 9]);

                // Nested array in a subdocument of an array (yay, inception!)
                // TODO: make sure MongoDB doesn't flatten the array (it wouldn't make sense)
                dv = model.getDotValue({ nedb: true, data: { planets: [{ name: "Earth", numbers: [1, 3] }, { name: "Mars", numbers: [7] }, { name: "Pluton", numbers: [9, 5, 1] }] } }, "data.planets.numbers");
                expect(dv).to.be.deep.equal([[1, 3], [7], [9, 5, 1]]);
            });

            it("Can get a single value out of an array using its index", () => {
                let dv;

                // Simple index in dot notation
                dv = model.getDotValue({ planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] }, "planets.1");
                expect(dv).to.be.deep.equal({ name: "Mars", number: 2 });

                // Out of bounds index
                dv = model.getDotValue({ planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] }, "planets.3");
                expect(dv).to.be.undefined;

                // Index in nested array
                dv = model.getDotValue({ nedb: true, data: { planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] } }, "data.planets.2");
                expect(dv).to.be.deep.equal({ name: "Pluton", number: 9 });

                // Dot notation with index in the middle
                dv = model.getDotValue({ nedb: true, data: { planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] } }, "data.planets.0.name");
                expect(dv).to.be.equal("Earth");
            });
        });

        describe("Field equality", () => {

            it("Can find documents with simple fields", () => {
                expect(model.match({ test: "yeah" }, { test: "yea" })).to.be.false;
                expect(model.match({ test: "yeah" }, { test: "yeahh" })).to.be.false;
                expect(model.match({ test: "yeah" }, { test: "yeah" })).to.be.true;
            });

            it("Can find documents with the dot-notation", () => {
                expect(model.match({ test: { ooo: "yeah" } }, { "test.ooo": "yea" })).to.be.false;
                expect(model.match({ test: { ooo: "yeah" } }, { "test.oo": "yeah" })).to.be.false;
                expect(model.match({ test: { ooo: "yeah" } }, { "tst.ooo": "yeah" })).to.be.false;
                expect(model.match({ test: { ooo: "yeah" } }, { "test.ooo": "yeah" })).to.be.true;
            });

            it("Cannot find undefined", () => {
                expect(model.match({ test: undefined }, { test: undefined })).to.be.false;
                expect(model.match({ test: { pp: undefined } }, { "test.pp": undefined })).to.be.false;
            });

            it("Nested objects are deep-equality matched and not treated as sub-queries", () => {
                expect(model.match({ a: { b: 5 } }, { a: { b: 5 } })).to.be.true;
                expect(model.match({ a: { b: 5, c: 3 } }, { a: { b: 5 } })).to.be.false;

                expect(model.match({ a: { b: 5 } }, { a: { b: { $lt: 10 } } })).to.be.false;
                expect(() => {
                    model.match({ a: { b: 5 } }, { a: { $or: [{ b: 10 }, { b: 5 }] } });
                }).to.throw();
            });

            it("Can match for field equality inside an array with the dot notation", () => {
                expect(model.match({ a: true, b: ["node", "embedded", "database"] }, { "b.1": "node" })).to.be.false;
                expect(model.match({ a: true, b: ["node", "embedded", "database"] }, { "b.1": "embedded" })).to.be.true;
                expect(model.match({ a: true, b: ["node", "embedded", "database"] }, { "b.1": "database" })).to.be.false;
            });
        });

        describe("Regular expression matching", () => {

            it("Matching a non-string to a regular expression always yields false", () => {
                const d = new Date();
                const r = new RegExp(d.getTime());
                expect(model.match({ test: true }, { test: /true/ })).to.be.false;
                expect(model.match({ test: null }, { test: /null/ })).to.be.false;
                expect(model.match({ test: 42 }, { test: /42/ })).to.be.false;
                expect(model.match({ test: d }, { test: r })).to.be.false;
            });

            it("Can match strings using basic querying", () => {
                expect(model.match({ test: "true" }, { test: /true/ })).to.be.true;
                expect(model.match({ test: "babaaaar" }, { test: /aba+r/ })).to.be.true;
                expect(model.match({ test: "babaaaar" }, { test: /^aba+r/ })).to.be.false;
                expect(model.match({ test: "true" }, { test: /t[ru]e/ })).to.be.false;
            });

            it("Can match strings using the $regex operator", () => {
                expect(model.match({ test: "true" }, { test: { $regex: /true/ } })).to.be.true;
                expect(model.match({ test: "babaaaar" }, { test: { $regex: /aba+r/ } })).to.be.true;
                expect(model.match({ test: "babaaaar" }, { test: { $regex: /^aba+r/ } })).to.be.false;
                expect(model.match({ test: "true" }, { test: { $regex: /t[ru]e/ } })).to.be.false;
            });

            it("Will throw if $regex operator is used with a non regex value", () => {
                expect(() => {
                    model.match({ test: "true" }, { test: { $regex: 42 } });
                }).to.throw();

                expect(() => {
                    model.match({ test: "true" }, { test: { $regex: "true" } });
                }).to.throw();
            });

            it("Can use the $regex operator in cunjunction with other operators", () => {
                expect(model.match({ test: "helLo" }, { test: { $regex: /ll/i, $nin: ["helL", "helLop"] } })).to.be.true;
                expect(model.match({ test: "helLo" }, { test: { $regex: /ll/i, $nin: ["helLo", "helLop"] } })).to.be.false;
            });

            it("Can use dot-notation", () => {
                expect(model.match({ test: { nested: "true" } }, { "test.nested": /true/ })).to.be.true;
                expect(model.match({ test: { nested: "babaaaar" } }, { "test.nested": /^aba+r/ })).to.be.false;

                expect(model.match({ test: { nested: "true" } }, { "test.nested": { $regex: /true/ } })).to.be.true;
                expect(model.match({ test: { nested: "babaaaar" } }, { "test.nested": { $regex: /^aba+r/ } })).to.be.false;
            });
        });

        describe("$lt", () => {

            it("Cannot compare a field to an object, an array, null or a boolean, it will return false", () => {
                expect(model.match({ a: 5 }, { a: { $lt: { a: 6 } } })).to.be.false;
                expect(model.match({ a: 5 }, { a: { $lt: [6, 7] } })).to.be.false;
                expect(model.match({ a: 5 }, { a: { $lt: null } })).to.be.false;
                expect(model.match({ a: 5 }, { a: { $lt: true } })).to.be.false;
            });

            it("Can compare numbers, with or without dot notation", () => {
                expect(model.match({ a: 5 }, { a: { $lt: 6 } })).to.be.true;
                expect(model.match({ a: 5 }, { a: { $lt: 5 } })).to.be.false;
                expect(model.match({ a: 5 }, { a: { $lt: 4 } })).to.be.false;

                expect(model.match({ a: { b: 5 } }, { "a.b": { $lt: 6 } })).to.be.true;
                expect(model.match({ a: { b: 5 } }, { "a.b": { $lt: 3 } })).to.be.false;
            });

            it("Can compare strings, with or without dot notation", () => {
                expect(model.match({ a: "nedb" }, { a: { $lt: "nedc" } })).to.be.true;
                expect(model.match({ a: "nedb" }, { a: { $lt: "neda" } })).to.be.false;

                expect(model.match({ a: { b: "nedb" } }, { "a.b": { $lt: "nedc" } })).to.be.true;
                expect(model.match({ a: { b: "nedb" } }, { "a.b": { $lt: "neda" } })).to.be.false;
            });

            it("If field is an array field, a match means a match on at least one element", () => {
                expect(model.match({ a: [5, 10] }, { a: { $lt: 4 } })).to.be.false;
                expect(model.match({ a: [5, 10] }, { a: { $lt: 6 } })).to.be.true;
                expect(model.match({ a: [5, 10] }, { a: { $lt: 11 } })).to.be.true;
            });

            it("Works with dates too", () => {
                expect(model.match({ a: new Date(1000) }, { a: { $gte: new Date(1001) } })).to.be.false;
                expect(model.match({ a: new Date(1000) }, { a: { $lt: new Date(1001) } })).to.be.true;
            });
        });

        // General behaviour is tested in the block about $lt. Here we just test operators work
        describe("Other comparison operators: $lte, $gt, $gte, $ne, $in, $exists", () => {

            it("$lte", () => {
                expect(model.match({ a: 5 }, { a: { $lte: 6 } })).to.be.true;
                expect(model.match({ a: 5 }, { a: { $lte: 5 } })).to.be.true;
                expect(model.match({ a: 5 }, { a: { $lte: 4 } })).to.be.false;
            });

            it("$gt", () => {
                expect(model.match({ a: 5 }, { a: { $gt: 6 } })).to.be.false;
                expect(model.match({ a: 5 }, { a: { $gt: 5 } })).to.be.false;
                expect(model.match({ a: 5 }, { a: { $gt: 4 } })).to.be.true;
            });

            it("$gte", () => {
                expect(model.match({ a: 5 }, { a: { $gte: 6 } })).to.be.false;
                expect(model.match({ a: 5 }, { a: { $gte: 5 } })).to.be.true;
                expect(model.match({ a: 5 }, { a: { $gte: 4 } })).to.be.true;
            });

            it("$ne", () => {
                expect(model.match({ a: 5 }, { a: { $ne: 4 } })).to.be.true;
                expect(model.match({ a: 5 }, { a: { $ne: 5 } })).to.be.false;
                expect(model.match({ a: 5 }, { b: { $ne: 5 } })).to.be.true;
                expect(model.match({ a: false }, { a: { $ne: false } })).to.be.false;
            });

            it("$in", () => {
                expect(model.match({ a: 5 }, { a: { $in: [6, 8, 9] } })).to.be.false;
                expect(model.match({ a: 6 }, { a: { $in: [6, 8, 9] } })).to.be.true;
                expect(model.match({ a: 7 }, { a: { $in: [6, 8, 9] } })).to.be.false;
                expect(model.match({ a: 8 }, { a: { $in: [6, 8, 9] } })).to.be.true;
                expect(model.match({ a: 9 }, { a: { $in: [6, 8, 9] } })).to.be.true;

                expect(() => {
                    model.match({ a: 5 }, { a: { $in: 5 } });
                }).to.throw();
            });

            it("$nin", () => {
                expect(model.match({ a: 5 }, { a: { $nin: [6, 8, 9] } })).to.be.true;
                expect(model.match({ a: 6 }, { a: { $nin: [6, 8, 9] } })).to.be.false;
                expect(model.match({ a: 7 }, { a: { $nin: [6, 8, 9] } })).to.be.true;
                expect(model.match({ a: 8 }, { a: { $nin: [6, 8, 9] } })).to.be.false;
                expect(model.match({ a: 9 }, { a: { $nin: [6, 8, 9] } })).to.be.false;

                // Matches if field doesn't exist
                expect(model.match({ a: 9 }, { b: { $nin: [6, 8, 9] } })).to.be.true;

                expect(() => {
                    model.match({ a: 5 }, { a: { $in: 5 } });
                }).to.throw();
            });

            it("$exists", () => {
                expect(model.match({ a: 5 }, { a: { $exists: 1 } })).to.be.true;
                expect(model.match({ a: 5 }, { a: { $exists: true } })).to.be.true;
                expect(model.match({ a: 5 }, { a: { $exists: new Date() } })).to.be.true;
                expect(model.match({ a: 5 }, { a: { $exists: "" } })).to.be.true;
                expect(model.match({ a: 5 }, { a: { $exists: [] } })).to.be.true;
                expect(model.match({ a: 5 }, { a: { $exists: {} } })).to.be.true;

                expect(model.match({ a: 5 }, { a: { $exists: 0 } })).to.be.false;
                expect(model.match({ a: 5 }, { a: { $exists: false } })).to.be.false;
                expect(model.match({ a: 5 }, { a: { $exists: null } })).to.be.false;
                expect(model.match({ a: 5 }, { a: { $exists: undefined } })).to.be.false;

                expect(model.match({ a: 5 }, { b: { $exists: true } })).to.be.false;

                expect(model.match({ a: 5 }, { b: { $exists: false } })).to.be.true;
            });
        });

        describe("Comparing on arrays", () => {

            it("Can perform a direct array match", () => {
                expect(model.match({ planets: ["Earth", "Mars", "Pluto"], something: "else" }, { planets: ["Earth", "Mars"] })).to.be.false;
                expect(model.match({ planets: ["Earth", "Mars", "Pluto"], something: "else" }, { planets: ["Earth", "Mars", "Pluto"] })).to.be.true;
                expect(model.match({ planets: ["Earth", "Mars", "Pluto"], something: "else" }, { planets: ["Earth", "Pluto", "Mars"] })).to.be.false;
            });

            it("Can query on the size of an array field", () => {
                // Non nested documents
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $size: 0 } })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $size: 1 } })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $size: 2 } })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $size: 3 } })).to.be.true;

                // Nested documents
                expect(model.match({ hello: "world", description: { satellites: ["Moon", "Hubble"], diameter: 6300 } }, { "description.satellites": { $size: 0 } })).to.be.false;
                expect(model.match({ hello: "world", description: { satellites: ["Moon", "Hubble"], diameter: 6300 } }, { "description.satellites": { $size: 1 } })).to.be.false;
                expect(model.match({ hello: "world", description: { satellites: ["Moon", "Hubble"], diameter: 6300 } }, { "description.satellites": { $size: 2 } })).to.be.true;
                expect(model.match({ hello: "world", description: { satellites: ["Moon", "Hubble"], diameter: 6300 } }, { "description.satellites": { $size: 3 } })).to.be.false;

                // Using a projected array
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.names": { $size: 0 } })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.names": { $size: 1 } })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.names": { $size: 2 } })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.names": { $size: 3 } })).to.be.true;
            });

            it("$size operator works with empty arrays", () => {
                expect(model.match({ childrens: [] }, { childrens: { $size: 0 } })).to.be.true;
                expect(model.match({ childrens: [] }, { childrens: { $size: 2 } })).to.be.false;
                expect(model.match({ childrens: [] }, { childrens: { $size: 3 } })).to.be.false;
            });

            it("Should throw an error if a query operator is used without comparing to an integer", () => {
                expect(() => {
                    model.match({ a: [1, 5] }, { a: { $size: 1.4 } });
                }).to.throw();
                expect(() => {
                    model.match({ a: [1, 5] }, { a: { $size: "fdf" } });
                }).to.throw();
                expect(() => {
                    model.match({ a: [1, 5] }, { a: { $size: { $lt: 5 } } });
                }).to.throw();
            });

            it("Using $size operator on a non-array field should prevent match but not throw", () => {
                expect(model.match({ a: 5 }, { a: { $size: 1 } })).to.be.false;
            });

            it("Can use $size several times in the same matcher", () => {
                expect(model.match({ childrens: ["Riri", "Fifi", "Loulou"] }, { childrens: { $size: 3 } })).to.be.true;
                expect(model.match({ childrens: ["Riri", "Fifi", "Loulou"] }, { childrens: { $size: 4 } })).to.be.false; // Of course this can never be true
            });

            it("Can query array documents with multiple simultaneous conditions", () => {
                // Non nested documents
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $elemMatch: { name: "Dewey", age: 7 } } })).to.be.true;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $elemMatch: { name: "Dewey", age: 12 } } })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $elemMatch: { name: "Louie", age: 3 } } })).to.be.false;

                // Nested documents
                expect(model.match({ outer: { childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] } }, { "outer.childrens": { $elemMatch: { name: "Dewey", age: 7 } } })).to.be.true;
                expect(model.match({ outer: { childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] } }, { "outer.childrens": { $elemMatch: { name: "Dewey", age: 12 } } })).to.be.false;
                expect(model.match({ outer: { childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] } }, { "outer.childrens": { $elemMatch: { name: "Louie", age: 3 } } })).to.be.false;
            });

            it("$elemMatch operator works with empty arrays", () => {
                expect(model.match({ childrens: [] }, { childrens: { $elemMatch: { name: "Mitsos" } } })).to.be.false;
                expect(model.match({ childrens: [] }, { childrens: { $elemMatch: {} } })).to.be.false;
            });

            it("Can use more complex comparisons inside nested query documents", () => {
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $elemMatch: { name: "Dewey", age: { $gt: 6, $lt: 8 } } } })).to.be.true;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $elemMatch: { name: "Dewey", age: { $in: [6, 7, 8] } } } })).to.be.true;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $elemMatch: { name: "Dewey", age: { $gt: 6, $lt: 7 } } } })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { childrens: { $elemMatch: { name: "Louie", age: { $gt: 6, $lte: 7 } } } })).to.be.false;
            });
        });

        describe("Logical operators $or, $and, $not", () => {

            it("Any of the subqueries should match for an $or to match", () => {
                expect(model.match({ hello: "world" }, { $or: [{ hello: "pluton" }, { hello: "world" }] })).to.be.true;
                expect(model.match({ hello: "pluton" }, { $or: [{ hello: "pluton" }, { hello: "world" }] })).to.be.true;
                expect(model.match({ hello: "nope" }, { $or: [{ hello: "pluton" }, { hello: "world" }] })).to.be.false;
                expect(model.match({ hello: "world", age: 15 }, { $or: [{ hello: "pluton" }, { age: { $lt: 20 } }] })).to.be.true;
                expect(model.match({ hello: "world", age: 15 }, { $or: [{ hello: "pluton" }, { age: { $lt: 10 } }] })).to.be.false;
            });

            it("All of the subqueries should match for an $and to match", () => {
                expect(model.match({ hello: "world", age: 15 }, { $and: [{ age: 15 }, { hello: "world" }] })).to.be.true;
                expect(model.match({ hello: "world", age: 15 }, { $and: [{ age: 16 }, { hello: "world" }] })).to.be.false;
                expect(model.match({ hello: "world", age: 15 }, { $and: [{ hello: "world" }, { age: { $lt: 20 } }] })).to.be.true;
                expect(model.match({ hello: "world", age: 15 }, { $and: [{ hello: "pluton" }, { age: { $lt: 20 } }] })).to.be.false;
            });

            it("Subquery should not match for a $not to match", () => {
                expect(model.match({ a: 5, b: 10 }, { a: 5 })).to.be.true;
                expect(model.match({ a: 5, b: 10 }, { $not: { a: 5 } })).to.be.false;
            });

            it("Logical operators are all top-level, only other logical operators can be above", () => {
                expect(() => {
                    model.match({ a: { b: 7 } }, { a: { $or: [{ b: 5 }, { b: 7 }] } });
                }).to.throw();
                expect(model.match({ a: { b: 7 } }, { $or: [{ "a.b": 5 }, { "a.b": 7 }] })).to.be.true;
            });

            it("Logical operators can be combined as long as they are on top of the decision tree", () => {
                expect(model.match({ a: 5, b: 7, c: 12 }, { $or: [{ $and: [{ a: 5 }, { b: 8 }] }, { $and: [{ a: 5 }, { c: { $lt: 40 } }] }] })).to.be.true;
                expect(model.match({ a: 5, b: 7, c: 12 }, { $or: [{ $and: [{ a: 5 }, { b: 8 }] }, { $and: [{ a: 5 }, { c: { $lt: 10 } }] }] })).to.be.false;
            });

            it("Should throw an error if a logical operator is used without an array or if an unknown logical operator is used", () => {
                expect(() => {
                    model.match({ a: 5 }, { $or: { a: 5, b: 6 } });
                }).to.throw();
                expect(() => {
                    model.match({ a: 5 }, { $and: { a: 5, b: 6 } });
                }).to.throw();
                expect(() => {
                    model.match({ a: 5 }, { $unknown: [{ a: 5 }] });
                }).to.throw();
            });
        });

        describe("Comparison operator $where", () => {

            it("Function should match and not match correctly", () => {
                expect(model.match({ a: 4 }, { $where() {
                    return this.a === 4;
                } })).to.be.true;
                expect(model.match({ a: 4 }, { $where() {
                    return this.a === 5;
                } })).to.be.false;
            });

            it("Should throw an error if the $where function is not, in fact, a function", () => {
                expect(() => {
                    model.match({ a: 4 }, { $where: "not a function" });
                }).to.throw();
            });

            it("Should throw an error if the $where function returns a non-boolean", () => {
                expect(() => {
                    model.match({ a: 4 }, { $where() {
                        return "not a boolean";
                    } });
                }).to.throw();
            });

            it("Should be able to do the complex matching it must be used for", () => {
                const checkEmail = function () {
                    if (!this.firstName || !this.lastName) {
                        return false;
                    }
                    return `${this.firstName.toLowerCase()}.${this.lastName.toLowerCase()}@gmail.com` === this.email;
                };
                expect(model.match({ firstName: "John", lastName: "Doe", email: "john.doe@gmail.com" }, { $where: checkEmail })).to.be.true;
                expect(model.match({ firstName: "john", lastName: "doe", email: "john.doe@gmail.com" }, { $where: checkEmail })).to.be.true;
                expect(model.match({ firstName: "Jane", lastName: "Doe", email: "john.doe@gmail.com" }, { $where: checkEmail })).to.be.false;
                expect(model.match({ firstName: "John", lastName: "Deere", email: "john.doe@gmail.com" }, { $where: checkEmail })).to.be.false;
                expect(model.match({ lastName: "Doe", email: "john.doe@gmail.com" }, { $where: checkEmail })).to.be.false;
            });
        });

        describe("Array fields", () => {

            it("Field equality", () => {
                expect(model.match({ tags: ["node", "js", "db"] }, { tags: "python" })).to.be.false;
                expect(model.match({ tags: ["node", "js", "db"] }, { tagss: "js" })).to.be.false;
                expect(model.match({ tags: ["node", "js", "db"] }, { tags: "js" })).to.be.true;
                expect(model.match({ tags: ["node", "js", "db"] }, { tags: "node" })).to.be.true;

                // Mixed matching with array and non array
                expect(model.match({ tags: ["node", "js", "db"], nedb: true }, { tags: "js", nedb: true })).to.be.true;

                // Nested matching
                expect(model.match({ number: 5, data: { tags: ["node", "js", "db"] } }, { "data.tags": "js" })).to.be.true;
                expect(model.match({ number: 5, data: { tags: ["node", "js", "db"] } }, { "data.tags": "j" })).to.be.false;
            });

            it("With one comparison operator", () => {
                expect(model.match({ ages: [3, 7, 12] }, { ages: { $lt: 2 } })).to.be.false;
                expect(model.match({ ages: [3, 7, 12] }, { ages: { $lt: 3 } })).to.be.false;
                expect(model.match({ ages: [3, 7, 12] }, { ages: { $lt: 4 } })).to.be.true;
                expect(model.match({ ages: [3, 7, 12] }, { ages: { $lt: 8 } })).to.be.true;
                expect(model.match({ ages: [3, 7, 12] }, { ages: { $lt: 13 } })).to.be.true;
            });

            it("Works with arrays that are in subdocuments", () => {
                expect(model.match({ children: { ages: [3, 7, 12] } }, { "children.ages": { $lt: 2 } })).to.be.false;
                expect(model.match({ children: { ages: [3, 7, 12] } }, { "children.ages": { $lt: 3 } })).to.be.false;
                expect(model.match({ children: { ages: [3, 7, 12] } }, { "children.ages": { $lt: 4 } })).to.be.true;
                expect(model.match({ children: { ages: [3, 7, 12] } }, { "children.ages": { $lt: 8 } })).to.be.true;
                expect(model.match({ children: { ages: [3, 7, 12] } }, { "children.ages": { $lt: 13 } })).to.be.true;
            });

            it("Can query inside arrays thanks to dot notation", () => {
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.age": { $lt: 2 } })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.age": { $lt: 3 } })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.age": { $lt: 4 } })).to.be.true;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.age": { $lt: 8 } })).to.be.true;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.age": { $lt: 13 } })).to.be.true;

                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.name": "Louis" })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.name": "Louie" })).to.be.true;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.name": "Lewi" })).to.be.false;
            });

            it("Can query for a specific element inside arrays thanks to dot notation", () => {
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.0.name": "Louie" })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.1.name": "Louie" })).to.be.false;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.2.name": "Louie" })).to.be.true;
                expect(model.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.3.name": "Louie" })).to.be.false;
            });

            it("A single array-specific operator and the query is treated as array specific", () => {
                expect(() => {
                    model.match({ childrens: ["Riri", "Fifi", "Loulou"] }, { childrens: { Fifi: true, $size: 3 } });
                }).to.throw();
            });

            it("Can mix queries on array fields and non array filds with array specific operators", () => {
                expect(model.match({ uncle: "Donald", nephews: ["Riri", "Fifi", "Loulou"] }, { nephews: { $size: 2 }, uncle: "Donald" })).to.be.false;
                expect(model.match({ uncle: "Donald", nephews: ["Riri", "Fifi", "Loulou"] }, { nephews: { $size: 3 }, uncle: "Donald" })).to.be.true;
                expect(model.match({ uncle: "Donald", nephews: ["Riri", "Fifi", "Loulou"] }, { nephews: { $size: 4 }, uncle: "Donald" })).to.be.false;

                expect(model.match({ uncle: "Donals", nephews: ["Riri", "Fifi", "Loulou"] }, { nephews: { $size: 3 }, uncle: "Picsou" })).to.be.false;
                expect(model.match({ uncle: "Donald", nephews: ["Riri", "Fifi", "Loulou"] }, { nephews: { $size: 3 }, uncle: "Donald" })).to.be.true;
                expect(model.match({ uncle: "Donald", nephews: ["Riri", "Fifi", "Loulou"] }, { nephews: { $size: 3 }, uncle: "Daisy" })).to.be.false;
            });
        });
    }); // ==== End of 'Querying' ==== //
});
