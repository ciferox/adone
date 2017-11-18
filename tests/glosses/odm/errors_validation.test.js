const mongoose = adone.odm;
const Schema = mongoose.Schema;
const SchemaType = mongoose.SchemaType;
const ValidatorError = SchemaType.ValidatorError;
const { ValidationError } = adone.odm.Error;

describe("ValidationError", () => {
    describe("#infiniteRecursion", () => {
        it("does not cause RangeError (gh-1834)", (done) => {
            let SubSchema,
                M,
                model;

            SubSchema = new Schema({
                name: { type: String, required: true },
                contents: [new Schema({
                    key: { type: String, required: true },
                    value: { type: String, required: true }
                }, { _id: false })]
            });

            M = mongoose.model("SubSchema", SubSchema);

            model = new M({
                name: "Model",
                contents: [
                    { key: "foo" }
                ]
            });

            model.validate((err) => {
                assert.doesNotThrow(function () {
                    JSON.stringify(err);
                });
                done();
            });
        });
    });

    describe("#minDate", () => {
        it("causes a validation error", (done) => {
            let MinSchema,
                M,
                model;

            MinSchema = new Schema({
                appointmentDate: { type: Date, min: Date.now }
            });

            M = mongoose.model("MinSchema", MinSchema);

            model = new M({
                appointmentDate: new Date(Date.now().valueOf() - 10000)
            });

            // should fail validation
            model.validate((err) => {
                assert.notEqual(err, null, 'min Date validation failed.');
                model.appointmentDate = new Date(Date.now().valueOf() + 10000);

                // should pass validation
                model.validate(function (err) {
                    assert.equal(err, null);
                    done();
                });
            });
        });
    });

    describe("#maxDate", () => {
        it("causes a validation error", (done) => {
            let MaxSchema,
                M,
                model;

            MaxSchema = new Schema({
                birthdate: { type: Date, max: Date.now }
            });

            M = mongoose.model("MaxSchema", MaxSchema);

            model = new M({
                birthdate: new Date(Date.now().valueOf() + 2000)
            });

            // should fail validation
            model.validate((err) => {
                assert.notEqual(err, null, 'max Date validation failed');
                model.birthdate = Date.now();

                // should pass validation
                model.validate(function (err) {
                    assert.equal(err, null, 'max Date validation failed');
                    done();
                });
            });
        });
    });

    describe("#minlength", () => {
        it("causes a validation error", (done) => {
            let AddressSchema,
                Address,
                model;

            AddressSchema = new Schema({
                postalCode: { type: String, minlength: 5 }
            });

            Address = mongoose.model("MinLengthAddress", AddressSchema);

            model = new Address({
                postalCode: "9512"
            });

            // should fail validation
            model.validate((err) => {
                assert.notEqual(err, null, 'String minlegth validation failed.');
                model.postalCode = '95125';

                // should pass validation
                model.validate(function (err) {
                    assert.equal(err, null);
                    done();
                });
            });
        });

        it("with correct error message (gh-4207)", (done) => {
            let old = mongoose.Error.messages;
            mongoose.Error.messages = {
                String: {
                    minlength: "woops!"
                }
            };

            let AddressSchema = new Schema({
                postalCode: { type: String, minlength: 5 }
            });

            let Address = mongoose.model("gh4207", AddressSchema);

            let model = new Address({
                postalCode: "9512"
            });

            // should fail validation
            model.validate((err) => {
                assert.equal(err.errors['postalCode'].message, 'woops!');
                mongoose.Error.messages = old;
                done();
            });
        });
    });

    describe("#maxlength", () => {
        it("causes a validation error", (done) => {
            let AddressSchema,
                Address,
                model;

            AddressSchema = new Schema({
                postalCode: { type: String, maxlength: 10 }
            });

            Address = mongoose.model("MaxLengthAddress", AddressSchema);

            model = new Address({
                postalCode: "95125012345"
            });

            // should fail validation
            model.validate((err) => {
                assert.notEqual(err, null, 'String maxlegth validation failed.');
                model.postalCode = '95125';

                // should pass validation
                model.validate(function (err) {
                    assert.equal(err, null);
                    done();
                });
            });
        });
    });

    describe("#toString", () => {
        it("does not cause RangeError (gh-1296)", (done) => {
            let ASchema = new Schema({
                key: { type: String, required: true },
                value: { type: String, required: true }
            });

            let BSchema = new Schema({
                contents: [ASchema]
            });

            let M = mongoose.model("A", BSchema);
            let m = new M();
            m.contents.push({ key: "asdf" });
            m.validate((err) => {
                assert.doesNotThrow(function () {
                    String(err);
                });
                done();
            });
        });
    });

    describe("formatMessage", () => {
        it("replaces properties in a message", (done) => {
            let props = { base: "eggs", topping: "bacon" };
            let message = "I had {BASE} and {TOPPING} for breakfast";

            let result = ValidatorError.prototype.formatMessage(message, props);
            assert.equal(result, "I had eggs and bacon for breakfast");
            done();
        });
    });

    it("JSON.stringify() with message (gh-5309)", (done) => {
        model.modelName = "TestClass";
        const err = new ValidationError(new model());

        err.addError("test", { message: "Fail" });

        const obj = JSON.parse(JSON.stringify(err));
        assert.ok(obj.message.indexOf("TestClass validation failed") !== -1,
            obj.message);
        assert.ok(obj.message.indexOf("test: Fail") !== -1,
            obj.message);

        done();

        function model() { }
    });
});
