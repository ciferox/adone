const {
    is,
    fake
} = adone;

/**
 * word
 *
 * @method fake.lorem.word
 * @param {number} num
 */
export const word = function (num) {
    return fake.random.arrayElement(fake.definitions.lorem.words);
};

/**
 * generates a space separated list of words
 *
 * @method fake.lorem.words
 * @param {number} num number of words, defaults to 3
 */
export const words = function (num) {
    if (is.undefined(num)) {
        num = 3;
    }
    const words = [];
    for (let i = 0; i < num; i++) {
        words.push(fake.lorem.word());
    }
    return words.join(" ");
};

/**
 * sentence
 *
 * @method fake.lorem.sentence
 * @param {number} wordCount defaults to a random number between 3 and 10
 * @param {number} range
 */
export const sentence = function (wordCount, range) {
    if (is.undefined(wordCount)) {
        wordCount = fake.random.number({ min: 3, max: 10 });
    }
    // if (typeof range == 'undefined') { range = 7; }

    // strange issue with the node_min_test failing for captialize, please fix and add fake.lorem.back
    //return  fake.lorem.words(wordCount + fake.helpers.randomNumber(range)).join(' ').capitalize();

    const sentence = fake.lorem.words(wordCount);
    return `${sentence.charAt(0).toUpperCase() + sentence.slice(1)}.`;
};

/**
 * slug
 *
 * @method fake.lorem.slug
 * @param {number} wordCount number of words, defaults to 3
 */
export const slug = function (wordCount) {
    const words = fake.lorem.words(wordCount);
    return fake.helpers.slugify(words);
};

/**
 * sentences
 *
 * @method fake.lorem.sentences
 * @param {number} sentenceCount defautls to a random number between 2 and 6
 * @param {string} separator defaults to `' '`
 */
export const sentences = function (sentenceCount, separator) {
    if (is.undefined(sentenceCount)) {
        sentenceCount = fake.random.number({ min: 2, max: 6 });
    }
    if (is.undefined(separator)) {
        separator = " ";
    }
    const sentences = [];
    for (sentenceCount; sentenceCount > 0; sentenceCount--) {
        sentences.push(fake.lorem.sentence());
    }
    return sentences.join(separator);
};

/**
 * paragraph
 *
 * @method fake.lorem.paragraph
 * @param {number} sentenceCount defaults to 3
 */
export const paragraph = function (sentenceCount) {
    if (is.undefined(sentenceCount)) {
        sentenceCount = 3;
    }
    return fake.lorem.sentences(sentenceCount + fake.random.number(3));
};

/**
 * paragraphs
 *
 * @method fake.lorem.paragraphs
 * @param {number} paragraphCount defaults to 3
 * @param {string} separator defaults to `'\n \r'`
 */
export const paragraphs = function (paragraphCount, separator) {
    if (is.undefined(separator)) {
        separator = "\n \r";
    }
    if (is.undefined(paragraphCount)) {
        paragraphCount = 3;
    }
    const paragraphs = [];
    for (paragraphCount; paragraphCount > 0; paragraphCount--) {
        paragraphs.push(fake.lorem.paragraph());
    }
    return paragraphs.join(separator);
};

/**
 * returns random text based on a random lorem method
 *
 * @method fake.lorem.text
 * @param {number} times
 */
export const text = function (times) {
    const loremMethods = ["lorem.word", "lorem.words", "lorem.sentence", "lorem.sentences", "lorem.paragraph", "lorem.paragraphs", "lorem.lines"];
    const randomLoremMethod = fake.random.arrayElement(loremMethods);
    return fake.fake(`{{${randomLoremMethod}}}`);
};

/**
 * returns lines of lorem separated by `'\n'`
 *
 * @method fake.lorem.lines
 * @param {number} lineCount defaults to a random number between 1 and 5
 */
export const lines = function lines(lineCount) {
    if (is.undefined(lineCount)) {
        lineCount = fake.random.number({ min: 1, max: 5 });
    }
    return fake.lorem.sentences(lineCount, "\n");
};
