const { EventEmitter } = require("events");
const SonicBoom = require("sonic-boom");
const flatstr = require("flatstr");
const {
    lsCacheSym,
    levelValSym,
    setLevelSym,
    getLevelSym,
    chindingsSym,
    asJsonSym,
    writeSym,
    timeSym,
    streamSym,
    serializersSym,
    useOnlyCustomLevelsSym,
    needsMetadataGsym
} = require("./symbols");
const {
    getLevel,
    setLevel,
    isLevelEnabled,
    mappings,
    initialLsCache,
    genLsCache,
    assertNoLevelCollisions
} = require("./levels");
const {
    asChindings,
    asJson
} = require("./tools");

const child = function (bindings) {
    const { level } = this;
    const serializers = this[serializersSym];
    const chindings = asChindings(this, bindings);
    const instance = Object.create(this);
    if (bindings.hasOwnProperty("serializers") === true) {
        instance[serializersSym] = Object.create(null);
        for (const k in serializers) {
            instance[serializersSym][k] = serializers[k];
        }
        for (const bk in bindings.serializers) {
            instance[serializersSym][bk] = bindings.serializers[bk];
        }
    } else {
        instance[serializersSym] = serializers;

    }
    if (bindings.hasOwnProperty("customLevels") === true) {
        assertNoLevelCollisions(this.levels, bindings.customLevels);
        instance.levels = mappings(bindings.customLevels, instance[useOnlyCustomLevelsSym]);
        genLsCache(instance);
    }
    instance[chindingsSym] = chindings;
    const childLevel = bindings.level || level;
    instance[setLevelSym](childLevel);

    return instance;
};

const write = function (obj, msg, num) {
    const t = this[timeSym]();
    const s = this[asJsonSym](obj, msg, num, t);
    const stream = this[streamSym];
    if (stream[needsMetadataGsym] === true) {
        stream.lastLevel = num;
        stream.lastMsg = msg;
        stream.lastObj = obj;
        stream.lastTime = t.slice(8);
        stream.lastLogger = this; // for child loggers
    }
    if (stream instanceof SonicBoom) {
        stream.write(s);
    } else {
        stream.write(flatstr(s));

    }
};

const flush = function () {
    const stream = this[streamSym];
    if ("flush" in stream) {
        stream.flush();
    }
};

// note: use of class is satirical
// https://github.com/pinojs/pino/pull/433#pullrequestreview-127703127
const constructor = class Pino { };
const prototype = {
    constructor,
    child,
    flush,
    isLevelEnabled,
    get level() {
        return this[getLevelSym]();
    },
    set level(lvl) {
        return this[setLevelSym](lvl);
    },
    get levelVal() {
        return this[levelValSym];
    },
    set levelVal(n) {
        throw Error("levelVal is read-only");
    },
    [lsCacheSym]: initialLsCache,
    [writeSym]: write,
    [asJsonSym]: asJson,
    [getLevelSym]: getLevel,
    [setLevelSym]: setLevel,
    LOG_VERSION: 1
};

Object.setPrototypeOf(prototype, EventEmitter.prototype);

module.exports = prototype;
