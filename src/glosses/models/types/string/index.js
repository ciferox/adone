import Any from "../any";
import { isRef } from "../../ref";
import { contain, unique, escapeRegex } from "../../utils";
const JoiDate = require("../date");
const Uri = require("./uri");
const Ip = require("./ip");

const {
    assert,
    is,
    std: { net }
} = adone;

let Isemail; // Loaded on demand

const internals = {
    uriRegex: Uri.createUriRegex(),
    ipRegex: Ip.createIpRegex(["ipv4", "ipv6", "ipvfuture"], "optional"),
    guidBrackets: {
        "{": "}", "[": "]", "(": ")", "": ""
    },
    guidVersions: {
        uuidv1: "1",
        uuidv2: "2",
        uuidv3: "3",
        uuidv4: "4",
        uuidv5: "5"
    },
    cidrPresences: ["required", "optional", "forbidden"],
    normalizationForms: ["NFC", "NFD", "NFKC", "NFKD"]
};

internals.String = class extends Any {

    constructor() {

        super();
        this._type = "string";
        this._invalids.add("");
    }

    _base(value, state, options) {

        if (is.string(value) &&
            options.convert) {

            if (this._flags.normalize) {
                value = value.normalize(this._flags.normalize);
            }

            if (this._flags.case) {
                value = (this._flags.case === "upper" ? value.toLocaleUpperCase() : value.toLocaleLowerCase());
            }

            if (this._flags.trim) {
                value = value.trim();
            }

            if (this._inner.replacements) {

                for (let i = 0; i < this._inner.replacements.length; ++i) {
                    const replacement = this._inner.replacements[i];
                    value = value.replace(replacement.pattern, replacement.replacement);
                }
            }

            if (this._flags.truncate) {
                for (let i = 0; i < this._tests.length; ++i) {
                    const test = this._tests[i];
                    if (test.name === "max") {
                        value = value.slice(0, test.arg);
                        break;
                    }
                }
            }

            if (this._flags.byteAligned && value.length % 2 !== 0) {
                value = `0${value}`;
            }
        }

        return {
            value,
            errors: (is.string(value)) ? null : this.createError("string.base", { value }, state, options)
        };
    }

    insensitive() {

        if (this._flags.insensitive) {
            return this;
        }

        const obj = this.clone();
        obj._flags.insensitive = true;
        return obj;
    }

    creditCard() {

        return this._test("creditCard", undefined, function (value, state, options) {

            let i = value.length;
            let sum = 0;
            let mul = 1;

            while (i--) {
                const char = value.charAt(i) * mul;
                sum = sum + (char - (char > 9) * 9);
                mul = mul ^ 3;
            }

            const check = (sum % 10 === 0) && (sum > 0);
            return check ? value : this.createError("string.creditCard", { value }, state, options);
        });
    }

    regex(pattern, patternOptions) {

        assert(pattern instanceof RegExp, "pattern must be a RegExp");

        const patternObject = {
            pattern: new RegExp(pattern.source, pattern.ignoreCase ? "i" : undefined) // Future version should break this and forbid unsupported regex flags
        };

        if (is.string(patternOptions)) {
            patternObject.name = patternOptions;
        } else if (typeof patternOptions === "object") {
            patternObject.invert = Boolean(patternOptions.invert);

            if (patternOptions.name) {
                patternObject.name = patternOptions.name;
            }
        }

        const errorCode = ["string.regex", patternObject.invert ? ".invert" : "", patternObject.name ? ".name" : ".base"].join("");

        return this._test("regex", patternObject, function (value, state, options) {

            const patternMatch = patternObject.pattern.test(value);

            if (patternMatch ^ patternObject.invert) {
                return value;
            }

            return this.createError(errorCode, { name: patternObject.name, pattern: patternObject.pattern, value }, state, options);
        });
    }

    alphanum() {

        return this._test("alphanum", undefined, function (value, state, options) {

            if (/^[a-zA-Z0-9]+$/.test(value)) {
                return value;
            }

            return this.createError("string.alphanum", { value }, state, options);
        });
    }

    token() {

        return this._test("token", undefined, function (value, state, options) {

            if (/^\w+$/.test(value)) {
                return value;
            }

            return this.createError("string.token", { value }, state, options);
        });
    }

    email(isEmailOptions) {

        if (isEmailOptions) {
            assert(typeof isEmailOptions === "object", "email options must be an object");
            assert(is.undefined(isEmailOptions.checkDNS), "checkDNS option is not supported");
            assert(is.undefined(isEmailOptions.tldWhitelist) || typeof isEmailOptions.tldWhitelist === "object", "tldWhitelist must be an array or object");
            assert(
                is.undefined(isEmailOptions.minDomainAtoms) ||
                is.safeInteger(isEmailOptions.minDomainAtoms) &&
                isEmailOptions.minDomainAtoms > 0,
                "minDomainAtoms must be a positive integer"
            );
            assert(
                is.undefined(isEmailOptions.errorLevel) ||
                is.boolean(isEmailOptions.errorLevel) ||
                (
                    is.safeInteger(isEmailOptions.errorLevel) &&
                    isEmailOptions.errorLevel >= 0
                ),
                "errorLevel must be a non-negative integer or boolean"
            );
        }

        return this._test("email", isEmailOptions, function (value, state, options) {

            Isemail = Isemail || require("isemail");

            try {
                const result = Isemail.validate(value, isEmailOptions);
                if (result === true || result === 0) {
                    return value;
                }
            } catch (e) { }

            return this.createError("string.email", { value }, state, options);
        });
    }

    ip(ipOptions = {}) {

        let regex = internals.ipRegex;
        assert(typeof ipOptions === "object", "options must be an object");

        if (ipOptions.cidr) {
            assert(is.string(ipOptions.cidr), "cidr must be a string");
            ipOptions.cidr = ipOptions.cidr.toLowerCase();

            assert(contain(internals.cidrPresences, ipOptions.cidr), `cidr must be one of ${internals.cidrPresences.join(", ")}`);

            // If we only received a `cidr` setting, create a regex for it. But we don't need to create one if `cidr` is "optional" since that is the default
            if (!ipOptions.version && ipOptions.cidr !== "optional") {
                regex = Ip.createIpRegex(["ipv4", "ipv6", "ipvfuture"], ipOptions.cidr);
            }
        } else {

            // Set our default cidr strategy
            ipOptions.cidr = "optional";
        }

        let versions;
        if (ipOptions.version) {
            if (!is.array(ipOptions.version)) {
                ipOptions.version = [ipOptions.version];
            }

            assert(ipOptions.version.length >= 1, "version must have at least 1 version specified");

            versions = [];
            for (let i = 0; i < ipOptions.version.length; ++i) {
                let version = ipOptions.version[i];
                assert(is.string(version), `version at position ${i} must be a string`);
                version = version.toLowerCase();
                assert(Ip.versions[version], `version at position ${i} must be one of ${Object.keys(Ip.versions).join(", ")}`);
                versions.push(version);
            }

            // Make sure we have a set of versions
            versions = unique(versions);

            regex = Ip.createIpRegex(versions, ipOptions.cidr);
        }

        return this._test("ip", ipOptions, function (value, state, options) {

            if (regex.test(value)) {
                return value;
            }

            if (versions) {
                return this.createError("string.ipVersion", { value, cidr: ipOptions.cidr, version: versions }, state, options);
            }

            return this.createError("string.ip", { value, cidr: ipOptions.cidr }, state, options);
        });
    }

    uri(uriOptions) {

        let customScheme = "";
        let allowRelative = false;
        let relativeOnly = false;
        let allowQuerySquareBrackets = false;
        let regex = internals.uriRegex;

        if (uriOptions) {
            assert(typeof uriOptions === "object", "options must be an object");

            const unknownOptions = Object.keys(uriOptions).filter((key) => !["scheme", "allowRelative", "relativeOnly", "allowQuerySquareBrackets"].includes(key));
            assert(unknownOptions.length === 0, `Options contain unknown keys: ${unknownOptions}`);

            if (uriOptions.scheme) {
                assert(uriOptions.scheme instanceof RegExp || is.string(uriOptions.scheme) || is.array(uriOptions.scheme), "scheme must be a RegExp, String, or Array");

                if (!is.array(uriOptions.scheme)) {
                    uriOptions.scheme = [uriOptions.scheme];
                }

                assert(uriOptions.scheme.length >= 1, "scheme must have at least 1 scheme specified");

                // Flatten the array into a string to be used to match the schemes.
                for (let i = 0; i < uriOptions.scheme.length; ++i) {
                    const scheme = uriOptions.scheme[i];
                    assert(scheme instanceof RegExp || is.string(scheme), `scheme at position ${i} must be a RegExp or String`);

                    // Add OR separators if a value already exists
                    customScheme = customScheme + (customScheme ? "|" : "");

                    // If someone wants to match HTTP or HTTPS for example then we need to support both RegExp and String so we don't escape their pattern unknowingly.
                    if (scheme instanceof RegExp) {
                        customScheme = customScheme + scheme.source;
                    } else {
                        assert(/[a-zA-Z][a-zA-Z0-9+-\.]*/.test(scheme), `scheme at position ${i} must be a valid scheme`);
                        customScheme = customScheme + escapeRegex(scheme);
                    }
                }
            }

            if (uriOptions.allowRelative) {
                allowRelative = true;
            }

            if (uriOptions.relativeOnly) {
                relativeOnly = true;
            }

            if (uriOptions.allowQuerySquareBrackets) {
                allowQuerySquareBrackets = true;
            }
        }

        if (customScheme || allowRelative || relativeOnly || allowQuerySquareBrackets) {
            regex = Uri.createUriRegex(customScheme, allowRelative, relativeOnly, allowQuerySquareBrackets);
        }

        return this._test("uri", uriOptions, function (value, state, options) {

            if (regex.test(value)) {
                return value;
            }

            if (relativeOnly) {
                return this.createError("string.uriRelativeOnly", { value }, state, options);
            }

            if (customScheme) {
                return this.createError("string.uriCustomScheme", { scheme: customScheme, value }, state, options);
            }

            return this.createError("string.uri", { value }, state, options);
        });
    }

    isoDate() {

        return this._test("isoDate", undefined, function (value, state, options) {

            if (JoiDate._isIsoDate(value)) {
                if (!options.convert) {
                    return value;
                }

                const d = new Date(value);
                if (!isNaN(d.getTime())) {
                    return d.toISOString();
                }
            }

            return this.createError("string.isoDate", { value }, state, options);
        });
    }

    guid(guidOptions) {

        let versionNumbers = "";

        if (guidOptions && guidOptions.version) {
            if (!is.array(guidOptions.version)) {
                guidOptions.version = [guidOptions.version];
            }

            assert(guidOptions.version.length >= 1, "version must have at least 1 valid version specified");
            const versions = new Set();

            for (let i = 0; i < guidOptions.version.length; ++i) {
                let version = guidOptions.version[i];
                assert(is.string(version), `version at position ${i} must be a string`);
                version = version.toLowerCase();
                const versionNumber = internals.guidVersions[version];
                assert(versionNumber, `version at position ${i} must be one of ${Object.keys(internals.guidVersions).join(", ")}`);
                assert(!(versions.has(versionNumber)), `version at position ${i} must not be a duplicate.`);

                versionNumbers += versionNumber;
                versions.add(versionNumber);
            }
        }

        const guidRegex = new RegExp(`^([\\[{\\(]?)[0-9A-F]{8}([:-]?)[0-9A-F]{4}\\2?[${versionNumbers || "0-9A-F"}][0-9A-F]{3}\\2?[${versionNumbers ? "89AB" : "0-9A-F"}][0-9A-F]{3}\\2?[0-9A-F]{12}([\\]}\\)]?)$`, "i");

        return this._test("guid", guidOptions, function (value, state, options) {

            const results = guidRegex.exec(value);

            if (!results) {
                return this.createError("string.guid", { value }, state, options);
            }

            // Matching braces
            if (internals.guidBrackets[results[1]] !== results[results.length - 1]) {
                return this.createError("string.guid", { value }, state, options);
            }

            return value;
        });
    }

    hex(hexOptions = {}) {
        assert(typeof hexOptions === "object", "hex options must be an object");
        assert(is.undefined(hexOptions.byteAligned) || is.boolean(hexOptions.byteAligned), "byteAligned must be boolean");

        const byteAligned = hexOptions.byteAligned === true;
        const regex = /^[a-f0-9]+$/i;

        const obj = this._test("hex", regex, function (value, state, options) {
            if (regex.test(value)) {
                if (byteAligned && value.length % 2 !== 0) {
                    return this.createError("string.hexAlign", { value }, state, options);
                }
                return value;
            }

            return this.createError("string.hex", { value }, state, options);
        });

        if (byteAligned) {
            obj._flags.byteAligned = true;
        }

        return obj;
    }

    base64(base64Options = {}) {

        // Validation.
        assert(typeof base64Options === "object", "base64 options must be an object");
        assert(is.undefined(base64Options.paddingRequired) || is.boolean(base64Options.paddingRequired), "paddingRequired must be boolean");

        // Determine if padding is required.
        const paddingRequired = base64Options.paddingRequired === false ?
            base64Options.paddingRequired
            : base64Options.paddingRequired || true;

        // Set validation based on preference.
        const regex = paddingRequired ?
            // Padding is required.
            /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/
            // Padding is optional.
            : /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}(==)?|[A-Za-z0-9+\/]{3}=?)?$/;

        return this._test("base64", regex, function (value, state, options) {

            if (regex.test(value)) {
                return value;
            }

            return this.createError("string.base64", { value }, state, options);
        });
    }

    dataUri(dataUriOptions = {}) {
        const regex = /^data:[\w\/\+]+;((charset=[\w-]+|base64),)?(.*)$/;

        // Determine if padding is required.
        const paddingRequired = dataUriOptions.paddingRequired === false ?
            dataUriOptions.paddingRequired
            : dataUriOptions.paddingRequired || true;
        const base64regex = paddingRequired ?
            /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/
            : /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}(==)?|[A-Za-z0-9+\/]{3}=?)?$/;

        return this._test("dataUri", regex, function (value, state, options) {
            const matches = value.match(regex);
            if (matches) {
                if (!matches[2]) {
                    return value;
                }
                if (matches[2] !== "base64") {
                    return value;
                }
                if (base64regex.test(matches[3])) {
                    return value;
                }
            }
            return this.createError("string.dataUri", { value }, state, options);
        });
    }

    hostname() {
        const regex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

        return this._test("hostname", undefined, function (value, state, options) {

            if ((value.length <= 255 && regex.test(value)) || net.isIPv6(value)) {
                return value;
            }

            return this.createError("string.hostname", { value }, state, options);
        });
    }

    normalize(form = "NFC") {

        assert(contain(internals.normalizationForms, form), `normalization form must be one of ${internals.normalizationForms.join(", ")}`);

        const obj = this._test("normalize", form, function (value, state, options) {

            if (options.convert ||
                value === value.normalize(form)) {

                return value;
            }

            return this.createError("string.normalize", { value, form }, state, options);
        });

        obj._flags.normalize = form;
        return obj;
    }

    lowercase() {

        const obj = this._test("lowercase", undefined, function (value, state, options) {

            if (options.convert ||
                value === value.toLocaleLowerCase()) {

                return value;
            }

            return this.createError("string.lowercase", { value }, state, options);
        });

        obj._flags.case = "lower";
        return obj;
    }

    uppercase() {

        const obj = this._test("uppercase", undefined, function (value, state, options) {

            if (options.convert ||
                value === value.toLocaleUpperCase()) {

                return value;
            }

            return this.createError("string.uppercase", { value }, state, options);
        });

        obj._flags.case = "upper";
        return obj;
    }

    trim(enabled = true) {
        assert(is.boolean(enabled), "Option must be a boolean");

        if ((this._flags.trim && enabled) || (!this._flags.trim && !enabled)) {
            return this;
        }
        
        let obj;
        if (enabled) {
            obj = this._test("trim", undefined, function (value, state, options) {

                if (options.convert ||
                    value === value.trim()) {

                    return value;
                }

                return this.createError("string.trim", { value }, state, options);
            });
        } else {
            obj = this.clone();
            obj._tests = obj._tests.filter((test) => test.name !== "trim");
        }

        obj._flags.trim = enabled;
        return obj;
    }

    replace(pattern, replacement) {

        if (is.string(pattern)) {
            pattern = new RegExp(escapeRegex(pattern), "g");
        }

        assert(pattern instanceof RegExp, "pattern must be a RegExp");
        assert(is.string(replacement), "replacement must be a String");

        // This can not be considere a test like trim, we can't "reject"
        // anything from this rule, so just clone the current object
        const obj = this.clone();

        if (!obj._inner.replacements) {
            obj._inner.replacements = [];
        }

        obj._inner.replacements.push({
            pattern,
            replacement
        });

        return obj;
    }

    truncate(enabled) {

        const value = is.undefined(enabled) ? true : Boolean(enabled);

        if (this._flags.truncate === value) {
            return this;
        }

        const obj = this.clone();
        obj._flags.truncate = value;
        return obj;
    }

};

