adone.lazify({
    json: () => adone.lazify({
        encode: () => (obj, { space } = {}) => Buffer.from(JSON.stringify(obj, null, space), "utf8"),
        decode: () => (buf) => JSON.parse(buf.toString())
    }, null, require),
    json5: "./json5",
    mpak: () => adone.lazify({
        Encoder: "./mpak/encoder",
        Decoder: "./mpak/decoder",
        Serializer: "./mpak",
        serializer: () => {
            // Reserved custom type ids:
            // 127 - adone exceptions
            // 126 - standart errors
            // 89 - adone.Long
            // 88 - adon.netron.Definition
            // 87 - adone.netron.Reference
            // 86 - adone.netron.Definitions

            const s = new adone.data.mpak.Serializer();

            // Here we register custom types for default serializer

            const decodeException = (buf) => {
                const id = buf.readUInt16BE();
                const message = s.decode(buf);
                const stack = s.decode(buf);
                return adone.x.create(id, message, stack);
            };

            // Adone exceptions encoders/decoders
            s.register(127, adone.x.Exception, (obj, buf) => {
                buf.writeUInt16BE(obj.id);
                s.encode(obj.message, buf);
                s.encode(obj.stack, buf);
            }, decodeException);

            // Std exceptions encoders/decoders
            s.register(126, Error, (obj, buf) => {
                buf.writeUInt16BE(adone.x.getStdId(obj));
                s.encode(obj.message, buf);
                s.encode(obj.stack, buf);
            }, decodeException);

            // Long encoder/decoder
            s.register(125, adone.math.Long, (obj, buf) => {
                buf.writeInt8(obj.unsigned ? 1 : 0);
                if (obj.unsigned) {
                    buf.writeUInt64BE(obj);
                } else {
                    buf.writeInt64BE(obj);
                }
            }, (buf) => {
                const unsigned = Boolean(buf.readInt8());
                return (unsigned ? buf.readUInt64BE() : buf.readInt64BE());
            });

            return s;
        },
        encode: () => (obj) => adone.data.mpak.serializer.encode(obj).flip().toBuffer(),
        decode: () => (buf) => adone.data.mpak.serializer.decode(buf),
        tryDecode: () => (buf) => adone.data.mpak.serializer.decoder.tryDecode(buf)
    }, null, require),
    bson: "./bson",
    base64: "./base64",
    yaml: "./yaml"
}, exports, require);
