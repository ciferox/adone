describe("adone.is.exdate", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("is adone.datetime object", () => {
        const MyObj = function () {};
        MyObj.prototype.toDate = function () {
            return new Date();
        };

        assert.ok(adone.is.exdate(adone.datetime()), "simple adone.datetime object");
        assert.ok(adone.is.exdate(adone.datetime(null)), "invalid adone.datetime object");

        assert.ok(!adone.is.exdate(new MyObj()), "myObj is not adone.datetime object");
        assert.ok(!adone.is.exdate(adone.datetime), "adone.datetime function is not adone.datetime object");
        assert.ok(!adone.is.exdate(new Date()), "date object is not adone.datetime object");
        assert.ok(!adone.is.exdate(Object), "Object is not adone.datetime object");
        assert.ok(!adone.is.exdate("foo"), "string is not adone.datetime object");
        assert.ok(!adone.is.exdate(1), "number is not adone.datetime object");
        assert.ok(!adone.is.exdate(NaN), "NaN is not adone.datetime object");
        assert.ok(!adone.is.exdate(null), "null is not adone.datetime object");
        assert.ok(!adone.is.exdate(undefined), "undefined is not adone.datetime object");
    });
});
