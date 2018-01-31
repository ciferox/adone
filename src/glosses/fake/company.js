const {
    is,
    fake
} = adone;

/**
 * suffixes
 *
 * @method fake.company.suffixes
 */
export const suffixes = function () {
    // Don't want the source array exposed to modification, so return a copy
    return fake.definitions.company.suffix.slice(0);
};

/**
 * companyName
 *
 * @method fake.company.companyName
 * @param {string} format
 */
export const companyName = function (format) {
    const formats = [
        "{{name.lastName}} {{company.companySuffix}}",
        "{{name.lastName}} - {{name.lastName}}",
        "{{name.lastName}}, {{name.lastName}} and {{name.lastName}}"
    ];

    if (!is.number(format)) {
        format = fake.random.number(formats.length - 1);
    }

    return fake.fake(formats[format]);
};

/**
 * companySuffix
 *
 * @method fake.company.companySuffix
 */
export const companySuffix = function () {
    return fake.random.arrayElement(fake.company.suffixes());
};

/**
 * catchPhrase
 *
 * @method fake.company.catchPhrase
 */
export const catchPhrase = function () {
    return fake.fake("{{company.catchPhraseAdjective}} {{company.catchPhraseDescriptor}} {{company.catchPhraseNoun}}");
};

/**
 * bs
 *
 * @method fake.company.bs
 */
export const bs = function () {
    return fake.fake("{{company.bsBuzz}} {{company.bsAdjective}} {{company.bsNoun}}");
};

/**
 * catchPhraseAdjective
 *
 * @method fake.company.catchPhraseAdjective
 */
export const catchPhraseAdjective = function () {
    return fake.random.arrayElement(fake.definitions.company.adjective);
};

/**
 * catchPhraseDescriptor
 *
 * @method fake.company.catchPhraseDescriptor
 */
export const catchPhraseDescriptor = function () {
    return fake.random.arrayElement(fake.definitions.company.descriptor);
};

/**
 * catchPhraseNoun
 *
 * @method fake.company.catchPhraseNoun
 */
export const catchPhraseNoun = function () {
    return fake.random.arrayElement(fake.definitions.company.noun);
};

/**
 * bsAdjective
 *
 * @method fake.company.bsAdjective
 */
export const bsAdjective = function () {
    return fake.random.arrayElement(fake.definitions.company.bs_adjective);
};

/**
 * bsBuzz
 *
 * @method fake.company.bsBuzz
 */
export const bsBuzz = function () {
    return fake.random.arrayElement(fake.definitions.company.bs_verb);
};

/**
 * bsNoun
 *
 * @method fake.company.bsNoun
 */
export const bsNoun = function () {
    return fake.random.arrayElement(fake.definitions.company.bs_noun);
};
