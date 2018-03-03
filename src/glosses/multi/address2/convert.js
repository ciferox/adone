const ip = require("ip");

const {
    data: { varint, base58 }
} = adone;

const port2buf = (port) => {
    const buf = Buffer.allocUnsafe(2);
    buf.writeUInt16BE(port, 0);
    return buf;
};

const buf2port = (buf) => buf.readUInt16BE(0);

const str2buf = (str) => {
    const buf = Buffer.from(str);
    const size = Buffer.from(varint.encode(buf.length));
    return Buffer.concat([size, buf]);
};

const buf2str = (buf) => {
    const size = varint.decode(buf);
    buf = buf.slice(varint.decode.bytes);

    if (buf.length !== size) {
        throw new Error("inconsistent lengths");
    }

    return buf.toString();
};

const mh2buf = (hash) => {
    // the address is a varint prefixed multihash string representation
    const mh = Buffer.from(base58.decode(hash));
    const size = Buffer.from(varint.encode(mh.length));
    return Buffer.concat([size, mh]);
};

const buf2mh = (buf) => {
    const size = varint.decode(buf);
    const address = buf.slice(varint.decode.bytes);

    if (address.length !== size) {
        throw new Error("inconsistent lengths");
    }

    return base58.encode(address);
};

export const toString = (proto, buf) => {
    proto = adone.multi.address2.protocols(proto);
    switch (proto.code) {
        case 4: // ipv4
        case 5: // ipv6
            return ip.toString(buf);

        case 6: // tcp
        case 7: // udp
        case 8: // sctp
        case 9: // dccp
        case 17: // udt
        case 18: // utp
        case 19: // quic
            return buf2port(buf);

        case 53: // dns
        case 54: // dns4
        case 55: // dns6
        case 400: // unix
        case 401: // winpipe
            return buf2str(buf);

        case 420:
        case 421: // ipfs
            return buf2mh(buf);
        default:
            return buf.toString("hex"); // no clue. convert to hex
    }
};

export const toBuffer = (proto, str) => {
    proto = adone.multi.address2.protocols(proto);
    switch (proto.code) {
        case 4: // ipv4
        case 5: // ipv6
            return ip.toBuffer(str);

        case 6: // tcp
        case 7: // udp
        case 8: // sctp
        case 9: // dccp
        case 17: // udt
        case 18: // utp
        case 19: // quic
            return port2buf(parseInt(str, 10));

        case 53: // dns
        case 54: // dns4
        case 55: // dns6
        case 400: // unix
        case 401: // winpipe
            return str2buf(str);

        case 420:
        case 421: // ipfs
            return mh2buf(str);
        default:
            return Buffer.from(str, "hex"); // no clue. convert from hex
    }
};

// converts (serializes) addresses
export const convert = (proto, a) => {
    if (a instanceof Buffer) {
        return toString(proto, a);
    }
    return toBuffer(proto, a);
}
