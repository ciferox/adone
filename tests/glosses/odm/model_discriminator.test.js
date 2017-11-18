const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;
const util = require("util");
const clone = adone.odm.utils.clone;
const random = adone.odm.utils.random;

/**
 * Setup
 */
const PersonSchema = new Schema({
    name: { first: String, last: String },
    gender: String
}, { collection: `model-discriminator-${random()}` });
PersonSchema.index({ name: 1 });
PersonSchema.methods.getFullName = function () {
    return `${this.name.first} ${this.name.last}`;
};
PersonSchema.methods.toJSonConfig = {
    include: ["prop1", "prop2"],
    exclude: ["prop3", "prop4"]
};
PersonSchema.statics.findByGender = function () {
};
PersonSchema.virtual("name.full").get(function () {
    return `${this.name.first} ${this.name.last}`;
});
PersonSchema.virtual("name.full").set(function (name) {
    const split = name.split(" ");
    this.name.first = split[0];
    this.name.last = split[1];
});
PersonSchema.path("gender").validate((value) => {
    return /[A-Z]/.test(value);
}, "Invalid name");
PersonSchema.set("toObject", { getters: true, virtuals: true });
PersonSchema.set("toJSON", { getters: true, virtuals: true });

const EmployeeSchema = new Schema({ department: String });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.methods.getDepartment = function () {
    return this.department;
};
EmployeeSchema.statics.findByDepartment = function () {
};
EmployeeSchema.path("department").validate((value) => {
    return /[a-zA-Z]/.test(value);
}, "Invalid name");
const employeeSchemaPreSaveFn = function (next) {
    next();
};
EmployeeSchema.pre("save", employeeSchemaPreSaveFn);
EmployeeSchema.set("toObject", { getters: true, virtuals: false });
EmployeeSchema.set("toJSON", { getters: false, virtuals: true });

