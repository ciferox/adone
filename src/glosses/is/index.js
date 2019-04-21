const objectProto = Object.prototype;
const hasOwnProperty = objectProto.hasOwnProperty;
const toString = objectProto.toString;
const funcToString = Function.prototype.toString;

export const getTag = (value) => {
    const rawTag = toString.call(value);
    if (value === null) { // eslint-disable-line
        return "null";
    }
    return rawTag.substring(8, rawTag.length - 1).toLowerCase();
};

const callbackNames = ["callback", "callback_", "cb", "cb_", "done", "next"];

const platform = process.platform;

adone.asNamespace(exports);

// Checks whether `field` is a field owned by `object`.
export const propertyOwned = (obj, field) => hasOwnProperty.call(obj, field);

// Checks whether given value is `null`.
const null_ = (value) => value === null; // eslint-disable-line

// Checks whether given value is `undefined`.
const undefined_ = (value) => value === void 0;

const function_ = (fn) => typeof fn === "function"; // eslint-disable-line

// Checks whether given value is class
const class_ = (value) => (function_(value) && propertyOwned(value, "prototype") && value.prototype && propertyOwned(value.prototype, "constructor") && value.prototype.constructor.toString().substring(0, 5) === "class"); // eslint-disable-line

export {
    null_ as null,
    undefined_ as undefined,
    function_ as function,
    class_ as class
};

// Checks whether given value is `NaN`.
export const nan = Number.isNaN; // eslint-disable-line

// Checks whether given value is a finite number.
export const finite = Number.isFinite; // eslint-disable-line

// Checks whether given value is an integer.
export const integer = Number.isInteger; // eslint-disable-line

// Checks whether given value is a safe integer.
export const safeInteger = Number.isSafeInteger; // eslint-disable-line


export const array = Array.isArray; // eslint-disable-line

// Checks whether given value exists, i.e, not `null` nor `undefined`
export const exist = (value) => value != null; // eslint-disable-line

// Checks whether given value is either `null` or `undefined`
export const nil = (value) => value == null; // eslint-disable-line

// Checks whether given value is an empty string, i.e, a string with whitespace characters only.
export const emptyString = (str) => typeof str === "string" && /^\s*$/.test(str);

// Checks whether given value is a number.
export const number = (value) => typeof value === "number"; // eslint-disable-line

export const numeral = (value) => {
    // Checks whether given value is a numeral, i.e:
    //
    // - a genuine finite number
    // - or a string that represents a finite number
    const tag = getTag(value);
    if (tag !== "number" && tag !== "string") {
        return false;
    }

    if (emptyString(value)) {
        return false;
    }

    try {
        value = Number(value);
    } catch (error) {
        return false;
    }

    return finite(value);
};

// Checks whether given value is an infinite number, i.e: +∞ or -∞.
export const infinite = (val) => val === +1 / 0 || val === -1 / 0;

// Checks whether given value is an odd number.
export const odd = (val) => integer(val) && val % 2 === 1;

// Checks whether given value is an even number.
export const even = (val) => integer(val) && val % 2 === 0;

// Checks whether given value is a float number.
export const float = (val) => number(val) && val !== Math.floor(val);

export const negativeZero = (val) => (val === 0) && (Number.NEGATIVE_INFINITY === 1 / val);

export const substring = (substr, str, offset) => {
    // Checks whether one str may be found within another str.
    if (typeof str !== "string") {
        return false;
    }

    const length = str.length;
    offset = integer(offset) ? offset : 0;

    // Allow negative offsets.
    if (offset < 0) {
        offset = length + offset;
    }

    if (offset < 0 || offset >= length) {
        return false;
    }

    return str.indexOf(substr, offset) !== -1;
};

// Checks whether `str` starts with `prefix`.
export const prefix = (prefix, str) => getTag(str) === "str" && str.startsWith(prefix);

// Checks whether `str` ends with `suffix`.
export const suffix = (suffix, str) => getTag(str) === "str" && str.endsWith(suffix);

// Checks whether given value is a boolean.
export const boolean = (value) => value === true || value === false;

export const arrayBuffer = (x) => objectProto.toString.call(x) === "[object ArrayBuffer]";

export const arrayBufferView = (x) => ArrayBuffer.isView(x);

