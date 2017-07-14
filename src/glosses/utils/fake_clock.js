const { is, x, noop } = adone;

const NativeDate = Date;
let uniqueTimerId = 1;

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

const fixedFloor = (n) => n >= 0 ? Math.floor(n) : Math.ceil(n);

const fixedModulo = (n, m) => ((n % m) + m) % m;

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
    throw new x.InvalidArgument("now should be milliseconds since UNIX epoch");
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
        target.now = () => target.clock.now;
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
            case 0: {
                return new NativeDate(ClockDate.clock.now);
            }
            case 1: {
                return new NativeDate(year);
            }
            case 2: {
                return new NativeDate(year, month);
            }
            case 3: {
                return new NativeDate(year, month, date);
            }
            case 4: {
                return new NativeDate(year, month, date, hour);
            }
            case 5: {
                return new NativeDate(year, month, date, hour, minute);
            }
            case 6: {
                return new NativeDate(year, month, date, hour, minute, second);
            }
            default: {
                return new NativeDate(year, month, date, hour, minute, second, ms);
            }
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

    return { id: timer.id, ref: noop, unref: noop };
};


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

    for (const id in timers) {
        if (timers.hasOwnProperty(id)) {
            const isInRange = inRange(from, to, timers[id]);

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

    for (const id in timers) {
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

    for (const id in timers) {
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
            // ?
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
    timerId = timerId.id;

    if (clock.timers.hasOwnProperty(timerId)) {
        // check that the ID matches a timer of the correct type
        const timer = clock.timers[timerId];
        if (timerType(timer) === ttype) {
            delete clock.timers[timerId];
        } else {
            throw new Error(`Cannot clear timer: timer created with set${timerType(timer)}() but cleared with clear${ttype}()`);
        }
    }
};

const hijackMethod = (target, method, clock) => {
    let prop;
    clock[method].hadOwnProperty = Object.prototype.hasOwnProperty.call(target, method);
    clock[`_${method}`] = target[method];

    if (method === "Date") {
        const date = mirrorDateProperties(clock[method], target[method]);
        target[method] = date;
    } else {
        target[method] = (...args) => clock[method](...args);

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
    Date,
    hrtime: global.process.hrtime
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

    clock.setTimeout = function setTimeout(func, timeout, ...args) {
        return addTimer(clock, { func, args, delay: timeout });
    };

    clock.clearTimeout = function clearTimeout(timerId) {
        return clearTimer(clock, timerId, "Timeout");
    };

    clock.setInterval = function setInterval(func, timeout, ...args) {
        return addTimer(clock, { func, args, delay: timeout, interval: timeout });
    };

    clock.clearInterval = function clearInterval(timerId) {
        return clearTimer(clock, timerId, "Interval");
    };

    clock.setImmediate = function setImmediate(func, ...args) {
        return addTimer(clock, { func, args, immediate: true });
    };

    clock.clearImmediate = function clearImmediate(timerId) {
        return clearTimer(clock, timerId, "Immediate");
    };

    const updateHrTime = (newNow) => {
        clock.hrNow += (newNow - clock.now);
    };

    clock.tick = (ms) => {
        ms = is.number(ms) ? ms : parseTime(ms);
        let tickFrom = clock.now;
        let tickTo = clock.now + ms;
        let previous = clock.now;
        let timer = firstTimerInRange(clock, tickFrom, tickTo);
        let oldNow;
        let firstException;

        clock.duringTick = true;

        while (timer && tickFrom <= tickTo) {
            if (clock.timers[timer.id]) {
                updateHrTime(timer.callAt);
                tickFrom = timer.callAt;
                clock.now = timer.callAt;
                try {
                    oldNow = clock.now;
                    callTimer(clock, timer);
                } catch (e) {
                    firstException = firstException || e;
                }
                // compensate for any setSystemTime() call during timer callback
                if (oldNow !== clock.now) {
                    tickFrom += clock.now - oldNow;
                    tickTo += clock.now - oldNow;
                    previous += clock.now - oldNow;
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

    clock.next = () => {
        const timer = firstTimer(clock);
        if (!timer) {
            return clock.now;
        }

        clock.duringTick = true;
        try {
            updateHrTime(timer.callAt);
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

    clock.runToLast = () => {
        const timer = lastTimer(clock);
        if (!timer) {
            return clock.now;
        }

        return clock.tick(timer.callAt);
    };

    clock.reset = () => {
        clock.timers = {};
    };

    clock.setSystemTime = (systemTime) => {
        // determine time difference
        const newNow = getEpoch(systemTime);
        const difference = newNow - clock.now;

        // update 'system clock'
        clock.now = newNow;

        // update timers and intervals to keep them stable
        for (const id in clock.timers) {
            if (clock.timers.hasOwnProperty(id)) {
                const timer = clock.timers[id];
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

export const install = (...args) => {
    let target = null;
    let now;
    let methods = [];
    let loopLimit = 1000;

    if (is.number(args[0])) {
        now = args.shift();
    } else if (is.date(args[0])) {
        now = args[0].getTime();
    }

    if (is.string(args[0])) {
        methods = args;
    } else if (is.array(args[0])) {
        methods = args[0];
    } else if (is.plainObject(args[0])) {
        ({
            target = null,
            now = now,
            toFake: methods = methods,
            loopLimit = loopLimit
        } = args[0]);
    }

    if (!target) {
        target = global;
    }

    const clock = createClock(now, loopLimit);

    clock.uninstall = () => {
        const installedHrTime = "_hrtime";

        for (let i = 0, l = clock.methods.length; i < l; i++) {
            const method = clock.methods[i];
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

    clock.methods = methods || [];

    if (clock.methods.length === 0) {
        clock.methods = Object.keys(timers);
    }
    for (let i = 0, l = clock.methods.length; i < l; i++) {
        if (clock.methods[i] === "hrtime") {
            hijackMethod(target.process, clock.methods[i], clock);
        } else {
            hijackMethod(target, clock.methods[i], clock);
        }
    }

    return clock;
};
