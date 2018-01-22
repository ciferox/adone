const {
    is,
    net: { ip }
} = adone;

adone.asNamespace(exports);

export const types = {
    toString(type) {
        switch (type) {
            case 1: return "A";
            case 10: return "NULL";
            case 28: return "AAAA";
            case 18: return "AFSDB";
            case 42: return "APL";
            case 257: return "CAA";
            case 60: return "CDNSKEY";
            case 59: return "CDS";
            case 37: return "CERT";
            case 5: return "CNAME";
            case 49: return "DHCID";
            case 32769: return "DLV";
            case 39: return "DNAME";
            case 48: return "DNSKEY";
            case 43: return "DS";
            case 55: return "HIP";
            case 13: return "HINFO";
            case 45: return "IPSECKEY";
            case 25: return "KEY";
            case 36: return "KX";
            case 29: return "LOC";
            case 15: return "MX";
            case 35: return "NAPTR";
            case 2: return "NS";
            case 47: return "NSEC";
            case 50: return "NSEC3";
            case 51: return "NSEC3PARAM";
            case 12: return "PTR";
            case 46: return "RRSIG";
            case 17: return "RP";
            case 24: return "SIG";
            case 6: return "SOA";
            case 99: return "SPF";
            case 33: return "SRV";
            case 44: return "SSHFP";
            case 32768: return "TA";
            case 249: return "TKEY";
            case 52: return "TLSA";
            case 250: return "TSIG";
            case 16: return "TXT";
            case 252: return "AXFR";
            case 251: return "IXFR";
            case 41: return "OPT";
            case 255: return "ANY";
        }
        return `UNKNOWN_${type}`;
    },
    toType(name) {
        switch (name.toUpperCase()) {
            case "A": return 1;
            case "NULL": return 10;
            case "AAAA": return 28;
            case "AFSDB": return 18;
            case "APL": return 42;
            case "CAA": return 257;
            case "CDNSKEY": return 60;
            case "CDS": return 59;
            case "CERT": return 37;
            case "CNAME": return 5;
            case "DHCID": return 49;
            case "DLV": return 32769;
            case "DNAME": return 39;
            case "DNSKEY": return 48;
            case "DS": return 43;
            case "HIP": return 55;
            case "HINFO": return 13;
            case "IPSECKEY": return 45;
            case "KEY": return 25;
            case "KX": return 36;
            case "LOC": return 29;
            case "MX": return 15;
            case "NAPTR": return 35;
            case "NS": return 2;
            case "NSEC": return 47;
            case "NSEC3": return 50;
            case "NSEC3PARAM": return 51;
            case "PTR": return 12;
            case "RRSIG": return 46;
            case "RP": return 17;
            case "SIG": return 24;
            case "SOA": return 6;
            case "SPF": return 99;
            case "SRV": return 33;
            case "SSHFP": return 44;
            case "TA": return 32768;
            case "TKEY": return 249;
            case "TLSA": return 52;
            case "TSIG": return 250;
            case "TXT": return 16;
            case "AXFR": return 252;
            case "IXFR": return 251;
            case "OPT": return 41;
            case "ANY": return 255;
            case "*": return 255;
        }
        return 0;
    }
};

/**
 * Traditional DNS header RCODEs (4-bits) defined by IANA in
 * https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml
 */
export const rcodes = {
    toString(rcode) {
        switch (rcode) {
            case 0: return "NOERROR";
            case 1: return "FORMERR";
            case 2: return "SERVFAIL";
            case 3: return "NXDOMAIN";
            case 4: return "NOTIMP";
            case 5: return "REFUSED";
            case 6: return "YXDOMAIN";
            case 7: return "YXRRSET";
            case 8: return "NXRRSET";
            case 9: return "NOTAUTH";
            case 10: return "NOTZONE";
            case 11: return "RCODE_11";
            case 12: return "RCODE_12";
            case 13: return "RCODE_13";
            case 14: return "RCODE_14";
            case 15: return "RCODE_15";
        }
        return `RCODE_${rcode}`;
    },
    toRcode(code) {
        switch (code.toUpperCase()) {
            case "NOERROR": return 0;
            case "FORMERR": return 1;
            case "SERVFAIL": return 2;
            case "NXDOMAIN": return 3;
            case "NOTIMP": return 4;
            case "REFUSED": return 5;
            case "YXDOMAIN": return 6;
            case "YXRRSET": return 7;
            case "NXRRSET": return 8;
            case "NOTAUTH": return 9;
            case "NOTZONE": return 10;
            case "RCODE_11": return 11;
            case "RCODE_12": return 12;
            case "RCODE_13": return 13;
            case "RCODE_14": return 14;
            case "RCODE_15": return 15;
        }
        return 0;
    }
};

