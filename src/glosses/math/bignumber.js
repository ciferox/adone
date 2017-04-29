const { is } = adone;
const { BigNumber, setJSConditioner } = adone.bind("bignumber.node");

export default BigNumber;

BigNumber.conditionArgs = function (num, base) {
    if (!is.string(num)) {
        num = num.toString(base || 10);

    }

    if (num.match(/e\+/)) { // positive exponent
        if (!Number(num).toString().match(/e+/)) {
            return { num: Math.floor(Number(num)).toString(), base: 10 };
        }
        const pow = Math.ceil(Math.log(num) / Math.log(2));
        let n = (num / Math.pow(2, pow)).toString(2).replace(/^0/, "");
        let i = n.length - n.indexOf(".");
        n = n.replace(/\./, "");

        for (; i <= pow; i++) {
            n += "0";
        }
        return { num: n, base: 2 };

    } else if (num.match(/e\-/)) { // negative exponent
        return { num: Math.floor(Number(num)).toString(), base: base || 10 };
    }
    return { num, base: base || 10 };
};

setJSConditioner(BigNumber.conditionArgs);

BigNumber.prototype.inspect = function () {
    return `<BigNumber ${this.toString(10)}>`;
};

BigNumber.prototype.toString = function (base) {
    let value;
    if (base) {
        value = this.tostring(base);
    } else {
        value = this.tostring();
    }
    if (base > 10 && is.string(value)) {
        value = value.toLowerCase();
    }
    return value;
};

BigNumber.prototype.toNumber = function () {
    return parseInt(this.toString(), 10);
};

for (const op of ["add", "sub", "mul", "div", "mod"]) {
    const b = `b${op}`;
    const u = `u${op}`;
    BigNumber.prototype[op] = function (num) {
        let x;
        if (is.bigNumber(num)) {
            return this[b](num);
        } else if (is.number(num)) {
            if (num >= 0) {
                return this[u](num);
            } else if (op === "add") {
                return this.usub(-num);
            } else if (op === "sub") {
                return this.uadd(-num);
            }
            x = new BigNumber(num);
            return this[b](x);

        } else if (is.string(num)) {
            x = new BigNumber(num);
            return this[b](x);
        }
        throw new adone.x.Exception(`Unspecified operation for type ${typeof num} for ${op}`);
    };
}

BigNumber.prototype.abs = function () {
    return this.babs();
};

BigNumber.prototype.neg = function () {
    return this.bneg();
};

BigNumber.prototype.powm = function (num, mod) {
    let m;

    if (is.number(mod) || is.string(mod)) {
        m = new BigNumber(mod);
    } else if (is.bigNumber(mod)) {
        m = mod;
    }

    if (is.number(num)) {
        return this.upowm(num, m);
    } else if (is.string(num)) {
        const n = new BigNumber(num);
        return this.bpowm(n, m);
    } else if (is.bigNumber(num)) {
        return this.bpowm(num, m);
    }
};

BigNumber.prototype.mod = function (num, mod) {
    let m;

    if (is.number(mod) || is.string(mod)) {
        m = new BigNumber(mod);
    } else if (is.bigNumber(mod)) {
        m = mod;
    }

    if (is.number(num)) {
        return this.umod(num, m);
    } else if (is.string(num)) {
        const n = new BigNumber(num);
        return this.bmod(n, m);
    } else if (is.bigNumber(num)) {
        return this.bmod(num, m);
    }
};

BigNumber.prototype.pow = function (num) {
    if (is.number(num)) {
        if (num >= 0) {
            return this.upow(num);
        }
        return BigNumber.prototype.powm.call(this, num, this);

    }
    const x = parseInt(num.toString(), 10);
    return BigNumber.prototype.pow.call(this, x);

};

BigNumber.prototype.shiftLeft = function (num) {
    if (is.number(num)) {
        if (num >= 0) {
            return this.umul2exp(num);
        }
        return this.shiftRight(-num);

    }
    const x = parseInt(num.toString(), 10);
    return BigNumber.prototype.shiftLeft.call(this, x);

};

BigNumber.prototype.shiftRight = function (num) {
    if (is.number(num)) {
        if (num >= 0) {
            return this.udiv2exp(num);
        }
        return this.shiftLeft(-num);

    }
    const x = parseInt(num.toString(), 10);
    return BigNumber.prototype.shiftRight.call(this, x);

};

BigNumber.prototype.cmp = function (num) {
    if (is.bigNumber(num)) {
        return this.bcompare(num);
    } else if (is.number(num)) {
        if (num < 0) {
            return this.scompare(num);
        }
        return this.ucompare(num);
    }
    const x = new BigNumber(num);
    return this.bcompare(x);

};

BigNumber.prototype.gt = function (num) {
    return this.cmp(num) > 0;
};

BigNumber.prototype.ge = function (num) {
    return this.cmp(num) >= 0;
};

BigNumber.prototype.eq = function (num) {
    return this.cmp(num) === 0;
};

BigNumber.prototype.ne = function (num) {
    return this.cmp(num) !== 0;
};

BigNumber.prototype.lt = function (num) {
    return this.cmp(num) < 0;
};

