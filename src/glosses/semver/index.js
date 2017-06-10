const { is, x } = adone;

const MAX_LENGTH = 256;
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;

export const re = [];
export const src = [];

let R = 0;

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
src[MAINVERSION] = `(${src[NUMERICIDENTIFIER]})\\.(${src[NUMERICIDENTIFIER]})\\.(${src[NUMERICIDENTIFIER]})`;

const MAINVERSIONLOOSE = R++;
src[MAINVERSIONLOOSE] = `(${src[NUMERICIDENTIFIERLOOSE]})\\.(${src[NUMERICIDENTIFIERLOOSE]})\\.(${src[NUMERICIDENTIFIERLOOSE]})`;

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
src[XRANGEPLAIN] = `[v=\\s]*(${src[XRANGEIDENTIFIER]})(?:\\.(${src[XRANGEIDENTIFIER]})(?:\\.(${src[XRANGEIDENTIFIER]})(?:${src[PRERELEASE]})?${src[BUILD]}?)?)?`;

const XRANGEPLAINLOOSE = R++;
src[XRANGEPLAINLOOSE] = `[v=\\s]*(${src[XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[XRANGEIDENTIFIERLOOSE]})(?:${src[PRERELEASELOOSE]})?${src[BUILD]}?)?)?`;

const XRANGE = R++;
src[XRANGE] = `^${src[GTLT]}\\s*${src[XRANGEPLAIN]}$`;
const XRANGELOOSE = R++;
src[XRANGELOOSE] = `^${src[GTLT]}\\s*${src[XRANGEPLAINLOOSE]}$`;

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
src[HYPHENRANGE] = `^\\s*(${src[XRANGEPLAIN]})\\s+-\\s+(${src[XRANGEPLAIN]})\\s*$`;

const HYPHENRANGELOOSE = R++;
src[HYPHENRANGELOOSE] = `^\\s*(${src[XRANGEPLAINLOOSE]})\\s+-\\s+(${src[XRANGEPLAINLOOSE]})\\s*$`;

// Star ranges basically just allow anything at all.
const STAR = R++;
src[STAR] = "(<|>)?=?\\s*\\*";

// Compile to actual regexp objects.
// All are flag-free, unless they were created above with a flag.
for (let i = 0; i < R; i++) {
    if (!re[i]) {
        re[i] =
            new RegExp(src[i]);
    }
}

const numeric = /^[0-9]+$/;

export const compareIdentifiers = (_a, _b) => {
    const anum = numeric.test(_a);
    const bnum = numeric.test(_b);

    if (anum && !bnum) {
        return -1;
    }
    if (bnum && !anum) {
        return 1;
    }

    const a = anum && bnum ? Number(_a) : _a;
    const b = anum && bnum ? Number(_b) : _b;

    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
};

export const rcompareIdentifiers = (a, b) => {
    return compareIdentifiers(b, a);
};

