import adone from "adone";
const { is, std: { path } } = adone;

const getRegExpMatch = (reg, str) => {
    const m = str.match(reg);
    return m ? m[0] : null;
};

const balancedMatch = (a, b, str) => {
    if (a instanceof RegExp) {
        a = getRegExpMatch(a, str);
    }
    if (b instanceof RegExp) {
        b = getRegExpMatch(b, str);
    }

    const r = balancedMatch.range(a, b, str);

    return r && {
        start: r[0],
        end: r[1],
        pre: str.slice(0, r[0]),
        body: str.slice(r[0] + a.length, r[1]),
        post: str.slice(r[1] + b.length)
    };
};

balancedMatch.range = (a, b, str) => {
    let begs;
    let beg;
    let left;
    let right;
    let result;
    let ai = str.indexOf(a);
    let bi = str.indexOf(b, ai + 1);
    let i = ai;

    if (ai >= 0 && bi > 0) {
        begs = [];
        left = str.length;

        while (i >= 0 && !result) {
            if (i === ai) {
                begs.push(i);
                ai = str.indexOf(a, i + 1);
            } else if (begs.length === 1) {
                result = [begs.pop(), bi];
            } else {
                beg = begs.pop();
                if (beg < left) {
                    left = beg;
                    right = bi;
                }

                bi = str.indexOf(b, i + 1);
            }

            i = ai < bi && ai >= 0 ? ai : bi;
        }

        if (begs.length) {
            result = [left, right];
        }
    }

    return result;
};

const escSlash = `\0SLASH${Math.random()}\0`;
const escOpen = `\0OPEN${Math.random()}\0`;
const escClose = `\0CLOSE${Math.random()}\0`;
const escComma = `\0COMMA${Math.random()}\0`;
const escPeriod = `\0PERIOD${Math.random()}\0`;

const escapeEscapedBraces = (str) => {
    return str.split("\\\\").join(escSlash)
        .split("\\{").join(escOpen)
        .split("\\}").join(escClose)
        .split("\\,").join(escComma)
        .split("\\.").join(escPeriod);
};

const unescapeEscapedBraces = (str) => {
    return str.split(escSlash).join("\\")
        .split(escOpen).join("{")
        .split(escClose).join("}")
        .split(escComma).join(",")
        .split(escPeriod).join(".");
};

// Basically just str.split(","), but don't touch braced sections:
// "a,{b,c}" => ["a", "{b,c}"]
const parseCommaParts = (str) => {
    if (!str) {
        return [""];
    }

    const parts = [];
    const m = balancedMatch("{", "}", str);

    if (!m) {
        return str.split(",");
    }

    const pre = m.pre;
    const body = m.body;
    const post = m.post;
    const p = pre.split(",");

    p[p.length - 1] += `{${body}}`;
    const postParts = parseCommaParts(post);
    if (post.length) {
        p[p.length - 1] += postParts.shift();
        p.push.apply(p, postParts);
    }

    parts.push.apply(parts, p);

    return parts;
};

const concatMap = (xs, fn) => {
    const res = [];
    for (let i = 0; i < xs.length; i++) {
        const x = fn(xs[i], i);
        if (is.array(x)) {
            res.push.apply(res, x);
        } else {
            res.push(x);
        }
    }
    return res;
};

const numeric = (str) => {
    // eslint-disable-next-line eqeqeq
    return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
};

