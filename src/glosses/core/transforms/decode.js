export default class extends adone.Transform {
    constructor() {
        super();
        this.buf = new adone.ExBuffer(0);
        this.lpsz = null;
    }

    _transform(x) {
        const buffer = this.buf;
        buffer.write(x, buffer.limit);
        buffer.limit += x.length;
        
        for ( ; ; ) {
            if (buffer.remaining() <= 4) {
                break;
            }
            let packetSize = this.lpsz;
            if (packetSize === null) {
                this.lpsz = packetSize = buffer.readUInt32BE();
                buffer.compact();
            }
            if (buffer.remaining() < packetSize) {
                break;
            }
            const result = adone.data.mpak.tryDecode(buffer);
            if (result) {
                if (packetSize !== result.bytesConsumed) {
                    buffer.clear();
                    adone.error("invalid packet");
                    break;
                }
                buffer.compact();
                this.push(result.value);
                this.lpsz = null;
            }
        }
    }
}
