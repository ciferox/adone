const start = require("./common");
const { Schema } = adone.odm;

describe("schematype", () => {
    describe("boolean", () => {
        it("null default is permitted (gh-523)", (done) => {
            let db = start(),
                s1 = new Schema({ b: { type: Boolean, default: null } }),
                M1 = db.model("NullDateDefaultIsAllowed1", s1),
                s2 = new Schema({ b: { type: Boolean, default: false } }),
                M2 = db.model("NullDateDefaultIsAllowed2", s2),
                s3 = new Schema({ b: { type: Boolean, default: true } }),
                M3 = db.model("NullDateDefaultIsAllowed3", s3);

            db.close();

            const m1 = new M1();
            assert.strictEqual(null, m1.b);
            const m2 = new M2();
            assert.strictEqual(false, m2.b);
            const m3 = new M3();
            assert.strictEqual(true, m3.b);
            done();
        });

        it("strictBool option (gh-5211)", (done) => {
            let db = start(),
                s1 = new Schema({ b: { type: Boolean, strictBool: true } }),
                M1 = db.model("StrictBoolTrue", s1);
            db.close();

            const strictValues = [true, false, "true", "false", 0, 1, "0", "1"];

            let testsRemaining = strictValues.length;
            strictValues.forEach((value) => {
                const doc = new M1();
                doc.b = value;
                doc.validate((error) => {
                    if (error) {
                        // test fails as soon as one value fails
                        return done(error);
                    }
                    if (!--testsRemaining) {
                        return done();
                    }
                });
            });

        });
    });
});
