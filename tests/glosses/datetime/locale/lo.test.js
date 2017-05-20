import commonLocaleTests from "../helpers/common-locale";
describe("lo", () => {
    commonLocaleTests("lo");

    beforeEach(() => {
        adone.datetime.locale("lo");
    });

    it("parse", () => {
        const tests = "ມັງກອນ ມັງກອນ_ກຸມພາ ກຸມພາ_ມີນາ ມີນາ_ເມສາ ເມສາ_ພຶດສະພາ ພຶດສະພາ_ມິຖຸນາ ມິຖຸນາ_ກໍລະກົດ ກໍລະກົດ_ສິງຫາ ສິງຫາ_ກັນຍາ ກັນຍາ_ຕຸລາ ຕຸລາ_ພະຈິກ ພະຈິກ_ທັນວາ ທັນວາ".split("_");
        let i;

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
        const a = [
            ["dddd, MMMM Do YYYY, h:mm:ss a", "ອາທິດ, ກຸມພາ ທີ່14 2010, 3:25:50 ຕອນແລງ"],
            ["ddd, hA", "ທິດ, 3ຕອນແລງ"],
            ["M Mo MM MMMM MMM", "2 ທີ່2 02 ກຸມພາ ກຸມພາ"],
            ["YYYY YY", "2010 10"],
            ["D Do DD", "14 ທີ່14 14"],
            ["d do dddd ddd dd", "0 ທີ່0 ອາທິດ ທິດ ທ"],
            ["DDD DDDo DDDD", "45 ທີ່45 045"],
            ["w wo ww", "8 ທີ່8 08"],
            ["h hh", "3 03"],
            ["H HH", "15 15"],
            ["m mm", "25 25"],
            ["s ss", "50 50"],
            ["a A", "ຕອນແລງ ຕອນແລງ"],
            ["[ວັນ]DDDo [ຂອງປີ]", "ວັນທີ່45 ຂອງປີ"],
            ["LTS", "15:25:50"],
            ["L", "14/02/2010"],
            ["LL", "14 ກຸມພາ 2010"],
            ["LLL", "14 ກຸມພາ 2010 15:25"],
            ["LLLL", "ວັນອາທິດ 14 ກຸມພາ 2010 15:25"],
            ["l", "14/2/2010"],
            ["ll", "14 ກຸມພາ 2010"],
            ["lll", "14 ກຸມພາ 2010 15:25"],
            ["llll", "ວັນທິດ 14 ກຸມພາ 2010 15:25"]
        ];
        const b = adone.datetime(new Date(2010, 1, 14, 15, 25, 50, 125));
        let i;

        for (i = 0; i < a.length; i++) {
            assert.equal(b.format(a[i][0]), a[i][1], `${a[i][0]} ---> ${a[i][1]}`);
        }
    });

    it("format ordinal", () => {
        assert.equal(adone.datetime([2011, 0, 1]).format("DDDo"), "ທີ່1", "ທີ່1");
        assert.equal(adone.datetime([2011, 0, 2]).format("DDDo"), "ທີ່2", "ທີ່2");
        assert.equal(adone.datetime([2011, 0, 3]).format("DDDo"), "ທີ່3", "ທີ່3");
        assert.equal(adone.datetime([2011, 0, 4]).format("DDDo"), "ທີ່4", "ທີ່4");
        assert.equal(adone.datetime([2011, 0, 5]).format("DDDo"), "ທີ່5", "ທີ່5");
        assert.equal(adone.datetime([2011, 0, 6]).format("DDDo"), "ທີ່6", "ທີ່6");
        assert.equal(adone.datetime([2011, 0, 7]).format("DDDo"), "ທີ່7", "ທີ່7");
        assert.equal(adone.datetime([2011, 0, 8]).format("DDDo"), "ທີ່8", "ທີ່8");
        assert.equal(adone.datetime([2011, 0, 9]).format("DDDo"), "ທີ່9", "ທີ່9");
        assert.equal(adone.datetime([2011, 0, 10]).format("DDDo"), "ທີ່10", "ທີ່10");

        assert.equal(adone.datetime([2011, 0, 11]).format("DDDo"), "ທີ່11", "ທີ່11");
        assert.equal(adone.datetime([2011, 0, 12]).format("DDDo"), "ທີ່12", "ທີ່12");
        assert.equal(adone.datetime([2011, 0, 13]).format("DDDo"), "ທີ່13", "ທີ່13");
        assert.equal(adone.datetime([2011, 0, 14]).format("DDDo"), "ທີ່14", "ທີ່14");
        assert.equal(adone.datetime([2011, 0, 15]).format("DDDo"), "ທີ່15", "ທີ່15");
        assert.equal(adone.datetime([2011, 0, 16]).format("DDDo"), "ທີ່16", "ທີ່16");
        assert.equal(adone.datetime([2011, 0, 17]).format("DDDo"), "ທີ່17", "ທີ່17");
        assert.equal(adone.datetime([2011, 0, 18]).format("DDDo"), "ທີ່18", "ທີ່18");
        assert.equal(adone.datetime([2011, 0, 19]).format("DDDo"), "ທີ່19", "ທີ່19");
        assert.equal(adone.datetime([2011, 0, 20]).format("DDDo"), "ທີ່20", "ທີ່20");

        assert.equal(adone.datetime([2011, 0, 21]).format("DDDo"), "ທີ່21", "ທີ່21");
        assert.equal(adone.datetime([2011, 0, 22]).format("DDDo"), "ທີ່22", "ທີ່22");
        assert.equal(adone.datetime([2011, 0, 23]).format("DDDo"), "ທີ່23", "ທີ່23");
        assert.equal(adone.datetime([2011, 0, 24]).format("DDDo"), "ທີ່24", "ທີ່24");
        assert.equal(adone.datetime([2011, 0, 25]).format("DDDo"), "ທີ່25", "ທີ່25");
        assert.equal(adone.datetime([2011, 0, 26]).format("DDDo"), "ທີ່26", "ທີ່26");
        assert.equal(adone.datetime([2011, 0, 27]).format("DDDo"), "ທີ່27", "ທີ່27");
        assert.equal(adone.datetime([2011, 0, 28]).format("DDDo"), "ທີ່28", "ທີ່28");
        assert.equal(adone.datetime([2011, 0, 29]).format("DDDo"), "ທີ່29", "ທີ່29");
        assert.equal(adone.datetime([2011, 0, 30]).format("DDDo"), "ທີ່30", "ທີ່30");

        assert.equal(adone.datetime([2011, 0, 31]).format("DDDo"), "ທີ່31", "ທີ່31");
    });

    it("format month", () => {
        const expected = "ມັງກອນ ມັງກອນ_ກຸມພາ ກຸມພາ_ມີນາ ມີນາ_ເມສາ ເມສາ_ພຶດສະພາ ພຶດສະພາ_ມິຖຸນາ ມິຖຸນາ_ກໍລະກົດ ກໍລະກົດ_ສິງຫາ ສິງຫາ_ກັນຍາ ກັນຍາ_ຕຸລາ ຕຸລາ_ພະຈິກ ພະຈິກ_ທັນວາ ທັນວາ".split("_");
        let i;

        for (i = 0; i < expected.length; i++) {
            assert.equal(adone.datetime([2011, i, 1]).format("MMMM MMM"), expected[i], expected[i]);
        }
    });

    it("format week", () => {
        const expected = "ອາທິດ ທິດ ທ_ຈັນ ຈັນ ຈ_ອັງຄານ ອັງຄານ ອຄ_ພຸດ ພຸດ ພ_ພະຫັດ ພະຫັດ ພຫ_ສຸກ ສຸກ ສກ_ເສົາ ເສົາ ສ".split("_");
        let i;

        for (i = 0; i < expected.length; i++) {
            assert.equal(adone.datetime([2011, 0, 2 + i]).format("dddd ddd dd"), expected[i], expected[i]);
        }
    });

    it("from", () => {
        const start = adone.datetime([2007, 1, 28]);
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            s: 44
        }), true), "ບໍ່ເທົ່າໃດວິນາທີ", "44 seconds = a few seconds");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            s: 45
        }), true), "1 ນາທີ", "45 seconds = a minute");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            s: 89
        }), true), "1 ນາທີ", "89 seconds = a minute");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            s: 90
        }), true), "2 ນາທີ", "90 seconds = 2 minutes");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            m: 44
        }), true), "44 ນາທີ", "44 minutes = 44 minutes");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            m: 45
        }), true), "1 ຊົ່ວໂມງ", "45 minutes = an hour");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            m: 89
        }), true), "1 ຊົ່ວໂມງ", "89 minutes = an hour");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            m: 90
        }), true), "2 ຊົ່ວໂມງ", "90 minutes = 2 hours");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            h: 5
        }), true), "5 ຊົ່ວໂມງ", "5 hours = 5 hours");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            h: 21
        }), true), "21 ຊົ່ວໂມງ", "21 hours = 21 hours");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            h: 22
        }), true), "1 ມື້", "22 hours = a day");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            h: 35
        }), true), "1 ມື້", "35 hours = a day");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            h: 36
        }), true), "2 ມື້", "36 hours = 2 days");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 1
        }), true), "1 ມື້", "1 day = a day");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 5
        }), true), "5 ມື້", "5 days = 5 days");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 25
        }), true), "25 ມື້", "25 days = 25 days");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 26
        }), true), "1 ເດືອນ", "26 days = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 30
        }), true), "1 ເດືອນ", "30 days = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 43
        }), true), "1 ເດືອນ", "43 days = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 46
        }), true), "2 ເດືອນ", "46 days = 2 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 74
        }), true), "2 ເດືອນ", "75 days = 2 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 76
        }), true), "3 ເດືອນ", "76 days = 3 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            M: 1
        }), true), "1 ເດືອນ", "1 month = a month");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            M: 5
        }), true), "5 ເດືອນ", "5 months = 5 months");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 345
        }), true), "1 ປີ", "345 days = a year");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            d: 548
        }), true), "2 ປີ", "548 days = 2 years");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            y: 1
        }), true), "1 ປີ", "1 year = a year");
        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({
            y: 5
        }), true), "5 ປີ", "5 years = 5 years");
    });

    it("suffix", () => {
        assert.equal(adone.datetime(30000).from(0), "ອີກ ບໍ່ເທົ່າໃດວິນາທີ", "prefix");
        assert.equal(adone.datetime(0).from(30000), "ບໍ່ເທົ່າໃດວິນາທີຜ່ານມາ", "suffix");
    });

    it("now from now", () => {
        assert.equal(adone.datetime().fromNow(), "ບໍ່ເທົ່າໃດວິນາທີຜ່ານມາ", "now from now should display as in the past");
    });

    it("fromNow", () => {
        assert.equal(adone.datetime().add({
            s: 30
        }).fromNow(), "ອີກ ບໍ່ເທົ່າໃດວິນາທີ", "in a few seconds");
        assert.equal(adone.datetime().add({
            d: 5
        }).fromNow(), "ອີກ 5 ມື້", "in 5 days");
    });

    it("calendar day", () => {
        const a = adone.datetime().hours(12).minutes(0).seconds(0);

        assert.equal(adone.datetime(a).calendar(), "ມື້ນີ້ເວລາ 12:00", "today at the same time");
        assert.equal(adone.datetime(a).add({
            m: 25
        }).calendar(), "ມື້ນີ້ເວລາ 12:25", "Now plus 25 min");
        assert.equal(adone.datetime(a).add({
            h: 1
        }).calendar(), "ມື້ນີ້ເວລາ 13:00", "Now plus 1 hour");
        assert.equal(adone.datetime(a).add({
            d: 1
        }).calendar(), "ມື້ອື່ນເວລາ 12:00", "tomorrow at the same time");
        assert.equal(adone.datetime(a).subtract({
            h: 1
        }).calendar(), "ມື້ນີ້ເວລາ 11:00", "Now minus 1 hour");
        assert.equal(adone.datetime(a).subtract({
            d: 1
        }).calendar(), "ມື້ວານນີ້ເວລາ 12:00", "yesterday at the same time");
    });

    it("calendar next week", () => {
        let i;
        let m;

        for (i = 2; i < 7; i++) {
            m = adone.datetime().add({
                d: i
            });
            assert.equal(m.calendar(), m.format("[ວັນ]dddd[ໜ້າເວລາ] LT"), `Today + ${i} days current time`);
            m.hours(0).minutes(0).seconds(0).milliseconds(0);
            assert.equal(m.calendar(), m.format("[ວັນ]dddd[ໜ້າເວລາ] LT"), `Today + ${i} days beginning of day`);
            m.hours(23).minutes(59).seconds(59).milliseconds(999);
            assert.equal(m.calendar(), m.format("[ວັນ]dddd[ໜ້າເວລາ] LT"), `Today + ${i} days end of day`);
        }
    });

    it("calendar last week", () => {
        let i;
        let m;

        for (i = 2; i < 7; i++) {
            m = adone.datetime().subtract({
                d: i
            });
            assert.equal(m.calendar(), m.format("[ວັນ]dddd[ແລ້ວນີ້ເວລາ] LT"), `Today - ${i} days current time`);
            m.hours(0).minutes(0).seconds(0).milliseconds(0);
            assert.equal(m.calendar(), m.format("[ວັນ]dddd[ແລ້ວນີ້ເວລາ] LT"), `Today - ${i} days beginning of day`);
            m.hours(23).minutes(59).seconds(59).milliseconds(999);
            assert.equal(m.calendar(), m.format("[ວັນ]dddd[ແລ້ວນີ້ເວລາ] LT"), `Today - ${i} days end of day`);
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

    it("weeks year starting sunday format", () => {
        assert.equal(adone.datetime([2012, 0, 1]).format("w ww wo"), "1 01 ທີ່1", "Jan  1 2012 should be week 1");
        assert.equal(adone.datetime([2012, 0, 7]).format("w ww wo"), "1 01 ທີ່1", "Jan  7 2012 should be week 1");
        assert.equal(adone.datetime([2012, 0, 8]).format("w ww wo"), "2 02 ທີ່2", "Jan  8 2012 should be week 2");
        assert.equal(adone.datetime([2012, 0, 14]).format("w ww wo"), "2 02 ທີ່2", "Jan 14 2012 should be week 2");
        assert.equal(adone.datetime([2012, 0, 15]).format("w ww wo"), "3 03 ທີ່3", "Jan 15 2012 should be week 3");
    });
});