describe("model", () => {
    describe("discriminator()", () => {
        let db, Person, Employee;

        before(() => {
            db = start();
            Person = db.model("model-discriminator-person", PersonSchema);
            Employee = Person.discriminator("model-discriminator-employee", EmployeeSchema);
        });

        after((done) => {
            db.close(done);
        });

        it("model defaults without discriminator", (done) => {
            const Model = db.model("model-discriminator-defaults", new Schema(), `model-discriminator-${random()}`);
            assert.equal(Model.discriminators, undefined);
            done();
        });

        it("is instance of root", (done) => {
            assert.equal(Employee.baseModelName, "model-discriminator-person");
            const employee = new Employee();
            assert.ok(employee instanceof Person);
            assert.ok(employee instanceof Employee);
            assert.strictEqual(employee.__proto__.constructor, Employee);
            assert.strictEqual(employee.__proto__.__proto__.constructor, Person);
            done();
        });

        it("can define static and instance methods", (done) => {
            function BossBaseSchema() {
                Schema.apply(this, arguments);

                this.add({
                    name: String,
                    createdAt: Date
                });
            }

            util.inherits(BossBaseSchema, Schema);

            const PersonSchema = new BossBaseSchema();
            const BossSchema = new BossBaseSchema({ department: String });
            BossSchema.methods.myName = function () {
                return this.name;
            };
            BossSchema.statics.currentPresident = function () {
                return "obama";
            };
            const Person = db.model("Person", PersonSchema);
            const Boss = Person.discriminator("Boss", BossSchema);

            const boss = new Boss({ name: "Bernenke" });
            assert.equal(boss.myName(), "Bernenke");
            assert.equal(boss.notInstanceMethod, undefined);
            assert.equal(Boss.currentPresident(), "obama");
            assert.equal(Boss.notStaticMethod, undefined);
            done();
        });

        it("sets schema root discriminator mapping", (done) => {
            assert.deepEqual(PersonSchema.discriminatorMapping, { key: "__t", value: null, isRoot: true });
            done();
        });

        it("sets schema discriminator type mapping", (done) => {
            assert.deepEqual(EmployeeSchema.discriminatorMapping, { key: "__t", value: "model-discriminator-employee", isRoot: false });
            done();
        });

        it("adds discriminatorKey to schema with default as name", (done) => {
            const type = EmployeeSchema.paths.__t;
            assert.equal(type.options.type, String);
            assert.equal(type.options.default, "model-discriminator-employee");
            done();
        });

        it("adds discriminator to Model.discriminators object", (done) => {
            assert.equal(Object.keys(Person.discriminators).length, 1);
            assert.equal(Person.discriminators["model-discriminator-employee"], Employee);
            const newName = `model-discriminator-${random()}`;
            const NewDiscriminatorType = Person.discriminator(newName, new Schema());
            assert.equal(Object.keys(Person.discriminators).length, 2);
            assert.equal(Person.discriminators[newName], NewDiscriminatorType);
            done();
        });

        it("throws error on invalid schema", (done) => {
            assert.throws(
                () => {
                    Person.discriminator("Foo");
                },
                /You must pass a valid discriminator Schema/
            );
            done();
        });

        it("throws error when attempting to nest discriminators", (done) => {
            assert.throws(
                () => {
                    Employee.discriminator("model-discriminator-foo", new Schema());
                },
                /Discriminator "model-discriminator-foo" can only be a discriminator of the root model/
            );
            done();
        });

        it("throws error when discriminator has mapped discriminator key in schema", (done) => {
            assert.throws(
                () => {
                    Person.discriminator("model-discriminator-foo", new Schema({ __t: String }));
                },
                /Discriminator "model-discriminator-foo" cannot have field with name "__t"/
            );
            done();
        });

        it("throws error when discriminator has mapped discriminator key in schema with discriminatorKey option set", (done) => {
            assert.throws(
                () => {
                    let Foo = db.model("model-discriminator-foo", new Schema({}, { discriminatorKey: "_type" }), "model-discriminator-" + random());
                    Foo.discriminator("model-discriminator-bar", new Schema({ _type: String }));
                },
                /Discriminator "model-discriminator-bar" cannot have field with name "_type"/
            );
            done();
        });

        it("throws error when discriminator with taken name is added", (done) => {
            const Foo = db.model("model-discriminator-foo", new Schema({}), `model-discriminator-${random()}`);
            Foo.discriminator("model-discriminator-taken", new Schema());
            assert.throws(
                () => {
                    Foo.discriminator("model-discriminator-taken", new Schema());
                },
                /Discriminator with name "model-discriminator-taken" already exists/
            );
            done();
        });

        it("throws error if model name is taken (gh-4148)", (done) => {
            const Foo = db.model("model-discriminator-4148", new Schema({}));
            db.model("model-discriminator-4148-bar", new Schema({}));
            assert.throws(
                () => {
                    Foo.discriminator("model-discriminator-4148-bar", new Schema());
                },
                /Cannot overwrite `model-discriminator-4148-bar`/);
            done();
        });

        it("works with nested schemas (gh-2821)", (done) => {
            const MinionSchema = function () {
                mongoose.Schema.apply(this, arguments);

                this.add({
                    name: String
                });
            };
            util.inherits(MinionSchema, mongoose.Schema);

            const BaseSchema = function () {
                mongoose.Schema.apply(this, arguments);

                this.add({
                    name: String,
                    created_at: Date,
                    minions: [new MinionSchema()]
                });
            };
            util.inherits(BaseSchema, mongoose.Schema);

            const PersonSchema = new BaseSchema();
            const BossSchema = new BaseSchema({
                department: String
            }, { id: false });

            // Should not throw
            const Person = db.model("gh2821", PersonSchema);
            Person.discriminator("gh2821-Boss", BossSchema);
            done();
        });

        describe("options", () => {
            it("allows toObject to be overridden", (done) => {
                assert.notDeepEqual(Employee.schema.get("toObject"), Person.schema.get("toObject"));
                assert.deepEqual(Employee.schema.get("toObject"), { getters: true, virtuals: false });
                done();
            });

            it("allows toJSON to be overridden", (done) => {
                assert.notDeepEqual(Employee.schema.get("toJSON"), Person.schema.get("toJSON"));
                assert.deepEqual(Employee.schema.get("toJSON"), { getters: false, virtuals: true });
                done();
            });

            it("is not customizable", (done) => {
                let CustomizedSchema = new Schema({}, { capped: true });

                assert.throws(() => {
                    Person.discriminator('model-discriminator-custom', CustomizedSchema);
                }, /Can't customize discriminator option capped/);

                done();
            });
        });

        describe("root schema inheritance", () => {
            it("inherits field mappings", (done) => {
                assert.strictEqual(Employee.schema.path("name"), Person.schema.path("name"));
                assert.strictEqual(Employee.schema.path("gender"), Person.schema.path("gender"));
                assert.equal(Person.schema.paths.department, undefined);
                done();
            });

            it("inherits validators", (done) => {
                assert.strictEqual(Employee.schema.path("gender").validators, PersonSchema.path("gender").validators);
                assert.strictEqual(Employee.schema.path("department").validators, EmployeeSchema.path("department").validators);
                done();
            });

            it("does not inherit and override fields that exist", (done) => {
                let FemaleSchema = new Schema({ gender: { type: String, default: "F" } }),
                    Female = Person.discriminator("model-discriminator-female", FemaleSchema);

                let gender = Female.schema.paths.gender;

                assert.notStrictEqual(gender, Person.schema.paths.gender);
                assert.equal(gender.instance, "String");
                assert.equal(gender.options.default, "F");
                done();
            });

            it("inherits methods", (done) => {
                let employee = new Employee();
                assert.strictEqual(employee.getFullName, PersonSchema.methods.getFullName);
                assert.strictEqual(employee.getDepartment, EmployeeSchema.methods.getDepartment);
                assert.equal((new Person()).getDepartment, undefined);
                done();
            });

            it("inherits statics", (done) => {
                assert.strictEqual(Employee.findByGender, EmployeeSchema.statics.findByGender);
                assert.strictEqual(Employee.findByDepartment, EmployeeSchema.statics.findByDepartment);
                assert.equal(Person.findByDepartment, undefined);
                done();
            });

            it("inherits virtual (g.s)etters", (done) => {
                let employee = new Employee();
                employee.name.full = "John Doe";
                assert.equal(employee.name.full, "John Doe");
                done();
            });

            it("merges callQueue with base queue defined before discriminator types callQueue", (done) => {
                assert.equal(Employee.schema.callQueue.length, 7);

                // EmployeeSchema.pre('save')
                let queueIndex = Employee.schema.callQueue.length - 1;
                assert.strictEqual(Employee.schema.callQueue[queueIndex][0], "pre");
                assert.strictEqual(Employee.schema.callQueue[queueIndex][1]["0"], "save");
                assert.strictEqual(Employee.schema.callQueue[queueIndex][1]["1"], employeeSchemaPreSaveFn);
                done();
            });

            it("does not inherit indexes", (done) => {
                assert.deepEqual(Person.schema.indexes(), [[{ name: 1 }, { background: true }]]);
                assert.deepEqual(Employee.schema.indexes(), [[{ department: 1 }, { background: true }]]);
                done();
            });

            it("gets options overridden by root options except toJSON and toObject", (done) => {
                let personOptions = clone(Person.schema.options),
                    employeeOptions = clone(Employee.schema.options);

                delete personOptions.toJSON;
                delete personOptions.toObject;
                delete employeeOptions.toJSON;
                delete employeeOptions.toObject;

                assert.deepEqual(personOptions, employeeOptions);
                done();
            });

            it("does not allow setting discriminator key (gh-2041)", (done) => {
                let doc = new Employee({ __t: "fake" });
                assert.equal(doc.__t, "model-discriminator-employee");
                doc.save((error) => {
                    assert.ok(error);
                    assert.equal(error.errors['__t'].reason.message,
                        'Can\'t set discriminator key "__t"');
                    done();
                });
            });

            it("with typeKey (gh-4339)", (done) => {
                let options = { typeKey: "$type", discriminatorKey: "_t" };
                let schema = new Schema({ test: { $type: String } }, options);
                let Model = mongoose.model("gh4339", schema);
                Model.discriminator("gh4339_0", new Schema({
                    test2: String
                }, { typeKey: "$type" }));
                done();
            });

            it("applyPluginsToDiscriminators (gh-4965)", (done) => {
                let schema = new Schema({ test: String });
                mongoose.set("applyPluginsToDiscriminators", true);
                let called = 0;
                mongoose.plugin(() => {
                    ++called;
                });
                let Model = mongoose.model("gh4965", schema);
                let childSchema = new Schema({
                    test2: String
                });
                Model.discriminator("gh4965_0", childSchema);
                assert.equal(called, 2);

                mongoose.plugins = [];
                mongoose.set("applyPluginsToDiscriminators", false);
                done();
            });

            it("cloning with discriminator key (gh-4387)", (done) => {
                let employee = new Employee({ name: { first: "Val", last: "Karpov" } });
                let clone = new employee.constructor(employee);

                // Should not error because we have the same discriminator key
                clone.save((error) => {
                    assert.ifError(error);
                    done();
                });
            });

            it("embedded discriminators with create() (gh-5001)", (done) => {
                let eventSchema = new Schema({ message: String },
                    { discriminatorKey: "kind", _id: false });
                let batchSchema = new Schema({ events: [eventSchema] });
                let docArray = batchSchema.path("events");

                let Clicked = docArray.discriminator("Clicked", new Schema({
                    element: {
                        type: String,
                        required: true
                    }
                }, { _id: false }));

                let Purchased = docArray.discriminator("Purchased", new Schema({
                    product: {
                        type: String,
                        required: true
                    }
                }, { _id: false }));

                let Batch = db.model("EventBatch", batchSchema);

                let batch = {
                    events: [
                        { kind: "Clicked", element: "#hero" }
                    ]
                };

                Batch.create(batch).
                    then((doc) => {
                        assert.equal(doc.events.length, 1);
                        var newDoc = doc.events.create({
                            kind: 'Purchased',
                            product: 'action-figure-1'
                        });
                        assert.equal(newDoc.kind, 'Purchased');
                        assert.equal(newDoc.product, 'action-figure-1');
                        assert.ok(newDoc instanceof Purchased);

                        doc.events.push(newDoc);
                        assert.equal(doc.events.length, 2);
                        assert.equal(doc.events[1].kind, 'Purchased');
                        assert.equal(doc.events[1].product, 'action-figure-1');
                        assert.ok(newDoc instanceof Purchased);
                        assert.ok(newDoc === doc.events[1]);

                        done();
                    }).
                    catch(done);
            });

            it("supports clone() (gh-4983)", (done) => {
                let childSchema = new Schema({
                    name: String
                });
                let childCalls = 0;
                let childValidateCalls = 0;
                childSchema.pre("validate", (next) => {
                    ++childValidateCalls;
                    next();
                });
                childSchema.pre("save", (next) => {
                    ++childCalls;
                    next();
                });

                let personSchema = new Schema({
                    name: String
                }, { discriminatorKey: "kind" });

                let parentSchema = new Schema({
                    children: [childSchema],
                    heir: childSchema
                });
                let parentCalls = 0;
                parentSchema.pre("save", (next) => {
                    ++parentCalls;
                    next();
                });

                let Person = db.model("gh4983", personSchema);
                let Parent = Person.discriminator("gh4983_0", parentSchema.clone());

                let obj = {
                    name: "Ned Stark",
                    heir: { name: "Robb Stark" },
                    children: [{ name: "Jon Snow" }]
                };
                Parent.create(obj, (error, doc) => {
                    assert.ifError(error);
                    assert.equal(doc.name, 'Ned Stark');
                    assert.equal(doc.heir.name, 'Robb Stark');
                    assert.equal(doc.children.length, 1);
                    assert.equal(doc.children[0].name, 'Jon Snow');
                    assert.equal(childValidateCalls, 2);
                    assert.equal(childCalls, 2);
                    assert.equal(parentCalls, 1);
                    done();
                });
            });

            it("clone() allows reusing schemas (gh-5098)", (done) => {
                let personSchema = new Schema({
                    name: String
                }, { discriminatorKey: "kind" });

                let parentSchema = new Schema({
                    child: String
                });

                let Person = db.model("gh5098", personSchema);
                let Parent = Person.discriminator("gh5098_0", parentSchema.clone());
                // Should not throw
                let Parent2 = Person.discriminator("gh5098_1", parentSchema.clone());
                done();
            });

            it("clone() allows reusing with different models (gh-5721)", (done) => {
                let schema = new mongoose.Schema({
                    name: String
                });

                let schemaExt = new mongoose.Schema({
                    nameExt: String
                });

                let ModelA = db.model("gh5721_a0", schema);
                ModelA.discriminator("gh5721_a1", schemaExt);

                ModelA.findOneAndUpdate({}, { $set: { name: "test" } }, (error) => {
                    assert.ifError(error);

                    var ModelB = db.model('gh5721_b0', schema.clone());
                    ModelB.discriminator('gh5721_b1', schemaExt.clone());

                    done();
                });
            });

            it("copies query hooks (gh-5147)", (done) => {
                let options = { discriminatorKey: "kind" };

                let eventSchema = new mongoose.Schema({ time: Date }, options);
                let eventSchemaCalls = 0;
                eventSchema.pre("findOneAndUpdate", () => {
                    ++eventSchemaCalls;
                });

                let Event = db.model("gh5147", eventSchema);

                let clickedEventSchema = new mongoose.Schema({ url: String }, options);
                let clickedEventSchemaCalls = 0;
                clickedEventSchema.pre("findOneAndUpdate", () => {
                    ++clickedEventSchemaCalls;
                });
                let ClickedLinkEvent = Event.discriminator("gh5147_0", clickedEventSchema);

                ClickedLinkEvent.findOneAndUpdate({}, { time: new Date() }, {}).
                    exec((error) => {
                        assert.ifError(error);
                        assert.equal(eventSchemaCalls, 1);
                        assert.equal(clickedEventSchemaCalls, 1);
                        done();
                    });
            });

            it("reusing schema for discriminators (gh-5684)", (done) => {
                let ParentSchema = new Schema({});
                let ChildSchema = new Schema({ name: String });

                let FirstContainerSchema = new Schema({
                    stuff: [ParentSchema]
                });

                FirstContainerSchema.path("stuff").discriminator("Child", ChildSchema);

                let SecondContainerSchema = new Schema({
                    things: [ParentSchema]
                });

                SecondContainerSchema.path("things").discriminator("Child", ChildSchema);

                let M1 = db.model("gh5684_0", FirstContainerSchema);
                let M2 = db.model("gh5684_1", SecondContainerSchema);

                let doc1 = new M1({ stuff: [{ __t: "Child", name: "test" }] });
                let doc2 = new M2({ things: [{ __t: "Child", name: "test" }] });

                assert.equal(doc1.stuff.length, 1);
                assert.equal(doc1.stuff[0].name, "test");
                assert.equal(doc2.things.length, 1);
                assert.equal(doc2.things[0].name, "test");

                done();
            });

            it("nested discriminator key with projecting in parent (gh-5775)", (done) => {
                let itemSchema = new Schema({
                    type: { type: String },
                    active: { type: Boolean, default: true }
                }, { discriminatorKey: "type" });

                let collectionSchema = new Schema({
                    items: [itemSchema]
                });

                let s = new Schema({ count: Number });
                collectionSchema.path("items").discriminator("type1", s);

                let MyModel = db.model("Collection", collectionSchema);
                let doc = {
                    items: [{ type: "type1", active: false, count: 3 }]
                };
                MyModel.create(doc, (error) => {
                    assert.ifError(error);
                    MyModel.findOne({}).select('items').exec(function (error, doc) {
                        assert.ifError(error);
                        assert.equal(doc.items.length, 1);
                        assert.equal(doc.items[0].type, 'type1');
                        assert.strictEqual(doc.items[0].active, false);
                        assert.strictEqual(doc.items[0].count, 3);
                        done();
                    });
                });
            });

            it("embedded discriminators with $push (gh-5009)", (done) => {
                let eventSchema = new Schema({ message: String },
                    { discriminatorKey: "kind", _id: false });
                let batchSchema = new Schema({ events: [eventSchema] });
                let docArray = batchSchema.path("events");

                let Clicked = docArray.discriminator("Clicked", new Schema({
                    element: {
                        type: String,
                        required: true
                    }
                }, { _id: false }));

                let Purchased = docArray.discriminator("Purchased", new Schema({
                    product: {
                        type: String,
                        required: true
                    }
                }, { _id: false }));

                let Batch = db.model("gh5009", batchSchema);

                let batch = {
                    events: [
                        { kind: "Clicked", element: "#hero" }
                    ]
                };

                Batch.create(batch).
                    then((doc) => {
                        assert.equal(doc.events.length, 1);
                        return Batch.updateOne({ _id: doc._id }, {
                            $push: {
                                events: { kind: 'Clicked', element: '#button' }
                            }
                        }).then(function () {
                            return doc;
                        });
                    }).
                    then((doc) => {
                        return Batch.findOne({ _id: doc._id });
                    }).
                    then((doc) => {
                        assert.equal(doc.events.length, 2);
                        assert.equal(doc.events[1].element, '#button');
                        assert.equal(doc.events[1].kind, 'Clicked');
                        done();
                    }).
                    catch(done);
            });

            it("embedded discriminators with $push + $each (gh-5070)", (done) => {
                let eventSchema = new Schema({ message: String },
                    { discriminatorKey: "kind", _id: false });
                let batchSchema = new Schema({ events: [eventSchema] });
                let docArray = batchSchema.path("events");

                let Clicked = docArray.discriminator("Clicked", new Schema({
                    element: {
                        type: String,
                        required: true
                    }
                }, { _id: false }));

                let Purchased = docArray.discriminator("Purchased", new Schema({
                    product: {
                        type: String,
                        required: true
                    }
                }, { _id: false }));

                let Batch = db.model("gh5070", batchSchema);

                let batch = {
                    events: [
                        { kind: "Clicked", element: "#hero" }
                    ]
                };

                Batch.create(batch).
                    then((doc) => {
                        assert.equal(doc.events.length, 1);
                        return Batch.updateOne({ _id: doc._id }, {
                            $push: {
                                events: { $each: [{ kind: 'Clicked', element: '#button' }] }
                            }
                        }).then(function () {
                            return doc;
                        });
                    }).
                    then((doc) => {
                        return Batch.findOne({ _id: doc._id });
                    }).
                    then((doc) => {
                        assert.equal(doc.events.length, 2);
                        assert.equal(doc.events[1].element, '#button');
                        assert.equal(doc.events[1].kind, 'Clicked');
                        done();
                    }).
                    catch(done);
            });

            it("embedded discriminators with $set (gh-5130)", (done) => {
                let eventSchema = new Schema({ message: String },
                    { discriminatorKey: "kind" });
                let batchSchema = new Schema({ events: [eventSchema] });
                let docArray = batchSchema.path("events");

                let Clicked = docArray.discriminator("Clicked", new Schema({
                    element: {
                        type: String,
                        required: true
                    }
                }));

                let Purchased = docArray.discriminator("Purchased", new Schema({
                    product: {
                        type: String,
                        required: true
                    }
                }));

                let Batch = db.model("gh5130", batchSchema);

                let batch = {
                    events: [
                        { kind: "Clicked", element: "#hero" }
                    ]
                };

                Batch.create(batch).
                    then((doc) => {
                        assert.equal(doc.events.length, 1);
                        return Batch.updateOne({ _id: doc._id, 'events._id': doc.events[0]._id }, {
                            $set: {
                                'events.$': {
                                    message: 'updated',
                                    kind: 'Clicked',
                                    element: '#hero2'
                                }
                            }
                        }).then(function () { return doc; });
                    }).
                    then((doc) => {
                        return Batch.findOne({ _id: doc._id });
                    }).
                    then((doc) => {
                        assert.equal(doc.events.length, 1);
                        assert.equal(doc.events[0].message, 'updated');
                        assert.equal(doc.events[0].element, '#hero2');    // <-- test failed
                        assert.equal(doc.events[0].kind, 'Clicked');      // <-- test failed
                        done();
                    }).
                    catch(done);
            });

            it("embedded in document arrays (gh-2723)", (done) => {
                let eventSchema = new Schema({ message: String },
                    { discriminatorKey: "kind", _id: false });

                let batchSchema = new Schema({ events: [eventSchema] });
                batchSchema.path("events").discriminator("Clicked", new Schema({
                    element: String
                }, { _id: false }));
                batchSchema.path("events").discriminator("Purchased", new Schema({
                    product: String
                }, { _id: false }));

                let MyModel = db.model("gh2723", batchSchema);
                let doc = {
                    events: [
                        { kind: "Clicked", element: "Test" },
                        { kind: "Purchased", product: "Test2" }
                    ]
                };
                MyModel.create(doc).
                    then((doc) => {
                        assert.equal(doc.events.length, 2);
                        assert.equal(doc.events[0].element, 'Test');
                        assert.equal(doc.events[1].product, 'Test2');
                        var obj = doc.toObject({ virtuals: false });
                        delete obj._id;
                        assert.deepEqual(obj, {
                            __v: 0,
                            events: [
                                { kind: 'Clicked', element: 'Test' },
                                { kind: 'Purchased', product: 'Test2' }
                            ]
                        });
                        done();
                    }).
                    then(() => {
                        return MyModel.findOne({
                            events: {
                                $elemMatch: {
                                    kind: 'Clicked',
                                    element: 'Test'
                                }
                            }
                        }, { 'events.$': 1 });
                    }).
                    then((doc) => {
                        assert.ok(doc);
                        assert.equal(doc.events.length, 1);
                        assert.equal(doc.events[0].element, 'Test');
                    }).
                    catch(done);
            });
        });

        it("embedded with single nested subdocs (gh-5244)", (done) => {
            const eventSchema = new Schema({ message: String },
                { discriminatorKey: "kind", _id: false });

            const trackSchema = new Schema({ event: eventSchema });
            trackSchema.path("event").discriminator("Clicked", new Schema({
                element: String
            }, { _id: false }));
            trackSchema.path("event").discriminator("Purchased", new Schema({
                product: String
            }, { _id: false }));

            const MyModel = db.model("gh5244", trackSchema);
            const doc1 = {
                event: {
                    kind: "Clicked",
                    element: "Amazon Link"
                }
            };
            const doc2 = {
                event: {
                    kind: "Purchased",
                    product: "Professional AngularJS"
                }
            };
            MyModel.create([doc1, doc2]).
                then((docs) => {
                    let doc1 = docs[0];
                    let doc2 = docs[1];

                    assert.equal(doc1.event.kind, "Clicked");
                    assert.equal(doc1.event.element, "Amazon Link");
                    assert.ok(!doc1.event.product);

                    assert.equal(doc2.event.kind, "Purchased");
                    assert.equal(doc2.event.product, "Professional AngularJS");
                    assert.ok(!doc2.event.element);
                    done();
                }).
                catch(done);
        });
        describe("embedded discriminators + hooks (gh-5706)", () => {
            const counters = {
                eventPreSave: 0,
                eventPostSave: 0,
                purchasePreSave: 0,
                purchasePostSave: 0,
                eventPreValidate: 0,
                eventPostValidate: 0,
                purchasePreValidate: 0,
                purchasePostValidate: 0
            };
            const eventSchema = new Schema(
                { message: String },
                { discriminatorKey: "kind", _id: false }
            );
            eventSchema.pre("validate", (next) => {
                counters.eventPreValidate++;
                next();
            });

            eventSchema.post("validate", (doc) => {
                counters.eventPostValidate++;
            });

            eventSchema.pre("save", (next) => {
                counters.eventPreSave++;
                next();
            });

            eventSchema.post("save", (doc) => {
                counters.eventPostSave++;
            });

            const purchasedSchema = new Schema({
                product: String
            }, { _id: false });

            purchasedSchema.pre("validate", (next) => {
                counters.purchasePreValidate++;
                next();
            });

            purchasedSchema.post("validate", (doc) => {
                counters.purchasePostValidate++;
            });

            purchasedSchema.pre("save", (next) => {
                counters.purchasePreSave++;
                next();
            });

            purchasedSchema.post("save", (doc) => {
                counters.purchasePostSave++;
            });

            beforeEach(() => {
                Object.keys(counters).forEach((i) => {
                    counters[i] = 0;
                });
            });

            it("should call the hooks on the embedded document defined by both the parent and discriminated schemas", (done) => {
                let trackSchema = new Schema({
                    event: eventSchema
                });

                let embeddedEventSchema = trackSchema.path("event");
                embeddedEventSchema.discriminator("Purchased", purchasedSchema.clone());

                let TrackModel = db.model("Track", trackSchema);
                let doc = new TrackModel({
                    event: {
                        message: "Test",
                        kind: "Purchased"
                    }
                });
                doc.save((err) => {
                    assert.ok(!err);
                    assert.equal(doc.event.message, 'Test')
                    assert.equal(doc.event.kind, 'Purchased')
                    Object.keys(counters).forEach(function (i) {
                        assert.equal(counters[i], 1);
                    });
                    done();
                });
            });

            it("should call the hooks on the embedded document in an embedded array defined by both the parent and discriminated schemas", (done) => {
                let trackSchema = new Schema({
                    events: [eventSchema]
                });

                let embeddedEventSchema = trackSchema.path("events");
                embeddedEventSchema.discriminator("Purchased", purchasedSchema.clone());

                let TrackModel = db.model("Track2", trackSchema);
                let doc = new TrackModel({
                    events: [
                        {
                            message: "Test",
                            kind: "Purchased"
                        },
                        {
                            message: "TestAgain",
                            kind: "Purchased"
                        }
                    ]
                });
                doc.save((err) => {
                    assert.ok(!err);
                    assert.equal(doc.events[0].kind, 'Purchased');
                    assert.equal(doc.events[0].message, 'Test');
                    assert.equal(doc.events[1].kind, 'Purchased');
                    assert.equal(doc.events[1].message, 'TestAgain');
                    Object.keys(counters).forEach(function (i) {
                        assert.equal(counters[i], 2);
                    });
                    done();
                });
            });
        });
    });
});