export class SemVer {
    constructor(version, loose) {
        if (!is.string(version)) {
            throw new x.InvalidArgument(`Invalid Version: ${version}`);
        }

        if (version.length > MAX_LENGTH) {
            throw new x.InvalidArgument(`version is longer than ${MAX_LENGTH} characters`);
        }

        this.loose = loose;
        const m = version.trim().match(loose ? re[LOOSE] : re[FULL]);

        if (!m) {
            throw new x.InvalidArgument(`Invalid Version: ${version}`);
        }

        this.raw = version;

        // these are actually numbers
        this.major = Number(m[1]);
        this.minor = Number(m[2]);
        this.patch = Number(m[3]);

        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
            throw new x.InvalidArgument("Invalid major version");
        }

        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
            throw new x.InvalidArgument("Invalid minor version");
        }

        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
            throw new x.InvalidArgument("Invalid patch version");
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

    compare(_other) {
        const other = _other instanceof SemVer ? _other : SemVer.get(_other, this.loose);
        return this.compareMain(other) || this.comparePre(other);
    }

    compareMain(_other) {
        const other = _other instanceof SemVer ? _other : SemVer.get(_other, this.loose);
        return compareIdentifiers(this.major, other.major) ||
            compareIdentifiers(this.minor, other.minor) ||
            compareIdentifiers(this.patch, other.patch);
    }

    comparePre(_other) {
        const other = _other instanceof SemVer ? _other : SemVer.get(_other, this.loose);

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

    inc(release, identifier) {
        switch (release) {
            case "premajor": {
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor = 0;
                this.major++;
                this.inc("pre", identifier);
                break;
            }
            case "preminor": {
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor++;
                this.inc("pre", identifier);
                break;
            }
            case "prepatch": {
                // If this is already a prerelease, it will bump to the next version
                // drop any prereleases that might already exist, since they are not
                // relevant at this point.
                this.prerelease.length = 0;
                this.inc("patch", identifier);
                this.inc("pre", identifier);
                break;
            }
            // If the input is a non-prerelease version, this acts the same as
            // prepatch.
            case "prerelease": {
                if (this.prerelease.length === 0) {
                    this.inc("patch", identifier);
                }
                this.inc("pre", identifier);
                break;
            }
            case "major": {
                // If this is a pre-major version, bump up to the same major version.
                // Otherwise increment major.
                // 1.0.0-5 bumps to 1.0.0
                // 1.1.0 bumps to 2.0.0
                if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
                    this.major++;
                }
                this.minor = 0;
                this.patch = 0;
                this.prerelease = [];
                break;
            }
            case "minor": {
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
            }
            case "patch": {
                // If this is not a pre-release version, it will increment the patch.
                // If it is a pre-release it will bump up to the same patch version.
                // 1.2.0-5 patches to 1.2.0
                // 1.2.0 patches to 1.2.1
                if (this.prerelease.length === 0) {
                    this.patch++;
                }
                this.prerelease = [];
                break;
            }
            // This probably shouldn't be used publicly.
            // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
            case "pre": {
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
                    // didn't increment anything
                    if (i === -1) {
                        this.prerelease.push(0);
                    }
                }
                if (identifier) {
                    // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
                    // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
                    if (this.prerelease[0] === identifier) {
                        if (!is.number(this.prerelease[1])) {
                            this.prerelease = [identifier, 0];
                        }
                    } else {
                        this.prerelease = [identifier, 0];
                    }
                }
                break;
            }
            default: {
                throw new x.InvalidArgument(`invalid increment argument: ${release}`);
            }
        }
        this.format();
        this.raw = this.version;
        return this;
    }

    toString() {
        return this.version;
    }

    static get(_version, loose) {
        let version = _version;
        if (version instanceof SemVer) {
            if (version.loose === loose) {
                return version;
            }
            version = version.version;
        }
        return new SemVer(version, loose);
    }
}

export const parse = (version, loose) => {
    if (version instanceof SemVer) {
        return version;
    }

    if (!is.string(version)) {
        return null;
    }

    if (version.length > MAX_LENGTH) {
        return null;
    }

    const r = loose ? re[LOOSE] : re[FULL];
    if (!r.test(version)) {
        return null;
    }

    try {
        return SemVer.get(version, loose);
    } catch (er) {
        return null;
    }
};

export const valid = (version, loose) => {
    const v = parse(version, loose);
    return v ? v.version : null;
};

export const clean = (version, loose) => {
    const s = parse(version.trim().replace(/^[=v]+/, ""), loose);
    return s ? s.version : null;
};

// preminor will bump the version up to the next minor release, and immediately
// down to pre-release. premajor and prepatch work the same way.

export const inc = (version, release, _loose, _identifier) => {
    const [identifier, loose] = is.string(_loose) ? [_loose, undefined] : [_identifier, _loose];

    try {
        return SemVer.get(version, loose).inc(release, identifier).version;
    } catch (er) {
        return null;
    }
};

