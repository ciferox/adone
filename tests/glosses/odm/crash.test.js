// GH-407

const mongoose = adone.odm;

describe("crash: (gh-407)", () => {
    it("test mongodb crash with invalid objectid string", (done) => {
        const db = mongoose.createConnection("mongodb://localhost/test-crash");

        const IndexedGuy = new mongoose.Schema({
            name: { type: String }
        });

        const Guy = db.model("Guy", IndexedGuy);
        Guy.find({
            _id: {
                $in: [
                    "4e0de2a6ee47bff98000e145",
                    "4e137bd81a6a8e00000007ac",
                    "",
                    "4e0e2ca0795666368603d974"]
            }
        }, (err) => {
            db.close(done);

            try {
                assert.equal(err.message,
                    'Cast to ObjectId failed for value "" at path "_id" for model "Guy"');
            } catch (er) {
                console.error(err);
                throw er;
            }
        });
    });
});
