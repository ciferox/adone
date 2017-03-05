import adone from "adone";

export default class extends adone.Transform {
    _transform(x) {
        // В самом начале длина пакета без учёта этих 4-х байт.
        const buf = new adone.ExBuffer().skip(4);
        const encoded = adone.data.mpak.encode(x, buf).flip();
        encoded.writeUInt32BE(encoded.remaining() - 4, 0);
        this.push(encoded.toBuffer());
    }
}