/**
 * Traditional DNS header OPCODEs (4-bits) defined by IANA in
 * https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-5
 */
export const opcodes = {
    toString(opcode) {
        switch (opcode) {
            case 0: return "QUERY";
            case 1: return "IQUERY";
            case 2: return "STATUS";
            case 3: return "OPCODE_3";
            case 4: return "NOTIFY";
            case 5: return "UPDATE";
            case 6: return "OPCODE_6";
            case 7: return "OPCODE_7";
            case 8: return "OPCODE_8";
            case 9: return "OPCODE_9";
            case 10: return "OPCODE_10";
            case 11: return "OPCODE_11";
            case 12: return "OPCODE_12";
            case 13: return "OPCODE_13";
            case 14: return "OPCODE_14";
            case 15: return "OPCODE_15";
        }
        return `OPCODE_${opcode}`;
    },

    toOpcode(code) {
        switch (code.toUpperCase()) {
            case "QUERY": return 0;
            case "IQUERY": return 1;
            case "STATUS": return 2;
            case "OPCODE_3": return 3;
            case "NOTIFY": return 4;
            case "UPDATE": return 5;
            case "OPCODE_6": return 6;
            case "OPCODE_7": return 7;
            case "OPCODE_8": return 8;
            case "OPCODE_9": return 9;
            case "OPCODE_10": return 10;
            case "OPCODE_11": return 11;
            case "OPCODE_12": return 12;
            case "OPCODE_13": return 13;
            case "OPCODE_14": return 14;
            case "OPCODE_15": return 15;
        }
        return 0;
    }
};

export const classes = {
    toString(klass) {
        switch (klass) {
            case 1: return "IN";
            case 2: return "CS";
            case 3: return "CH";
            case 4: return "HS";
            case 255: return "ANY";
        }
        return `UNKNOWN_${klass}`;
    },
    toClass(name) {
        switch (name.toUpperCase()) {
            case "IN": return 1;
            case "CS": return 2;
            case "CH": return 3;
            case "HS": return 4;
            case "ANY": return 255;
        }
        return 0;
    }
};

const QUERY_FLAG = 0;
const RESPONSE_FLAG = 1 << 15;
const FLUSH_MASK = 1 << 15;
const NOT_FLUSH_MASK = ~FLUSH_MASK;
const QU_MASK = 1 << 15;
const NOT_QU_MASK = ~QU_MASK;

export const name = {};

name.encode = function (str, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(name.encodingLength(str));
    }
    if (!offset) {
        offset = 0;
    }
    const oldOffset = offset;

    // strip leading and trailing .
    const n = str.replace(/^\.|\.$/gm, "");
    if (n.length) {
        const list = n.split(".");

        for (let i = 0; i < list.length; i++) {
            const len = buf.write(list[i], offset + 1);
            buf[offset] = len;
            offset += len + 1;
        }
    }

    buf[offset++] = 0;

    name.encode.bytes = offset - oldOffset;
    return buf;
};

name.encode.bytes = 0;

name.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const list = [];
    const oldOffset = offset;
    let len = buf[offset++];

    if (len === 0) {
        name.decode.bytes = 1;
        return ".";
    }
    if (len >= 0xc0) {
        const res = name.decode(buf, buf.readUInt16BE(offset - 1) - 0xc000);
        name.decode.bytes = 2;
        return res;
    }

    while (len) {
        if (len >= 0xc0) {
            list.push(name.decode(buf, buf.readUInt16BE(offset - 1) - 0xc000));
            offset++;
            break;
        }

        list.push(buf.toString("utf-8", offset, offset + len));
        offset += len;
        len = buf[offset++];
    }

    name.decode.bytes = offset - oldOffset;
    return list.join(".");
};

name.decode.bytes = 0;

name.encodingLength = function (n) {
    return Buffer.byteLength(n) + 2;
};

const string = {};

string.encode = function (s, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(string.encodingLength(s));
    }
    if (!offset) {
        offset = 0;
    }

    const len = buf.write(s, offset + 1);
    buf[offset] = len;
    string.encode.bytes = len + 1;
    return buf;
};

string.encode.bytes = 0;

string.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const len = buf[offset];
    const s = buf.toString("utf-8", offset + 1, offset + 1 + len);
    string.decode.bytes = len + 1;
    return s;
};

