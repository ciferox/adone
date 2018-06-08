const NOOP = () => { };
let getStartTime = () => 0;
let getElapsedTime = () => 0;
let timers = {};
const normalizeHrTime = (time) => time[0] * 1e3 + time[1] / 1e6;
function setTimeHelpers() {
    if (typeof process !== 'undefined' && typeof process.hrtime === 'function') {
        getStartTime = process.hrtime.bind(process);
        getElapsedTime = (previous) => normalizeHrTime(process.hrtime(previous));
    }
    else if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        getStartTime = performance.now.bind(performance);
        getElapsedTime = (previous) => performance.now() - previous;
    }
}
function getPersistedLabel(label, level) {
    switch (level) {
        case 1:
            return `# ${label}`;
        case 2:
            return `## ${label}`;
        case 3:
            return label;
        default:
            return `${'  '.repeat(level - 4)}- ${label}`;
    }
}
function timeStartImpl(label, level = 3) {
    label = getPersistedLabel(label, level);
    if (!timers.hasOwnProperty(label)) {
        timers[label] = {
            start: undefined,
            time: 0
        };
    }
    timers[label].start = getStartTime();
}
function timeEndImpl(label, level = 3) {
    label = getPersistedLabel(label, level);
    if (timers.hasOwnProperty(label)) {
        timers[label].time += getElapsedTime(timers[label].start);
    }
}
export function getTimings() {
    const newTimings = {};
    Object.keys(timers).forEach(label => {
        newTimings[label] = timers[label].time;
    });
    return newTimings;
}
export let timeStart = NOOP, timeEnd = NOOP;
const TIMED_PLUGIN_HOOKS = {
    transform: true,
    transformBundle: true,
    load: true,
    resolveId: true,
    ongenerate: true,
    onwrite: true,
    resolveDynamicImport: true
};
function getPluginWithTimers(plugin, index) {
    const timedPlugin = {};
    for (const hook of Object.keys(plugin)) {
        if (TIMED_PLUGIN_HOOKS[hook] === true) {
            let timerLabel = `plugin ${index}`;
            if (plugin.name) {
                timerLabel += ` (${plugin.name})`;
            }
            timerLabel += ` - ${hook}`;
            timedPlugin[hook] = function () {
                timeStart(timerLabel, 4);
                const result = plugin[hook].apply(this === timedPlugin ? plugin : this, arguments);
                timeEnd(timerLabel, 4);
                if (result && typeof result.then === 'function') {
                    timeStart(`${timerLabel} (async)`, 4);
                    result.then(() => timeEnd(`${timerLabel} (async)`, 4));
                }
                return result;
            };
        }
        else {
            timedPlugin[hook] = plugin[hook];
        }
    }
    return timedPlugin;
}
export function initialiseTimers(inputOptions) {
    if (inputOptions.perf) {
        timers = {};
        setTimeHelpers();
        timeStart = timeStartImpl;
        timeEnd = timeEndImpl;
        inputOptions.plugins = inputOptions.plugins.map(getPluginWithTimers);
    }
    else {
        timeStart = NOOP;
        timeEnd = NOOP;
    }
}
