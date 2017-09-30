const {
    is,
    x
} = adone;

export default class Packet {
    constructor() {
        this.header = 0x80000000 >>> 0;
        this.id = undefined;
        this.streamId = undefined;
        this.data = undefined;
    }

    setStatus(status) {
        this.writeHeader(status, 8, Packet.HEADER_OFFSET_STATUS);
    }

    getStatus() {
        return this.readHeader(8, Packet.HEADER_OFFSET_STATUS);
    }
 
    setAction(action) {
        this.writeHeader(action, 8, Packet.HEADER_OFFSET_ACTION);
    }

    getAction() {
        return this.readHeader(8, Packet.HEADER_OFFSET_ACTION);
    }

    setImpulse(impulse) {
        impulse === 1 && this.setHeaderBit(Packet.HEADER_OFFSET_IMPULSE);
    }

    getImpulse() {
        return this.getHeaderBit(Packet.HEADER_OFFSET_IMPULSE);
    }

    setHeaderBit(bit) {
        this.header |= (1 << bit);
    }

    getHeaderBit(bit) {
        return (this.header >> bit) & 1;
    }

    writeHeader(val, bits, offset) {
        const maxOffset = offset + bits;
        if (val & 1) {
            this.header |= (1 << offset);
        }
        for (let i = offset + 1; i < maxOffset; ++i) {
            if (val & (1 << (i - offset))) {
                this.header |= (1 << i);
            }
        }
    }

    readHeader(bits, offset) {
        let val = 0 >>> 0;
        const maxOffset = offset + bits;
        for (let i = offset; i < maxOffset; ++i) {
            if (this.getHeaderBit(i)) {
                val |= (1 << (i - offset));
            }
        }
        return val;
    }

    get raw() {
        return [this.header, this.streamId, this.id, this.data];
    }

    static create(id, streamId, impulse, action, status, data) {
        const payload = new Packet();
        payload.setImpulse(impulse);
        payload.setStatus(status);
        payload.setAction(action);
        payload.streamId = streamId;
        payload.id = id;
        payload.data = data;

        return payload;
    }

    static from(packet) {
        if (!is.array(packet) || packet.length !== 4) {
            throw new x.NotValid("Bad packet");
        }

        const payload = new Packet();
        [payload.header, payload.streamId, payload.id, payload.data] = packet;
        return payload;
    }

    static HEADER_OFFSET_STATUS = 8 >>> 0;
    static HEADER_OFFSET_ACTION = 0 >>> 0;
    static HEADER_OFFSET_IMPULSE = 30 >>> 0;
}
