describe("listers", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("default", () => {
        assert.deepEqual(adone.date.months(), ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
        assert.deepEqual(adone.date.monthsShort(), ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
        assert.deepEqual(adone.date.weekdays(), ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
        assert.deepEqual(adone.date.weekdaysShort(), ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
        assert.deepEqual(adone.date.weekdaysMin(), ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
    });

    it("index", () => {
        assert.equal(adone.date.months(0), "January");
        assert.equal(adone.date.months(2), "March");
        assert.equal(adone.date.monthsShort(0), "Jan");
        assert.equal(adone.date.monthsShort(2), "Mar");
        assert.equal(adone.date.weekdays(0), "Sunday");
        assert.equal(adone.date.weekdays(2), "Tuesday");
        assert.equal(adone.date.weekdaysShort(0), "Sun");
        assert.equal(adone.date.weekdaysShort(2), "Tue");
        assert.equal(adone.date.weekdaysMin(0), "Su");
        assert.equal(adone.date.weekdaysMin(2), "Tu");
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

        adone.date.locale("numerologists", {
            months,
            monthsShort,
            weekdays,
            weekdaysShort,
            weekdaysMin,
            week
        });

        assert.deepEqual(adone.date.months(), months);
        assert.deepEqual(adone.date.monthsShort(), monthsShort);
        assert.deepEqual(adone.date.weekdays(), weekdays);
        assert.deepEqual(adone.date.weekdaysShort(), weekdaysShort);
        assert.deepEqual(adone.date.weekdaysMin(), weekdaysMin);

        assert.equal(adone.date.months(0), "one");
        assert.equal(adone.date.monthsShort(0), "on");
        assert.equal(adone.date.weekdays(0), "one");
        assert.equal(adone.date.weekdaysShort(0), "on");
        assert.equal(adone.date.weekdaysMin(0), "1");

        assert.equal(adone.date.months(2), "three");
        assert.equal(adone.date.monthsShort(2), "th");
        assert.equal(adone.date.weekdays(2), "three");
        assert.equal(adone.date.weekdaysShort(2), "th");
        assert.equal(adone.date.weekdaysMin(2), "3");

        assert.deepEqual(adone.date.weekdays(true), weekdaysLocale);
        assert.deepEqual(adone.date.weekdaysShort(true), weekdaysShortLocale);
        assert.deepEqual(adone.date.weekdaysMin(true), weekdaysMinLocale);

        assert.equal(adone.date.weekdays(true, 0), "four");
        assert.equal(adone.date.weekdaysShort(true, 0), "fo");
        assert.equal(adone.date.weekdaysMin(true, 0), "4");

        assert.equal(adone.date.weekdays(false, 2), "three");
        assert.equal(adone.date.weekdaysShort(false, 2), "th");
        assert.equal(adone.date.weekdaysMin(false, 2), "3");
    });

    it("with functions", () => {
        const monthsShort = "one_two_three_four_five_six_seven_eight_nine_ten_eleven_twelve".split("_");
        const monthsShortWeird = "onesy_twosy_threesy_foursy_fivesy_sixsy_sevensy_eightsy_ninesy_tensy_elevensy_twelvesy".split("_");

        adone.date.locale("difficult", {

            monthsShort (m, format) {
                const arr = format.match(/-MMM-/) ? monthsShortWeird : monthsShort;
                return arr[m.month()];
            }
        });

        assert.deepEqual(adone.date.monthsShort(), monthsShort);
        assert.deepEqual(adone.date.monthsShort("MMM"), monthsShort);
        assert.deepEqual(adone.date.monthsShort("-MMM-"), monthsShortWeird);

        assert.deepEqual(adone.date.monthsShort("MMM", 2), "three");
        assert.deepEqual(adone.date.monthsShort("-MMM-", 2), "threesy");
        assert.deepEqual(adone.date.monthsShort(2), "three");
    });

    it("with locale data", () => {
        const months = "one_two_three_four_five_six_seven_eight_nine_ten_eleven_twelve".split("_");
        const monthsShort = "on_tw_th_fo_fi_si_se_ei_ni_te_el_tw".split("_");
        const weekdays = "one_two_three_four_five_six_seven".split("_");
        const weekdaysShort = "on_tw_th_fo_fi_si_se".split("_");
        const weekdaysMin = "1_2_3_4_5_6_7".split("_");

        const customLocale = adone.date.localeData("numerologists");

        assert.deepEqual(customLocale.months(), months);
        assert.deepEqual(customLocale.monthsShort(), monthsShort);
        assert.deepEqual(customLocale.weekdays(), weekdays);
        assert.deepEqual(customLocale.weekdaysShort(), weekdaysShort);
        assert.deepEqual(customLocale.weekdaysMin(), weekdaysMin);
    });
});
