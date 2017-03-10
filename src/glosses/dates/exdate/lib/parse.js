
import { toInt } from "./utils";

export const match1         = /\d/;            //       0 - 9
export const match2         = /\d\d/;          //      00 - 99
export const match3         = /\d{3}/;         //     000 - 999
export const match4         = /\d{4}/;         //    0000 - 9999
export const match6         = /[+-]?\d{6}/;    // -999999 - 999999
export const match1to2      = /\d\d?/;         //       0 - 99
export const match3to4      = /\d\d\d\d?/;     //     999 - 9999
export const match5to6      = /\d\d\d\d\d\d?/; //   99999 - 999999
export const match1to3      = /\d{1,3}/;       //       0 - 999
export const match1to4      = /\d{1,4}/;       //       0 - 9999
export const match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

export const matchUnsigned  = /\d+/;           //       0 - inf
export const matchSigned    = /[+-]?\d+/;      //    -inf - inf

export const matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z
export const matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi; // +00 -00 +00:00 -00:00 +0000 -0000 or Z

export const matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

// any word (or two) characters or numbers including two/three word month in arabic.
// includes scottish gaelic two word and hyphenated months
export const matchWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i;


const regexes = {};

export function addRegexToken (token, regex, strictRegex) {
    regexes[token] = adone.is.function(regex) ? regex : function (isStrict) {
        return (isStrict && strictRegex) ? strictRegex : regex;
    };
}

export function getParseRegexForToken (token, config) {
    if (!adone.is.propertyOwned(regexes, token)) {
        return new RegExp(unescapeFormat(token));
    }

    return regexes[token](config._strict, config._locale);
}

// Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
function unescapeFormat(s) {
    return regexEscape(s.replace("\\", "").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
        return p1 || p2 || p3 || p4;
    }));
}

export function regexEscape(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

const tokens = {};

export function addParseToken (token, callback) {
    if (adone.is.string(token)) {
        token = [token];
    }
    let func = callback;
    if (adone.is.number(callback)) {
        func = function (input, array) {
            array[callback] = toInt(input);
        };
    }
    for (let i = 0; i < token.length; i++) {
        tokens[token[i]] = func;
    }
}

export function addWeekParseToken (token, callback) {
    addParseToken(token, function (input, array, config, token) {
        config._w = config._w || {};
        callback(input, config._w, config, token);
    });
}

export function addTimeToArrayFromToken(token, input, config) {
    if (adone.is.exist(input) && adone.is.propertyOwned(tokens, token)) {
        tokens[token](input, config._a, config, token);
    }
}
