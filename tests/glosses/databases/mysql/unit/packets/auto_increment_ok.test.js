describe("database", "mysql", "unit", "packets", "ok", () => {
    const { database: { mysql: { __: { packet } } } } = adone;

    it("should have correct length", () => {
        const p = packet.OK.toPacket({ affectedRows: 0, insertId: 1 });
        // 5 bytes for an OK packet, plus one byte to store affectedRows plus one byte to store the insertId
        assert.equal(
            p.length(),
            11,
            `OK packets with 0 affectedRows and a minimal insertId should be 11 bytes long, got ${p.length()} byte(s)`
        );
    });
});

