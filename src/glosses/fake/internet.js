const {
    is,
    fake
} = adone;

/**
 *
 * Copyright (c) 2012-2014 Jeffrey Mealo
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 * Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * ------------------------------------------------------------------------------------------------------------------------
 *
 * Based loosely on Luka Pusic's PHP Script: http://360percents.com/posts/php-random-user-agent-generator/
 *
 * The license for that script is as follows:
 *
 * "THE BEER-WARE LICENSE" (Revision 42):
 *
 * <pusic93@gmail.com> wrote this file. As long as you retain this notice you can do whatever you want with this stuff.
 * If we meet some day, and you think this stuff is worth it, you can buy me a beer in return. Luka Pusic
 */

const rnd = function (a, b) {
    //calling rnd() with no arguments is identical to rnd(0, 100)
    a = a || 0;
    b = b || 100;

    if (is.number(b) && is.number(a)) {
        //rnd(int min, int max) returns integer between min, max
        return (function (min, max) {
            if (min > max) {
                throw new RangeError(`expected min <= max; got min = ${min}, max = ${max}`);
            }
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }(a, b));
    }

    if (Object.prototype.toString.call(a) === "[object Array]") {
        //returns a random element from array (a), even weighting
        return a[Math.floor(Math.random() * a.length)];
    }

    if (a && typeof a === "object") {
        //returns a random key from the passed object; keys are weighted by the decimal probability in their value
        return (function (obj) {
            let rand = rnd(0, 100) / 100, min = 0, max = 0, key, return_val;

            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    max = obj[key] + min;
                    return_val = key;
                    if (rand >= min && rand <= max) {
                        break;
                    }
                    min = min + obj[key];
                }
            }

            return return_val;
        }(a));
    }

    throw new TypeError(`Invalid arguments passed to rnd. (${b ? `${a}, ${b}` : a})`);
};

const randomLang = function () {
    return rnd(["AB", "AF", "AN", "AR", "AS", "AZ", "BE", "BG", "BN", "BO", "BR", "BS", "CA", "CE", "CO", "CS",
        "CU", "CY", "DA", "DE", "EL", "EN", "EO", "ES", "ET", "EU", "FA", "FI", "FJ", "FO", "FR", "FY",
        "GA", "GD", "GL", "GV", "HE", "HI", "HR", "HT", "HU", "HY", "ID", "IS", "IT", "JA", "JV", "KA",
        "KG", "KO", "KU", "KW", "KY", "LA", "LB", "LI", "LN", "LT", "LV", "MG", "MK", "MN", "MO", "MS",
        "MT", "MY", "NB", "NE", "NL", "NN", "NO", "OC", "PL", "PT", "RM", "RO", "RU", "SC", "SE", "SK",
        "SL", "SO", "SQ", "SR", "SV", "SW", "TK", "TR", "TY", "UK", "UR", "UZ", "VI", "VO", "YI", "ZH"]);
};

const randomBrowserAndOS = function () {
    let browser = rnd({
        chrome: 0.45132810566,
        iexplorer: 0.27477061836,
        firefox: 0.19384170608,
        safari: 0.06186781118,
        opera: 0.01574236955
    }),
        os = {
            chrome: { win: 0.89, mac: 0.09, lin: 0.02 },
            firefox: { win: 0.83, mac: 0.16, lin: 0.01 },
            opera: { win: 0.91, mac: 0.03, lin: 0.06 },
            safari: { win: 0.04, mac: 0.96 },
            iexplorer: ["win"]
        };

    return [browser, rnd(os[browser])];
};

const randomProc = function (arch) {
    const procs = {
        lin: ["i686", "x86_64"],
        mac: { Intel: 0.48, PPC: 0.01, "U; Intel": 0.48, "U; PPC": 0.01 },
        win: ["", "WOW64", "Win64; x64"]
    };
    return rnd(procs[arch]);
};

const randomRevision = function (dots) {
    let return_val = "";
    //generate a random revision
    //dots = 2 returns .x.y where x & y are between 0 and 9
    for (let x = 0; x < dots; x++) {
        return_val += `.${rnd(0, 9)}`;
    }
    return return_val;
};

const version_string = {
    net() {
        return [rnd(1, 4), rnd(0, 9), rnd(10000, 99999), rnd(0, 9)].join(".");
    },
    nt() {
        return `${rnd(5, 6)}.${rnd(0, 3)}`;
    },
    ie() {
        return rnd(7, 11);
    },
    trident() {
        return `${rnd(3, 7)}.${rnd(0, 1)}`;
    },
    osx(delim) {
        return [10, rnd(5, 10), rnd(0, 9)].join(delim || ".");
    },
    chrome() {
        return [rnd(13, 39), 0, rnd(800, 899), 0].join(".");
    },
    presto() {
        return `2.9.${rnd(160, 190)}`;
    },
    presto2() {
        return `${rnd(10, 12)}.00`;
    },
    safari() {
        return `${rnd(531, 538)}.${rnd(0, 2)}.${rnd(0, 2)}`;
    }
};