export const date = (value) => getTag(value) === "date";

export const error = (value) => getTag(value) === "error";

export const map = (value) => getTag(value) === "map";

export const regexp = (value) => getTag(value) === "regexp";

export const set = (value) => getTag(value) === "set";

export const symbol = (value) => getTag(value) === "symbol";

// Checks whether given value is a primitive.
export const primitive = (value) => nil(value) || number(value) || typeof value === "string" || boolean(value) || symbol(value);

export const equal = (value, other) => (value === other || (value !== value && other !== other)); // eslint-disable-line

export const equalArrays = (arr1, arr2) => {
    const length = arr1.length;
    if (length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
};

// Checks whether given value is an object.
export const object = (value) => !primitive(value);

// Checks whether given value is path to json-file or may by JS-object.
export const json = (value) => (typeof value === "string" && value.endsWith(".json")) || object(value);

export const namespace = (value) => object(value) && value[adone.asNamespace.SYMBOL] === true;

// Checks whether given value is an empty object, i.e, an object without any own, enumerable, string keyed properties.
export const emptyObject = (obj) => object(obj) && Object.keys(obj).length === 0;

export const property = (str) => {
    return /^[$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc][$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc0-9\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19b0-\u19c0\u19c8\u19c9\u19d0-\u19d9\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1dc0-\u1de6\u1dfc-\u1dff\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f]*$/.test(str)
};

// Checks whether `path` is a direct or inherited property of `object`.
export const propertyDefined = (obj, path) => {
    let key;
    let context = obj;
    const keys = String(path).split(".");

    while (key = keys.shift()) { // eslint-disable-line no-cond-assign
        if (!object(context) || !(key in context)) {
            return false;
        }
        context = context[key];
    }

    return true;
};

export const conforms = (obj, schema, strict) => {
    // Checks whether `object` conforms to `schema`.
    //
    // A `schema` is an object whose properties are functions that takes
    // these parameters(in order):
    //
    // - __value:any__ - The value of current iteration.
    // - __key:string__ - The corresponding key of current iteration.
    // - __context:object__ - The object in question.
    //
    // These functions, or _validators_, are called for each corresponding key
    // in `object` to check whether object conforms to the schema. An object is
    // said to be conforms to the schema if all validators passed.
    //
    // In strict mode(where `strict=true`), `conforms` also checks whether
    // `object` and `schema` has the same set of own, enumerable, string-keyed
    // properties, in addition to check whether all validators passed.
    if (!object(obj) || !object(schema)) {
        return false;
    }

    const keys = Object.keys(schema);
    const length = keys.length;

    if (strict && length !== Object.keys(obj).length) {
        return false;
    }

    for (let index = 0; index < length; index += 1) {
        const key = keys[index];
        const validator = schema[key];

        if (!function_(validator)) {
            continue;
        }

        if (!hasOwnProperty.call(obj, key) || !validator(obj[key], key, obj)) {
            return false;
        }
    }

    return true;
};

export const arrayLikeObject = (value) => {
    // Checks whether given value is an _array-like_ object.
    //
    // An object is qualified as _array-like_ if it has a property named
    // `length` that is a positive safe integer. As a special case, functions
    // are never qualified as _array-like_.
    if (primitive(value) || function_(value)) {
        return false;
    }
    const length = value.length;
    return integer(length) && length >= 0 && length <= 0xFFFFFFFF; // 32-bit unsigned int maximum
};

export const inArray = (value, array, offset, comparator) => {
    // Checks whether given array or array-like object contains certain element.
    //
    // - __value__: The element to search.
    // - __array__: The array or array-like object to search from.
    // - __offset__: The index to search from, inclusive.
    // - __comparator__: The comparator invoked per element against `value`.

    // Only works with genuine arrays or array-like objects.
    if (!arrayLikeObject(array)) {
        return false;
    }

    if (function_(offset)) {
        comparator = offset;
        offset = 0;
    } else {
        offset = integer(offset) ? offset : 0;
        comparator = function_(comparator) ? comparator : equal;
    }

    const length = array.length;

    // Allow negative offsets.
    if (offset < 0) {
        offset = length + offset;
    }

    if (offset < 0 || offset >= length) {
        return false;
    }

    for (let index = offset; index < length; index += 1) {
        // Skip _holes_ in sparse arrays.
        if (!hasOwnProperty.call(array, index)) {
            continue;
        }

        if (comparator(value, array[index])) {
            return true;
        }
    }

    return false;
};

export const iterable = (obj) => obj && function_(obj[Symbol.iterator]);

// Checks whether given values are of the same type.
export const sameType = (value, other) => (typeof value === typeof other && getTag(value) === getTag(other)); // eslint-disable-line

// Does a shallow comparison of two objects, returning false if the keys or values differ.
// The purpose is to do the fastest comparison possible of two objects when the values will predictably be primitives.
export const shallowEqual = (a, b) => {
    if (!a && !b) {
        return true;
    }
    if (!a && b || a && !b) {
        return false;
    }

    let numKeysA = 0;
    let numKeysB = 0;
    let key;
    for (key in b) {
        numKeysB++;
        if (!primitive(b[key]) || !a.hasOwnProperty(key) || (a[key] !== b[key])) {
            return false;
        }
    }
    for (key in a) {
        numKeysA++;
    }
    return numKeysA === numKeysB;
};

// streams

export const stream = (value) => (value !== null && typeof value === "object" && function_(value.pipe)); // eslint-disable-line
export const writableStream = (value) => stream(value) && typeof value._writableState === "object"; // eslint-disable-line
export const readableStream = (value) => stream(value) && typeof value._readableState === "object"; // eslint-disable-line
export const duplexStream = (value) => writableStream(value) && readableStream(value);
export const transformStream = (value) => stream(value) && typeof value._transformState === "object"; // eslint-disable-line

export const utf8 = (bytes) => {
    let i = 0;
    while (i < bytes.length) {
        if (bytes[i] === 0x09 || bytes[i] === 0x0A || bytes[i] === 0x0D || (bytes[i] >= 0x20 && bytes[i] <= 0x7E)) { // ASCII
            i += 1;
            continue;
        }
        if ((bytes[i] >= 0xC2 && bytes[i] <= 0xDF) && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xBF)) { // non-overlong 2-byte
            i += 2;
            continue;
        }
        if (
            (
                bytes[i] === 0xE0
                && (bytes[i + 1] >= 0xA0 && bytes[i + 1] <= 0xBF)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
            )
            || ( // excluding overlongs
                ((bytes[i] >= 0xE1 && bytes[i] <= 0xEC) || bytes[i] === 0xEE || bytes[i] === 0xEF)
                && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xBF)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
            ) || ( // straight 3-byte
                bytes[i] === 0xED
                && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0x9F)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
            )
        ) { // excluding surrogates
            i += 3;
            continue;
        }

        if (
            (
                bytes[i] === 0xF0
                && (bytes[i + 1] >= 0x90 && bytes[i + 1] <= 0xBF)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
                && (bytes[i + 3] >= 0x80 && bytes[i + 3] <= 0xBF)
            )
            || ( // planes 1-3
                (bytes[i] >= 0xF1 && bytes[i] <= 0xF3)
                && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xBF)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
                && (bytes[i + 3] >= 0x80 && bytes[i + 3] <= 0xBF)
            )
            || ( // planes 4-15
                bytes[i] === 0xF4
                && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0x8F)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
                && (bytes[i + 3] >= 0x80 && bytes[i + 3] <= 0xBF)
            )
        ) { // plane 16
            i += 4;
            continue;
        }
        return false;
    }
    return true;
};


