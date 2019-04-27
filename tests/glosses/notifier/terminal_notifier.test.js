describe("notifier", () => {
    const { std: { os, path }, notifier: { __: { util, notifiers: { Growl, NotificationCenter } } } } = adone;

    let notifier = null;
    const originalUtils = util.fileCommandJson;
    const originalMacVersion = util.isMountainLion;
    const originalType = os.type;

    const getOptionValue = (args, field) => {
        for (let i = 0; i < args.length; i++) {
            if (args[i] === field && i < args.length - 1) {
                return args[i + 1];
            }
        }
    };


    describe("Mac fallback", () => {
        const original = util.isMountainLion;
        const originalMac = util.isMac;

        afterEach(() => {
            util.isMountainLion = original;
            util.isMac = originalMac;
        });

        it("should default to Growl notification if older Mac OSX than 10.8", async () => {
            util.isMountainLion = function () {
                return false;
            };
            util.isMac = function () {
                return true;
            };
            const n = new NotificationCenter({ withFallback: true });
            stub(Growl.prototype, "notify").returns("Hello growl");
            expect(await n.notify({ message: "Hello World" })).to.be.equal("Hello growl");
            Growl.prototype.notify.restore();
        });

        it("should not fallback to Growl notification if withFallback is false", async () => {
            util.isMountainLion = function () {
                return false;
            };
            util.isMac = function () {
                return true;
            };
            const n = new NotificationCenter();

            await assert.throws(async () => {
                await n.notify({ message: "Hello World" });
            });
        });
    });

    describe("terminal-notifier", () => {
        beforeEach(() => {
            os.type = function () {
                return "Darwin";
            };

            util.isMountainLion = function () {
                return true;
            };
        });

        beforeEach(() => {
            notifier = new NotificationCenter();
        });

        afterEach(() => {
            os.type = originalType;
            util.isMountainLion = originalMacVersion;
        });

        // Simulate async operation, move to end of message queue.
        // function asyncify(fn) {
        //     return function () {
        //         const args = arguments;
        //         setTimeout(() => {
        //             fn.apply(null, args);
        //         }, 0);
        //     };
        // }

        describe("#notify()", () => {
            beforeEach(() => {
                util.fileCommandJson = async () => { };
            });

            afterEach(() => {
                util.fileCommandJson = originalUtils;
            });

            it("should notify with a message", async () => {
                await notifier.notify({ message: "Hello World" });
            });

            it("should be able to list all notifications", async () => {
                util.fileCommandJson = async () => {
                    return (await adone.fs.readFile(path.resolve(__dirname, "fixtures", "listAll.txt"))).toString();
                };

                const response = await notifier.notify({ list: "ALL" });
                expect(response).to.be.ok();
            });

            it("should be able to remove all messages", async () => {
                util.fileCommandJson = async () => {
                    return (await adone.fs.readFile(path.resolve(__dirname, "fixtures", "removeAll.txt"))).toString();
                };

                expect(await notifier.notify({ remove: "ALL" })).to.be.ok();

                util.fileCommandJson = async () => "";

                expect(await notifier.notify({ list: "ALL" })).not.to.be.ok();
            });
        });

        describe("arguments", () => {
            beforeEach(function () {
                this.original = util.fileCommandJson;
            });

            afterEach(function () {
                util.fileCommandJson = this.original;
            });

            it("should allow for non-sensical arguments (fail gracefully)", async () => {
                const expected = [
                    "-title",
                    '"title"',
                    "-message",
                    '"body"',
                    "-tullball",
                    '"notValid"',
                    "-timeout",
                    '"10"',
                    "-json",
                    '"true"'
                ];

                util.fileCommandJson = async (notifier, argsList) => {
                    expect(argsList).to.be.deep.equal(expected);
                };

                const notifier = new NotificationCenter();
                notifier.isNotifyChecked = true;
                notifier.hasNotifier = true;

                await notifier.notify({
                    title: "title",
                    message: "body",
                    tullball: "notValid"
                });
            });

            it("should validate and transform sound to default sound if Windows sound is selected", async () => {
                util.fileCommandJson = async (notifier, argsList) => {
                    expect(getOptionValue(argsList, "-title")).to.be.equal('"Heya"');
                    expect(getOptionValue(argsList, "-sound")).to.be.equal('"Bottle"');
                };

                const notifier = new NotificationCenter();
                await notifier.notify({
                    title: "Heya",
                    message: "foo bar",
                    sound: "Notification.Default"
                });
            });

            it("should convert list of actions to flat list", async () => {
                const expected = [
                    "-title",
                    '"title \\"message\\""',
                    "-message",
                    '"body \\"message\\""',
                    "-actions",
                    'foo,bar,baz "foo" bar',
                    "-timeout",
                    '"10"',
                    "-json",
                    '"true"'
                ];

                util.fileCommandJson = async (notifier, argsList) => {
                    expect(argsList).to.be.deep.equal(expected);
                };

                const notifier = new NotificationCenter();
                notifier.isNotifyChecked = true;
                notifier.hasNotifier = true;

                await notifier.notify({
                    title: 'title "message"',
                    message: 'body "message"',
                    actions: ["foo", "bar", 'baz "foo" bar']
                });
            });

            it("should still support wait flag with default timeout", async () => {
                const expected = [
                    "-title",
                    '"Title"',
                    "-message",
                    '"Message"',
                    "-timeout",
                    '"5"',
                    "-json",
                    '"true"'
                ];

                util.fileCommandJson = async (notifier, argsList) => {
                    expect(argsList).to.be.deep.equal(expected);
                };

                const notifier = new NotificationCenter();
                notifier.isNotifyChecked = true;
                notifier.hasNotifier = true;

                await notifier.notify({ title: "Title", message: "Message", wait: true });
            });

            it("should let timeout set precedence over wait", async () => {
                const expected = [
                    "-title",
                    '"Title"',
                    "-message",
                    '"Message"',
                    "-timeout",
                    '"10"',
                    "-json",
                    '"true"'
                ];

                util.fileCommandJson = async (notifier, argsList) => {
                    expect(argsList).to.be.deep.equal(expected);
                };

                const notifier = new NotificationCenter();
                notifier.isNotifyChecked = true;
                notifier.hasNotifier = true;

                await notifier.notify({
                    title: "Title",
                    message: "Message",
                    wait: true,
                    timeout: 10
                });
            });

            it("should escape all title and message", async () => {
                const expected = [
                    "-title",
                    '"title \\"message\\""',
                    "-message",
                    '"body \\"message\\""',
                    "-tullball",
                    '"notValid"',
                    "-timeout",
                    '"10"',
                    "-json",
                    '"true"'
                ];

                util.fileCommandJson = async (notifier, argsList) => {
                    expect(argsList).to.be.deep.equal(expected);
                };

                const notifier = new NotificationCenter();
                notifier.isNotifyChecked = true;
                notifier.hasNotifier = true;

                await notifier.notify({
                    title: 'title "message"',
                    message: 'body "message"',
                    tullball: "notValid"
                });
            });
        });
    });
});
