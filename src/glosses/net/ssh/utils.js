// TODO:
//    * handle multi-line header values (OpenSSH)?
//    * more thorough validation?

const { is } = adone;
const crypto = adone.std.crypto;
const asn1 = adone.crypto.asn1;

// import BigInteger from "./jsbn"; // only for converting PPK -> OpenSSL format
import { SSH_TO_OPENSSL } from "./constants";

const RE_STREAM = /^arcfour/i;
const RE_KEY_LEN = /(.{64})/g;
// XXX the value of 2400 from dropbear is only for certain strings, not all
// strings. for example the list strings used during handshakes
const MAX_STRING_LEN = Infinity; //2400; // taken from dropbear
const PPK_IV = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

let utils;

const RE_PPK = /^PuTTY-User-Key-File-2: ssh-(rsa|dss)\r?\nEncryption: (aes256-cbc|none)\r?\nComment: ([^\r\n]*)\r?\nPublic-Lines: \d+\r?\n([\s\S]+?)\r?\nPrivate-Lines: \d+\r?\n([\s\S]+?)\r?\nPrivate-MAC: ([^\r\n]+)/;
const RE_HEADER_OPENSSH_PRIV = /^-----BEGIN (RSA|DSA|EC) PRIVATE KEY-----$/i;
const RE_FOOTER_OPENSSH_PRIV = /^-----END (?:RSA|DSA|EC) PRIVATE KEY-----$/i;
// 521 бит ниже - не опечатка: https://en.wikipedia.org/wiki/Elliptic_curve_cryptography#cite_ref-27
const RE_HEADER_OPENSSH_PUB = /^((?:(?:ssh-(rsa|dss))|ecdsa-sha2-nistp(256|384|521))(?:-cert-v0[01]@openssh.com)?) ([A-Z0-9a-z\/+=]+)(?:$|\s+([\S].*)?)$/i;
const RE_HEADER_RFC4716_PUB = /^---- BEGIN SSH2 PUBLIC KEY ----$/i;
const RE_FOOTER_RFC4716_PUB = /^---- END SSH2 PUBLIC KEY ----$/i;
const RE_HEADER_OPENSSH = /^([^:]+):\s*([\S].*)?$/i;
const RE_HEADER_RFC4716 = /^([^:]+): (.*)?$/i;

const nullByte = new Uint8Array([0x00]).buffer;

const { util: { buffer: { toArrayBuffer } } } = adone;

