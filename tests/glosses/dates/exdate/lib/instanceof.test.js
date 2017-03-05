describe("instanceof", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("instanceof", () => {
        const extend = function (a, b) {
            let i;
            for (i in b) {
                a[i] = b[i];
            }
            return a;
        };

        assert.equal(adone.date() instanceof adone.date, true, "simple adone.date object");
        assert.equal(extend({}, adone.date()) instanceof adone.date, false, "extended adone.date object");
        assert.equal(adone.date(null) instanceof adone.date, true, "invalid adone.date object");

        assert.equal(new Date() instanceof adone.date, false, "date object is not adone.date object");
        assert.equal(Object instanceof adone.date, false, "Object is not adone.date object");
        assert.equal("foo" instanceof adone.date, false, "string is not adone.date object");
        assert.equal(1 instanceof adone.date, false, "number is not adone.date object");
        assert.equal(NaN instanceof adone.date, false, "NaN is not adone.date object");
        assert.equal(null instanceof adone.date, false, "null is not adone.date object");
        assert.equal(undefined instanceof adone.date, false, "undefined is not adone.date object");
    });
});