export const major = (a, loose) => {
    return SemVer.get(a, loose).major;
};

export const minor = (a, loose) => SemVer.get(a, loose).minor;

export const patch = (a, loose) => SemVer.get(a, loose).patch;

export const compare = (a, b, loose) => SemVer.get(a, loose).compare(b);

export const compareLoose = (a, b) => compare(a, b, true);

export const rcompare = (a, b, loose) => compare(b, a, loose);

export const sort = (list, loose) => list.sort((a, b) => compare(a, b, loose));

export const rsort = (list, loose) => list.sort((a, b) => rcompare(a, b, loose));

export const gt = (a, b, loose) => {
    return compare(a, b, loose) > 0;
};

export const lt = (a, b, loose) => {
    return compare(a, b, loose) < 0;
};

export const eq = (a, b, loose) => {
    return compare(a, b, loose) === 0;
};

export const neq = (a, b, loose) => {
    return compare(a, b, loose) !== 0;
};

export const gte = (a, b, loose) => {
    return compare(a, b, loose) >= 0;
};

export const lte = (a, b, loose) => {
    return compare(a, b, loose) <= 0;
};

export const cmp = (_a, op, _b, loose) => {
    let ret;
    let a = _a;
    let b = _b;
    switch (op) {
        case "===": {
            if (is.object(a)) {
                a = a.version;
            }
            if (is.object(b)) {
                b = b.version;
            }
            ret = a === b;
            break;
        }
        case "!==": {
            if (is.object(a)) {
                a = a.version;
            }
            if (is.object(b)) {
                b = b.version;
            }
            ret = a !== b;
            break;
        }
        case "":
        case "=":
        case "==": {
            ret = eq(a, b, loose);
            break;
        }
        case "!=": {
            ret = neq(a, b, loose);
            break;
        }
        case ">": {
            ret = gt(a, b, loose);
            break;
        }
        case ">=": {
            ret = gte(a, b, loose);
            break;
        }
        case "<": {
            ret = lt(a, b, loose);
            break;
        }
        case "<=": {
            ret = lte(a, b, loose);
            break;
        }
        default: {
            throw new x.IllegalState(`Invalid operator: ${op}`);
        }
    }
    return ret;
};

export const diff = (version1, version2) => {
    if (eq(version1, version2)) {
        return null;
    }
    const v1 = parse(version1);
    const v2 = parse(version2);
    if (v1.prerelease.length || v2.prerelease.length) {
        for (const key in v1) {
            if (key === "major" || key === "minor" || key === "patch") {
                if (v1[key] !== v2[key]) {
                    return `pre${key}`;
                }
            }
        }
        return "prerelease";
    }
    for (const key in v1) {
        if (key === "major" || key === "minor" || key === "patch") {
            if (v1[key] !== v2[key]) {
                return key;
            }
        }
    }
};

export class Comparator {
    constructor(comp, loose) {
        this.loose = loose;
        this.parse(comp);

        if (this.semver === Comparator.ANY) {
            this.value = "";
        } else {
            this.value = this.operator + this.semver.version;
        }
    }

    parse(comp) {
        const r = this.loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
        const m = comp.match(r);

        if (!m) {
            throw new x.InvalidArgument(`Invalid comparator: ${comp}`);
        }

        this.operator = m[1];
        if (this.operator === "=") {
            this.operator = "";
        }

        // if it literally is just '>' or '' then allow anything.
        if (!m[2]) {
            this.semver = Comparator.ANY;
        } else {
            this.semver = SemVer.get(m[2], this.loose);
        }
    }

    test(_version) {
        if (this.semver === Comparator.ANY) {
            return true;
        }

        let version = _version;

        if (is.string(version)) {
            version = SemVer.get(version, this.loose);
        }

        return cmp(version, this.operator, this.semver, this.loose);
    }

