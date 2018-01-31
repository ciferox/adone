const {
    is,
    fake
} = adone;

/**
 * backword-compatibility
 *
 * @method fake.helpers.randomize
 * @param {array} array
 */
export const randomize = function (array) {
    array = array || ["a", "b", "c"];
    return fake.random.arrayElement(array);
};

/**
 * slugifies string
 *
 * @method fake.helpers.slugify
 * @param {string} string
 */
export const slugify = function (string) {
    string = string || "";
    return string.replace(/ /g, "-").replace(/[^\w\.\-]+/g, "");
};

/**
 * parses string for a symbol and replace it with a random number from 1-10
 *
 * @method fake.helpers.replaceSymbolWithNumber
 * @param {string} string
 * @param {string} symbol defaults to `"#"`
 */
export const replaceSymbolWithNumber = function (string, symbol) {
    string = string || "";
    // default symbol is '#'
    if (is.undefined(symbol)) {
        symbol = "#";
    }

    let str = "";
    for (let i = 0; i < string.length; i++) {
        if (string.charAt(i) == symbol) {
            str += fake.random.number(9);
        } else if (string.charAt(i) == "!") {
            str += fake.random.number({ min: 2, max: 9 });
        } else {
            str += string.charAt(i);
        }
    }
    return str;
};

/**
 * parses string for symbols (numbers or letters) and replaces them appropriately
 *
 * @method fake.helpers.replaceSymbols
 * @param {string} string
 */
export const replaceSymbols = function (string) {
    string = string || "";
    const alpha = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
    let str = "";

    for (let i = 0; i < string.length; i++) {
        if (string.charAt(i) == "#") {
            str += fake.random.number(9);
        } else if (string.charAt(i) == "?") {
            str += fake.random.arrayElement(alpha);
        } else if (string.charAt(i) == "*") {
            str += fake.random.boolean() ? fake.random.arrayElement(alpha) : fake.random.number(9);
        } else {
            str += string.charAt(i);
        }
    }
    return str;
};

/**
 * replace symbols in a credit card schems including Luhn checksum
 *
 * @method fake.helpers.replaceCreditCardSymbols
 * @param {string} string
 * @param {string} symbol
 */
export const replaceCreditCardSymbols = function (string, symbol) {
    symbol = symbol || "#";

    // Function calculating the Luhn checksum of a number string
    const getCheckBit = function (number) {
        number.reverse();
        number = number.map((num, index) => {
            if (index % 2 === 0) {
                num *= 2;
                if (num > 9) {
                    num -= 9;
                }
            }
            return num;
        });
        const sum = number.reduce((prev, curr) => {
            return prev + curr;
        });
        return sum % 10;
    };

    string = string || "";
    string = fake.helpers.regexpStyleStringParse(string); // replace [4-9] with a random number in range etc...
    string = fake.helpers.replaceSymbolWithNumber(string, symbol); // replace ### with random numbers

    const numberList = string.replace(/\D/g, "").split("").map((num) => {
        return parseInt(num);
    });
    const checkNum = getCheckBit(numberList);
    return string.replace("L", checkNum);
};

/**
 * string repeat helper, alternative to String.prototype.repeat.... See PR #382
 *
 * @method fake.helpers.repeatString
 * @param {string} string
 * @param {number} num
 */
export const repeatString = function (string, num) {
    if (is.undefined(num)) {
        num = 0;
    }
    let text = "";
    for (let i = 0; i < num; i++) {
        text += string.toString();
    }
    return text;
};

/**
 * parse string paterns in a similar way to RegExp
 *
 * e.g. "#{3}test[1-5]" -> "###test4"
 *
 * @method fake.helpers.regexpStyleStringParse
 * @param {string} string
 */
export const regexpStyleStringParse = function (string) {
    string = string || "";
    // Deal with range repeat `{min,max}`
    const RANGE_REP_REG = /(.)\{(\d+)\,(\d+)\}/;
    const REP_REG = /(.)\{(\d+)\}/;
    const RANGE_REG = /\[(\d+)\-(\d+)\]/;
    let min, max, tmp, repetitions;
    let token = string.match(RANGE_REP_REG);
    while (!is.null(token)) {
        min = parseInt(token[2]);
        max = parseInt(token[3]);
        // switch min and max
        if (min > max) {
            tmp = max;
            max = min;
            min = tmp;
        }
        repetitions = fake.random.number({ min, max });
        string = string.slice(0, token.index) + fake.helpers.repeatString(token[1], repetitions) + string.slice(token.index + token[0].length);
        token = string.match(RANGE_REP_REG);
    }
    // Deal with repeat `{num}`
    token = string.match(REP_REG);
    while (!is.null(token)) {
        repetitions = parseInt(token[2]);
        string = string.slice(0, token.index) + fake.helpers.repeatString(token[1], repetitions) + string.slice(token.index + token[0].length);
        token = string.match(REP_REG);
    }
    // Deal with range `[min-max]` (only works with numbers for now)
    //TODO: implement for letters e.g. [0-9a-zA-Z] etc.

    token = string.match(RANGE_REG);
    while (!is.null(token)) {
        min = parseInt(token[1]); // This time we are not capturing the char befor `[]`
        max = parseInt(token[2]);
        // switch min and max
        if (min > max) {
            tmp = max;
            max = min;
            min = tmp;
        }
        string = string.slice(0, token.index) +
            fake.random.number({ min, max }).toString() +
            string.slice(token.index + token[0].length);
        token = string.match(RANGE_REG);
    }
    return string;
};

