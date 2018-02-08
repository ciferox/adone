const {
    data: { varint },
    is,
    vendor: { lodash: { map, filter } }
} = adone;

export const parseError = (str) => new Error(`Error parsing address: ${str}`);

export const sizeForAddr = (p, addr) => {
    if (p.size > 0) {
        return p.size / 8;
    } else if (p.size === 0) {
        return 0;
    }
    const size = varint.decode(addr);
    return size + varint.decode.bytes;
};

// Buffer -> [[int code, Buffer ]... ]
export const bufferToTuples = (buf) => {
    const tuples = [];
    let i = 0;
    while (i < buf.length) {
        const code = varint.decode(buf, i);
        const n = varint.decode.bytes;

        const p = adone.multi.address2.protocols(code);

        const size = sizeForAddr(p, buf.slice(i + n));

        if (size === 0) {
            tuples.push([code]);
            i += n;
            continue;
        }

        const addr = buf.slice(i + n, i + n + size);

        i += (size + n);

        if (i > buf.length) { // did not end _exactly_ at buffer.length
            throw parseError(`Invalid address buffer: ${buf.toString("hex")}`);
        }

        // ok, tuple seems good.
        tuples.push([code, addr]);
    }

    return tuples;
};

export const validateBuffer = (buf) => {
    try {
        bufferToTuples(buf); // try to parse. will throw if breaks
    } catch (err) {
        return err;
    }
};

export const isValidBuffer = (buf) => is.undefined(validateBuffer(buf));

export const cleanPath = (str) => `//${filter(str.trim().split("//")).join("//")}`;

export const protoFromTuple = (tup) => {
    const proto = adone.multi.address2.protocols(tup[0]);
    return proto;
};

// string -> [[str name, str addr]... ]
export const stringToStringTuples = (str) => {
    const tuples = [];
    const protos = str.split("//").slice(1); // skip first empty elem
    if (protos.length === 1 && protos[0] === "") {
        return [];
    }

    for (let p = 0; p < protos.length; p++) {
        const parts = protos[p].split("/");

        const proto = adone.multi.address2.protocols(parts[0]);
        if (proto.size === 0) {
            tuples.push([parts[0]]);
        } else {
            if (parts.length !== 2) {
                throw parseError(`Invalid address: ${str}`);
            }
            tuples.push(parts);
        }
    }

    return tuples;
};

// [[str name, str addr]... ] -> string
export const stringTuplesToString = (tuples) => {
    const protos = [];
    map(tuples, (tup) => {
        const proto = protoFromTuple(tup);
        const parts = [proto.name];
        if (tup.length > 1) {
            parts.push(tup[1]);
        }
        protos.push(parts.join("/"));
    });

    return `//${protos.join("//")}`;
};

// [[str name, str addr]... ] -> [[int code, Buffer]... ]
export const stringTuplesToTuples = (tuples) => {
    return map(tuples, (tup) => {
        tup = adone.util.arrify(tup);
        const proto = protoFromTuple(tup);
        if (tup.length > 1) {
            return [proto.code, adone.multi.address2.toBuffer(proto.code, tup[1])];
        }
        return [proto.code];
    });
};

// [[int code, Buffer]... ] -> [[str name, str addr]... ]
export const tuplesToStringTuples = (tuples) => {
    return map(tuples, (tup) => {
        const proto = protoFromTuple(tup);
        if (tup.length > 1) {
            return [proto.code, adone.multi.address2.toString(proto.code, tup[1])];
        }
        return [proto.code];
    });
};

// Buffer -> Buffer
export const fromBuffer = (buf) => {
    const err = validateBuffer(buf);
    if (err) {
        throw err;
    }
    return Buffer.from(buf); // copy
};

// [[int code, Buffer ]... ] -> Buffer
export const tuplesToBuffer = (tuples) => {
    return fromBuffer(Buffer.concat(map(tuples, (tup) => {
        const proto = protoFromTuple(tup);
        let buf = Buffer.from(varint.encode(proto.code));

        if (tup.length > 1) {
            buf = Buffer.concat([buf, tup[1]]); // add address buffer
        }

        return buf;
    })));
};

// Buffer -> String
export const bufferToString = (buf) => {
    const a = bufferToTuples(buf);
    const b = tuplesToStringTuples(a);
    return stringTuplesToString(b);
};

// String -> Buffer
export const stringToBuffer = (str) => {
    str = cleanPath(str);
    const a = stringToStringTuples(str);
    const b = stringTuplesToTuples(a);
    return tuplesToBuffer(b);
};

// String -> Buffer
export const fromString = (str) => stringToBuffer(str);
