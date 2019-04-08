const {
    is
} = adone;

adone.asNamespace(exports);

let debug;
/* istanbul ignore next */
if (typeof process === "object" &&
    process.env &&
    process.env.NODE_DEBUG &&
    /\bsemver\b/i.test(process.env.NODE_DEBUG)) {
    debug = function () {
        const args = Array.prototype.slice.call(arguments, 0);
        args.unshift("SEMVER");
        console.log.apply(console, args);
    };
} else {
    debug = function () { };
}

// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
export const SEMVER_SPEC_VERSION = "2.0.0";

const MAX_LENGTH = 256;
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER ||
/* istanbul ignore next */ 9007199254740991;

// Max safe segment length for coercion.
const MAX_SAFE_COMPONENT_LENGTH = 16;

// The actual regexps go on exports.re
export const re = [];
export const src = [];
let R = 0;

// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.

// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.

const NUMERICIDENTIFIER = R++;
src[NUMERICIDENTIFIER] = "0|[1-9]\\d*";
const NUMERICIDENTIFIERLOOSE = R++;
src[NUMERICIDENTIFIERLOOSE] = "[0-9]+";

// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.

const NONNUMERICIDENTIFIER = R++;
src[NONNUMERICIDENTIFIER] = "\\d*[a-zA-Z-][a-zA-Z0-9-]*";

// ## Main Version
// Three dot-separated numeric identifiers.

const MAINVERSION = R++;
src[MAINVERSION] = `(${src[NUMERICIDENTIFIER]})\\.` +
    `(${src[NUMERICIDENTIFIER]})\\.` +
    `(${src[NUMERICIDENTIFIER]})`;

const MAINVERSIONLOOSE = R++;
src[MAINVERSIONLOOSE] = `(${src[NUMERICIDENTIFIERLOOSE]})\\.` +
    `(${src[NUMERICIDENTIFIERLOOSE]})\\.` +
    `(${src[NUMERICIDENTIFIERLOOSE]})`;

// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.

const PRERELEASEIDENTIFIER = R++;
src[PRERELEASEIDENTIFIER] = `(?:${src[NUMERICIDENTIFIER]}|${src[NONNUMERICIDENTIFIER]})`;

const PRERELEASEIDENTIFIERLOOSE = R++;
src[PRERELEASEIDENTIFIERLOOSE] = `(?:${src[NUMERICIDENTIFIERLOOSE]}|${src[NONNUMERICIDENTIFIER]})`;

// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.

const PRERELEASE = R++;
src[PRERELEASE] = `(?:-(${src[PRERELEASEIDENTIFIER]}(?:\\.${src[PRERELEASEIDENTIFIER]})*))`;

const PRERELEASELOOSE = R++;
src[PRERELEASELOOSE] = `(?:-?(${src[PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[PRERELEASEIDENTIFIERLOOSE]})*))`;

// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.

const BUILDIDENTIFIER = R++;
src[BUILDIDENTIFIER] = "[0-9A-Za-z-]+";

// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.

const BUILD = R++;
src[BUILD] = `(?:\\+(${src[BUILDIDENTIFIER]}(?:\\.${src[BUILDIDENTIFIER]})*))`;

// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.

// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.

const FULL = R++;
const FULLPLAIN = `v?${src[MAINVERSION]}${src[PRERELEASE]}?${src[BUILD]}?`;

src[FULL] = `^${FULLPLAIN}$`;

// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
// common in the npm registry.
const LOOSEPLAIN = `[v=\\s]*${src[MAINVERSIONLOOSE]}${src[PRERELEASELOOSE]}?${src[BUILD]}?`;

const LOOSE = R++;
src[LOOSE] = `^${LOOSEPLAIN}$`;

const GTLT = R++;
src[GTLT] = "((?:<|>)?=?)";

// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifer, meaning "any version"
// Only the first item is strictly required.
const XRANGEIDENTIFIERLOOSE = R++;
src[XRANGEIDENTIFIERLOOSE] = `${src[NUMERICIDENTIFIERLOOSE]}|x|X|\\*`;
const XRANGEIDENTIFIER = R++;
src[XRANGEIDENTIFIER] = `${src[NUMERICIDENTIFIER]}|x|X|\\*`;

const XRANGEPLAIN = R++;
src[XRANGEPLAIN] = `[v=\\s]*(${src[XRANGEIDENTIFIER]})` +
    `(?:\\.(${src[XRANGEIDENTIFIER]})` +
    `(?:\\.(${src[XRANGEIDENTIFIER]})` +
    `(?:${src[PRERELEASE]})?${src[BUILD]}?` +
    ")?)?";

