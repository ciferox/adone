/**
 * Supported cipher modes.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2010-2014 Digital Bazaar, Inc.
 */

const {
    is,
    crypto
} = adone;

/**
 *  Electronic codebook (ECB) (Don't use this; it's not secure) *
 */

export const ecb = function (options) {
    options = options || {};
    this.name = "ECB";
    this.cipher = options.cipher;
    this.blockSize = options.blockSize || 16;
    this._ints = this.blockSize / 4;
    this._inBlock = new Array(this._ints);
    this._outBlock = new Array(this._ints);
};

ecb.prototype.start = function (options) {};

ecb.prototype.encrypt = function (input, output, finish) {
    // not enough input to encrypt
    if (input.length() < this.blockSize && !(finish && input.length() > 0)) {
        return true;
    }

    // get next block
    for (var i = 0; i < this._ints; ++i) {
        this._inBlock[i] = input.getInt32();
    }

    // encrypt block
    this.cipher.encrypt(this._inBlock, this._outBlock);

    // write output
    for (var i = 0; i < this._ints; ++i) {
        output.putInt32(this._outBlock[i]);
    }
};

ecb.prototype.decrypt = function (input, output, finish) {
    // not enough input to decrypt
    if (input.length() < this.blockSize && !(finish && input.length() > 0)) {
        return true;
    }

    // get next block
    for (var i = 0; i < this._ints; ++i) {
        this._inBlock[i] = input.getInt32();
    }

    // decrypt block
    this.cipher.decrypt(this._inBlock, this._outBlock);

    // write output
    for (var i = 0; i < this._ints; ++i) {
        output.putInt32(this._outBlock[i]);
    }
};

ecb.prototype.pad = function (input, options) {
    // add PKCS#7 padding to block (each pad byte is the
    // value of the number of pad bytes)
    const padding = (input.length() === this.blockSize ?
        this.blockSize : (this.blockSize - input.length()));
    input.fillWithByte(padding, padding);
    return true;
};

ecb.prototype.unpad = function (output, options) {
    // check for error: input data not a multiple of blockSize
    if (options.overflow > 0) {
        return false;
    }

    // ensure padding byte count is valid
    const len = output.length();
    const count = output.at(len - 1);
    if (count > (this.blockSize << 2)) {
        return false;
    }

    // trim off padding bytes
    output.truncate(count);
    return true;
};

/**
 *  Cipher-block Chaining (CBC) *
 */

export const cbc = function (options) {
    options = options || {};
    this.name = "CBC";
    this.cipher = options.cipher;
    this.blockSize = options.blockSize || 16;
    this._ints = this.blockSize / 4;
    this._inBlock = new Array(this._ints);
    this._outBlock = new Array(this._ints);
};

cbc.prototype.start = function (options) {
    // Note: legacy support for using IV residue (has security flaws)
    // if IV is null, reuse block from previous processing
    if (is.null(options.iv)) {
    // must have a previous block
        if (!this._prev) {
            throw new Error("Invalid IV parameter.");
        }
        this._iv = this._prev.slice(0);
    } else if (!("iv" in options)) {
        throw new Error("Invalid IV parameter.");
    } else {
    // save IV as "previous" block
        this._iv = transformIV(options.iv);
        this._prev = this._iv.slice(0);
    }
};

cbc.prototype.encrypt = function (input, output, finish) {
    // not enough input to encrypt
    if (input.length() < this.blockSize && !(finish && input.length() > 0)) {
        return true;
    }

    // get next block
    // CBC XOR's IV (or previous block) with plaintext
    for (var i = 0; i < this._ints; ++i) {
        this._inBlock[i] = this._prev[i] ^ input.getInt32();
    }

    // encrypt block
    this.cipher.encrypt(this._inBlock, this._outBlock);

    // write output, save previous block
    for (var i = 0; i < this._ints; ++i) {
        output.putInt32(this._outBlock[i]);
    }
    this._prev = this._outBlock;
};

cbc.prototype.decrypt = function (input, output, finish) {
    // not enough input to decrypt
    if (input.length() < this.blockSize && !(finish && input.length() > 0)) {
        return true;
    }

    // get next block
    for (var i = 0; i < this._ints; ++i) {
        this._inBlock[i] = input.getInt32();
    }

    // decrypt block
    this.cipher.decrypt(this._inBlock, this._outBlock);

    // write output, save previous ciphered block
    // CBC XOR's IV (or previous block) with ciphertext
    for (var i = 0; i < this._ints; ++i) {
        output.putInt32(this._prev[i] ^ this._outBlock[i]);
    }
    this._prev = this._inBlock.slice(0);
};

