const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;
const random = adone.odm.utils.random;
const util = require("util");
const async = require("async");


class BaseSchema extends Schema {
    constructor(...args) {
        super(...args);

        this.add({
            name: String,
            createdAt: { type: Date, default: Date.now }
        });
    }
}

const EventSchema = new BaseSchema();
const ImpressionEventSchema = new BaseSchema();
const ConversionEventSchema = new BaseSchema({ revenue: Number });
const SecretEventSchema = new BaseSchema({ secret: { type: String, select: false } });

describe("model", () => {
    describe("discriminator()", () => {
        let db;
        let BaseEvent;
        let ImpressionEvent;
        let ConversionEvent;
        let SecretEvent;

        before(() => {
            db = start();
            BaseEvent = db.model("model-discriminator-querying-event", EventSchema, `model-discriminator-querying-${random()}`);
            ImpressionEvent = BaseEvent.discriminator("model-discriminator-querying-impression", ImpressionEventSchema);
            ConversionEvent = BaseEvent.discriminator("model-discriminator-querying-conversion", ConversionEventSchema);
            SecretEvent = BaseEvent.discriminator("model-discriminator-querying-secret", SecretEventSchema);
        });

        afterEach((done) => {
            async.series(
                [
                    function removeBaseEvent(next) {
                        BaseEvent.remove(next);
                    },
                    function removeImpressionEvent(next) {
                        ImpressionEvent.remove(next);
                    },
                    function removeConversionEvent(next) {
                        ConversionEvent.remove(next);
                    }
                ],
                done
            );
        });

        after((done) => {
            db.close(done);
        });

        describe("pushing discriminated objects", () => {
            let ContainerModel, BaseCustomEvent, DiscCustomEvent;
            before(() => {
                const BaseCustomEventSchema = new BaseSchema();
                const DiscCustomEventSchema = new BaseSchema({
                    personName: Number
                });
                BaseCustomEvent = db.model("base-custom-event",
                    BaseCustomEventSchema);
                DiscCustomEvent = BaseCustomEvent.discriminator("disc-custom-event",
                    DiscCustomEventSchema);
                const ContainerSchema = new Schema({
                    title: String,
                    events: [{ type: Schema.Types.ObjectId, ref: "base-custom-event" }]
                });
                ContainerModel = db.model("container-event-model", ContainerSchema);
            });

            it("into non-discriminated arrays works", (done) => {
                const c = new ContainerModel({
                    title: "events-group-1"
                });
                const d1 = new BaseCustomEvent();
                const d2 = new BaseCustomEvent();
                const d3 = new DiscCustomEvent();
                c.events.push(d1);
                c.events.push(d2);
                async.series(
                    [
                        function (next) {
                            d1.save(next);
                        },
                        function (next) {
                            d2.save(next);
                        },
                        function (next) {
                            d3.save(next);
                        },
                        function (next) {
                            c.save(next);
                        },
                        function (next) {
                            ContainerModel.findOne({}).populate("events").exec((err, doc) => {
                                assert.ifError(err);
                                assert.ok(doc.events && doc.events.length);
                                assert.equal(doc.events.length, 2);
                                doc.events.push(d3);
                                let hasDisc = false;
                                const discKey = DiscCustomEvent.schema.discriminatorMapping.key;
                                doc.events.forEach((subDoc) => {
                                    if (discKey in subDoc) {
                                        hasDisc = true;
                                    }
                                });
                                assert.ok(hasDisc);
                                next();
                            });
                        }
                    ],
                    done
                );
            });
        });

        describe("find", () => {
            it("hydrates correct models", (done) => {
                const baseEvent = new BaseEvent({ name: "Base event" });
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent = new ConversionEvent({ name: "Conversion event", revenue: 1.337 });

                baseEvent.save((err) => {
                    assert.ifError(err);
                    impressionEvent.save((err) => {
                        assert.ifError(err);
                        conversionEvent.save((err) => {
                            assert.ifError(err);
                            BaseEvent.find({}).sort("name").exec(function (err, docs) {
                                assert.ifError(err);
                                assert.ok(docs[0] instanceof BaseEvent);
                                assert.equal(docs[0].name, "Base event");

                                assert.ok(docs[1] instanceof ConversionEvent);
                                assert.equal(docs[1].schema, ConversionEventSchema);
                                assert.equal(docs[1].name, "Conversion event");
                                assert.equal(docs[1].revenue, 1.337);

                                assert.ok(docs[2] instanceof ImpressionEvent);
                                assert.equal(docs[2].schema, ImpressionEventSchema);
                                assert.equal(docs[2].name, "Impression event");
                                done();
                            });
                        });
                    });
                });
            });

            const checkHydratesCorrectModels = function (fields, done) {
                const baseEvent = new BaseEvent({ name: "Base event" });
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent = new ConversionEvent({ name: "Conversion event", revenue: 1.337 });

                baseEvent.save((err) => {
                    assert.ifError(err);
                    impressionEvent.save((err) => {
                        assert.ifError(err);
                        conversionEvent.save((err) => {
                            assert.ifError(err);
                            BaseEvent.find({}, fields).sort("name").exec((err, docs) => {
                                assert.ifError(err);
                                assert.ok(docs[0] instanceof BaseEvent);
                                assert.equal(docs[0].name, "Base event");

                                assert.ok(docs[1] instanceof ConversionEvent);
                                assert.equal(docs[1].schema, ConversionEventSchema);
                                assert.equal(docs[1].name, "Conversion event");
                                assert.equal(docs[1].revenue, undefined);

                                assert.ok(docs[2] instanceof ImpressionEvent);
                                assert.equal(docs[2].schema, ImpressionEventSchema);
                                assert.equal(docs[2].name, "Impression event");
                                done();
                            });
                        });
                    });
                });
            };

            it("hydrates correct models when fields selection set as string", (done) => {
                checkHydratesCorrectModels("name", done);
            });

            it("hydrates correct models when fields selection set as object", (done) => {
                checkHydratesCorrectModels({ name: 1 }, done);
            });

            describe("discriminator model only finds documents of its type", () => {
                let impressionEvent, conversionEvent1, conversionEvent2;

                before(() => {
                    impressionEvent = new ImpressionEvent({ name: "Impression event" });
                    conversionEvent1 = new ConversionEvent({ name: "Conversion event 1", revenue: 1 });
                    conversionEvent2 = new ConversionEvent({ name: "Conversion event 2", revenue: 2 });
                });

                describe('using "ModelDiscriminator#findById"', () => {
                    it("to find a document of the appropriate discriminator", (done) => {
                        impressionEvent.save((err) => {
                            assert.ifError(err);

                            // via BaseEvent model
                            BaseEvent.findById(impressionEvent._id, function (err, doc) {
                                assert.ifError(err);
                                assert.ok(doc);
                                assert.equal(impressionEvent.__t, doc.__t);

                                // via ImpressionEvent model discriminator -- should be present
                                ImpressionEvent.findById(impressionEvent._id, function (err, doc) {
                                    assert.ifError(err);
                                    assert.ok(doc);
                                    assert.equal(impressionEvent.__t, doc.__t);

                                    // via ConversionEvent model discriminator -- should not be present
                                    ConversionEvent.findById(impressionEvent._id, function (err, doc) {
                                        assert.ifError(err);
                                        assert.ok(!doc);

                                        done();
                                    });
                                });
                            });
                        });
                    });
                });

                describe('using "ModelDiscriminator#find"', () => {
                    it("to find documents of the appropriate discriminator", (done) => {
                        impressionEvent.save((err) => {
                            assert.ifError(err);
                            conversionEvent1.save(function (err) {
                                assert.ifError(err);
                                conversionEvent2.save(function (err) {
                                    assert.ifError(err);
                                    // doesn't find anything since we're querying for an impression id
                                    var query = ConversionEvent.find({ _id: impressionEvent._id });
                                    assert.equal(query.op, "find");
                                    assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: "model-discriminator-querying-conversion" });
                                    query.exec(function (err, documents) {
                                        assert.ifError(err);
                                        assert.equal(documents.length, 0);

                                        // now find one with no criteria given and ensure it gets added to _conditions
                                        var query = ConversionEvent.find();
                                        assert.deepEqual(query._conditions, { __t: "model-discriminator-querying-conversion" });
                                        assert.equal(query.op, "find");
                                        query.exec(function (err, documents) {
                                            assert.ifError(err);
                                            assert.equal(documents.length, 2);

                                            assert.ok(documents[0] instanceof ConversionEvent);
                                            assert.equal(documents[0].__t, "model-discriminator-querying-conversion");

                                            assert.ok(documents[1] instanceof ConversionEvent);
                                            assert.equal(documents[1].__t, "model-discriminator-querying-conversion");

                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });

            const checkDiscriminatorModelsFindDocumentsOfItsType = function (fields, done) {
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent1 = new ConversionEvent({ name: "Conversion event 1", revenue: 1 });
                const conversionEvent2 = new ConversionEvent({ name: "Conversion event 2", revenue: 2 });

                impressionEvent.save((err) => {
                    assert.ifError(err);
                    conversionEvent1.save((err) => {
                        assert.ifError(err);
                        conversionEvent2.save((err) => {
                            assert.ifError(err);
                            // doesn't find anything since we're querying for an impression id
                            let query = ConversionEvent.find({ _id: impressionEvent._id }, fields);
                            assert.equal(query.op, "find");
                            assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: "model-discriminator-querying-conversion" });
                            query.exec((err, documents) => {
                                assert.ifError(err);
                                assert.equal(documents.length, 0);

                                // now find one with no criteria given and ensure it gets added to _conditions
                                var query = ConversionEvent.find({}, fields);
                                assert.deepEqual(query._conditions, { __t: "model-discriminator-querying-conversion" });
                                assert.equal(query.op, "find");
                                query.exec(function (err, documents) {
                                    assert.ifError(err);
                                    assert.equal(documents.length, 2);

                                    assert.ok(documents[0] instanceof ConversionEvent);
                                    assert.equal(documents[0].__t, "model-discriminator-querying-conversion");

                                    assert.ok(documents[1] instanceof ConversionEvent);
                                    assert.equal(documents[1].__t, "model-discriminator-querying-conversion");
                                    done();
                                });
                            });
                        });
                    });
                });
            };

            it("discriminator model only finds documents of its type when fields selection set as string inclusive", (done) => {
                checkDiscriminatorModelsFindDocumentsOfItsType("name", done);
            });

            it("discriminator model only finds documents of its type when fields selection set as string exclusive", (done) => {
                checkDiscriminatorModelsFindDocumentsOfItsType("-revenue", done);
            });

            it("discriminator model only finds documents of its type when fields selection set as empty string", (done) => {
                checkDiscriminatorModelsFindDocumentsOfItsType("", done);
            });

            it("discriminator model only finds documents of its type when fields selection set as object inclusive", (done) => {
                checkDiscriminatorModelsFindDocumentsOfItsType({ name: 1 }, done);
            });

            it("discriminator model only finds documents of its type when fields selection set as object exclusive", (done) => {
                checkDiscriminatorModelsFindDocumentsOfItsType({ revenue: 0 }, done);
            });

            it("discriminator model only finds documents of its type when fields selection set as empty object", (done) => {
                checkDiscriminatorModelsFindDocumentsOfItsType({}, done);
            });

            it("hydrates streams", (done) => {
                const baseEvent = new BaseEvent({ name: "Base event" });
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent = new ConversionEvent({ name: "Conversion event", revenue: 1.337 });

                baseEvent.save((err) => {
                    assert.ifError(err);
                    impressionEvent.save((err) => {
                        assert.ifError(err);
                        conversionEvent.save((err) => {
                            assert.ifError(err);
                            var stream = BaseEvent.find({}).sort("name").stream();

                            stream.on("data", function (doc) {
                                switch (doc.name) {
                                    case "Base event":
                                        assert.ok(doc instanceof BaseEvent);
                                        break;
                                    case "Impression event":
                                        assert.ok(doc instanceof BaseEvent);
                                        assert.ok(doc instanceof ImpressionEvent);
                                        break;
                                    case "Conversion event":
                                        assert.ok(doc instanceof BaseEvent);
                                        assert.ok(doc instanceof ConversionEvent);
                                        break;
                                    default:

                                }
                            });

                            stream.on("error", function (err) {
                                assert.ifError(err);
                            });

                            stream.on("close", function () {
                                done();
                            });
                        });
                    });
                });
            });
        });

        describe("findOne", () => {
            it("when selecting `select: false` field (gh-4629)", (done) => {
                const s = new SecretEvent({ name: "test", secret: "test2" });
                s.save((error) => {
                    assert.ifError(error);
                    SecretEvent.findById(s._id, "+secret", (error, doc) => {
                        assert.ifError(error);
                        assert.equal(doc.name, "test");
                        assert.equal(doc.secret, "test2");
                        done();
                    });
                });
            });

            it("select: false in base schema (gh-5448)", (done) => {
                const schema = new mongoose.Schema({
                    foo: String,
                    hiddenColumn: {
                        type: String,
                        select: false
                    }
                });

                const Foo = db.model("Foo", schema);
                const Bar = Foo.discriminator("Bar", new mongoose.Schema({
                    bar: String
                }));

                const obj = {
                    foo: "test",
                    hiddenColumn: "Wanna see me?",
                    bar: "test2"
                };
                Bar.create(obj).
                    then(() => {
                        return Foo.find().select("+hiddenColumn");
                    }).
                    then((docs) => {
                        assert.equal(docs.length, 1);
                        assert.equal(docs[0].hiddenColumn, "Wanna see me?");
                        assert.equal(docs[0].foo, "test");
                        assert.equal(docs[0].bar, "test2");
                        done();
                    }).
                    catch(done);
            });

            it("hydrates correct model", (done) => {
                const baseEvent = new BaseEvent({ name: "Base event" });
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent = new ConversionEvent({ name: "Conversion event", revenue: 1.337 });

                baseEvent.save((err) => {
                    assert.ifError(err);
                    impressionEvent.save((err) => {
                        assert.ifError(err);
                        conversionEvent.save((err) => {
                            assert.ifError(err);
                            // finds & hydrates BaseEvent
                            BaseEvent.findOne({ _id: baseEvent._id }, function (err, event) {
                                assert.ifError(err);
                                assert.ok(event instanceof BaseEvent);
                                assert.equal(event.name, "Base event");

                                // finds & hydrates ImpressionEvent
                                BaseEvent.findOne({ _id: impressionEvent._id }, function (err, event) {
                                    assert.ifError(err);
                                    assert.ok(event instanceof ImpressionEvent);
                                    assert.equal(event.schema, ImpressionEventSchema);
                                    assert.equal(event.name, "Impression event");

                                    // finds & hydrates ConversionEvent
                                    BaseEvent.findOne({ _id: conversionEvent._id }, function (err, event) {
                                        assert.ifError(err);
                                        assert.ok(event instanceof ConversionEvent);
                                        assert.equal(event.schema, ConversionEventSchema);
                                        assert.equal(event.name, "Conversion event");
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });

            const checkHydratesCorrectModels = function (fields, done, checkUndefinedRevenue) {
                const baseEvent = new BaseEvent({ name: "Base event" });
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent = new ConversionEvent({ name: "Conversion event", revenue: 1.337 });

                baseEvent.save((err) => {
                    assert.ifError(err);
                    impressionEvent.save((err) => {
                        assert.ifError(err);
                        conversionEvent.save((err) => {
                            assert.ifError(err);
                            // finds & hydrates BaseEvent
                            BaseEvent.findOne({ _id: baseEvent._id }, fields, (err, event) => {
                                assert.ifError(err);
                                assert.ok(event instanceof BaseEvent);
                                assert.equal(event.name, "Base event");

                                // finds & hydrates ImpressionEvent
                                BaseEvent.findOne({ _id: impressionEvent._id }, fields, function (err, event) {
                                    assert.ifError(err);
                                    assert.ok(event instanceof ImpressionEvent);
                                    assert.equal(event.schema, ImpressionEventSchema);
                                    assert.equal(event.name, "Impression event");

                                    // finds & hydrates ConversionEvent
                                    BaseEvent.findOne({ _id: conversionEvent._id }, fields, function (err, event) {
                                        assert.ifError(err);
                                        assert.ok(event instanceof ConversionEvent);
                                        assert.equal(event.schema, ConversionEventSchema);
                                        assert.equal(event.name, "Conversion event");
                                        if (checkUndefinedRevenue === true) {
                                            assert.equal(event.revenue, undefined);
                                        }
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            };

            it("hydrates correct model when fields selection set as string inclusive", (done) => {
                checkHydratesCorrectModels("name", done, true);
            });

            it("hydrates correct model when fields selection set as string exclusive", (done) => {
                checkHydratesCorrectModels("-revenue", done, true);
            });

            it("hydrates correct model when fields selection set as empty string", (done) => {
                checkHydratesCorrectModels("", done);
            });

            it("hydrates correct model when fields selection set as object inclusive", (done) => {
                checkHydratesCorrectModels({ name: 1 }, done, true);
            });

            it("hydrates correct model when fields selection set as object exclusive", (done) => {
                checkHydratesCorrectModels({ revenue: 0 }, done, true);
            });

            it("hydrates correct model when fields selection set as empty object", (done) => {
                checkHydratesCorrectModels({}, done);
            });

            it("discriminator model only finds a document of its type", (done) => {
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent = new ConversionEvent({ name: "Conversion event", revenue: 2 });

                impressionEvent.save((err) => {
                    assert.ifError(err);
                    conversionEvent.save((err) => {
                        assert.ifError(err);
                        // doesn't find anything since we're querying for an impression id
                        let query = ConversionEvent.findOne({ _id: impressionEvent._id });
                        assert.equal(query.op, "findOne");
                        assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: "model-discriminator-querying-conversion" });

                        query.exec((err, document) => {
                            assert.ifError(err);
                            assert.equal(document, null);

                            // now find one with no criteria given and ensure it gets added to _conditions
                            var query = ConversionEvent.findOne();
                            assert.equal(query.op, "findOne");
                            assert.deepEqual(query._conditions, { __t: "model-discriminator-querying-conversion" });

                            query.exec(function (err, document) {
                                assert.ifError(err);
                                assert.ok(document instanceof ConversionEvent);
                                assert.equal(document.__t, "model-discriminator-querying-conversion");
                                done();
                            });
                        });
                    });
                });
            });

            const checkDiscriminatorModelsFindOneDocumentOfItsType = function (fields, done) {
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent = new ConversionEvent({ name: "Conversion event", revenue: 2 });

                impressionEvent.save((err) => {
                    assert.ifError(err);
                    conversionEvent.save((err) => {
                        assert.ifError(err);
                        // doesn't find anything since we're querying for an impression id
                        const query = ConversionEvent.findOne({ _id: impressionEvent._id }, fields);
                        assert.equal(query.op, "findOne");
                        assert.deepEqual(query._conditions, { _id: impressionEvent._id, __t: "model-discriminator-querying-conversion" });

                        query.exec((err, document) => {
                            assert.ifError(err);
                            assert.equal(document, null);

                            // now find one with no criteria given and ensure it gets added to _conditions
                            let query = ConversionEvent.findOne({}, fields);
                            assert.equal(query.op, "findOne");
                            assert.deepEqual(query._conditions, { __t: "model-discriminator-querying-conversion" });

                            query.exec((err, document) => {
                                assert.ifError(err);
                                assert.ok(document instanceof ConversionEvent);
                                assert.equal(document.__t, "model-discriminator-querying-conversion");
                                done();
                            });
                        });
                    });
                });
            };

            it("discriminator model only finds a document of its type when fields selection set as string inclusive", (done) => {
                checkDiscriminatorModelsFindOneDocumentOfItsType("name", done);
            });

            it("discriminator model only finds a document of its type when fields selection set as string exclusive", (done) => {
                checkDiscriminatorModelsFindOneDocumentOfItsType("-revenue", done);
            });

            it("discriminator model only finds a document of its type when fields selection set as empty string", (done) => {
                checkDiscriminatorModelsFindOneDocumentOfItsType("", done);
            });

            it("discriminator model only finds a document of its type when fields selection set as object inclusive", (done) => {
                checkDiscriminatorModelsFindOneDocumentOfItsType({ name: 1 }, done);
            });

            it("discriminator model only finds a document of its type when fields selection set as object exclusive", (done) => {
                checkDiscriminatorModelsFindOneDocumentOfItsType({ revenue: 0 }, done);
            });

            it("discriminator model only finds a document of its type when fields selection set as empty object", (done) => {
                checkDiscriminatorModelsFindOneDocumentOfItsType({}, done);
            });
        });

        describe("findOneAndUpdate", () => {
            it("does not update models of other types", (done) => {
                const baseEvent = new BaseEvent({ name: "Base event" });
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent = new ConversionEvent({ name: "Conversion event", revenue: 1.337 });

                baseEvent.save((err) => {
                    assert.ifError(err);
                    impressionEvent.save((err) => {
                        assert.ifError(err);
                        conversionEvent.save((err) => {
                            assert.ifError(err);
                            var query = ConversionEvent.findOneAndUpdate({ name: "Impression event" }, { $set: { name: "Impression event - updated" } });
                            assert.deepEqual(query._conditions, { name: "Impression event", __t: "model-discriminator-querying-conversion" });
                            query.exec(function (err, document) {
                                assert.ifError(err);
                                assert.equal(document, null);
                                done();
                            });
                        });
                    });
                });
            });

            it("updates models of its own type", (done) => {
                const baseEvent = new BaseEvent({ name: "Base event" });
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent = new ConversionEvent({ name: "Conversion event", revenue: 1.337 });

                baseEvent.save((err) => {
                    assert.ifError(err);
                    impressionEvent.save((err) => {
                        assert.ifError(err);
                        conversionEvent.save((err) => {
                            assert.ifError(err);
                            var query = ConversionEvent.findOneAndUpdate({ name: "Conversion event" }, { $set: { name: "Conversion event - updated" } }, { new: true });
                            assert.deepEqual(query._conditions, { name: "Conversion event", __t: "model-discriminator-querying-conversion" });
                            query.exec(function (err, document) {
                                assert.ifError(err);
                                var expected = conversionEvent.toJSON();
                                expected.name = "Conversion event - updated";
                                assert.deepEqual(document.toJSON(), expected);
                                done();
                            });
                        });
                    });
                });
            });

            it("base model modifies any event type", (done) => {
                const baseEvent = new BaseEvent({ name: "Base event" });
                const impressionEvent = new ImpressionEvent({ name: "Impression event" });
                const conversionEvent = new ConversionEvent({ name: "Conversion event", revenue: 1.337 });

                baseEvent.save((err) => {
                    assert.ifError(err);
                    impressionEvent.save((err) => {
                        assert.ifError(err);
                        conversionEvent.save((err) => {
                            assert.ifError(err);
                            var query = BaseEvent.findOneAndUpdate({ name: "Conversion event" }, { $set: { name: "Conversion event - updated" } }, { new: true });
                            assert.deepEqual(query._conditions, { name: "Conversion event" });
                            query.exec(function (err, document) {
                                assert.ifError(err);
                                var expected = conversionEvent.toJSON();
                                expected.name = "Conversion event - updated";
                                assert.deepEqual(document.toJSON(), expected);
                                done();
                            });
                        });
                    });
                });
            });
        });

        describe("population/reference mapping", () => {
            it("populates and hydrates correct models", (done) => {
                const vehicleSchema = new Schema();
                const carSchema = new Schema({ speed: Number });
                const busSchema = new Schema({ speed: Number });

                const userSchema = new Schema({
                    vehicles: [{ type: Schema.Types.ObjectId, ref: "ModelDiscriminatorPopulationVehicle" }],
                    favoriteVehicle: { type: Schema.Types.ObjectId, ref: "ModelDiscriminatorPopulationVehicle" },
                    favoriteBus: { type: Schema.Types.ObjectId, ref: "ModelDiscriminatorPopulationBus" }
                });

                let Vehicle = db.model("ModelDiscriminatorPopulationVehicle", vehicleSchema),
                    Car = Vehicle.discriminator("ModelDiscriminatorPopulationCar", carSchema),
                    Bus = Vehicle.discriminator("ModelDiscriminatorPopulationBus", busSchema),
                    User = db.model("ModelDiscriminatorPopulationUser", userSchema);

                Vehicle.create({}, (err, vehicle) => {
                    assert.ifError(err);
                    Car.create({ speed: 160 }, (err, car) => {
                        Bus.create({ speed: 80 }, (err, bus) => {
                            assert.ifError(err);
                            User.create({ vehicles: [vehicle._id, car._id, bus._id], favoriteVehicle: car._id, favoriteBus: bus._id }, function (err) {
                                assert.ifError(err);
                                User.findOne({}).populate("vehicles favoriteVehicle favoriteBus").exec(function (err, user) {
                                    assert.ifError(err);

                                    var expected = {
                                        __v: 0,
                                        _id: user._id,
                                        vehicles: [
                                            { _id: vehicle._id, __v: 0 },
                                            { _id: car._id, speed: 160, __v: 0, __t: "ModelDiscriminatorPopulationCar" },
                                            { _id: bus._id, speed: 80, __v: 0, __t: "ModelDiscriminatorPopulationBus" }
                                        ],
                                        favoriteVehicle: { _id: car._id, speed: 160, __v: 0, __t: "ModelDiscriminatorPopulationCar" },
                                        favoriteBus: { _id: bus._id, speed: 80, __v: 0, __t: "ModelDiscriminatorPopulationBus" }
                                    };

                                    assert.deepEqual(user.toJSON(), expected);
                                    assert.ok(user.vehicles[0] instanceof Vehicle);
                                    assert.ok(!(user.vehicles[0] instanceof Car));
                                    assert.ok(!(user.vehicles[0] instanceof Bus));

                                    assert.ok(user.vehicles[1] instanceof Car);
                                    assert.ok(!(user.vehicles[1] instanceof Bus));

                                    assert.ok(user.vehicles[2] instanceof Bus);
                                    assert.ok(!(user.vehicles[2] instanceof Car));

                                    assert.ok(user.favoriteVehicle instanceof Car);
                                    assert.ok(user.favoriteBus instanceof Bus);
                                    done();
                                });
                            });
                        });
                    });
                });
            });

            it("reference in child schemas (gh-2719)", (done) => {
                const vehicleSchema = new Schema({});
                const carSchema = new Schema({
                    speed: Number,
                    garage: { type: Schema.Types.ObjectId, ref: "gh2719PopulationGarage" }
                });
                const busSchema = new Schema({
                    speed: Number,
                    garage: { type: Schema.Types.ObjectId, ref: "gh2719PopulationGarage" }
                });

                const garageSchema = new Schema({
                    name: String,
                    num_of_places: Number
                });

                let Vehicle = db.model("gh2719PopulationVehicle", vehicleSchema),
                    Car = Vehicle.discriminator("gh2719PopulationCar", carSchema),
                    Bus = Vehicle.discriminator("gh2719PopulationBus", busSchema),
                    Garage = db.model("gh2719PopulationGarage", garageSchema);

                Garage.create({ name: "My", num_of_places: 3 }, (err, garage) => {
                    assert.ifError(err);
                    Car.create({ speed: 160, garage }, (err) => {
                        assert.ifError(err);
                        Bus.create({ speed: 80, garage }, (err) => {
                            assert.ifError(err);
                            Vehicle.find({}).populate("garage").exec(function (err, vehicles) {
                                assert.ifError(err);

                                vehicles.forEach(function (v) {
                                    assert.ok(v.garage instanceof Garage);
                                });

                                done();
                            });
                        });
                    });
                });
            });

            it("populates parent array reference (gh-4643)", (done) => {
                const vehicleSchema = new Schema({
                    wheels: [{
                        type: Schema.Types.ObjectId,
                        ref: "gh4643"
                    }]
                });
                const wheelSchema = new Schema({ brand: String });
                const busSchema = new Schema({ speed: Number });

                const Vehicle = db.model("gh4643_0", vehicleSchema);
                const Bus = Vehicle.discriminator("gh4643_00", busSchema);
                const Wheel = db.model("gh4643", wheelSchema);

                Wheel.create({ brand: "Rotiform" }, (err, wheel) => {
                    assert.ifError(err);
                    Bus.create({ speed: 80, wheels: [wheel] }, (err) => {
                        assert.ifError(err);
                        Bus.findOne({}).populate("wheels").exec((err, bus) => {
                            assert.ifError(err);

                            assert.ok(bus instanceof Vehicle);
                            assert.ok(bus instanceof Bus);
                            assert.equal(bus.wheels.length, 1);
                            assert.ok(bus.wheels[0] instanceof Wheel);
                            assert.equal(bus.wheels[0].brand, "Rotiform");
                            done();
                        });
                    });
                });
            });

            it("updating type key (gh-5613)", (done) => {
                class BaseSchema extends Schema {
                    constructor(...args) {
                        super(...args);

                        this.add({
                            name: { type: String, required: true }
                        });
                    }
                }

                const orgSchema = new BaseSchema({});
                const schoolSchema = new BaseSchema({ principal: String });

                const Org = db.model("gh5613", orgSchema);
                Org.discriminator("gh5613_0", schoolSchema);

                Org.create({ name: "test" }, (error, doc) => {
                    assert.ifError(error);
                    assert.ok(!doc.__t);
                    Org.findByIdAndUpdate(doc._id, { __t: "gh5613_0" }, { new: true }, (error, doc) => {
                        assert.ifError(error);
                        assert.equal(doc.__t, "gh5613_0");
                        done();
                    });
                });
            });

            it("reference in child schemas (gh-2719-2)", (done) => {
                class BaseSchema extends Schema {
                    constructor(...args) {
                        super(...args);

                        this.add({
                            name: { type: String, required: true },
                            date: { type: Date, required: true },
                            period: {
                                start: { type: String, required: true },
                                end: { type: String, required: true }
                            }
                        });
                    }
                }

                const EventSchema = new BaseSchema({});
                const Event = db.model("Event", EventSchema);

                const TalkSchema = new BaseSchema({
                    pin: { type: String, required: true, index: { unique: true } },
                    totalAttendees: { type: Number },
                    speakers: [{ type: Schema.Types.ObjectId, ref: "Speaker" }],
                    surveys: [{ type: Schema.Types.ObjectId, ref: "Survey" }],
                    questions: [{ type: Schema.Types.ObjectId, ref: "Question" }]
                });

                const Talk = Event.discriminator("Talk", TalkSchema);

                const Survey = db.model("Survey", new Schema({
                    name: String,
                    date: Date
                }));

                Survey.create({
                    name: "That you see?",
                    date: Date.now()
                }, (err, survey) => {
                    assert.ifError(err);

                    Talk.create({
                        name: "Meetup rails",
                        date: new Date("2015-04-01T00:00:00Z"),
                        pin: "0004",
                        period: { start: "11:00", end: "12:00" },
                        surveys: [survey]
                    }, (err) => {
                        assert.ifError(err);

                        Event.find({}).populate("surveys").exec((err, events) => {
                            assert.ifError(err);

                            assert.ok(events[0].surveys[0] instanceof Survey);

                            done();
                        });
                    });
                });
            });
        });

        describe("aggregate", () => {
            let impressionEvent, conversionEvent, ignoredImpressionEvent;

            beforeEach((done) => {
                impressionEvent = new ImpressionEvent({ name: "Test Event" });
                conversionEvent = new ConversionEvent({ name: "Test Event", revenue: 10 });
                ignoredImpressionEvent = new ImpressionEvent({ name: "Ignored Event" });

                async.forEach(
                    [impressionEvent, conversionEvent, ignoredImpressionEvent],
                    (doc, cb) => {
                        doc.save(cb);
                    },
                    done
                );
            });

            describe('using "RootModel#aggregate"', () => {
                it("to aggregate documents of all discriminators", (done) => {
                    const aggregate = BaseEvent.aggregate([
                        { $match: { name: "Test Event" } }
                    ]);

                    aggregate.exec((err, docs) => {
                        assert.ifError(err);
                        assert.deepEqual(aggregate._pipeline, [
                            { $match: { name: "Test Event" } }
                        ]);
                        assert.equal(docs.length, 2);
                        done();
                    });
                });
            });

            describe('using "ModelDiscriminator#aggregate"', () => {
                it("only aggregates documents of the appropriate discriminator", (done) => {
                    const aggregate = ImpressionEvent.aggregate([
                        { $group: { _id: "$__t", count: { $sum: 1 } } }
                    ]);

                    aggregate.exec((err, result) => {
                        assert.ifError(err);

                        // Discriminator `$match` pipeline step was added on the
                        // `exec` step. The reasoning for this is to not let
                        // aggregations with empty pipelines, but that are over
                        // discriminators be executed
                        assert.deepEqual(aggregate._pipeline, [
                            { $match: { __t: "model-discriminator-querying-impression" } },
                            { $group: { _id: "$__t", count: { $sum: 1 } } }
                        ]);

                        assert.equal(result.length, 1);
                        assert.deepEqual(result, [
                            { _id: "model-discriminator-querying-impression", count: 2 }
                        ]);
                        done();
                    });
                });

                it("hides fields when discriminated model has select (gh-4991)", (done) => {
                    const baseSchema = new mongoose.Schema({
                        internal: {
                            test: [{ type: String }]
                        }
                    });

                    const Base = db.model("gh4991", baseSchema);
                    const discriminatorSchema = new mongoose.Schema({
                        internal: {
                            password: { type: String, select: false }
                        }
                    });
                    const Discriminator = Base.discriminator("gh4991_0",
                        discriminatorSchema);

                    const obj = {
                        internal: {
                            test: ["abc"],
                            password: "password"
                        }
                    };
                    Discriminator.create(obj).
                        then((doc) => {
                            return Base.findById(doc._id);
                        }).
                        then((doc) => {
                            assert.ok(!doc.internal.password);
                            done();
                        }).
                        catch(done);
                });

                it("merges the first pipeline stages if applicable", (done) => {
                    const aggregate = ImpressionEvent.aggregate([
                        { $match: { name: "Test Event" } }
                    ]);

                    aggregate.exec((err, result) => {
                        assert.ifError(err);

                        // Discriminator `$match` pipeline step was added on the
                        // `exec` step. The reasoning for this is to not let
                        // aggregations with empty pipelines, but that are over
                        // discriminators be executed
                        assert.deepEqual(aggregate._pipeline, [
                            { $match: { __t: "model-discriminator-querying-impression", name: "Test Event" } }
                        ]);

                        assert.equal(result.length, 1);
                        assert.equal(result[0]._id, impressionEvent.id);
                        done();
                    });
                });
            });
        });
    });
});