const expandBraces = (str, isTop) => {
    const expansions = [];

    const m = balancedMatch("{", "}", str);
    if (!m || /\$$/.test(m.pre)) {
        return [str];
    }

    const isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
    const isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
    const isSequence = isNumericSequence || isAlphaSequence;
    const isOptions = /^(.*,)+(.+)?$/.test(m.body);
    if (!isSequence && !isOptions) {
        // {a},b}
        if (m.post.match(/,.*\}/)) {
            str = `${m.pre}{${m.body}${escClose}${m.post}`;
            return expandBraces(str);
        }
        return [str];
    }

    let n;
    if (isSequence) {
        n = m.body.split(/\.\./);
    } else {
        n = parseCommaParts(m.body);
        if (n.length === 1) {
            // x{{a,b}}y ==> x{a}y x{b}y
            n = expandBraces(n[0], false).map((x) => `{${x}}`);
            if (n.length === 1) {
                const post = m.post.length ? expandBraces(m.post, false) : [""];
                return post.map((p) => {
                    return m.pre + n[0] + p;
                });
            }
        }
    }

    // at this point, n is the parts, and we know it's not a comma set
    // with a single entry.

    // no need to expand pre, since it is guaranteed to be free of brace-sets
    const pre = m.pre;
    const post = m.post.length ? expandBraces(m.post, false) : [""];

    let N;

    if (isSequence) {
        const x = numeric(n[0]);
        const y = numeric(n[1]);
        const width = Math.max(n[0].length, n[1].length);
        let incr = n.length === 3 ? Math.abs(numeric(n[2])) : 1;

        let test = (a, b) => a <= b;

        const reverse = y < x;
        if (reverse) {
            incr = -incr;
            test = (a, b) => a >= b;
        }
        const isPadded = n.some((x) => /^-?0\d/.test(x));

        N = [];

        for (let i = x; test(i, y); i += incr) {
            let c;
            if (isAlphaSequence) {
                c = String.fromCharCode(i);
                if (c === "\\") {
                    c = "";
                }
            } else {
                c = String(i);
                if (isPadded) {
                    const need = width - c.length;
                    if (need > 0) {
                        const z = new Array(need + 1).join("0");
                        if (i < 0) {
                            c = `-${z}${c.slice(1)}`;
                        } else {
                            c = z + c;
                        }
                    }
                }
            }
            N.push(c);
        }
    } else {
        N = concatMap(n, (el) => {
            return expandBraces(el, false);
        });
    }

    for (let j = 0; j < N.length; j++) {
        for (let k = 0; k < post.length; k++) {
            const expansion = pre + N[j] + post[k];
            if (!isTop || isSequence || expansion) {
                expansions.push(expansion);
            }
        }
    }

    return expansions;
};

// any single thing other than /
// don't need to escape / when using new RegExp()
const qmark = "[^/]";

// * => any number of characters
const star = `${qmark}*?`;

// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
const twoStarDot = "(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?";

// not a ^ or / followed by a dot,
// followed by anything, any number of times.
const twoStarNoDot = "(?:(?!(?:\\\/|^)\\.).)*?";

// "abc" -> { a:true, b:true, c:true }
const charSet = (s) => {
    return s.split("").reduce((set, c) => {
        set[c] = true;
        return set;
    }, {});
};

// characters that need to be escaped in RegExp.
const reSpecials = charSet("().*{}+?[]^$\\!");

// normalizes slashes.
const slashSplit = /\/+/;

// replace stuff like \* with *
const globUnescape = (s) => {
    return s.replace(/\\(.)/g, "$1");
};

