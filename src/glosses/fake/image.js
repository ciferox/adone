const {
    is,
    fake
} = adone;

/**
 * image
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.image
 */
export const image = function (width, height, randomize) {
    const categories = ["abstract", "animals", "business", "cats", "city", "food", "nightlife", "fashion", "people", "nature", "sports", "technics", "transport"];
    return exports[fake.random.arrayElement(categories)](width, height, randomize);
};
/**
 * avatar
 *
 * @method fake.image.avatar
 */
export const avatar = function () {
    return fake.internet.avatar();
};
/**
 * imageUrl
 *
 * @param {number} width
 * @param {number} height
 * @param {string} category
 * @param {boolean} randomize
 * @method fake.image.imageUrl
 */
export const imageUrl = function (width, height, category, randomize, https) {
    width = width || 640;
    height = height || 480;
    let protocol = "http://";
    if (!is.undefined(https) && https === true) {
        protocol = "https://";
    }
    let url = `${protocol}lorempixel.com/${width}/${height}`;
    if (!is.undefined(category)) {
        url += `/${category}`;
    }

    if (randomize) {
        url += `?${fake.random.number()}`;
    }

    return url;
};
/**
 * abstract
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.abstract
 */
export const abstract = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "abstract", randomize);
};
/**
 * animals
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.animals
 */
export const animals = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "animals", randomize);
};
/**
 * business
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.business
 */
export const business = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "business", randomize);
};
/**
 * cats
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.cats
 */
export const cats = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "cats", randomize);
};
/**
 * city
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.city
 */
export const city = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "city", randomize);
};
/**
 * food
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.food
 */
export const food = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "food", randomize);
};
/**
 * nightlife
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.nightlife
 */
export const nightlife = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "nightlife", randomize);
};
/**
 * fashion
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.fashion
 */
export const fashion = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "fashion", randomize);
};
/**
 * people
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.people
 */
export const people = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "people", randomize);
};
/**
 * nature
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.nature
 */
export const nature = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "nature", randomize);
};
/**
 * sports
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.sports
 */
export const sports = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "sports", randomize);
};
/**
 * technics
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.technics
 */
export const technics = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "technics", randomize);
};
/**
 * transport
 *
 * @param {number} width
 * @param {number} height
 * @param {boolean} randomize
 * @method fake.image.transport
 */
export const transport = function (width, height, randomize) {
    return fake.image.imageUrl(width, height, "transport", randomize);
};
/**
 * dataUri
 *
 * @param {number} width
 * @param {number} height
 * @method fake.image.dataurl
 */
export const dataUri = function (width, height) {
    const rawPrefix = "data:image/svg+xml;charset=UTF-8,";
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" baseProfile="full" width="${width}" height="${height}"> <rect width="100%" height="100%" fill="grey"/>  <text x="0" y="20" font-size="20" text-anchor="start" fill="white">${width}x${height}</text> </svg>`;
    return rawPrefix + encodeURIComponent(svgString);
};
