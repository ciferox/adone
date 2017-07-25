const { is } = adone;

export const rnd16 = () => adone.std.crypto.randomBytes(16);
rnd16();

export const seedBytes = rnd16();

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
    byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

export const bytesToUuid = (buf, offset) => {
    let i = offset || 0;
    const bth = byteToHex;
    return `${bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]]}-${bth[buf[i++]]}${bth[buf[i++]]}-${bth[buf[i++]]}${bth[buf[i++]]}-${bth[buf[i++]]}${bth[buf[i++]]}-${bth[buf[i++]]}${bth[buf[i++]]}${bth[buf[i++]]}${bth[buf[i++]]}${bth[buf[i++]]}${bth[buf[i++]]}`;
};

export const sha1 = (bytes) => {
    // support modern Buffer API
    if (is.function(Buffer.from)) {
        if (is.array(bytes)) {
            bytes = Buffer.from(bytes);
        } else if (is.string(bytes)) {
            bytes = Buffer.from(bytes, "utf8");
        }
    } else { // support pre-v4 Buffer API
        if (is.array(bytes)) {
            bytes = Buffer.from(bytes);
        } else if (is.string(bytes)) {
            bytes = Buffer.from(bytes, "utf8");
        }
    }

    return adone.std.crypto.createHash("sha1").update(bytes).digest();
};