string.decode.bytes = 0;

string.encodingLength = function (s) {
    return Buffer.byteLength(s) + 1;
};

const header = {};

header.encode = function (h, buf, offset) {
    if (!buf) {
        buf = header.encodingLength(h);
    }
    if (!offset) {
        offset = 0;
    }

    const flags = (h.flags || 0) & 32767;
    const type = h.type === "response" ? RESPONSE_FLAG : QUERY_FLAG;

    buf.writeUInt16BE(h.id || 0, offset);
    buf.writeUInt16BE(flags | type, offset + 2);
    buf.writeUInt16BE(h.questions.length, offset + 4);
    buf.writeUInt16BE(h.answers.length, offset + 6);
    buf.writeUInt16BE(h.authorities.length, offset + 8);
    buf.writeUInt16BE(h.additionals.length, offset + 10);

    return buf;
};

header.encode.bytes = 12;

header.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }
    if (buf.length < 12) {
        throw new Error("Header must be 12 bytes");
    }
    const flags = buf.readUInt16BE(offset + 2);

    return {
        id: buf.readUInt16BE(offset),
        type: flags & RESPONSE_FLAG ? "response" : "query",
        flags: flags & 32767,
        flag_qr: ((flags >> 15) & 0x1) === 1,
        opcode: opcodes.toString((flags >> 11) & 0xf),
        flag_auth: ((flags >> 10) & 0x1) === 1,
        flag_trunc: ((flags >> 9) & 0x1) === 1,
        flag_rd: ((flags >> 8) & 0x1) === 1,
        flag_ra: ((flags >> 7) & 0x1) === 1,
        flag_z: ((flags >> 6) & 0x1) === 1,
        flag_ad: ((flags >> 5) & 0x1) === 1,
        flag_cd: ((flags >> 4) & 0x1) === 1,
        rcode: rcodes.toString(flags & 0xf),
        questions: new Array(buf.readUInt16BE(offset + 4)),
        answers: new Array(buf.readUInt16BE(offset + 6)),
        authorities: new Array(buf.readUInt16BE(offset + 8)),
        additionals: new Array(buf.readUInt16BE(offset + 10))
    };
};

header.decode.bytes = 12;

header.encodingLength = function () {
    return 12;
};

export const unknown = {};

unknown.encode = function (data, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(unknown.encodingLength(data));
    }
    if (!offset) {
        offset = 0;
    }

    buf.writeUInt16BE(data.length, offset);
    data.copy(buf, offset + 2);

    unknown.encode.bytes = data.length + 2;
    return buf;
};

unknown.encode.bytes = 0;

unknown.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const len = buf.readUInt16BE(offset);
    const data = buf.slice(offset + 2, offset + 2 + len);
    unknown.decode.bytes = len + 2;
    return data;
};

unknown.decode.bytes = 0;

unknown.encodingLength = function (data) {
    return data.length + 2;
};

export const ns = {};

ns.encode = function (data, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(ns.encodingLength(data));
    }
    if (!offset) {
        offset = 0;
    }

    name.encode(data, buf, offset + 2);
    buf.writeUInt16BE(name.encode.bytes, offset);
    ns.encode.bytes = name.encode.bytes + 2;
    return buf;
};

ns.encode.bytes = 0;

ns.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const len = buf.readUInt16BE(offset);
    const dd = name.decode(buf, offset + 2);

    ns.decode.bytes = len + 2;
    return dd;
};

ns.decode.bytes = 0;

ns.encodingLength = function (data) {
    return name.encodingLength(data) + 2;
};

export const soa = {};

soa.encode = function (data, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(soa.encodingLength(data));
    }
    if (!offset) {
        offset = 0;
    }

    const oldOffset = offset;
    offset += 2;
    name.encode(data.mname, buf, offset);
    offset += name.encode.bytes;
    name.encode(data.rname, buf, offset);
    offset += name.encode.bytes;
    buf.writeUInt32BE(data.serial || 0, offset);
    offset += 4;
    buf.writeUInt32BE(data.refresh || 0, offset);
    offset += 4;
    buf.writeUInt32BE(data.retry || 0, offset);
    offset += 4;
    buf.writeUInt32BE(data.expire || 0, offset);
    offset += 4;
    buf.writeUInt32BE(data.minimum || 0, offset);
    offset += 4;

    buf.writeUInt16BE(offset - oldOffset - 2, oldOffset);
    soa.encode.bytes = offset - oldOffset;
    return buf;
};