export const parseKey = (data) => {
    if (is.buffer(data)) {
        data = data.toString("utf8");
    } else if (!is.string(data)) {
        return new Error("Key data must be a Buffer or string");
    }

    const ret = {
        fulltype: undefined,
        type: undefined,
        curve: undefined,
        extra: undefined,
        comment: undefined,
        encryption: undefined,
        private: undefined,
        privateOrig: undefined,
        public: undefined,
        publicOrig: undefined
    };
    let m;
    let i;
    let len;

    data = data.trim().split(/\r\n|\n/);

    while (!data[0].length) {
        data.shift();
    }
    while (!data.slice(-1)[0].length) {
        data.pop();
    }

    const orig = data.join("\n");

    if ((m = RE_HEADER_OPENSSH_PRIV.exec(data[0])) && RE_FOOTER_OPENSSH_PRIV.test(data.slice(-1))) {
        // OpenSSH private key
        let keyType = m[1].toLowerCase();
        if (keyType === "dsa") {
            keyType = "dss";
        }

        if (keyType === "ec" && adone.semver.lt(process.version, "5.2.0")) {
            return new Error(
                "EC private keys are not supported in this version of node"
            );
        }

        if (!RE_HEADER_OPENSSH.test(data[1])) {
            // unencrypted, no headers
            const privData = Buffer.from(data.slice(1, -1).join(""), "base64");
            if (keyType !== "ec") {
                ret.fulltype = `ssh-${keyType}`;
            } else {
                // ECDSA
                const asnData = asn1.fromBER(toArrayBuffer(privData)).result;
                const oid = asnData.valueBlock.value[2].valueBlock.value[0].valueBlock.toString()
                switch (oid) {
                    case "1.2.840.10045.3.1.7":
                        // prime256v1/secp256r1
                        ret.fulltype = "ecdsa-sha2-nistp256";
                        break;
                    case "1.3.132.0.34":
                        // secp384r1
                        ret.fulltype = "ecdsa-sha2-nistp384";
                        break;
                    case "1.3.132.0.35":
                        // secp521r1
                        ret.fulltype = "ecdsa-sha2-nistp521";
                        break;
                }
                if (is.undefined(ret.fulltype)) {
                    return new Error("Unsupported EC private key type");
                }
            }
            ret.private = privData;
        } else {
            // possibly encrypted, headers
            for (i = 1, len = data.length; i < len; ++i) {
                m = RE_HEADER_OPENSSH.exec(data[i]);
                if (m) {
                    m[1] = m[1].toLowerCase();
                    if (m[1] === "dek-info") {
                        m[2] = m[2].split(",");
                        ret.encryption = m[2][0].toLowerCase();
                        if (m[2].length > 1) {
                            ret.extra = m[2].slice(1);
                        }
                    }
                } else if (data[i].length) {
                    break;
                }
            }
            ret.private = Buffer.from(data.slice(i, -1).join(""), "base64");
        }
        ret.type = keyType;
        ret.privateOrig = Buffer.from(orig);
    } else if (m = RE_HEADER_OPENSSH_PUB.exec(data[0])) { // eslint-disable-line no-cond-assign
        // OpenSSH public key
        ret.fulltype = m[1];
        ret.type = (m[2] || "ec").toLowerCase();
        ret.public = Buffer.from(m[4], "base64");
        ret.publicOrig = Buffer.from(orig);
        ret.comment = m[5];
        if (m[3]) { // ECDSA only
            ret.curve = `nistp${m[3]}`;
        }
    } else if (RE_HEADER_RFC4716_PUB.test(data[0]) &&
        RE_FOOTER_RFC4716_PUB.test(data.slice(-1))) {
        if (data[1].indexOf(": ") === -1) {
            // no headers
            ret.public = Buffer.from(data.slice(1, -1).join(""), "base64");
        } else {
            // headers
            for (i = 1, len = data.length; i < len; ++i) {
                if (data[i].indexOf(": ") === -1) {
                    if (data[i].length) {
                        break;
                    } else { // start of key data
                        continue;
                    } // empty line
                }
                while (data[i].substr(-1) === "\\") {
                    if (i + 1 < len) {
                        data[i] = data[i].slice(0, -1) + data[i + 1];
                        data.splice(i + 1, 1);
                        --len;
                    } else {
                        return new Error("RFC4716 public key missing header continuation line");
                    }
                }
                m = RE_HEADER_RFC4716.exec(data[i]);
                if (m) {
                    m[1] = m[1].toLowerCase();
                    if (m[1] === "comment") {
                        ret.comment = m[2] || "";
                        if (ret.comment[0] === "\"" && ret.comment.substr(-1) === "\"") {
                            ret.comment = ret.comment.slice(1, -1);
                        }
                    }
                } else {
                    return new Error("RFC4716 public key invalid header line");
                }
            }
            ret.public = Buffer.from(data.slice(i, -1).join(""), "base64");
        }
        len = ret.public.readUInt32BE(0, true);
        const fulltype = ret.public.toString("ascii", 4, 4 + len);
        ret.fulltype = fulltype;
        if (fulltype === "ssh-dss") {
            ret.type = "dss";
        } else if (fulltype === "ssh-rsa") {
            ret.type = "rsa";
        } else {
            return new Error(`Unsupported RFC4716 public key type: ${fulltype}`);
        }
        ret.public = ret.public.slice(11);
        ret.publicOrig = Buffer.from(orig);
    } else if (m = RE_PPK.exec(orig)) { // eslint-disable-line no-cond-assign
        // m[1] = short type
        // m[2] = encryption type
        // m[3] = comment
        // m[4] = base64-encoded public key data:
        //         for "ssh-rsa":
        //          string "ssh-rsa"
        //          mpint  e    (public exponent)
        //          mpint  n    (modulus)
        //         for "ssh-dss":
        //          string "ssh-dss"
        //          mpint p     (modulus)
        //          mpint q     (prime)
        //          mpint g     (base number)
        //          mpint y     (public key parameter: g^x mod p)
        // m[5] = base64-encoded private key data:
        //         for "ssh-rsa":
        //          mpint  d    (private exponent)
        //          mpint  p    (prime 1)
        //          mpint  q    (prime 2)
        //          mpint  iqmp ([inverse of q] mod p)
        //         for "ssh-dss":
        //          mpint x     (private key parameter)
        // m[6] = SHA1 HMAC over:
        //          string  name of algorithm ("ssh-dss", "ssh-rsa")
        //          string  encryption type
        //          string  comment
        //          string  public key data
        //          string  private-plaintext (including the final padding)

        // avoid cyclic require by requiring on first use
        if (!utils) {
            utils = require("./utils");
        }

        ret.ppk = true;
        ret.type = m[1];
        ret.fulltype = `ssh-${m[1]}`;
        if (m[2] !== "none") {
            ret.encryption = m[2];
        }
        ret.comment = m[3];

        ret.public = Buffer.from(m[4].replace(/\r?\n/g, ""), "base64");
        const privateKey = Buffer.from(m[5].replace(/\r?\n/g, ""), "base64");

        ret.privateMAC = m[6].replace(/\r?\n/g, "");

        // automatically verify private key MAC if we don't need to wait for
        // decryption
        if (!ret.encryption) {
            const valid = utils.verifyPPKMAC(ret, undefined, privateKey);
            if (!valid) {
                throw new Error("PPK MAC mismatch");
            }
        }

        // generate a PEM encoded version of the public key
        const pubkey = utils.genPublicKey(ret);
        ret.public = pubkey.public;
        ret.publicOrig = pubkey.publicOrig;

        ret.private = privateKey;

        // automatically convert private key data to OpenSSL format (including PEM)
        // if we don't need to wait for decryption
        if (!ret.encryption) {
            utils.convertPPKPrivate(ret);
        }
    } else {
        return new Error("Unsupported key format");
    }

    return ret;
};

