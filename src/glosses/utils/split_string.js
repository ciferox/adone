const {
    x,
    is
} = adone;

const getClosingQuote = (str, ch, i) => {
    const idx = str.indexOf(ch, i);
    if (str.charAt(idx - 1) === "\\") {
        return getClosingQuote(str, ch, idx + 1);
    }
    return idx;
};

const keepQuotes = (ch, opts) => {
    if (opts.keepDoubleQuotes === true && (ch === '"' || ch === "“" || ch === "”")) {
        return true;
    }
    if (opts.keepSingleQuotes === true && ch === "'") {
        return true;
    }
    return opts.keepQuotes;
};

const keepEscaping = (opts, str, idx) => {
    if (is.function(opts.keepEscaping)) {
        return opts.keepEscaping(str, idx);
    }
    return opts.keepEscaping === true || str[idx + 1] === "\\";
};

export default function splitString(str, options, fn) {
    if (!is.string(str)) {
        throw new x.InvalidArgument("Expected a string");
    }

    if (is.function(options)) {
        fn = options;
        options = null;
    }

    // allow separator to be defined as a string
    if (is.string(options)) {
        options = { sep: options };
    }

    const opts = { sep: ".", ...options };
    let quotes = opts.quotes || {
        '"': '"',
        "'": "'",
        "`": "`",
        "“": "”"
    };
    if (is.array(quotes)) {
        quotes = quotes.reduce((acc, ele) => {
            acc[ele] = ele;
            return acc;
        }, {});
    }

    let brackets;

    if (opts.brackets === true) {
        brackets = {
            "<": ">",
            "(": ")",
            "[": "]",
            "{": "}"
        };
    } else if (opts.brackets) {
        brackets = opts.brackets;
    }

    const tokens = [];
    const stack = [];
    const arr = [""];
    const sep = opts.sep;
    const len = str.length;
    let idx = -1;
    let closeIdx;

    const expected = () => {
        if (brackets && stack.length) {
            return brackets[stack[stack.length - 1]];
        }
    };

    while (++idx < len) {
        let ch = str[idx];
        const next = str[idx + 1];
        const tok = { val: ch, idx, arr, str };
        tokens.push(tok);

        if (ch === "\\") {
            tok.val = keepEscaping(opts, str, idx) === true ? (ch + next) : next;
            tok.escaped = true;
            if (is.function(fn)) {
                fn(tok);
            }
            arr[arr.length - 1] += tok.val;
            idx++;
            continue;
        }

        if (brackets && brackets[ch]) {
            stack.push(ch);
            let e = expected();
            let i = idx + 1;

            if (str.indexOf(e, i + 1) !== -1) {
                while (stack.length && i < len) {
                    let s = str[++i];
                    if (s === "\\") {
                        s++;
                        continue;
                    }

                    if (quotes[s]) {
                        i = getClosingQuote(str, quotes[s], i + 1);
                        continue;
                    }

                    e = expected();
                    if (stack.length && str.indexOf(e, i + 1) === -1) {
                        break;
                    }

                    if (brackets[s]) {
                        stack.push(s);
                        continue;
                    }

                    if (e === s) {
                        stack.pop();
                    }
                }
            }

            closeIdx = i;
            if (closeIdx === -1) {
                arr[arr.length - 1] += ch;
                continue;
            }

            ch = str.slice(idx, closeIdx + 1);
            tok.val = ch;
            tok.idx = idx = closeIdx;
        }

        if (quotes[ch]) {
            closeIdx = getClosingQuote(str, quotes[ch], idx + 1);
            if (closeIdx === -1) {
                arr[arr.length - 1] += ch;
                continue;
            }

            if (keepQuotes(ch, opts) === true) {
                ch = str.slice(idx, closeIdx + 1);
            } else {
                ch = str.slice(idx + 1, closeIdx);
            }

            tok.val = ch;
            tok.idx = idx = closeIdx;
        }

        if (is.function(fn)) {
            fn(tok, tokens);
            ch = tok.val;
            idx = tok.idx;
        }

        if (tok.val === sep && tok.split !== false) {
            arr.push("");
            continue;
        }

        arr[arr.length - 1] += tok.val;
    }

    return arr;
}
