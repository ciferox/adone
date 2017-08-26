import writeToStream from "./writeToStream";

const { is } = adone;


class Accumulator extends adone.event.EventEmitter {
    constructor() {
        super();
        this._array = new Array(20);
        this._i = 0;
    }

    write(chunk) {
        this._array[this._i++] = chunk;
        return true;
    }

    concat() {
        let length = 0;
        const lengths = new Array(this._array.length);
        const list = this._array;
        let pos = 0;
        let i;

        for (i = 0; i < list.length && list[i]; i++) {
            if (!is.string(list[i])) {
                lengths[i] = list[i].length;
            } else {
                lengths[i] = Buffer.byteLength(list[i]);
            }

            length += lengths[i];
        }

        const result = Buffer.allocUnsafe(length);

        for (i = 0; i < list.length && list[i]; i++) {
            if (!is.string(list[i])) {
                list[i].copy(result, pos);
                pos += lengths[i];
            } else {
                result.write(list[i], pos);
                pos += lengths[i];
            }
        }

        return result;
    }
}

const generate = (packet) => {
    const stream = new Accumulator();
    writeToStream(packet, stream);
    return stream.concat();
};

export default generate;
