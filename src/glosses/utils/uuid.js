
const is = adone.is;
const randomBytes = adone.std.crypto.randomBytes;
const rnd16 = () => randomBytes(16);
rnd16();

const seedBytes = rnd16();
const byteToHex = [];
const hexToByte = {};
for (var i = 0; i < 256; i++) {
    byteToHex[i] = (i + 0x100).toString(16).substr(1);
    hexToByte[byteToHex[i]] = i;
}

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
const nodeId = [
    seedBytes[0] | 0x01,
    seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
let _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;

// Previous uuid creation time
let _lastMSecs = 0;
let _lastNSecs = 0;

export default class UUID {
    static v1(options, buf, offset) {
        var i = buf && offset || 0;
        var b = buf || [];

        options = options || {};

        var clockseq = (options.clockseq != null) ? options.clockseq : _clockseq;

        // UUID timestamps are 100 nano-second units since the Gregorian epoch,
        // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
        // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
        // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
        var msecs = (options.msecs != null) ? options.msecs : new Date().getTime();

        // Per 4.2.1.2, use count of uuid's generated during the current clock
        // cycle to simulate higher resolution clock
        var nsecs = (options.nsecs != null) ? options.nsecs : _lastNSecs + 1;

        // Time since last uuid creation (in msecs)
        var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs) / 10000;

        // Per 4.2.1.2, Bump clockseq on clock regression
        if (dt < 0 && options.clockseq == null) {
            clockseq = clockseq + 1 & 0x3fff;
        }

        // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
        // time interval
        if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
            nsecs = 0;
        }

        // Per 4.2.1.2 Throw error if too many uuids are requested
        if (nsecs >= 10000) {
            throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
        }

        _lastMSecs = msecs;
        _lastNSecs = nsecs;
        _clockseq = clockseq;

        // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
        msecs += 12219292800000;

        // `time_low`
        var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
        b[i++] = tl >>> 24 & 0xff;
        b[i++] = tl >>> 16 & 0xff;
        b[i++] = tl >>> 8 & 0xff;
        b[i++] = tl & 0xff;

        // `time_mid`
        var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
        b[i++] = tmh >>> 8 & 0xff;
        b[i++] = tmh & 0xff;

        // `time_high_and_version`
        b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
        b[i++] = tmh >>> 16 & 0xff;

        // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
        b[i++] = clockseq >>> 8 | 0x80;

        // `clock_seq_low`
        b[i++] = clockseq & 0xff;

        // `node`
        var node = options.node || nodeId;
        for (var n = 0; n < 6; n++) {
            b[i + n] = node[n];
        }

        return buf ? buf : UUID.unparse(b);
    }

    static v4(buf, offset) {
        if (is.string(buf)) {
            buf = (buf === "binary") ? new Buffer(16) : null;
        }

        const rnds = rnd16();

        // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
        rnds[6] = (rnds[6] & 0x0f) | 0x40;
        rnds[8] = (rnds[8] & 0x3f) | 0x80;

        // Copy bytes to buffer, if provided
        if (buf) {
            for (let ii = 0; ii < 16; ++ii) {
                buf[ii] = rnds[ii];
            }
        }

        return buf || UUID.unparse(rnds);
    }

    static parse(s, buf, offset) {
        const i = (buf && offset) || 0;
        let ii = 0;

        buf = buf || [];
        s.toLowerCase().replace(/[0-9a-f]{2}/g, (oct) => {
            if (ii < 16) { // Don't overflow!
                buf[i + ii++] = hexToByte[oct];
            }
        });

        // Zero out remaining bytes if string was short
        while (ii < 16) {
            buf[i + ii++] = 0;
        }

        return buf;
    }

    static unparse(buf, offset) {
        let i = offset || 0;
        const bth = byteToHex;
        return bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + "-" +
            bth[buf[i++]] + bth[buf[i++]] + "-" +
            bth[buf[i++]] + bth[buf[i++]] + "-" +
            bth[buf[i++]] + bth[buf[i++]] + "-" +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
    }
}