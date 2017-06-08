import commonLocaleTests from "../helpers/common-locale";
describe("datetime", "locale", "sd", () => {
    commonLocaleTests("sd");

    before(() => {
        adone.datetime.locale("sd");
    });

    after(() => {
        adone.datetime.locale("en");
    });

    const months = [
        "جنوري",
        "فيبروري",
        "مارچ",
        "اپريل",
        "مئي",
        "جون",
        "جولاءِ",
        "آگسٽ",
        "سيپٽمبر",
        "آڪٽوبر",
        "نومبر",
        "ڊسمبر"
    ];
    const days = [
        "آچر",
        "سومر",
        "اڱارو",
        "اربع",
        "خميس",
        "جمع",
        "ڇنڇر"
    ];

    it("parse", () => {
        function equalTest(input, mmm, i) {
            assert.equal(adone.datetime(input, mmm).month(), i, `${input} should be month ${i + 1}`);
        }
        for (let i = 0; i < 12; i++) {
            equalTest(months[i], "MMM", i);
            equalTest(months[i], "MMMM", i);
        }
    });

    it("format", () => {
        let a = [
                ["dddd, MMMM Do YYYY, h:mm:ss a", "آچر، فيبروري 14 2010، 3:25:50 شام"],
                ["ddd, hA", "آچر، 3شام"],
                ["M Mo MM MMMM MMM", "2 2 02 فيبروري فيبروري"],
                ["YYYY YY", "2010 10"],
                ["D Do DD", "14 14 14"],
                ["d do dddd ddd dd", "0 0 آچر آچر آچر"],
                ["DDD DDDo DDDD", "45 45 045"],
                ["w wo ww", "6 6 06"],
                ["h hh", "3 03"],
                ["H HH", "15 15"],
                ["m mm", "25 25"],
                ["s ss", "50 50"],
                ["a A", "شام شام"],
                ["[سال جو] DDDo[ڏينهن]", "سال جو 45ڏينهن"],
                ["LTS", "15:25:50"],
                ["L", "14/02/2010"],
                ["LL", "14 فيبروري 2010"],
                ["LLL", "14 فيبروري 2010 15:25"],
                ["LLLL", "آچر، 14 فيبروري 2010 15:25"],
                ["l", "14/2/2010"],
                ["ll", "14 فيبروري 2010"],
                ["lll", "14 فيبروري 2010 15:25"],
                ["llll", "آچر، 14 فيبروري 2010 15:25"]
            ],
            b = adone.datetime(new Date(2010, 1, 14, 15, 25, 50, 125)),
            i;
        for (i = 0; i < a.length; i++) {
            assert.equal(b.format(a[i][0]), a[i][1], `${a[i][0]} ---> ${a[i][1]}`);
        }
    });

    it("format ordinal", () => {
        assert.equal(adone.datetime([2011, 0, 1]).format("DDDo"), "1", "1");
        assert.equal(adone.datetime([2011, 0, 2]).format("DDDo"), "2", "2");
        assert.equal(adone.datetime([2011, 0, 3]).format("DDDo"), "3", "3");
        assert.equal(adone.datetime([2011, 0, 4]).format("DDDo"), "4", "4");
        assert.equal(adone.datetime([2011, 0, 5]).format("DDDo"), "5", "5");
        assert.equal(adone.datetime([2011, 0, 6]).format("DDDo"), "6", "6");
        assert.equal(adone.datetime([2011, 0, 7]).format("DDDo"), "7", "7");
        assert.equal(adone.datetime([2011, 0, 8]).format("DDDo"), "8", "8");
        assert.equal(adone.datetime([2011, 0, 9]).format("DDDo"), "9", "9");
        assert.equal(adone.datetime([2011, 0, 10]).format("DDDo"), "10", "10");

        assert.equal(adone.datetime([2011, 0, 11]).format("DDDo"), "11", "11");
        assert.equal(adone.datetime([2011, 0, 12]).format("DDDo"), "12", "12");
        assert.equal(adone.datetime([2011, 0, 13]).format("DDDo"), "13", "13");
        assert.equal(adone.datetime([2011, 0, 14]).format("DDDo"), "14", "14");
        assert.equal(adone.datetime([2011, 0, 15]).format("DDDo"), "15", "15");
        assert.equal(adone.datetime([2011, 0, 16]).format("DDDo"), "16", "16");
        assert.equal(adone.datetime([2011, 0, 17]).format("DDDo"), "17", "17");
        assert.equal(adone.datetime([2011, 0, 18]).format("DDDo"), "18", "18");
        assert.equal(adone.datetime([2011, 0, 19]).format("DDDo"), "19", "19");
        assert.equal(adone.datetime([2011, 0, 20]).format("DDDo"), "20", "20");

        assert.equal(adone.datetime([2011, 0, 21]).format("DDDo"), "21", "21");
        assert.equal(adone.datetime([2011, 0, 22]).format("DDDo"), "22", "22");
        assert.equal(adone.datetime([2011, 0, 23]).format("DDDo"), "23", "23");
        assert.equal(adone.datetime([2011, 0, 24]).format("DDDo"), "24", "24");
        assert.equal(adone.datetime([2011, 0, 25]).format("DDDo"), "25", "25");
        assert.equal(adone.datetime([2011, 0, 26]).format("DDDo"), "26", "26");
        assert.equal(adone.datetime([2011, 0, 27]).format("DDDo"), "27", "27");
        assert.equal(adone.datetime([2011, 0, 28]).format("DDDo"), "28", "28");
        assert.equal(adone.datetime([2011, 0, 29]).format("DDDo"), "29", "29");
        assert.equal(adone.datetime([2011, 0, 30]).format("DDDo"), "30", "30");

        assert.equal(adone.datetime([2011, 0, 31]).format("DDDo"), "31", "31");
    });

    it("format month", () => {
        for (let i = 0; i < months.length; i++) {
            assert.equal(adone.datetime([2011, i, 1]).format("MMMM MMM"), `${months[i]} ${months[i]}`, `${months[i]} ${months[i]}`);
        }
    });

    it("format week", () => {
        for (let i = 0; i < days.length; i++) {
            assert.equal(adone.datetime([2011, 0, 2 + i]).format("dddd ddd dd"), `${days[i]} ${days[i]} ${days[i]}`, `${days[i]} ${days[i]} ${days[i]}`);
        }
    });

    it("from", () => {
        const start = adone.datetime([2007, 1, 28]);
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ s: 44 }), true), "چند سيڪنڊ", "44 seconds = چند سيڪنڊ");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ s: 45 }), true), "هڪ منٽ", "45 seconds = هڪ منٽ");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ s: 89 }), true), "هڪ منٽ", "89 seconds = هڪ منٽ");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ s: 90 }), true), "2 منٽ", "90 seconds = 2 منٽ");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ m: 44 }), true), "44 منٽ", "44 minutes = 44 منٽ");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ m: 45 }), true), "هڪ ڪلاڪ", "45 minutes = هڪ ڪلاڪ");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ m: 89 }), true), "هڪ ڪلاڪ", "89 minutes = هڪ ڪلاڪ");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ m: 90 }), true), "2 ڪلاڪ", "90 minutes = 2 ڪلاڪ");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ h: 5 }), true), "5 ڪلاڪ", "5 hours = 5 ڪلاڪ");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ h: 21 }), true), "21 ڪلاڪ", "21 hours = 21 ڪلاڪ");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ h: 22 }), true), "هڪ ڏينهن", "22 hours = هڪ ڏينهن");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ h: 35 }), true), "هڪ ڏينهن", "35 hours = هڪ ڏينهن");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ h: 36 }), true), "2 ڏينهن", "36 hours = 2 ڏينهن");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 1 }), true), "هڪ ڏينهن", "1 day = هڪ ڏينهن");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 5 }), true), "5 ڏينهن", "5 days = 5 ڏينهن");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 25 }), true), "25 ڏينهن", "25 days = 25 ڏينهن");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 26 }), true), "هڪ مهينو", "26 days = هڪ مهينو");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 30 }), true), "هڪ مهينو", "30 days = هڪ مهينو");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 43 }), true), "هڪ مهينو", "43 days = هڪ مهينو");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 46 }), true), "2 مهينا", "46 days = 2 مهينا");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 74 }), true), "2 مهينا", "75 days = 2 مهينا");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 76 }), true), "3 مهينا", "76 days = 3 مهينا");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ M: 1 }), true), "هڪ مهينو", "1 month = هڪ مهينو");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ M: 5 }), true), "5 مهينا", "5 months = 5 مهينا");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 345 }), true), "هڪ سال", "345 days = هڪ سال");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 548 }), true), "2 سال", "548 days = 2 سال");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ y: 1 }), true), "هڪ سال", "1 year = هڪ سال");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ y: 5 }), true), "5 سال", "5 years = 5 سال");
    });

    it("suffix", () => {
        assert.equal(adone.datetime(30000).from(0), "چند سيڪنڊ پوء", "prefix");
        assert.equal(adone.datetime(0).from(30000), "چند سيڪنڊ اڳ", "suffix");
    });

    it("now from now", () => {
        assert.equal(adone.datetime().fromNow(), "چند سيڪنڊ اڳ", "now from now should display as in the past");
    });

    it("fromNow", () => {
        assert.equal(adone.datetime().add({ s: 30 }).fromNow(), "چند سيڪنڊ پوء", "in a few seconds");
        assert.equal(adone.datetime().add({ d: 5 }).fromNow(), "5 ڏينهن پوء", "in 5 days");
    });

    it("calendar day", () => {
        const a = adone.datetime().hours(12).minutes(0).seconds(0);

        assert.equal(adone.datetime(a).calendar(), "اڄ 12:00", "today at the same time");
        assert.equal(adone.datetime(a).add({ m: 25 }).calendar(), "اڄ 12:25", "Now plus 25 min");
        assert.equal(adone.datetime(a).add({ h: 1 }).calendar(), "اڄ 13:00", "Now plus 1 hour");
        assert.equal(adone.datetime(a).add({ d: 1 }).calendar(), "سڀاڻي 12:00", "tomorrow at the same time");
        assert.equal(adone.datetime(a).subtract({ h: 1 }).calendar(), "اڄ 11:00", "Now minus 1 hour");
        assert.equal(adone.datetime(a).subtract({ d: 1 }).calendar(), "ڪالهه 12:00", "yesterday at the same time");
    });

    it("calendar next week", () => {
        let i, m;
        for (i = 2; i < 7; i++) {
            m = adone.datetime().add({ d: i });
            assert.equal(m.calendar(), m.format("dddd [اڳين هفتي تي] LT"), `Today + ${i} days current time`);
            m.hours(0).minutes(0).seconds(0).milliseconds(0);
            assert.equal(m.calendar(), m.format("dddd [اڳين هفتي تي] LT"), `Today + ${i} days beginning of day`);
            m.hours(23).minutes(59).seconds(59).milliseconds(999);
            assert.equal(m.calendar(), m.format("dddd [اڳين هفتي تي] LT"), `Today + ${i} days end of day`);
        }
    });

    it("calendar last week", () => {
        let i, m;
        for (i = 2; i < 7; i++) {
            m = adone.datetime().subtract({ d: i });
            assert.equal(m.calendar(), m.format("[گزريل هفتي] dddd [تي] LT"), `Today - ${i} days current time`);
            m.hours(0).minutes(0).seconds(0).milliseconds(0);
            assert.equal(m.calendar(), m.format("[گزريل هفتي] dddd [تي] LT"), `Today - ${i} days beginning of day`);
            m.hours(23).minutes(59).seconds(59).milliseconds(999);
            assert.equal(m.calendar(), m.format("[گزريل هفتي] dddd [تي] LT"), `Today - ${i} days end of day`);
        }
    });

    it("calendar all else", () => {
        let weeksAgo = adone.datetime().subtract({ w: 1 }),
            weeksFromNow = adone.datetime().add({ w: 1 });

        assert.equal(weeksAgo.calendar(), weeksAgo.format("L"), "1 week ago");
        assert.equal(weeksFromNow.calendar(), weeksFromNow.format("L"), "in 1 week");

        weeksAgo = adone.datetime().subtract({ w: 2 });
        weeksFromNow = adone.datetime().add({ w: 2 });

        assert.equal(weeksAgo.calendar(), weeksAgo.format("L"), "2 weeks ago");
        assert.equal(weeksFromNow.calendar(), weeksFromNow.format("L"), "in 2 weeks");
    });

    it("weeks year starting sunday formatted", () => {
        assert.equal(adone.datetime([2012, 0, 1]).format("w ww wo"), "52 52 52", "Jan  1 2012 should be week 52");
        assert.equal(adone.datetime([2012, 0, 2]).format("w ww wo"), "1 01 1", "Jan  2 2012 should be week 1");
        assert.equal(adone.datetime([2012, 0, 8]).format("w ww wo"), "1 01 1", "Jan  8 2012 should be week 1");
        assert.equal(adone.datetime([2012, 0, 9]).format("w ww wo"), "2 02 2", "Jan  9 2012 should be week 2");
        assert.equal(adone.datetime([2012, 0, 15]).format("w ww wo"), "2 02 2", "Jan 15 2012 should be week 2");
    });
});
