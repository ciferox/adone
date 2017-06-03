describe("notifier", "growl", () => {
    const { notifier: { __: { notifiers: { Growl: Notify } } } } = adone;

    it("should have overridable host and port", () => {
        let notifier = new Notify();
        expect(notifier.options.host).to.be.undefined;
        expect(notifier.options.port).to.be.undefined;

        notifier = new Notify({ host: "foo", port: "bar" });
        expect(notifier.options.host).to.be.equal("foo");
        expect(notifier.options.port).to.be.equal("bar");
    });
});