soa.encode.bytes = 0;

soa.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const oldOffset = offset;

    const data = {};
    offset += 2;
    data.mname = name.decode(buf, offset);
    offset += name.decode.bytes;
    data.rname = name.decode(buf, offset);
    offset += name.decode.bytes;
    data.serial = buf.readUInt32BE(offset);
    offset += 4;
    data.refresh = buf.readUInt32BE(offset);
    offset += 4;
    data.retry = buf.readUInt32BE(offset);
    offset += 4;
    data.expire = buf.readUInt32BE(offset);
    offset += 4;
    data.minimum = buf.readUInt32BE(offset);
    offset += 4;

    soa.decode.bytes = offset - oldOffset;
    return data;
};

soa.decode.bytes = 0;

soa.encodingLength = function (data) {
    return 22 + name.encodingLength(data.mname) + name.encodingLength(data.rname);
};

export const txt = {};
export { txt as null };

txt.encode = function (data, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(txt.encodingLength(data));
    }
    if (!offset) {
        offset = 0;
    }

    if (is.string(data)) {
        data = Buffer.from(data);
    }
    if (!data) {
        data = Buffer.allocUnsafe(0);
    }

    const oldOffset = offset;
    offset += 2;

    const len = data.length;
    data.copy(buf, offset, 0, len);
    offset += len;

    buf.writeUInt16BE(offset - oldOffset - 2, oldOffset);
    txt.encode.bytes = offset - oldOffset;
    return buf;
};

txt.encode.bytes = 0;

txt.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }
    const oldOffset = offset;
    const len = buf.readUInt16BE(offset);

    offset += 2;

    const data = buf.slice(offset, offset + len);
    offset += len;

    txt.decode.bytes = offset - oldOffset;
    return data;
};

txt.decode.bytes = 0;

txt.encodingLength = function (data) {
    if (!data) {
        return 2;
    }
    return (is.buffer(data) ? data.length : Buffer.byteLength(data)) + 2;
};

export const hinfo = {};

hinfo.encode = function (data, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(hinfo.encodingLength(data));
    }
    if (!offset) {
        offset = 0;
    }

    const oldOffset = offset;
    offset += 2;
    string.encode(data.cpu, buf, offset);
    offset += string.encode.bytes;
    string.encode(data.os, buf, offset);
    offset += string.encode.bytes;
    buf.writeUInt16BE(offset - oldOffset - 2, oldOffset);
    hinfo.encode.bytes = offset - oldOffset;
    return buf;
};

hinfo.encode.bytes = 0;

hinfo.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const oldOffset = offset;

    const data = {};
    offset += 2;
    data.cpu = string.decode(buf, offset);
    offset += string.decode.bytes;
    data.os = string.decode(buf, offset);
    offset += string.decode.bytes;
    hinfo.decode.bytes = offset - oldOffset;
    return data;
};

hinfo.decode.bytes = 0;

hinfo.encodingLength = function (data) {
    return string.encodingLength(data.cpu) + string.encodingLength(data.os) + 2;
};

export const ptr = {};
export { ptr as cname, ptr as dname };

ptr.encode = function (data, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(ptr.encodingLength(data));
    }
    if (!offset) {
        offset = 0;
    }

    name.encode(data, buf, offset + 2);
    buf.writeUInt16BE(name.encode.bytes, offset);
    ptr.encode.bytes = name.encode.bytes + 2;
    return buf;
};

ptr.encode.bytes = 0;

ptr.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const data = name.decode(buf, offset + 2);
    ptr.decode.bytes = name.decode.bytes + 2;
    return data;
};

ptr.decode.bytes = 0;

ptr.encodingLength = function (data) {
    return name.encodingLength(data) + 2;
};

export const srv = {};

srv.encode = function (data, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(srv.encodingLength(data));
    }
    if (!offset) {
        offset = 0;
    }

    buf.writeUInt16BE(data.priority || 0, offset + 2);
    buf.writeUInt16BE(data.weight || 0, offset + 4);
    buf.writeUInt16BE(data.port || 0, offset + 6);
    name.encode(data.target, buf, offset + 8);

    const len = name.encode.bytes + 6;
    buf.writeUInt16BE(len, offset);

    srv.encode.bytes = len + 2;
    return buf;
};

srv.encode.bytes = 0;

srv.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const len = buf.readUInt16BE(offset);

    const data = {};
    data.priority = buf.readUInt16BE(offset + 2);
    data.weight = buf.readUInt16BE(offset + 4);
    data.port = buf.readUInt16BE(offset + 6);
    data.target = name.decode(buf, offset + 8);

    srv.decode.bytes = len + 2;
    return data;
};

