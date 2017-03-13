describe("glosses", "databases", "redis", "unit", "Commander", () => {
    const { database: { redis: { Commander } } } = adone;

    it("should pass the correct arguments", () => {
        stub(Commander.prototype, "sendCommand").callsFake((command) => {
            return command;
        });

        let command;

        const c = new Commander();
        command = c.call("set", "foo", "bar");
        expect(command.name).to.eql("set");
        expect(command.args[0]).to.eql("foo");
        expect(command.args[1]).to.eql("bar");

        command = c.callBuffer("set", ["foo", "bar"]);
        expect(command.name).to.eql("set");
        expect(command.args[0]).to.eql("foo");
        expect(command.args[1]).to.eql("bar");

        command = c.call("set", "foo", "bar", () => { });
        expect(command.name).to.eql("set");
        expect(command.args.length).to.eql(2);

        command = c.callBuffer("set", "foo", "bar", () => { });
        expect(command.name).to.eql("set");
        expect(command.args.length).to.eql(2);

        Commander.prototype.sendCommand.restore();
    });
});
