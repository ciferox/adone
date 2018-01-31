const {
    fake
} = adone;

/**
 * phoneNumber
 *
 * @method fake.phone.phoneNumber
 * @param {string} format
 */
export const phoneNumber = function (format) {
    format = format || fake.phone.phoneFormats();
    return fake.helpers.replaceSymbolWithNumber(format);
};

// FIXME: this is strange passing in an array index.
/**
 * phoneNumberFormat
 *
 * @method fake.phone.phoneFormatsArrayIndex
 * @param phoneFormatsArrayIndex
 */
export const phoneNumberFormat = function (phoneFormatsArrayIndex) {
    phoneFormatsArrayIndex = phoneFormatsArrayIndex || 0;
    return fake.helpers.replaceSymbolWithNumber(fake.definitions.phone_number.formats[phoneFormatsArrayIndex]);
};

/**
 * phoneFormats
 *
 * @method fake.phone.phoneFormats
 */
export const phoneFormats = function () {
    return fake.random.arrayElement(fake.definitions.phone_number.formats);
};