export const posixPathAbsolute = (path) => path.charAt(0) === "/";
export const win32PathAbsolute = (path) => {
    const result = /^([a-zA-Z]:|[\\/]{2}[^\\/]+[\\/]+[^\\/]+)?([\\/])?([\s\S]*?)$/.exec(path);
    const device = result[1] || "";
    const isUnc = Boolean(device) && device.charAt(1) !== ":";
    // UNC paths are always absolute
    return Boolean(result[2]) || isUnc;
};

export const pathAbsolute = platform === "win32" ? win32PathAbsolute : posixPathAbsolute;

export const dotfile = (str) => {
    if (str.charCodeAt(0) === 46 /* . */ && str.indexOf("/", 1) === -1) {
        return true;
    }

    const last = str.lastIndexOf("/");
    return last !== -1 ? str.charCodeAt(last + 1) === 46/*.*/ : false;
};

export const asyncFunction = (fn) => fn && toString.call(fn).slice(8, -1) === "AsyncFunction";

const isNonArrowFnRegex = /^\s*function/;
const isArrowFnWithParensRegex = /^\([^)]*\) *=>/;
const isArrowFnWithoutParensRegex = /^[^=]*=>/;

export const arrowFunction = (fn) => {
    if (!function_(fn)) {
        return false;
    }
    const fnStr = funcToString.call(fn);
    return fnStr.length > 0 && !isNonArrowFnRegex.test(fnStr) && (isArrowFnWithParensRegex.test(fnStr) || isArrowFnWithoutParensRegex.test(fnStr));
};

