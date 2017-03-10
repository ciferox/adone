import { PrependBOM, StripBOM } from "./bom_handling";

const { is, x } = adone;

const iconv = adone.lazify({
    encodings: "./encodings"
}, exports, require);

// Characters emitted in case of error.
export const defaultCharUnicode = "�";
export const defaultCharSingleByte = "?";

// Search for a codec in iconv.encodings. Cache codec data in iconv._codecDataCache.
export const _codecDataCache = new Map();

export const getCodec = (encoding) => {
    // Canonicalize encoding name: strip all non-alphanumeric chars and appended year.
    let enc = (String(encoding)).toLowerCase().replace(/[^0-9a-z]|:\d{4}$/g, "");

    // Traverse iconv.encodings to find actual codec.
    const codecOptions = {};
    while (true) {  // eslint-disable-line no-constant-condition
        let codec = _codecDataCache.get(enc);
        if (codec) {
            return codec;
        }

        const CodecDef = iconv.encodings[enc];

        switch (typeof CodecDef) {
            case "string": {  // Direct alias to other encoding.
                enc = CodecDef;
                break;
            }
            case "object": {  // Alias with options. Can be layered.
                for (const key in CodecDef) {
                    codecOptions[key] = CodecDef[key];
                }

                if (!codecOptions.encodingName) {
                    codecOptions.encodingName = enc;
                }

                enc = CodecDef.type;
                break;
            }
            case "function": {  // Codec itself.
                if (!codecOptions.encodingName) {
                    codecOptions.encodingName = enc;
                }

                // The codec function must load all tables and return object with .encoder and .decoder methods.
                // It'll be called only once (for each different options object).
                codec = new CodecDef(codecOptions, iconv);

                _codecDataCache.set(codecOptions.encodingName, codec);  // Save it to be reused later.
                return codec;
            }
            default: {
                throw new x.Unknown(`Encoding not recognized: '${encoding}' (searched as: '${enc}')`);
            }
        }
    }
};

export const getEncoder = (encoding, options) => {
    const codec = getCodec(encoding);
    let encoder = new codec.encoder(options, codec);

    if (codec.bomAware && options && options.addBOM) {
        encoder = new PrependBOM(encoder, options);
    }

    return encoder;
};

export const getDecoder = (encoding, options) => {
    const codec = getCodec(encoding);
    let decoder = new codec.decoder(options, codec);

    if (codec.bomAware && !(options && options.stripBOM === false)) {
        decoder = new StripBOM(decoder, options);
    }

    return decoder;
};


export const encode = (str, encoding, options) => {
    str = String(str || "");

    const encoder = getEncoder(encoding, options);

    const res = encoder.write(str);
    const trail = encoder.end();

    return (trail && trail.length > 0) ? Buffer.concat([res, trail]) : res;
};

export const decode = (buf, encoding, options) => {
    if (is.string(buf)) {
        buf = Buffer.from(buf, "binary");  // Ensure buffer.
    }

    const decoder = getDecoder(encoding, options);

    const res = decoder.write(buf);
    const trail = decoder.end();

    return trail ? (res + trail) : res;
};

export const encodingExists = (enc) => {
    try {
        getCodec(enc);
        return true;
    } catch (e) {
        return false;
    }
};
