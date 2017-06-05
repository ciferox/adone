const { is } = adone;

// node expects setTimeout/setInterval to return a fn object w/ .ref()/.unref()
// browsers, a number.
// see https://github.com/cjohansen/Sinon.JS/pull/436

const NOOP = function () {
    return undefined;
};
const timeoutResult = setTimeout(NOOP, 0);
const addTimerReturnsObject = is.object(timeoutResult);
clearTimeout(timeoutResult);

const NativeDate = Date;
let uniqueTimerId = 1;

/**
 * Parse strings like "01:10:00" (meaning 1 hour, 10 minutes, 0 seconds) into
 * number of milliseconds. This is used to support human-readable strings passed
 * to clock.tick()
 */
const parseTime = (str) => {
    if (!str) {
        return 0;
    }

    const strings = str.split(":");
    const l = strings.length;
    let i = l;
    let ms = 0;
    let parsed;

    if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
        throw new Error("tick only understands numbers, 'm:s' and 'h:m:s'. Each part must be two digits");
    }

    while (i--) {
        parsed = parseInt(strings[i], 10);

        if (parsed >= 60) {
            throw new Error(`Invalid time ${str}`);
        }

        ms += parsed * Math.pow(60, (l - i - 1));
    }

    return ms * 1000;
};

/**
 * Floor function that also works for negative numbers
 */
const fixedFloor = (n) => (n >= 0 ? Math.floor(n) : Math.ceil(n));

/**
 * % operator that also works for negative numbers
 */
const fixedModulo = (n, m) => ((n % m) + m) % m;

/**
 * Used to grok the `now` parameter to createClock.
 */
const getEpoch = (epoch) => {
    if (!epoch) {
        return 0;
    }
    if (is.function(epoch.getTime)) {
        return epoch.getTime();
    }
    if (is.number(epoch)) {
        return epoch;
    }
    throw new TypeError("now should be milliseconds since UNIX epoch");
};

const inRange = (from, to, timer) => timer && timer.callAt >= from && timer.callAt <= to;

const mirrorDateProperties = (target, source) => {
    let prop;
    for (prop in source) {
        if (source.hasOwnProperty(prop)) {
            target[prop] = source[prop];
        }
    }

    // set special now implementation
    if (source.now) {
        target.now = function now() {
            return target.clock.now;
        };
    } else {
        delete target.now;
    }

    // set special toSource implementation
    if (source.toSource) {
        target.toSource = function toSource() {
            return source.toSource();
        };
    } else {
        delete target.toSource;
    }

    // set special toString implementation
    target.toString = function toString() {
        return source.toString();
    };

    target.prototype = source.prototype;
    target.parse = source.parse;
    target.UTC = source.UTC;
    target.prototype.toUTCString = source.prototype.toUTCString;

    return target;
};

const createDate = () => {
    const ClockDate = function (year, month, date, hour, minute, second, ms) {
        // Defensive and verbose to avoid potential harm in passing
        // explicit undefined when user does not pass argument
        switch (arguments.length) {
            case 0:
                return new NativeDate(ClockDate.clock.now);
            case 1:
                return new NativeDate(year);
            case 2:
                return new NativeDate(year, month);
            case 3:
                return new NativeDate(year, month, date);
            case 4:
                return new NativeDate(year, month, date, hour);
            case 5:
                return new NativeDate(year, month, date, hour, minute);
            case 6:
                return new NativeDate(year, month, date, hour, minute, second);
            default:
                return new NativeDate(year, month, date, hour, minute, second, ms);
        }
    };

    return mirrorDateProperties(ClockDate, NativeDate);
};

const addTimer = (clock, timer) => {
    if (is.undefined(timer.func)) {
        throw new Error("Callback must be provided to timer calls");
    }

    if (!clock.timers) {
        clock.timers = {};
    }

    timer.id = uniqueTimerId++;
    timer.createdAt = clock.now;
    timer.callAt = clock.now + (parseInt(timer.delay) || (clock.duringTick ? 1 : 0));

    clock.timers[timer.id] = timer;

    if (addTimerReturnsObject) {
        return {
            id: timer.id,
            ref: NOOP,
            unref: NOOP
        };
    }

    return timer.id;
};

/* eslint consistent-return: "off" */
const compareTimers = (a, b) => {
    // Sort first by absolute timing
    if (a.callAt < b.callAt) {
        return -1;
    }
    if (a.callAt > b.callAt) {
        return 1;
    }

    // Sort next by immediate, immediate timers take precedence
    if (a.immediate && !b.immediate) {
        return -1;
    }
    if (!a.immediate && b.immediate) {
        return 1;
    }

    // Sort next by creation time, earlier-created timers take precedence
    if (a.createdAt < b.createdAt) {
        return -1;
    }
    if (a.createdAt > b.createdAt) {
        return 1;
    }

    // Sort next by id, lower-id timers take precedence
    if (a.id < b.id) {
        return -1;
    }
    if (a.id > b.id) {
        return 1;
    }

    // As timer ids are unique, no fallback `0` is necessary
};