const browser = {
    firefox: function firefox(arch) {
        //https://developer.mozilla.org/en-US/docs/Gecko_user_agent_string_reference
        let firefox_ver = rnd(5, 15) + randomRevision(2),
            gecko_ver = `Gecko/20100101 Firefox/${firefox_ver}`,
            proc = randomProc(arch),
            os_ver = (arch === "win") ? `(Windows NT ${version_string.nt()}${(proc) ? `; ${proc}` : ""}`
                : (arch === "mac") ? `(Macintosh; ${proc} Mac OS X ${version_string.osx()}`
                    : `(X11; Linux ${proc}`;

        return `Mozilla/5.0 ${os_ver}; rv:${firefox_ver.slice(0, -2)}) ${gecko_ver}`;
    },

    iexplorer: function iexplorer() {
        const ver = version_string.ie();

        if (ver >= 11) {
            //http://msdn.microsoft.com/en-us/library/ie/hh869301(v=vs.85).aspx
            return `Mozilla/5.0 (Windows NT 6.${rnd(1, 3)}; Trident/7.0; ${rnd(["Touch; ", ""])}rv:11.0) like Gecko`;
        }

        //http://msdn.microsoft.com/en-us/library/ie/ms537503(v=vs.85).aspx
        return `Mozilla/5.0 (compatible; MSIE ${ver}.0; Windows NT ${version_string.nt()}; Trident/${
            version_string.trident()}${(rnd(0, 1) === 1) ? `; .NET CLR ${version_string.net()}` : ""})`;
    },

    opera: function opera(arch) {
        //http://www.opera.com/docs/history/
        let presto_ver = ` Presto/${version_string.presto()} Version/${version_string.presto2()})`,
            os_ver = (arch === "win") ? `(Windows NT ${version_string.nt()}; U; ${randomLang()}${presto_ver}`
                : (arch === "lin") ? `(X11; Linux ${randomProc(arch)}; U; ${randomLang()}${presto_ver}`
                    : `(Macintosh; Intel Mac OS X ${version_string.osx()} U; ${randomLang()} Presto/${
                    version_string.presto()} Version/${version_string.presto2()})`;

        return `Opera/${rnd(9, 14)}.${rnd(0, 99)} ${os_ver}`;
    },

    safari: function safari(arch) {
        let safari = version_string.safari(),
            ver = `${rnd(4, 7)}.${rnd(0, 1)}.${rnd(0, 10)}`,
            os_ver = (arch === "mac") ? `(Macintosh; ${randomProc("mac")} Mac OS X ${version_string.osx("_")} rv:${rnd(2, 6)}.0; ${randomLang()}) `
                : `(Windows; U; Windows NT ${version_string.nt()})`;

        return `Mozilla/5.0 ${os_ver}AppleWebKit/${safari} (KHTML, like Gecko) Version/${ver} Safari/${safari}`;
    },

    chrome: function chrome(arch) {
        let safari = version_string.safari(),
            os_ver = (arch === "mac") ? `(Macintosh; ${randomProc("mac")} Mac OS X ${version_string.osx("_")}) `
                : (arch === "win") ? `(Windows; U; Windows NT ${version_string.nt()})`
                    : `(X11; Linux ${randomProc(arch)}`;

        return `Mozilla/5.0 ${os_ver} AppleWebKit/${safari} (KHTML, like Gecko) Chrome/${version_string.chrome()} Safari/${safari}`;
    }
};

const generate = () => {
    const random = randomBrowserAndOS();
    return browser[random[0]](random[1]);
};


/**
 * avatar
 *
 * @method fake.internet.avatar
 */
export const avatar = function () {
    return fake.random.arrayElement(fake.definitions.internet.avatar_uri);
};

avatar.schema = {
    description: "Generates a URL for an avatar.",
    sampleResults: ["https://s3.amazonaws.com/uifaces/faces/twitter/igorgarybaldi/128.jpg"]
};

/**
 * email
 *
 * @method fake.internet.email
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} provider
 */
export const email = function (firstName, lastName, provider) {
    provider = provider || fake.random.arrayElement(fake.definitions.internet.free_email);
    return `${fake.helpers.slugify(fake.internet.userName(firstName, lastName))}@${provider}`;
};