export const iv_inc = (iv) => {
    let n = 12;
    let c = 0;
    do {
        --n;
        c = iv[n];
        if (c === 255) {
            iv[n] = 0;
        } else {
            iv[n] = ++c;
            return;
        }
    } while (n > 4);
};

export const isStreamCipher = (name) => RE_STREAM.test(name);

export const readInt = (buffer, start, stream, cb) => {
    const bufferLen = buffer.length;
    if (start < 0 || start >= bufferLen || (bufferLen - start) < 4) {
        stream && stream._cleanup(cb);
        return false;
    }

    return buffer.readUInt32BE(start, true);
};

export const readString = (buffer, start, encoding, stream, cb, maxLen) => {
    if (encoding && !is.buffer(encoding) && !is.string(encoding)) {
        if (is.number(cb)) {
            maxLen = cb;
        }
        cb = stream;
        stream = encoding;
        encoding = undefined;
    }

    start || (start = 0);
    const bufferLen = buffer.length;
    const left = bufferLen - start;
    if (start < 0 || start >= bufferLen || left < 4) {
        stream && stream._cleanup(cb);
        return false;
    }

    const len = buffer.readUInt32BE(start, true);
    if (len > (maxLen || MAX_STRING_LEN) || left < (4 + len)) {
        stream && stream._cleanup(cb);
        return false;
    }

    start += 4;
    const end = start + len;
    buffer._pos = end;

    if (encoding) {
        if (is.buffer(encoding)) {
            buffer.copy(encoding, 0, start, end);
            return encoding;
        }
        return buffer.toString(encoding, start, end);
    }
    return buffer.slice(start, end);
};

// function bnpFromString(s) {
//     this.t = 0;
//     this.s = 0;
//     let i = s.length;
//     let sh = 0;
//     while (--i >= 0) {
//         const x = s[i] & 0xff;
//         if (sh === 0) {
//             this[this.t++] = x;
//         } else if (sh + 8 > this.DB) {
//             this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
//             this[this.t++] = (x >> (this.DB - sh));
//         } else {
//             this[this.t - 1] |= x << sh;
//         }
//         sh += 8;
//         if (sh >= this.DB) {
//             sh -= this.DB;
//         }
//     }
//     if ((s[0] & 0x80) != 0) {
//         this.s = -1;
//         if (sh > 0) {
//             this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;
//         }
//     }
//     const c = this.s & this.DM;
//     while (this.t > 0 && this[this.t - 1] === c) {
//         --this.t;
//     }
// }

