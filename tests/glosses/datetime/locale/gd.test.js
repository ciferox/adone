import commonLocaleTests from "../helpers/common-locale";
describe("gd", () => {
    commonLocaleTests("gd");

    beforeEach(() => {
        adone.datetime.locale("gd");
    });

    const months = ["Am Faoilleach,Faoi", "An Gearran,Gear", "Am Màrt,Màrt", "An Giblean,Gibl", "An Cèitean,Cèit", "An t-Ògmhios,Ògmh", "An t-Iuchar,Iuch", "An Lùnastal,Lùn", "An t-Sultain,Sult", "An Dàmhair,Dàmh", "An t-Samhain,Samh", "An Dùbhlachd,Dùbh"];

    it("parse", () => {
        function equalTest(monthName, monthFormat, monthNum) {
            assert.equal(adone.datetime(monthName, monthFormat).month(), monthNum, `${monthName} should be month ${monthNum + 1}`);
        }

        for (let i = 0; i < 12; i++) {
            const testMonth = months[i].split(",");
            equalTest(testMonth[0], "MMM", i);
            equalTest(testMonth[1], "MMM", i);
            equalTest(testMonth[0], "MMMM", i);
            equalTest(testMonth[1], "MMMM", i);
            equalTest(testMonth[0].toLocaleLowerCase(), "MMMM", i);
            equalTest(testMonth[1].toLocaleLowerCase(), "MMMM", i);
            equalTest(testMonth[0].toLocaleUpperCase(), "MMMM", i);
            equalTest(testMonth[1].toLocaleUpperCase(), "MMMM", i);
        }
    });

    it("format", () => {
        const a = [
            ["dddd, MMMM Do YYYY, h:mm:ss a", "Didòmhnaich, An Gearran 14mh 2010, 3:25:50 pm"],
            ["ddd, hA", "Did, 3PM"],
            ["M Mo MM MMMM MMM", "2 2na 02 An Gearran Gear"],
            ["YYYY YY", "2010 10"],
            ["D Do DD", "14 14mh 14"],
            ["d do dddd ddd dd", "0 0mh Didòmhnaich Did Dò"],
            ["DDD DDDo DDDD", "45 45mh 045"],
            ["w wo ww", "6 6mh 06"],
            ["h hh", "3 03"],
            ["H HH", "15 15"],
            ["m mm", "25 25"],
            ["s ss", "50 50"],
            ["a A", "pm PM"],
            ["[an] DDDo [latha den bhliadhna]", "an 45mh latha den bhliadhna"],
            ["LTS", "15:25:50"],
            ["L", "14/02/2010"],
            ["LL", "14 An Gearran 2010"],
            ["LLL", "14 An Gearran 2010 15:25"],
            ["LLLL", "Didòmhnaich, 14 An Gearran 2010 15:25"],
            ["l", "14/2/2010"],
            ["ll", "14 Gear 2010"],
            ["lll", "14 Gear 2010 15:25"],
            ["llll", "Did, 14 Gear 2010 15:25"]
        ];
        const b = adone.datetime(new Date(2010, 1, 14, 15, 25, 50, 125));
        let i;

        for (i = 0; i < a.length; i++) {
            assert.equal(b.format(a[i][0]), a[i][1], `${a[i][0]} ---> ${a[i][1]}`);
        }
    });

    it("format ordinal", () => {
        assert.equal(adone.datetime([2011, 0, 1]).format("DDDo"), "1d", "1d");
        assert.equal(adone.datetime([2011, 0, 2]).format("DDDo"), "2na", "2na");
        assert.equal(adone.datetime([2011, 0, 3]).format("DDDo"), "3mh", "3mh");
        assert.equal(adone.datetime([2011, 0, 4]).format("DDDo"), "4mh", "4mh");
        assert.equal(adone.datetime([2011, 0, 5]).format("DDDo"), "5mh", "5mh");
        assert.equal(adone.datetime([2011, 0, 6]).format("DDDo"), "6mh", "6mh");
        assert.equal(adone.datetime([2011, 0, 7]).format("DDDo"), "7mh", "7mh");
        assert.equal(adone.datetime([2011, 0, 8]).format("DDDo"), "8mh", "8mh");
        assert.equal(adone.datetime([2011, 0, 9]).format("DDDo"), "9mh", "9mh");
        assert.equal(adone.datetime([2011, 0, 10]).format("DDDo"), "10mh", "10mh");
        assert.equal(adone.datetime([2011, 0, 11]).format("DDDo"), "11mh", "11mh");
        assert.equal(adone.datetime([2011, 0, 12]).format("DDDo"), "12na", "12na");
        assert.equal(adone.datetime([2011, 0, 13]).format("DDDo"), "13mh", "13mh");
        assert.equal(adone.datetime([2011, 0, 14]).format("DDDo"), "14mh", "14mh");
        assert.equal(adone.datetime([2011, 0, 15]).format("DDDo"), "15mh", "15mh");
        assert.equal(adone.datetime([2011, 0, 16]).format("DDDo"), "16mh", "16mh");
        assert.equal(adone.datetime([2011, 0, 17]).format("DDDo"), "17mh", "17mh");
        assert.equal(adone.datetime([2011, 0, 18]).format("DDDo"), "18mh", "18mh");
        assert.equal(adone.datetime([2011, 0, 19]).format("DDDo"), "19mh", "19mh");
        assert.equal(adone.datetime([2011, 0, 20]).format("DDDo"), "20mh", "20mh");
        assert.equal(adone.datetime([2011, 0, 21]).format("DDDo"), "21mh", "21mh");
        assert.equal(adone.datetime([2011, 0, 22]).format("DDDo"), "22na", "22na");
        assert.equal(adone.datetime([2011, 0, 23]).format("DDDo"), "23mh", "23mh");
        assert.equal(adone.datetime([2011, 0, 24]).format("DDDo"), "24mh", "24mh");
        assert.equal(adone.datetime([2011, 0, 25]).format("DDDo"), "25mh", "25mh");
        assert.equal(adone.datetime([2011, 0, 26]).format("DDDo"), "26mh", "26mh");
        assert.equal(adone.datetime([2011, 0, 27]).format("DDDo"), "27mh", "27mh");
        assert.equal(adone.datetime([2011, 0, 28]).format("DDDo"), "28mh", "28mh");
        assert.equal(adone.datetime([2011, 0, 29]).format("DDDo"), "29mh", "29mh");
        assert.equal(adone.datetime([2011, 0, 30]).format("DDDo"), "30mh", "30mh");
        assert.equal(adone.datetime([2011, 0, 31]).format("DDDo"), "31mh", "31mh");
    });

    it("format month", () => {
        const expected = months;
        for (let i = 0; i < expected.length; i++) {
            assert.equal(adone.datetime([2011, i, 1]).format("MMMM,MMM"), expected[i], expected[i]);
        }
    });

    it("format week", () => {
        const expected = ["Didòmhnaich Did Dò", "Diluain Dil Lu", "Dimàirt Dim Mà", "Diciadain Dic Ci", "Diardaoin Dia Ar", "Dihaoine Dih Ha", "Disathairne Dis Sa"];
        for (let i = 0; i < expected.length; i++) {
            assert.equal(adone.datetime([2011, 0, 2 + i]).format("dddd ddd dd"), expected[i], expected[i]);
        }
    });

    it("from", () => {
        const start = adone.datetime([2007, 1, 28]);
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            s: 44
        }), true), "beagan diogan", "44 seconds = a few seconds");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            s: 45
        }), true), "mionaid", "45 seconds = a minute");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            s: 89
        }), true), "mionaid", "89 seconds = a minute");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            s: 90
        }), true), "2 mionaidean", "90 seconds = 2 minutes");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            m: 44
        }), true), "44 mionaidean", "44 minutes = 44 minutes");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            m: 45
        }), true), "uair", "45 minutes = an hour");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            m: 89
        }), true), "uair", "89 minutes = an hour");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            m: 90
        }), true), "2 uairean", "90 minutes = 2 hours");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            h: 5
        }), true), "5 uairean", "5 hours = 5 hours");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            h: 21
        }), true), "21 uairean", "21 hours = 21 hours");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            h: 22
        }), true), "latha", "22 hours = a day");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            h: 35
        }), true), "latha", "35 hours = a day");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            h: 36
        }), true), "2 latha", "36 hours = 2 days");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 1
        }), true), "latha", "1 day = a day");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 5
        }), true), "5 latha", "5 days = 5 days");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 25
        }), true), "25 latha", "25 days = 25 days");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 26
        }), true), "mìos", "26 days = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 30
        }), true), "mìos", "30 days = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 43
        }), true), "mìos", "43 days = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 46
        }), true), "2 mìosan", "46 days = 2 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 74
        }), true), "2 mìosan", "75 days = 2 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 76
        }), true), "3 mìosan", "76 days = 3 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            M: 1
        }), true), "mìos", "1 month = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            M: 5
        }), true), "5 mìosan", "5 months = 5 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 345
        }), true), "bliadhna", "345 days = a year");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 548
        }), true), "2 bliadhna", "548 days = 2 years");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            y: 1
        }), true), "bliadhna", "1 year = a year");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            y: 5
        }), true), "5 bliadhna", "5 years = 5 years");
    });

    it("suffix", () => {
        assert.equal(adone.datetime(30000).from(0), "ann an beagan diogan", "prefix");
        assert.equal(adone.datetime(0).from(30000), "bho chionn beagan diogan", "suffix");
    });

    it("now from now", () => {
        assert.equal(adone.datetime().fromNow(), "bho chionn beagan diogan", "now from now should display as in the past");
    });

    it("fromNow", () => {
        assert.equal(adone.datetime().add({
            s: 30
        }).fromNow(), "ann an beagan diogan", "in a few seconds");
        assert.equal(adone.datetime().add({
            d: 5
        }).fromNow(), "ann an 5 latha", "in 5 days");
    });

    it("calendar day", () => {
        const a = adone.datetime().hours(12).minutes(0).seconds(0);

        assert.equal(adone.datetime(a).calendar(), "An-diugh aig 12:00", "today at the same time");
        assert.equal(adone.datetime(a).add({
            m: 25
        }).calendar(), "An-diugh aig 12:25", "Now plus 25 min");
        assert.equal(adone.datetime(a).add({
            h: 1
        }).calendar(), "An-diugh aig 13:00", "Now plus 1 hour");
        assert.equal(adone.datetime(a).add({
            d: 1
        }).calendar(), "A-màireach aig 12:00", "tomorrow at the same time");
        assert.equal(adone.datetime(a).subtract({
            h: 1
        }).calendar(), "An-diugh aig 11:00", "Now minus 1 hour");
        assert.equal(adone.datetime(a).subtract({
            d: 1
        }).calendar(), "An-dè aig 12:00", "yesterday at the same time");
    });

    it("calendar next week", () => {
        let i;
        let m;

        for (i = 2; i < 7; i++) {
            m = adone.datetime().add({
                d: i
            });
            assert.equal(m.calendar(), m.format("dddd [aig] LT"), `Today + ${i} days current time`);
            m.hours(0).minutes(0).seconds(0).milliseconds(0);
            assert.equal(m.calendar(), m.format("dddd [aig] LT"), `Today + ${i} days beginning of day`);
            m.hours(23).minutes(59).seconds(59).milliseconds(999);
            assert.equal(m.calendar(), m.format("dddd [aig] LT"), `Today + ${i} days end of day`);
        }
    });

    it("calendar last week", () => {
        let i;
        let m;

        for (i = 2; i < 7; i++) {
            m = adone.datetime().subtract({
                d: i
            });
            assert.equal(m.calendar(), m.format("dddd [seo chaidh] [aig] LT"), `Today - ${i} days current time`);
            m.hours(0).minutes(0).seconds(0).milliseconds(0);
            assert.equal(m.calendar(), m.format("dddd [seo chaidh] [aig] LT"), `Today - ${i} days beginning of day`);
            m.hours(23).minutes(59).seconds(59).milliseconds(999);
            assert.equal(m.calendar(), m.format("dddd [seo chaidh] [aig] LT"), `Today - ${i} days end of day`);
        }
    });

    it("calendar all else", () => {
        let weeksAgo = adone.datetime().subtract({
            w: 1
        });
        let weeksFromNow = adone.datetime().add({
            w: 1
        });

        assert.equal(weeksAgo.calendar(), weeksAgo.format("L"), "1 week ago");
        assert.equal(weeksFromNow.calendar(), weeksFromNow.format("L"), "in 1 week");

        weeksAgo = adone.datetime().subtract({
            w: 2
        });
        weeksFromNow = adone.datetime().add({
            w: 2
        });

        assert.equal(weeksAgo.calendar(), weeksAgo.format("L"), "2 weeks ago");
        assert.equal(weeksFromNow.calendar(), weeksFromNow.format("L"), "in 2 weeks");
    });

    it("weeks year starting sunday formatted", () => {
        assert.equal(adone.datetime([2012, 0, 1]).format("w ww wo"), "52 52 52na", "Faoi  1 2012 should be week 52");
        assert.equal(adone.datetime([2012, 0, 2]).format("w ww wo"), "1 01 1d", "Faoi  2 2012 should be week 1");
        assert.equal(adone.datetime([2012, 0, 8]).format("w ww wo"), "1 01 1d", "Faoi  8 2012 should be week 1");
        assert.equal(adone.datetime([2012, 0, 9]).format("w ww wo"), "2 02 2na", "Faoi  9 2012 should be week 2");
        assert.equal(adone.datetime([2012, 0, 15]).format("w ww wo"), "2 02 2na", "Faoi 15 2012 should be week 2");
    });
});
