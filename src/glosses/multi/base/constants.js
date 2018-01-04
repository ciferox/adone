import base16 from "./base16";
import base32 from "./base32";
import base64 from "./base64";

const {
    data: { basex }
} = adone;


class Base {
    constructor(name, code, implementation, alphabet) {
        this.name = name;
        this.code = code;
        this.alphabet = alphabet;
        if (implementation && alphabet) {
            this.engine = implementation(alphabet);
        }
    }

    encode(stringOrBuffer) {
        return this.engine.encode(stringOrBuffer);
    }

    decode(stringOrBuffer) {
        return this.engine.decode(stringOrBuffer);
    }

    isImplemented() {
        return this.engine;
    }
}

// name, code, implementation, alphabet
const constants = [
    ["base1", "1", "", "1"],
    ["base2", "0", basex, "01"],
    ["base8", "7", basex, "01234567"],
    ["base10", "9", basex, "0123456789"],
    ["base16", "f", base16, "0123456789abcdef"],
    ["base32", "b", base32, "abcdefghijklmnopqrstuvwxyz234567"],
    ["base32pad", "c", base32, "abcdefghijklmnopqrstuvwxyz234567="],
    ["base32hex", "v", base32, "0123456789abcdefghijklmnopqrstuv"],
    ["base32hexpad", "t", base32, "0123456789abcdefghijklmnopqrstuv="],
    ["base32z", "h", base32, "ybndrfg8ejkmcpqxot1uwisza345h769"],
    ["base58flickr", "Z", basex, "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"],
    ["base58btc", "z", basex, "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"],
    ["base64", "m", base64, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"],
    ["base64pad", "M", base64, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="],
    ["base64url", "u", base64, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"],
    ["base64urlpad", "U", base64, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_="]
];

export const names = constants.reduce((prev, tupple) => {
    prev[tupple[0]] = new Base(tupple[0], tupple[1], tupple[2], tupple[3]);
    return prev;
}, {});

export const codes = constants.reduce((prev, tupple) => {
    prev[tupple[1]] = names[tupple[0]];
    return prev;
}, {});
