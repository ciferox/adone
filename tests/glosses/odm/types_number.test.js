const mongoose = adone.odm;
const SchemaNumber = mongoose.Schema.Types.Number;


describe("types.number", () => {
    it("an empty string casts to null", (done) => {
        const n = new SchemaNumber();
        assert.strictEqual(n.cast(""), null);
        done();
    });

    it("a null number should castForQuery to null", (done) => {
        const n = new SchemaNumber();
        assert.strictEqual(n.castForQuery(null), null);
        done();
    });

    it("undefined throws number cast error", (done) => {
        const n = new SchemaNumber();
        let err;
        try {
            n.cast(undefined);
        } catch (e) {
            err = e;
        }
        assert.strictEqual(true, Boolean(err));
        done();
    });

    it("array throws cast number error", (done) => {
        const n = new SchemaNumber();
        let err;
        try {
            n.cast([]);
        } catch (e) {
            err = e;
        }
        assert.strictEqual(true, Boolean(err));
        done();
    });

    it("three throws cast number error", (done) => {
        const n = new SchemaNumber();
        let err;
        try {
            n.cast("three");
        } catch (e) {
            err = e;
        }
        assert.strictEqual(true, Boolean(err));
        done();
    });

    it("{} throws cast number error", (done) => {
        const n = new SchemaNumber();
        let err;
        try {
            n.cast({});
        } catch (e) {
            err = e;
        }
        assert.strictEqual(true, Boolean(err));
        done();
    });

    it("does not throw number cast error", (done) => {
        const n = new SchemaNumber();
        const items = [1, "2", "0", null, "", new String("47"), new Number(5), Number(47), Number("09"), 0x12];
        let err;
        try {
            for (let i = 0, len = items.length; i < len; ++i) {
                n.cast(items[i]);
            }
        } catch (e) {
            err = e;
        }
        assert.strictEqual(false, Boolean(err), err);
        done();
    });

    it("boolean casts to 0/1 (gh-3475)", (done) => {
        const n = new SchemaNumber();
        assert.strictEqual(n.cast(true), 1);
        assert.strictEqual(n.cast(false), 0);
        done();
    });
});