const XRANGEPLAINLOOSE = R++;
src[XRANGEPLAINLOOSE] = `[v=\\s]*(${src[XRANGEIDENTIFIERLOOSE]})` +
    `(?:\\.(${src[XRANGEIDENTIFIERLOOSE]})` +
    `(?:\\.(${src[XRANGEIDENTIFIERLOOSE]})` +
    `(?:${src[PRERELEASELOOSE]})?${src[BUILD]}?` +
    ")?)?";

const XRANGE = R++;
src[XRANGE] = `^${src[GTLT]}\\s*${src[XRANGEPLAIN]}$`;
const XRANGELOOSE = R++;
src[XRANGELOOSE] = `^${src[GTLT]}\\s*${src[XRANGEPLAINLOOSE]}$`;

// Coercion.
// Extract anything that could conceivably be a part of a valid semver
const COERCE = R++;
src[COERCE] = `${"(?:^|[^\\d])" +
    "(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})` +
    `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` +
    `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` +
    "(?:$|[^\\d])";

// Tilde ranges.
// Meaning is "reasonably at or greater than"
const LONETILDE = R++;
src[LONETILDE] = "(?:~>?)";

const TILDETRIM = R++;
src[TILDETRIM] = `(\\s*)${src[LONETILDE]}\\s+`;
re[TILDETRIM] = new RegExp(src[TILDETRIM], "g");
const tildeTrimReplace = "$1~";

const TILDE = R++;
src[TILDE] = `^${src[LONETILDE]}${src[XRANGEPLAIN]}$`;
const TILDELOOSE = R++;
src[TILDELOOSE] = `^${src[LONETILDE]}${src[XRANGEPLAINLOOSE]}$`;

// Caret ranges.
// Meaning is "at least and backwards compatible with"
const LONECARET = R++;
src[LONECARET] = "(?:\\^)";

const CARETTRIM = R++;
src[CARETTRIM] = `(\\s*)${src[LONECARET]}\\s+`;
re[CARETTRIM] = new RegExp(src[CARETTRIM], "g");
const caretTrimReplace = "$1^";

const CARET = R++;
src[CARET] = `^${src[LONECARET]}${src[XRANGEPLAIN]}$`;
const CARETLOOSE = R++;
src[CARETLOOSE] = `^${src[LONECARET]}${src[XRANGEPLAINLOOSE]}$`;

// A simple gt/lt/eq thing, or just "" to indicate "any version"
const COMPARATORLOOSE = R++;
src[COMPARATORLOOSE] = `^${src[GTLT]}\\s*(${LOOSEPLAIN})$|^$`;
const COMPARATOR = R++;
src[COMPARATOR] = `^${src[GTLT]}\\s*(${FULLPLAIN})$|^$`;

// An expression to strip any whitespace between the gtlt and the thing
// it modifies, so that `> 1.2.3` ==> `>1.2.3`
const COMPARATORTRIM = R++;
src[COMPARATORTRIM] = `(\\s*)${src[GTLT]}\\s*(${LOOSEPLAIN}|${src[XRANGEPLAIN]})`;

// this one has to use the /g flag
re[COMPARATORTRIM] = new RegExp(src[COMPARATORTRIM], "g");
const comparatorTrimReplace = "$1$2$3";

// Something like `1.2.3 - 1.2.4`
// Note that these all use the loose form, because they'll be
// checked against either the strict or loose comparator form
// later.
const HYPHENRANGE = R++;
src[HYPHENRANGE] = `^\\s*(${src[XRANGEPLAIN]})` +
    "\\s+-\\s+" +
    `(${src[XRANGEPLAIN]})` +
    "\\s*$";

const HYPHENRANGELOOSE = R++;
src[HYPHENRANGELOOSE] = `^\\s*(${src[XRANGEPLAINLOOSE]})` +
    "\\s+-\\s+" +
    `(${src[XRANGEPLAINLOOSE]})` +
    "\\s*$";

// Star ranges basically just allow anything at all.
const STAR = R++;
src[STAR] = "(<|>)?=?\\s*\\*";

// Compile to actual regexp objects.
// All are flag-free, unless they were created above with a flag.
for (let i = 0; i < R; i++) {
    debug(i, src[i]);
    if (!re[i]) {
        re[i] = new RegExp(src[i]);
    }
}

export const parse = function (version, options) {
    if (!options || typeof options !== "object") {
        options = {
            loose: Boolean(options),
            includePrerelease: false
        };
    }

    if (version instanceof SemVer) {
        return version;
    }

    if (!is.string(version)) {
        return null;
    }

    if (version.length > MAX_LENGTH) {
        return null;
    }

    const r = options.loose ? re[LOOSE] : re[FULL];
    if (!r.test(version)) {
        return null;
    }

    try {
        return new SemVer(version, options);
    } catch (er) {
        return null;
    }
};

