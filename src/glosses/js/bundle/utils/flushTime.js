const {
    is
} = adone;

const DEBUG = false;
const map = new Map();
let timeStartHelper;
let timeEndHelper;
if (is.undefined(process) || is.undefined(process.hrtime)) {
    timeStartHelper = function timeStartHelper() {
        return window.performance.now();
    };
    timeEndHelper = function timeEndHelper(previous) {
        return window.performance.now() - previous;
    };
} else {
    timeStartHelper = function timeStartHelper() {
        return process.hrtime();
    };
    timeEndHelper = function timeEndHelper(previous) {
        const hrtime = process.hrtime(previous);
        return hrtime[0] * 1e3 + Math.floor(hrtime[1] / 1e6);
    };
}
export function timeStart(label) {
    if (!map.has(label)) {
        map.set(label, {
            start: undefined,
            time: 0
        });
    }
    map.get(label).start = timeStartHelper();
}
export function timeEnd(label) {
    if (map.has(label)) {
        const item = map.get(label);
        item.time += timeEndHelper(item.start);
    }
}
export function flushTime(log = defaultLog) {
    map.forEach((value, key) => {
        log(key, value.time);
    });
    map.clear();
}
/**
 *  @interal
 */
export function defaultLog(label, time) {
    if (DEBUG) {
        console.info("%dms: %s", time, label);
    }
}
