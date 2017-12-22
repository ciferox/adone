describe("notifier", "WindowsBalloon", () => {
    const { std: { os }, notifier: { __: { util, notifiers: { WindowsBalloon: Notify } } } } = adone;

    beforeEach(function () {
        this.original = util.immediateFileCommand;
        this.originalType = os.type;
        this.originalArch = os.arch;
        os.type = function () {
            return "Windows_NT";
        };
    });

    afterEach(function () {
        util.immediateFileCommand = this.original;
        os.type = this.originalType;
        os.arch = this.originalArch;
    });

    it("should use 64 bit notifu", async () => {
        os.arch = function () {
            return "x64";
        };
        const expected = "notifu64.exe";
        util.immediateFileCommand = function (notifier) {
            expect(notifier.endsWith(expected)).to.be.true();
        };

        await new Notify().notify({ title: "title", message: "body" });
    });

    it("should use 32 bit notifu if 32 arch", async () => {
        os.arch = function () {
            return "ia32";
        };
        const expected = "notifu.exe";
        util.immediateFileCommand = function (notifier) {
            expect(notifier.endsWith(expected)).to.be.true();
        };
        await new Notify().notify({ title: "title", message: "body" });
    });

    it("should pass on title and body", async () => {
        const expected = ["-m", "body", "-p", "title", "-q"];
        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        await new Notify().notify({ title: "title", message: "body" });
    });

    it("should pass have default title", async () => {
        const expected = ["-m", "body", "-q", "-p", "Node Notification:"];
        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        await new Notify().notify({ message: "body" });
    });

    it("should throw error if no message is passed", async () => {
        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.undefined();
        };
        await assert.throws(async () => {
            await new Notify().notify({});
        }, "Message is required");
    });

    it("should escape message input", async () => {
        const expected = [
            "-m",
            'some "me\'ss`age`"',
            "-q",
            "-p",
            "Node Notification:"
        ];
        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        await new Notify().notify({ message: 'some "me\'ss`age`"' });
    });

    it("should be able to deactivate silent mode", async () => {
        const expected = ["-m", "body", "-p", "Node Notification:"];
        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        await new Notify().notify({ message: "body", sound: true });
    });

    it("should be able to deactivate silent mode, by doing quiet false", async () => {
        const expected = ["-m", "body", "-p", "Node Notification:"];
        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        await new Notify().notify({ message: "body", quiet: false });
    });

    it("should send set time", async () => {
        const expected = ["-m", "body", "-p", "title", "-d", "1000", "-q"];
        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        await new Notify().notify({ title: "title", message: "body", time: "1000" });
    });

    it("should not send false flags", async () => {
        const expected = [
            "-d",
            "1000",
            "-i",
            "icon",
            "-m",
            "body",
            "-p",
            "title",
            "-q"
        ];

        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        await new Notify().notify({
            title: "title",
            message: "body",
            d: "1000",
            icon: "icon",
            w: false
        });
    });

    it('should send additional parameters as --"keyname"', async () => {
        const expected = [
            "-d",
            "1000",
            "-w",
            "-i",
            "icon",
            "-m",
            "body",
            "-p",
            "title",
            "-q"
        ];

        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };

        await new Notify().notify({
            title: "title",
            message: "body",
            d: "1000",
            icon: "icon",
            w: true
        });
    });

    it("should remove extra options that are not supported by notifu", async () => {
        const expected = ["-m", "body", "-p", "title", "-q"];
        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        await new Notify().notify({
            title: "title",
            message: "body",
            tullball: "notValid"
        });
    });

    it("should have both type and duration options", async () => {
        const expected = [
            "-m",
            "body",
            "-p",
            "title",
            "-q",
            "-d",
            "10",
            "-t",
            "info"
        ];

        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };

        await new Notify().notify({
            title: "title",
            message: "body",
            type: "info",
            t: 10
        });
    });

    it("should sanitize wrong string type option to info", async () => {
        const expected = ["-m", "body", "-p", "title", "-q", "-t", "info"];

        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };

        await new Notify().notify({
            title: "title",
            message: "body",
            type: "theansweris42"
        });
    });

    it("should sanitize type option to error", async () => {
        const expected = ["-m", "body", "-p", "title", "-q", "-t", "error"];
        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        await new Notify().notify({ title: "title", message: "body", type: "ErRoR" });
    });

    it("should sanitize wring integer type option to info", async () => {
        const expected = ["-m", "body", "-p", "title", "-q", "-t", "info"];
        util.immediateFileCommand = function (notifier, argsList) {
            expect(argsList).to.be.deep.equal(expected);
        };
        await new Notify().notify({ title: "title", message: "body", type: 42 });
    });
});
