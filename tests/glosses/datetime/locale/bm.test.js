import commonLocaleTests from "../helpers/common-locale";
describe("datetime", "locale", "bm", () => {
    commonLocaleTests("bm");

    before(() => {
        adone.datetime.locale("bm");
    });

    after(() => {
        adone.datetime.locale("en");
    });

    it("parse", () => {
        let i,
            tests = "Zanwuyekalo Zan_Fewuruyekalo Few_Marisikalo Mar_Awirilikalo Awi_Mɛkalo Mɛ_Zuwɛnkalo Zuw_Zuluyekalo Zul_Utikalo Uti_Sɛtanburukalo Sɛt_ɔkutɔburukalo ɔku_Nowanburukalo Now_Desanburukalo Des".split("_");

        function equalTest(input, mmm, i) {
            assert.equal(adone.datetime(input, mmm).month(), i, `${input} should be month ${i + 1}`);
        }

        for (i = 0; i < 12; i++) {
            tests[i] = tests[i].split(" ");
            equalTest(tests[i][0], "MMM", i);
            equalTest(tests[i][1], "MMM", i);
            equalTest(tests[i][0], "MMMM", i);
            equalTest(tests[i][1], "MMMM", i);
            equalTest(tests[i][0].toLocaleLowerCase(), "MMMM", i);
            equalTest(tests[i][1].toLocaleLowerCase(), "MMMM", i);
            equalTest(tests[i][0].toLocaleUpperCase(), "MMMM", i);
            equalTest(tests[i][1].toLocaleUpperCase(), "MMMM", i);
        }
    });

    it("format", () => {
        let a = [
                ["dddd, MMMM Do YYYY, h:mm:ss a", "Kari, Fewuruyekalo 14 2010, 3:25:50 pm"],
                ["ddd, hA", "Kar, 3PM"],
                ["M Mo MM MMMM MMM", "2 2 02 Fewuruyekalo Few"],
                ["YYYY YY", "2010 10"],
                ["D Do DD", "14 14 14"],
                ["d do dddd ddd dd", "0 0 Kari Kar Ka"],
                ["DDD DDDo DDDD", "45 45 045"],
                ["w wo ww", "6 6 06"],
                ["h hh", "3 03"],
                ["H HH", "15 15"],
                ["m mm", "25 25"],
                ["s ss", "50 50"],
                ["a A", "pm PM"],
                ["[le] Do [jour du mois]", "le 14 jour du mois"],
                ["[le] DDDo [jour de l’année]", "le 45 jour de l’année"],
                ["LTS", "15:25:50"],
                ["L", "14/02/2010"],
                ["LL", "Fewuruyekalo tile 14 san 2010"],
                ["LLL", "Fewuruyekalo tile 14 san 2010 lɛrɛ 15:25"],
                ["LLLL", "Kari Fewuruyekalo tile 14 san 2010 lɛrɛ 15:25"],
                ["l", "14/2/2010"],
                ["ll", "Few tile 14 san 2010"],
                ["lll", "Few tile 14 san 2010 lɛrɛ 15:25"],
                ["llll", "Kar Few tile 14 san 2010 lɛrɛ 15:25"]
            ],
            b = adone.datetime(new Date(2010, 1, 14, 15, 25, 50, 125)),
            i;

        for (i = 0; i < a.length; i++) {
            assert.equal(b.format(a[i][0]), a[i][1], `${a[i][0]} ---> ${a[i][1]}`);
        }
    });

    it("format month", () => {
        let i,
            expected = "Zanwuyekalo Zan_Fewuruyekalo Few_Marisikalo Mar_Awirilikalo Awi_Mɛkalo Mɛ_Zuwɛnkalo Zuw_Zuluyekalo Zul_Utikalo Uti_Sɛtanburukalo Sɛt_ɔkutɔburukalo ɔku_Nowanburukalo Now_Desanburukalo Des".split("_");

        for (i = 0; i < expected.length; i++) {
            assert.equal(adone.datetime([2011, i, 1]).format("MMMM MMM"), expected[i], expected[i]);
        }
    });

    it("format week", () => {
        let i,
            expected = "Kari Kar Ka_Ntɛnɛn Ntɛ Nt_Tarata Tar Ta_Araba Ara Ar_Alamisa Ala Al_Juma Jum Ju_Sibiri Sib Si".split("_");

        for (i = 0; i < expected.length; i++) {
            assert.equal(adone.datetime([2011, 0, 2 + i]).format("dddd ddd dd"), expected[i], expected[i]);
        }
    });

    it("from", () => {
        const start = adone.datetime([2007, 1, 28]);

        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ s: 44 }), true), "sanga dama dama", "44 seconds = a few seconds");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ s: 45 }), true), "miniti kelen", "45 seconds = a minute");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ s: 89 }), true), "miniti kelen", "89 seconds = a minute");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ s: 90 }), true), "miniti 2", "90 seconds = 2 minutes");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ m: 44 }), true), "miniti 44", "44 minutes = 44 minutes");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ m: 45 }), true), "lɛrɛ kelen", "45 minutes = an hour");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ m: 89 }), true), "lɛrɛ kelen", "89 minutes = an hour");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ m: 90 }), true), "lɛrɛ 2", "90 minutes = 2 hours");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ h: 5 }), true), "lɛrɛ 5", "5 hours = 5 hours");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ h: 21 }), true), "lɛrɛ 21", "21 hours = 21 hours");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ h: 22 }), true), "tile kelen", "22 hours = a day");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ h: 35 }), true), "tile kelen", "35 hours = a day");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ h: 36 }), true), "tile 2", "36 hours = 2 days");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 1 }), true), "tile kelen", "1 day = a day");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 5 }), true), "tile 5", "5 days = 5 days");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 25 }), true), "tile 25", "25 days = 25 days");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 26 }), true), "kalo kelen", "26 days = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 30 }), true), "kalo kelen", "30 days = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 43 }), true), "kalo kelen", "43 days = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 46 }), true), "kalo 2", "46 days = 2 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 74 }), true), "kalo 2", "75 days = 2 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 76 }), true), "kalo 3", "76 days = 3 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ M: 1 }), true), "kalo kelen", "1 month = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ M: 5 }), true), "kalo 5", "5 months = 5 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 345 }), true), "san kelen", "345 days = a year");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ d: 548 }), true), "san 2", "548 days = 2 years");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ y: 1 }), true), "san kelen", "1 year = a year");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ y: 5 }), true), "san 5", "5 years = 5 years");
    });

    it("suffix", () => {
        assert.equal(adone.datetime(30000).from(0), "sanga dama dama kɔnɔ", "prefix");
        assert.equal(adone.datetime(0).from(30000), "a bɛ sanga dama dama bɔ", "suffix");
    });

    it("fromNow", () => {
        assert.equal(adone.datetime().add({ s: 30 }).fromNow(), "sanga dama dama kɔnɔ", "in a few seconds");
        assert.equal(adone.datetime().add({ d: 5 }).fromNow(), "tile 5 kɔnɔ", "in 5 days");
    });

    it("same day", () => {
        const a = adone.datetime().hours(12).minutes(0).seconds(0);

        assert.equal(adone.datetime(a).calendar(), "Bi lɛrɛ 12:00", "Today at the same time");
        assert.equal(adone.datetime(a).add({ m: 25 }).calendar(), "Bi lɛrɛ 12:25", "Now plus 25 min");
        assert.equal(adone.datetime(a).add({ h: 1 }).calendar(), "Bi lɛrɛ 13:00", "Now plus 1 hour");
        assert.equal(adone.datetime(a).add({ d: 1 }).calendar(), "Sini lɛrɛ 12:00", "Tomorrow at the same time");
        assert.equal(adone.datetime(a).subtract({ h: 1 }).calendar(), "Bi lɛrɛ 11:00", "Now minus 1 hour");
        assert.equal(adone.datetime(a).subtract({ d: 1 }).calendar(), "Kunu lɛrɛ 12:00", "Yesterday at the same time");
    });

    it("same next week", () => {
        let i, m;

        for (i = 2; i < 7; i++) {
            m = adone.datetime().add({ d: i });
            assert.equal(m.calendar(), m.format("dddd [don lɛrɛ] LT"), `Today + ${i} days current time`);
            m.hours(0).minutes(0).seconds(0).milliseconds(0);
            assert.equal(m.calendar(), m.format("dddd [don lɛrɛ] LT"), `Today + ${i} days beginning of day`);
            m.hours(23).minutes(59).seconds(59).milliseconds(999);
            assert.equal(m.calendar(), m.format("dddd [don lɛrɛ] LT"), `Today + ${i} days end of day`);
        }
    });

    it("same last week", () => {
        let i, m;

        for (i = 2; i < 7; i++) {
            m = adone.datetime().subtract({ d: i });
            assert.equal(m.calendar(), m.format("dddd [tɛmɛnen lɛrɛ] LT"), `Today - ${i} days current time`);
            m.hours(0).minutes(0).seconds(0).milliseconds(0);
            assert.equal(m.calendar(), m.format("dddd [tɛmɛnen lɛrɛ] LT"), `Today - ${i} days beginning of day`);
            m.hours(23).minutes(59).seconds(59).milliseconds(999);
            assert.equal(m.calendar(), m.format("dddd [tɛmɛnen lɛrɛ] LT"), `Today - ${i} days end of day`);
        }
    });

    it("same all else", () => {
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