cbc.prototype.pad = function (input, options) {
    // add PKCS#7 padding to block (each pad byte is the
    // value of the number of pad bytes)
    const padding = (input.length() === this.blockSize ?
        this.blockSize : (this.blockSize - input.length()));
    input.fillWithByte(padding, padding);
    return true;
};

cbc.prototype.unpad = function (output, options) {
    // check for error: input data not a multiple of blockSize
    if (options.overflow > 0) {
        return false;
    }

    // ensure padding byte count is valid
    const len = output.length();
    const count = output.at(len - 1);
    if (count > (this.blockSize << 2)) {
        return false;
    }

    // trim off padding bytes
    output.truncate(count);
    return true;
};

/**
 *  Cipher feedback (CFB) *
 */

export const cfb = function (options) {
    options = options || {};
    this.name = "CFB";
    this.cipher = options.cipher;
    this.blockSize = options.blockSize || 16;
    this._ints = this.blockSize / 4;
    this._inBlock = null;
    this._outBlock = new Array(this._ints);
    this._partialBlock = new Array(this._ints);
    this._partialOutput = crypto.util.createBuffer();
    this._partialBytes = 0;
};

cfb.prototype.start = function (options) {
    if (!("iv" in options)) {
        throw new Error("Invalid IV parameter.");
    }
    // use IV as first input
    this._iv = transformIV(options.iv);
    this._inBlock = this._iv.slice(0);
    this._partialBytes = 0;
};

cfb.prototype.encrypt = function (input, output, finish) {
    // not enough input to encrypt
    const inputLength = input.length();
    if (inputLength === 0) {
        return true;
    }

    // encrypt block
    this.cipher.encrypt(this._inBlock, this._outBlock);

    // handle full block
    if (this._partialBytes === 0 && inputLength >= this.blockSize) {
    // XOR input with output, write input as output
        for (var i = 0; i < this._ints; ++i) {
            this._inBlock[i] = input.getInt32() ^ this._outBlock[i];
            output.putInt32(this._inBlock[i]);
        }
        return;
    }

    // handle partial block
    let partialBytes = (this.blockSize - inputLength) % this.blockSize;
    if (partialBytes > 0) {
        partialBytes = this.blockSize - partialBytes;
    }

    // XOR input with output, write input as partial output
    this._partialOutput.clear();
    for (var i = 0; i < this._ints; ++i) {
        this._partialBlock[i] = input.getInt32() ^ this._outBlock[i];
        this._partialOutput.putInt32(this._partialBlock[i]);
    }

    if (partialBytes > 0) {
    // block still incomplete, restore input buffer
        input.read -= this.blockSize;
    } else {
    // block complete, update input block
        for (var i = 0; i < this._ints; ++i) {
            this._inBlock[i] = this._partialBlock[i];
        }
    }

    // skip any previous partial bytes
    if (this._partialBytes > 0) {
        this._partialOutput.getBytes(this._partialBytes);
    }

    if (partialBytes > 0 && !finish) {
        output.putBytes(this._partialOutput.getBytes(
            partialBytes - this._partialBytes));
        this._partialBytes = partialBytes;
        return true;
    }

    output.putBytes(this._partialOutput.getBytes(
        inputLength - this._partialBytes));
    this._partialBytes = 0;
};

cfb.prototype.decrypt = function (input, output, finish) {
    // not enough input to decrypt
    const inputLength = input.length();
    if (inputLength === 0) {
        return true;
    }

    // encrypt block (CFB always uses encryption mode)
    this.cipher.encrypt(this._inBlock, this._outBlock);

    // handle full block
    if (this._partialBytes === 0 && inputLength >= this.blockSize) {
    // XOR input with output, write input as output
        for (var i = 0; i < this._ints; ++i) {
            this._inBlock[i] = input.getInt32();
            output.putInt32(this._inBlock[i] ^ this._outBlock[i]);
        }
        return;
    }

    // handle partial block
    let partialBytes = (this.blockSize - inputLength) % this.blockSize;
    if (partialBytes > 0) {
        partialBytes = this.blockSize - partialBytes;
    }

    // XOR input with output, write input as partial output
    this._partialOutput.clear();
    for (var i = 0; i < this._ints; ++i) {
        this._partialBlock[i] = input.getInt32();
        this._partialOutput.putInt32(this._partialBlock[i] ^ this._outBlock[i]);
    }

    if (partialBytes > 0) {
    // block still incomplete, restore input buffer
        input.read -= this.blockSize;
    } else {
    // block complete, update input block
        for (var i = 0; i < this._ints; ++i) {
            this._inBlock[i] = this._partialBlock[i];
        }
    }

    // skip any previous partial bytes
    if (this._partialBytes > 0) {
        this._partialOutput.getBytes(this._partialBytes);
    }

    if (partialBytes > 0 && !finish) {
        output.putBytes(this._partialOutput.getBytes(
            partialBytes - this._partialBytes));
        this._partialBytes = partialBytes;
        return true;
    }

    output.putBytes(this._partialOutput.getBytes(
        inputLength - this._partialBytes));
    this._partialBytes = 0;
};

