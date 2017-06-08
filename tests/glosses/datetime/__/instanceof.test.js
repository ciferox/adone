describe("datetime", "instanceof", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("instanceof", () => {
        const extend = function (a, b) {
            let i;
            for (i in b) {
                a[i] = b[i];
            }
            return a;
        };

        assert.equal(adone.datetime() instanceof adone.datetime, true, "simple adone.datetime object");
        assert.equal(extend({}, adone.datetime()) instanceof adone.datetime, false, "extended adone.datetime object");
        assert.equal(adone.datetime(null) instanceof adone.datetime, true, "invalid adone.datetime object");

        assert.equal(new Date() instanceof adone.datetime, false, "date object is not adone.datetime object");
        assert.equal(Object instanceof adone.datetime, false, "Object is not adone.datetime object");
        assert.equal("foo" instanceof adone.datetime, false, "string is not adone.datetime object");
        assert.equal(1 instanceof adone.datetime, false, "number is not adone.datetime object");
        assert.equal(NaN instanceof adone.datetime, false, "NaN is not adone.datetime object");
        assert.equal(null instanceof adone.datetime, false, "null is not adone.datetime object");
        assert.equal(undefined instanceof adone.datetime, false, "undefined is not adone.datetime object");
    });
});
