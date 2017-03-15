describe("glosses", "databases", "mysql", "unit", "packets", "datetime", () => {
    const { database: { mysql: { packet: { Packet } } } } = adone;

    it("should read a datetime", () => {
        const buf = Buffer.from("0a000004000007dd070116010203", "hex");

        const packet = new Packet(4, buf, 0, buf.length);
        packet.readInt16();
        const d = adone.date(packet.readDateTime());
        const e = adone.date.utc(1358816523000);
        d.add(d.utcOffset(), "minutes");
        assert.equal(d.unix(), e.unix());
    });

    it("should work correctly", () => {
        const buf = Buffer.from("18000006000004666f6f310be00702090f01095d7f06000462617231", "hex");
        const packet = new Packet(6, buf, 0, buf.length);

        packet.readInt16();
        const s = packet.readLengthCodedString("cesu8");
        assert.equal(s, "foo1");
        const d = adone.date(packet.readDateTime());
        const e = adone.date.utc(1455030494821);
        d.add(d.utcOffset(), "minutes");
        assert.equal(d.unix(), e.unix());

        const s1 = packet.readLengthCodedString("cesu8");
        assert.equal(s1, "bar1");
        assert.equal(packet.offset, packet.end);
    });
});