export const valid = function (version, options) {
    const v = parse(version, options);
    return v ? v.version : null;
};

export const clean = function (version, options) {
    const s = parse(version.trim().replace(/^[=v]+/, ""), options);
    return s ? s.version : null;
};

export class SemVer {
    constructor(version, options) {
        if (!options || typeof options !== "object") {
            options = {
                loose: Boolean(options),
                includePrerelease: false
            };
        }
        if (version instanceof SemVer) {
            if (version.loose === options.loose) {
                return version;
            }
            version = version.version;

        } else if (!is.string(version)) {
            throw new TypeError(`Invalid Version: ${version}`);
        }

        if (version.length > MAX_LENGTH) {
            throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
        }

        if (!(this instanceof SemVer)) {
            return new SemVer(version, options);
        }

        debug("SemVer", version, options);
        this.options = options;
        this.loose = Boolean(options.loose);

        const m = version.trim().match(options.loose ? re[LOOSE] : re[FULL]);

        if (!m) {
            throw new TypeError(`Invalid Version: ${version}`);
        }

        this.raw = version;

        // these are actually numbers
        this.major = Number(m[1]);
        this.minor = Number(m[2]);
        this.patch = Number(m[3]);

        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
            throw new TypeError("Invalid major version");
        }

        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
            throw new TypeError("Invalid minor version");
        }

        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
            throw new TypeError("Invalid patch version");
        }

        // numberify any prerelease numeric ids
        if (!m[4]) {
            this.prerelease = [];
        } else {
            this.prerelease = m[4].split(".").map((id) => {
                if (/^[0-9]+$/.test(id)) {
                    const num = Number(id);
                    if (num >= 0 && num < MAX_SAFE_INTEGER) {
                        return num;
                    }
                }
                return id;
            });
        }

        this.build = m[5] ? m[5].split(".") : [];
        this.format();
    }


    format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
            this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
    }

    toString() {
        return this.version;
    }

    compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }

        return this.compareMain(other) || this.comparePre(other);
    }

    compareMain(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }

        return compareIdentifiers(this.major, other.major) ||
            compareIdentifiers(this.minor, other.minor) ||
            compareIdentifiers(this.patch, other.patch);
    }

    comparePre(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }

        // NOT having a prerelease is > having one
        if (this.prerelease.length && !other.prerelease.length) {
            return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
            return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
            return 0;
        }

        let i = 0;
        do {
            const a = this.prerelease[i];
            const b = other.prerelease[i];
            debug("prerelease compare", i, a, b);
            if (is.undefined(a) && is.undefined(b)) {
                return 0;
            } else if (is.undefined(b)) {
                return 1;
            } else if (is.undefined(a)) {
                return -1;
            } else if (a === b) {
                continue;
            } else {
                return compareIdentifiers(a, b);
            }
        } while (++i);
    }

    // preminor will bump the version up to the next minor release, and immediately
    // down to pre-release. premajor and prepatch work the same way.
    inc(release, identifier) {
        switch (release) {
            case "premajor":
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor = 0;
                this.major++;
                this.inc("pre", identifier);
                break;
            case "preminor":
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor++;
                this.inc("pre", identifier);
                break;
            case "prepatch":
                // If this is already a prerelease, it will bump to the next version
                // drop any prereleases that might already exist, since they are not
                // relevant at this point.
                this.prerelease.length = 0;
                this.inc("patch", identifier);
                this.inc("pre", identifier);
                break;
            // If the input is a non-prerelease version, this acts the same as
            // prepatch.
            case "prerelease":
                if (this.prerelease.length === 0) {
                    this.inc("patch", identifier);
                }
                this.inc("pre", identifier);
                break;

            case "major":
                // If this is a pre-major version, bump up to the same major version.
                // Otherwise increment major.
                // 1.0.0-5 bumps to 1.0.0
                // 1.1.0 bumps to 2.0.0
                if (this.minor !== 0 ||
                    this.patch !== 0 ||
                    this.prerelease.length === 0) {
                    this.major++;
                }
                this.minor = 0;
                this.patch = 0;
                this.prerelease = [];
                break;
            case "minor":
                // If this is a pre-minor version, bump up to the same minor version.
                // Otherwise increment minor.
                // 1.2.0-5 bumps to 1.2.0
                // 1.2.1 bumps to 1.3.0
                if (this.patch !== 0 || this.prerelease.length === 0) {
                    this.minor++;
                }
                this.patch = 0;
                this.prerelease = [];
                break;
            case "patch":
                // If this is not a pre-release version, it will increment the patch.
                // If it is a pre-release it will bump up to the same patch version.
                // 1.2.0-5 patches to 1.2.0
                // 1.2.0 patches to 1.2.1
                if (this.prerelease.length === 0) {
                    this.patch++;
                }
                this.prerelease = [];
                break;
            // This probably shouldn't be used publicly.
            // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
            case "pre":
                if (this.prerelease.length === 0) {
                    this.prerelease = [0];
                } else {
                    let i = this.prerelease.length;
                    while (--i >= 0) {
                        if (is.number(this.prerelease[i])) {
                            this.prerelease[i]++;
                            i = -2;
                        }
                    }
                    if (i === -1) {
                        // didn't increment anything
                        this.prerelease.push(0);
                    }
                }
                if (identifier) {
                    // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
                    // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
                    if (this.prerelease[0] === identifier) {
                        if (isNaN(this.prerelease[1])) {
                            this.prerelease = [identifier, 0];
                        }
                    } else {
                        this.prerelease = [identifier, 0];
                    }
                }
                break;

            default:
                throw new Error(`invalid increment argument: ${release}`);
        }
        this.format();
        this.raw = this.version;
        return this;
    }
}


