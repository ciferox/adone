const {
    is,
    fake
} = adone;

/**
 * Generates random zipcode from format. If format is not specified, the
 * locale's zip format is used.
 *
 * @method fake.address.zipCode
 * @param {String} format
 */
export const zipCode = function (format) {
    // if zip format is not specified, use the zip format defined for the locale
    if (is.undefined(format)) {
        const localeFormat = fake.definitions.address.postcode;
        if (is.string(localeFormat)) {
            format = localeFormat;
        } else {
            format = fake.random.arrayElement(localeFormat);
        }
    }
    return fake.helpers.replaceSymbols(format);
};

/**
 * Generates a random localized city name. The format string can contain any
 * method provided by faker wrapped in `{{}}`, e.g. `{{name.firstName}}` in
 * order to build the city name.
 *
 * If no format string is provided one of the following is randomly used:
 *
 * * `{{address.cityPrefix}} {{name.firstName}}{{address.citySuffix}}`
 * * `{{address.cityPrefix}} {{name.firstName}}`
 * * `{{name.firstName}}{{address.citySuffix}}`
 * * `{{name.lastName}}{{address.citySuffix}}`
 *
 * @method fake.address.city
 * @param {String} format
 */
export const city = function (format) {
    const formats = [
        "{{address.cityPrefix}} {{name.firstName}}{{address.citySuffix}}",
        "{{address.cityPrefix}} {{name.firstName}}",
        "{{name.firstName}}{{address.citySuffix}}",
        "{{name.lastName}}{{address.citySuffix}}"
    ];

    if (!is.number(format)) {
        format = fake.random.number(formats.length - 1);
    }

    return fake.fake(formats[format]);

};

/**
 * Return a random localized city prefix
 * @method fake.address.cityPrefix
 */
export const cityPrefix = function () {
    return fake.random.arrayElement(fake.definitions.address.city_prefix);
};

/**
 * Return a random localized city suffix
 *
 * @method fake.address.citySuffix
 */
export const citySuffix = function () {
    return fake.random.arrayElement(fake.definitions.address.city_suffix);
};

/**
 * Returns a random localized street name
 *
 * @method fake.address.streetName
 */
export const streetName = function () {
    let result;
    let suffix = fake.address.streetSuffix();
    if (suffix !== "") {
        suffix = ` ${suffix}`;
    }

    switch (fake.random.number(1)) {
        case 0:
            result = fake.name.lastName() + suffix;
            break;
        case 1:
            result = fake.name.firstName() + suffix;
            break;
    }
    return result;
};

//
// TODO: change all these methods that accept a boolean to instead accept an options hash.
//
/**
 * Returns a random localized street address
 *
 * @method fake.address.streetAddress
 * @param {Boolean} useFullAddress
 */
export const streetAddress = function (useFullAddress) {
    if (is.undefined(useFullAddress)) {
        useFullAddress = false;
    }
    let address = "";
    switch (fake.random.number(2)) {
        case 0:
            address = `${fake.helpers.replaceSymbolWithNumber("#####")} ${fake.address.streetName()}`;
            break;
        case 1:
            address = `${fake.helpers.replaceSymbolWithNumber("####")} ${fake.address.streetName()}`;
            break;
        case 2:
            address = `${fake.helpers.replaceSymbolWithNumber("###")} ${fake.address.streetName()}`;
            break;
    }
    return useFullAddress ? (`${address} ${fake.address.secondaryAddress()}`) : address;
};

/**
 * streetSuffix
 *
 * @method fake.address.streetSuffix
 */
export const streetSuffix = function () {
    return fake.random.arrayElement(fake.definitions.address.street_suffix);
};

/**
 * streetPrefix
 *
 * @method fake.address.streetPrefix
 */
export const streetPrefix = function () {
    return fake.random.arrayElement(fake.definitions.address.street_prefix);
};

/**
 * secondaryAddress
 *
 * @method fake.address.secondaryAddress
 */
export const secondaryAddress = function () {
    return fake.helpers.replaceSymbolWithNumber(fake.random.arrayElement(
        [
            "Apt. ###",
            "Suite ###"
        ]
    ));
};

/**
 * county
 *
 * @method fake.address.county
 */
export const county = function () {
    return fake.random.arrayElement(fake.definitions.address.county);
};

/**
 * country
 *
 * @method fake.address.country
 */
export const country = function () {
    return fake.random.arrayElement(fake.definitions.address.country);
};

/**
 * countryCode
 *
 * @method fake.address.countryCode
 */
export const countryCode = function () {
    return fake.random.arrayElement(fake.definitions.address.country_code);
};

/**
 * state
 *
 * @method fake.address.state
 * @param {Boolean} useAbbr
 */
export const state = function (useAbbr) {
    return fake.random.arrayElement(fake.definitions.address.state);
};

/**
 * stateAbbr
 *
 * @method fake.address.stateAbbr
 */
export const stateAbbr = function () {
    return fake.random.arrayElement(fake.definitions.address.state_abbr);
};

/**
 * latitude
 *
 * @method fake.address.latitude
 * @param {Double} max default is 90
 * @param {Double} min default is -90
 */
export const latitude = function (max, min) {
    max = max || 90;
    min = min || -90;
    return fake.random.number({ max, min, precision: 0.0001 }).toFixed(4);
};

/**
 * longitude
 *
 * @method fake.address.longitude
 * @param {Double} max default is 180
 * @param {Double} min default is -180
 */
export const longitude = function (max, min) {
    max = max || 180;
    min = min || -180;
    return fake.random.number({ max, min, precision: 0.0001 }).toFixed(4);
};

/**
 *  direction
 *
 * @method fake.address.direction
 * @param {Boolean} useAbbr return direction abbreviation. defaults to false
 */
export const direction = function (useAbbr) {
    if (is.undefined(useAbbr) || useAbbr === false) {
        return fake.random.arrayElement(fake.definitions.address.direction);
    }
    return fake.random.arrayElement(fake.definitions.address.direction_abbr);
};

direction.schema = {
    description: "Generates a direction. Use optional useAbbr bool to return abbrevation",
    sampleResults: ["Northwest", "South", "SW", "E"]
};

/**
 * cardinal direction
 *
 * @method fake.address.cardinalDirection
 * @param {Boolean} useAbbr return direction abbreviation. defaults to false
 */
export const cardinalDirection = function (useAbbr) {
    if (is.undefined(useAbbr) || useAbbr === false) {
        return (
            fake.random.arrayElement(fake.definitions.address.direction.slice(0, 4))
        );
    }
    return (
        fake.random.arrayElement(fake.definitions.address.direction_abbr.slice(0, 4))
    );
};

cardinalDirection.schema = {
    description: "Generates a cardinal direction. Use optional useAbbr boolean to return abbrevation",
    sampleResults: ["North", "South", "E", "W"]
};

/**
 * ordinal direction
 *
 * @method fake.address.ordinalDirection
 * @param {Boolean} useAbbr return direction abbreviation. defaults to false
 */
export const ordinalDirection = function (useAbbr) {
    if (is.undefined(useAbbr) || useAbbr === false) {
        return (
            fake.random.arrayElement(fake.definitions.address.direction.slice(4, 8))
        );
    }
    return (
        fake.random.arrayElement(fake.definitions.address.direction_abbr.slice(4, 8))
    );
};

ordinalDirection.schema = {
    description: "Generates an ordinal direction. Use optional useAbbr boolean to return abbrevation",
    sampleResults: ["Northwest", "Southeast", "SW", "NE"]
};