/**
 * takes an array and returns it randomized
 *
 * @method fake.helpers.shuffle
 * @param {array} o
 */
export const shuffle = function (o) {
    if (is.undefined(o) || o.length === 0) {
        return [];
    }
    o = o || ["a", "b", "c"];
    for (var j, x, i = o.length - 1; i; j = fake.random.number(i), x = o[--i], o[i] = o[j], o[j] = x) {
    }
    return o;
};

/**
 * mustache
 *
 * @method fake.helpers.mustache
 * @param {string} str
 * @param {object} data
 */
export const mustache = function (str, data) {
    if (is.undefined(str)) {
        return "";
    }
    for (const p in data) {
        const re = new RegExp(`{{${p}}}`, "g");
        str = str.replace(re, data[p]);
    }
    return str;
};

/**
 * createCard
 *
 * @method fake.helpers.createCard
 */
export const createCard = function () {
    return {
        name: fake.name.findName(),
        username: fake.internet.userName(),
        email: fake.internet.email(),
        address: {
            streetA: fake.address.streetName(),
            streetB: fake.address.streetAddress(),
            streetC: fake.address.streetAddress(true),
            streetD: fake.address.secondaryAddress(),
            city: fake.address.city(),
            state: fake.address.state(),
            country: fake.address.country(),
            zipcode: fake.address.zipCode(),
            geo: {
                lat: fake.address.latitude(),
                lng: fake.address.longitude()
            }
        },
        phone: fake.phone.phoneNumber(),
        website: fake.internet.domainName(),
        company: {
            name: fake.company.companyName(),
            catchPhrase: fake.company.catchPhrase(),
            bs: fake.company.bs()
        },
        posts: [
            {
                words: fake.lorem.words(),
                sentence: fake.lorem.sentence(),
                sentences: fake.lorem.sentences(),
                paragraph: fake.lorem.paragraph()
            },
            {
                words: fake.lorem.words(),
                sentence: fake.lorem.sentence(),
                sentences: fake.lorem.sentences(),
                paragraph: fake.lorem.paragraph()
            },
            {
                words: fake.lorem.words(),
                sentence: fake.lorem.sentence(),
                sentences: fake.lorem.sentences(),
                paragraph: fake.lorem.paragraph()
            }
        ],
        accountHistory: [fake.helpers.createTransaction(), fake.helpers.createTransaction(), fake.helpers.createTransaction()]
    };
};

/**
 * contextualCard
 *
 * @method fake.helpers.contextualCard
 */
export const contextualCard = function () {
    const name = fake.name.firstName();
    const userName = fake.internet.userName(name);
    return {
        name,
        username: userName,
        avatar: fake.internet.avatar(),
        email: fake.internet.email(userName),
        dob: fake.date.past(50, new Date("Sat Sep 20 1992 21:35:02 GMT+0200 (CEST)")),
        phone: fake.phone.phoneNumber(),
        address: {
            street: fake.address.streetName(true),
            suite: fake.address.secondaryAddress(),
            city: fake.address.city(),
            zipcode: fake.address.zipCode(),
            geo: {
                lat: fake.address.latitude(),
                lng: fake.address.longitude()
            }
        },
        website: fake.internet.domainName(),
        company: {
            name: fake.company.companyName(),
            catchPhrase: fake.company.catchPhrase(),
            bs: fake.company.bs()
        }
    };
};


/**
 * userCard
 *
 * @method fake.helpers.userCard
 */
export const userCard = function () {
    return {
        name: fake.name.findName(),
        username: fake.internet.userName(),
        email: fake.internet.email(),
        address: {
            street: fake.address.streetName(true),
            suite: fake.address.secondaryAddress(),
            city: fake.address.city(),
            zipcode: fake.address.zipCode(),
            geo: {
                lat: fake.address.latitude(),
                lng: fake.address.longitude()
            }
        },
        phone: fake.phone.phoneNumber(),
        website: fake.internet.domainName(),
        company: {
            name: fake.company.companyName(),
            catchPhrase: fake.company.catchPhrase(),
            bs: fake.company.bs()
        }
    };
};

/**
 * createTransaction
 *
 * @method fake.helpers.createTransaction
 */
export const createTransaction = function () {
    return {
        amount: fake.finance.amount(),
        date: new Date(2012, 1, 2), //TODO: add a ranged date method
        business: fake.company.companyName(),
        name: [fake.finance.accountName(), fake.finance.mask()].join(" "),
        type: randomize(fake.definitions.finance.transaction_type),
        account: fake.finance.account()
    };
};