internals.compare = function (type, compare) {

    return function (limit, encoding) {

        const isRef_ = isRef(limit);

        assert((is.safeInteger(limit) && limit >= 0) || isRef_, "limit must be a positive integer or reference");
        assert(!encoding || Buffer.isEncoding(encoding), "Invalid encoding:", encoding);

        return this._test(type, limit, function (value, state, options) {

            let compareTo;
            if (isRef_) {
                compareTo = limit(state.reference || state.parent, options);

                if (!is.safeInteger(compareTo)) {
                    return this.createError("string.ref", { ref: limit.key }, state, options);
                }
            } else {
                compareTo = limit;
            }

            if (compare(value, compareTo, encoding)) {
                return value;
            }

            return this.createError(`string.${type}`, { limit: compareTo, value, encoding }, state, options);
        });
    };
};


internals.String.prototype.min = internals.compare("min", (value, limit, encoding) => {

    const length = encoding ? Buffer.byteLength(value, encoding) : value.length;
    return length >= limit;
});


internals.String.prototype.max = internals.compare("max", (value, limit, encoding) => {

    const length = encoding ? Buffer.byteLength(value, encoding) : value.length;
    return length <= limit;
});


internals.String.prototype.length = internals.compare("length", (value, limit, encoding) => {

    const length = encoding ? Buffer.byteLength(value, encoding) : value.length;
    return length === limit;
});

// Aliases

internals.String.prototype.uuid = internals.String.prototype.guid;

module.exports = new internals.String();