    toString() {
        return this.value;
    }

    static get(_comp, loose) {
        let comp = _comp;
        if (comp instanceof Comparator) {
            if (comp.loose === loose) {
                return comp;
            }
            comp = comp.value;

        }
        return new Comparator(comp, loose);
    }

    static ANY = {};
}


const isX = (id) => {
    return !id || id.toLowerCase() === "x" || id === "*";
};

// This function is passed to string.replace(re[HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0 <3.5.0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0 <3.5.0
const hyphenReplace = ($0, _from, fM, fm, fp, fpr, fb, _to, tM, tm, tp, tpr) => {
    let [from, to] = [_from, _to];

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
        to = `<${(Number(tM) + 1)}.0.0`;
    } else if (isX(tp)) {
        to = `<${tM}.${(Number(tm) + 1)}.0`;
    } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else {
        to = `<=${to}`;
    }

    return `${from} ${to}`.trim();
};

const replaceTilde = (comp, loose) => {
    const r = loose ? re[TILDELOOSE] : re[TILDE];
    return comp.replace(r, (_, M, m, p, _pr) => {
        let ret;
        let pr = _pr;

        if (isX(M)) {
            ret = "";
        } else if (isX(m)) {
            ret = `>=${M}.0.0 <${(Number(M) + 1)}.0.0`;
        } else if (isX(p)) {  // ~1.2 == >=1.2.0 <1.3.0
            ret = `>=${M}.${m}.0 <${M}.${(Number(m) + 1)}.0`;
        } else if (pr) {
            if (pr.charAt(0) !== "-") {
                pr = `-${pr}`;
            }
            ret = `>=${M}.${m}.${p}${pr} <${M}.${(Number(m) + 1)}.0`;
        } else {  // ~1.2.3 == >=1.2.3 <1.3.0
            ret = `>=${M}.${m}.${p} <${M}.${(Number(m) + 1)}.0`;
        }
        return ret;
    });
};

// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
const replaceTildes = (comp, loose) => {
    return comp.trim().split(/\s+/).map((comp) => replaceTilde(comp, loose)).join(" ");
};

