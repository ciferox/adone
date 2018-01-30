const {
    is,
    x
} = adone;

export default class Packet {
    constructor() {
        this.flags = 0x00;
        this.id = undefined;
        this.data = undefined;
    }

    setAction(action) {
        this.writeHeaderBits(action, 7, 0);
    }

    getAction() {
        return this.readHeaderBits(7, 0);
    }

    setImpulse(impulse) {
        impulse === 1 && this.setHeaderBit(7);
    }

    getImpulse() {
        return this.getHeaderBit(7);
    }

    setHeaderBit(bit) {
        this.flags |= (1 << bit);
    }

    getHeaderBit(bit) {
        return (this.flags >> bit) & 1;
    }

    writeHeaderBits(val, bits, offset) {
        const maxOffset = offset + bits;
        if (val & 1) {
            this.flags |= (1 << offset);
        }
        for (let i = offset + 1; i < maxOffset; ++i) {
            if (val & (1 << (i - offset))) {
                this.flags |= (1 << i);
            }
        }
    }

    readHeaderBits(bits, offset) {
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
        return [this.flags, this.id, this.data];
    }

    static create(id, impulse, action, data) {
        const payload = new Packet();
        payload.setImpulse(impulse);
        payload.setAction(action);
        payload.id = id;
        payload.data = data;

        return payload;
    }

    static from(rawPacket) {
        if (!is.array(rawPacket) || rawPacket.length !== 3) {
            throw new x.NotValid("Bad packet");
        }

        const packet = new Packet();
        [packet.flags, packet.id, packet.data] = rawPacket;
        return packet;
    }
}
