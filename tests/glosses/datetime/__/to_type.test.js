describe("to type", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("toObject", () => {
        const expected = {
            years: 2010,
            months: 3,
            date: 5,
            hours: 15,
            minutes: 10,
            seconds: 3,
            milliseconds: 123
        };
        assert.deepEqual(adone.datetime(expected).toObject(), expected, "toObject invalid");
    });

    it("toArray", () => {
        const expected = [2014, 11, 26, 11, 46, 58, 17];
        assert.deepEqual(adone.datetime(expected).toArray(), expected, "toArray invalid");
    });

    it("toDate returns a copy of the internal date", () => {
        const m = adone.datetime();
        const d = m.toDate();
        m.year(0);
        assert.notEqual(d, m.toDate());
    });

    it("toJSON", () => {
        if (Date.prototype.toISOString) {
            const expected = new Date().toISOString();
            assert.deepEqual(adone.datetime(expected).toJSON(), expected, "toJSON invalid");
        } else {
            // IE8
            expect(0);
        }
    });

    it("toJSON works when moment is frozen", () => {
        if (Date.prototype.toISOString) {
            const expected = new Date().toISOString();
            const m = adone.datetime(expected);
            if (Object.freeze !== null) {
                Object.freeze(m);
            }
            assert.deepEqual(m.toJSON(), expected, "toJSON when frozen invalid");
        } else {
            // IE8
            expect(0);
        }
    });
});