export const convertPPKPrivate = (keyInfo) => {
    if (!keyInfo.ppk || !keyInfo.public || !keyInfo.private) {
        throw new Error("Key isn't a PPK");
    } else if (keyInfo._converted) {
        return false;
    }

    const pub = keyInfo.public;
    const priv = keyInfo.private;
    let asnData;

    let p;
    let q;

    if (keyInfo.type === "rsa") {
        const e = readString(pub, 4 + 7);
        const n = readString(pub, pub._pos);
        const d = readString(priv, 0);
        p = readString(priv, priv._pos);
        q = readString(priv, priv._pos);
        const iqmp = readString(priv, priv._pos);
        const p1 = adone.math.BigNumber.fromBuffer(p);
        const q1 = adone.math.BigNumber.fromBuffer(q);
        let dmp1 = adone.math.BigNumber.fromBuffer(d);
        let dmq1 = adone.math.BigNumber.fromBuffer(d);

        dmp1 = dmp1.mod(p1.sub(adone.math.BigNumber.ONE)).toBuffer();
        dmq1 = dmq1.mod(q1.sub(adone.math.BigNumber.ONE)).toBuffer();

        asnData = new asn1.Sequence({
            value: [
                new asn1.Integer({
                    value: 0
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(n)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(e)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(d)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(p)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(q)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(dmp1)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(dmq1)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(iqmp)
                })
            ]
        });
    } else {
        p = readString(pub, 4 + 7);
        q = readString(pub, pub._pos);
        const g = readString(pub, pub._pos);
        const y = readString(pub, pub._pos);
        const x = readString(priv, 0);

        asnData = new asn1.Sequence({
            value: [
                new asn1.Integer({
                    value: 0
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(p)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(q)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(g)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(y)
                }),
                new asn1.Integer({
                    valueHex: toArrayBuffer(x)
                })
            ]
        });
    }

    const ber = Buffer.from(asnData.toBER());

    const b64key = ber.toString("base64").replace(RE_KEY_LEN, "$1\n");
    const fullkey = `-----BEGIN ${keyInfo.type === "rsa" ? "RSA" : "DSA"} PRIVATE KEY-----\n${b64key}${b64key[b64key.length - 1] === "\n" ? "" : "\n"}-----END ${keyInfo.type === "rsa" ? "RSA" : "DSA"} PRIVATE KEY-----`;

    keyInfo.private = ber;
    keyInfo.privateOrig = Buffer.from(fullkey);
    keyInfo._converted = true;
    return true;
};

export const verifyPPKMAC = (keyInfo, passphrase, privateKey) => {
    if (!is.undefined(keyInfo._macresult)) {
        return keyInfo._macresult;
    } else if (!keyInfo.ppk) {
        throw new Error("Key isn't a PPK");
    } else if (!keyInfo.privateMAC) {
        throw new Error("Missing MAC");
    } else if (!privateKey) {
        throw new Error("Missing raw private key data");
    } else if (keyInfo.encryption && !is.string(passphrase)) {
        throw new Error("Missing passphrase for encrypted PPK");
    } else if (keyInfo.encryption && !keyInfo._decrypted) {
        throw new Error("PPK must be decrypted before verifying MAC");
    }

    const mac = keyInfo.privateMAC;
    const typelen = keyInfo.fulltype.length;
    // encryption algorithm is converted at this point for use with OpenSSL,
    // so we need to use the original value so that the MAC is calculated
    // correctly
    const enc = keyInfo.encryption ? "aes256-cbc" : "none";
    const enclen = enc.length;
    const commlen = Buffer.byteLength(keyInfo.comment);
    const pub = keyInfo.public;
    const publen = pub.length;
    const privlen = privateKey.length;
    const macdata = Buffer.allocUnsafe(4 + typelen +
        4 + enclen +
        4 + commlen +
        4 + publen +
        4 + privlen);
    let p = 0;

    macdata.writeUInt32BE(typelen, p, true);
    macdata.write(keyInfo.fulltype, p += 4, typelen, "ascii");
    macdata.writeUInt32BE(enclen, p += typelen, true);
    macdata.write(enc, p += 4, enclen, "ascii");
    macdata.writeUInt32BE(commlen, p += enclen, true);
    macdata.write(keyInfo.comment, p += 4, commlen, "utf8");
    macdata.writeUInt32BE(publen, p += commlen, true);
    pub.copy(macdata, p += 4);
    macdata.writeUInt32BE(privlen, p += publen, true);
    privateKey.copy(macdata, p += 4);

    if (!is.string(passphrase)) {
        passphrase = "";
    }

    const mackey = crypto.createHash("sha1")
        .update("putty-private-key-file-mac-key", "ascii")
        .update(passphrase, "utf8")
        .digest();

    const calcMAC = crypto.createHmac("sha1", mackey)
        .update(macdata)
        .digest("hex");

    return keyInfo._macresult = calcMAC === mac;
};

export const DSASigBERToBare = (signature) => {
    if (signature.length <= 40) {
        return signature;
    }
    // This is a quick and dirty way to get from BER encoded r and s that
    // OpenSSL gives us, to just the bare values back to back (40 bytes
    // total) like OpenSSH (and possibly others) are expecting
    const asnData = asn1.fromBER(toArrayBuffer(signature)).result;
    if (asnData.error) {
        throw new Error(`Invalid signature: ${asnData.error}`);
    }
    let r = Buffer.from(asnData.valueBlock.value[0].valueBlock.valueHex);
    let s = Buffer.from(asnData.valueBlock.value[1].valueBlock.valueHex);
    let rOffset = 0;
    let sOffset = 0;
    if (r.length < 20) {
        const rNew = Buffer.allocUnsafe(20);
        r.copy(rNew, 1);
        r = rNew;
        r[0] = 0;
    }
    if (s.length < 20) {
        const sNew = Buffer.allocUnsafe(20);
        s.copy(sNew, 1);
        s = sNew;
        s[0] = 0;
    }
    if (r.length > 20 && r[0] === 0x00) {
        rOffset = 1;
    }
    if (s.length > 20 && s[0] === 0x00) {
        sOffset = 1;
    }
    const newSig = Buffer.allocUnsafe((r.length - rOffset) + (s.length - sOffset));
    r.copy(newSig, 0, rOffset);
    s.copy(newSig, r.length - rOffset, sOffset);
    return newSig;
};

