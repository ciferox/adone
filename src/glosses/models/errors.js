import locale from "./locale";
import { clone, reach, escapeHtml } from "./utils";

const {
    is
} = adone;

const internals = {
    annotations: Symbol("joi-annotations")
};

internals.stringify = function (value, wrapArrays) {

    const type = typeof value;

    if (is.null(value)) {
        return "null";
    }

    if (type === "string") {
        return value;
    }

    if (value instanceof Err || type === "function" || type === "symbol") {
        return value.toString();
    }

    if (type === "object") {
        if (is.array(value)) {
            let partial = "";

            for (let i = 0; i < value.length; ++i) {
                partial = partial + (partial.length ? ", " : "") + internals.stringify(value[i], wrapArrays);
            }

            return wrapArrays ? `[${partial}]` : partial;
        }

        return value.toString();
    }

    return JSON.stringify(value);
};

export class Err {
    constructor(type, context, state, options, flags, message, template) {

        this.isJoi = true;
        this.type = type;
        this.context = context || {};
        this.context.key = state.path[state.path.length - 1];
        this.context.label = state.key;
        this.path = state.path;
        this.options = options;
        this.flags = flags;
        this.message = message;
        this.template = template;

        const localized = this.options.language;

        if (this.flags.label) {
            this.context.label = this.flags.label;
        } else if (localized && // language can be null for arrays exclusion check
            (this.context.label === "" ||
                is.null(this.context.label))) {
            this.context.label = localized.root || locale.root;
        }
    }

    toString() {

        if (this.message) {
            return this.message;
        }

        let format;

        if (this.template) {
            format = this.template;
        }

        const localized = this.options.language;

        format = format || reach(localized, this.type) || reach(locale, this.type);

        if (is.undefined(format)) {
            return `Error code "${this.type}" is not defined, your custom type is missing the correct language definition`;
        }

        let wrapArrays = reach(localized, "messages.wrapArrays");
        if (!is.boolean(wrapArrays)) {
            wrapArrays = locale.messages.wrapArrays;
        }

        if (is.null(format)) {
            const childrenString = internals.stringify(this.context.reason, wrapArrays);
            if (wrapArrays) {
                return childrenString.slice(1, -1);
            }
            return childrenString;
        }

        const hasKey = /\{\{\!?label\}\}/.test(format);
        const skipKey = format.length > 2 && format[0] === "!" && format[1] === "!";

        if (skipKey) {
            format = format.slice(2);
        }

        if (!hasKey && !skipKey) {
            const localizedKey = reach(localized, "key");
            if (is.string(localizedKey)) {
                format = localizedKey + format;
            } else {
                format = reach(locale, "key") + format;
            }
        }

        return format.replace(/\{\{(\!?)([^}]+)\}\}/g, ($0, isSecure, name) => {

            const value = reach(this.context, name);
            const normalized = internals.stringify(value, wrapArrays);
            return (isSecure && this.options.escapeHtml ? escapeHtml(normalized) : normalized);
        });
    }

}

export const create = (type, context, state, options, flags, message, template) => new Err(type, context, state, options, flags, message, template);

export const process = function (errs, object) {
    if (!errs || !errs.length) {
        return null;
    }

    // Construct error

    let message = "";
    const details = [];

    const processErrors = function (localErrors, parent) {

        for (let i = 0; i < localErrors.length; ++i) {
            const item = localErrors[i];

            if (item instanceof Error) {
                return item;
            }

            if (item.flags.error && !is.function(item.flags.error)) {
                return item.flags.error;
            }

            let itemMessage;
            if (is.undefined(parent)) {
                itemMessage = item.toString();
                message = message + (message ? ". " : "") + itemMessage;
            }

            // Do not push intermediate errors, we're only interested in leafs

            if (item.context.reason && item.context.reason.length) {
                const override = processErrors(item.context.reason, item.path);
                if (override) {
                    return override;
                }
            } else {
                details.push({
                    message: itemMessage || item.toString(),
                    path: item.path,
                    type: item.type,
                    context: item.context
                });
            }
        }
    };

    const override = processErrors(errs);
    if (override) {
        return override;
    }

    const error = new Error(message);
    error.isJoi = true;
    error.name = "ValidationError";
    error.details = details;
    error._object = object;
    error.annotate = internals.annotate;
    return error;
};


// Inspired by json-stringify-safe
internals.safeStringify = function (obj, spaces) {

    return JSON.stringify(obj, internals.serializer(), spaces);
};

