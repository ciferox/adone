const {
    stream: { pull: { ws2: WS }}
} = adone;

it("server .address should return bound address", async () => {
    const server = WS.createServer();
    await server.listen(55214);
    assert.equal(typeof server.address, "function");
    assert.equal(server.address().port, 55214, "return address should match");
    await server.close();
});
