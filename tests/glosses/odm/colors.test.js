const start = require("./common");
const mongoose = adone.odm;
const Schema = mongoose.Schema;
const MongooseDocumentArray = mongoose.Types.DocumentArray;
const { EmbeddedDocument, DocumentArray } = adone.odm.types;

/**
 * setup
 */

const test = new Schema({
    string: String,
    number: Number,
    date: {
        type: Date,
        default: Date.now
    }
});

function TestDoc(schema) {
    const Subdocument = function () {
        EmbeddedDocument.call(this, {}, new DocumentArray());
    };

    /**
     * Inherits from EmbeddedDocument.
     */

    Subdocument.prototype.__proto__ = EmbeddedDocument.prototype;

    /**
     * Set schema.
     */

    Subdocument.prototype.$__setSchema(schema || test);

    return Subdocument;
}

/**
 * Test.
 */

describe("debug: colors", () => {
    let db;
    let Test;

    before(() => {
        db = start();
        Test = db.model("Test", test, "TEST");
    });

    after((done) => {
        db.close(done);
    });

    it("Document", (done) => {
        const date = new Date();

        Test.create([{
            string: "qwerty",
            number: 123,
            date
        }, {
            string: "asdfgh",
            number: 456,
            date
        }, {
            string: "zxcvbn",
            number: 789,
            date
        }], (err) => {
            assert.ifError(err);
            Test
                .find()
                .lean(false)
                .exec((err, docs) => {
                    assert.ifError(err);

                    const colorfull = require("util").inspect(docs, {
                        depth: null,
                        colors: true
                    });

                    const colorless = require("util").inspect(docs, {
                        depth: null,
                        colors: false
                    });

                    // console.log(colorfull, colorless);

                    assert.notEqual(colorfull, colorless);

                    done();
                });
        });
    });

    it("MongooseDocumentArray", () => {
        const Subdocument = TestDoc();

        const sub1 = new Subdocument();
        sub1.string = "string";
        sub1.number = 12345;
        sub1.date = new Date();

        const docs = new MongooseDocumentArray([sub1]);

        const colorfull = require("util").inspect(docs, {
            depth: null,
            colors: true
        });

        const colorless = require("util").inspect(docs, {
            depth: null,
            colors: false
        });

        // console.log(colorfull, colorless);

        assert.notEqual(colorfull, colorless);
    });
});
