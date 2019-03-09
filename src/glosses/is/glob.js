const {
    is
} = adone;

const chars = { "{": "}", "(": ")", "[": "]" };

export default (str, strict = true) => {
    // eslint-disable-next-line adone/no-typeof
    if (typeof str !== "string" || str.length === 0) {
        return false;
    }

    if (is.extGlob(str)) {
        return true;
    }

    let regex = /\\(.)|(^!|\*|[\].+)]\?|\[[^\\\]]+\]|\{[^\\}]+\}|\(\?[:!=][^\\)]+\)|\([^|]+\|[^\\)]+\))/;
    let match;

    // optionally relax regex
    if (strict === false) {
        regex = /\\(.)|(^!|[*?{}()[\]]|\(\?)/;
    }

    while ((match = regex.exec(str))) {
        if (match[2]) {
            return true;
        }
        let idx = match.index + match[0].length;

        // if an open bracket/brace/paren is escaped,
        // set the index to the next closing character
        const open = match[1];
        const close = open ? chars[open] : null;
        if (open && close) {
            const n = str.indexOf(close, idx);
            if (n !== -1) {
                idx = n + 1;
            }
        }

        str = str.slice(idx);
    }
    return false;
};