export const inc = function (version, release, loose, identifier) {
    if (is.string(loose)) {
        identifier = loose;
        loose = undefined;
    }

    try {
        return new SemVer(version, loose).inc(release, identifier).version;
    } catch (er) {
        return null;
    }
};

export const diff = function (version1, version2) {
    if (eq(version1, version2)) {
        return null;
    }
    const v1 = parse(version1);
    const v2 = parse(version2);
    let prefix = "";
    let defaultResult;
    if (v1.prerelease.length || v2.prerelease.length) {
        prefix = "pre";
        defaultResult = "prerelease";
    }
    for (const key in v1) {
        if (key === "major" || key === "minor" || key === "patch") {
            if (v1[key] !== v2[key]) {
                return prefix + key;
            }
        }
    }
    return defaultResult; // may be undefined

};

const numeric = /^[0-9]+$/;
export const compareIdentifiers = function (a, b) {
    const anum = numeric.test(a);
    const bnum = numeric.test(b);

    if (anum && bnum) {
        a = Number(a);
        b = Number(b);
    }

    return a === b ? 0
        : (anum && !bnum) ? -1
            : (bnum && !anum) ? 1
                : a < b ? -1
                    : 1;
};

export const rcompareIdentifiers = function (a, b) {
    return compareIdentifiers(b, a);
};

export const major = function (a, loose) {
    return new SemVer(a, loose).major;
};

export const minor = function (a, loose) {
    return new SemVer(a, loose).minor;
};

export const patch = function (a, loose) {
    return new SemVer(a, loose).patch;
};

export const compare = function (a, b, loose) {
    return new SemVer(a, loose).compare(new SemVer(b, loose));
};

export const compareLoose = function (a, b) {
    return compare(a, b, true);
};

export const rcompare = function (a, b, loose) {
    return compare(b, a, loose);
};

export const sort = function (list, loose) {
    return list.sort((a, b) => {
        return compare(a, b, loose);
    });
};

export const rsort = function (list, loose) {
    return list.sort((a, b) => {
        return rcompare(a, b, loose);
    });
};

export const gt = function (a, b, loose) {
    return compare(a, b, loose) > 0;
};

export const lt = function (a, b, loose) {
    return compare(a, b, loose) < 0;
};

export const eq = function (a, b, loose) {
    return compare(a, b, loose) === 0;
};

export const neq = function (a, b, loose) {
    return compare(a, b, loose) !== 0;
};

export const gte = function (a, b, loose) {
    return compare(a, b, loose) >= 0;
};

export const lte = function (a, b, loose) {
    return compare(a, b, loose) <= 0;
};

export const cmp = function (a, op, b, loose) {
    switch (op) {
        case "===":
            if (typeof a === "object") {
                a = a.version;
            }
            if (typeof b === "object") {
                b = b.version;
            }
            return a === b;

        case "!==":
            if (typeof a === "object") {
                a = a.version;
            }
            if (typeof b === "object") {
                b = b.version;
            }
            return a !== b;

        case "":
        case "=":
        case "==":
            return eq(a, b, loose);

        case "!=":
            return neq(a, b, loose);

        case ">":
            return gt(a, b, loose);

        case ">=":
            return gte(a, b, loose);

        case "<":
            return lt(a, b, loose);

        case "<=":
            return lte(a, b, loose);

        default:
            throw new TypeError(`Invalid operator: ${op}`);
    }
};

const ANY = {};