/**
 *  Output feedback (OFB) *
 */

export const ofb = function (options) {
    options = options || {};
    this.name = "OFB";
    this.cipher = options.cipher;
    this.blockSize = options.blockSize || 16;
    this._ints = this.blockSize / 4;
    this._inBlock = null;
    this._outBlock = new Array(this._ints);
    this._partialOutput = crypto.util.createBuffer();
    this._partialBytes = 0;
};

ofb.prototype.start = function (options) {
    if (!("iv" in options)) {
        throw new Error("Invalid IV parameter.");
    }
    // use IV as first input
    this._iv = transformIV(options.iv);
    this._inBlock = this._iv.slice(0);
    this._partialBytes = 0;
};

ofb.prototype.encrypt = function (input, output, finish) {
    // not enough input to encrypt
    const inputLength = input.length();
    if (input.length() === 0) {
        return true;
    }

    // encrypt block (OFB always uses encryption mode)
    this.cipher.encrypt(this._inBlock, this._outBlock);

    // handle full block
    if (this._partialBytes === 0 && inputLength >= this.blockSize) {
    // XOR input with output and update next input
        for (var i = 0; i < this._ints; ++i) {
            output.putInt32(input.getInt32() ^ this._outBlock[i]);
            this._inBlock[i] = this._outBlock[i];
        }
        return;
    }

    // handle partial block
    let partialBytes = (this.blockSize - inputLength) % this.blockSize;
    if (partialBytes > 0) {
        partialBytes = this.blockSize - partialBytes;
    }

    // XOR input with output
    this._partialOutput.clear();
    for (var i = 0; i < this._ints; ++i) {
        this._partialOutput.putInt32(input.getInt32() ^ this._outBlock[i]);
    }

    if (partialBytes > 0) {
    // block still incomplete, restore input buffer
        input.read -= this.blockSize;
    } else {
    // block complete, update input block
        for (var i = 0; i < this._ints; ++i) {
            this._inBlock[i] = this._outBlock[i];
        }
    }

    // skip any previous partial bytes
    if (this._partialBytes > 0) {
        this._partialOutput.getBytes(this._partialBytes);
    }

    if (partialBytes > 0 && !finish) {
        output.putBytes(this._partialOutput.getBytes(
            partialBytes - this._partialBytes));
        this._partialBytes = partialBytes;
        return true;
    }

    output.putBytes(this._partialOutput.getBytes(
        inputLength - this._partialBytes));
    this._partialBytes = 0;
};

ofb.prototype.decrypt = ofb.prototype.encrypt;

/**
 *  Counter (CTR) *
 */

export const ctr = function (options) {
    options = options || {};
    this.name = "CTR";
    this.cipher = options.cipher;
    this.blockSize = options.blockSize || 16;
    this._ints = this.blockSize / 4;
    this._inBlock = null;
    this._outBlock = new Array(this._ints);
    this._partialOutput = crypto.util.createBuffer();
    this._partialBytes = 0;
};

ctr.prototype.start = function (options) {
    if (!("iv" in options)) {
        throw new Error("Invalid IV parameter.");
    }
    // use IV as first input
    this._iv = transformIV(options.iv);
    this._inBlock = this._iv.slice(0);
    this._partialBytes = 0;
};

