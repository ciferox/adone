export default function(locale) {
    it("lenient ordinal parsing", function() {
        let ordinalStr;
        let testMoment;
        for (let i = 1; i <= 31; ++i) {
            ordinalStr = adone.date([2014, 0, i]).format("YYYY MM Do");
            testMoment = adone.date(ordinalStr, "YYYY MM Do");
            assert.equal(testMoment.year(), 2014,
                "lenient ordinal parsing " + i + " year check");
            assert.equal(testMoment.month(), 0,
                "lenient ordinal parsing " + i + " month check");
            assert.equal(testMoment.date(), i,
                "lenient ordinal parsing " + i + " date check");
        }
    });

    it("lenient ordinal parsing of number", function() {
        let testMoment;
        for (let i = 1; i <= 31; ++i) {
            testMoment = adone.date("2014 01 " + i, "YYYY MM Do");
            assert.equal(testMoment.year(), 2014,
                "lenient ordinal parsing of number " + i + " year check");
            assert.equal(testMoment.month(), 0,
                "lenient ordinal parsing of number " + i + " month check");
            assert.equal(testMoment.date(), i,
                "lenient ordinal parsing of number " + i + " date check");
        }
    });

    it("strict ordinal parsing", function() {
        let ordinalStr;
        let testMoment;
        for (let i = 1; i <= 31; ++i) {
            ordinalStr = adone.date([2014, 0, i]).format("YYYY MM Do");
            testMoment = adone.date(ordinalStr, "YYYY MM Do", true);
            assert.ok(testMoment.isValid(), "strict ordinal parsing " + i);
        }
    });

    it("meridiem invariant", function() {
        for (let h = 0; h < 24; ++h) {
            for (let m = 0; m < 60; m += 15) {
                const t1 = adone.date.utc([2000, 0, 1, h, m]);
                const t2 = adone.date.utc(t1.format("A h:mm"), "A h:mm");
                assert.equal(t2.format("HH:mm"), t1.format("HH:mm"),
                    "meridiem at " + t1.format("HH:mm"));
            }
        }
    });

    it("date format correctness", function() {
        const data = adone.date.localeData()._longDateFormat;
        const tokens = adone.util.keys(data);
        tokens.forEach(function(srchToken) {
            // Check each format string to make sure it does not contain any
            // tokens that need to be expanded.
            tokens.forEach(function(baseToken) {
                // strip escaped sequences
                const format = data[baseToken].replace(/(\[[^\]]*\])/g, "");
                assert.equal(false, !!~format.indexOf(srchToken),
                    "contains " + srchToken + " in " + baseToken);
            });
        });
    });

    it("month parsing correctness", function() {
        let i;
        let m;

        if (locale === "tr") {
            // I can't fix it :(
            expect(0);
            return;
        }

        function tester(format) {
            let r;
            r = adone.date(m.format(format), format);
            assert.equal(r.month(), m.month(), "month " + i + " fmt " + format);
            r = adone.date(m.format(format).toLocaleUpperCase(), format);
            assert.equal(r.month(), m.month(), "month " + i + " fmt " + format + " upper");
            r = adone.date(m.format(format).toLocaleLowerCase(), format);
            assert.equal(r.month(), m.month(), "month " + i + " fmt " + format + " lower");

            r = adone.date(m.format(format), format, true);
            assert.equal(r.month(), m.month(), "month " + i + " fmt " + format + " strict");
            r = adone.date(m.format(format).toLocaleUpperCase(), format, true);
            assert.equal(r.month(), m.month(), "month " + i + " fmt " + format + " upper strict");
            r = adone.date(m.format(format).toLocaleLowerCase(), format, true);
            assert.equal(r.month(), m.month(), "month " + i + " fmt " + format + " lower strict");
        }

        for (i = 0; i < 12; ++i) {
            m = adone.date([2015, i, 15, 18]);
            tester("MMM");
            tester("MMM.");
            tester("MMMM");
            tester("MMMM.");
        }
    });

    it("weekday parsing correctness", function() {
        let i;
        let m;

        if (locale === "tr" || locale === "az" || locale === "ro") {
            // tr, az: There is a lower-case letter (ı), that converted to
            // upper then lower changes to i
            // ro: there is the letter ț which behaves weird under IE8
            expect(0);
            return;
        }

        function tester(format) {
            let r;
            const baseMsg = "weekday " + m.weekday() + " fmt " + format + " " + m.toISOString();
            r = adone.date(m.format(format), format);
            assert.equal(r.weekday(), m.weekday(), baseMsg);
            r = adone.date(m.format(format).toLocaleUpperCase(), format);
            assert.equal(r.weekday(), m.weekday(), baseMsg + " upper");
            r = adone.date(m.format(format).toLocaleLowerCase(), format);
            assert.equal(r.weekday(), m.weekday(), baseMsg + " lower");

            r = adone.date(m.format(format), format, true);
            assert.equal(r.weekday(), m.weekday(), baseMsg + " strict");
            r = adone.date(m.format(format).toLocaleUpperCase(), format, true);
            assert.equal(r.weekday(), m.weekday(), baseMsg + " upper strict");
            r = adone.date(m.format(format).toLocaleLowerCase(), format, true);
            assert.equal(r.weekday(), m.weekday(), baseMsg + " lower strict");
        }

        for (i = 0; i < 7; ++i) {
            m = adone.date.utc([2015, 0, i + 1, 18]);
            tester("dd");
            tester("ddd");
            tester("dddd");
        }
    });
}
