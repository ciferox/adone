

const keys = [
    "total", // physical lines of code
    "source", // lines of source
    "comment", // lines with comments
    "single", // lines with single-line comments
    "block", // lines with block comments
    "mixed", // lines mixed up with source and comments
    "empty", // empty lines
    "todo"
];

const nonEmpty = /[^\s]/;
const endOfLine = /$/m;
const newLines = /\n/g;
const emptyLines = /^\s*$/mg;
const todoLines = /^.*TODO.*$/mg;

const getCommentExpressions = function (lang) {

    // single line comments
    let start;
    let stop;
    const single =
        (() => {
            switch (lang) {

                case "coffee":
                case "iced":
                    return /\#[^\{]/; // hashtag not followed by opening curly brace
                case "cr":
                case "py":
                case "ls":
                case "mochi":
                case "nix":
                case "r":
                case "rb":
                case "jl":
                case "pl":
                case "yaml":
                case "hr":
                    return /\#/;
                case "js":
                case "jsx":
                case "c":
                case "cc":
                case "cpp":
                case "cs":
                case "cxx":
                case "h":
                case "m":
                case "mm":
                case "hpp":
                case "hx":
                case "hxx":
                case "ino":
                case "java":
                case "php":
                case "php5":
                case "go":
                case "groovy":
                case "scss":
                case "less":
                case "rs":
                case "sass":
                case "styl":
                case "scala":
                case "swift":
                case "ts":
                case "jade":
                case "gs":
                case "nut":
                case "kt":
                case "kts":
                case "tsx":
                    return /\/{2}/;
                case "lua":
                case "hs":
                    return /--/;
                case "erl":
                    return /\%/;
                case "brs":
                case "monkey":
                case "vb":
                    return /'/;
                case "nim": {
                    const r = new RegExp("\
(?:\
^\
[^\\#]*\
)\
(\
\\#\
)\
(?:\
(?!\
[\\#\\!]\
)\
)\
");
                    r._matchGroup_ = 1; // dirty fix
                    return r;
                }
                case "rkt":
                case "clj":
                case "cljs":
                case "hy":
                case "asm":
                    return /;/;
                default:
                    return null;
            }
        })();

    //# block comments
    switch (lang) {

        case "coffee":
        case "iced":
            start = stop = /\#{3}/;
            break;

        case "js":
        case "jsx":
        case "c":
        case "cc":
        case "cpp":
        case "cs":
        case "cxx":
        case "h":
        case "m":
        case "mm":
        case "hpp":
        case "hx":
        case "hxx":
        case "ino":
        case "java":
        case "ls":
        case "nix":
        case "php":
        case "php5":
        case "go":
        case "css":
        case "sass":
        case "scss":
        case "less":
        case "rs":
        case "styl":
        case "scala":
        case "ts":
        case "gs":
        case "groovy":
        case "nut":
        case "kt":
        case "kts":
        case "tsx":
            start = /\/\*+/;
            stop = /\*\/{1}/;
            break;

        case "python":
        case "py":
            start = stop = /\"{3}|\'{3}/;
            break;

        case "handlebars":
        case "hbs":
        case "mustache":
            start = /\{\{\!/;
            stop = /\}\}/;
            break;

        case "hs":
            start = /\{-/;
            stop = /-\}/;
            break;

        case "html":
        case "htm":
        case "svg":
        case "xml":
            start = /<\!--/;
            stop = /-->/;
            break;

        case "lua":
            start = /--\[{2}/;
            stop = /--\]{2}/;
            break;

        case "monkey":
            start = /#rem/i;
            stop = /#end/i;
            break;

        case "nim":
            // nim has no real block comments but doc comments so we distinguish
            // between single line comments and doc comments
            start = /\#{2}/;
            break;
            // stop is end of line
        case "rb":
            start = /\=begin/;
            stop = /\=end/;
            break;

        case "rkt":
            start = /#\|/;
            stop = /\|#/;
            break;

        case "jl":
            start = /\#\=/;
            stop = /\=\#/;
            break;

        case "ml":
        case "mli":
            start = /\(\*/;
            stop = /\*\)/;
            break;

        default:
            if (Array.from(extensions).includes(lang)) {
                start = stop = null;
            } else {
                throw new TypeError(`File extension '${lang}' is not supported`);
            }
    }

    return {
        start,
        stop,
        single
    };
};

const countMixed = function (res, lines, idx, startIdx, match) {

    if ((nonEmpty.exec(lines[0])) && ((__guard__(res.last, (x) => x.stop) === idx) || (startIdx === idx))) {
        res.mixed.push({
            start: idx,
            stop: idx
        });
    }
    if (match && nonEmpty.exec(lines.slice(-1)[0].substr(0, match.index))) {
        return res.mixed.push({
            start: startIdx,
            stop: startIdx
        });
    }
};

const getStopRegex = function (type, regex) {
    switch (type) {
        case "single":
            return endOfLine;
        case "block":
            return regex || endOfLine;
    }
};

const getType = function (single, start) {
    if (single && !start) {
        return "single";
    } else if (start && !single) {
        return "block";
    } 
    if (start.index <= single.index) {
        return "block";
    } 
    return "single";
        
    
};

const matchIdx = (m) => m.index + m[0].length;