ctr.prototype.encrypt = function (input, output, finish) {
    // not enough input to encrypt
    const inputLength = input.length();
    if (inputLength === 0) {
        return true;
    }

    // encrypt block (CTR always uses encryption mode)
    this.cipher.encrypt(this._inBlock, this._outBlock);

    // handle full block
    if (this._partialBytes === 0 && inputLength >= this.blockSize) {
    // XOR input with output
        for (var i = 0; i < this._ints; ++i) {
            output.putInt32(input.getInt32() ^ this._outBlock[i]);
        }
    } else {
    // handle partial block
        let partialBytes = (this.blockSize - inputLength) % this.blockSize;
        if (partialBytes > 0) {
            partialBytes = this.blockSize - partialBytes;
        }

        // XOR input with output
        this._partialOutput.clear();
        for (var i = 0; i < this._ints; ++i) {
            this._partialOutput.putInt32(input.getInt32() ^ this._outBlock[i]);
        }

        if (partialBytes > 0) {
            // block still incomplete, restore input buffer
            input.read -= this.blockSize;
        }

        // skip any previous partial bytes
        if (this._partialBytes > 0) {
            this._partialOutput.getBytes(this._partialBytes);
        }

        if (partialBytes > 0 && !finish) {
            output.putBytes(this._partialOutput.getBytes(
                partialBytes - this._partialBytes));
            this._partialBytes = partialBytes;
            return true;
        }

        output.putBytes(this._partialOutput.getBytes(
            inputLength - this._partialBytes));
        this._partialBytes = 0;
    }

    // block complete, increment counter (input block)
    inc32(this._inBlock);
};

ctr.prototype.decrypt = ctr.prototype.encrypt;

/**
 *  Galois/Counter Mode (GCM) *
 */

export const gcm = function (options) {
    options = options || {};
    this.name = "GCM";
    this.cipher = options.cipher;
    this.blockSize = options.blockSize || 16;
    this._ints = this.blockSize / 4;
    this._inBlock = new Array(this._ints);
    this._outBlock = new Array(this._ints);
    this._partialOutput = crypto.util.createBuffer();
    this._partialBytes = 0;

    // R is actually this value concatenated with 120 more zero bits, but
    // we only XOR against R so the other zeros have no effect -- we just
    // apply this value to the first integer in a block
    this._R = 0xE1000000;
};

gcm.prototype.start = function (options) {
    if (!("iv" in options)) {
        throw new Error("Invalid IV parameter.");
    }
    // ensure IV is a byte buffer
    const iv = crypto.util.createBuffer(options.iv);

    // no ciphered data processed yet
    this._cipherLength = 0;

    // default additional data is none
    let additionalData;
    if ("additionalData" in options) {
        additionalData = crypto.util.createBuffer(options.additionalData);
    } else {
        additionalData = crypto.util.createBuffer();
    }

    // default tag length is 128 bits
    if ("tagLength" in options) {
        this._tagLength = options.tagLength;
    } else {
        this._tagLength = 128;
    }

    // if tag is given, ensure tag matches tag length
    this._tag = null;
    if (options.decrypt) {
    // save tag to check later
        this._tag = crypto.util.createBuffer(options.tag).getBytes();
        if (this._tag.length !== (this._tagLength / 8)) {
            throw new Error("Authentication tag does not match tag length.");
        }
    }

    // create tmp storage for hash calculation
    this._hashBlock = new Array(this._ints);

    // no tag generated yet
    this.tag = null;

    // generate hash subkey
    // (apply block cipher to "zero" block)
    this._hashSubkey = new Array(this._ints);
    this.cipher.encrypt([0, 0, 0, 0], this._hashSubkey);

    // generate table M
    // use 4-bit tables (32 component decomposition of a 16 byte value)
    // 8-bit tables take more space and are known to have security
    // vulnerabilities (in native implementations)
    this.componentBits = 4;
    this._m = this.generateHashTable(this._hashSubkey, this.componentBits);

    // Note: support IV length different from 96 bits? (only supporting
    // 96 bits is recommended by NIST SP-800-38D)
    // generate J_0
    const ivLength = iv.length();
    if (ivLength === 12) {
    // 96-bit IV
        this._j0 = [iv.getInt32(), iv.getInt32(), iv.getInt32(), 1];
    } else {
    // IV is NOT 96-bits
        this._j0 = [0, 0, 0, 0];
        while (iv.length() > 0) {
            this._j0 = this.ghash(
                this._hashSubkey, this._j0,
                [iv.getInt32(), iv.getInt32(), iv.getInt32(), iv.getInt32()]);
        }
        this._j0 = this.ghash(
            this._hashSubkey, this._j0, [0, 0].concat(from64To32(ivLength * 8)));
    }

    // generate ICB (initial counter block)
    this._inBlock = this._j0.slice(0);
    inc32(this._inBlock);
    this._partialBytes = 0;

    // consume authentication data
    additionalData = crypto.util.createBuffer(additionalData);
    // save additional data length as a BE 64-bit number
    this._aDataLength = from64To32(additionalData.length() * 8);
    // pad additional data to 128 bit (16 byte) block size
    const overflow = additionalData.length() % this.blockSize;
    if (overflow) {
        additionalData.fillWithByte(0, this.blockSize - overflow);
    }
    this._s = [0, 0, 0, 0];
    while (additionalData.length() > 0) {
        this._s = this.ghash(this._hashSubkey, this._s, [
            additionalData.getInt32(),
            additionalData.getInt32(),
            additionalData.getInt32(),
            additionalData.getInt32()
        ]);
    }
};

