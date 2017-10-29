const { is, std: { stream }, text: { escape } } = adone;

const createReplaceFn = (replace, isRegEx) => {
    const regexReplaceFunction = (...args) => {
        let newReplace = replace;
        // ability to us $1 with captures
        // Start at 1 and end at length - 2 to avoid the match parameter and offset
        // And string parameters
        const paramLength = arguments.length - 2;
        for (let i = 1; i < paramLength; i++) {
            newReplace = newReplace.replace(new RegExp(`\\$${i}`, "g"), args[i] || "");
        }
        return newReplace;
    };

    if (isRegEx && !(replace instanceof Function)) {
        return regexReplaceFunction;
    }

    if (!(replace instanceof Function)) {
        return () => replace;
    }

    return replace;
};

const matchFromRegex = (regex, options) => {
    if (options.regExpOptions) {
        regex = new RegExp(regex.source, options.regExpOptions);
    }

    // If there is no global flag then there can only be one match
    if (!regex.global) {
        options.limit = 1;
    }
    return regex;
};

const matchFromString = (s, options) => {
    if (options.regExpOptions) {
        return new RegExp(escape.regExpPattern(s), options.regExpOptions);
    }

    return new RegExp(escape.regExpPattern(s), options.ignoreCase === false ? "gm" : "gmi");
};

export default function replaceStream(search, replace, options) {
    let tail = "";
    let totalMatches = 0;
    const isRegex = search instanceof RegExp;

    options = Object.assign({
        limit: Infinity,
        encoding: "utf8",
        maxMatchLen: 100
    }, options);

    let replaceFn = replace;

    replaceFn = createReplaceFn(replace, isRegex);

    let match;
    if (isRegex) {
        match = matchFromRegex(search, options);
    } else {
        match = matchFromString(search, options);
        options.maxMatchLen = search.length;
    }

    const getDataToAppend = function (before, match) {
        let dataToAppend = before;

        totalMatches++;

        dataToAppend += isRegex
            ? replaceFn.apply(this, match.concat([match.index, match.input]))
            : replaceFn(match[0]);

        return dataToAppend;
    };

    const getDataToQueue = (matchCount, haystack, rewritten, lastPos) => {
        if (matchCount > 0) {
            if (haystack.length > tail.length) {
                return rewritten + haystack.slice(lastPos, haystack.length - tail.length);
            }

            return rewritten;
        }

        return haystack.slice(0, haystack.length - tail.length);
    };

    const transform = (buf, enc, cb) => {
        let matches;
        let lastPos = 0;
        let matchCount = 0;
        let rewritten = "";
        const haystack = tail + buf.toString(options.encoding);
        tail = "";

        for (; ;) {
            if (totalMatches >= options.limit) {
                break;
            }
            matches = match.exec(haystack);
            if (is.null(matches)) {
                break;
            }
            matchCount++;
            const before = haystack.slice(lastPos, matches.index);
            const regexMatch = matches;
            lastPos = matches.index + regexMatch[0].length;

            if (lastPos > haystack.length && regexMatch[0].length < options.maxMatchLen) {
                tail = regexMatch[0];
            } else {
                const dataToAppend = getDataToAppend(before, regexMatch);
                rewritten += dataToAppend;
            }
        }

        if (tail.length < 1) {
            tail = haystack.slice(lastPos).length > options.maxMatchLen
                ? haystack.slice(lastPos).slice(0 - options.maxMatchLen)
                : haystack.slice(lastPos);
        }

        const dataToQueue = getDataToQueue(matchCount, haystack, rewritten, lastPos);
        cb(null, dataToQueue);
    };

    const flush = function (cb) {
        if (tail) {
            this.push(tail);
        }
        cb();
    };

    return new stream.Transform({ transform, flush });
}
