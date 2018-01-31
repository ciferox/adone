const {
    is,
    fake
} = adone;

/**
 * color
 *
 * @method fake.commerce.color
 */
export const color = function () {
    return fake.random.arrayElement(fake.definitions.commerce.color);
};

/**
 * department
 *
 * @method fake.commerce.department
 */
export const department = function () {
    return fake.random.arrayElement(fake.definitions.commerce.department);
};

/**
 * productName
 *
 * @method fake.commerce.productName
 */
export const productName = function () {
    return `${fake.commerce.productAdjective()} ${
        fake.commerce.productMaterial()} ${
        fake.commerce.product()}`;
};

/**
 * price
 *
 * @method fake.commerce.price
 * @param {number} min
 * @param {number} max
 * @param {number} dec
 * @param {string} symbol
 *
 * @return {string}
 */
export const price = function (min, max, dec, symbol) {
    min = min || 1;
    max = max || 1000;
    dec = is.undefined(dec) ? 2 : dec;
    symbol = symbol || "";

    if (min < 0 || max < 0) {
        return symbol + 0.00;
    }

    const randValue = fake.random.number({ max, min });

    return symbol + (Math.round(randValue * Math.pow(10, dec)) / Math.pow(10, dec)).toFixed(dec);
};

/**
 * export const categories = function(num) {
 * var categories = [];
 *
 * do {
 * var category = fake.random.arrayElement(fake.definitions.commerce.department);
 * if(categories.indexOf(category) === -1) {
 * categories.push(category);
 * }
 * } while(categories.length < num);
 *
 * return categories;
 * };
 *
 */
/**
 * export const mergeCategories = function(categories) {
 * var separator = fake.definitions.separator || " &";
 * // TODO: find undefined here
 * categories = categories || fake.definitions.commerce.categories;
 * var commaSeparated = categories.slice(0, -1).join(', ');
 *
 * return [commaSeparated, categories[categories.length - 1]].join(separator + " ");
 * };
 */

/**
 * productAdjective
 *
 * @method fake.commerce.productAdjective
 */
export const productAdjective = function () {
    return fake.random.arrayElement(fake.definitions.commerce.product_name.adjective);
};

/**
 * productMaterial
 *
 * @method fake.commerce.productMaterial
 */
export const productMaterial = function () {
    return fake.random.arrayElement(fake.definitions.commerce.product_name.material);
};

/**
 * product
 *
 * @method fake.commerce.product
 */
export const product = function () {
    return fake.random.arrayElement(fake.definitions.commerce.product_name.product);
};