email.schema = {
    description: "Generates a valid email address based on optional input criteria",
    sampleResults: ["foo.bar@gmail.com"],
    properties: {
        firstName: {
            type: "string",
            required: false,
            description: "The first name of the user"
        },
        lastName: {
            type: "string",
            required: false,
            description: "The last name of the user"
        },
        provider: {
            type: "string",
            required: false,
            description: "The domain of the user"
        }
    }
};
/**
 * exampleEmail
 *
 * @method fake.internet.exampleEmail
 * @param {string} firstName
 * @param {string} lastName
 */
export const exampleEmail = function (firstName, lastName) {
    const provider = fake.random.arrayElement(fake.definitions.internet.example_email);
    return email(firstName, lastName, provider);
};

/**
 * userName
 *
 * @method fake.internet.userName
 * @param {string} firstName
 * @param {string} lastName
 */
export const userName = function (firstName, lastName) {
    let result;
    firstName = firstName || fake.name.firstName();
    lastName = lastName || fake.name.lastName();
    switch (fake.random.number(2)) {
        case 0:
            result = firstName + fake.random.number(99);
            break;
        case 1:
            result = firstName + fake.random.arrayElement([".", "_"]) + lastName;
            break;
        case 2:
            result = firstName + fake.random.arrayElement([".", "_"]) + lastName + fake.random.number(99);
            break;
    }
    result = result.toString().replace(/'/g, "");
    result = result.replace(/ /g, "");
    return result;
};

userName.schema = {
    description: "Generates a username based on one of several patterns. The pattern is chosen randomly.",
    sampleResults: [
        "Kirstin39",
        "Kirstin.Smith",
        "Kirstin.Smith39",
        "KirstinSmith",
        "KirstinSmith39"
    ],
    properties: {
        firstName: {
            type: "string",
            required: false,
            description: "The first name of the user"
        },
        lastName: {
            type: "string",
            required: false,
            description: "The last name of the user"
        }
    }
};

/**
 * protocol
 *
 * @method fake.internet.protocol
 */
export const protocol = function () {
    const protocols = ["http", "https"];
    return fake.random.arrayElement(protocols);
};

protocol.schema = {
    description: "Randomly generates http or https",
    sampleResults: ["https", "http"]
};

/**
 * url
 *
 * @method fake.internet.url
 */
export const url = function () {
    return `${fake.internet.protocol()}://${fake.internet.domainName()}`;
};

url.schema = {
    description: "Generates a random URL. The URL could be secure or insecure.",
    sampleResults: [
        "http://rashawn.name",
        "https://rashawn.name"
    ]
};

/**
 * domainName
 *
 * @method fake.internet.domainName
 */
export const domainName = function () {
    return `${fake.internet.domainWord()}.${fake.internet.domainSuffix()}`;
};

domainName.schema = {
    description: "Generates a random domain name.",
    sampleResults: ["marvin.org"]
};

/**
 * domainSuffix
 *
 * @method fake.internet.domainSuffix
 */
export const domainSuffix = function () {
    return fake.random.arrayElement(fake.definitions.internet.domain_suffix);
};

domainSuffix.schema = {
    description: "Generates a random domain suffix.",
    sampleResults: ["net"]
};

/**
 * domainWord
 *
 * @method fake.internet.domainWord
 */
export const domainWord = function () {
    return fake.name.firstName().replace(/([\\~#&*{}/:<>?|\"'])/ig, "").toLowerCase();
};

domainWord.schema = {
    description: "Generates a random domain word.",
    sampleResults: ["alyce"]
};

/**
 * ip
 *
 * @method fake.internet.ip
 */
export const ip = function () {
    const randNum = function () {
        return (fake.random.number(255)).toFixed(0);
    };

    const result = [];
    for (let i = 0; i < 4; i++) {
        result[i] = randNum();
    }

    return result.join(".");
};

ip.schema = {
    description: "Generates a random IP.",
    sampleResults: ["97.238.241.11"]
};

/**
 * ipv6
 *
 * @method fake.internet.ipv6
 */
export const ipv6 = function () {
    const randHash = function () {
        let result = "";
        for (let i = 0; i < 4; i++) {
            result += (fake.random.arrayElement(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"]));
        }
        return result;
    };

    const result = [];
    for (let i = 0; i < 8; i++) {
        result[i] = randHash();
    }
    return result.join(":");
};

ipv6.schema = {
    description: "Generates a random IPv6 address.",
    sampleResults: ["2001:0db8:6276:b1a7:5213:22f1:25df:c8a0"]
};

/**
 * userAgent
 *
 * @method fake.internet.userAgent
 */
export const userAgent = () => generate();

userAgent.schema = {
    description: "Generates a random user agent.",
    sampleResults: ["Mozilla/5.0 (Macintosh; U; PPC Mac OS X 10_7_5 rv:6.0; SL) AppleWebKit/532.0.1 (KHTML, like Gecko) Version/7.1.6 Safari/532.0.1"]
};

/**
 * color
 *
 * @method fake.internet.color
 * @param {number} baseRed255
 * @param {number} baseGreen255
 * @param {number} baseBlue255
 */
export const color = function (baseRed255, baseGreen255, baseBlue255) {
    baseRed255 = baseRed255 || 0;
    baseGreen255 = baseGreen255 || 0;
    baseBlue255 = baseBlue255 || 0;
    // based on awesome response : http://stackoverflow.com/questions/43044/algorithm-to-randomly-generate-an-aesthetically-pleasing-color-palette
    const red = Math.floor((fake.random.number(256) + baseRed255) / 2);
    const green = Math.floor((fake.random.number(256) + baseGreen255) / 2);
    const blue = Math.floor((fake.random.number(256) + baseBlue255) / 2);
    const redStr = red.toString(16);
    const greenStr = green.toString(16);
    const blueStr = blue.toString(16);
    return `#${
        redStr.length === 1 ? "0" : ""}${redStr
        }${greenStr.length === 1 ? "0" : ""}${greenStr
        }${blueStr.length === 1 ? "0" : ""}${blueStr}`;

};

color.schema = {
    description: "Generates a random hexadecimal color.",
    sampleResults: ["#06267f"],
    properties: {
        baseRed255: {
            type: "number",
            required: false,
            description: "The red value. Valid values are 0 - 255."
        },
        baseGreen255: {
            type: "number",
            required: false,
            description: "The green value. Valid values are 0 - 255."
        },
        baseBlue255: {
            type: "number",
            required: false,
            description: "The blue value. Valid values are 0 - 255."
        }
    }
};

/**
 * mac
 *
 * @method fake.internet.mac
 * @param {string} sep
 */
export const mac = function (sep) {
    let i,
        mac = "",
        validSep = ":";

    // if the client passed in a different separator than `:`, 
    // we will use it if it is in the list of acceptable separators (dash or no separator)
    if (["-", ""].indexOf(sep) !== -1) {
        validSep = sep;
    }

    for (i = 0; i < 12; i++) {
        mac += fake.random.number(15).toString(16);
        if (i % 2 == 1 && i != 11) {
            mac += validSep;
        }
    }
    return mac;
};

mac.schema = {
    description: "Generates a random mac address.",
    sampleResults: ["78:06:cc:ae:b3:81"]
};

/**
 * password
 *
 * @method fake.internet.password
 * @param {number} len
 * @param {boolean} memorable
 * @param {string} pattern
 * @param {string} prefix
 */
export const password = function (len, memorable, pattern, prefix) {
    len = len || 15;
    if (is.undefined(memorable)) {
        memorable = false;
    }
    /**
     * password-generator ( function )
     * Copyright(c) 2011-2013 Bermi Ferrer <bermi@bermilabs.com>
     * MIT Licensed
     */
    let consonant, letter, password, vowel;
    letter = /[a-zA-Z]$/;
    vowel = /[aeiouAEIOU]$/;
    consonant = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]$/;
    var _password = function (length, memorable, pattern, prefix) {
        let char, n;
        if (is.nil(length)) {
            length = 10;
        }
        if (is.nil(memorable)) {
            memorable = true;
        }
        if (is.nil(pattern)) {
            pattern = /\w/;
        }
        if (is.nil(prefix)) {
            prefix = "";
        }
        if (prefix.length >= length) {
            return prefix;
        }
        if (memorable) {
            if (prefix.match(consonant)) {
                pattern = vowel;
            } else {
                pattern = consonant;
            }
        }
        n = fake.random.number(94) + 33;
        char = String.fromCharCode(n);
        if (memorable) {
            char = char.toLowerCase();
        }
        if (!char.match(pattern)) {
            return _password(length, memorable, pattern, prefix);
        }
        return _password(length, memorable, pattern, String(prefix) + char);
    };
    return _password(len, memorable, pattern, prefix);
};

password.schema = {
    description: "Generates a random password.",
    sampleResults: [
        "AM7zl6Mg",
        "susejofe"
    ],
    properties: {
        length: {
            type: "number",
            required: false,
            description: "The number of characters in the password."
        },
        memorable: {
            type: "boolean",
            required: false,
            description: "Whether a password should be easy to remember."
        },
        pattern: {
            type: "regex",
            required: false,
            description: "A regex to match each character of the password against. This parameter will be negated if the memorable setting is turned on."
        },
        prefix: {
            type: "string",
            required: false,
            description: "A value to prepend to the generated password. The prefix counts towards the length of the password."
        }
    }
};
