const { is } = adone;

const STARTS_DIGIT_RE = /^\d/;

export default class UA {
    constructor(family, major, minor, patch, patchMinor, type, debug) {
        if (family && is.object(family)) {
            major = family.major;
            minor = family.minor;
            patch = family.patch;
            patchMinor = family.patchMinor;
            type = family.type;
            debug = family.debug;
            family = family.family;
        }
        this.family = family || "Other";
        this.major = major || null;
        this.minor = minor || null;
        this.patch = patch || null;
        if (!is.undefined(patchMinor)) {
            this.patchMinor = patchMinor || null;
        }
        if (!is.undefined(type)) {
            this.type = type || null;
        }
        if (!is.undefined(debug)) {
            this.debug = debug || null;
        }
    }

    toVersionString() {
        let output = "";
        if (!is.null(this.major)) {
            output += this.major;
            if (!is.null(this.minor)) {
                output += `.${this.minor}`;
                if (!is.null(this.patch)) {
                    if (STARTS_DIGIT_RE.test(this.patch)) {
                        output += ".";
                    }
                    output += this.patch;
                    if (!is.nil(this.patchMinor)) {
                        if (STARTS_DIGIT_RE.test(this.patchMinor)) {
                            output += ".";
                        }
                        output += this.patchMinor;
                    }
                }
            }
        }
        return output;
    }

    toString() {
        let suffix = this.toVersionString();
        if (suffix) {
            suffix = ` ${suffix}`;
        }
        return this.family + suffix;
    }
}
