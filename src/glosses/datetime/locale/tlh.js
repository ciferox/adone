//! locale : Klingon [tlh]
//! author : Dominika Kruk : https://github.com/amaranthrose

import ExDate from "..";

const numbersNouns = "pagh_wa’_cha’_wej_loS_vagh_jav_Soch_chorgh_Hut".split("_");

const translateFuture = (output) => {
    let time = output;
    time = output.includes("jaj")
        ? `${time.slice(0, -3)}leS`
        : output.includes("jar")
            ? `${time.slice(0, -3)}waQ`
            : output.includes("DIS")
                ? `${time.slice(0, -3)}nem`
                : `${time} pIq`;
    return time;
};

const translatePast = (output) => {
    let time = output;
    time = output.includes("jaj")
        ? `${time.slice(0, -3)}Hu’`
        : output.includes("jar")
            ? `${time.slice(0, -3)}wen`
            : output.includes("DIS")
                ? `${time.slice(0, -3)}ben`
                : `${time} ret`;
    return time;
};

const numberAsNoun = (number) => {
    let word = "";

    const hundred = Math.floor((number % 1000) / 100);
    if (hundred > 0) {
        word += `${numbersNouns[hundred]}vatlh`;
    }

    const ten = Math.floor((number % 100) / 10);
    if (ten > 0) {
        word += `${(word !== "" ? " " : "") + numbersNouns[ten]}maH`;
    }

    const one = number % 10;
    if (one > 0) {
        word += (word !== "" ? " " : "") + numbersNouns[one];
    }
    return word === "" ? "pagh" : word;
};

const translate = (number, withoutSuffix, string, isFuture) => {
    const numberNoun = numberAsNoun(number);
    switch (string) {
        case "ss":
            return `${numberNoun} lup`;
        case "mm":
            return `${numberNoun} tup`;
        case "hh":
            return `${numberNoun} rep`;
        case "dd":
            return `${numberNoun} jaj`;
        case "MM":
            return `${numberNoun} jar`;
        case "yy":
            return `${numberNoun} DIS`;
    }
};

export default ExDate.defineLocale("tlh", {
    months: "tera’ jar wa’_tera’ jar cha’_tera’ jar wej_tera’ jar loS_tera’ jar vagh_tera’ jar jav_tera’ jar Soch_tera’ jar chorgh_tera’ jar Hut_tera’ jar wa’maH_tera’ jar wa’maH wa’_tera’ jar wa’maH cha’".split("_"),
    monthsShort: "jar wa’_jar cha’_jar wej_jar loS_jar vagh_jar jav_jar Soch_jar chorgh_jar Hut_jar wa’maH_jar wa’maH wa’_jar wa’maH cha’".split("_"),
    monthsParseExact: true,
    weekdays: "lojmItjaj_DaSjaj_povjaj_ghItlhjaj_loghjaj_buqjaj_ghInjaj".split("_"),
    weekdaysShort: "lojmItjaj_DaSjaj_povjaj_ghItlhjaj_loghjaj_buqjaj_ghInjaj".split("_"),
    weekdaysMin: "lojmItjaj_DaSjaj_povjaj_ghItlhjaj_loghjaj_buqjaj_ghInjaj".split("_"),
    longDateFormat: {
        LT: "HH:mm",
        LTS: "HH:mm:ss",
        L: "DD.MM.YYYY",
        LL: "D MMMM YYYY",
        LLL: "D MMMM YYYY HH:mm",
        LLLL: "dddd, D MMMM YYYY HH:mm"
    },
    calendar: {
        sameDay: "[DaHjaj] LT",
        nextDay: "[wa’leS] LT",
        nextWeek: "LLL",
        lastDay: "[wa’Hu’] LT",
        lastWeek: "LLL",
        sameElse: "L"
    },
    relativeTime: {
        future: translateFuture,
        past: translatePast,
        s: "puS lup",
        ss: translate,
        m: "wa’ tup",
        mm: translate,
        h: "wa’ rep",
        hh: translate,
        d: "wa’ jaj",
        dd: translate,
        M: "wa’ jar",
        MM: translate,
        y: "wa’ DIS",
        yy: translate
    },
    dayOfMonthOrdinalParse: /\d{1,2}\./,
    ordinal: "%d.",
    week: {
        dow: 1, // Monday is the first day of the week.
        doy: 4 // The week that contains Jan 4th is the first week of the year.
    }
});