export class Comparator {
    constructor(comp, options) {
        if (!options || typeof options !== "object") {
            options = {
                loose: Boolean(options),
                includePrerelease: false
            };
        }

        if (comp instanceof Comparator) {
            if (comp.loose === Boolean(options.loose)) {
                return comp;
            }
            comp = comp.value;

        }

        if (!(this instanceof Comparator)) {
            return new Comparator(comp, options);
        }

        debug("comparator", comp, options);
        this.options = options;
        this.loose = Boolean(options.loose);
        this.parse(comp);

        if (this.semver === ANY) {
            this.value = "";
        } else {
            this.value = this.operator + this.semver.version;
        }

        debug("comp", this);
    }


    parse(comp) {
        const r = this.options.loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
        const m = comp.match(r);

        if (!m) {
            throw new TypeError(`Invalid comparator: ${comp}`);
        }

        this.operator = m[1];
        if (this.operator === "=") {
            this.operator = "";
        }

        // if it literally is just '>' or '' then allow anything.
        if (!m[2]) {
            this.semver = ANY;
        } else {
            this.semver = new SemVer(m[2], this.options.loose);
        }
    }

    toString() {
        return this.value;
    }

    test(version) {
        debug("Comparator.test", version, this.options.loose);

        if (this.semver === ANY) {
            return true;
        }

        if (is.string(version)) {
            version = new SemVer(version, this.options);
        }

        return cmp(version, this.operator, this.semver, this.options);
    }

    intersects(comp, options) {
        if (!(comp instanceof Comparator)) {
            throw new TypeError("a Comparator is required");
        }

        if (!options || typeof options !== "object") {
            options = {
                loose: Boolean(options),
                includePrerelease: false
            };
        }

        let rangeTmp;

        if (this.operator === "") {
            rangeTmp = new Range(comp.value, options);
            return satisfies(this.value, rangeTmp, options);
        } else if (comp.operator === "") {
            rangeTmp = new Range(this.value, options);
            return satisfies(comp.semver, rangeTmp, options);
        }

        const sameDirectionIncreasing =
            (this.operator === ">=" || this.operator === ">") &&
            (comp.operator === ">=" || comp.operator === ">");
        const sameDirectionDecreasing =
            (this.operator === "<=" || this.operator === "<") &&
            (comp.operator === "<=" || comp.operator === "<");
        const sameSemVer = this.semver.version === comp.semver.version;
        const differentDirectionsInclusive =
            (this.operator === ">=" || this.operator === "<=") &&
            (comp.operator === ">=" || comp.operator === "<=");
        const oppositeDirectionsLessThan =
            cmp(this.semver, "<", comp.semver, options) &&
            ((this.operator === ">=" || this.operator === ">") &&
                (comp.operator === "<=" || comp.operator === "<"));
        const oppositeDirectionsGreaterThan =
            cmp(this.semver, ">", comp.semver, options) &&
            ((this.operator === "<=" || this.operator === "<") &&
                (comp.operator === ">=" || comp.operator === ">"));

        return sameDirectionIncreasing || sameDirectionDecreasing ||
            (sameSemVer && differentDirectionsInclusive) ||
            oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
    }
}

// take a set of comparators and determine whether there
// exists a version which can satisfy it
const isSatisfiable = function (comparators, options) {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();

    while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => testComparator.intersects(otherComparator, options));
        testComparator = remainingComparators.pop();
    }

    return result;
};


const isX = (id) => !id || id.toLowerCase() === "x" || id === "*";

const replaceTilde = function (comp, options) {
    const r = options.loose ? re[TILDELOOSE] : re[TILDE];
    return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;

        if (isX(M)) {
            ret = "";
        } else if (isX(m)) {
            ret = `>=${M}.0.0 <${Number(M) + 1}.0.0`;
        } else if (isX(p)) {
            // ~1.2 == >=1.2.0 <1.3.0
            ret = `>=${M}.${m}.0 <${M}.${Number(m) + 1}.0`;
        } else if (pr) {
            debug("replaceTilde pr", pr);
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${Number(m) + 1}.0`;
        } else {
            // ~1.2.3 == >=1.2.3 <1.3.0
            ret = `>=${M}.${m}.${p} <${M}.${Number(m) + 1}.0`;
        }

        debug("tilde return", ret);
        return ret;
    });
};

// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
const replaceTildes = function (comp, options) {
    return comp.trim().split(/\s+/).map((comp) => {
        return replaceTilde(comp, options);
    }).join(" ");
};


const replaceCaret = function (comp, options) {
    debug("caret", comp, options);
    const r = options.loose ? re[CARETLOOSE] : re[CARET];
    return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;

        if (isX(M)) {
            ret = "";
        } else if (isX(m)) {
            ret = `>=${M}.0.0 <${Number(M) + 1}.0.0`;
        } else if (isX(p)) {
            if (M === "0") {
                ret = `>=${M}.${m}.0 <${M}.${Number(m) + 1}.0`;
            } else {
                ret = `>=${M}.${m}.0 <${Number(M) + 1}.0.0`;
            }
        } else if (pr) {
            debug("replaceCaret pr", pr);
            if (M === "0") {
                if (m === "0") {
                    ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${Number(p) + 1}`;
                } else {
                    ret = `>=${M}.${m}.${p}-${pr} <${M}.${Number(m) + 1}.0`;
                }
            } else {
                ret = `>=${M}.${m}.${p}-${pr} <${Number(M) + 1}.0.0`;
            }
        } else {
            debug("no pr");
            if (M === "0") {
                if (m === "0") {
                    ret = `>=${M}.${m}.${p} <${M}.${m}.${Number(p) + 1}`;
                } else {
                    ret = `>=${M}.${m}.${p} <${M}.${Number(m) + 1}.0`;
                }
            } else {
                ret = `>=${M}.${m}.${p} <${Number(M) + 1}.0.0`;
            }
        }

        debug("caret return", ret);
        return ret;
    });
};

// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
// ^1.2.3 --> >=1.2.3 <2.0.0
// ^1.2.0 --> >=1.2.0 <2.0.0
const replaceCarets = function (comp, options) {
    return comp.trim().split(/\s+/).map((comp) => {
        return replaceCaret(comp, options);
    }).join(" ");
};

const replaceXRange = function (comp, options) {
    comp = comp.trim();
    const r = options.loose ? re[XRANGELOOSE] : re[XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;

        if (gtlt === "=" && anyX) {
            gtlt = "";
        }

        if (xM) {
            if (gtlt === ">" || gtlt === "<") {
                // nothing is allowed
                ret = "<0.0.0";
            } else {
                // nothing is forbidden
                ret = "*";
            }
        } else if (gtlt && anyX) {
            // we know patch is an x, because we have any x at all.
            // replace X with 0
            if (xm) {
                m = 0;
            }
            p = 0;

            if (gtlt === ">") {
                // >1 => >=2.0.0
                // >1.2 => >=1.3.0
                // >1.2.3 => >= 1.2.4
                gtlt = ">=";
                if (xm) {
                    M = Number(M) + 1;
                    m = 0;
                    p = 0;
                } else {
                    m = Number(m) + 1;
                    p = 0;
                }
            } else if (gtlt === "<=") {
                // <=0.7.x is actually <0.8.0, since any 0.7.x should
                // pass.  Similarly, <=7.x is actually <8.0.0, etc.
                gtlt = "<";
                if (xm) {
                    M = Number(M) + 1;
                } else {
                    m = Number(m) + 1;
                }
            }

            ret = `${gtlt + M}.${m}.${p}`;
        } else if (xm) {
            ret = `>=${M}.0.0 <${Number(M) + 1}.0.0`;
        } else if (xp) {
            ret = `>=${M}.${m}.0 <${M}.${Number(m) + 1}.0`;
        }

        debug("xRange return", ret);

        return ret;
    });
};

const replaceXRanges = function (comp, options) {
    debug("replaceXRanges", comp, options);
    return comp.split(/\s+/).map((comp) => {
        return replaceXRange(comp, options);
    }).join(" ");
};

// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
const replaceStars = function (comp, options) {
    debug("replaceStars", comp, options);
    // Looseness is ignored here.  star is always as loose as it gets!
    return comp.trim().replace(re[STAR], "");
};

