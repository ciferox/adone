const {
    odm: { Schema }
} = adone;

const { Long } = Schema.Types;

describe("odb", "Long", () => {
    it("is a function", () => {
        assert.equal("function", typeof Long);
    });

    it("extends adone.odm.Schema.Types", () => {
        assert.ok(Schema.Types.Long);
        assert.equal(Long, Schema.Types.Long);
    });

    it("can be used in schemas", () => {
        var s = new Schema({ long: Long });
        var long = s.path("long");
        assert.ok(long instanceof adone.odm.SchemaType);
        assert.equal("function", typeof long.get);

        var s = new Schema({ long: "long" });
        var long = s.path("long");
        assert.ok(long instanceof adone.odm.SchemaType);
        assert.equal("function", typeof long.get);
    });

    describe("integration", () => {
        let db, S, schema, id;

        before((done) => {
            db = adone.odm.createConnection('localhost', 'mongoose_long')
            db.once('open', function () {
                schema = new Schema({ long: Long, name: 'string' });
                S = db.model('Long', schema);
                done();
            });
        });

        describe("casts", () => {
            it('numbers', function () {
                var v = 200000000;
                var s = new S({ long: v });
                assert.ok(s.long instanceof adone.odm.Types.Long);
                assert.equal(v, s.long.toNumber());

                v = new Number(200000000);
                s = new S({ long: v });
                assert.ok(s.long instanceof adone.odm.Types.Long);
                assert.equal(+v, s.long.toNumber());
            })

            it('strings', function () {
                var v = '200000000';
                var s = new S({ long: v });
                assert.ok(s.long instanceof adone.odm.Types.Long);
                assert.equal(v, s.long.toString());
            })

            it('null', function () {
                var s = new S({ long: null });
                assert.equal(null, s.long);
            })

            it('mongo.Long', function () {
                var s = new S({ long: new adone.odm.Types.Long("90") });
                assert.ok(s.long instanceof adone.odm.Types.Long);
                assert.equal(90, s.long.toNumber());
            })

            it('non-castables produce _saveErrors', function (done) {
                var schema = new Schema({ long: Long }, { strict: 'throw' });
                var M = db.model('throws', schema);
                var m = new M({ long: [] });
                m.save(function (err) {
                    assert.ok(err);
                    assert.equal('ValidationError', err.name);
                    assert.equal(err.errors['long'].name, 'CastError');
                    done();
                });
            })
        });

        it("can be saved", (done) => {
            var s = new S({ long: 20 });
            id = s.id;
            s.save(function (err) {
                assert.ifError(err);
                done();
            })
        });

        it("is queryable", (done) => {
            S.findById(id, function (err, doc) {
                assert.ifError(err);
                assert.ok(doc.long instanceof adone.odm.Types.Long);
                assert.equal(20, doc.long.toNumber());
                done();
            });
        });

        it("can be updated", (done) => {
            S.findById(id, function (err, doc) {
                assert.ifError(err);
                doc.long = doc.long.add(adone.odm.Types.Long.fromString("10"));
                doc.save(function (err) {
                    assert.ifError(err);
                    S.findById(id, function (err, doc) {
                        assert.ifError(err);
                        assert.equal(30, doc.long.toNumber());
                        done();
                    });
                })
            })
        });

        it("can be required", (done) => {
            var s = new Schema({ long: { type: Long, required: true } });
            var M = db.model('required', s);
            var m = new M;
            m.save(function (err) {
                assert.ok(err);
                m.long = 10;
                m.validate(function (err) {
                    assert.ifError(err);
                    done();
                })
            })
        });

        it("works with update", (done) => {
            S.create({ long: 99999 }, function (err, s) {
                assert.ifError(err);
                S.update({ long: s.long, _id: s._id }, { name: 'changed' }, { upsert: true }, function (err) {
                    assert.ifError(err);

                    S.findById(s._id, function (err, doc) {
                        assert.ifError(err);
                        assert.equal(99999, doc.long);
                        assert.equal('changed', doc.name);
                        done();
                    })
                });
            });

        });
    });
});