const firstTimerInRange = (clock, from, to) => {
    const timers = clock.timers;
    let timer = null;
    let id;
    let isInRange;

    for (id in timers) {
        if (timers.hasOwnProperty(id)) {
            isInRange = inRange(from, to, timers[id]);

            if (isInRange && (!timer || compareTimers(timer, timers[id]) === 1)) {
                timer = timers[id];
            }
        }
    }

    return timer;
};

const firstTimer = (clock) => {
    const timers = clock.timers;
    let timer = null;
    let id;

    for (id in timers) {
        if (timers.hasOwnProperty(id)) {
            if (!timer || compareTimers(timer, timers[id]) === 1) {
                timer = timers[id];
            }
        }
    }

    return timer;
};

const lastTimer = (clock) => {
    const timers = clock.timers;
    let timer = null;
    let id;

    for (id in timers) {
        if (timers.hasOwnProperty(id)) {
            if (!timer || compareTimers(timer, timers[id]) === -1) {
                timer = timers[id];
            }
        }
    }

    return timer;
};

const callTimer = (clock, timer) => {
    let exception;

    if (is.number(timer.interval)) {
        clock.timers[timer.id].callAt += timer.interval;
    } else {
        delete clock.timers[timer.id];
    }

    try {
        if (is.function(timer.func)) {
            timer.func.apply(null, timer.args);
        } else {
            /* eslint no-eval: "off" */
            eval(timer.func);
        }
    } catch (e) {
        exception = e;
    }

    if (!clock.timers[timer.id]) {
        if (exception) {
            throw exception;
        }
        return;
    }

    if (exception) {
        throw exception;
    }
};

const timerType = (timer) => {
    if (timer.immediate) {
        return "Immediate";
    }
    if (!is.undefined(timer.interval)) {
        return "Interval";
    }
    return "Timeout";
};

const clearTimer = (clock, timerId, ttype) => {
    if (!timerId) {
        // null appears to be allowed in most browsers, and appears to be
        // relied upon by some libraries, like Bootstrap carousel
        return;
    }

    if (!clock.timers) {
        clock.timers = [];
    }

    // in Node, timerId is an object with .ref()/.unref(), and
    // its .id field is the actual timer id.
    if (is.object(timerId)) {
        timerId = timerId.id;
    }

    if (clock.timers.hasOwnProperty(timerId)) {
        // check that the ID matches a timer of the correct type
        const timer = clock.timers[timerId];
        if (timerType(timer) === ttype) {
            delete clock.timers[timerId];
        } else {
            throw new Error(`Cannot clear timer: timer created with set${timerType(timer)
                }() but cleared with clear${ttype}()`);
        }
    }
};

const uninstall = (clock, target) => {
    let method;
    let i;
    let l;
    const installedHrTime = "_hrtime";

    for (i = 0, l = clock.methods.length; i < l; i++) {
        method = clock.methods[i];
        if (method === "hrtime" && target.process) {
            target.process.hrtime = clock[installedHrTime];
        } else {
            if (target[method] && target[method].hadOwnProperty) {
                target[method] = clock[`_${method}`];
            } else {
                try {
                    delete target[method];
                } catch (ignore) { /* eslint empty-block: "off" */ }
            }
        }
    }

    // Prevent multiple executions which will completely remove these props
    clock.methods = [];
};

const hijackMethod = (target, method, clock) => {
    let prop;

    clock[method].hadOwnProperty = Object.prototype.hasOwnProperty.call(target, method);
    clock[`_${method}`] = target[method];

    if (method === "Date") {
        const date = mirrorDateProperties(clock[method], target[method]);
        target[method] = date;
    } else {
        target[method] = function () {
            return clock[method].apply(clock, arguments);
        };

        for (prop in clock[method]) {
            if (clock[method].hasOwnProperty(prop)) {
                target[method][prop] = clock[method][prop];
            }
        }
    }

    target[method].clock = clock;
};

export const timers = {
    setTimeout,
    clearTimeout,
    setImmediate: global.setImmediate,
    clearImmediate: global.clearImmediate,
    setInterval,
    clearInterval,
    Date
};

timers.hrtime = global.process.hrtime;

const keys = Object.keys || function (obj) {
    const ks = [];
    let key;

    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            ks.push(key);
        }
    }

    return ks;
};