const emptyLns = (c) => __guard__(c.match(emptyLines), (x) => x.length) || 0;

const newLns = (c) => __guard__(c.match(newLines), (x) => x.length) || 0;

const todoLns = (c) => __guard__(c.match(todoLines), (x) => x.length) || 0;

const indexOfGroup = function (match, n) {
    let ix = match.index;
    for (let i = 1, end = n, asc = end >= 1; asc ? i <= end : i >= end; asc ? i++ : i--) {
        ix += match[i].length;
    }
    return ix;
};

const matchDefinedGroup = function (reg, code) {
    let g;
    const res = __guard__(reg, (x) => x.exec(code));
    // This is dirty but it works ;-)
    if (res && (g = __guard__(reg, (x1) => x1._matchGroup_))) {
        res.index = indexOfGroup(res, g);
        res[0] = res[g];
    }
    return res;
};

const countComments = function (code, regex) {

    const myself = function (res, code, idx) {
        if (code === "") {
            return res;
        }
        if (code[0] === "\n") {
            return () => myself(res, code.slice(1), ++idx);
        }

        const start = matchDefinedGroup(regex.start, code);
        const single = matchDefinedGroup(regex.single, code);

        if (!start && !single) {
            countMixed(res, code.split("\n"), idx);
            return res;
        }

        const type = getType(single, start);

        const match = (() => {
            switch (type) {
                case "single":
                    return single;
                case "block":
                    return start;
            }
        })();

        const cStartIdx = matchIdx(match);
        let comment = code.substring(cStartIdx);
        const lines = code.substring(0, match.index).split("\n");
        const startIdx = (lines.length - 1) + idx;
        const stop = matchDefinedGroup((getStopRegex(type, regex.stop)), comment);

        if (!stop) {
            res.error = true;
            return res;
        }

        const empty = emptyLns(code.substring(match.index, cStartIdx + matchIdx(stop)));
        comment = comment.substring(0, stop.index);
        const len = newLns(comment);
        const splitAt = cStartIdx + comment.length + stop[0].length;
        code = code.substring(splitAt);

        countMixed(res, lines, idx, startIdx, match);

        res.last = {
            start: startIdx,
            stop: startIdx + len,
            empty
        };
        res[type].push(res.last);

        return () => myself(res, code, startIdx + len);
    };

    return trampoline(myself({
        single: [],
        block: [],
        mixed: []
    }, code, 0));
};

const trampoline = function (next) {
    while (typeof next === "function") {
        next = next();
    }
    return next;
};

const lineSum = function (comments) {
    let sum = 0;
    for (let i = 0; i < comments.length; i++) {
        const c = comments[i];
        let d = (c.stop - c.start) + 1;
        if (__guard__(comments[i + 1], (x) => x.start) === c.stop) {
            d--;
        }
        sum += d;
    }
    return sum;
};

const slocModule = function (code, lang, opt = {}) {

    if (!adone.is.string(code)) {
        throw new TypeError("'code' has to be a string");
    }

    code = code.replace(/\r\n|\r/g, "\n");
    if (code.slice(-1) === "\n") {
        code = code.slice(0, -1);
    }

    const total = (1 + newLns(code)) || 1;
    const empty = emptyLns(code);
    const res = countComments(code, getCommentExpressions(lang));
    const single = lineSum(res.single);
    const block = lineSum(res.block);
    const mixed = lineSum(res.mixed);
    let comment = block + single;
    const todo = todoLns(code);
    const bIdx = (Array.from(res.block).map((b) => b.stop));
    for (const s of Array.from(res.single)) {
        if (Array.from(bIdx).includes(s.start)) {
            comment--;
        }
    }
    let blockEmpty = 0;
    for (const x of Array.from(res.block)) {
        blockEmpty += x.empty;
    }
    const source = (total - comment - empty) + blockEmpty + mixed;

    if (opt.debug) {
        console.log(res);
    }

    // result
    return {
        total,
        source,
        comment,
        single,
        block,
        mixed,
        empty,
        todo
    };
};

const extensions = [
    "asm",
    "brs",
    "c",
    "cc",
    "clj",
    "cljs",
    "coffee",
    "cpp",
    "cr",
    "cs",
    "css",
    "cxx",
    "erl",
    "go",
    "groovy",
    "gs",
    "h",
    "handlebars", "hbs",
    "hpp",
    "hr",
    "hs",
    "html", "htm",
    "hx",
    "hxx",
    "hy",
    "iced",
    "ino",
    "jade",
    "java",
    "jl",
    "js",
    "jsx",
    "kt",
    "kts",
    "less",
    "lua",
    "ls",
    "ml",
    "mli",
    "mochi",
    "monkey",
    "mustache",
    "nix",
    "nim",
    "nut",
    "php", "php5",
    "pl",
    "py",
    "r",
    "rb",
    "rkt",
    "rs",
    "sass",
    "scala",
    "scss",
    "styl",
    "svg",
    "swift",
    "ts",
    "tsx",
    "vb",
    "xml",
    "yaml",
    "m",
    "mm"
];

slocModule.extensions = extensions;

slocModule.keys = keys;

export default slocModule;

function __guard__(value, transform) {
    return (typeof value !== "undefined" && value !== null) ? transform(value) : undefined;
}
