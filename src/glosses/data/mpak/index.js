

export default class Serializer {
    constructor(options) {
        this.options = Object.assign({ forceFloat64: false }, options);
        this._encodingTypes = [];
        this._decodingTypes = [];
        this._encoder = null;
        this._decoder = null;
    }

    registerEncoder(type, check, encode) {
        this._encodingTypes.push({ type, check, encode });
        return this;
    }

    registerDecoder(type, decode) {
        this._decodingTypes.push({ type, decode });
        return this;
    }

    register(type, constructor, encode, decode) {
        if (type < 0 || type > 127) {
            throw new RangeError(`Bad type: 0 <= ${type} <= 127`);
        }
        this.registerEncoder(type, (obj) => {
            return (obj instanceof constructor);
        }, (obj) => {
            const extBuf = new adone.ExBuffer();
            encode(obj, extBuf);
            return extBuf;
        });
        this.registerDecoder(type, decode);

        return this;
    }

    get encoder() {
        if (adone.is.null(this._encoder)) {
            this._encoder = new adone.data.mpak.Encoder(this._encodingTypes, this.options.forceFloat64);
        }
        return this._encoder;
    }

    get decoder() {
        if (adone.is.null(this._decoder)) {
            this._decoder = new adone.data.mpak.Decoder(this._decodingTypes);
        }
        return this._decoder;
    }

    encode(x, buf) {
        return this.encoder.encode(x, buf);
    }

    decode(buf, needFlip = true) {
        return this.decoder.decode(buf, needFlip);
    }
}
