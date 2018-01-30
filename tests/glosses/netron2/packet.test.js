const {
    netron2: { Packet }
} = adone;

describe("Packet", () => {
    let packet;

    beforeEach(() => {
        packet = new Packet();
    });

    it("initialization", () => {
        assert.equal(packet.flags, 0);
        assert.undefined(packet.id);
        assert.undefined(packet.data);
    });

    it("set/get impulse bit", () => {
        assert.equal(packet.getImpulse(), 0);
        packet.setImpulse(1);
        assert.equal(packet.getImpulse(), 1);
        assert.equal(packet.flags, 0x80);
        packet.setImpulse(0);
        assert.equal(packet.getImpulse(), 0);
    });

    it("set/get action value", () => {
        packet.setImpulse(1);
        assert.equal(packet.getAction(), 0);
        packet.setAction(0x34);
        assert.equal(packet.getAction(), 0x34);
        assert.equal(packet.getImpulse(), 1);
        packet.setAction(0x7F);
        assert.equal(packet.getAction(), 0x7F);
        assert.equal(packet.getImpulse(), 1);
        packet.setAction(0);
        assert.equal(packet.getAction(), 0);
        assert.equal(packet.getImpulse(), 1);
    });

    it("set bigger action value should not rewrite impulse bit", () => {
        assert.equal(packet.getAction(), 0);
        packet.setAction(0xFF);
        assert.equal(packet.getAction(), 0x7F);
        assert.equal(packet.getImpulse(), 0);
    });

    it("get raw packet", () => {
        packet.setImpulse(1);
        packet.setAction(0x43);
        packet.data = "ok";
        packet.id = 10;

        const rawPacket = packet.raw;

        assert.deepEqual(rawPacket, [(1 << 7) | 0x43, 10, "ok"]);
    });

    it("create packet from values", () => {
        const id = 64;
        const impulse = 1;
        const action = 0x16;
        const data = {
            some: "data",
            luck: 777
        };

        const packet = Packet.create(id, impulse, action, data);

        assert.equal(packet.getImpulse(), impulse);
        assert.equal(packet.getAction(), action);
        assert.equal(packet.id, id);
        assert.deepEqual(packet.data, data);
    });

    it("create packet from raw", () => {
        const id = 64;
        const impulse = 1;
        const action = 0x16;
        const data = {
            some: "data",
            luck: 777
        };

        const rawPacket = [(impulse << 7) | action, id, data];

        const packet = Packet.from(rawPacket);

        assert.equal(packet.getImpulse(), impulse);
        assert.equal(packet.getAction(), action);
        assert.equal(packet.id, id);
        assert.deepEqual(packet.data, data);
    });
});