gcm.prototype.encrypt = function (input, output, finish) {
    // not enough input to encrypt
    const inputLength = input.length();
    if (inputLength === 0) {
        return true;
    }

    // encrypt block
    this.cipher.encrypt(this._inBlock, this._outBlock);

    // handle full block
    if (this._partialBytes === 0 && inputLength >= this.blockSize) {
    // XOR input with output
        for (let i = 0; i < this._ints; ++i) {
            output.putInt32(this._outBlock[i] ^= input.getInt32());
        }
        this._cipherLength += this.blockSize;
    } else {
    // handle partial block
        let partialBytes = (this.blockSize - inputLength) % this.blockSize;
        if (partialBytes > 0) {
            partialBytes = this.blockSize - partialBytes;
        }

        // XOR input with output
        this._partialOutput.clear();
        for (let i = 0; i < this._ints; ++i) {
            this._partialOutput.putInt32(input.getInt32() ^ this._outBlock[i]);
        }

        if (partialBytes <= 0 || finish) {
            // handle overflow prior to hashing
            if (finish) {
                // get block overflow
                const overflow = inputLength % this.blockSize;
                this._cipherLength += overflow;
                // truncate for hash function
                this._partialOutput.truncate(this.blockSize - overflow);
            } else {
                this._cipherLength += this.blockSize;
            }

            // get output block for hashing
            for (let i = 0; i < this._ints; ++i) {
                this._outBlock[i] = this._partialOutput.getInt32();
            }
            this._partialOutput.read -= this.blockSize;
        }

        // skip any previous partial bytes
        if (this._partialBytes > 0) {
            this._partialOutput.getBytes(this._partialBytes);
        }

        if (partialBytes > 0 && !finish) {
            // block still incomplete, restore input buffer, get partial output,
            // and return early
            input.read -= this.blockSize;
            output.putBytes(this._partialOutput.getBytes(
                partialBytes - this._partialBytes));
            this._partialBytes = partialBytes;
            return true;
        }

        output.putBytes(this._partialOutput.getBytes(
            inputLength - this._partialBytes));
        this._partialBytes = 0;
    }

    // update hash block S
    this._s = this.ghash(this._hashSubkey, this._s, this._outBlock);

    // increment counter (input block)
    inc32(this._inBlock);
};

gcm.prototype.decrypt = function (input, output, finish) {
    // not enough input to decrypt
    const inputLength = input.length();
    if (inputLength < this.blockSize && !(finish && inputLength > 0)) {
        return true;
    }

    // encrypt block (GCM always uses encryption mode)
    this.cipher.encrypt(this._inBlock, this._outBlock);

    // increment counter (input block)
    inc32(this._inBlock);

    // update hash block S
    this._hashBlock[0] = input.getInt32();
    this._hashBlock[1] = input.getInt32();
    this._hashBlock[2] = input.getInt32();
    this._hashBlock[3] = input.getInt32();
    this._s = this.ghash(this._hashSubkey, this._s, this._hashBlock);

    // XOR hash input with output
    for (let i = 0; i < this._ints; ++i) {
        output.putInt32(this._outBlock[i] ^ this._hashBlock[i]);
    }

    // increment cipher data length
    if (inputLength < this.blockSize) {
        this._cipherLength += inputLength % this.blockSize;
    } else {
        this._cipherLength += this.blockSize;
    }
};

