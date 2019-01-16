const stdSerializers = require("./serializers");
const redaction = require("./redaction");
const time = require("./time");
const proto = require("./proto");
const symbols = require("./symbols");
const { assertDefaultLevelFound, mappings, genLsCache } = require("./levels");
const {
    createArgsNormalizer,
    asChindings,
    final,
    stringify,
    buildSafeSonicBoom
} = require("./tools");

const {
    is,
    std: { os }
} = adone;

const LOG_VERSION = 1;

const {
    chindingsSym,
    redactFmtSym,
    serializersSym,
    timeSym,
    streamSym,
    stringifySym,
    stringifiersSym,
    setLevelSym,
    endSym,
    formatOptsSym,
    messageKeyStringSym,
    useLevelLabelsSym,
    changeLevelNameSym,
    useOnlyCustomLevelsSym
} = symbols;
const { epochTime, nullTime } = time;
const { pid } = process;
const hostname = os.hostname();
const defaultErrorSerializer = stdSerializers.err;
const defaultOptions = {
    level: "info",
    useLevelLabels: false,
    messageKey: "msg",
    enabled: true,
    prettyPrint: false,
    base: { pid, hostname },
    serializers: Object.assign(Object.create(null), {
        err: defaultErrorSerializer
    }),
    timestamp: epochTime,
    name: undefined,
    redact: null,
    customLevels: null,
    changeLevelName: "level",
    useOnlyCustomLevels: false
};

const normalize = createArgsNormalizer(defaultOptions);

const serializers = Object.assign(Object.create(null), stdSerializers);

const pino = function (...args) {
    const { opts, stream } = normalize(...args);
    const {
        redact,
        crlf,
        serializers,
        timestamp,
        messageKey,
        base,
        name,
        level,
        customLevels,
        useLevelLabels,
        changeLevelName,
        useOnlyCustomLevels
    } = opts;

    const stringifiers = redact ? redaction(redact, stringify) : {};
    const formatOpts = redact
        ? { stringify: stringifiers[redactFmtSym] }
        : { stringify };
    const messageKeyString = `,"${messageKey}":`;
    const end = `,"v":${LOG_VERSION}}${crlf ? "\r\n" : "\n"}`;
    const coreChindings = asChindings.bind(null, {
        [chindingsSym]: "",
        [serializersSym]: serializers,
        [stringifiersSym]: stringifiers,
        [stringifySym]: stringify
    });
    const chindings = is.null(base) ? "" : (is.undefined(name))
        ? coreChindings(base) : coreChindings(Object.assign({}, base, { name }));
    const time = (timestamp instanceof Function)
        ? timestamp : (timestamp ? epochTime : nullTime);

    if (useOnlyCustomLevels && !customLevels) {
        throw Error("customLevels is required if useOnlyCustomLevels is set true");
    }

    assertDefaultLevelFound(level, customLevels, useOnlyCustomLevels);
    const levels = mappings(customLevels, useOnlyCustomLevels);

    const instance = {
        levels,
        [useLevelLabelsSym]: useLevelLabels,
        [changeLevelNameSym]: changeLevelName,
        [useOnlyCustomLevelsSym]: useOnlyCustomLevels,
        [streamSym]: stream,
        [timeSym]: time,
        [stringifySym]: stringify,
        [stringifiersSym]: stringifiers,
        [endSym]: end,
        [formatOptsSym]: formatOpts,
        [messageKeyStringSym]: messageKeyString,
        [serializersSym]: serializers,
        [chindingsSym]: chindings
    };
    Object.setPrototypeOf(instance, proto);

    if (customLevels || useLevelLabels || changeLevelName !== defaultOptions.changeLevelName) {
        genLsCache(instance);
    }

    instance[setLevelSym](level);

    return instance;
};

pino.extreme = (dest = process.stdout.fd) => buildSafeSonicBoom(dest, 4096, false);
pino.destination = (dest = process.stdout.fd) => buildSafeSonicBoom(dest, 0, true);

pino.final = final;
pino.levels = mappings();
pino.stdSerializers = serializers;
pino.stdTimeFunctions = Object.assign({}, time);
pino.symbols = symbols;
pino.pretty = require("./pretty");
pino.LOG_VERSION = LOG_VERSION;

module.exports = pino;
