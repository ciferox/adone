const mongoose = adone.odm;
const { Schema } = adone.odm;

describe("types.subdocument", () => {
    let GrandChildSchema;
    let ChildSchema;
    let ParentSchema;

    before(() => {
        GrandChildSchema = new Schema({
            name: String
        });

        ChildSchema = new Schema({
            name: String,
            child: GrandChildSchema
        });

        ParentSchema = new Schema({
            name: String,
            children: [ChildSchema]
        });

        mongoose.model("Parent-3589-Sub", ParentSchema);
    });

    it("returns a proper ownerDocument (gh-3589)", (done) => {
        const Parent = mongoose.model("Parent-3589-Sub");
        const p = new Parent({
            name: "Parent Parentson",
            children: [
                {
                    name: "Child Parentson",
                    child: {
                        name: "GrandChild Parentson"
                    }
                }
            ]
        });

        assert.equal(p._id, p.children[0].child.ownerDocument()._id);
        done();
    });
    it("not setting timestamps in subdocuments", () => {
        const Thing = mongoose.model("Thing", new Schema({
            subArray: [{
                testString: String
            }]
        }, {
                timestamps: true
            }));

        const thingy = new Thing({
            subArray: [{
                testString: "Test 1"
            }]
        });
        let id;
        thingy.save((err, item) => {
            assert(!err);
            id = item._id;
        })
            .then(() => {
                let thingy2 = {
                    subArray: [{
                        testString: 'Test 2'
                    }]
                };
                return Thing.update({
                    _id: id
                }, { $set: thingy2 });
            })
            .then(() => {
                mongoose.connection.close();
            }, (reason) => {
                assert(!reason);
            });
    });
});
