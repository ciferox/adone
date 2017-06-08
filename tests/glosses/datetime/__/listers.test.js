describe("datetime", "listers", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("default", () => {
        assert.deepEqual(adone.datetime.months(), ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
        assert.deepEqual(adone.datetime.monthsShort(), ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
        assert.deepEqual(adone.datetime.weekdays(), ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
        assert.deepEqual(adone.datetime.weekdaysShort(), ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
        assert.deepEqual(adone.datetime.weekdaysMin(), ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
    });

    it("index", () => {
        assert.equal(adone.datetime.months(0), "January");
        assert.equal(adone.datetime.months(2), "March");
        assert.equal(adone.datetime.monthsShort(0), "Jan");
        assert.equal(adone.datetime.monthsShort(2), "Mar");
        assert.equal(adone.datetime.weekdays(0), "Sunday");
        assert.equal(adone.datetime.weekdays(2), "Tuesday");
        assert.equal(adone.datetime.weekdaysShort(0), "Sun");
        assert.equal(adone.datetime.weekdaysShort(2), "Tue");
        assert.equal(adone.datetime.weekdaysMin(0), "Su");
        assert.equal(adone.datetime.weekdaysMin(2), "Tu");
    });

    it("localized", () => {
        const months = "one_two_three_four_five_six_seven_eight_nine_ten_eleven_twelve".split("_");
        const monthsShort = "on_tw_th_fo_fi_si_se_ei_ni_te_el_tw".split("_");
        const weekdays = "one_two_three_four_five_six_seven".split("_");
        const weekdaysShort = "on_tw_th_fo_fi_si_se".split("_");
        const weekdaysMin = "1_2_3_4_5_6_7".split("_");
        const weekdaysLocale = "four_five_six_seven_one_two_three".split("_");
        const weekdaysShortLocale = "fo_fi_si_se_on_tw_th".split("_");
        const weekdaysMinLocale = "4_5_6_7_1_2_3".split("_");
        const week = {
            dow: 3,
            doy: 6
        };

        adone.datetime.locale("numerologists", {
            months,
            monthsShort,
            weekdays,
            weekdaysShort,
            weekdaysMin,
            week
        });

        assert.deepEqual(adone.datetime.months(), months);
        assert.deepEqual(adone.datetime.monthsShort(), monthsShort);
        assert.deepEqual(adone.datetime.weekdays(), weekdays);
        assert.deepEqual(adone.datetime.weekdaysShort(), weekdaysShort);
        assert.deepEqual(adone.datetime.weekdaysMin(), weekdaysMin);

        assert.equal(adone.datetime.months(0), "one");
        assert.equal(adone.datetime.monthsShort(0), "on");
        assert.equal(adone.datetime.weekdays(0), "one");
        assert.equal(adone.datetime.weekdaysShort(0), "on");
        assert.equal(adone.datetime.weekdaysMin(0), "1");

        assert.equal(adone.datetime.months(2), "three");
        assert.equal(adone.datetime.monthsShort(2), "th");
        assert.equal(adone.datetime.weekdays(2), "three");
        assert.equal(adone.datetime.weekdaysShort(2), "th");
        assert.equal(adone.datetime.weekdaysMin(2), "3");

        assert.deepEqual(adone.datetime.weekdays(true), weekdaysLocale);
        assert.deepEqual(adone.datetime.weekdaysShort(true), weekdaysShortLocale);
        assert.deepEqual(adone.datetime.weekdaysMin(true), weekdaysMinLocale);

        assert.equal(adone.datetime.weekdays(true, 0), "four");
        assert.equal(adone.datetime.weekdaysShort(true, 0), "fo");
        assert.equal(adone.datetime.weekdaysMin(true, 0), "4");

        assert.equal(adone.datetime.weekdays(false, 2), "three");
        assert.equal(adone.datetime.weekdaysShort(false, 2), "th");
        assert.equal(adone.datetime.weekdaysMin(false, 2), "3");
    });

    it("with functions", () => {
        const monthsShort = "one_two_three_four_five_six_seven_eight_nine_ten_eleven_twelve".split("_");
        const monthsShortWeird = "onesy_twosy_threesy_foursy_fivesy_sixsy_sevensy_eightsy_ninesy_tensy_elevensy_twelvesy".split("_");

        adone.datetime.locale("difficult", {

            monthsShort(m, format) {
                const arr = format.match(/-MMM-/) ? monthsShortWeird : monthsShort;
                return arr[m.month()];
            }
        });

        assert.deepEqual(adone.datetime.monthsShort(), monthsShort);
        assert.deepEqual(adone.datetime.monthsShort("MMM"), monthsShort);
        assert.deepEqual(adone.datetime.monthsShort("-MMM-"), monthsShortWeird);

        assert.deepEqual(adone.datetime.monthsShort("MMM", 2), "three");
        assert.deepEqual(adone.datetime.monthsShort("-MMM-", 2), "threesy");
        assert.deepEqual(adone.datetime.monthsShort(2), "three");
    });

    it("with locale data", () => {
        const months = "one_two_three_four_five_six_seven_eight_nine_ten_eleven_twelve".split("_");
        const monthsShort = "on_tw_th_fo_fi_si_se_ei_ni_te_el_tw".split("_");
        const weekdays = "one_two_three_four_five_six_seven".split("_");
        const weekdaysShort = "on_tw_th_fo_fi_si_se".split("_");
        const weekdaysMin = "1_2_3_4_5_6_7".split("_");

        const customLocale = adone.datetime.localeData("numerologists");

        assert.deepEqual(customLocale.months(), months);
        assert.deepEqual(customLocale.monthsShort(), monthsShort);
        assert.deepEqual(customLocale.weekdays(), weekdays);
        assert.deepEqual(customLocale.weekdaysShort(), weekdaysShort);
        assert.deepEqual(customLocale.weekdaysMin(), weekdaysMin);
    });
});
