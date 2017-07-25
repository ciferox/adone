const { is, util: { uuid } } = adone;

const uuidToBytes = (uuid) => {
    // Note: We assume we're being passed a valid uuid string
    const bytes = [];
    uuid.replace(/[a-fA-F0-9]{2}/g, (hex) => {
        bytes.push(parseInt(hex, 16));
    });

    return bytes;
};

const stringToBytes = (str) => {
    str = unescape(encodeURIComponent(str)); // UTF8 escape
    const bytes = new Array(str.length);
    for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
    }
    return bytes;
};

const v5 = (name, namespace, buf, offset) => {
    const off = buf && offset || 0;

    if (is.string(name)) {
        name = stringToBytes(name);
    }
    if (is.string(namespace)) {
        namespace = uuidToBytes(namespace);
    }

    if (!is.array(name)) {
        throw new TypeError("name must be an array of bytes");
    }
    if (!is.array(namespace) || namespace.length !== 16) {
        throw new TypeError("namespace must be uuid string or an Array of 16 byte values");
    }

    // Per 4.3
    const bytes = uuid.__.sha1(namespace.concat(name));
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    if (buf) {
        for (let idx = 0; idx < 16; ++idx) {
            buf[off + idx] = bytes[idx];
        }
    }

    return buf || uuid.__.bytesToUuid(bytes);
};

// Pre-defined namespaces, per Appendix C
v5.DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
v5.URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

export default v5;
