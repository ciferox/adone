const mongo = adone.database.mongo;
const { util } = adone.private(mongo.QueryBuilder);

describe("database", "mongo", "QueryBuilder", "util", () => {
    describe("clone", () => {
        it("clones constructors named ObjectId", (done) => {
            function ObjectId(id) {
                this.id = id;
            }

            const o1 = new ObjectId("1234");
            const o2 = util.clone(o1);
            assert.ok(o2 instanceof ObjectId);

            done();
        });

        it("clones constructors named ObjectId", (done) => {
            function ObjectId(id) {
                this.id = id;
            }

            const o1 = new ObjectId("1234");
            const o2 = util.clone(o1);

            assert.ok(o2 instanceof ObjectId);
            done();
        });

        it.skip("optionally clones ObjectId constructors using its clone method", (done) => {
            function ObjectId(id) {
                this.id = id;
                this.cloned = false;
            }

            ObjectId.prototype.clone = function () {
                const ret = new ObjectId(this.id);
                ret.cloned = true;
                return ret;
            };

            const id = 1234;
            const o1 = new ObjectId(id);
            assert.equal(id, o1.id);
            assert.equal(false, o1.cloned);

            const o2 = util.clone(o1);
            assert.ok(o2 instanceof ObjectId);
            assert.equal(id, o2.id);
            assert.ok(o2.cloned);
            done();
        });

        it("clones mongodb.ReadPreferences", (done) => {
            const tags = [
                { dc: "tag1" }
            ];
            const prefs = [
                new mongo.ReadPreference("primary"),
                new mongo.ReadPreference(mongo.ReadPreference.PRIMARY_PREFERRED),
                new mongo.ReadPreference("primary", tags),
            ];

            const prefsCloned = util.clone(prefs);

            for (let i = 0; i < prefsCloned.length; i++) {
                assert.notEqual(prefs[i], prefsCloned[i]);
                assert.ok(prefsCloned[i] instanceof mongo.ReadPreference);
                assert.ok(prefsCloned[i].isValid());
                if (prefs[i].tags) {
                    assert.ok(prefsCloned[i].tags);
                    assert.notEqual(prefs[i].tags, prefsCloned[i].tags);
                    assert.notEqual(prefs[i].tags[0], prefsCloned[i].tags[0]);
                } else {
                    assert.equal(prefsCloned[i].tags, null);
                }
            }

            done();
        });

        it("clones Binary", (done) => {
            const buf = new Buffer("hi");
            const binary = new adone.data.bson.Binary(buf, 2);
            const clone = util.clone(binary);
            assert.equal(binary.sub_type, clone.sub_type);
            assert.equal(String(binary.buffer), String(buf));
            assert.ok(binary !== clone);
            done();
        });

        it("handles objects with no constructor", (done) => {
            const name = "335";

            const o = Object.create(null);
            o.name = name;

            let clone;
            assert.doesNotThrow(() => {
                clone = util.clone(o);
            });

            assert.equal(name, clone.name);
            assert.ok(o != clone);
            done();
        });

        it("handles buffers", (done) => {
            const buff = new Buffer(10);
            buff.fill(1);
            const clone = util.clone(buff);

            for (let i = 0; i < buff.length; i++) {
                assert.equal(buff[i], clone[i]);
            }

            done();
        });
    });
});
