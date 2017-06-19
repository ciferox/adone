const { util: { iconv } } = adone;

export const decode = (buffer, encoding, options) => {
    if (Buffer.isEncoding(encoding)) {
        return buffer.toString(encoding);
    }

    const decoder = iconv.getDecoder(encoding, options || {});

    const res = decoder.write(buffer);
    const trail = decoder.end();

    return trail ? (res + trail) : res;
};

export const encode = (string, encoding, options) => {
    if (Buffer.isEncoding(encoding)) {
        return Buffer.from(string, encoding);
    }

    const encoder = iconv.getEncoder(encoding, options || {});

    const res = encoder.write(string);
    const trail = encoder.end();

    return (trail && trail.length > 0) ? Buffer.concat([res, trail]) : res;
};
