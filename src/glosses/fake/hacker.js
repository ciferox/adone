const {
    fake
} = adone;

/**
 * abbreviation
 *
 * @method fake.hacker.abbreviation
 */
export const abbreviation = function () {
    return fake.random.arrayElement(fake.definitions.hacker.abbreviation);
};

/**
 * adjective
 *
 * @method fake.hacker.adjective
 */
export const adjective = function () {
    return fake.random.arrayElement(fake.definitions.hacker.adjective);
};

/**
 * noun
 *
 * @method fake.hacker.noun
 */
export const noun = function () {
    return fake.random.arrayElement(fake.definitions.hacker.noun);
};

/**
 * verb
 *
 * @method fake.hacker.verb
 */
export const verb = function () {
    return fake.random.arrayElement(fake.definitions.hacker.verb);
};

/**
 * ingverb
 *
 * @method fake.hacker.ingverb
 */
export const ingverb = function () {
    return fake.random.arrayElement(fake.definitions.hacker.ingverb);
};

/**
 * phrase
 *
 * @method fake.hacker.phrase
 */
export const phrase = function () {
    const data = {
        abbreviation,
        adjective,
        ingverb,
        noun,
        verb
    };

    const phrase = fake.random.arrayElement(fake.definitions.hacker.phrase);
    return fake.helpers.mustache(phrase, data);
};

