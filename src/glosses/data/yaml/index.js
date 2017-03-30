const { lazify } = adone;

const yaml = lazify({
    loader: "./loader",
    dumper: "./dumper",
    type: "./type",
    schema: "./schema",
    Mark: "./mark",
    load: () => yaml.loader.load,
    loadAll: () => yaml.loader.loadAll,
    safeLoad: () => yaml.loader.safeLoad,
    safeLoadAll: () => yaml.loader.safeLoadAll,
    dump: () => yaml.dumper.dump,
    safeDump: () => yaml.dumper.safeDump,
    Exception: "./exception"
}, exports, require);

export const encode = (object, options) => yaml.safeDump(object, options);

export const decode = (string, options) => yaml.safeLoad(string, options);
