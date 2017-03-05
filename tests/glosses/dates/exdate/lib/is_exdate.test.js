describe("adone.is.exdate", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("is adone.date object", () => {
        const MyObj = function () {};
        MyObj.prototype.toDate = function () {
            return new Date();
        };

        assert.ok(adone.is.exdate(adone.date()), "simple adone.date object");
        assert.ok(adone.is.exdate(adone.date(null)), "invalid adone.date object");

        assert.ok(!adone.is.exdate(new MyObj()), "myObj is not adone.date object");
        assert.ok(!adone.is.exdate(adone.date), "adone.date function is not adone.date object");
        assert.ok(!adone.is.exdate(new Date()), "date object is not adone.date object");
        assert.ok(!adone.is.exdate(Object), "Object is not adone.date object");
        assert.ok(!adone.is.exdate("foo"), "string is not adone.date object");
        assert.ok(!adone.is.exdate(1), "number is not adone.date object");
        assert.ok(!adone.is.exdate(NaN), "NaN is not adone.date object");
        assert.ok(!adone.is.exdate(null), "null is not adone.date object");
        assert.ok(!adone.is.exdate(undefined), "undefined is not adone.date object");
    });
});
