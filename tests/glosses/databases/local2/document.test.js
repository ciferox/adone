const { document } = adone.database.local2;
const _ = require("underscore");
const util = require("util");

describe.skip("Document", () => {

    describe("Serialization, deserialization", () => {

        it("Can serialize and deserialize strings", () => {
            let a, b, c;

            a = { test: "Some string" };
            b = document.serialize(a);
            c = document.deserialize(b);
            assert.equal(b.indexOf("\n"), -1);
            assert.equal(c.test, "Some string");

            // Even if a property is a string containing a new line, the serialized
            // version doesn't. The new line must still be there upon deserialization
            a = { test: "With a new\nline" };
            b = document.serialize(a);
            c = document.deserialize(b);
            assert.equal(c.test, "With a new\nline");
            assert.notEqual(a.test.indexOf("\n"), -1);
            assert.equal(b.indexOf("\n"), -1);
            assert.notEqual(c.test.indexOf("\n"), -1);
        });

        it("Can serialize and deserialize booleans", () => {
            let a, b, c;

            a = { test: true };
            b = document.serialize(a);
            c = document.deserialize(b);
            assert.equal(b.indexOf("\n"), -1);
            assert.equal(c.test, true);
        });

        it("Can serialize and deserialize numbers", () => {
            let a, b, c;

            a = { test: 5 };
            b = document.serialize(a);
            c = document.deserialize(b);
            assert.equal(b.indexOf("\n"), -1);
            assert.equal(c.test, 5);
        });

        it("Can serialize and deserialize null", () => {
            let a, b, c;

            a = { test: null };
            b = document.serialize(a);
            c = document.deserialize(b);
            assert.equal(b.indexOf("\n"), -1);
            assert.isNull(a.test);
        });

        it("undefined fields are removed when serialized", () => {
            let a = { bloup: undefined, hello: "world" }
                , b = document.serialize(a)
                , c = document.deserialize(b)
                ;

            assert.equal(Object.keys(c).length, 1);
            assert.equal(c.hello, "world");
            assert.isUndefined(c.bloup);
        });

        it("Can serialize and deserialize a date", () => {
            let a, b, c
                , d = new Date();

            a = { test: d };
            b = document.serialize(a);
            c = document.deserialize(b);
            assert.equal(b.indexOf("\n"), -1);
            assert.equal(b, `{"test":{"$$date":${d.getTime()}}}`);
            assert.equal(util.isDate(c.test), true);
            assert.equal(c.test.getTime(), d.getTime());
        });


        it("Can serialize and deserialize a RegExp", () => {
            let a, b, c
                , r = /test/i;

            a = { test: r };
            b = document.serialize(a);
            c = document.deserialize(b);
            assert.equal(b.indexOf("\n"), -1);
            assert.equal(b, `{"test":{"$$regex":"${r.toString()}"}}`);
            assert.equal((c.test instanceof RegExp), true);
            assert.equal(c.test.toString(), r.toString());
        });

        it("Can serialize and deserialize sub objects", () => {
            let a, b, c
                , d = new Date();

            a = { test: { something: 39, also: d, yes: { again: "yes" } } };
            b = document.serialize(a);
            c = document.deserialize(b);
            assert.equal(b.indexOf("\n"), -1);
            assert.equal(c.test.something, 39);
            assert.equal(c.test.also.getTime(), d.getTime());
            assert.equal(c.test.yes.again, "yes");
        });

        it("Can serialize and deserialize sub arrays", () => {
            let a, b, c
                , d = new Date();

            a = { test: [39, d, { again: "yes" }] };
            b = document.serialize(a);
            c = document.deserialize(b);
            assert.equal(b.indexOf("\n"), -1);
            assert.equal(c.test[0], 39);
            assert.equal(c.test[1].getTime(), d.getTime());
            assert.equal(c.test[2].again, "yes");
        });

        it("Reject field names beginning with a $ sign or containing a dot, except the four edge cases", () => {
            let a1 = { $something: "totest" }
                , a2 = { "with.dot": "totest" }
                , e1 = { $$date: 4321 }
                , e2 = { $$deleted: true }
                , e3 = { $$indexCreated: "indexName" }
                , e4 = { $$indexRemoved: "indexName" }
                , b;

            // Normal cases
            assert.throws(() => b = document.serialize(a1));
            assert.throws(() => b = document.serialize(a2));

            // Edge cases
            b = document.serialize(e1);
            b = document.serialize(e2);
            b = document.serialize(e3);
            b = document.serialize(e4);
        });
        /*
        it('Can serialize string fields with a new line without breaking the DB', function (done) {
          var db1, db2
            , badString = "world\r\nearth\nother\rline"
            ;
          
          if (fs.existsSync('workspace/test1.db')) { fs.unlinkSync('workspace/test1.db'); }
          fs.existsSync('workspace/test1.db'), false);
          db1 = new Datastore({ filename: 'workspace/test1.db' });
          
          db1.reload(function (err) {
            assert.isNull(err);
            db1.insert({ hello: badString }, function (err) {
              assert.isNull(err);
            
              db2 = new Datastore({ filename: 'workspace/test1.db' });
              db2.reload(function (err) {
                assert.isNull(err);
                db2.find({}, function (err, docs) {
                  assert.isNull(err);
                  docs.length, 1);
                  docs[0].hello, badString);
    
                  done();
                });
              });
            });
          });
        });
    */

    });   // ==== End of 'Serialization, deserialization' ==== //


    describe("Object checking", () => {

        it("Field names beginning with a $ sign are forbidden", () => {
            assert.isDefined(document.checkObject);

            assert.throws(() => document.checkObject({ $bad: true }));

            assert.throws(() => document.checkObject({ some: 42, nested: { again: "no", $worse: true } }));

            // This shouldn't throw since "$actuallyok" is not a field name
            document.checkObject({ some: 42, nested: [5, "no", "$actuallyok", true] });

            assert.throws(() => document.checkObject({ some: 42, nested: [5, "no", "$actuallyok", true, { $hidden: "useless" }] }));
        });

        it("Field names cannot contain a .", () => {
            assert.isDefined(document.checkObject);

            assert.throws(() => document.checkObject({ "so.bad": true }));

            // Recursive behaviour testing done in the above test on $ signs
        });

        it("Properties with a null value dont trigger an error", () => {
            const obj = { prop: null };

            document.checkObject(obj);
        });

        it("Can check if an object is a primitive or not", () => {
            assert.equal(document.isPrimitiveType(5), true);
            assert.equal(document.isPrimitiveType("sdsfdfs"), true);
            assert.equal(document.isPrimitiveType(0), true);
            assert.equal(document.isPrimitiveType(true), true);
            assert.equal(document.isPrimitiveType(false), true);
            assert.equal(document.isPrimitiveType(new Date()), true);
            assert.equal(document.isPrimitiveType([]), true);
            assert.equal(document.isPrimitiveType([3, "try"]), true);
            assert.equal(document.isPrimitiveType(null), true);

            assert.equal(document.isPrimitiveType({}), false);
            assert.equal(document.isPrimitiveType({ a: 42 }), false);
        });

    });   // ==== End of 'Object checking' ==== //


    describe("Deep copying", () => {

        it("Should be able to deep copy any serializable document", () => {
            let d = new Date()
                , obj = { a: ["ee", "ff", 42], date: d, subobj: { a: "b", b: "c" } }
                , res = document.deepCopy(obj);


            assert.equal(res.a.length, 3);
            assert.equal(res.a[0], "ee");
            assert.equal(res.a[1], "ff");
            assert.equal(res.a[2], 42);
            assert.equal(res.date.getTime(), d.getTime());
            assert.equal(res.subobj.a, "b");
            assert.equal(res.subobj.b, "c");

            obj.a.push("ggg");
            obj.date = "notadate";
            obj.subobj = [];

            // Even if the original object is modified, the copied one isn't
            assert.equal(res.a.length, 3);
            assert.equal(res.a[0], "ee");
            assert.equal(res.a[1], "ff");
            assert.equal(res.a[2], 42);
            assert.equal(res.date.getTime(), d.getTime());
            assert.equal(res.subobj.a, "b");
            assert.equal(res.subobj.b, "c");
        });

        it("Should deep copy the contents of an array", () => {
            let a = [{ hello: "world" }]
                , b = document.deepCopy(a)
                ;

            assert.equal(b[0].hello, "world");
            b[0].hello = "another";
            assert.equal(b[0].hello, "another");
            assert.equal(a[0].hello, "world");
        });

        it("Without the strictKeys option, everything gets deep copied", () => {
            let a = { a: 4, $e: "rrr", "eee.rt": 42, nested: { yes: 1, "tt.yy": 2, $nopenope: 3 }, array: [{ "rr.hh": 1 }, { yes: true }, { $yes: false }] }
                , b = document.deepCopy(a)
                ;

            assert.deepEqual(a, b);
        });

        it("With the strictKeys option, only valid keys gets deep copied", () => {
            let a = { a: 4, $e: "rrr", "eee.rt": 42, nested: { yes: 1, "tt.yy": 2, $nopenope: 3 }, array: [{ "rr.hh": 1 }, { yes: true }, { $yes: false }] }
                , b = document.deepCopy(a, true)
                ;

            assert.deepEqual(b, { a: 4, nested: { yes: 1 }, array: [{}, { yes: true }, {}] });
        });

    });   // ==== End of 'Deep copying' ==== //


    describe("Modifying documents", () => {

        it("Queries not containing any modifier just replace the document by the contents of the query but keep its _id", () => {
            let obj = { some: "thing", _id: "keepit" }
                , updateQuery = { replace: "done", bloup: [1, 8] }
                , t
                ;

            t = document.modify(obj, updateQuery);
            assert.equal(t.replace, "done");
            assert.equal(t.bloup.length, 2);
            assert.equal(t.bloup[0], 1);
            assert.equal(t.bloup[1], 8);

            assert.isUndefined(t.some);
            assert.equal(t._id, "keepit");
        });

        it("Throw an error if trying to change the _id field in a copy-type modification", () => {
            let obj = { some: "thing", _id: "keepit" }
                , updateQuery = { replace: "done", bloup: [1, 8], _id: "donttryit" }
                ;

            assert.throws(() => document.modify(obj, updateQuery));

            updateQuery._id = "keepit";
            document.modify(obj, updateQuery);   // No error thrown
        });

        it("Throw an error if trying to use modify in a mixed copy+modify way", () => {
            let obj = { some: "thing" }
                , updateQuery = { replace: "me", $modify: "metoo" };

            assert.throws(() => document.modify(obj, updateQuery));
        });

        it("Throw an error if trying to use an inexistent modifier", () => {
            let obj = { some: "thing" }
                , updateQuery = { $set: "this exists", $modify: "not this one" };

            assert.throws(() => document.modify(obj, updateQuery));
        });

        it.skip("Throw an error if a modifier is used with a non-object argument", () => {
            const obj = { some: "thing" };
            const updateQuery = { $set: "this exists" };

            assert.throws(() => document.modify(obj, updateQuery));
        });

        describe("$set modifier", () => {
            it("Can change already set fields without modfifying the underlying object", () => {
                let obj = { some: "thing", yup: "yes", nay: "noes" }
                    , updateQuery = { $set: { some: "changed", nay: "yes indeed" } }
                    , modified = document.modify(obj, updateQuery);

                assert.equal(Object.keys(modified).length, 3);
                assert.equal(modified.some, "changed");
                assert.equal(modified.yup, "yes");
                assert.equal(modified.nay, "yes indeed");

                assert.equal(Object.keys(obj).length, 3);
                assert.equal(obj.some, "thing");
                assert.equal(obj.yup, "yes");
                assert.equal(obj.nay, "noes");
            });

            it("Creates fields to set if they dont exist yet", () => {
                let obj = { yup: "yes" }
                    , updateQuery = { $set: { some: "changed", nay: "yes indeed" } }
                    , modified = document.modify(obj, updateQuery);

                assert.equal(Object.keys(modified).length, 3);
                assert.equal(modified.some, "changed");
                assert.equal(modified.yup, "yes");
                assert.equal(modified.nay, "yes indeed");
            });

            it("Can set sub-fields and create them if necessary", () => {
                let obj = { yup: { subfield: "bloup" } }
                    , updateQuery = { $set: { "yup.subfield": "changed", "yup.yop": "yes indeed", "totally.doesnt.exist": "now it does" } }
                    , modified = document.modify(obj, updateQuery);

                assert.equal(_.isEqual(modified, { yup: { subfield: "changed", yop: "yes indeed" }, totally: { doesnt: { exist: "now it does" } } }), true);
            });
        });   // End of '$set modifier'

        describe("$unset modifier", () => {

            it("Can delete a field, not throwing an error if the field doesnt exist", () => {
                let obj, updateQuery, modified;

                obj = { yup: "yes", other: "also" };
                updateQuery = { $unset: { yup: true } };
                modified = document.modify(obj, updateQuery);
                assert.deepEqual(modified, { other: "also" });

                obj = { yup: "yes", other: "also" };
                updateQuery = { $unset: { nope: true } };
                modified = document.modify(obj, updateQuery);
                assert.deepEqual(modified, obj);

                obj = { yup: "yes", other: "also" };
                updateQuery = { $unset: { nope: true, other: true } };
                modified = document.modify(obj, updateQuery);
                assert.deepEqual(modified, { yup: "yes" });
            });

            it("Can unset sub-fields and entire nested documents", () => {
                let obj, updateQuery, modified;

                obj = { yup: "yes", nested: { a: "also", b: "yeah" } };
                updateQuery = { $unset: { nested: true } };
                modified = document.modify(obj, updateQuery);
                assert.deepEqual(modified, { yup: "yes" });

                obj = { yup: "yes", nested: { a: "also", b: "yeah" } };
                updateQuery = { $unset: { "nested.a": true } };
                modified = document.modify(obj, updateQuery);
                assert.deepEqual(modified, { yup: "yes", nested: { b: "yeah" } });

                obj = { yup: "yes", nested: { a: "also", b: "yeah" } };
                updateQuery = { $unset: { "nested.a": true, "nested.b": true } };
                modified = document.modify(obj, updateQuery);
                assert.deepEqual(modified, { yup: "yes", nested: {} });
            });

        });   // End of '$unset modifier'

        describe("$inc modifier", () => {
            it("Throw an error if you try to use it with a non-number or on a non number field", () => {
                assert.throws(() => {
                    let obj = { some: "thing", yup: "yes", nay: 2 }
                        , updateQuery = { $inc: { nay: "notanumber" } }
                        , modified = document.modify(obj, updateQuery);
                });

                assert.throws(() => {
                    let obj = { some: "thing", yup: "yes", nay: "nope" }
                        , updateQuery = { $inc: { nay: 1 } }
                        , modified = document.modify(obj, updateQuery);
                });
            });

            it("Can increment number fields or create and initialize them if needed", () => {
                let obj = { some: "thing", nay: 40 }
                    , modified;

                modified = document.modify(obj, { $inc: { nay: 2 } });
                assert.equal(_.isEqual(modified, { some: "thing", nay: 42 }), true);

                // Incidentally, this tests that obj was not modified
                modified = document.modify(obj, { $inc: { inexistent: -6 } });
                assert.equal(_.isEqual(modified, { some: "thing", nay: 40, inexistent: -6 }), true);
            });

            it("Works recursively", () => {
                let obj = { some: "thing", nay: { nope: 40 } }
                    , modified;

                modified = document.modify(obj, { $inc: { "nay.nope": -2, "blip.blop": 123 } });
                assert.equal(_.isEqual(modified, { some: "thing", nay: { nope: 38 }, blip: { blop: 123 } }), true);
            });
        });   // End of '$inc modifier'

        describe("$push modifier", () => {

            it("Can push an element to the end of an array", () => {
                let obj = { arr: ["hello"] }
                    , modified;

                modified = document.modify(obj, { $push: { arr: "world" } });
                assert.deepEqual(modified, { arr: ["hello", "world"] });
            });

            it("Can push an element to a non-existent field and will create the array", () => {
                let obj = {}
                    , modified;

                modified = document.modify(obj, { $push: { arr: "world" } });
                assert.deepEqual(modified, { arr: ["world"] });
            });

            it("Can push on nested fields", () => {
                let obj = { arr: { nested: ["hello"] } }
                    , modified;

                modified = document.modify(obj, { $push: { "arr.nested": "world" } });
                assert.deepEqual(modified, { arr: { nested: ["hello", "world"] } });

                obj = { arr: { a: 2 } };
                modified = document.modify(obj, { $push: { "arr.nested": "world" } });
                assert.deepEqual(modified, { arr: { a: 2, nested: ["world"] } });
            });

            it("Throw if we try to push to a non-array", () => {
                let obj = { arr: "hello" }
                    , modified;

                assert.throws(() => modified = document.modify(obj, { $push: { arr: "world" } }));

                obj = { arr: { nested: 45 } };
                assert.throws(() => modified = document.modify(obj, { $push: { "arr.nested": "world" } }));
            });

            it("Can use the $each modifier to add multiple values to an array at once", () => {
                let obj = { arr: ["hello"] }
                    , modified;

                modified = document.modify(obj, { $push: { arr: { $each: ["world", "earth", "everything"] } } });
                assert.deepEqual(modified, { arr: ["hello", "world", "earth", "everything"] });

                assert.throws(() => modified = document.modify(obj, { $push: { arr: { $each: 45 } } }));

                assert.throws(() => modified = document.modify(obj, { $push: { arr: { $each: ["world"], unauthorized: true } } }));
            });

        });   // End of '$push modifier'

        describe("$addToSet modifier", () => {

            it("Can add an element to a set", () => {
                let obj = { arr: ["hello"] }
                    , modified;

                modified = document.modify(obj, { $addToSet: { arr: "world" } });
                assert.deepEqual(modified, { arr: ["hello", "world"] });

                obj = { arr: ["hello"] };
                modified = document.modify(obj, { $addToSet: { arr: "hello" } });
                assert.deepEqual(modified, { arr: ["hello"] });
            });

            it("Can add an element to a non-existent set and will create the array", () => {
                let obj = { arr: [] }
                    , modified;

                modified = document.modify(obj, { $addToSet: { arr: "world" } });
                assert.deepEqual(modified, { arr: ["world"] });
            });

            it("Throw if we try to addToSet to a non-array", () => {
                let obj = { arr: "hello" }
                    , modified;

                assert.throws(() => modified = document.modify(obj, { $addToSet: { arr: "world" } }));
            });

            it("Use deep-equality to check whether we can add a value to a set", () => {
                let obj = { arr: [{ b: 2 }] }
                    , modified;

                modified = document.modify(obj, { $addToSet: { arr: { b: 3 } } });
                assert.deepEqual(modified, { arr: [{ b: 2 }, { b: 3 }] });

                obj = { arr: [{ b: 2 }] };
                modified = document.modify(obj, { $addToSet: { arr: { b: 2 } } });
                assert.deepEqual(modified, { arr: [{ b: 2 }] });
            });

            it("Can use the $each modifier to add multiple values to a set at once", () => {
                let obj = { arr: ["hello"] }
                    , modified;

                modified = document.modify(obj, { $addToSet: { arr: { $each: ["world", "earth", "hello", "earth"] } } });
                assert.deepEqual(modified, { arr: ["hello", "world", "earth"] });

                assert.throws(() => modified = document.modify(obj, { $addToSet: { arr: { $each: 45 } } }));

                assert.throws(() => modified = document.modify(obj, { $addToSet: { arr: { $each: ["world"], unauthorized: true } } }));
            });

        });   // End of '$addToSet modifier'

        describe("$pop modifier", () => {

            it("Throw if called on a non array, a non defined field or a non integer", () => {
                let obj = { arr: "hello" }
                    , modified;

                assert.throws(() => modified = document.modify(obj, { $pop: { arr: 1 } }));

                obj = { bloup: "nope" };
                assert.throws(() => modified = document.modify(obj, { $pop: { arr: 1 } }));

                obj = { arr: [1, 4, 8] };
                assert.throws(() => modified = document.modify(obj, { $pop: { arr: true } }));
            });

            it("Can remove the first and last element of an array", () => {
                let obj
                    , modified;

                obj = { arr: [1, 4, 8] };
                modified = document.modify(obj, { $pop: { arr: 1 } });
                assert.deepEqual(modified, { arr: [1, 4] });

                obj = { arr: [1, 4, 8] };
                modified = document.modify(obj, { $pop: { arr: -1 } });
                assert.deepEqual(modified, { arr: [4, 8] });

                // Empty arrays are not changed
                obj = { arr: [] };
                modified = document.modify(obj, { $pop: { arr: 1 } });
                assert.deepEqual(modified, { arr: [] });
                modified = document.modify(obj, { $pop: { arr: -1 } });
                assert.deepEqual(modified, { arr: [] });
            });

        });   // End of '$pop modifier'

        describe("$pull modifier", () => {

            it("Can remove an element from a set", () => {
                let obj = { arr: ["hello", "world"] }
                    , modified;

                modified = document.modify(obj, { $pull: { arr: "world" } });
                assert.deepEqual(modified, { arr: ["hello"] });

                obj = { arr: ["hello"] };
                modified = document.modify(obj, { $pull: { arr: "world" } });
                assert.deepEqual(modified, { arr: ["hello"] });
            });

            it("Can remove multiple matching elements", () => {
                let obj = { arr: ["hello", "world", "hello", "world"] }
                    , modified;

                modified = document.modify(obj, { $pull: { arr: "world" } });
                assert.deepEqual(modified, { arr: ["hello", "hello"] });
            });

            it("Throw if we try to pull from a non-array", () => {
                let obj = { arr: "hello" }
                    , modified;

                assert.throws(() => modified = document.modify(obj, { $pull: { arr: "world" } }));
            });

            it("Use deep-equality to check whether we can remove a value from a set", () => {
                let obj = { arr: [{ b: 2 }, { b: 3 }] }
                    , modified;

                modified = document.modify(obj, { $pull: { arr: { b: 3 } } });
                assert.deepEqual(modified, { arr: [{ b: 2 }] });

                obj = { arr: [{ b: 2 }] };
                modified = document.modify(obj, { $pull: { arr: { b: 3 } } });
                assert.deepEqual(modified, { arr: [{ b: 2 }] });
            });

            it("Can use any kind of nedb query with $pull", () => {
                let obj = { arr: [4, 7, 12, 2], other: "yup" }
                    , modified
                    ;

                modified = document.modify(obj, { $pull: { arr: { $gte: 5 } } });
                assert.deepEqual(modified, { arr: [4, 2], other: "yup" });

                obj = { arr: [{ b: 4 }, { b: 7 }, { b: 1 }], other: "yeah" };
                modified = document.modify(obj, { $pull: { arr: { b: { $gte: 5 } } } });
                assert.deepEqual(modified, { arr: [{ b: 4 }, { b: 1 }], other: "yeah" });
            });

        });   // End of '$pull modifier'

    });   // ==== End of 'Modifying documents' ==== //


    describe("Comparing things", () => {

        it("undefined is the smallest", () => {
            const otherStuff = [null, "string", "", -1, 0, 5.3, 12, true, false, new Date(12345), {}, { hello: "world" }, [], ["quite", 5]];

            assert.equal(document.compareThings(undefined, undefined), 0);

            otherStuff.forEach((stuff) => {
                assert.equal(document.compareThings(undefined, stuff), -1);
                assert.equal(document.compareThings(stuff, undefined), 1);
            });
        });

        it("Then null", () => {
            const otherStuff = ["string", "", -1, 0, 5.3, 12, true, false, new Date(12345), {}, { hello: "world" }, [], ["quite", 5]];

            assert.equal(document.compareThings(null, null), 0);

            otherStuff.forEach((stuff) => {
                assert.equal(document.compareThings(null, stuff), -1);
                assert.equal(document.compareThings(stuff, null), 1);
            });
        });

        it("Then numbers", () => {
            let otherStuff = ["string", "", true, false, new Date(4312), {}, { hello: "world" }, [], ["quite", 5]]
                , numbers = [-12, 0, 12, 5.7];

            assert.equal(document.compareThings(-12, 0), -1);
            assert.equal(document.compareThings(0, -3), 1);
            assert.equal(document.compareThings(5.7, 2), 1);
            assert.equal(document.compareThings(5.7, 12.3), -1);
            assert.equal(document.compareThings(0, 0), 0);
            assert.equal(document.compareThings(-2.6, -2.6), 0);
            assert.equal(document.compareThings(5, 5), 0);

            otherStuff.forEach((stuff) => {
                numbers.forEach((number) => {
                    assert.equal(document.compareThings(number, stuff), -1);
                    assert.equal(document.compareThings(stuff, number), 1);
                });
            });
        });

        it("Then strings", () => {
            let otherStuff = [true, false, new Date(4321), {}, { hello: "world" }, [], ["quite", 5]]
                , strings = ["", "string", "hello world"];

            assert.equal(document.compareThings("", "hey"), -1);
            assert.equal(document.compareThings("hey", ""), 1);
            assert.equal(document.compareThings("hey", "hew"), 1);
            assert.equal(document.compareThings("hey", "hey"), 0);

            otherStuff.forEach((stuff) => {
                strings.forEach((string) => {
                    assert.equal(document.compareThings(string, stuff), -1);
                    assert.equal(document.compareThings(stuff, string), 1);
                });
            });
        });

        it("Then booleans", () => {
            let otherStuff = [new Date(4321), {}, { hello: "world" }, [], ["quite", 5]]
                , bools = [true, false];

            assert.equal(document.compareThings(true, true), 0);
            assert.equal(document.compareThings(false, false), 0);
            assert.equal(document.compareThings(true, false), 1);
            assert.equal(document.compareThings(false, true), -1);

            otherStuff.forEach((stuff) => {
                bools.forEach((bool) => {
                    assert.equal(document.compareThings(bool, stuff), -1);
                    assert.equal(document.compareThings(stuff, bool), 1);
                });
            });
        });

        it("Then dates", () => {
            let otherStuff = [{}, { hello: "world" }, [], ["quite", 5]]
                , dates = [new Date(-123), new Date(), new Date(5555), new Date(0)]
                , now = new Date();

            assert.equal(document.compareThings(now, now), 0);
            assert.equal(document.compareThings(new Date(54341), now), -1);
            assert.equal(document.compareThings(now, new Date(54341)), 1);
            assert.equal(document.compareThings(new Date(0), new Date(-54341)), 1);
            assert.equal(document.compareThings(new Date(123), new Date(4341)), -1);

            otherStuff.forEach((stuff) => {
                dates.forEach((date) => {
                    assert.equal(document.compareThings(date, stuff), -1);
                    assert.equal(document.compareThings(stuff, date), 1);
                });
            });
        });

        it("Then arrays", () => {
            let otherStuff = [{}, { hello: "world" }]
                , arrays = [[], ["yes"], ["hello", 5]]
                ;

            assert.equal(document.compareThings([], []), 0);
            assert.equal(document.compareThings(["hello"], []), 1);
            assert.equal(document.compareThings([], ["hello"]), -1);
            assert.equal(document.compareThings(["hello"], ["hello", "world"]), -1);
            assert.equal(document.compareThings(["hello", "earth"], ["hello", "world"]), -1);
            assert.equal(document.compareThings(["hello", "zzz"], ["hello", "world"]), 1);
            assert.equal(document.compareThings(["hello", "world"], ["hello", "world"]), 0);

            otherStuff.forEach((stuff) => {
                arrays.forEach((array) => {
                    assert.equal(document.compareThings(array, stuff), -1);
                    assert.equal(document.compareThings(stuff, array), 1);
                });
            });
        });

        it("And finally objects", () => {
            assert.equal(document.compareThings({}, {}), 0);
            assert.equal(document.compareThings({ a: 42 }, { a: 312 }), -1);
            assert.equal(document.compareThings({ a: "42" }, { a: "312" }), 1);
            assert.equal(document.compareThings({ a: 42, b: 312 }, { b: 312, a: 42 }), 0);
            assert.equal(document.compareThings({ a: 42, b: 312, c: 54 }, { b: 313, a: 42 }), -1);
        });

    });   // ==== End of 'Comparing things' ==== //


    describe("Querying", () => {

        describe("Comparing things", () => {

            it("Two things of different types cannot be equal, two identical native things are equal", () => {
                let toTest = [null, "somestring", 42, true, new Date(72998322), { hello: "world" }]
                    , toTestAgainst = [null, "somestring", 42, true, new Date(72998322), { hello: "world" }]   // Use another array so that we don't test pointer equality
                    , i, j
                    ;

                for (i = 0; i < toTest.length; i += 1) {
                    for (j = 0; j < toTestAgainst.length; j += 1) {
                        assert.equal(document.areThingsEqual(toTest[i], toTestAgainst[j]), i === j);
                    }
                }
            });

            it("Can test native types null undefined string number boolean date equality", () => {
                let toTest = [null, undefined, "somestring", 42, true, new Date(72998322), { hello: "world" }]
                    , toTestAgainst = [undefined, null, "someotherstring", 5, false, new Date(111111), { hello: "mars" }]
                    , i
                    ;

                for (i = 0; i < toTest.length; i += 1) {
                    assert.equal(document.areThingsEqual(toTest[i], toTestAgainst[i]), false);
                }
            });

            it("If one side is an array or undefined, comparison fails", () => {
                let toTestAgainst = [null, undefined, "somestring", 42, true, new Date(72998322), { hello: "world" }]
                    , i
                    ;

                for (i = 0; i < toTestAgainst.length; i += 1) {
                    assert.equal(document.areThingsEqual([1, 2, 3], toTestAgainst[i]), false);
                    assert.equal(document.areThingsEqual(toTestAgainst[i], []), false);

                    assert.equal(document.areThingsEqual(undefined, toTestAgainst[i]), false);
                    assert.equal(document.areThingsEqual(toTestAgainst[i], undefined), false);
                }
            });

            it("Can test objects equality", () => {
                assert.equal(document.areThingsEqual({ hello: "world" }, {}), false);
                assert.equal(document.areThingsEqual({ hello: "world" }, { hello: "mars" }), false);
                assert.equal(document.areThingsEqual({ hello: "world" }, { hello: "world", temperature: 42 }), false);
                assert.equal(document.areThingsEqual({ hello: "world", other: { temperature: 42 } }, { hello: "world", other: { temperature: 42 } }), true);
            });

        });


        describe("Getting a fields value in dot notation", () => {

            it("Return first-level and nested values", () => {
                assert.equal(document.getDotValue({ hello: "world" }, "hello"), "world");
                assert.equal(document.getDotValue({ hello: "world", type: { planet: true, blue: true } }, "type.planet"), true);
            });

            it("Return undefined if the field cannot be found in the object", () => {
                assert.isUndefined(document.getDotValue({ hello: "world" }, "helloo"));
                assert.isUndefined(document.getDotValue({ hello: "world", type: { planet: true } }, "type.plane"));
            });

            it("Can navigate inside arrays with dot notation, and return the array of values in that case", () => {
                let dv;

                // Simple array of subdocuments
                dv = document.getDotValue({ planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] }, "planets.name");
                assert.deepEqual(dv, ["Earth", "Mars", "Pluton"]);

                // Nested array of subdocuments
                dv = document.getDotValue({ nedb: true, data: { planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] } }, "data.planets.number");
                assert.deepEqual(dv, [3, 2, 9]);

                // Nested array in a subdocument of an array (yay, inception!)
                // TODO: make sure MongoDB doesn't flatten the array (it wouldn't make sense)
                dv = document.getDotValue({ nedb: true, data: { planets: [{ name: "Earth", numbers: [1, 3] }, { name: "Mars", numbers: [7] }, { name: "Pluton", numbers: [9, 5, 1] }] } }, "data.planets.numbers");
                assert.deepEqual(dv, [[1, 3], [7], [9, 5, 1]]);
            });

            it("Can get a single value out of an array using its index", () => {
                let dv;

                // Simple index in dot notation
                dv = document.getDotValue({ planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] }, "planets.1");
                assert.deepEqual(dv, { name: "Mars", number: 2 });

                // Out of bounds index
                dv = document.getDotValue({ planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] }, "planets.3");
                assert.isUndefined(dv);

                // Index in nested array
                dv = document.getDotValue({ nedb: true, data: { planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] } }, "data.planets.2");
                assert.deepEqual(dv, { name: "Pluton", number: 9 });

                // Dot notation with index in the middle
                dv = document.getDotValue({ nedb: true, data: { planets: [{ name: "Earth", number: 3 }, { name: "Mars", number: 2 }, { name: "Pluton", number: 9 }] } }, "data.planets.0.name");
                assert.equal(dv, "Earth");
            });

        });


        describe("Field equality", () => {

            it("Can find documents with simple fields", () => {
                assert.equal(document.match({ test: "yeah" }, { test: "yea" }), false);
                assert.equal(document.match({ test: "yeah" }, { test: "yeahh" }), false);
                assert.equal(document.match({ test: "yeah" }, { test: "yeah" }), true);
            });

            it("Can find documents with the dot-notation", () => {
                assert.equal(document.match({ test: { ooo: "yeah" } }, { "test.ooo": "yea" }), false);
                assert.equal(document.match({ test: { ooo: "yeah" } }, { "test.oo": "yeah" }), false);
                assert.equal(document.match({ test: { ooo: "yeah" } }, { "tst.ooo": "yeah" }), false);
                assert.equal(document.match({ test: { ooo: "yeah" } }, { "test.ooo": "yeah" }), true);
            });

            it("Cannot find undefined", () => {
                assert.equal(document.match({ test: undefined }, { test: undefined }), false);
                assert.equal(document.match({ test: { pp: undefined } }, { "test.pp": undefined }), false);
            });

            it("Nested objects are deep-equality matched and not treated as sub-queries", () => {
                assert.equal(document.match({ a: { b: 5 } }, { a: { b: 5 } }), true);
                assert.equal(document.match({ a: { b: 5, c: 3 } }, { a: { b: 5 } }), false);

                assert.equal(document.match({ a: { b: 5 } }, { a: { b: { $lt: 10 } } }), false);
                assert.throws(() => document.match({ a: { b: 5 } }, { a: { $or: [{ b: 10 }, { b: 5 }] } }));
            });

            it("Can match for field equality inside an array with the dot notation", () => {
                assert.equal(document.match({ a: true, b: ["node", "embedded", "database"] }, { "b.1": "node" }), false);
                assert.equal(document.match({ a: true, b: ["node", "embedded", "database"] }, { "b.1": "embedded" }), true);
                assert.equal(document.match({ a: true, b: ["node", "embedded", "database"] }, { "b.1": "database" }), false);
            });

        });


        describe("Regular expression matching", () => {

            it("Matching a non-string to a regular expression always yields false", () => {
                let d = new Date()
                    , r = new RegExp(d.getTime());

                assert.equal(document.match({ test: true }, { test: /true/ }), false);
                assert.equal(document.match({ test: null }, { test: /null/ }), false);
                assert.equal(document.match({ test: 42 }, { test: /42/ }), false);
                assert.equal(document.match({ test: d }, { test: r }), false);
            });

            it("Can match strings using basic querying", () => {
                assert.equal(document.match({ test: "true" }, { test: /true/ }), true);
                assert.equal(document.match({ test: "babaaaar" }, { test: /aba+r/ }), true);
                assert.equal(document.match({ test: "babaaaar" }, { test: /^aba+r/ }), false);
                assert.equal(document.match({ test: "true" }, { test: /t[ru]e/ }), false);
            });

            it("Can match strings using the $regex operator", () => {
                assert.equal(document.match({ test: "true" }, { test: { $regex: /true/ } }), true);
                assert.equal(document.match({ test: "babaaaar" }, { test: { $regex: /aba+r/ } }), true);
                assert.equal(document.match({ test: "babaaaar" }, { test: { $regex: /^aba+r/ } }), false);
                assert.equal(document.match({ test: "true" }, { test: { $regex: /t[ru]e/ } }), false);
            });

            it("Will throw if $regex operator is used with a non regex value", () => {
                assert.throws(() => document.match({ test: "true" }, { test: { $regex: 42 } }));

                assert.throws(() => document.match({ test: "true" }, { test: { $regex: "true" } }));
            });

            it("Can use the $regex operator in cunjunction with other operators", () => {
                assert.equal(document.match({ test: "helLo" }, { test: { $regex: /ll/i, $nin: ["helL", "helLop"] } }), true);
                assert.equal(document.match({ test: "helLo" }, { test: { $regex: /ll/i, $nin: ["helLo", "helLop"] } }), false);
            });

            it("Can use dot-notation", () => {
                assert.equal(document.match({ test: { nested: "true" } }, { "test.nested": /true/ }), true);
                assert.equal(document.match({ test: { nested: "babaaaar" } }, { "test.nested": /^aba+r/ }), false);

                assert.equal(document.match({ test: { nested: "true" } }, { "test.nested": { $regex: /true/ } }), true);
                assert.equal(document.match({ test: { nested: "babaaaar" } }, { "test.nested": { $regex: /^aba+r/ } }), false);
            });

        });


        describe("$lt", () => {

            it("Cannot compare a field to an object, an array, null or a boolean, it will return false", () => {
                assert.equal(document.match({ a: 5 }, { a: { $lt: { a: 6 } } }), false);
                assert.equal(document.match({ a: 5 }, { a: { $lt: [6, 7] } }), false);
                assert.equal(document.match({ a: 5 }, { a: { $lt: null } }), false);
                assert.equal(document.match({ a: 5 }, { a: { $lt: true } }), false);
            });

            it("Can compare numbers, with or without dot notation", () => {
                assert.equal(document.match({ a: 5 }, { a: { $lt: 6 } }), true);
                assert.equal(document.match({ a: 5 }, { a: { $lt: 5 } }), false);
                assert.equal(document.match({ a: 5 }, { a: { $lt: 4 } }), false);

                assert.equal(document.match({ a: { b: 5 } }, { "a.b": { $lt: 6 } }), true);
                assert.equal(document.match({ a: { b: 5 } }, { "a.b": { $lt: 3 } }), false);
            });

            it("Can compare strings, with or without dot notation", () => {
                assert.equal(document.match({ a: "nedb" }, { a: { $lt: "nedc" } }), true);
                assert.equal(document.match({ a: "nedb" }, { a: { $lt: "neda" } }), false);

                assert.equal(document.match({ a: { b: "nedb" } }, { "a.b": { $lt: "nedc" } }), true);
                assert.equal(document.match({ a: { b: "nedb" } }, { "a.b": { $lt: "neda" } }), false);
            });

            it("If field is an array field, a match means a match on at least one element", () => {
                assert.equal(document.match({ a: [5, 10] }, { a: { $lt: 4 } }), false);
                assert.equal(document.match({ a: [5, 10] }, { a: { $lt: 6 } }), true);
                assert.equal(document.match({ a: [5, 10] }, { a: { $lt: 11 } }), true);
            });

            it("Works with dates too", () => {
                assert.equal(document.match({ a: new Date(1000) }, { a: { $gte: new Date(1001) } }), false);
                assert.equal(document.match({ a: new Date(1000) }, { a: { $lt: new Date(1001) } }), true);
            });

        });


        // General behaviour is tested in the block about $lt. Here we just test operators work
        describe("Other comparison operators: $lte, $gt, $gte, $ne, $in, $exists", () => {

            it("$lte", () => {
                assert.equal(document.match({ a: 5 }, { a: { $lte: 6 } }), true);
                assert.equal(document.match({ a: 5 }, { a: { $lte: 5 } }), true);
                assert.equal(document.match({ a: 5 }, { a: { $lte: 4 } }), false);
            });

            it("$gt", () => {
                assert.equal(document.match({ a: 5 }, { a: { $gt: 6 } }), false);
                assert.equal(document.match({ a: 5 }, { a: { $gt: 5 } }), false);
                assert.equal(document.match({ a: 5 }, { a: { $gt: 4 } }), true);
            });

            it("$gte", () => {
                assert.equal(document.match({ a: 5 }, { a: { $gte: 6 } }), false);
                assert.equal(document.match({ a: 5 }, { a: { $gte: 5 } }), true);
                assert.equal(document.match({ a: 5 }, { a: { $gte: 4 } }), true);
            });

            it("$ne", () => {
                assert.equal(document.match({ a: 5 }, { a: { $ne: 4 } }), true);
                assert.equal(document.match({ a: 5 }, { a: { $ne: 5 } }), false);
                assert.equal(document.match({ a: 5 }, { b: { $ne: 5 } }), true);
                assert.equal(document.match({ a: false }, { a: { $ne: false } }), false);
            });

            it("$in", () => {
                assert.equal(document.match({ a: 5 }, { a: { $in: [6, 8, 9] } }), false);
                assert.equal(document.match({ a: 6 }, { a: { $in: [6, 8, 9] } }), true);
                assert.equal(document.match({ a: 7 }, { a: { $in: [6, 8, 9] } }), false);
                assert.equal(document.match({ a: 8 }, { a: { $in: [6, 8, 9] } }), true);
                assert.equal(document.match({ a: 9 }, { a: { $in: [6, 8, 9] } }), true);

                assert.throws(() => document.match({ a: 5 }, { a: { $in: 5 } }));
            });

            it("$nin", () => {
                assert.equal(document.match({ a: 5 }, { a: { $nin: [6, 8, 9] } }), true);
                assert.equal(document.match({ a: 6 }, { a: { $nin: [6, 8, 9] } }), false);
                assert.equal(document.match({ a: 7 }, { a: { $nin: [6, 8, 9] } }), true);
                assert.equal(document.match({ a: 8 }, { a: { $nin: [6, 8, 9] } }), false);
                assert.equal(document.match({ a: 9 }, { a: { $nin: [6, 8, 9] } }), false);

                // Matches if field doesn't exist
                assert.equal(document.match({ a: 9 }, { b: { $nin: [6, 8, 9] } }), true);

                assert.throws(() => document.match({ a: 5 }, { a: { $in: 5 } }));
            });

            it("$exists", () => {
                assert.equal(document.match({ a: 5 }, { a: { $exists: 1 } }), true);
                assert.equal(document.match({ a: 5 }, { a: { $exists: true } }), true);
                assert.equal(document.match({ a: 5 }, { a: { $exists: new Date() } }), true);
                assert.equal(document.match({ a: 5 }, { a: { $exists: "" } }), true);
                assert.equal(document.match({ a: 5 }, { a: { $exists: [] } }), true);
                assert.equal(document.match({ a: 5 }, { a: { $exists: {} } }), true);

                assert.equal(document.match({ a: 5 }, { a: { $exists: 0 } }), false);
                assert.equal(document.match({ a: 5 }, { a: { $exists: false } }), false);
                assert.equal(document.match({ a: 5 }, { a: { $exists: null } }), false);
                assert.equal(document.match({ a: 5 }, { a: { $exists: undefined } }), false);

                assert.equal(document.match({ a: 5 }, { b: { $exists: true } }), false);

                assert.equal(document.match({ a: 5 }, { b: { $exists: false } }), true);
            });

        });


        /*
        describe('Query operator array $size', function () {
    
            it('Can query on the size of an array field', function () {
              // Non nested documents
              document.match({ childrens: [ { name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 } ] }, { "childrens": { $size: 0 } }), false);
              document.match({ childrens: [ { name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 } ] }, { "childrens": { $size: 1 } }), false);
              document.match({ childrens: [ { name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 } ] }, { "childrens": { $size: 2 } }), false);
              document.match({ childrens: [ { name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 } ] }, { "childrens": { $size: 3 } }), true);
                
              // Nested documents
              document.match({ hello: 'world', description: { satellites: ['Moon', 'Hubble'], diameter: 6300 } }, { "description.satellites": { $size: 0 } }), false);
              document.match({ hello: 'world', description: { satellites: ['Moon', 'Hubble'], diameter: 6300 } }, { "description.satellites": { $size: 1 } }), false);
              document.match({ hello: 'world', description: { satellites: ['Moon', 'Hubble'], diameter: 6300 } }, { "description.satellites": { $size: 2 } }), true);
              document.match({ hello: 'world', description: { satellites: ['Moon', 'Hubble'], diameter: 6300 } }, { "description.satellites": { $size: 3 } }), false);
    
              // Using a projected array
              document.match({ childrens: [ { name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 } ] }, { "childrens.names": { $size: 0 } }), false);
              document.match({ childrens: [ { name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 } ] }, { "childrens.names": { $size: 1 } }), false);
              document.match({ childrens: [ { name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 } ] }, { "childrens.names": { $size: 2 } }), false);
              document.match({ childrens: [ { name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 } ] }, { "childrens.names": { $size: 3 } }), true);
            });
    
            it('$size operator works with empty arrays', function () {
              document.match({ childrens: [] }, { "childrens": { $size: 0 } }), true);
              document.match({ childrens: [] }, { "childrens": { $size: 2 } }), false);
              document.match({ childrens: [] }, { "childrens": { $size: 3 } }), false);
            });
    
            it('Should throw an error if a query operator is used without comparing to an integer', function () {
              (function () { document.match({ a: [1, 5] }, { a: { $size: 1.4 } }); }).should.throw();
              (function () { document.match({ a: [1, 5] }, { a: { $size: 'fdf' } }); }).should.throw();
              (function () { document.match({ a: [1, 5] }, { a: { $size: { $lt: 5 } } }); }).should.throw();
            });
    
            it('Using $size operator on a non-array field should prevent match but not throw', function () {
              document.match({ a: 5 }, { a: { $size: 1 } }), false);
            });
            
            it('Can use $size several times in the same matcher', function () {
              document.match({ childrens: [ 'Riri', 'Fifi', 'Loulou' ] }, { "childrens": { $size: 3, $size: 3 } }), true);
              document.match({ childrens: [ 'Riri', 'Fifi', 'Loulou' ] }, { "childrens": { $size: 3, $size: 4 } }), false);   // Of course this can never be true
            });
            
        });
        */


        describe("Logical operators $or, $and, $not", () => {

            it("Any of the subqueries should match for an $or to match", () => {
                assert.equal(document.match({ hello: "world" }, { $or: [{ hello: "pluton" }, { hello: "world" }] }), true);
                assert.equal(document.match({ hello: "pluton" }, { $or: [{ hello: "pluton" }, { hello: "world" }] }), true);
                assert.equal(document.match({ hello: "nope" }, { $or: [{ hello: "pluton" }, { hello: "world" }] }), false);
                assert.equal(document.match({ hello: "world", age: 15 }, { $or: [{ hello: "pluton" }, { age: { $lt: 20 } }] }), true);
                assert.equal(document.match({ hello: "world", age: 15 }, { $or: [{ hello: "pluton" }, { age: { $lt: 10 } }] }), false);
            });

            it("All of the subqueries should match for an $and to match", () => {
                assert.equal(document.match({ hello: "world", age: 15 }, { $and: [{ age: 15 }, { hello: "world" }] }), true);
                assert.equal(document.match({ hello: "world", age: 15 }, { $and: [{ age: 16 }, { hello: "world" }] }), false);
                assert.equal(document.match({ hello: "world", age: 15 }, { $and: [{ hello: "world" }, { age: { $lt: 20 } }] }), true);
                assert.equal(document.match({ hello: "world", age: 15 }, { $and: [{ hello: "pluton" }, { age: { $lt: 20 } }] }), false);
            });

            it("Subquery should not match for a $not to match", () => {
                assert.equal(document.match({ a: 5, b: 10 }, { a: 5 }), true);
                assert.equal(document.match({ a: 5, b: 10 }, { $not: { a: 5 } }), false);
            });

            it("Logical operators are all top-level, only other logical operators can be above", () => {
                assert.throws(() => document.match({ a: { b: 7 } }, { a: { $or: [{ b: 5 }, { b: 7 }] } }));
                assert.equal(document.match({ a: { b: 7 } }, { $or: [{ "a.b": 5 }, { "a.b": 7 }] }), true);
            });

            it("Logical operators can be combined as long as they are on top of the decision tree", () => {
                assert.equal(document.match({ a: 5, b: 7, c: 12 }, { $or: [{ $and: [{ a: 5 }, { b: 8 }] }, { $and: [{ a: 5 }, { c: { $lt: 40 } }] }] }), true);
                assert.equal(document.match({ a: 5, b: 7, c: 12 }, { $or: [{ $and: [{ a: 5 }, { b: 8 }] }, { $and: [{ a: 5 }, { c: { $lt: 10 } }] }] }), false);
            });

            it("Should throw an error if a logical operator is used without an array or if an unknown logical operator is used", () => {
                assert.throws(() => document.match({ a: 5 }, { $or: { a: 5, a: 6 } }));
                assert.throws(() => document.match({ a: 5 }, { $and: { a: 5, a: 6 } }));
                assert.throws(() => document.match({ a: 5 }, { $unknown: [{ a: 5 }] }));
            });

        });


        describe("Array fields", () => {

            it("Field equality", () => {
                assert.equal(document.match({ tags: ["node", "js", "db"] }, { tags: "python" }), false);
                assert.equal(document.match({ tags: ["node", "js", "db"] }, { tagss: "js" }), false);
                assert.equal(document.match({ tags: ["node", "js", "db"] }, { tags: "js" }), true);
                assert.equal(document.match({ tags: ["node", "js", "db"] }, { tags: "js", tags: "node" }), true);

                // Mixed matching with array and non array
                assert.equal(document.match({ tags: ["node", "js", "db"], nedb: true }, { tags: "js", nedb: true }), true);

                // Nested matching
                assert.equal(document.match({ number: 5, data: { tags: ["node", "js", "db"] } }, { "data.tags": "js" }), true);
                assert.equal(document.match({ number: 5, data: { tags: ["node", "js", "db"] } }, { "data.tags": "j" }), false);
            });

            it("With one comparison operator", () => {
                assert.equal(document.match({ ages: [3, 7, 12] }, { ages: { $lt: 2 } }), false);
                assert.equal(document.match({ ages: [3, 7, 12] }, { ages: { $lt: 3 } }), false);
                assert.equal(document.match({ ages: [3, 7, 12] }, { ages: { $lt: 4 } }), true);
                assert.equal(document.match({ ages: [3, 7, 12] }, { ages: { $lt: 8 } }), true);
                assert.equal(document.match({ ages: [3, 7, 12] }, { ages: { $lt: 13 } }), true);
            });

            it("Works with arrays that are in subdocuments", () => {
                assert.equal(document.match({ children: { ages: [3, 7, 12] } }, { "children.ages": { $lt: 2 } }), false);
                assert.equal(document.match({ children: { ages: [3, 7, 12] } }, { "children.ages": { $lt: 3 } }), false);
                assert.equal(document.match({ children: { ages: [3, 7, 12] } }, { "children.ages": { $lt: 4 } }), true);
                assert.equal(document.match({ children: { ages: [3, 7, 12] } }, { "children.ages": { $lt: 8 } }), true);
                assert.equal(document.match({ children: { ages: [3, 7, 12] } }, { "children.ages": { $lt: 13 } }), true);
            });

            it("Can query inside arrays thanks to dot notation", () => {
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.age": { $lt: 2 } }), false);
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.age": { $lt: 3 } }), false);
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.age": { $lt: 4 } }), true);
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.age": { $lt: 8 } }), true);
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.age": { $lt: 13 } }), true);

                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.name": "Louis" }), false);
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.name": "Louie" }), true);
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.name": "Lewi" }), false);
            });

            it("Can query for a specific element inside arrays thanks to dot notation", () => {
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.0.name": "Louie" }), false);
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.1.name": "Louie" }), false);
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.2.name": "Louie" }), true);
                assert.equal(document.match({ childrens: [{ name: "Huey", age: 3 }, { name: "Dewey", age: 7 }, { name: "Louie", age: 12 }] }, { "childrens.3.name": "Louie" }), false);
            });

            /*
            it('A single array-specific operator and the query is treated as array specific', function () {
              (function () { document.match({ childrens: [ 'Riri', 'Fifi', 'Loulou' ] }, { "childrens": { "Fifi": true, $size: 3 } })}).should.throw();
            });
            
            it('Can mix queries on array fields and non array filds with array specific operators', function () {
              document.match({ uncle: 'Donald', nephews: [ 'Riri', 'Fifi', 'Loulou' ] }, { nephews: { $size: 2 }, uncle: 'Donald' }), false);
              document.match({ uncle: 'Donald', nephews: [ 'Riri', 'Fifi', 'Loulou' ] }, { nephews: { $size: 3 }, uncle: 'Donald' }), true);
              document.match({ uncle: 'Donald', nephews: [ 'Riri', 'Fifi', 'Loulou' ] }, { nephews: { $size: 4 }, uncle: 'Donald' }), false);
      
              document.match({ uncle: 'Donals', nephews: [ 'Riri', 'Fifi', 'Loulou' ] }, { nephews: { $size: 3 }, uncle: 'Picsou' }), false);
              document.match({ uncle: 'Donald', nephews: [ 'Riri', 'Fifi', 'Loulou' ] }, { nephews: { $size: 3 }, uncle: 'Donald' }), true);
              document.match({ uncle: 'Donald', nephews: [ 'Riri', 'Fifi', 'Loulou' ] }, { nephews: { $size: 3 }, uncle: 'Daisy' }), false);
            });
            */
        });

    });   // ==== End of 'Querying' ==== //

});