gcm.prototype.afterFinish = function (output, options) {
    let rval = true;

    // handle overflow
    if (options.decrypt && options.overflow) {
        output.truncate(this.blockSize - options.overflow);
    }

    // handle authentication tag
    this.tag = crypto.util.createBuffer();

    // concatenate additional data length with cipher length
    const lengths = this._aDataLength.concat(from64To32(this._cipherLength * 8));

    // include lengths in hash
    this._s = this.ghash(this._hashSubkey, this._s, lengths);

    // do GCTR(J_0, S)
    const tag = [];
    this.cipher.encrypt(this._j0, tag);
    for (let i = 0; i < this._ints; ++i) {
        this.tag.putInt32(this._s[i] ^ tag[i]);
    }

    // trim tag to length
    this.tag.truncate(this.tag.length() % (this._tagLength / 8));

    // check authentication tag
    if (options.decrypt && this.tag.bytes() !== this._tag) {
        rval = false;
    }

    return rval;
};

/**
 * See NIST SP-800-38D 6.3 (Algorithm 1). This function performs Galois
 * field multiplication. The field, GF(2^128), is defined by the polynomial:
 *
 * x^128 + x^7 + x^2 + x + 1
 *
 * Which is represented in little-endian binary form as: 11100001 (0xe1). When
 * the value of a coefficient is 1, a bit is set. The value R, is the
 * concatenation of this value and 120 zero bits, yielding a 128-bit value
 * which matches the block size.
 *
 * This function will multiply two elements (vectors of bytes), X and Y, in
 * the field GF(2^128). The result is initialized to zero. For each bit of
 * X (out of 128), x_i, if x_i is set, then the result is multiplied (XOR'd)
 * by the current value of Y. For each bit, the value of Y will be raised by
 * a power of x (multiplied by the polynomial x). This can be achieved by
 * shifting Y once to the right. If the current value of Y, prior to being
 * multiplied by x, has 0 as its LSB, then it is a 127th degree polynomial.
 * Otherwise, we must divide by R after shifting to find the remainder.
 *
 * @param x the first block to multiply by the second.
 * @param y the second block to multiply by the first.
 *
 * @return the block result of the multiplication.
 */
gcm.prototype.multiply = function (x, y) {
    const z_i = [0, 0, 0, 0];
    const v_i = y.slice(0);

    // calculate Z_128 (block has 128 bits)
    for (let i = 0; i < 128; ++i) {
    // if x_i is 0, Z_{i+1} = Z_i (unchanged)
    // else Z_{i+1} = Z_i ^ V_i
    // get x_i by finding 32-bit int position, then left shift 1 by remainder
        const x_i = x[(i / 32) | 0] & (1 << (31 - i % 32));
        if (x_i) {
            z_i[0] ^= v_i[0];
            z_i[1] ^= v_i[1];
            z_i[2] ^= v_i[2];
            z_i[3] ^= v_i[3];
        }

        // if LSB(V_i) is 1, V_i = V_i >> 1
        // else V_i = (V_i >> 1) ^ R
        this.pow(v_i, v_i);
    }

    return z_i;
};

gcm.prototype.pow = function (x, out) {
    // if LSB(x) is 1, x = x >>> 1
    // else x = (x >>> 1) ^ R
    const lsb = x[3] & 1;

    // always do x >>> 1:
    // starting with the rightmost integer, shift each integer to the right
    // one bit, pulling in the bit from the integer to the left as its top
    // most bit (do this for the last 3 integers)
    for (let i = 3; i > 0; --i) {
        out[i] = (x[i] >>> 1) | ((x[i - 1] & 1) << 31);
    }
    // shift the first integer normally
    out[0] = x[0] >>> 1;

    // if lsb was not set, then polynomial had a degree of 127 and doesn't
    // need to divided; otherwise, XOR with R to find the remainder; we only
    // need to XOR the first integer since R technically ends w/120 zero bits
    if (lsb) {
        out[0] ^= this._R;
    }
};

gcm.prototype.tableMultiply = function (x) {
    // assumes 4-bit tables are used
    const z = [0, 0, 0, 0];
    for (let i = 0; i < 32; ++i) {
        const idx = (i / 8) | 0;
        const x_i = (x[idx] >>> ((7 - (i % 8)) * 4)) & 0xF;
        const ah = this._m[i][x_i];
        z[0] ^= ah[0];
        z[1] ^= ah[1];
        z[2] ^= ah[2];
        z[3] ^= ah[3];
    }
    return z;
};

