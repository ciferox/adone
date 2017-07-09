describe("database", "redis", "unit", "Commander", () => {
    const { database: { redis: { __: { Commander } } } } = adone;

    it("should pass the correct arguments", () => {
        stub(Commander.prototype, "sendCommand").callsFake((command) => {
            return command;
        });

        let command;

        const c = new Commander();
        command = c.call("set", "foo", "bar");
        expect(command.name).to.be.equal("set");
        expect(command.args[0]).to.be.equal("foo");
        expect(command.args[1]).to.be.equal("bar");

        command = c.callBuffer("set", ["foo", "bar"]);
        expect(command.name).to.be.equal("set");
        expect(command.args[0]).to.be.equal("foo");
        expect(command.args[1]).to.be.equal("bar");

        command = c.call("set", "foo", "bar", adone.noop);
        expect(command.name).to.be.equal("set");
        expect(command.args.length).to.be.equal(2);

        command = c.callBuffer("set", "foo", "bar", adone.noop);
        expect(command.name).to.be.equal("set");
        expect(command.args.length).to.be.equal(2);

        Commander.prototype.sendCommand.restore();
    });
});