export const createClock = (now, loopLimit) => {
    loopLimit = loopLimit || 1000;

    const clock = {
        now: getEpoch(now),
        hrNow: 0,
        timeouts: {},
        Date: createDate(),
        loopLimit
    };

    clock.Date.clock = clock;

    clock.setTimeout = function setTimeout(func, timeout) {
        return addTimer(clock, {
            func,
            args: Array.prototype.slice.call(arguments, 2),
            delay: timeout
        });
    };

    clock.clearTimeout = function clearTimeout(timerId) {
        return clearTimer(clock, timerId, "Timeout");
    };

    clock.setInterval = function setInterval(func, timeout) {
        return addTimer(clock, {
            func,
            args: Array.prototype.slice.call(arguments, 2),
            delay: timeout,
            interval: timeout
        });
    };

    clock.clearInterval = function clearInterval(timerId) {
        return clearTimer(clock, timerId, "Interval");
    };

    clock.setImmediate = function setImmediate(func) {
        return addTimer(clock, {
            func,
            args: Array.prototype.slice.call(arguments, 1),
            immediate: true
        });
    };

    clock.clearImmediate = function clearImmediate(timerId) {
        return clearTimer(clock, timerId, "Immediate");
    };

    clock.tick = function tick(ms) {
        ms = is.number(ms) ? ms : parseTime(ms);
        let tickFrom = clock.now;
        let tickTo = clock.now + ms;
        let previous = clock.now;
        let timer = firstTimerInRange(clock, tickFrom, tickTo);
        let oldNow;
        let firstException;

        clock.duringTick = true;

        const updateHrTime = (newNow) => {
            clock.hrNow += (newNow - clock.now);
        };

        while (timer && tickFrom <= tickTo) {
            if (clock.timers[timer.id]) {
                updateHrTime(timer.callAt);
                tickFrom = timer.callAt;
                clock.now = timer.callAt;
                try {
                    oldNow = clock.now;
                    callTimer(clock, timer);
                    // compensate for any setSystemTime() call during timer callback
                    if (oldNow !== clock.now) {
                        tickFrom += clock.now - oldNow;
                        tickTo += clock.now - oldNow;
                        previous += clock.now - oldNow;
                    }
                } catch (e) {
                    firstException = firstException || e;
                }
            }

            timer = firstTimerInRange(clock, previous, tickTo);
            previous = tickFrom;
        }

        clock.duringTick = false;
        updateHrTime(tickTo);
        clock.now = tickTo;

        if (firstException) {
            throw firstException;
        }

        return clock.now;
    };

    clock.next = function next() {
        const timer = firstTimer(clock);
        if (!timer) {
            return clock.now;
        }

        clock.duringTick = true;
        try {
            clock.now = timer.callAt;
            callTimer(clock, timer);
            return clock.now;
        } finally {
            clock.duringTick = false;
        }
    };

    clock.runAll = function runAll() {
        let numTimers;
        let i;
        for (i = 0; i < clock.loopLimit; i++) {
            if (!clock.timers) {
                return clock.now;
            }

            numTimers = Object.keys(clock.timers).length;
            if (numTimers === 0) {
                return clock.now;
            }

            clock.next();
        }

        throw new Error(`Aborting after running ${clock.loopLimit} timers, assuming an infinite loop!`);
    };

    clock.runToLast = function runToLast() {
        const timer = lastTimer(clock);
        if (!timer) {
            return clock.now;
        }

        return clock.tick(timer.callAt);
    };

    clock.reset = function reset() {
        clock.timers = {};
    };

    clock.setSystemTime = function setSystemTime(systemTime) {
        // determine time difference
        const newNow = getEpoch(systemTime);
        const difference = newNow - clock.now;
        let id;
        let timer;

        // update 'system clock'
        clock.now = newNow;

        // update timers and intervals to keep them stable
        for (id in clock.timers) {
            if (clock.timers.hasOwnProperty(id)) {
                timer = clock.timers[id];
                timer.createdAt += difference;
                timer.callAt += difference;
            }
        }
    };

    clock.hrtime = function (prev) {
        if (is.array(prev)) {
            const oldSecs = (prev[0] + prev[1] / 1e9);
            const newSecs = (clock.hrNow / 1000);
            const difference = (newSecs - oldSecs);
            const secs = fixedFloor(difference);
            const nanosecs = fixedModulo(difference * 1e9, 1e9);
            return [
                secs,
                nanosecs
            ];
        }
        return [
            fixedFloor(clock.hrNow / 1000),
            fixedModulo(clock.hrNow * 1e6, 1e9)
        ];
    };

    return clock;
};

export const install = function (target, now, toFake, loopLimit) {
    let i;
    let l;

    if (target instanceof Date) {
        toFake = now;
        now = target.getTime();
        target = null;
    }

    if (is.number(target)) {
        toFake = now;
        now = target;
        target = null;
    }

    if (!target) {
        target = global;
    }

    const clock = createClock(now, loopLimit);

    clock.uninstall = function () {
        uninstall(clock, target);
    };

    clock.methods = toFake || [];

    if (clock.methods.length === 0) {
        clock.methods = keys(timers);
    }

    for (i = 0, l = clock.methods.length; i < l; i++) {
        if (clock.methods[i] === "hrtime") {
            if (target.process && is.function(target.process.hrtime)) {
                hijackMethod(target.process, clock.methods[i], clock);
            }
        } else {
            hijackMethod(target, clock.methods[i], clock);
        }
    }

    return clock;
};