const isFnRegex = /^\s*(?:function)?\*/;
const getProto = Object.getPrototypeOf;
const GeneratorFunction = getProto(function* () { });

export const generatorFunction = (fn) => {
    if (!function_(fn)) {
        return false;
    }
    if (isFnRegex.test(funcToString.call(fn))) {
        return true;
    }
    return getProto(fn) === GeneratorFunction;
};

export const promise = (obj) => !nil(obj) && function_(obj.then);

export const validDate = (str) => !isNaN(Date.parse(str)); // eslint-disable-line

export const callback = (fn, names) => inArray(names || callbackNames, adone.util.functionName(fn));

export const generator = (value) => {
    if (!value || !value.constructor) {
        return false;
    }

    const c = value.constructor;
    const name = "GeneratorFunction";

    if (c.name === name || c.displayName === name) {
        return true;
    }
    if (function_(value.next) && function_(value.throw)) {
        return true;
    }
    if (!function_(value)) {
        return false;
    }
    return true;
};

export const uint8Array = (value) => value instanceof Uint8Array;

export const windows = platform === "win32";
export const linux = platform === "linux";
export const freebsd = platform === "freebsd";
export const openbsd = platform === "openbsd";
export const darwin = platform === "darwin";
export const sunos = platform === "sunos";
export const aix = platform === "aix";

export const uppercase = (str) => {
    for (const i of str) {
        if (i < "A" || i > "Z") {
            return false;
        }
    }
    return true;
};

export const lowercase = (str) => {
    for (const i of str) {
        if (i < "a" || i > "z") {
            return false;
        }
        return true;
    }
};

export const digits = (str) => {
    for (const i of str) {
        if (i < "0" || i > "9") {
            return false;
        }
        return true;
    }
};

export const identifier = (str) => {
    if (!str.length) {
        return false;
    }
    if (!uppercase(str[0]) && !lowercase(str[0]) && str[0] !== "$" && str[0] !== "_" && str[0] < 0xA0) {
        return false;
    }
    for (let i = 1; i < str.length; ++i) {
        if (!digits(str[i]) && !lowercase(str[i]) && !uppercase(str[i]) && str[i] !== "_" && str[i] !== "_" && str[i] < 0xA0) {
            return false;
        }
    }
    return true;
};

