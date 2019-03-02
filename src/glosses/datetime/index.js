import { hooks as datetime, setHookCallback } from "./__/utils";

const { is } = adone;

adone.lazifyPrivate({
    create: "./__/create",
    unit: "./__/units",
    datetime: "./__/datetime",
    duration: "./__/duration",
    format: "./__/format",
    locale: "./__/locale",
    parse: "./__/parse",
    util: "./__/utils",
    tz: "./__/tz"
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
    relativeTimeThreshold: () => __.duration.getSetRelativeTimeThreshold,
    Datetime: ["./__/datetime", (mod) => mod.Datetime]
}, datetime, require, { configurable: true, writable: true });


// datetime.fn = Datetime.prototype;
datetime.unix = createUnix;
datetime.duration = createDuraton;
datetime.duration.invalid = createInvalidDuration;
datetime.parseZone = createInZone;
datetime.dos = ({ date, time }) => {
    const day = date & 0x1f; // 1-31
    const month = (date >> 5 & 0xf) - 1; // 1-12, 0-11
    const year = (date >> 9 & 0x7f) + 1980; // 0-128, 1980-2108

    const millisecond = 0;
    const second = (time & 0x1f) * 2; // 0-29, 0-58 (even numbers)
    const minute = time >> 5 & 0x3f; // 0-59
    const hour = time >> 11 & 0x1f; // 0-23

    return datetime([year, month, day, hour, minute, second, millisecond]);
};

datetime.tz = (...args) => {
    // const args = Array.prototype.slice.call(arguments, 0, -1);
    // const name = arguments[arguments.length - 1];
    const input = args[0];
    const name = args.pop();
    const zone = __.tz.getZone(name);
    const out = datetime.utc(...args);

    if (zone && !is.datetime(input) && __.tz.needsOffset(out)) {
        out.add(zone.parse(out), "minutes");
    }

    out.tz(name);

    return out;
};

adone.lazify({
    _zones: () => __.tz.zones,
    _links: () => __.tz.links,
    _names: () => __.tz.names,
    add: () => __.tz.addZone,
    link: () => __.tz.addLink,
    load: () => __.tz.loadData,
    zone: () => __.tz.getZone,
    zoneExists: () => __.tz.zoneExists,
    guess: () => __.tz.guess,
    names: () => __.tz.getNames,
    Zone: () => __.tz.Zone,
    unpack: () => __.tz.unpack,
    unpackBase60: () => __.tz.unpackBase60,
    needsOffset: () => __.tz.needsOffset,
    reload: () => __.tz.reload
}, datetime.tz);

Object.defineProperties(datetime.tz, {
    moveInvalidForward: {
        get() {
            return __.tz.getMoveInvalidForward();
        },
        set(v) {
            __.tz.setMoveInvalidForward(v);
        }
    },
    moveAmbiguousForward: {
        get() {
            return __.tz.getMoveAmbiguousForward();
        },
        set(v) {
            return __.tz.setMoveAmbiguousForward(v);
        }
    }
});

datetime.tz.setDefault = (name) => {
    datetime.defaultZone = name ? __.tz.getZone(name) : null;
    return datetime;
};

datetime.defaultFormat = "YYYY-MM-DDTHH:mm:ssZ";
datetime.defaultFormatUtc = "YYYY-MM-DDTHH:mm:ss[Z]";
datetime.defaultZone = null;

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


// currently HTML5 input type only supports 24-hour formats
datetime.HTML5_FMT = {
    DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',             // <input type="datetime-local" />
    DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss',  // <input type="datetime-local" step="1" />
    DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS',   // <input type="datetime-local" step="0.001" />
    DATE: 'YYYY-MM-DD',                             // <input type="date" />
    TIME: 'HH:mm',                                  // <input type="time" />
    TIME_SECONDS: 'HH:mm:ss',                       // <input type="time" step="1" />
    TIME_MS: 'HH:mm:ss.SSS',                        // <input type="time" step="0.001" />
    WEEK: 'YYYY-[W]WW',                             // <input type="week" />
    MONTH: 'YYYY-MM'                                // <input type="month" />
};
