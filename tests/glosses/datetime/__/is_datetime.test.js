describe("datetime", "adone.is.datetime", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    const { is } = adone;

    it("is adone.datetime object", () => {
        const MyObj = function () {};
        MyObj.prototype.toDate = function () {
            return new Date();
        };

        assert.ok(is.datetime(adone.datetime()), "simple adone.datetime object");
        assert.ok(is.datetime(adone.datetime(null)), "invalid adone.datetime object");

        assert.ok(!is.datetime(new MyObj()), "myObj is not adone.datetime object");
        assert.ok(!is.datetime(adone.datetime), "adone.datetime function is not adone.datetime object");
        assert.ok(!is.datetime(new Date()), "date object is not adone.datetime object");
        assert.ok(!is.datetime(Object), "Object is not adone.datetime object");
        assert.ok(!is.datetime("foo"), "string is not adone.datetime object");
        assert.ok(!is.datetime(1), "number is not adone.datetime object");
        assert.ok(!is.datetime(NaN), "NaN is not adone.datetime object");
        assert.ok(!is.datetime(null), "null is not adone.datetime object");
        assert.ok(!is.datetime(undefined), "undefined is not adone.datetime object");
    });
});
