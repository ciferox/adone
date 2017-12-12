const {
    data: { basex },
    is
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


const base16 = (alphabet) => {
    return {
        encode(input) {
            if (is.string(input)) {
                return Buffer.from(input).toString("hex");
            }
            return input.toString("hex");
        },
        decode(input) {
            for (const char of input) {
                if (!alphabet.includes(char)) {
                    throw new Error("invalid base16 character");
                }
            }
            return Buffer.from(input, "hex");
        }
    };
};


// name, code, implementation, alphabet
const constants = [
    ["base1", "1", "", "1"],
    ["base2", "0", basex, "01"],
    ["base8", "7", basex, "01234567"],
    ["base10", "9", basex, "0123456789"],
    ["base16", "f", base16, "0123456789abcdef"],
    ["base32hex", "v", basex, "0123456789abcdefghijklmnopqrstuv"],
    ["base32", "b", basex, "abcdefghijklmnopqrstuvwxyz234567"],
    ["base32z", "h", basex, "ybndrfg8ejkmcpqxot1uwisza345h769"],
    ["base58flickr", "Z", basex, "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"],
    ["base58btc", "z", basex, "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"],
    ["base64", "m", basex, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"],
    ["base64url", "u", basex, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"]
];

export const names = constants.reduce((prev, tupple) => {
    prev[tupple[0]] = new Base(tupple[0], tupple[1], tupple[2], tupple[3]);
    return prev;
}, {});

export const codes = constants.reduce((prev, tupple) => {
    prev[tupple[1]] = names[tupple[0]];
    return prev;
}, {});
