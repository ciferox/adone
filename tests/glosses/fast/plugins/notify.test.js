describe("fast", "transform", "notify", () => {
    const { fast } = adone;
    const { Fast, File } = fast;

    const plugin = fast.getPlugin("notify");

    const mockGenerator = (tester) => {
        tester = tester || function () { };
        return async (opts) => {
            tester(opts);
        };
    };

    let fromdir;
    let root;
    let srcPath;
    const streams = [];

    const getFile = (f, { stream } = {}) => {
        f = fromdir.getFile(f);
        const file = new File({
            path: f.path(),
            cwd: root.path(),
            base: fromdir.path()
        });
        if (stream) {
            const fstream = f.contentsStream();
            streams.push(fstream);
            file.contents = fstream;
        } else {
            file.contents = f.contentsSync();
        }
        return file;
    };

    before(async () => {
        root = await adone.fs.Directory.createTmp();
        fromdir = await root.addDirectory("from");
        await FS.createStructure(fromdir, ["1.txt", "2.txt", "3.txt"]);
        srcPath = fromdir.getFile("**", "*").path();
    });

    after(async () => {
        streams.map((x) => x.close());
        await root.unlink();
    });

    it("should be able to override default icon", (done) => {
        const testString = "this is a test";
        const expectedIcon = "testIcon";

        const expectedFile = getFile("1.txt");

        new Fast([expectedFile]).notify({
            message: testString,
            icon: expectedIcon,
            notifier: mockGenerator((opts) => {
                expect(opts).to.have.property("title");
                expect(opts).to.have.property("message");
                expect(opts).to.have.property("icon");
                expect(String(opts.icon)).to.be.equal(expectedIcon);
                expect(String(opts.message)).to.be.equal(testString);

                done();
            })
        }).resume();
    });

    it("should emit error when sub-module returns error and emitError is true", async () => {
        const testString = "testString";

        const error = await assert.throws(async () => {
            await fast.src(srcPath).notify({
                message: testString,
                emitError: true,
                notifier: async () => {
                    throw new Error(testString);
                }
            });
        });

        expect(error).to.be.ok;
        expect(error.message).to.be.ok;
        expect(String(error.message)).to.be.equal(testString);
    });

    it("should pass on files", async () => {
        const files = await fast.src(srcPath).notify({ notifier: mockGenerator() });
        expect(files).to.have.length(3);
    });

    it("should emit error when sub-module throws exception/error and emitError flag is true", async () => {
        const testString = "some exception";

        const error = await assert.throws(async () => {
            await fast.src(srcPath).notify({
                message: testString,
                notifier() {
                    throw new Error(testString);
                },
                emitError: true
            });
        });

        expect(error).to.be.ok;
        expect(error.message).to.be.ok;
        expect(String(error.message)).to.be.equal(testString);
    });

    it("should not emit error when sub-module throws exception/error if emitError flag is false (default)", async () => {

        const testString = "some exception";
        const expectedFile = getFile("1.txt");

        await new Fast([expectedFile]).notify({
            message: testString,
            notifier() {
                throw new Error(testString);
            }
        });
    });

    it("should default to notifying file path and default title", async () => {
        const srcFile = fromdir.getFile("1.txt").path();
        const onNotify = spy();
        const [file] = await fast.src(srcFile).notify({
            notifier: mockGenerator(onNotify)
        });
        expect(file).to.be.ok;
        expect(file.path).to.be.ok;
        expect(file.contents).to.be.ok;

        expect(onNotify).to.have.been.calledOnce;
        const [opts] = onNotify.args[0];
        expect(opts).to.be.ok;
        expect(opts.title).to.be.ok;
        expect(opts.message).to.be.ok;
        expect(String(opts.message)).to.be.equal(srcFile);
        expect(String(opts.title)).to.be.equal("Notification");
    });

    it("should take function with file as argument, as message or title", async () => {
        const testSuffix = "tester";
        const srcFile = fromdir.getFile("1.txt").path();
        const onNotify = spy();
        const onMessage = stub().callsFake((file) => {
            return file.path + testSuffix;
        });
        const onTitle = stub().callsFake((file) => {
            return file.path + testSuffix;
        });
        const [file] = await fast.src(srcFile).notify({
            notifier: mockGenerator(onNotify),
            message: onMessage,
            title: onTitle
        });

        expect(file).to.be.ok;
        expect(file.path).to.be.ok;
        expect(file.contents).to.be.ok;

        expect(onTitle).to.have.been.calledOnce;
        expect(onTitle).to.have.been.calledWithMatch((x) => x.path === srcFile);
        expect(onMessage).to.have.been.calledOnce;
        expect(onMessage).to.have.been.calledWithMatch((x) => x.path === srcFile);
        expect(onNotify).to.have.been.calledOnce;
        const [opts] = onNotify.args[0];
        expect(opts).to.be.ok;
        expect(opts.title).to.be.ok;
        expect(opts.message).to.be.ok;
        expect(String(opts.message)).to.be.equal(srcFile + testSuffix);
        expect(String(opts.title)).to.be.equal(srcFile + testSuffix);
    });

    it("should notify on all files per default", async () => {
        const onNotify = stub().callsFake((opts) => {
            expect(opts).to.be.ok;
            expect(opts.title).to.be.ok;
            expect(opts.message).to.be.ok;
        });
        const files = await fast.src(srcPath).notify({
            notifier: mockGenerator(onNotify)
        });
        expect(files).to.have.lengthOf(3);
        for (const file of files) {
            expect(file).to.be.ok;
            expect(file.path).to.be.ok;
            expect(file.contents).to.be.ok;
        }
        expect(onNotify).to.have.been.calledThrice;
    });

    it("should handle streamed files", async () => {
        const expectedFile = getFile("1.txt", { stream: true });

        const testString = "testString";

        const onNotify = stub().callsFake((opts) => {
            expect(opts).to.be.ok;
            expect(opts.title).to.be.ok;
            expect(opts.message).to.be.ok;
            expect(String(opts.message)).to.be.equal(testString);
        });

        const [file] = await new Fast([expectedFile]).notify({
            message: testString,
            notifier: mockGenerator(onNotify)
        });

        expect(file).to.be.ok;
        expect(file.isStream()).to.be.ok;
        expect(file.path).to.be.ok;
        expect(file.contents).to.be.ok;

        expect(onNotify).to.have.been.calledOnce;
    });

    it("should support lodash template for titles and messages", async () => {
        const expectedFile = getFile("1.txt");

        const testString = "Template: <%= file.relative %>";
        const expectedString = "Template: 1.txt";

        const onNotify = stub().callsFake((opts) => {
            expect(opts).to.be.ok;
            expect(opts.title).to.be.ok;
            expect(opts.message).to.be.ok;
            expect(String(opts.message)).to.be.equal(expectedString);
            expect(String(opts.title)).to.be.equal(expectedString);
        });

        const [file] = await new Fast([expectedFile]).notify({
            message: testString,
            title: testString,
            notifier: mockGenerator(onNotify)
        });

        expect(file).to.be.ok;
        expect(file.path).to.be.ok;
        expect(file.contents).to.be.ok;
        expect(onNotify).to.have.been.calledOnce;
    });

    context("onLast", () => {
        it("should only notify on the last file, if onLast flag is activated", async () => {
            const onNotify = stub().callsFake((opts) => {
                expect(opts).to.be.ok;
                expect(opts.title).to.be.ok;
                expect(opts.message).to.be.ok;
            });
            const files = await fast.src(srcPath).notify({
                onLast: true,
                notifier: mockGenerator(onNotify)
            });
            expect(files).to.have.length(3);
            for (const file of files) {
                expect(file).to.be.ok;
                expect(file.path).to.be.ok;
                expect(file.contents).to.be.ok;
            }
            expect(onNotify).to.have.been.calledOnce;
        });

        it("should support lodash template for titles and messages when onLast", async () => {
            const onNotify = stub().callsFake((opts) => {
                expect(opts).to.be.ok;
                expect(opts.title).to.be.ok;
                expect(opts.message).to.be.ok;
                expect(opts.message.startsWith("Template:")).to.be.true;
                expect(opts.message.endsWith(".txt")).to.be.true;
            });
            const files = await fast.src(srcPath).notify({
                onLast: true,
                message: "Template: <%= file.relative %>",
                notifier: mockGenerator(onNotify)
            });
            expect(files).to.have.length(3);
            for (const file of files) {
                expect(file).to.be.ok;
                expect(file.path).to.be.ok;
                expect(file.contents).to.be.ok;
            }
            expect(onNotify).to.have.been.calledOnce;
        });
    });

    describe("notify.onError()", () => {

        it("should have defined onError function on object", (done) => {
            expect(plugin.onError).to.be.ok;
            done();
        });

        it("should call end on stream", (done) => {
            const onError = plugin.onError({
                notifier: mockGenerator(adone.noop),
                endStream: true
            });

            const stream = adone.stream.core(null, {
                transform() {
                    this.emit("error", "error");
                }
            });

            stream.on("error", onError).on("end", done);

            stream.resume().write({});
        });

        it("should be limited by notifying on error if th onError-option is passed", (done) => {
            const testMessage = "tester";
            const onError = plugin.onError({
                notifier: mockGenerator((opts) => {
                    expect(opts).to.be.ok;
                    expect(opts.title).to.be.ok;
                    expect(opts.message).to.be.ok;
                    expect(String(opts.message)).to.be.equal(testMessage);
                    expect(String(opts.title)).to.be.equal("Error");

                    done();
                })
            });

            fast.src(srcPath).through(() => {
                throw new adone.x.Exception(testMessage);
            }).on("error", onError).resume();
        });

        it("should support lodash template for titles and messages on onError", (done) => {
            const testString = "Template: <%= error.message %>";
            const expectedString = "Template: test";
            const onError = plugin.onError({
                message: testString,
                title: testString,
                notifier: mockGenerator((opts) => {
                    expect(opts).to.be.ok;
                    expect(opts.title).to.be.ok;
                    expect(opts.message).to.be.ok;
                    expect(String(opts.message)).to.be.equal(expectedString);
                    expect(String(opts.title)).to.be.equal(expectedString);

                    done();
                })
            });

            fast.src(srcPath).through(() => {
                throw new adone.x.Exception("test");
            }).on("error", onError).resume();
        });
    });
});
