const flatstr = require("flatstr");
const { lsCacheSym, levelValSym, useLevelLabelsSym, changeLevelNameSym, useOnlyCustomLevelsSym } = require("./symbols");
const { noop, genLog } = require("./tools");

const {
    is
} = adone;

const levels = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
};

const levelMethods = {
    fatal: genLog(levels.fatal),
    error: genLog(levels.error),
    warn: genLog(levels.warn),
    info: genLog(levels.info),
    debug: genLog(levels.debug),
    trace: genLog(levels.trace)
};

const nums = Object.keys(levels).reduce((o, k) => {
    o[levels[k]] = k;
    return o;
}, {});

const initialLsCache = Object.keys(nums).reduce((o, k) => {
    o[k] = flatstr(`{"level":${Number(k)}`);
    return o;
}, {});

const genLsCache = function (instance) {
    const levelName = instance[changeLevelNameSym];
    instance[lsCacheSym] = Object.keys(instance.levels.labels).reduce((o, k) => {
        o[k] = instance[useLevelLabelsSym]
            ? `{"${levelName}":"${instance.levels.labels[k]}"`
            : flatstr(`{"${levelName}":${Number(k)}`);
        return o;
    }, instance[lsCacheSym]);
    return instance;
};

const isStandardLevel = function (level, useOnlyCustomLevels) {
    if (useOnlyCustomLevels) {
        return false;
    }

    switch (level) {
        case "fatal":
        case "error":
        case "warn":
        case "info":
        case "debug":
        case "trace":
            return true;
        default:
            return false;
    }
};

const setLevel = function (level) {
    const { labels, values } = this.levels;
    if (is.number(level)) {
        if (is.undefined(labels[level])) {
            throw Error(`unknown level value${level}`);
        }
        level = labels[level];
    }
    if (is.undefined(values[level])) {
        throw Error(`unknown level ${level}`);
    }
    const preLevelVal = this[levelValSym];
    const levelVal = this[levelValSym] = values[level];
    const useOnlyCustomLevelsVal = this[useOnlyCustomLevelsSym];

    for (const key in values) {
        if (levelVal > values[key]) {
            this[key] = noop;
            continue;
        }
        this[key] = isStandardLevel(key, useOnlyCustomLevelsVal) ? levelMethods[key] : genLog(values[key]);
    }

    this.emit(
        "level-change",
        level,
        levelVal,
        labels[preLevelVal],
        preLevelVal
    );
};

const getLevel = function (level) {
    const { levels, levelVal } = this;
    return levels.labels[levelVal];
};

const isLevelEnabled = function (logLevel) {
    const { values } = this.levels;
    const logLevelVal = values[logLevel];
    return !is.undefined(logLevelVal) && (logLevelVal >= this[levelValSym]);
};

const mappings = function (customLevels = null, useOnlyCustomLevels = false) {
    const customNums = customLevels ? Object.keys(customLevels).reduce((o, k) => {
        o[customLevels[k]] = k;
        return o;
    }, {}) : null;

    const labels = Object.assign(
        Object.create(Object.prototype, { Infinity: { value: "silent" } }),
        useOnlyCustomLevels ? null : nums,
        customNums
    );
    const values = Object.assign(
        Object.create(Object.prototype, { silent: { value: Infinity } }),
        useOnlyCustomLevels ? null : levels,
        customLevels
    );
    return { labels, values };
};

const assertDefaultLevelFound = function (defaultLevel, customLevels, useOnlyCustomLevels) {
    if (is.number(defaultLevel)) {
        const values = [].concat(
            Object.keys(customLevels || {}).map((key) => customLevels[key]),
            useOnlyCustomLevels ? [] : Object.keys(nums).map((level) => Number(level)),
            Infinity
        );
        if (!values.includes(defaultLevel)) {
            throw Error(`default level:${defaultLevel} must be included in custom levels`);
        }
        return;
    }

    const labels = Object.assign(
        Object.create(Object.prototype, { silent: { value: Infinity } }),
        useOnlyCustomLevels ? null : levels,
        customLevels
    );
    if (!(defaultLevel in labels)) {
        throw Error(`default level:${defaultLevel} must be included in custom levels`);
    }
};

const assertNoLevelCollisions = function (levels, customLevels) {
    const { labels, values } = levels;
    for (const k in customLevels) {
        if (k in values) {
            throw Error("levels cannot be overridden");
        }
        if (customLevels[k] in labels) {
            throw Error("pre-existing level values cannot be used for new levels");
        }
    }
};

module.exports = {
    initialLsCache,
    genLsCache,
    levelMethods,
    getLevel,
    setLevel,
    isLevelEnabled,
    mappings,
    assertNoLevelCollisions,
    assertDefaultLevelFound
};