BigNumber.prototype.le = function (num) {
    return this.cmp(num) <= 0;
};

for (const name of ["and", "or", "xor"]) {
    const b = `b${name}`;
    BigNumber.prototype[name] = function (num) {
        if (is.bigNumber(num)) {
            return this[b](num);
        }
        const x = new BigNumber(num);
        return this[b](x);

    };
}

BigNumber.prototype.sqrt = function () {
    return this.bsqrt();
};

BigNumber.prototype.root = function (num) {
    if (is.bigNumber(num)) {
        return this.broot(num);
    }
    return this.broot(num);

};

BigNumber.prototype.rand = function (to) {
    if (to === undefined) {
        if (this.toString() === "1") {
            return new BigNumber(0);
        }
        return this.brand0();

    }
    const x = is.bigNumber(to) ? to.sub(this) : new BigNumber(to).sub(this);
    return x.brand0().add(this);

};

BigNumber.prototype.invertm = function (mod) {
    if (is.bigNumber(mod)) {
        return this.binvertm(mod);
    }
    const x = new BigNumber(mod);
    return this.binvertm(x);

};

BigNumber.prime = function (bits, safe = true) {
    // Force uint32
    bits >>>= 0;

    return BigNumber.uprime0(bits, Boolean(safe));
};

BigNumber.prototype.probPrime = function (reps) {
    const n = this.probprime(reps || 10);
    return Boolean(n);
};

BigNumber.prototype.nextPrime = function () {
    let num = this;
    do {
        num = num.add(1);
    } while (!num.probPrime());
    return num;
};

BigNumber.prototype.isBitSet = function (n) {
    return this.isbitset(n) === 1;
};

BigNumber.fromBuffer = function (buf, opts = {}) {
    const endian = { 1: "big", "-1": "little" }[opts.endian] || opts.endian || "big";

    const size = opts.size === "auto" ? Math.ceil(buf.length) : (opts.size || 1);

    if (buf.length % size !== 0) {
        throw new adone.x.Exception(`Buffer length (${buf.length}) must be a multiple of size (${size})`);
    }

    const hex = [];
    for (let i = 0; i < buf.length; i += size) {
        const chunk = [];
        for (let j = 0; j < size; j++) {
            chunk.push(buf[i + (endian === "big" ? j : (size - j - 1))]);
        }

        hex.push(chunk.map((c) => (c < 16 ? "0" : "") + c.toString(16)).join(""));
    }

    return new BigNumber(hex.join(""), 16);
};

BigNumber.prototype.toBuffer = function (opts = {}) {
    if (is.string(opts)) {
        if (opts !== "mpint") {
            return "Unsupported Buffer representation";
        }
        const abs = this.abs();
        const buf = abs.toBuffer({ size: 1, endian: "big" });
        let len = buf.length === 1 && buf[0] === 0 ? 0 : buf.length;
        if (buf[0] & 0x80) {
            len++;
        }

        const ret = new Buffer(4 + len);
        if (len > 0) {
            buf.copy(ret, 4 + (buf[0] & 0x80 ? 1 : 0));
        }
        if (buf[0] & 0x80) {
            ret[4] = 0;
        }

        ret[0] = len & (0xff << 24);
        ret[1] = len & (0xff << 16);
        ret[2] = len & (0xff << 8);
        ret[3] = len & (0xff << 0);

        // two's compliment for negative integers:
        const isNeg = this.lt(0);
        if (isNeg) {
            for (let i = 4; i < ret.length; i++) {
                ret[i] = 0xff - ret[i];
            }
        }
        ret[4] = (ret[4] & 0x7f) | (isNeg ? 0x80 : 0);
        if (isNeg) {
            ret[ret.length - 1]++;
        }

        return ret;
    }

    const endian = { 1: "big", "-1": "little" }[opts.endian] || opts.endian || "big";

    let hex = this.toString(16);
    if (hex.charAt(0) === "-") {
        throw new adone.x.Exception("converting negative numbers to Buffers not supported yet");
    }

    const size = opts.size === "auto" ? Math.ceil(hex.length / 2) : (opts.size || 1);

    const len = Math.ceil(hex.length / (2 * size)) * size;
    const buf = new Buffer(len);

    // zero-pad the hex string so the chunks are all `size` long
    while (hex.length < 2 * len) {
        hex = `0${hex}`;  // omg
    }

    const hx = hex.split(new RegExp(`(.{${2 * size}})`)).filter((s) => s.length > 0);

    hx.forEach((chunk, i) => {  // todo
        for (let j = 0; j < size; j++) {
            const ix = i * size + (endian === "big" ? j : size - j - 1);
            buf[ix] = parseInt(chunk.slice(j * 2, j * 2 + 2), 16);
        }
    });

    return buf;
};

Object.keys(BigNumber.prototype).forEach((name) => {
    if (name === "inspect" || name === "toString") {
        return;
    }

    BigNumber[name] = (num, ...args) => {
        if (is.bigNumber(num)) {
            return num[name].apply(num, args);
        }
        const bigi = new BigNumber(num);
        return bigi[name].apply(bigi, args);

    };
});

adone.tag.set(BigNumber, adone.tag.BIGNUMBER);