/**
 * A continuing version of the GHASH algorithm that operates on a single
 * block. The hash block, last hash value (Ym) and the new block to hash
 * are given.
 *
 * @param h the hash block.
 * @param y the previous value for Ym, use [0, 0, 0, 0] for a new hash.
 * @param x the block to hash.
 *
 * @return the hashed value (Ym).
 */
gcm.prototype.ghash = function (h, y, x) {
    y[0] ^= x[0];
    y[1] ^= x[1];
    y[2] ^= x[2];
    y[3] ^= x[3];
    return this.tableMultiply(y);
    //return this.multiply(y, h);
};

/**
 * Precomputes a table for multiplying against the hash subkey. This
 * mechanism provides a substantial speed increase over multiplication
 * performed without a table. The table-based multiplication this table is
 * for solves X * H by multiplying each component of X by H and then
 * composing the results together using XOR.
 *
 * This function can be used to generate tables with different bit sizes
 * for the components, however, this implementation assumes there are
 * 32 components of X (which is a 16 byte vector), therefore each component
 * takes 4-bits (so the table is constructed with bits=4).
 *
 * @param h the hash subkey.
 * @param bits the bit size for a component.
 */
gcm.prototype.generateHashTable = function (h, bits) {
    // TODO: There are further optimizations that would use only the
    // first table M_0 (or some variant) along with a remainder table;
    // this can be explored in the future
    const multiplier = 8 / bits;
    const perInt = 4 * multiplier;
    const size = 16 * multiplier;
    const m = new Array(size);
    for (let i = 0; i < size; ++i) {
        const tmp = [0, 0, 0, 0];
        const idx = (i / perInt) | 0;
        const shft = ((perInt - 1 - (i % perInt)) * bits);
        tmp[idx] = (1 << (bits - 1)) << shft;
        m[i] = this.generateSubHashTable(this.multiply(tmp, h), bits);
    }
    return m;
};

/**
 * Generates a table for multiplying against the hash subkey for one
 * particular component (out of all possible component values).
 *
 * @param mid the pre-multiplied value for the middle key of the table.
 * @param bits the bit size for a component.
 */
gcm.prototype.generateSubHashTable = function (mid, bits) {
    // compute the table quickly by minimizing the number of
    // POW operations -- they only need to be performed for powers of 2,
    // all other entries can be composed from those powers using XOR
    const size = 1 << bits;
    const half = size >>> 1;
    const m = new Array(size);
    m[half] = mid.slice(0);
    let i = half >>> 1;
    while (i > 0) {
    // raise m0[2 * i] and store in m0[i]
        this.pow(m[2 * i], m[i] = []);
        i >>= 1;
    }
    i = 2;
    while (i < half) {
        for (let j = 1; j < i; ++j) {
            const m_i = m[i];
            const m_j = m[j];
            m[i + j] = [
                m_i[0] ^ m_j[0],
                m_i[1] ^ m_j[1],
                m_i[2] ^ m_j[2],
                m_i[3] ^ m_j[3]
            ];
        }
        i *= 2;
    }
    m[0] = [0, 0, 0, 0];
    /* Note: We could avoid storing these by doing composition during multiply
  calculate top half using composition by speed is preferred. */
    for (i = half + 1; i < size; ++i) {
        const c = m[i ^ half];
        m[i] = [mid[0] ^ c[0], mid[1] ^ c[1], mid[2] ^ c[2], mid[3] ^ c[3]];
    }
    return m;
};

/**
 *  Utility functions
 */

function transformIV(iv) {
    if (is.string(iv)) {
    // convert iv string into byte buffer
        iv = crypto.util.createBuffer(iv);
    }

    if (crypto.util.isArray(iv) && iv.length > 4) {
    // convert iv byte array into byte buffer
        const tmp = iv;
        iv = crypto.util.createBuffer();
        for (let i = 0; i < tmp.length; ++i) {
            iv.putByte(tmp[i]);
        }
    }
    if (!crypto.util.isArray(iv)) {
    // convert iv byte buffer into 32-bit integer array
        iv = [iv.getInt32(), iv.getInt32(), iv.getInt32(), iv.getInt32()];
    }

    return iv;
}

function inc32(block) {
    // increment last 32 bits of block only
    block[block.length - 1] = (block[block.length - 1] + 1) & 0xFFFFFFFF;
}

function from64To32(num) {
    // convert 64-bit number to two BE Int32s
    return [(num / 0x100000000) | 0, num & 0xFFFFFFFF];
}
