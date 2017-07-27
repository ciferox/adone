const { is, util: { uuid } } = adone;

const v4 = (options, buf, offset) => {
    const i = buf && offset || 0;

    if (is.string(buf)) {
        buf = options === "binary" ? Buffer.alloc(16) : null;
    }

    const rnds = uuid.__.rnd16();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
        for (let ii = 0; ii < 16; ++ii) {
            buf[i + ii] = rnds[ii];
        }
    }

    return buf || uuid.__.bytesToUuid(rnds);
};

export default v4;
