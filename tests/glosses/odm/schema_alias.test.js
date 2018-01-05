const start = require("./common");
const mongoose = adone.odm;
const { Schema } = adone.odm;

describe("schema alias option", () => {
    it("works with all basic schema types", (done) => {
        const db = start();

        const schema = new Schema({
            string: { type: String, alias: "StringAlias" },
            number: { type: Number, alias: "NumberAlias" },
            date: { type: Date, alias: "DateAlias" },
            buffer: { type: Buffer, alias: "BufferAlias" },
            boolean: { type: Boolean, alias: "BooleanAlias" },
            mixed: { type: Schema.Types.Mixed, alias: "MixedAlias" },
            objectId: { type: Schema.Types.ObjectId, alias: "ObjectIdAlias" },
            array: { type: [], alias: "ArrayAlias" }
        });

        const S = db.model("AliasSchemaType", schema);
        S.create({
            string: "hello",
            number: 1,
            date: new Date(),
            buffer: Buffer.from("World"),
            boolean: false,
            mixed: [1, [], "three", { four: 5 }],
            objectId: new mongoose.Types.ObjectId(),
            array: ["a", "b", "c", "d"]
        }, (err, s) => {
            assert.ifError(err);

            // Comparing with aliases
            assert.equal(s.string, s.StringAlias);
            assert.equal(s.number, s.NumberAlias);
            assert.equal(s.date, s.DateAlias);
            assert.equal(s.buffer, s.BufferAlias);
            assert.equal(s.boolean, s.BooleanAlias);
            assert.equal(s.mixed, s.MixedAlias);
            assert.equal(s.objectId, s.ObjectIdAlias);
            assert.equal(s.array, s.ArrayAlias);
            done();
        });
    });

    // does not work in the origin
    it.todo("works with nested schema types", (done) => {
        const db = start();

        const schema = new Schema({
            nested: {
                type: {
                    string: { type: String, alias: "StringAlias" },
                    number: { type: Number, alias: "NumberAlias" },
                    date: { type: Date, alias: "DateAlias" },
                    buffer: { type: Buffer, alias: "BufferAlias" },
                    boolean: { type: Boolean, alias: "BooleanAlias" },
                    mixed: { type: Schema.Types.Mixed, alias: "MixedAlias" },
                    objectId: { type: Schema.Types.ObjectId, alias: "ObjectIdAlias" },
                    array: { type: [], alias: "ArrayAlias" }
                },
                alias: "NestedAlias"
            }
        });

        const S = db.model("AliasNestedSchemaType", schema);
        S.create({
            nested: {
                string: "hello",
                number: 1,
                date: new Date(),
                buffer: Buffer.from("World"),
                boolean: false,
                mixed: [1, [], "three", { four: 5 }],
                objectId: new mongoose.Types.ObjectId(),
                array: ["a", "b", "c", "d"]
            }
        }, (err, s) => {
            assert.ifError(err);

            // Comparing with aliases
            assert.equal(s.nested, s.NestedAlias);
            assert.equal(s.nested.string, s.StringAlias);
            assert.equal(s.nested.number, s.NumberAlias);
            assert.equal(s.nested.date, s.DateAlias);
            assert.equal(s.nested.buffer, s.BufferAlias);
            assert.equal(s.nested.boolean, s.BooleanAlias);
            assert.equal(s.nested.mixed, s.MixedAlias);
            assert.equal(s.nested.objectId, s.ObjectIdAlias);
            assert.equal(s.nested.array, s.ArrayAlias);
            done();
        });
    });

    it("throws when alias option is invalid", () => {
        assert.throws(() => {
            new Schema({
                foo: { type: String, alias: 456 }
            });
        });
    });
});