export const DSASigBareToBER = (signature) => {
    if (signature.length > 40) {
        return signature;
    }
    // Change bare signature r and s values to ASN.1 BER values for OpenSSL

    let r = signature.slice(0, 20);
    let s = signature.slice(20);
    if (r[0] & 0x80) {
        const rNew = Buffer.allocUnsafe(21);
        rNew[0] = 0x00;
        r.copy(rNew, 1);
        r = rNew;
    } else if (r[0] === 0x00 && !(r[1] & 0x80)) {
        r = r.slice(1);
    }
    if (s[0] & 0x80) {
        const sNew = Buffer.allocUnsafe(21);
        sNew[0] = 0x00;
        s.copy(sNew, 1);
        s = sNew;
    } else if (s[0] === 0x00 && !(s[1] & 0x80)) {
        s = s.slice(1);
    }

    const asnData = new asn1.Sequence({
        value: [
            new asn1.Integer({
                valueHex: toArrayBuffer(r)
            }),
            new asn1.Integer({
                valueHex: toArrayBuffer(s)
            })
        ]
    });

    return Buffer.from(asnData.toBER());
};

export const ECDSASigASN1ToSSH = (signature) => {
    if (signature[0] === 0x00) {
        return signature;
    }
    // Convert SSH signature parameters to ASN.1 BER values for OpenSSL

    const asnData = asn1.fromBER(toArrayBuffer(signature)).result;

    if (asnData.error) {
        throw new Error(`Invalid signature: ${asnData.error}`);
    }

    const r = Buffer.from(asnData.valueBlock.value[0].valueBlock.valueHex);
    const s = Buffer.from(asnData.valueBlock.value[1].valueBlock.valueHex);

    const newSig = Buffer.allocUnsafe(4 + r.length + 4 + s.length);
    newSig.writeUInt32BE(r.length, 0, true);
    r.copy(newSig, 4);
    newSig.writeUInt32BE(s.length, 4 + r.length, true);
    s.copy(newSig, 4 + 4 + r.length);
    return newSig;
};

export const ECDSASigSSHToASN1 = (signature, self, callback) => {
    // Convert SSH signature parameters to ASN.1 BER values for OpenSSL
    const r = readString(signature, 0, self, callback);
    if (r === false) {
        return false;
    }
    const s = readString(signature, signature._pos, self, callback);
    if (s === false) {
        return false;
    }

    const asnData = new asn1.Sequence({
        value: [
            new asn1.Integer({
                valueHex: toArrayBuffer(r)
            }),
            new asn1.Integer({
                valueHex: toArrayBuffer(s)
            })
        ]
    });

    return Buffer.from(asnData.toBER());
};

export const RSAKeySSHToASN1 = (key, self, callback) => {
    // Convert SSH key parameters to ASN.1 BER values for OpenSSL
    const e = readString(key, key._pos, self, callback);
    if (e === false) {
        return false;
    }
    const n = readString(key, key._pos, self, callback);
    if (n === false) {
        return false;
    }

    const asnData = new asn1.Sequence({
        value: [
            new asn1.Sequence({
                value: [
                    new asn1.ObjectIdentifier({
                        value: "1.2.840.113549.1.1.1"
                    }),
                    new asn1.Null()
                ]
            }),
            new asn1.BitString({
                isConstructed: true,
                value: [
                    new asn1.RawData({
                        data: nullByte
                    }),
                    new asn1.Sequence({
                        value: [
                            new asn1.Integer({
                                valueHex: toArrayBuffer(n)
                            }),
                            new asn1.Integer({
                                valueHex: toArrayBuffer(e)
                            })
                        ]
                    })
                ]
            })
        ]
    });

    return Buffer.from(asnData.toBER());
};

