import { hooks as datetime, setHookCallback } from "./__/utils";

adone.lazifyPrivate({
    create: "./__/create",
    unit: "./__/units",
    datetime: "./__/datetime",
    duration: "./__/duration",
    format: "./__/format",
    locale: "./__/locale",
    parse: "./__/parse",
    util: "./__/utils"
}, datetime, require);

const __ = adone.private(datetime);

const createUnix = (input) => __.create.createLocal(input * 1000);
const createInZone = (...args) => __.create.createLocal(...args).parseZone();
const createDuraton = (...args) => new __.duration.Duration(...args);
const createInvalidDuration = () => __.duration.Duration.invalid();

adone.lazify({
    min: () => __.datetime.min,
    max: () => __.datetime.max,
    now: () => __.datetime.now,
    calendarFormat: () => __.datetime.getCalendarFormat,

    local: () => __.create.createLocal,
    utc: () => __.create.createUTC,
    invalid: () => __.create.createInvalid,

    locale: () => __.locale.getSetGlobalLocale,
    defineLocale: () => __.locale.defineLocale,
    updateLocale: () => __.locale.updateLocale,
    locales: () => __.locale.listLocales,
    localeData: () => __.locale.getLocale,
    months: () => __.locale.listMonths,
    monthsShort: () => __.locale.listMonthsShort,
    weekdays: () => __.locale.listWeekdays,
    weekdaysMin: () => __.locale.listWeekdaysMin,
    weekdaysShort: () => __.locale.listWeekdaysShort,

    normalizeUnits: () => __.unit.alias.normalizeUnits,

    Duration: () => __.duration.Duration,
    isDuration: () => __.duration.isDuration,
    relativeTimeRounding: () => __.duration.getSetRelativeTimeRounding,
    relativeTimeThreshold: () => __.duration.getSetRelativeTimeThreshold
}, datetime, undefined, { configurable: true, writable: true });


// datetime.fn = Datetime.prototype;
datetime.unix = createUnix;
datetime.duration = createDuraton;
datetime.duration.invalid = createInvalidDuration;
datetime.parseZone = createInZone;

adone.asNamespace(datetime);

// ??? imitate default export
exports.__esModule = true;
adone.lazify({
    default: () => {
        setHookCallback(__.create.createLocal);
        require("./__/units/load_units");
        return datetime;
    }
}, exports);
