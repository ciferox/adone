const mongoose = adone.odm;
const Schema = mongoose.Schema;

describe("types.embeddeddocument", () => {
    let GrandChildSchema;
    let ChildSchema;
    let ParentSchema;

    before(() => {
        GrandChildSchema = new Schema({
            name: String
        });

        ChildSchema = new Schema({
            name: String,
            children: [GrandChildSchema]
        });

        ParentSchema = new Schema({
            name: String,
            child: ChildSchema
        });

        mongoose.model("Parent-3589-Embedded", ParentSchema);
    });

    it("returns a proper ownerDocument (gh-3589)", (done) => {
        const Parent = mongoose.model("Parent-3589-Embedded");
        const p = new Parent({
            name: "Parent Parentson",
            child: {
                name: "Child Parentson",
                children: [
                    {
                        name: "GrandChild Parentson"
                    }
                ]
            }
        });

        assert.equal(p._id, p.child.children[0].ownerDocument()._id);
        done();
    });
});