const replaceCaret = (comp, loose) => {
    const r = loose ? re[CARETLOOSE] : re[CARET];
    return comp.replace(r, (_, M, m, p, _pr) => {
        let ret;
        let pr = _pr;

        if (isX(M)) {
            ret = "";
        } else if (isX(m)) {
            ret = `>=${M}.0.0 <${(Number(M) + 1)}.0.0`;
        } else if (isX(p)) {
            if (M === "0") {
                ret = `>=${M}.${m}.0 <${M}.${(Number(m) + 1)}.0`;
            } else {
                ret = `>=${M}.${m}.0 <${(Number(M) + 1)}.0.0`;
            }
        } else if (pr) {
            if (pr.charAt(0) !== "-") {
                pr = `-${pr}`;
            }
            if (M === "0") {
                if (m === "0") {
                    ret = `>=${M}.${m}.${p}${pr} <${M}.${m}.${Number(p) + 1}`;
                } else {
                    ret = `>=${M}.${m}.${p}${pr} <${M}.${Number(m) + 1}.0`;
                }
            } else {
                ret = `>=${M}.${m}.${p}${pr} <${(Number(M) + 1)}.0.0`;
            }
        } else {
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

        return ret;
    });
};

const replaceXRange = (_comp, loose) => {
    const comp = _comp.trim();
    const r = loose ? re[XRANGELOOSE] : re[XRANGE];
    return comp.replace(r, (_ret, _gtlt, _M, _m, _p) => {
        const xM = isX(_M);
        const xm = xM || isX(_m);
        const xp = xm || isX(_p);
        const anyX = xp;

        let gtlt = _gtlt === "=" && anyX ? "" : _gtlt;
        let [ret, M, m, p] = [_ret, _M, _m, _p];

        if (xM) {
            if (gtlt === ">" || gtlt === "<") {
                // nothing is allowed
                ret = "<0.0.0";
            } else {
                // nothing is forbidden
                ret = "*";
            }
        } else if (gtlt && anyX) {
            // replace X with 0
            if (xm) {
                m = 0;
            }
            if (xp) {
                p = 0;
            }

            if (gtlt === ">") {
                // >1 => >=2.0.0
                // >1.2 => >=1.3.0
                // >1.2.3 => >= 1.2.4
                gtlt = ">=";
                if (xm) {
                    M = Number(M) + 1;
                    m = 0;
                    p = 0;
                } else if (xp) {
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

            ret = `${gtlt}${M}.${m}.${p}`;
        } else if (xm) {
            ret = `>=${M}.0.0 <${(Number(M) + 1)}.0.0`;
        } else if (xp) {
            ret = `>=${M}.${m}.0 <${M}.${Number(m) + 1}.0`;
        }


        return ret;
    });
};

const replaceXRanges = (comp, loose) => {
    return comp.split(/\s+/).map((comp) => replaceXRange(comp, loose)).join(" ");
};

// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
const replaceStars = (comp) => {
    // Looseness is ignored here.  star is always as loose as it gets!
    return comp.trim().replace(re[STAR], "");
};

// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
// ^1.2.3 --> >=1.2.3 <2.0.0
// ^1.2.0 --> >=1.2.0 <2.0.0
const replaceCarets = (comp, loose) => {
    return comp.trim().split(/\s+/).map((comp) => replaceCaret(comp, loose)).join(" ");
};

// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
const parseComparator = (_comp, loose) => {
    let comp = replaceCarets(_comp, loose);
    comp = replaceTildes(comp, loose);
    comp = replaceXRanges(comp, loose);
    comp = replaceStars(comp, loose);
    return comp;
};

const testSet = (set, version) => {
    for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
            return false;
        }
    }

    if (version.prerelease.length) {
        // Find the set of versions that are allowed to have prereleases
        // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
        // That should allow `1.2.3-pr.2` to pass.
        // However, `1.2.4-alpha.notready` should NOT be allowed,
        // even though it's within the range set by the comparators.
        for (let i = 0; i < set.length; i++) {
            if (set[i].semver === Comparator.ANY) {
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

export class Range {
    constructor(range, loose) {
        this.loose = loose;

        // First, split based on boolean or ||
        this.raw = range;
        this.set = range.split(/\s*\|\|\s*/).map((range) => {
            return this.parseRange(range.trim());
        }).filter((c) => c.length > 0);  // throw out any that are not relevant for whatever reason

        if (!this.set.length) {
            throw new x.IllegalState(`Invalid SemVer Range: ${range}`);
        }

        this.format();
    }


    format() {
        this.range = this.set.map((comps) => comps.join(" ").trim()).join("||").trim();
        return this.range;
    }

    parseRange(_range) {
        const loose = this.loose;
        let range = _range.trim();
        // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
        const hr = loose ? re[HYPHENRANGELOOSE] : re[HYPHENRANGE];
        range = range.replace(hr, hyphenReplace);
        // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
        range = range.replace(re[COMPARATORTRIM], comparatorTrimReplace);

        // `~ 1.2.3` => `~1.2.3`
        range = range.replace(re[TILDETRIM], tildeTrimReplace);

        // `^ 1.2.3` => `^1.2.3`
        range = range.replace(re[CARETTRIM], caretTrimReplace);

        // normalize spaces
        range = range.split(/\s+/).join(" ");

        // At this point, the range is completely trimmed and
        // ready to be split into comparators.

        const compRe = loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
        let set = range.split(" ").map((comp) => parseComparator(comp, loose)).join(" ").split(/\s+/);
        if (this.loose) {
            // in loose mode, throw out any that are not valid comparators
            set = set.filter((comp) => Boolean(comp.match(compRe)));
        }
        set = set.map((comp) => Comparator.get(comp, loose));

        return set;
    }


    // if ANY of the sets match ALL of its comparators, then pass
    test(_version) {
        if (!_version) {
            return false;
        }

        let version = _version;

        if (is.string(version)) {
            version = SemVer.get(version, this.loose);
        }

        for (let i = 0; i < this.set.length; i++) {
            if (testSet(this.set[i], version)) {
                return true;
            }
        }
        return false;
    }

    toString() {
        return this.range;
    }

    static get(range, loose) {
        if ((range instanceof Range) && range.loose === loose) {
            return range;
        }
        return new Range(range, loose);
    }
}

// Mostly just for testing and legacy API reasons
export const toComparators = (range, loose) => {
    return Range.get(range, loose).set.map((comp) => {
        return comp.map((c) => c.value).join(" ").trim().split(" ");
    });
};

export const satisfies = (version, range, loose) => {
    try {
        return Range.get(range, loose).test(version);
    } catch (er) {
        return false;
    }
};

export const maxSatisfying = (versions, range, loose) => {
    let max = null;
    let maxSV = null;
    const rangeObj = Range.get(range, loose);
    for (const v of versions) {
        if (rangeObj.test(v)) { // satisfies(v, range, loose)
            if (!max || maxSV.compare(v) === -1) { // compare(max, v, true)
                max = v;
                maxSV = SemVer.get(max, loose);
            }
        }
    }
    return max;
};

export const minSatisfying = (versions, range, loose) => {
    let min = null;
    let minSV = null;
    const rangeObj = Range.get(range, loose);
    for (const v of versions) {
        if (rangeObj.test(v)) { // satisfies(v, range, loose)
            if (!min || minSV.compare(v) === 1) { // compare(min, v, true)
                min = v;
                minSV = SemVer.get(min, loose);
            }
        }
    }
    return min;
};

export const validRange = (range, loose) => {
    try {
        // Return '*' instead of '' so that truthiness works.
        // This will throw if it's invalid anyway
        return Range.get(range, loose).range || "*";
    } catch (er) {
        return null;
    }
};


export const outside = (_version, _range, hilo, loose) => {
    const version = SemVer.get(_version, loose);
    const range = Range.get(_range, loose);

    let gtfn;
    let ltefn;
    let ltfn;
    let comp;
    let ecomp;
    switch (hilo) {
        case ">": {
            gtfn = gt;
            ltefn = lte;
            ltfn = lt;
            comp = ">";
            ecomp = ">=";
            break;
        }
        case "<": {
            gtfn = lt;
            ltefn = gte;
            ltfn = gt;
            comp = "<";
            ecomp = "<=";
            break;
        }
        default: {
            throw new x.IllegalState("Must provide a hilo val of \"<\" or \">\"");
        }
    }

    // If it satisifes the range it is not outside
    if (satisfies(version, range, loose)) {
        return false;
    }

    // From now on, variable terms are as if we're in "gtr" mode.
    // but note that everything is flipped for the "ltr" function.

    for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];

        let high = null;
        let low = null;

        for (let comparator of comparators) {
            if (comparator.semver === Comparator.ANY) {
                comparator = Comparator.get(">=0.0.0");
            }
            high = high || comparator;
            low = low || comparator;
            if (gtfn(comparator.semver, high.semver, loose)) {
                high = comparator;
            } else if (ltfn(comparator.semver, low.semver, loose)) {
                low = comparator;
            }
        }

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
export const ltr = (version, range, loose) => {
    return outside(version, range, "<", loose);
};

// Determine if version is greater than all the versions possible in the range.
export const gtr = (version, range, loose) => {
    return outside(version, range, ">", loose);
};

export const prerelease = (version, loose) => {
    const parsed = parse(version, loose);
    return (parsed && parsed.prerelease.length) ? parsed.prerelease : null;
};
