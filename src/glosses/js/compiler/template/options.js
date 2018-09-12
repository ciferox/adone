const {
    is
} = adone;

export const merge = function (a, b) {
    const {
        placeholderWhitelist = a.placeholderWhitelist,
        placeholderPattern = a.placeholderPattern,
        preserveComments = a.preserveComments
    } = b;

    return {
        parser: {
            ...a.parser,
            ...b.parser
        },
        placeholderWhitelist,
        placeholderPattern,
        preserveComments
    };
};

export const validate = function (opts) {
    if (!is.nil(opts) && typeof opts !== "object") {
        throw new Error("Unknown template options.");
    }

    const {
        placeholderWhitelist,
        placeholderPattern,
        preserveComments,
        ...parser
    } =
        opts || {};

    if (!is.nil(placeholderWhitelist) && !(placeholderWhitelist instanceof Set)) {
        throw new Error(
            "'.placeholderWhitelist' must be a Set, null, or undefined",
        );
    }

    if (
        !is.nil(placeholderPattern) &&
        !(placeholderPattern instanceof RegExp) &&
        placeholderPattern !== false
    ) {
        throw new Error(
            "'.placeholderPattern' must be a RegExp, false, null, or undefined",
        );
    }

    if (!is.nil(preserveComments) && !is.boolean(preserveComments)) {
        throw new Error(
            "'.preserveComments' must be a boolean, null, or undefined",
        );
    }

    return {
        parser,
        placeholderWhitelist: placeholderWhitelist || undefined,
        placeholderPattern:
            is.nil(placeholderPattern) ? undefined : placeholderPattern,
        preserveComments: is.nil(preserveComments) ? false : preserveComments
    };
};

export const normalizeReplacements = function (replacements) {
    if (is.array(replacements)) {
        return replacements.reduce((acc, replacement, i) => {
            acc[`$${i}`] = replacement;
            return acc;
        }, {});
    } else if (typeof replacements === "object" || is.nil(replacements)) {
        return replacements || undefined;
    }

    throw new Error(
        "Template replacements must be an array, object, null, or undefined",
    );
};