const binaryExtensions = new Set([
    "3ds", "3g2", "3gp",
    "7z", "a", "aac",
    "adp", "ai", "aif",
    "aiff", "alz", "ape",
    "apk", "ar", "arj",
    "asf", "au", "avi",
    "bak", "bh", "bin",
    "bk", "bmp", "btif",
    "bz2", "bzip2", "cab",
    "caf", "cgm", "class",
    "cmx", "cpio", "cr2",
    "csv", "cur", "dat",
    "deb", "dex", "djvu",
    "dll", "dmg", "dng",
    "doc", "docm", "docx",
    "dot", "dotm", "dra",
    "DS_Store", "dsk", "dts",
    "dtshd", "dvb", "dwg",
    "dxf", "ecelp4800", "ecelp7470",
    "ecelp9600", "egg", "eol",
    "eot", "epub", "exe",
    "f4v", "fbs", "fh",
    "fla", "flac", "fli",
    "flv", "fpx", "fst",
    "fvt", "g3", "gif",
    "graffle", "gz", "gzip",
    "h261", "h263", "h264",
    "ico", "ief", "img",
    "ipa", "iso", "jar",
    "jpeg", "jpg", "jpgv",
    "jpm", "jxr", "key",
    "ktx", "lha", "lvp",
    "lz", "lzh", "lzma",
    "lzo", "m3u", "m4a",
    "m4v", "mar", "mdi",
    "mht", "mid", "midi",
    "mj2", "mka", "mkv",
    "mmr", "mng", "mobi",
    "mov", "movie", "mp3",
    "mp4", "mp4a", "mpeg",
    "mpg", "mpga", "mxu",
    "nef", "npx", "numbers",
    "o", "oga", "ogg",
    "ogv", "otf", "pages",
    "pbm", "pcx", "pdf",
    "pea", "pgm", "pic",
    "png", "pnm", "pot",
    "potm", "potx", "ppa",
    "ppam", "ppm", "pps",
    "ppsm", "ppsx", "ppt",
    "pptm", "pptx", "psd",
    "pya", "pyc", "pyo",
    "pyv", "qt", "rar",
    "ras", "raw", "rgb",
    "rip", "rlc", "rmf",
    "rmvb", "rtf", "rz",
    "s3m", "s7z", "scpt",
    "sgi", "shar", "sil",
    "slk", "smv", "so",
    "sub", "swf", "tar",
    "tbz", "tbz2", "tga",
    "tgz", "thmx", "tif",
    "tiff", "tlz", "ts",
    "ttc", "ttf", "txz",
    "udf", "uvh", "uvi",
    "uvm", "uvp", "uvs",
    "uvu", "viv", "vob",
    "war", "wav", "wax",
    "wbmp", "wdp", "weba",
    "webm", "webp", "whl",
    "wim", "wm", "wma",
    "wmv", "wmx", "woff",
    "woff2", "wvx", "xbm",
    "xif", "xla", "xlam",
    "xls", "xlsb", "xlsm",
    "xlsx", "xlt", "xltm",
    "xltx", "xm", "xmind",
    "xpi", "xpm", "xwd",
    "xz", "z", "zip",
    "zipx"
]);
export const binaryExtension = (x) => binaryExtensions.has(x);
export const binaryPath = (x) => binaryExtensions.has(adone.std.path.extname(x).slice(1).toLowerCase());

export const ip4 = (ip, options) => adone.regex.ip4(options).test(ip);
export const ip6 = (ip, options) => adone.regex.ip6(options).test(ip);
export const ip = (ip, options) => adone.regex.ip(options).test(ip);

export const knownError = (err) => {
    if (!(err instanceof Error)) {
        return false;
    }
    const name = err.constructor.name;

    for (const Exc of adone.error.adoneExceptions) {
        if (name === Exc.name) {
            return true;
        }
    }

    for (const Exc of adone.error.stdExceptions) {
        if (name === Exc.name) {
            return true;
        }
    }

    return false;
};