srv.decode.bytes = 0;

srv.encodingLength = function (data) {
    return 8 + name.encodingLength(data.target);
};

export const caa = {};

caa.ISSUER_CRITICAL = 1 << 7;

caa.encode = function (data, buf, offset) {
    const len = caa.encodingLength(data);

    if (!buf) {
        buf = Buffer.allocUnsafe(caa.encodingLength(data));
    }
    if (!offset) {
        offset = 0;
    }

    if (data.issuerCritical) {
        data.flags = caa.ISSUER_CRITICAL;
    }

    buf.writeUInt16BE(len - 2, offset);
    offset += 2;
    buf.writeUInt8(data.flags || 0, offset);
    offset += 1;
    string.encode(data.tag, buf, offset);
    offset += string.encode.bytes;
    buf.write(data.value, offset);
    offset += Buffer.byteLength(data.value);

    caa.encode.bytes = len;
    return buf;
};

caa.encode.bytes = 0;

caa.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const len = buf.readUInt16BE(offset);
    offset += 2;

    const oldOffset = offset;
    const data = {};
    data.flags = buf.readUInt8(offset);
    offset += 1;
    data.tag = string.decode(buf, offset);
    offset += string.decode.bytes;
    data.value = buf.toString("utf-8", offset, oldOffset + len);

    data.issuerCritical = Boolean(data.flags & caa.ISSUER_CRITICAL);

    caa.decode.bytes = len + 2;

    return data;
};

caa.decode.bytes = 0;

caa.encodingLength = function (data) {
    return string.encodingLength(data.tag) + string.encodingLength(data.value) + 2;
};

const ra = exports.a = {};

ra.encode = function (host, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(ra.encodingLength(host));
    }
    if (!offset) {
        offset = 0;
    }

    buf.writeUInt16BE(4, offset);
    offset += 2;
    ip.toBuffer(host, buf, offset);
    ra.encode.bytes = 6;
    return buf;
};

ra.encode.bytes = 0;

ra.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    offset += 2;
    const host = ip.toString(buf, offset, 4);
    ra.decode.bytes = 6;
    return host;
};

ra.decode.bytes = 0;

ra.encodingLength = function () {
    return 6;
};

export const aaaa = {};

aaaa.encode = function (host, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(aaaa.encodingLength(host));
    }
    if (!offset) {
        offset = 0;
    }

    buf.writeUInt16BE(16, offset);
    offset += 2;
    ip.toBuffer(host, buf, offset);
    aaaa.encode.bytes = 18;
    return buf;
};

aaaa.encode.bytes = 0;

aaaa.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    offset += 2;
    const host = ip.toString(buf, offset, 16);
    aaaa.decode.bytes = 18;
    return host;
};

aaaa.decode.bytes = 0;

aaaa.encodingLength = function () {
    return 18;
};

export const record = function (type) {
    switch (type.toUpperCase()) {
        case "A": return ra;
        case "PTR": return ptr;
        case "CNAME": return ptr;
        case "DNAME": return ptr;
        case "TXT": return txt;
        case "NULL": return txt;
        case "AAAA": return aaaa;
        case "SRV": return srv;
        case "HINFO": return hinfo;
        case "CAA": return caa;
        case "NS": return ns;
        case "SOA": return soa;
    }
    return unknown;
};

const answer = exports.answer = {};

answer.encode = function (a, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(answer.encodingLength(a));
    }
    if (!offset) {
        offset = 0;
    }

    const oldOffset = offset;

    name.encode(a.name, buf, offset);
    offset += name.encode.bytes;

    buf.writeUInt16BE(types.toType(a.type), offset);

    let klass = classes.toClass(is.undefined(a.class) ? "IN" : a.class);
    if (a.flush) {
        klass |= FLUSH_MASK;
    } // the 1st bit of the class is the flush bit
    buf.writeUInt16BE(klass, offset + 2);

    buf.writeUInt32BE(a.ttl || 0, offset + 4);

    const enc = record(a.type);
    enc.encode(a.data, buf, offset + 8);
    offset += 8 + enc.encode.bytes;

    answer.encode.bytes = offset - oldOffset;
    return buf;
};

answer.encode.bytes = 0;