// This function is passed to string.replace(re[HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0 <3.5.0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0 <3.5.0
const hyphenReplace = function ($0,
    from, fM, fm, fp, fpr, fb,
    to, tM, tm, tp, tpr, tb) {
    if (isX(fM)) {
        from = "";
    } else if (isX(fm)) {
        from = `>=${fM}.0.0`;
    } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0`;
    } else {
        from = `>=${from}`;
    }

    if (isX(tM)) {
        to = "";
    } else if (isX(tm)) {
        to = `<${Number(tM) + 1}.0.0`;
    } else if (isX(tp)) {
        to = `<${tM}.${Number(tm) + 1}.0`;
    } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else {
        to = `<=${to}`;
    }

    return (`${from} ${to}`).trim();
};


// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
const parseComparator = function (comp, options) {
    debug("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug("caret", comp);
    comp = replaceTildes(comp, options);
    debug("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug("xrange", comp);
    comp = replaceStars(comp, options);
    debug("stars", comp);
    return comp;
};


export class Range {
    constructor(range, options) {
        if (!options || typeof options !== "object") {
            options = {
                loose: Boolean(options),
                includePrerelease: false
            };
        }

        if (range instanceof Range) {
            if (range.loose === Boolean(options.loose) &&
                range.includePrerelease === Boolean(options.includePrerelease)) {
                return range;
            }
            return new Range(range.raw, options);

        }

        if (range instanceof Comparator) {
            return new Range(range.value, options);
        }

        if (!(this instanceof Range)) {
            return new Range(range, options);
        }

        this.options = options;
        this.loose = Boolean(options.loose);
        this.includePrerelease = Boolean(options.includePrerelease);

        // First, split based on boolean or ||
        this.raw = range;
        this.set = range.split(/\s*\|\|\s*/).map(function (range) {
            return this.parseRange(range.trim());
        }, this).filter((c) => {
            // throw out any that are not relevant for whatever reason
            return c.length;
        });

        if (!this.set.length) {
            throw new TypeError(`Invalid SemVer Range: ${range}`);
        }

        this.format();
    }


    format() {
        this.range = this.set.map((comps) => {
            return comps.join(" ").trim();
        }).join("||").trim();
        return this.range;
    }

    toString() {
        return this.range;
    }

    parseRange(range) {
        const loose = this.options.loose;
        range = range.trim();
        // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
        const hr = loose ? re[HYPHENRANGELOOSE] : re[HYPHENRANGE];
        range = range.replace(hr, hyphenReplace);
        debug("hyphen replace", range);
        // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
        range = range.replace(re[COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range, re[COMPARATORTRIM]);

        // `~ 1.2.3` => `~1.2.3`
        range = range.replace(re[TILDETRIM], tildeTrimReplace);

        // `^ 1.2.3` => `^1.2.3`
        range = range.replace(re[CARETTRIM], caretTrimReplace);

        // normalize spaces
        range = range.split(/\s+/).join(" ");

        // At this point, the range is completely trimmed and
        // ready to be split into comparators.

        const compRe = loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
        let set = range.split(" ").map(function (comp) {
            return parseComparator(comp, this.options);
        }, this).join(" ").split(/\s+/);
        if (this.options.loose) {
            // in loose mode, throw out any that are not valid comparators
            set = set.filter((comp) => {
                return Boolean(comp.match(compRe));
            });
        }
        set = set.map(function (comp) {
            return new Comparator(comp, this.options);
        }, this);

        return set;
    }

    intersects(range, options) {
        if (!(range instanceof Range)) {
            throw new TypeError("a Range is required");
        }

        return this.set.some((thisComparators) => {
            return (
                isSatisfiable(thisComparators, options) &&
                range.set.some((rangeComparators) => {
                    return (
                        isSatisfiable(rangeComparators, options) &&
                        thisComparators.every((thisComparator) => {
                            return rangeComparators.every((rangeComparator) => {
                                return thisComparator.intersects(rangeComparator, options);
                            });
                        })
                    );
                })
            );
        });
    }

    // if ANY of the sets match ALL of its comparators, then pass
    test(version) {
        if (!version) {
            return false;
        }

        if (is.string(version)) {
            version = new SemVer(version, this.options);
        }

        for (let i = 0; i < this.set.length; i++) {
            if (testSet(this.set[i], version, this.options)) {
                return true;
            }
        }
        return false;
    }
}

// Mostly just for testing and legacy API reasons
export const toComparators = function (range, options) {
    return new Range(range, options).set.map((comp) => {
        return comp.map((c) => {
            return c.value;
        }).join(" ").trim().split(" ");
    });
};

const testSet = function (set, version, options) {
    for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
            return false;
        }
    }

    if (version.prerelease.length && !options.includePrerelease) {
        // Find the set of versions that are allowed to have prereleases
        // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
        // That should allow `1.2.3-pr.2` to pass.
        // However, `1.2.4-alpha.notready` should NOT be allowed,
        // even though it's within the range set by the comparators.
        for (let i = 0; i < set.length; i++) {
            debug(set[i].semver);
            if (set[i].semver === ANY) {
                continue;
            }

            if (set[i].semver.prerelease.length > 0) {
                const allowed = set[i].semver;
                if (allowed.major === version.major &&
                    allowed.minor === version.minor &&
                    allowed.patch === version.patch) {
                    return true;
                }
            }
        }

        // Version has a -pre, but it's not one of the ones we like.
        return false;
    }

    return true;
};

export const satisfies = function (version, range, options) {
    try {
        range = new Range(range, options);
    } catch (er) {
        return false;
    }
    return range.test(version);
};

export const maxSatisfying = function (versions, range, options) {
    let max = null;
    let maxSV = null;
    let rangeObj;
    try {
        rangeObj = new Range(range, options);
    } catch (er) {
        return null;
    }
    versions.forEach((v) => {
        if (rangeObj.test(v)) {
            // satisfies(v, range, options)
            if (!max || maxSV.compare(v) === -1) {
                // compare(max, v, true)
                max = v;
                maxSV = new SemVer(max, options);
            }
        }
    });
    return max;
};

export const minSatisfying = function (versions, range, options) {
    let min = null;
    let minSV = null;
    let rangeObj;
    try {
        rangeObj = new Range(range, options);
    } catch (er) {
        return null;
    }
    versions.forEach((v) => {
        if (rangeObj.test(v)) {
            // satisfies(v, range, options)
            if (!min || minSV.compare(v) === 1) {
                // compare(min, v, true)
                min = v;
                minSV = new SemVer(min, options);
            }
        }
    });
    return min;
};

export const minVersion = function (range, loose) {
    range = new Range(range, loose);

    let minver = new SemVer("0.0.0");
    if (range.test(minver)) {
        return minver;
    }

    minver = new SemVer("0.0.0-0");
    if (range.test(minver)) {
        return minver;
    }

    minver = null;
    for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];

        // eslint-disable-next-line no-loop-func
        comparators.forEach((comparator) => {
            // Clone to avoid manipulating the comparator's semver object.
            const compver = new SemVer(comparator.semver.version);
            switch (comparator.operator) {
                case ">":
                    if (compver.prerelease.length === 0) {
                        compver.patch++;
                    } else {
                        compver.prerelease.push(0);
                    }
                    compver.raw = compver.format();
                /* fallthrough */
                case "":
                case ">=":
                    if (!minver || gt(minver, compver)) {
                        minver = compver;
                    }
                    break;
                case "<":
                case "<=":
                    /* Ignore maximum versions */
                    break;
                /* istanbul ignore next */
                default:
                    throw new Error(`Unexpected operation: ${comparator.operator}`);
            }
        });
    }

    if (minver && range.test(minver)) {
        return minver;
    }

    return null;
};

export const validRange = function (range, options) {
    try {
        // Return '*' instead of '' so that truthiness works.
        // This will throw if it's invalid anyway
        return new Range(range, options).range || "*";
    } catch (er) {
        return null;
    }
};

export const outside = function (version, range, hilo, options) {
    version = new SemVer(version, options);
    range = new Range(range, options);

    let gtfn; let ltefn; let ltfn; let comp; let ecomp;
    switch (hilo) {
        case ">":
            gtfn = gt;
            ltefn = lte;
            ltfn = lt;
            comp = ">";
            ecomp = ">=";
            break;
        case "<":
            gtfn = lt;
            ltefn = gte;
            ltfn = gt;
            comp = "<";
            ecomp = "<=";
            break;
        default:
            throw new TypeError('Must provide a hilo val of "<" or ">"');
    }

    // If it satisifes the range it is not outside
    if (satisfies(version, range, options)) {
        return false;
    }

    // From now on, variable terms are as if we're in "gtr" mode.
    // but note that everything is flipped for the "ltr" function.

    for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];

        let high = null;
        let low = null;

        comparators.forEach((comparator) => {
            if (comparator.semver === ANY) {
                comparator = new Comparator(">=0.0.0");
            }
            high = high || comparator;
            low = low || comparator;
            if (gtfn(comparator.semver, high.semver, options)) {
                high = comparator;
            } else if (ltfn(comparator.semver, low.semver, options)) {
                low = comparator;
            }
        });

        // If the edge version comparator has a operator then our version
        // isn't outside it
        if (high.operator === comp || high.operator === ecomp) {
            return false;
        }

        // If the lowest version comparator has an operator and our version
        // is less than it then it isn't higher than the range
        if ((!low.operator || low.operator === comp) &&
            ltefn(version, low.semver)) {
            return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
            return false;
        }
    }
    return true;
};

// Determine if version is less than all the versions possible in the range
export const ltr = function (version, range, options) {
    return outside(version, range, "<", options);
};

// Determine if version is greater than all the versions possible in the range.
export const gtr = function (version, range, options) {
    return outside(version, range, ">", options);
};

export const prerelease = function (version, options) {
    const parsed = parse(version, options);
    return (parsed && parsed.prerelease.length) ? parsed.prerelease : null;
};

export const intersects = function (r1, r2, options) {
    r1 = new Range(r1, options);
    r2 = new Range(r2, options);
    return r1.intersects(r2);
};

export const coerce = function (version) {
    if (version instanceof SemVer) {
        return version;
    }

    if (!is.string(version)) {
        return null;
    }

    const match = version.match(re[COERCE]);

    if (is.nil(match)) {
        return null;
    }

    return parse(`${match[1]}.${match[2] || "0"}.${match[3] || "0"}`);
};
