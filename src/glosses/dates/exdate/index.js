import { hooks as exdate, setHookCallback } from "./lib/utils";

import ExDate, {
    min,
    max,
    now,
    getCalendarFormat
} from "./lib/exdate";

import { createLocal } from "./lib/create/local";
import { createUTC } from "./lib/create/utc";
import { createInvalid } from "./lib/create/valid";

function createUnix (input) {
    return createLocal(input * 1000);
}

function createInZone () {
    return createLocal.apply(null, arguments).parseZone();
}

import {
    defineLocale,
    updateLocale,
    getSetGlobalLocale as locale,
    getLocale          as localeData,
    listLocales        as locales,
    listMonths         as months,
    listMonthsShort    as monthsShort,
    listWeekdays       as weekdays,
    listWeekdaysMin    as weekdaysMin,
    listWeekdaysShort  as weekdaysShort
} from "./lib/locale";

import Duration, {
    isDuration,
    getSetRelativeTimeRounding as relativeTimeRounding,
    getSetRelativeTimeThreshold as relativeTimeThreshold
} from "./lib/duration";

import { normalizeUnits } from "./lib/units/units";

setHookCallback(createLocal);

exdate.fn                    = ExDate.prototype;
exdate.min                   = min;
exdate.max                   = max;
exdate.now                   = now;
exdate.utc                   = createUTC;
exdate.unix                  = createUnix;
exdate.local                 = createLocal;
exdate.months                = months;
exdate.locale                = locale;
exdate.invalid               = createInvalid;
exdate.duration              = (...args) => new Duration(...args);
exdate.Duration              = Duration;
exdate.weekdays              = weekdays;
exdate.parseZone             = createInZone;
exdate.localeData            = localeData;
exdate.isDuration            = isDuration;
exdate.monthsShort           = monthsShort;
exdate.weekdaysMin           = weekdaysMin;
exdate.defineLocale          = defineLocale;
exdate.updateLocale          = updateLocale;
exdate.locales               = locales;
exdate.weekdaysShort         = weekdaysShort;
exdate.normalizeUnits        = normalizeUnits;
exdate.relativeTimeRounding = relativeTimeRounding;
exdate.relativeTimeThreshold = relativeTimeThreshold;
exdate.calendarFormat        = getCalendarFormat;
exdate.prototype             = ExDate.prototype;

export default exdate;