export const DSAKeySSHToASN1 = (key, self, callback) => {
    // Convert SSH key parameters to ASN.1 BER values for OpenSSL
    const p = readString(key, key._pos, self, callback);
    if (p === false) {
        return false;
    }
    const q = readString(key, key._pos, self, callback);
    if (q === false) {
        return false;
    }
    const g = readString(key, key._pos, self, callback);
    if (g === false) {
        return false;
    }
    const y = readString(key, key._pos, self, callback);
    if (y === false) {
        return false;
    }

    const asnData = new asn1.Sequence({
        value: [
            new asn1.Sequence({
                value: [
                    new asn1.ObjectIdentifier({
                        value: "1.2.840.10040.4.1" // id-rsa
                    }),
                    new asn1.Sequence({
                        value: [
                            new asn1.Integer({
                                valueHex: toArrayBuffer(p)
                            }),
                            new asn1.Integer({
                                valueHex: toArrayBuffer(q)
                            }),
                            new asn1.Integer({
                                valueHex: toArrayBuffer(g)
                            })
                        ]
                    })
                ]
            }),
            new asn1.BitString({
                isConstructed: true,
                value: [
                    new asn1.RawData({
                        data: nullByte
                    }),
                    new asn1.Integer({
                        valueHex: toArrayBuffer(y)
                    })
                ]
            })
        ]
    });

    return Buffer.from(asnData.toBER());
};

export const ECDSAKeySSHToASN1 = (key, self, callback) => {
    // Convert SSH key parameters to ASN.1 BER values for OpenSSL
    const curve = readString(key, key._pos, self, callback);
    if (curve === false) {
        return false;
    }
    const Q = readString(key, key._pos, self, callback);
    if (Q === false) {
        return false;
    }

    let ecCurveOID;
    switch (curve.toString("ascii")) {
        case "nistp256":
            // prime256v1/secp256r1
            ecCurveOID = "1.2.840.10045.3.1.7";
            break;
        case "nistp384":
            // secp384r1
            ecCurveOID = "1.3.132.0.34";
            break;
        case "nistp521":
            // secp521r1
            ecCurveOID = "1.3.132.0.35";
            break;
        default:
            return false;
    }

    const asnData = new asn1.Sequence({
        value: [
            new asn1.Sequence({
                value: [
                    new asn1.ObjectIdentifier({
                        value: "1.2.840.10045.2.1" // id-ecPublicKey
                    }),
                    new asn1.ObjectIdentifier({
                        value: ecCurveOID
                    })
                ]
            }),
            new asn1.BitString({
                isConstructed: true,
                value: [
                    new asn1.RawData({
                        data: nullByte
                    }),
                    new asn1.RawData({
                        data: toArrayBuffer(Q)
                    })
                ]
            })
        ]
    });

    return Buffer.from(asnData.toBER());
};

export const decryptKey = (keyInfo, passphrase) => {
    if (keyInfo._decrypted || !keyInfo.encryption) {
        return;
    }

    let keylen = 0;
    let key;
    let iv;

    keyInfo.encryption = SSH_TO_OPENSSL[keyInfo.encryption] ||
        keyInfo.encryption;
    switch (keyInfo.encryption) {
        case "aes-256-cbc":
        case "aes-256-ctr":
            keylen = 32;
            break;
        case "des-ede3-cbc":
        case "des-ede3":
        case "aes-192-cbc":
        case "aes-192-ctr":
            keylen = 24;
            break;
        case "aes-128-cbc":
        case "aes-128-ctr":
        case "cast-cbc":
        case "bf-cbc":
            keylen = 16;
            break;
        default:
            throw new Error(`Unsupported cipher for encrypted key: ${
                keyInfo.encryption}`);
    }

    if (keyInfo.ppk) {
        iv = PPK_IV;

        key = Buffer.concat([
            crypto.createHash("sha1")
                .update(`\x00\x00\x00\x00${passphrase}`, "utf8")
                .digest(),
            crypto.createHash("sha1")
                .update(`\x00\x00\x00\x01${passphrase}`, "utf8")
                .digest()
        ]);
        key = key.slice(0, keylen);
    } else {
        iv = Buffer.from(keyInfo.extra[0], "hex");

        key = crypto.createHash("md5")
            .update(passphrase, "utf8")
            .update(iv.slice(0, 8))
            .digest();

        while (keylen > key.length) {
            key = Buffer.concat([
                key,
                crypto.createHash("md5")
                    .update(key)
                    .update(passphrase, "utf8")
                    .update(iv)
                    .digest().slice(0, 8)
            ]);
        }
        if (key.length > keylen) {
            key = key.slice(0, keylen);
        }
    }

    const dc = crypto.createDecipheriv(keyInfo.encryption, key, iv);
    dc.setAutoPadding(false);
    keyInfo.private = Buffer.concat([dc.update(keyInfo.private), dc.final()]);

    keyInfo._decrypted = true;

    if (keyInfo.privateOrig) {
        // Update our original base64-encoded version of the private key
        const orig = keyInfo.privateOrig.toString("utf8");
        let newOrig = /^(.+(?:\r\n|\n))/.exec(orig)[1];
        const b64key = keyInfo.private.toString("base64");

        newOrig += b64key.match(/.{1,70}/g).join("\n");
        newOrig += /((?:\r\n|\n).+)$/.exec(orig)[1];

        keyInfo.privateOrig = newOrig;
    } else if (keyInfo.ppk) {
        const valid = verifyPPKMAC(keyInfo, passphrase, keyInfo.private);
        if (!valid) {
            throw new Error("PPK MAC mismatch");
        }
        // Automatically convert private key data to OpenSSL format
        // (including PEM)
        convertPPKPrivate(keyInfo);
    }

    // Fill in full key type
    // TODO: make DRY, we do this also in keyParser
    if (keyInfo.type !== "ec") {
        keyInfo.fulltype = `ssh-${keyInfo.type}`;
    } else {
        // ECDSA

        const asnData = asn1.fromBER(toArrayBuffer(keyInfo.private)).result;

        const oid = asnData.valueBlock.value[2].valueBlock.value[0].valueBlock.toString()

        switch (oid) {
            case "1.2.840.10045.3.1.7":
                // prime256v1/secp256r1
                keyInfo.fulltype = "ecdsa-sha2-nistp256";
                break;
            case "1.3.132.0.34":
                // secp384r1
                keyInfo.fulltype = "ecdsa-sha2-nistp384";
                break;
            case "1.3.132.0.35":
                // secp521r1
                keyInfo.fulltype = "ecdsa-sha2-nistp521";
                break;
        }
        if (is.undefined(keyInfo.fulltype)) {
            return new Error("Unsupported EC private key type");
        }
    }
};