const uuidPatterns = {
    1: /^[0-9a-f]{8}-[0-9a-f]{4}-[1][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    2: /^[0-9a-f]{8}-[0-9a-f]{4}-[2][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    3: /^[0-9a-f]{8}-[0-9a-f]{4}-[3][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    4: /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    5: /^[0-9a-f]{8}-[0-9a-f]{4}-[5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    all: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

export const uuid = (str, version = "all") => {
    if (typeof str !== "string") {
        return false;
    }
    const pattern = uuidPatterns[version];
    return pattern && pattern.test(str);
};

const toDate = (date) => {
    date = Date.parse(date);
    return !isNaN(date) ? new Date(date) : null;
};

export const before = (str, date = String(new Date())) => {
    if (typeof str !== "string") {
        return false; // TODO: Date and datetime support
    }
    const comparison = toDate(date);
    const original = toDate(str);
    return Boolean(original && comparison && original < comparison);
};


export const after = (str, date = String(new Date())) => {
    if (typeof str !== "string") {
        return false; // TODO: Date and datetime support
    }
    const comparison = toDate(date);
    const original = toDate(str);
    return Boolean(original && comparison && original > comparison);
};


adone.lazify({
    glob: "./glob",
    extGlob: "./ext_glob",
    fqdn: "./fqdn",
    url: "./url",
    email: "./email",
    safeRegexp: "./safe_regexp",
    deepEqual: "./deep_equal",
    // from common
    string: ["../../common", (mod) => mod.isString],
    buffer: ["../../common", (mod) => mod.isBuffer],
    plainObject: ["../../common", (mod) => mod.isPlainObject],
    // eslint-disable-next-line adone/no-typeof
    nodejs: () => Object.prototype.toString.call(typeof process !== "undefined" ? process : 0) === "[object process]",

    // All of these predicates should be replced in-place during transpiling
    subsystem: () => (obj) => obj instanceof adone.app.Subsystem,
    application: () => (obj) => obj instanceof adone.app.Application,
    byteArray: () => (obj) => obj instanceof adone.collection.ByteArray,
    long: () => (obj) => obj instanceof adone.math.Long,
    bigNumber: () => (obj) => obj instanceof adone.math.BigNumber,
    emitter: () => (obj) => obj instanceof adone.event.Emitter,
    asyncEmitter: () => (obj) => obj instanceof adone.event.AsyncEmitter,
    coreStream: () => (obj) => obj instanceof adone.stream.core.Stream,
    configuration: () => (obj) => obj instanceof adone.configuration.BaseConfig,
    datetime: () => (obj) => obj instanceof adone.datetime.Datetime,
    multiAddress: () => (obj) => obj instanceof adone.multi.address.Multiaddr,
    task: () => (obj) => obj instanceof adone.task.Task,
    flowTask: () => (obj) => obj instanceof adone.task.Flow,
    taskObserver: () => (obj) => obj instanceof adone.task.TaskObserver,
    taskManager: () => (obj) => obj instanceof adone.task.TaskManager,

    realm: () => (obj) => obj instanceof adone.realm.RealmManager,

    // crypto
    identity: () => (obj) => obj instanceof adone.crypto.Identity,

    // fast
    fastStream: () => (obj) => obj instanceof adone.fast.Stream,
    fastLocalStream: () => (obj) => obj instanceof adone.fast.LocalStream,
    fastLocalMapStream: () => (obj) => obj instanceof adone.fast.LocalMapStream,

    // peer/p2p/net
    peerId: () => (obj) => obj instanceof adone.p2p.PeerId,
    peerInfo: () => (obj) => obj instanceof adone.p2p.PeerInfo,
    p2pPeerInfo: () => (obj) => obj instanceof adone.net.p2p.PeerInfo,
    p2pCore: () => (obj) => obj instanceof adone.net.p2p.Core,

    vaultValuable: () => (obj) => obj instanceof adone.vault.Valuable,

    // netron
    netron: () => (obj) => obj instanceof adone.netron.Netron,
    netronDefinition: () => (obj) => obj instanceof adone.netron.Definition,
    netronDefinitions: () => (obj) => obj instanceof adone.netron.Definitions,
    netronReference: () => (obj) => obj instanceof adone.netron.Reference,
    netronInterface: () => (obj) => obj instanceof adone.netron.Interface,
    netronStub: () => (obj) => obj instanceof adone.netron.Stub,
    netronRemoteStub: () => (obj) => obj instanceof adone.netron.RemoteStub,
    netronPeer: () => (obj) => obj instanceof adone.netron.AbstractPeer,
    netronOwnPeer: () => (obj) => obj instanceof adone.netron.OwnPeer,
    netronRemotePeer: () => (obj) => obj instanceof adone.netron.RemotePeer,
    netronIMethod: () => (ni, name) => function_(ni[name]) && (ni.$def.$[name].method === true),
    netronIProperty: () => (ni, name) => object(ni[name]) && function_(ni[name].get) && (undefined_(ni.$def.$[name].method)),
    netronContext: () => (obj) => {
        let isContex = false;
        let target = undefined;

        if (class_(obj)) {
            target = obj;
        } else if (propertyDefined(obj, "__proto__") && propertyOwned(obj.__proto__, "constructor")) {
            if (adone.netron.meta.isDynamicContext(obj)) {
                return true;
            }
            target = obj.__proto__.constructor;
        }
        if (!undefined_(target)) {
            isContex = object(Reflect.getMetadata(adone.netron.meta.CONTEXT_ANNOTATION, target));
        }
        return isContex;
    }
}, exports, require);
