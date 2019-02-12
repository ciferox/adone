const { is, error } = adone;

const ZEROS = "0".repeat(19);
const SEVENS = "7".repeat(19);
const ZERO_OFFSET = "0".charCodeAt(0);
const USTAR = "ustar\x0000";
const MASK = 0o7777;

const clamp = (index, len, defaultValue) => {
    if (!is.number(index)) {
        return defaultValue;
    }
    index = ~~index; // Coerce to integer.
    if (index >= len) {
        return len;
    }
    if (index >= 0) {
        return index;
    }
    index += len;
    if (index >= 0) {
        return index;
    }
    return 0;
};

const toType = (flag) => {
    switch (flag) {
        case 0:
            return "file";
        case 1:
            return "link";
        case 2:
            return "symlink";
        case 3:
            return "character-device";
        case 4:
            return "block-device";
        case 5:
            return "directory";
        case 6:
            return "fifo";
        case 7:
            return "contiguous-file";
        case 72:
            return "pax-header";
        case 55:
            return "pax-global-header";
        case 27:
            return "gnu-long-link-path";
        case 28:
        case 30:
            return "gnu-long-path";
    }

    return null;
};

const toTypeflag = (flag) => {
    switch (flag) {
        case "file":
            return 0;
        case "link":
            return 1;
        case "symlink":
            return 2;
        case "character-device":
            return 3;
        case "block-device":
            return 4;
        case "directory":
            return 5;
        case "fifo":
            return 6;
        case "contiguous-file":
            return 7;
        case "pax-header":
            return 72;
    }

    return 0;
};


const indexOf = (block, num, offset, end) => {
    for (; offset < end; offset++) {
        if (block[offset] === num) {
            return offset;
        }
    }
    return end;
};

const cksum = (block) => {
    let sum = 8 * 32;
    for (let i = 0; i < 148; i++) {
        sum += block[i];
    }
    for (let j = 156; j < 512; j++) {
        sum += block[j];
    }
    return sum;
};

const encodeOct = (val, n) => {
    val = val.toString(8);
    if (val.length > n) {
        return `${SEVENS.slice(0, n)} `;
    }
    return `${ZEROS.slice(0, n - val.length)}${val} `;
};

const parse256 = (buf) => {
    // first byte MUST be either 80 or FF
    // 80 for positive, FF for 2's comp
    let positive;
    if (buf[0] === 0x80) {
        positive = true;
    } else if (buf[0] === 0xFF) {
        positive = false;
    } else {
        return null;
    }

    // build up a base-256 tuple from the least sig to the highest
    let zero = false;
    const tuple = [];
    for (let i = buf.length - 1; i > 0; i--) {
        const byte = buf[i];
        if (positive) {
            tuple.push(byte);
        } else if (zero && byte === 0) {
            tuple.push(0);
        } else if (zero) {
            zero = false;
            tuple.push(0x100 - byte);
        } else {
            tuple.push(0xFF - byte);
        }
    }

    let sum = 0;
    const l = tuple.length;
    for (let i = 0; i < l; i++) {
        sum += tuple[i] * Math.pow(256, i);
    }

    return positive ? sum : -1 * sum;
};

const decodeOct = (val, offset, length) => {
    val = val.slice(offset, offset + length);
    offset = 0;
    // If prefixed with 0x80 then parse as a base-256 integer
    if (val[offset] & 0x80) {
        return parse256(val);
    }
    // Older versions of tar can prefix with spaces
    while (offset < val.length && val[offset] === 32) {
        offset++;
    }
    const end = clamp(indexOf(val, 32, offset, val.length), val.length, val.length);
    while (offset < end && val[offset] === 0) {
        offset++;
    }
    if (end === offset) {
        return 0;
    }
    return parseInt(val.slice(offset, end).toString(), 8);

};

const decodeStr = (val, offset, length) => val.slice(offset, indexOf(val, 0, offset, offset + length)).toString();

const addLength = (str) => {
    const len = Buffer.byteLength(str);
    let digits = Math.floor(Math.log(len) / Math.log(10)) + 1;
    if (len + digits >= Math.pow(10, digits)) {
        digits++;
    }

    return (len + digits) + str;
};

export const decodeLongPath = (buf) => decodeStr(buf, 0, buf.length);

