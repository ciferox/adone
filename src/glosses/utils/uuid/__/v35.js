const { is, util: { uuid } } = adone;

const { util } = adone.private(uuid);

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

export default function v35(name, version, hashfunc) {
    const generateUUID = function (value, namespace, buf, offset) {
        const off = buf && offset || 0;

        if (is.string(value)) {
            value = stringToBytes(value);
        }
        if (is.string(namespace)) {
            namespace = uuidToBytes(namespace);
        }

        if (!is.array(value)) {
            throw new TypeError("value must be an array of bytes");
        }
        if (!is.array(namespace) || namespace.length !== 16) {
            throw new TypeError("namespace must be uuid string or an Array of 16 byte values");
        }

        // Per 4.3
        const bytes = hashfunc(namespace.concat(value));
        bytes[6] = (bytes[6] & 0x0f) | version;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        if (buf) {
            for (let idx = 0; idx < 16; ++idx) {
                buf[off + idx] = bytes[idx];
            }
        }

        return buf || util.bytesToUuid(bytes);
    };
    Object.defineProperty(generateUUID, "name", {
        value: name
    });

    // Pre-defined namespaces, per Appendix C
    generateUUID.DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    generateUUID.URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    return generateUUID;
}
