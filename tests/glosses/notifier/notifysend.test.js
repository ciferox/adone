describe("notifier", "notify-send", () => {
    const { is, std: { os }, notifier: { __: { util, notifiers: { NotifySend: Notify } } } } = adone;

    beforeEach(function () {
        this.original = util.command;
        this.originalType = os.type;
        os.type = function () {
            return "Linux";
        };
    });

    afterEach(function () {
        util.command = this.original;
        os.type = this.originalType;
    });

    it("should pass on title and body", async () => {
        const expected = ['"title"', '"body"'];
        util.command = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        const notifier = new Notify({ suppressOsdCheck: true });
        await notifier.notify({ title: "title", message: "body" });
    });

    it("should pass have default title", async () => {
        const expected = ['"Node Notification"', '"body"'];

        util.command = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };

        const notifier = new Notify({ suppressOsdCheck: true });
        await notifier.notify({ message: "body" });
    });

    it("should throw error if no message is passed", async () => {
        util.command = function (notifier, argsList) {
            expect(argsList).to.be.undefined();
        };

        const notifier = new Notify({ suppressOsdCheck: true });
        await assert.throws(async () => {
            await notifier.notify({});
        }, "Message is required");
    });

    it("should escape message input", async () => {
        const excapedNewline = is.windows ? "\\r\\n" : "\\n";
        const expected = [
            '"Node Notification"',
            `"some${excapedNewline} \\"me'ss\\\`age\\\`\\""`
        ];

        util.command = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };

        const notifier = new Notify({ suppressOsdCheck: true });
        await notifier.notify({ message: 'some\n "me\'ss`age`"' });
    });

    it('should send additional parameters as --"keyname"', async () => {
        const expected = ['"title"', '"body"', "--icon", '"icon-string"'];

        util.command = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };

        const notifier = new Notify({ suppressOsdCheck: true });
        await notifier.notify({ title: "title", message: "body", icon: "icon-string" });
    });

    it("should remove extra options that are not supported by notify-send", async () => {
        const expected = ['"title"', '"body"', "--icon", '"icon-string"', "--expire-time", '"100"'];

        util.command = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };

        const notifier = new Notify({ suppressOsdCheck: true });
        await notifier.notify({
            title: "title",
            message: "body",
            icon: "icon-string",
            time: 100,
            tullball: "notValid"
        });
    }
    );
});
