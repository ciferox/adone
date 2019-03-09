const {
    is,
    fs: { dirname }
} = adone;

export default (str) => {
    // flip windows path separators
    if (is.windows && !str.includes("/")) {
        str = str.split("\\").join("/");
    }

    // special case for strings ending in enclosure containing path separator
    if (/[{[].*[/]*.*[}\]]$/.test(str)) {
        str += "/";
    }

    // preserves full path in case of trailing path separator
    str += "a";

    // remove path parts that are globby
    do {
        str = dirname(str);
    } while (is.glob(str) || /(^|[^\\])([{[]|\([^)]+$)/.test(str));

    // remove escape chars and return result
    return str.replace(/\\([*?|[\](){}])/g, "$1");
};
