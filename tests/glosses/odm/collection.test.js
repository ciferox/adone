const mongoose = adone.odm;
const Collection = adone.odm.Collection;

describe("collections:", () => {
    it("should buffer commands until connection is established", (done) => {
        const db = mongoose.createConnection();
        const collection = db.collection("test-buffering-collection");
        let connected = false;
        let inserted = false;
        let pending = 2;

        function finish() {
            if (--pending) {
                return;
            }
            assert.ok(connected);
            assert.ok(inserted);
            done();
        }

        collection.insert({}, { safe: true }, () => {
            assert.ok(connected);
            inserted = true;
            db.close();
            finish();
        });

        const uri = "mongodb://localhost/mongoose_test";
        db.open(process.env.MONGOOSE_TEST_URI || uri, (err) => {
            connected = !err;
            finish();
        });
    });

    it.skip("methods should that throw (unimplemented)", (done) => {
        const collection = new Collection("test", mongoose.connection);
        let thrown = false;

        try {
            collection.getIndexes();
        } catch (e) {
            assert.ok(/unimplemented/.test(e.message));
            thrown = true;
        }

        assert.ok(thrown);
        thrown = false;

        try {
            collection.update();
        } catch (e) {
            assert.ok(/unimplemented/.test(e.message));
            thrown = true;
        }

        assert.ok(thrown);
        thrown = false;

        try {
            collection.save();
        } catch (e) {
            assert.ok(/unimplemented/.test(e.message));
            thrown = true;
        }

        assert.ok(thrown);
        thrown = false;

        try {
            collection.insert();
        } catch (e) {
            assert.ok(/unimplemented/.test(e.message));
            thrown = true;
        }

        assert.ok(thrown);
        thrown = false;

        try {
            collection.find();
        } catch (e) {
            assert.ok(/unimplemented/.test(e.message));
            thrown = true;
        }

        assert.ok(thrown);
        thrown = false;

        try {
            collection.findOne();
        } catch (e) {
            assert.ok(/unimplemented/.test(e.message));
            thrown = true;
        }

        assert.ok(thrown);
        thrown = false;

        try {
            collection.findAndModify();
        } catch (e) {
            assert.ok(/unimplemented/.test(e.message));
            thrown = true;
        }

        assert.ok(thrown);
        thrown = false;

        try {
            collection.ensureIndex();
        } catch (e) {
            assert.ok(/unimplemented/.test(e.message));
            thrown = true;
        }

        assert.ok(thrown);
        thrown = false;
        done();
    });
});
