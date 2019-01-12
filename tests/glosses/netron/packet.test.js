const {
    netron: { packet }
} = adone;

describe("Packet", () => {
    let pkt;

    beforeEach(() => {
        pkt = new packet.Packet();
    });

    it("initialization", () => {
        assert.equal(pkt.flags, 0);
        assert.undefined(pkt.id);
        assert.undefined(pkt.data);
    });

    it("set/get impulse bit", () => {
        assert.equal(pkt.getImpulse(), 0);
        pkt.setImpulse(1);
        assert.equal(pkt.getImpulse(), 1);
        assert.equal(pkt.flags, 0x80);
        pkt.setImpulse(0);
        assert.equal(pkt.getImpulse(), 0);
    });

    it("set/get error bit", () => {
        assert.equal(pkt.getError(), 0);
        pkt.setError(1);
        assert.equal(pkt.getError(), 1);
        assert.equal(pkt.flags, 0x40);
        pkt.setError(0);
        assert.equal(pkt.getError(), 0);
    });

    it("set/get action value", () => {
        pkt.setImpulse(1);
        assert.equal(pkt.getAction(), 0);
        pkt.setAction(0x34);
        assert.equal(pkt.getAction(), 0x34);
        assert.equal(pkt.getImpulse(), 1);
        assert.equal(pkt.getError(), 0);
        pkt.setAction(0x3F);
        assert.equal(pkt.getAction(), 0x3F);
        assert.equal(pkt.getImpulse(), 1);
        assert.equal(pkt.getError(), 0);
        pkt.setAction(0);
        assert.equal(pkt.getAction(), 0);
        assert.equal(pkt.getImpulse(), 1);
        assert.equal(pkt.getError(), 0);
    });

    it("set bigger action value should not rewrite impulse bit", () => {
        assert.equal(pkt.getAction(), 0);
        pkt.setAction(0xFF);
        assert.equal(pkt.getAction(), 0x3F);
        assert.equal(pkt.getImpulse(), 0);
    });

    it("create packet from values", () => {
        const id = 64;
        const impulse = 1;
        const action = 0x16;
        const data = {
            some: "data",
            luck: 777
        };

        const pkt = packet.create(id, impulse, action, data);

        assert.equal(pkt.getImpulse(), impulse);
        assert.equal(pkt.getAction(), action);
        assert.equal(pkt.id, id);
        assert.deepEqual(pkt.data, data);
    });

    it("encode/decode packet", () => {
        const pkt = packet.create(1, 1, 0x20, [1, 2, 3]);
        const decPkt = packet.decode(packet.encode(pkt));
        assert.deepEqual(pkt, decPkt);
    });
});