answer.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const a = {};
    const oldOffset = offset;

    a.name = name.decode(buf, offset);
    offset += name.decode.bytes;
    a.type = types.toString(buf.readUInt16BE(offset));
    a.class = classes.toString(buf.readUInt16BE(offset + 2));
    a.ttl = buf.readUInt32BE(offset + 4);

    a.flush = Boolean(a.class & FLUSH_MASK);
    if (a.flush) {
        a.class &= NOT_FLUSH_MASK;
    }

    const enc = record(a.type);
    a.data = enc.decode(buf, offset + 8);
    offset += 8 + enc.decode.bytes;

    answer.decode.bytes = offset - oldOffset;
    return a;
};

answer.decode.bytes = 0;

answer.encodingLength = function (a) {
    return name.encodingLength(a.name) + 8 + record(a.type).encodingLength(a.data);
};

export const question = {};

question.encode = function (q, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(question.encodingLength(q));
    }
    if (!offset) {
        offset = 0;
    }

    const oldOffset = offset;

    name.encode(q.name, buf, offset);
    offset += name.encode.bytes;

    buf.writeUInt16BE(types.toType(q.type), offset);
    offset += 2;

    buf.writeUInt16BE(classes.toClass(is.undefined(q.class) ? "IN" : q.class), offset);
    offset += 2;

    question.encode.bytes = offset - oldOffset;
    return q;
};

question.encode.bytes = 0;

question.decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const oldOffset = offset;
    const q = {};

    q.name = name.decode(buf, offset);
    offset += name.decode.bytes;

    q.type = types.toString(buf.readUInt16BE(offset));
    offset += 2;

    q.class = classes.toString(buf.readUInt16BE(offset));
    offset += 2;

    const qu = Boolean(q.class & QU_MASK);
    if (qu) {
        q.class &= NOT_QU_MASK;
    }

    question.decode.bytes = offset - oldOffset;
    return q;
};

question.decode.bytes = 0;

question.encodingLength = function (q) {
    return name.encodingLength(q.name) + 4;
};

export const AUTHORITATIVE_ANSWER = 1 << 10;
export const TRUNCATED_RESPONSE = 1 << 9;
export const RECURSION_DESIRED = 1 << 8;
export const RECURSION_AVAILABLE = 1 << 7;
export const AUTHENTIC_DATA = 1 << 5;
export const CHECKING_DISABLED = 1 << 4;

const encodingLengthList = (list, enc) => {
    let len = 0;
    for (let i = 0; i < list.length; i++) {
        len += enc.encodingLength(list[i]);
    }
    return len;
};

const encodeList = (list, enc, buf, offset) => {
    for (let i = 0; i < list.length; i++) {
        enc.encode(list[i], buf, offset);
        offset += enc.encode.bytes;
    }
    return offset;
};

const decodeList = (list, enc, buf, offset) => {
    for (let i = 0; i < list.length; i++) {
        list[i] = enc.decode(buf, offset);
        offset += enc.decode.bytes;
    }
    return offset;
};

export const encodingLength = function (result) {
    return header.encodingLength(result) +
        encodingLengthList(result.questions || [], question) +
        encodingLengthList(result.answers || [], answer) +
        encodingLengthList(result.authorities || [], answer) +
        encodingLengthList(result.additionals || [], answer);
};

export const encode = function (result, buf, offset) {
    if (!buf) {
        buf = Buffer.allocUnsafe(encodingLength(result));
    }
    if (!offset) {
        offset = 0;
    }

    const oldOffset = offset;

    if (!result.questions) {
        result.questions = [];
    }
    if (!result.answers) {
        result.answers = [];
    }
    if (!result.authorities) {
        result.authorities = [];
    }
    if (!result.additionals) {
        result.additionals = [];
    }

    header.encode(result, buf, offset);
    offset += header.encode.bytes;

    offset = encodeList(result.questions, question, buf, offset);
    offset = encodeList(result.answers, answer, buf, offset);
    offset = encodeList(result.authorities, answer, buf, offset);
    offset = encodeList(result.additionals, answer, buf, offset);

    encode.bytes = offset - oldOffset;

    return buf;
};

encode.bytes = 0;

export const decode = function (buf, offset) {
    if (!offset) {
        offset = 0;
    }

    const oldOffset = offset;
    const result = header.decode(buf, offset);
    offset += header.decode.bytes;

    offset = decodeList(result.questions, question, buf, offset);
    offset = decodeList(result.answers, answer, buf, offset);
    offset = decodeList(result.authorities, answer, buf, offset);
    offset = decodeList(result.additionals, answer, buf, offset);

    decode.bytes = offset - oldOffset;

    return result;
};

decode.bytes = 0;
