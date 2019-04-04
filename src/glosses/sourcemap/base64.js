const intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
export const encode = function (number) {
    if (number >= 0 && number < intToCharMap.length) {
        return intToCharMap[number];
    }
    throw new TypeError(`Must be between 0 and 63: ${number}`);
};