export const encodePax = (opts) => { // TODO: encode more stuff in pax
    const result = [];
    if (opts.name) {
        result.push(addLength(` path=${opts.name}\n`));
    }
    if (opts.linkname) {
        result.push(addLength(` linkpath=${opts.linkname}\n`));
    }
    const pax = opts.pax;
    if (pax) {
        for (const key in pax) {
            result.push(addLength(` ${key}=${pax[key]}\n`));
        }
    }
    return Buffer.from(result.join(""));
};

export const decodePax = (buf) => {
    const result = {};

    while (buf.length) {
        let i = 0;
        while (i < buf.length && buf[i] !== 32) {
            i++;
        }
        const len = parseInt(buf.slice(0, i).toString(), 10);
        if (!len) {
            return result;
        }

        const b = buf.slice(i + 1, len - 1).toString();
        const keyIndex = b.indexOf("=");
        if (keyIndex === -1) {
            return result;
        }
        result[b.slice(0, keyIndex)] = b.slice(keyIndex + 1);

        buf = buf.slice(len);
    }

    return result;
};

export const encode = (opts) => {
    const buf = Buffer.alloc(512);
    let name = opts.name;
    let prefix = "";

    if (opts.typeflag === 5 && name[name.length - 1] !== "/") {
        name += "/";
    }
    if (Buffer.byteLength(name) !== name.length) {
        return null; // utf-8
    }

    while (Buffer.byteLength(name) > 100) {
        const i = name.indexOf("/");
        if (i === -1) {
            return null;
        }
        prefix += prefix ? `/${name.slice(0, i)}` : name.slice(0, i);
        name = name.slice(i + 1);
    }

    if (Buffer.byteLength(name) > 100 || Buffer.byteLength(prefix) > 155) {
        return null;
    }
    if (opts.linkname && Buffer.byteLength(opts.linkname) > 100) {
        return null;
    }

    buf.write(name);
    buf.write(encodeOct(opts.mode & MASK, 6), 100);
    buf.write(encodeOct(opts.uid, 6), 108);
    buf.write(encodeOct(opts.gid, 6), 116);
    buf.write(encodeOct(opts.size, 11), 124);
    buf.write(encodeOct((opts.mtime.getTime() / 1000) | 0, 11), 136);

    buf[156] = ZERO_OFFSET + toTypeflag(opts.type);

    if (opts.linkname) {
        buf.write(opts.linkname, 157);
    }

    buf.write(USTAR, 257);
    if (opts.uname) {
        buf.write(opts.uname, 265);
    }
    if (opts.gname) {
        buf.write(opts.gname, 297);
    }
    buf.write(encodeOct(opts.devmajor || 0, 6), 329);
    buf.write(encodeOct(opts.devminor || 0, 6), 337);

    if (prefix) {
        buf.write(prefix, 345);
    }

    buf.write(encodeOct(cksum(buf), 6), 148);

    return buf;
};

export const decode = (buf) => {
    let typeflag = buf[156] === 0 ? 0 : buf[156] - ZERO_OFFSET;

    let name = decodeStr(buf, 0, 100);
    const mode = decodeOct(buf, 100, 8);
    const uid = decodeOct(buf, 108, 8);
    const gid = decodeOct(buf, 116, 8);
    const size = decodeOct(buf, 124, 12);
    const mtime = decodeOct(buf, 136, 12);
    const type = toType(typeflag);
    const linkname = buf[157] === 0 ? null : decodeStr(buf, 157, 100);
    const uname = decodeStr(buf, 265, 32);
    const gname = decodeStr(buf, 297, 32);
    const devmajor = decodeOct(buf, 329, 8);
    const devminor = decodeOct(buf, 337, 8);

    if (buf[345]) {
        name = `${decodeStr(buf, 345, 155)}/${name}`;
    }

    // to support old tar versions that use trailing / to indicate dirs
    if (typeflag === 0 && name && name[name.length - 1] === "/") {
        typeflag = 5;
    }

    const c = cksum(buf);

    // checksum is still initial value if header was null.
    if (c === 8 * 32) {
        return null;
    }

    // valid checksum
    if (c !== decodeOct(buf, 148, 8)) {
        throw new error.IllegalStateException("Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?");
    }

    return {
        name,
        mode,
        uid,
        gid,
        size,
        mtime: new Date(1000 * mtime),
        type,
        linkname,
        uname,
        gname,
        devmajor,
        devminor
    };
};