internals.serializer = function () {

    const keys = [];
    const stack = [];

    const cycleReplacer = (key, value) => {

        if (stack[0] === value) {
            return "[Circular ~]";
        }

        return `[Circular ~.${keys.slice(0, stack.indexOf(value)).join(".")}]`;
    };

    return function (key, value) {

        if (stack.length > 0) {
            const thisPos = stack.indexOf(this);
            if (~thisPos) {
                stack.length = thisPos + 1;
                keys.length = thisPos + 1;
                keys[thisPos] = key;
            } else {
                stack.push(this);
                keys.push(key);
            }

            if (~stack.indexOf(value)) {
                value = cycleReplacer.call(this, key, value);
            }
        } else {
            stack.push(value);
        }

        if (value) {
            const annotations = value[internals.annotations];
            if (annotations) {
                if (is.array(value)) {
                    const annotated = [];

                    for (let i = 0; i < value.length; ++i) {
                        if (annotations.errors[i]) {
                            annotated.push(`_$idx$_${annotations.errors[i].sort().join(", ")}_$end$_`);
                        }
                        annotated.push(value[i]);
                    }

                    value = annotated;
                } else {
                    const errorKeys = Object.keys(annotations.errors);
                    for (let i = 0; i < errorKeys.length; ++i) {
                        const errorKey = errorKeys[i];
                        value[`${errorKey}_$key$_${annotations.errors[errorKey].sort().join(", ")}_$end$_`] = value[errorKey];
                        value[errorKey] = undefined;
                    }

                    const missingKeys = Object.keys(annotations.missing);
                    for (let i = 0; i < missingKeys.length; ++i) {
                        const missingKey = missingKeys[i];
                        value[`_$miss$_${missingKey}|${annotations.missing[missingKey]}_$end$_`] = "__missing__";
                    }
                }

                return value;
            }
        }

        if (value === Infinity || value === -Infinity || is.nan(value) ||
            is.function(value) || is.symbol(value)) {
            return `[${value.toString()}]`;
        }

        return value;
    };
};


internals.annotate = function (stripColorCodes) {
    const redFgEscape = stripColorCodes ? "" : "\u001b[31m";
    const redBgEscape = stripColorCodes ? "" : "\u001b[41m";
    const endColor = stripColorCodes ? "" : "\u001b[0m";

    if (typeof this._object !== "object") {
        return this.details[0].message;
    }

    const obj = clone(this._object || {});

    for (let i = this.details.length - 1; i >= 0; --i) { // Reverse order to process deepest child first
        const pos = i + 1;
        const error = this.details[i];
        const path = error.path;
        let ref = obj;
        for (let j = 0; ; ++j) {
            const seg = path[j];

            if (ref.isImmutable) {
                ref = ref.clone(); // joi schemas are not cloned, we have to take this extra step
            }

            if (j + 1 < path.length &&
                ref[seg] &&
                !is.string(ref[seg])) {

                ref = ref[seg];
            } else {
                const refAnnotations = ref[internals.annotations] = ref[internals.annotations] || { errors: {}, missing: {} };
                const value = ref[seg];
                const cacheKey = seg || error.context.label;

                if (!is.undefined(value)) {
                    refAnnotations.errors[cacheKey] = refAnnotations.errors[cacheKey] || [];
                    refAnnotations.errors[cacheKey].push(pos);
                } else {
                    refAnnotations.missing[cacheKey] = pos;
                }

                break;
            }
        }
    }

    const replacers = {
        key: /_\$key\$_([, \d]+)_\$end\$_\"/g,
        missing: /\"_\$miss\$_([^\|]+)\|(\d+)_\$end\$_\"\: \"__missing__\"/g,
        arrayIndex: /\s*\"_\$idx\$_([, \d]+)_\$end\$_\",?\n(.*)/g,
        specials: /"\[(NaN|Symbol.*|-?Infinity|function.*|\(.*)\]"/g
    };

    let message = internals.safeStringify(obj, 2)
        .replace(replacers.key, ($0, $1) => `" ${redFgEscape}[${$1}]${endColor}`)
        .replace(replacers.missing, ($0, $1, $2) => `${redBgEscape}"${$1}"${endColor}${redFgEscape} [${$2}]: -- missing --${endColor}`)
        .replace(replacers.arrayIndex, ($0, $1, $2) => `\n${$2} ${redFgEscape}[${$1}]${endColor}`)
        .replace(replacers.specials, ($0, $1) => $1);

    message = `${message}\n${redFgEscape}`;

    for (let i = 0; i < this.details.length; ++i) {
        const pos = i + 1;
        message = `${message}\n[${pos}] ${this.details[i].message}`;
    }

    message = message + endColor;

    return message;
};
