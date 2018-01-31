const {
    is,
    fake
} = adone;

/**
 * account
 *
 * @method fake.finance.account
 * @param {number} length
 */
export const account = function (length) {
    length = length || 8;

    let template = "";

    for (let i = 0; i < length; i++) {
        template = `${template}#`;
    }
    length = null;
    return fake.helpers.replaceSymbolWithNumber(template);
};

/**
 * accountName
 *
 * @method fake.finance.accountName
 */
export const accountName = function () {
    return [fake.helpers.randomize(fake.definitions.finance.account_type), "Account"].join(" ");
};

/**
 * routingNumber
 *
 * @method fake.finance.routingNumber
 */
export const routingNumber = function () {
    const routingNumber = fake.helpers.replaceSymbolWithNumber("########");

    // Modules 10 straight summation.
    let sum = 0;

    for (let i = 0; i < routingNumber.length; i += 3) {
        sum += Number(routingNumber[i]) * 3;
        sum += Number(routingNumber[i + 1]) * 7;
        sum += Number(routingNumber[i + 2]) || 0;
    }

    return routingNumber + (Math.ceil(sum / 10) * 10 - sum);
};

/**
 * mask
 *
 * @method fake.finance.mask
 * @param {number} length
 * @param {boolean} parens
 * @param {boolean} ellipsis
 */
export const mask = function (length, parens, ellipsis) {
    //set defaults
    length = (length == 0 || !length || is.undefined(length)) ? 4 : length;
    parens = (is.null(parens)) ? true : parens;
    ellipsis = (is.null(ellipsis)) ? true : ellipsis;

    //create a template for length
    let template = "";

    for (let i = 0; i < length; i++) {
        template = `${template}#`;
    }

    //prefix with ellipsis
    template = (ellipsis) ? ["...", template].join("") : template;

    template = (parens) ? ["(", template, ")"].join("") : template;

    //generate random numbers
    template = fake.helpers.replaceSymbolWithNumber(template);

    return template;
};

//min and max take in minimum and maximum amounts, dec is the decimal place you want rounded to, symbol is $, €, £, etc
//NOTE: this returns a string representation of the value, if you want a number use parseFloat and no symbol

/**
 * amount
 *
 * @method fake.finance.amount
 * @param {number} min
 * @param {number} max
 * @param {number} dec
 * @param {string} symbol
 *
 * @return {string}
 */
export const amount = function (min, max, dec, symbol) {
    min = min || 0;
    max = max || 1000;
    dec = is.undefined(dec) ? 2 : dec;
    symbol = symbol || "";
    const randValue = fake.random.number({ max, min, precision: Math.pow(10, -dec) });

    return symbol + randValue.toFixed(dec);
};

/**
 * transactionType
 *
 * @method fake.finance.transactionType
 */
export const transactionType = function () {
    return fake.helpers.randomize(fake.definitions.finance.transaction_type);
};

/**
 * currencyCode
 *
 * @method fake.finance.currencyCode
 */
export const currencyCode = function () {
    return fake.random.objectElement(fake.definitions.finance.currency).code;
};

/**
 * currencyName
 *
 * @method fake.finance.currencyName
 */
export const currencyName = function () {
    return fake.random.objectElement(fake.definitions.finance.currency, "key");
};

/**
 * currencySymbol
 *
 * @method fake.finance.currencySymbol
 */
export const currencySymbol = function () {
    let symbol;

    while (!symbol) {
        symbol = fake.random.objectElement(fake.definitions.finance.currency).symbol;
    }
    return symbol;
};

/**
 * bitcoinAddress
 *
 * @method  fake.finance.bitcoinAddress
 */
export const bitcoinAddress = function () {
    const addressLength = fake.random.number({ min: 27, max: 34 });

    let address = fake.random.arrayElement(["1", "3"]);

    for (let i = 0; i < addressLength - 1; i++) {
        address += fake.random.alphaNumeric().toUpperCase();
    }

    return address;
};

/**
 * Credit card number
 * @method fake.finance.creditCardNumber
 * @param {string} provider | scheme
 */
export const creditCardNumber = function (provider) {
    provider = provider || "";
    let format;
    let formats;
    const localeFormat = fake.definitions.finance.credit_card;
    if (provider in localeFormat) {
        formats = localeFormat[provider]; // there chould be multiple formats
        if (is.string(formats)) {
            format = formats;
        } else {
            format = fake.random.arrayElement(formats);
        }
    } else if (provider.match(/#/)) { // The user chose an optional scheme
        format = provider;
    } else { // Choose a random provider
        if (is.string(localeFormat)) {
            format = localeFormat;
        } else if (typeof localeFormat === "object") {
            // Credit cards are in a object structure
            formats = fake.random.objectElement(localeFormat, "value"); // There chould be multiple formats
            if (is.string(formats)) {
                format = formats;
            } else {
                format = fake.random.arrayElement(formats);
            }
        }
    }
    format = format.replace(/\//g, "");
    return fake.helpers.replaceCreditCardSymbols(format);
};
/**
 * Credit card CVV
 * @method fake.finance.creditCardNumber
 */
export const creditCardCVV = function () {
    let cvv = "";
    for (let i = 0; i < 3; i++) {
        cvv += fake.random.number({ max: 9 }).toString();
    }
    return cvv;
};

/**
 * ethereumAddress
 *
 * @method  fake.finance.ethereumAddress
 */
export const ethereumAddress = function () {
    const address = fake.random.hexaDecimal(40);

    return address;
};

/**
 * iban
 *
 * @method  fake.finance.iban
 */
export const iban = function (formatted) {
    const ibanFormat = fake.random.arrayElement(fake.iban.formats);
    let s = "";
    let count = 0;
    for (let b = 0; b < ibanFormat.bban.length; b++) {
        const bban = ibanFormat.bban[b];
        let c = bban.count;
        count += bban.count;
        while (c > 0) {
            if (bban.type == "a") {
                s += fake.random.arrayElement(fake.iban.alpha);
            } else if (bban.type == "c") {
                if (fake.random.number(100) < 80) {
                    s += fake.random.number(9);
                } else {
                    s += fake.random.arrayElement(fake.iban.alpha);
                }
            } else {
                if (c >= 3 && fake.random.number(100) < 30) {
                    if (fake.random.boolean()) {
                        s += fake.random.arrayElement(fake.iban.pattern100);
                        c -= 2;
                    } else {
                        s += fake.random.arrayElement(fake.iban.pattern10);
                        c--;
                    }
                } else {
                    s += fake.random.number(9);
                }
            }
            c--;
        }
        s = s.substring(0, count);
    }
    let checksum = 98 - fake.iban.mod97(fake.iban.toDigitString(`${s + ibanFormat.country}00`));
    if (checksum < 10) {
        checksum = `0${checksum}`;
    }
    const iban = ibanFormat.country + checksum + s;
    return formatted ? iban.match(/.{1,4}/g).join(" ") : iban;
};

/**
 * bic
 *
 * @method  fake.finance.bic
 */
export const bic = function () {
    const vowels = ["A", "E", "I", "O", "U"];
    const prob = fake.random.number(100);
    return `${fake.helpers.replaceSymbols("???") +
        fake.random.arrayElement(vowels) +
        fake.random.arrayElement(fake.iban.iso3166) +
        fake.helpers.replaceSymbols("?")}1${
        prob < 10 ?
            fake.helpers.replaceSymbols(`?${fake.random.arrayElement(vowels)}?`) :
            prob < 40 ?
                fake.helpers.replaceSymbols("###") : ""}`;
};