const regExpEscape = (s) => {
    return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

const SUBPARSE = {};

const plTypes = {
    "!": { open: "(?:(?!(?:", close: "))[^/]*?)" },
    "?": { open: "(?:", close: ")?" },
    "+": { open: "(?:", close: ")+" },
    "*": { open: "(?:", close: ")*" },
    "@": { open: "(?:", close: ")" }
};

export default class GlobExp {
    static GLOBSTAR = {};

    constructor(pattern, options = {}) {
        if (!is.string(pattern)) {
            throw new TypeError("glob pattern string required");
        }

        pattern = pattern.trim();

        // windows support: need to use /, not \
        if (path.sep !== "/") {
            pattern = pattern.split(path.sep).join("/");
        }

        this.options = options;
        this.set = [];
        this.pattern = pattern;
        this.regexp = null;
        this.negate = false;
        this.comment = false;
        this.empty = false;
        this._builded = false;

        // make the set of regexps etc.
        this._build();
    }

    static hasMagic(pattern, options = {}) {
        const set = new GlobExp(pattern, options).set;
        if (set.length > 1) {
            return true;
        }

        for (let i = 0; i < set[0].length; i++) {
            if (!is.string(set[0][i])) {
                return true;
            }
        }

        return false;
    }

    _build() {
        if (this._builded) {
            return;
        }

        const pattern = this.pattern;
        const options = this.options;

        // empty patterns and comments match nothing.
        if (!options.nocomment && pattern.charAt(0) === "#") {
            this.comment = true;
            return;
        }
        if (!pattern) {
            this.empty = true;
            return;
        }

        // step 1: figure out negation, etc.
        this.parseNegate();

        // step 2: expand braces
        let set = this.globSet = this.expandBraces();

        // step 3: now we have a set, so turn each one into a series of path-portion
        // matching patterns.
        // These will be regexps, except in the case of "**", which is
        // set to the GLOBSTAR object for globstar behavior,
        // and will not contain any / characters
        set = this.globParts = set.map((s) => {
            return s.split(slashSplit);
        });

        // glob --> regexps
        set = set.map((s) => {
            return s.map(this.parse, this);
        });

        // filter out everything that didn't compile properly.
        set = set.filter((s) => {
            return s.indexOf(false) === -1;
        });

        this.set = set;
        this._builded = true;
    }

    parseNegate() {
        const pattern = this.pattern;
        let negate = false;
        const options = this.options;
        let negateOffset = 0;

        if (options.nonegate) {
            return;
        }

        for (let i = 0, l = pattern.length; i < l && pattern.charAt(i) === "!"; i++) {
            negate = !negate;
            negateOffset++;
        }

        if (negateOffset) {
            this.pattern = pattern.substr(negateOffset);
        }
        this.negate = negate;
    }

    // Brace expansion:
    // a{b,c}d -> abd acd
    // a{b,}c -> abc ac
    // a{0..3}d -> a0d a1d a2d a3d
    // a{b,c{d,e}f}g -> abg acdfg acefg
    // a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
    //
    // Invalid sets are not expanded.
    // a{2..}b -> a{2..}b
    // a{b}c -> a{b}c
    static expandBraces(pattern, options = {}) {
        if (is.undefined(pattern)) {
            throw new TypeError("undefined pattern");
        }

        if (options.nobrace || !pattern.match(/\{.*\}/)) {
            return [pattern];
        }

        // I don't know why Bash 4.3 does this, but it does.
        // Anything starting with {} will have the first two bytes preserved
        // but *only* at the top level, so {},a}b will not expand to anything,
        // but a{},b}c will be expanded to [a}c,abc].
        // One could argue that this is a bug in Bash, but since the goal of
        // this module is to match Bash's rules, we escape a leading {}
        if (pattern.substr(0, 2) === "{}") {
            pattern = `\\{\\}${pattern.substr(2)}`;
        }

        return expandBraces(escapeEscapedBraces(pattern), true)
            .map(unescapeEscapedBraces);
    }

    expandBraces() {
        return GlobExp.expandBraces(this.pattern, this.options);
    }

    // parse a component of the expanded set.
    // At this point, no pattern may contain "/" in it
    // so we're going to return a 2d array, where each entry is the full
    // pattern, split on '/', and then turned into a regular expression.
    // A regexp is made at the end which joins each array with an
    // escaped /, and another full one which joins each regexp with |.
    //
    // Following the lead of Bash 4.1, note that "**" only has special meaning
    // when it is the *only* thing in a path portion.  Otherwise, any series
    // of * is equivalent to a single *.  Globstar behavior is enabled by
    // default, and can be disabled by setting options.noglobstar.
    parse(pattern, isSub) {
        if (pattern.length > 1024 * 64) {
            throw new TypeError("pattern is too long");
        }

        const options = this.options;

        if (!options.noglobstar && pattern === "**") {
            return GlobExp.GLOBSTAR;
        }
        if (pattern === "") {
            return "";
        }

        let re = "";
        let hasMagic = Boolean(options.nocase);
        let escaping = false;
        // ? => one single character
        const patternListStack = [];
        const negativeLists = [];
        let stateChar;
        let inClass = false;
        let reClassStart = -1;
        let classStart = -1;
        // . and .. never match anything that doesn't start with .,
        // even when options.dot is set.
        const patternStart = pattern.charAt(0) === "." ? "" // anything
            // not (start or / followed by . or .. followed by / or end)
            : options.dot ? "(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))"
                : "(?!\\.)";

        const clearStateChar = () => {
            if (stateChar) {
                // we had some state-tracking character
                // that wasn't consumed by this pass.
                switch (stateChar) {
                    case "*":
                        re += star;
                        hasMagic = true;
                        break;
                    case "?":
                        re += qmark;
                        hasMagic = true;
                        break;
                    default:
                        re += `\\${stateChar}`;
                        break;
                }
                stateChar = false;
            }
        };

        for (let i = 0, len = pattern.length, c; (i < len) && (c = pattern.charAt(i)); i++) {
            // skip over any that are escaped.
            if (escaping && reSpecials[c]) {
                re += `\\${c}`;
                escaping = false;
                continue;
            }

            switch (c) {
                case "/":
                    // completely not allowed, even escaped.
                    // Should already be path-split by now.
                    return false;

                case "\\":
                    clearStateChar();
                    escaping = true;
                    continue;

                // the various stateChar values
                // for the "extglob" stuff.
                case "?":
                case "*":
                case "+":
                case "@":
                case "!":
                    // all of those are literals inside a class, except that
                    // the glob [!a] means [^a] in regexp
                    if (inClass) {
                        if (c === "!" && i === classStart + 1) {
                            c = "^";
                        }
                        re += c;
                        continue;
                    }

                    // if we already have a stateChar, then it means
                    // that there was something like ** or +? in there.
                    // Handle the stateChar, then proceed with this one.
                    clearStateChar();
                    stateChar = c;
                    // if extglob is disabled, then +(asdf|foo) isn't a thing.
                    // just clear the statechar *now*, rather than even diving into
                    // the patternList stuff.
                    if (options.noext) {
                        clearStateChar();
                    }
                    continue;

                case "(":
                    if (inClass) {
                        re += "(";
                        continue;
                    }

                    if (!stateChar) {
                        re += "\\(";
                        continue;
                    }

                    patternListStack.push({
                        type: stateChar,
                        start: i - 1,
                        reStart: re.length,
                        open: plTypes[stateChar].open,
                        close: plTypes[stateChar].close
                    });
                    // negation is (?:(?!js)[^/]*)
                    re += stateChar === "!" ? "(?:(?!(?:" : "(?:";
                    stateChar = false;
                    continue;

                case ")": {
                    if (inClass || !patternListStack.length) {
                        re += "\\)";
                        continue;
                    }

                    clearStateChar();
                    hasMagic = true;
                    const pl = patternListStack.pop();
                    // negation is (?:(?!js)[^/]*)
                    // The others are (?:<pattern>)<type>
                    re += pl.close;
                    if (pl.type === "!") {
                        negativeLists.push(pl);
                    }
                    pl.reEnd = re.length;
                    continue;
                }
                case "|":
                    if (inClass || !patternListStack.length || escaping) {
                        re += "\\|";
                        escaping = false;
                        continue;
                    }

                    clearStateChar();
                    re += "|";
                    continue;

                // these are mostly the same in regexp and glob
                case "[":
                    // swallow any state-tracking char before the [
                    clearStateChar();

                    if (inClass) {
                        re += `\\${c}`;
                        continue;
                    }

                    inClass = true;
                    classStart = i;
                    reClassStart = re.length;
                    re += c;
                    continue;

                case "]": {
                    //  a right bracket shall lose its special
                    //  meaning and represent itself in
                    //  a bracket expression if it occurs
                    //  first in the list.  -- POSIX.2 2.8.3.2
                    if (i === classStart + 1 || !inClass) {
                        re += `\\${c}`;
                        escaping = false;
                        continue;
                    }

                    // handle the case where we left a class open.
                    // "[z-a]" is valid, equivalent to "\[z-a\]"
                    if (inClass) {
                        // split where the last [ was, make sure we don't have
                        // an invalid re. if so, re-walk the contents of the
                        // would-be class to re-translate any characters that
                        // were passed through as-is
                        // TODO: It would probably be faster to determine this
                        // without a try/catch and a new RegExp, but it's tricky
                        // to do safely.  For now, this is safe and works.
                        const cs = pattern.substring(classStart + 1, i);
                        try {
                            RegExp(`[${cs}]`);
                        } catch (er) {
                            // not a valid class!
                            const sp = this.parse(cs, SUBPARSE);
                            re = `${re.substr(0, reClassStart)}\\[${sp[0]}\\]`;
                            hasMagic = hasMagic || sp[1];
                            inClass = false;
                            continue;
                        }
                    }

                    // finish up the class.
                    hasMagic = true;
                    inClass = false;
                    re += c;
                    continue;
                }
                default:
                    // swallow any state char that wasn't consumed
                    clearStateChar();

                    if (escaping) {
                        escaping = false;
                    } else if (reSpecials[c]
                        && !(c === "^" && inClass)) {
                        re += "\\";
                    }

                    re += c;

            } // switch
        } // for

        // handle the case where we left a class open.
        // "[abc" is valid, equivalent to "\[abc"
        if (inClass) {
            // split where the last [ was, and escape it
            // this is a huge pita.  We now have to re-walk
            // the contents of the would-be class to re-translate
            // any characters that were passed through as-is
            const cs = pattern.substr(classStart + 1);
            const sp = this.parse(cs, SUBPARSE);
            re = `${re.substr(0, reClassStart)}\\[${sp[0]}`;
            hasMagic = hasMagic || sp[1];
        }

        // handle the case where we had a +( thing at the *end*
        // of the pattern.
        // each pattern list stack adds 3 chars, and we need to go through
        // and escape any | chars that were passed through as-is for the regexp.
        // Go through and escape them, taking care not to double-escape any
        // | chars that were already escaped.
        for (let pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
            let tail = re.slice(pl.reStart + pl.open.length);
            // maybe some even number of \, then maybe 1 \, followed by a |
            tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, (_, $1, $2) => {
                if (!$2) {
                    // the | isn't already escaped, so escape it.
                    $2 = "\\";
                }

                // need to escape all those slashes *again*, without escaping the
                // one that we need for escaping the | character.  As it works out,
                // escaping an even number of slashes can be done by simply repeating
                // it exactly after itself.  That's why this trick works.
                //
                // I am sorry that you have to see this.
                return `${$1 + $1 + $2}|`;
            });

            const t = pl.type === "*" ? star
                : pl.type === "?" ? qmark
                    : `\\${pl.type}`;

            hasMagic = true;
            re = `${re.slice(0, pl.reStart) + t}\\(${tail}`;
        }

        // handle trailing things that only matter at the very end.
        clearStateChar();
        if (escaping) {
            // trailing \\
            re += "\\\\";
        }

        // only need to apply the nodot start if the re starts with
        // something that could conceivably capture a dot
        let addPatternStart = false;
        switch (re.charAt(0)) {
            case ".":
            case "[":
            case "(": addPatternStart = true;
        }

        // Hack to work around lack of negative lookbehind in JS
        // A pattern like: *.!(x).!(y|z) needs to ensure that a name
        // like 'a.xyz.yz' doesn't match.  So, the first negative
        // lookahead, has to look ALL the way ahead, to the end of
        // the pattern.
        for (let n = negativeLists.length - 1; n > -1; n--) {
            const nl = negativeLists[n];

            const nlBefore = re.slice(0, nl.reStart);
            const nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
            let nlLast = re.slice(nl.reEnd - 8, nl.reEnd);
            let nlAfter = re.slice(nl.reEnd);

            nlLast += nlAfter;

            // Handle nested stuff like *(*.js|!(*.json)), where open parens
            // mean that we should *not* include the ) in the bit that is considered
            // "after" the negated section.
            const openParensBefore = nlBefore.split("(").length - 1;
            let cleanAfter = nlAfter;
            for (let i = 0; i < openParensBefore; i++) {
                cleanAfter = cleanAfter.replace(/\)[+*?]?/, "");
            }
            nlAfter = cleanAfter;

            let dollar = "";
            if (nlAfter === "" && isSub !== SUBPARSE) {
                dollar = "$";
            }
            const newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
            re = newRe;
        }

        // if the re is not "" at this point, then we need to make sure
        // it doesn't match against an empty path part.
        // Otherwise a/* will match a/, which it should not.
        if (re !== "" && hasMagic) {
            re = `(?=.)${re}`;
        }

        if (addPatternStart) {
            re = patternStart + re;
        }

        // parsing just a piece of a larger pattern.
        if (isSub === SUBPARSE) {
            return [re, hasMagic];
        }

        // skip the regexp for non-magical patterns
        // unescape anything in it, though, so that it'll be
        // an exact match against a file etc.
        if (!hasMagic) {
            return globUnescape(pattern);
        }

        const flags = options.nocase ? "i" : "";
        let regExp;
        try {
            regExp = new RegExp(`^${re}$`, flags);
        } catch (er) {
            // If it was an invalid regular expression, then it can't match
            // anything.  This trick looks for a character after the end of
            // the string, which is of course impossible, except in multi-line
            // mode, but it's not a /m regex.
            return new RegExp("$.");
        }

        regExp._glob = pattern;
        regExp._src = re;

        return regExp;
    }

    static makeRe(pattern, options) {
        return new GlobExp(pattern, options || {}).makeRe();
    }

    makeRe() {
        if (this.regexp || this.regexp === false) {
            return this.regexp;
        }

        // at this point, this.set is a 2d array of partial
        // pattern strings, or "**".
        const set = this.set;

        if (!set.length) {
            this.regexp = false;
            return this.regexp;
        }
        const options = this.options;

        const twoStar = options.noglobstar ? star : options.dot ? twoStarDot : twoStarNoDot;
        const flags = options.nocase ? "i" : "";

        let re = set.map((pattern) => {
            return pattern.map((p) => {
                return (p === GlobExp.GLOBSTAR) ? twoStar
                    : is.string(p) ? regExpEscape(p)
                        : p._src;
            }).join("\\\/");
        }).join("|");

        // must match entire pattern
        // ending in a * or ** will make it less strict.
        re = `^(?:${re})$`;

        // can match anything, as long as it's not this.
        if (this.negate) {
            re = `^(?!${re}).*$`;
        }

        try {
            this.regexp = new RegExp(re, flags);
        } catch (ex) {
            this.regexp = false;
        }
        return this.regexp;
    }

    static test(p, pattern, options = {}) {
        if (!is.string(pattern)) {
            throw new TypeError("glob pattern string required");
        }

        if (!options.nocomment && pattern.charAt(0) === "#") {
            return false;
        }

        // "" only matches ""
        if (pattern.trim() === "") {
            return p === "";
        }

        return new GlobExp(pattern, options).test(p);
    }

    test(f, partial) {
        if (this.comment) {
            return false;
        }
        if (this.empty) {
            return f === "";
        }

        if (f === "/" && partial) {
            return true;
        }

        const options = this.options;

        // windows: need to use /, not \
        if (path.sep !== "/") {
            f = f.split(path.sep).join("/");
        }

        // treat the test path as a set of pathparts.
        f = f.split(slashSplit);

        // just ONE of the pattern sets in this.set needs to match
        // in order for it to be valid.  If negating, then just one
        // match means that we have failed.
        // Either way, return on the first hit.

        const set = this.set;

        // Find the basename of the path by looking for the last non-empty segment
        let filename;
        let i;
        for (i = f.length - 1; i >= 0; i--) {
            filename = f[i];
            if (filename) {
                break;
            }
        }

        for (i = 0; i < set.length; i++) {
            const pattern = set[i];
            let file = f;
            if (options.matchBase && pattern.length === 1) {
                file = [filename];
            }
            const hit = this._matchOne(file, pattern, partial);
            if (hit) {
                if (options.flipNegate) {
                    return true;
                }
                return !this.negate;
            }
        }

        // didn't get any hits.  this is success if it's a negative
        // pattern, failure otherwise.
        if (options.flipNegate) {
            return false;
        }
        return this.negate;
    }

    // set partial to true to test if, for example,
    // "/a/b" matches the start of "/*/b/*/d"
    // Partial means, if you run out of file before you run
    // out of pattern, then that's fine, as long as all
    // the parts match.
    _matchOne(file, pattern, partial) {
        const options = this.options;

        let fi = 0;
        let pi = 0;
        const fl = file.length;
        const pl = pattern.length;
        for (; (fi < fl) && (pi < pl); fi++, pi++) {
            const p = pattern[pi];
            const f = file[fi];

            if (p === GlobExp.GLOBSTAR) {
                // "**"
                // a/**/b/**/c would match the following:
                // a/b/x/y/z/c
                // a/x/y/z/b/c
                // a/b/x/b/x/c
                // a/b/c
                // To do this, take the rest of the pattern after
                // the **, and see if it would match the file remainder.
                // If so, return success.
                // If not, the ** "swallows" a segment, and try again.
                // This is recursively awful.
                //
                // a/**/b/**/c matching a/b/x/y/z/c
                // - a matches a
                // - doublestar
                //   - _matchOne(b/x/y/z/c, b/**/c)
                //     - b matches b
                //     - doublestar
                //       - _matchOne(x/y/z/c, c) -> no
                //       - _matchOne(y/z/c, c) -> no
                //       - _matchOne(z/c, c) -> no
                //       - _matchOne(c, c) yes, hit
                let fr = fi;
                const pr = pi + 1;
                if (pr === pl) {
                    // a ** at the end will just swallow the rest.
                    // We have found a match.
                    // however, it will not swallow /.x, unless
                    // options.dot is set.
                    // . and .. are *never* matched by **, for explosively
                    // exponential reasons.
                    for (; fi < fl; fi++) {
                        if (file[fi] === "." || file[fi] === ".." ||
                            (!options.dot && file[fi].charAt(0) === ".")) {
                            return false;
                        }
                    }
                    return true;
                }

                // ok, let's see if we can swallow whatever we can.
                while (fr < fl) {
                    const swallowee = file[fr];

                    // XXX remove this slice.  Just pass the start index.
                    if (this._matchOne(file.slice(fr), pattern.slice(pr), partial)) {
                        return true;
                    } else {
                        // can't swallow "." or ".." ever.
                        // can only swallow ".foo" when explicitly asked.
                        if (swallowee === "." || swallowee === ".." ||
                            (!options.dot && swallowee.charAt(0) === ".")) {
                            break;
                        }

                        // ** swallows a segment, and continue.
                        fr++;
                    }
                }

                // no match was found.
                // However, in partial mode, we can't say this is necessarily over.
                // If there's more *pattern* left, then
                if (partial) {
                    // ran out of file
                    if (fr === fl) {
                        return true;
                    }
                }
                return false;
            }

            // something other than **
            // non-magic patterns just have to match exactly
            // patterns with magic have been turned into regexps.
            let hit;
            if (is.string(p)) {
                if (options.nocase) {
                    hit = f.toLowerCase() === p.toLowerCase();
                } else {
                    hit = f === p;
                }
            } else {
                hit = f.match(p);
            }

            if (!hit) {
                return false;
            }
        }

        // Note: ending in / means that we'll get a final ""
        // at the end of the pattern.  This can only match a
        // corresponding "" at the end of the file.
        // If the file ends in /, then it can only match a
        // a pattern that ends in /, unless the pattern just
        // doesn't have any more for it. But, a/b/ should *not*
        // match "a/b/*", even though "" matches against the
        // [^/]*? pattern, except in partial mode, where it might
        // simply not be reached yet.
        // However, a/b/ should still satisfy a/*

        // now either we fell off the end of the pattern, or we're done.
        if (fi === fl && pi === pl) {
            // ran out of pattern and filename at the same time.
            // an exact hit!
            return true;
        } else if (fi === fl) {
            // ran out of file, but still had pattern left.
            // this is ok if we're doing the match as part of
            // a glob fs traversal.
            return partial;
        } else if (pi === pl) {
            // ran out of pattern, still have file left.
            // this is only acceptable if we're on the very last
            // empty segment of a file with a trailing slash.
            // a/* should match a/b/
            const emptyFileEnd = (fi === fl - 1) && (file[fi] === "");
            return emptyFileEnd;
        }

        throw new Error("Should not be here");
    }
}
