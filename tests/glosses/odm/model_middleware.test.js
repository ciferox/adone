const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;

describe("model middleware", () => {
    it("post save", (done) => {
        const schema = new Schema({
            title: String
        });

        let called = 0;

        schema.post("save", function (obj) {
            assert.equal(obj.title, "Little Green Running Hood");
            assert.equal(this.title, "Little Green Running Hood");
            assert.equal(called, 0);
            called++;
        });

        schema.post("save", function (obj) {
            assert.equal(obj.title, "Little Green Running Hood");
            assert.equal(this.title, "Little Green Running Hood");
            assert.equal(called, 1);
            called++;
        });

        schema.post("save", (obj, next) => {
            assert.equal(obj.title, "Little Green Running Hood");
            assert.equal(called, 2);
            called++;
            next();
        });

        let db = start(),
            TestMiddleware = db.model("TestPostSaveMiddleware", schema);

        const test = new TestMiddleware({ title: "Little Green Running Hood" });

        test.save((err) => {
            assert.ifError(err);
            assert.equal(test.title, "Little Green Running Hood");
            assert.equal(called, 3);
            db.close();
            done();
        });
    });

    it("validate middleware runs before save middleware (gh-2462)", (done) => {
        const schema = new Schema({
            title: String
        });
        let count = 0;

        schema.pre("validate", (next) => {
            assert.equal(count++, 0);
            next();
        });

        schema.pre("save", (next) => {
            assert.equal(count++, 1);
            next();
        });

        const db = start();
        const Book = db.model("gh2462", schema);

        Book.create({}, () => {
            assert.equal(count, 2);
            db.close(done);
        });
    });

    it("works", (done) => {
        const schema = new Schema({
            title: String
        });

        let called = 0;

        schema.pre("init", (next) => {
            called++;
            next();
        });

        schema.pre("save", (next) => {
            called++;
            next(new Error("Error 101"));
        });

        schema.pre("remove", (next) => {
            called++;
            next();
        });

        mongoose.model("TestMiddleware", schema);

        let db = start(),
            TestMiddleware = db.model("TestMiddleware");

        const test = new TestMiddleware();

        test.init({
            title: "Test"
        });

        assert.equal(called, 1);

        test.save((err) => {
            assert.ok(err instanceof Error);
            assert.equal(err.message, "Error 101");
            assert.equal(called, 2);

            test.remove((err) => {
                db.close();
                assert.ifError(err);
                assert.equal(called, 3);
                done();
            });
        });
    });

    it("post init", (done) => {
        const schema = new Schema({
            title: String
        });

        let preinit = 0,
            postinit = 0;

        schema.pre("init", (next) => {
            ++preinit;
            next();
        });

        schema.post("init", (doc) => {
            assert.ok(doc instanceof mongoose.Document);
            ++postinit;
        });

        mongoose.model("TestPostInitMiddleware", schema);

        let db = start(),
            Test = db.model("TestPostInitMiddleware");

        const test = new Test({ title: "banana" });

        test.save((err) => {
            assert.ifError(err);

            Test.findById(test._id, (err, test) => {
                assert.ifError(err);
                assert.equal(preinit, 1);
                assert.equal(postinit, 1);
                test.remove(function () {
                    db.close();
                    done();
                });
            });
        });
    });

    it("gh-1829", (done) => {
        const childSchema = new mongoose.Schema({
            name: String
        });

        let childPreCalls = 0;
        const childPreCallsByName = {};
        let parentPreCalls = 0;

        childSchema.pre("save", function (next) {
            childPreCallsByName[this.name] = childPreCallsByName[this.name] || 0;
            ++childPreCallsByName[this.name];
            ++childPreCalls;
            next();
        });

        const parentSchema = new mongoose.Schema({
            name: String,
            children: [childSchema]
        });

        parentSchema.pre("save", (next) => {
            ++parentPreCalls;
            next();
        });

        const db = start();
        const Parent = db.model("gh-1829", parentSchema, "gh-1829");

        const parent = new Parent({
            name: "Han",
            children: [
                { name: "Jaina" },
                { name: "Jacen" }
            ]
        });

        parent.save((error) => {
            assert.ifError(error);
            assert.equal(childPreCalls, 2);
            assert.equal(childPreCallsByName.Jaina, 1);
            assert.equal(childPreCallsByName.Jacen, 1);
            assert.equal(parentPreCalls, 1);
            parent.children[0].name = "Anakin";
            parent.save((error) => {
                assert.ifError(error);
                assert.equal(childPreCalls, 4);
                assert.equal(childPreCallsByName.Anakin, 1);
                assert.equal(childPreCallsByName.Jaina, 1);
                assert.equal(childPreCallsByName.Jacen, 2);

                assert.equal(parentPreCalls, 2);
                db.close();
                done();
            });
        });
    });

    it("validate + remove", (done) => {
        const schema = new Schema({
            title: String
        });

        let preValidate = 0,
            postValidate = 0,
            preRemove = 0,
            postRemove = 0;

        schema.pre("validate", (next) => {
            ++preValidate;
            next();
        });

        schema.pre("remove", (next) => {
            ++preRemove;
            next();
        });

        schema.post("validate", (doc) => {
            assert.ok(doc instanceof mongoose.Document);
            ++postValidate;
        });

        schema.post("remove", (doc) => {
            assert.ok(doc instanceof mongoose.Document);
            ++postRemove;
        });

        let db = start(),
            Test = db.model("TestPostValidateMiddleware", schema);

        const test = new Test({ title: "banana" });

        test.save((err) => {
            assert.ifError(err);
            assert.equal(preValidate, 1);
            assert.equal(postValidate, 1);
            assert.equal(preRemove, 0);
            assert.equal(postRemove, 0);
            test.remove((err) => {
                db.close();
                assert.ifError(err);
                assert.equal(preValidate, 1);
                assert.equal(postValidate, 1);
                assert.equal(preRemove, 1);
                assert.equal(postRemove, 1);
                done();
            });
        });
    });
});

