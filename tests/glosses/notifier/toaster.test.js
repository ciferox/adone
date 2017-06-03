describe("notifier", "WindowsToaster", () => {
    const { std: { os, path }, notifier: { __: { util, notifiers: { WindowsToaster: Notify } } } } = adone;

    const getOptionValue = (args, field) => {
        for (let i = 0; i < args.length; i++) {
            if (args[i] === field && i < args.length - 1) {
                return args[i + 1];
            }
        }
    };

    beforeEach(function () {
        this.original = util.fileCommand;
        this.originalType = os.type;
        this.originalArch = os.arch;
        this.originalRelease = os.release;
        os.release = function () {
            return "6.2.9200";
        };
        os.type = function () {
            return "Windows_NT";
        };
    });

    afterEach(function () {
        util.fileCommand = this.original;
        os.type = this.originalType;
        os.arch = this.originalArch;
        os.release = this.originalRelease;
    });

    it("should only pass allowed options and proper named properties", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(argsList).to.include("-t");
            expect(argsList).to.include("-m");
            expect(argsList).to.include("-w");
            expect(argsList).to.include("-p");
            expect(argsList).to.include("-id");
            expect(argsList).to.include("-appID");
            expect(argsList).to.include("-install");
            expect(argsList).to.include("-close");

            expect(argsList).not.to.include("-foo");
            expect(argsList).not.to.include("-bar");
            expect(argsList).not.to.include("-message");
            expect(argsList).not.to.include("-title");
        };
        const notifier = new Notify();

        await notifier.notify({
            title: "Heya",
            message: "foo bar",
            extra: "dsakdsa",
            foo: "bar",
            close: 123,
            bar: true,
            install: "/dsa/",
            appID: 123,
            icon: "file:///C:/coulson.jpg",
            id: 1337,
            sound: "Notification.IM",
            wait: true
        });
    });

    it("should pass wait and silent without parameters", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(getOptionValue(argsList, "-w")).not.to.be.equal("true");
            expect(getOptionValue(argsList, "-silent")).not.to.be.equal("true");
        };
        const notifier = new Notify();

        await notifier.notify({
            title: "Heya",
            message: "foo bar",
            wait: true,
            silent: true
        });
    });

    it("should default to empty app name", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(getOptionValue(argsList, "-appID")).to.be.equal(" ");
        };
        const notifier = new Notify();

        await notifier.notify({
            title: "Heya",
            message: "foo bar"
        });
    });

    it("should translate from notification centers appIcon", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(argsList).to.include("-p");
        };
        const notifier = new Notify();

        await notifier.notify({
            message: "Heya",
            appIcon: "file:///C:/coulson.jpg"
        });
    });

    it("should translate from remove to close", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(argsList).to.include("-close");
            expect(argsList).not.to.include("-remove");
        };
        const notifier = new Notify();

        await notifier.notify({ message: "Heya", remove: 3 });
    });

    it("should fail if neither close or message is defined", async () => {
        const notifier = new Notify();

        await assert.throws(async () => {
            await notifier.notify({ title: "Heya" });
        }, "Message or ID to close is required.");
    });

    it("should pass only close", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(argsList).to.include("-close");
        };
        const notifier = new Notify();

        await notifier.notify({ close: 3 });
    });

    it("should pass only message", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(argsList).to.include("-m");
        };
        const notifier = new Notify();

        await notifier.notify({ message: "Hello" });
    });

    it("should pass shorthand message", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(argsList).to.include("-m");
        };
        const notifier = new Notify();

        await notifier.notify("hello");
    });

    it("should wrap message and title", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(getOptionValue(argsList, "-t")).to.be.equal("Heya");
            expect(getOptionValue(argsList, "-m")).to.be.equal("foo bar");
        };
        const notifier = new Notify();

        await notifier.notify({ title: "Heya", message: "foo bar" });
    });

    it("should validate and transform sound to default sound if Mac sound is selected", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(getOptionValue(argsList, "-t")).to.be.equal("Heya");
            expect(getOptionValue(argsList, "-s")).to.be.equal("Notification.Default");
        };
        const notifier = new Notify();

        await notifier.notify({ title: "Heya", message: "foo bar", sound: "Frog" });
    });

    it("sound as true should select default value", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(getOptionValue(argsList, "-s")).to.be.equal("Notification.Default");
        };
        const notifier = new Notify();

        await notifier.notify({ message: "foo bar", sound: true });
    });

    it("sound as false should be same as silent", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(argsList).to.include("-silent");
        };
        const notifier = new Notify();

        await notifier.notify({ message: "foo bar", sound: false });
    });

    it("should override sound", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(getOptionValue(argsList, "-s")).to.be.equal("Notification.IM");
        };
        const notifier = new Notify();

        await notifier.notify({
            title: "Heya",
            message: "foo bar",
            sound: "Notification.IM"
        });
    });

    it("should parse file protocol URL of icon", async () => {
        util.fileCommand = function (notifier, argsList) {
            expect(argsList[1]).to.be.equal("C:\\coulson.jpg");
        };

        const notifier = new Notify();

        await notifier.notify({
            title: "Heya",
            message: "foo bar",
            icon: "file:///C:/coulson.jpg"
        });
    });

    it("should not parse local path of icon", async () => {
        const icon = path.resolve(__dirname, "fixtures", "coulson.jpg");
        util.fileCommand = function (notifier, argsList) {
            expect(argsList[1]).to.be.equal(icon);
        };

        const notifier = new Notify();
        await notifier.notify({ title: "Heya", message: "foo bar", icon });
    });

    it("should not parse normal URL of icon", async () => {
        const icon = "http://csscomb.com/img/csscomb.jpg";
        util.fileCommand = function (notifier, argsList) {
            expect(argsList[1]).to.be.equal(icon);
        };

        const notifier = new Notify();
        await notifier.notify({ title: "Heya", message: "foo bar", icon });
    });
});