export const genPublicKey = (keyInfo) => {
    let publicKey;
    let i;

    // RSA
    let n;
    let e;

    // DSA
    let p;
    let q;
    let g;
    let y;

    // ECDSA
    let d;
    let Q;
    let ecCurveOID;
    let ecCurveName;

    if (keyInfo.private) {
        // parsing private key in ASN.1 format in order to generate a public key
        const privKey = keyInfo.private;
        const asnData = asn1.fromBER(toArrayBuffer(privKey)).result;
        let errMsg;

        if (asnData.error) {
            errMsg = `Malformed private key (${asnData.error})`;
            if (keyInfo._decrypted) {
                errMsg += ". Bad passphrase?";
            }
            throw new Error(errMsg);
        }

        if (keyInfo.type === "rsa") {
            // modulus (n) -- integer
            n = Buffer.from(asnData.valueBlock.value[1].valueBlock.valueHex);
            if (is.null(n)) {
                errMsg = "Malformed private key (expected RSA n value)";
                if (keyInfo._decrypted) {
                    errMsg += ". Bad passphrase?";
                }
                throw new Error(errMsg);
            }

            // public exponent (e) -- integer
            e = Buffer.from(asnData.valueBlock.value[2].valueBlock.valueHex);
            if (is.null(e)) {
                errMsg = "Malformed private key (expected RSA e value)";
                if (keyInfo._decrypted) {
                    errMsg += ". Bad passphrase?";
                }
                throw new Error(errMsg);
            }

            publicKey = Buffer.allocUnsafe(4 + 7 // ssh-rsa
                +
                4 + n.length +
                4 + e.length);

            publicKey.writeUInt32BE(7, 0, true);
            publicKey.write("ssh-rsa", 4, 7, "ascii");

            i = 4 + 7;
            publicKey.writeUInt32BE(e.length, i, true);
            e.copy(publicKey, i += 4);

            publicKey.writeUInt32BE(n.length, i += e.length, true);
            n.copy(publicKey, i += 4);
        } else if (keyInfo.type === "dss") { // DSA
            // prime (p) -- integer
            p = Buffer.from(asnData.valueBlock.value[1].valueBlock.valueHex);

            // group order (q) -- integer
            q = Buffer.from(asnData.valueBlock.value[2].valueBlock.valueHex);

            // group generator (g) -- integer
            g = Buffer.from(asnData.valueBlock.value[3].valueBlock.valueHex);

            // public key value (y) -- integer
            y = Buffer.from(asnData.valueBlock.value[4].valueBlock.valueHex);

            publicKey = Buffer.allocUnsafe(4 + 7 // ssh-dss
                +
                4 + p.length +
                4 + q.length +
                4 + g.length +
                4 + y.length);

            publicKey.writeUInt32BE(7, 0, true);
            publicKey.write("ssh-dss", 4, 7, "ascii");

            i = 4 + 7;
            publicKey.writeUInt32BE(p.length, i, true);
            p.copy(publicKey, i += 4);

            publicKey.writeUInt32BE(q.length, i += p.length, true);
            q.copy(publicKey, i += 4);

            publicKey.writeUInt32BE(g.length, i += q.length, true);
            g.copy(publicKey, i += 4);

            publicKey.writeUInt32BE(y.length, i += g.length, true);
            y.copy(publicKey, i += 4);
        } else { // ECDSA
            d = Buffer.from(asnData.valueBlock.value[1].valueBlock.valueHex);
            ecCurveOID = asnData.valueBlock.value[2].valueBlock.value[0].valueBlock.toString();
            let tempECDH;
            switch (ecCurveOID) {
                case "1.2.840.10045.3.1.7":
                    // prime256v1/secp256r1
                    keyInfo.curve = ecCurveName = "nistp256";
                    tempECDH = crypto.createECDH("prime256v1");
                    break;
                case "1.3.132.0.34":
                    // secp384r1
                    keyInfo.curve = ecCurveName = "nistp384";
                    tempECDH = crypto.createECDH("secp384r1");
                    break;
                case "1.3.132.0.35":
                    // secp521r1
                    keyInfo.curve = ecCurveName = "nistp521";
                    tempECDH = crypto.createECDH("secp521r1");
                    break;
                default:
                    throw new Error("Malformed private key (unsupported EC curve)");
            }
            tempECDH.setPrivateKey(d);
            Q = tempECDH.getPublicKey();

            publicKey = Buffer.allocUnsafe(4 + 19 // ecdsa-sha2-<curve name>
                +
                4 + 8 // <curve name>
                +
                4 + Q.length);

            publicKey.writeUInt32BE(19, 0, true);
            publicKey.write(`ecdsa-sha2-${ecCurveName}`, 4, 19, "ascii");

            publicKey.writeUInt32BE(8, 23, true);
            publicKey.write(ecCurveName, 27, 8, "ascii");

            publicKey.writeUInt32BE(Q.length, 35, true);
            Q.copy(publicKey, 39);
        }
    } else if (keyInfo.public) {
        publicKey = keyInfo.public;
        if (keyInfo.type === "ec") {
            // TODO: support adding ecdsa-* prefix
            ecCurveName = keyInfo.curve;
        } else if (publicKey[0] !== 0
            // check for missing ssh-{dsa,rsa} prefix
            ||
            publicKey[1] !== 0 ||
            publicKey[2] !== 0 ||
            publicKey[3] !== 7 ||
            publicKey[4] !== 115 ||
            publicKey[5] !== 115 ||
            publicKey[6] !== 104 ||
            publicKey[7] !== 45 ||
            ((publicKey[8] !== 114 ||
                publicKey[9] !== 115 ||
                publicKey[10] !== 97) &&
                ((publicKey[8] !== 100 ||
                    publicKey[9] !== 115 ||
                    publicKey[10] !== 115)))) {
            const newPK = Buffer.allocUnsafe(4 + 7 + publicKey.length);
            publicKey.copy(newPK, 11);
            newPK.writeUInt32BE(7, 0, true);
            if (keyInfo.type === "rsa") {
                newPK.write("ssh-rsa", 4, 7, "ascii");
            } else {
                newPK.write("ssh-dss", 4, 7, "ascii");
            }
            publicKey = newPK;
        }
    } else {
        throw new Error("Missing data generated by parseKey()");
    }

    // generate a public key format for use with OpenSSL

    i = 4 + 7;

    let fulltype;
    let asn1KeyBuf;
    if (keyInfo.type === "rsa") {
        fulltype = "ssh-rsa";
        asn1KeyBuf = RSAKeySSHToASN1(publicKey.slice(4 + 7));
    } else if (keyInfo.type === "dss") {
        fulltype = "ssh-dss";
        asn1KeyBuf = DSAKeySSHToASN1(publicKey.slice(4 + 7));
    } else { // ECDSA
        fulltype = `ecdsa-sha2-${ecCurveName}`;
        asn1KeyBuf = ECDSAKeySSHToASN1(publicKey.slice(4 + 19));
    }

    if (!asn1KeyBuf) {
        throw new Error("Invalid SSH-formatted public key");
    }

    const b64key = asn1KeyBuf.toString("base64").replace(RE_KEY_LEN, "$1\n");
    const fullkey = `-----BEGIN PUBLIC KEY-----\n${b64key}${b64key[b64key.length - 1] === "\n" ? "" : "\n"}-----END PUBLIC KEY-----`;

    return {
        type: keyInfo.type,
        fulltype,
        curve: ecCurveName,
        public: publicKey,
        publicOrig: Buffer.from(fullkey)
    };
};
