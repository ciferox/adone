describe("fast", "transform", "notify", () => {
    const { fast } = adone;
    const { transform: { notify }, File } = fast;

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

    it("should return a stream", (done) => {
        const stream = notify({
            notifier: mockGenerator()
        });
        expect(stream).to.be.ok;
        expect(stream.on).to.be.ok;
        expect(stream.pipe).to.be.ok;
        done();
    });

    it("should allow setting of own reporter", (done) => {
        const stream = notify({ notifier: mockGenerator() });
        expect(stream).to.be.ok;
        expect(stream.on).to.be.ok;
        expect(stream.pipe).to.be.ok;
        done();
    });

    it("should be able to override default icon", (done) => {
        const testString = "this is a test";
        const expectedIcon = "testIcon";

        const expectedFile = getFile("1.txt");

        const outstream = notify({
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
        });

        outstream.resume().write(expectedFile);
    });

    it("should emit error when sub-module returns error and emitError is true", (done) => {
        const testString = "testString";
        const instream = fast.src(srcPath).on("error", adone.noop);
        const outstream = notify({
            message: testString,
            emitError: true,
            notifier: async () => {
                throw new Error(testString);
            }
        });

        outstream.on("error", (error) => {
            expect(error).to.be.ok;
            expect(error.message).to.be.ok;
            expect(String(error.message)).to.be.equal(testString);

            done();
        });

        instream.pipe(outstream).resume();
    });

    it("should pass on files", (done) => {
        const instream = fast.src(srcPath);
        const outstream = notify({ notifier: mockGenerator() });

        let numFilesBefore = 0;
        let numFilesAfter = 0;

        instream.through(function (file) {
            numFilesBefore++;
            this.push(file);
        }, () => {
            expect(numFilesBefore).to.be.equal(3);
        }).pipe(outstream).through(function (file) {
            numFilesAfter++;
            this.push(file);
        }, () => {
            expect(numFilesAfter).to.be.equal(3);
            done();
        }).resume();
    });

    it("should emit error when sub-module throws exception/error and emitError flag is true", (done) => {
        const testString = "some exception";
        const instream = fast.src(srcPath).on("error", adone.noop);
        const outstream = notify({
            message: testString,
            notifier() {
                throw new Error(testString);
            },
            emitError: true
        });

        outstream.on("error", (error) => {
            expect(error).to.be.ok;
            expect(error.message).to.be.ok;
            expect(String(error.message)).to.be.equal(testString);

            done();
        });

        instream.pipe(outstream).resume();
    });

    it("should not emit error when sub-module throws exception/error if emitError flag is false (default)", (done) => {

        const testString = "some exception";
        const expectedFile = getFile("1.txt");
        const outstream = notify({
            message: testString,
            notifier() {
                throw new Error(testString);
            }
        });

        outstream.on("error", (error) => {
            done(error);
        });

        outstream.on("end", () => {
            done();
        });

        outstream.write(expectedFile);
        outstream.end();
        outstream.resume();
    });

    it("should default to notifying file path and default title", (done) => {
        const srcFile = fromdir.getFile("1.txt").path();
        const instream = fast.src(srcFile);
        const outstream = notify({
            notifier: mockGenerator((opts) => {
                expect(opts).to.be.ok;
                expect(opts.title).to.be.ok;
                expect(opts.message).to.be.ok;
                expect(String(opts.message)).to.be.equal(srcFile);
                expect(String(opts.title)).to.be.equal("Notification");
                done();
            })
        });

        outstream.on("data", (file) => {
            expect(file).to.be.ok;
            expect(file.path).to.be.ok;
            expect(file.contents).to.be.ok;
        });

        instream.pipe(outstream).resume();
    });

    it("should take function with file as argument, as message or title", (done) => {
        const testSuffix = "tester";
        const srcFile = fromdir.getFile("1.txt").path();
        const instream = fast.src(srcFile);
        const outstream = notify({
            notifier: mockGenerator((opts) => {
                expect(opts).to.be.ok;
                expect(opts.title).to.be.ok;
                expect(opts.message).to.be.ok;
                expect(String(opts.message)).to.be.equal(srcFile + testSuffix);
                expect(String(opts.title)).to.be.equal(srcFile + testSuffix);
                done();
            }),
            message(file) {
                expect(String(file.path)).to.be.equal(srcFile);

                return file.path + testSuffix;
            },
            title(file) {
                expect(String(file.path)).to.be.equal(srcFile);

                return file.path + testSuffix;
            }
        });

        outstream.on("data", (file) => {
            expect(file).to.be.ok;
            expect(file.path).to.be.ok;
            expect(file.contents).to.be.ok;
        });

        instream.pipe(outstream).resume();
    });

    it("should notify on all files per default", (done) => {
        const instream = fast.src(srcPath);
        let numFunctionCalls = 0;
        const outstream = notify({
            notifier: mockGenerator((opts) => {
                expect(opts).to.be.ok;
                expect(opts.title).to.be.ok;
                expect(opts.message).to.be.ok;
                numFunctionCalls++;
            })
        });

        outstream.on("data", (file) => {
            expect(file).to.be.ok;
            expect(file.path).to.be.ok;
            expect(file.contents).to.be.ok;
        });

        outstream.on("end", () => {
            expect(numFunctionCalls).to.be.equal(3);
            done();
        });

        instream.pipe(outstream).resume();
    });

    it("should handle streamed files", (done) => {
        const expectedFile = getFile("1.txt", { stream: true });

        const testString = "testString";

        const outstream = notify({
            message: testString,
            notifier: mockGenerator((opts) => {
                expect(opts).to.be.ok;
                expect(opts.title).to.be.ok;
                expect(opts.message).to.be.ok;
                expect(String(opts.message)).to.be.equal(testString);
            })
        });

        outstream.on("error", (err) => {
            expect(err).not.to.be.ok;
        });

        outstream.on("data", (file) => {
            expect(file).to.be.ok;
            expect(file.isStream()).to.be.ok;
            expect(file.path).to.be.ok;
            expect(file.contents).to.be.ok;
            done();
        });

        outstream.resume().write(expectedFile);
    });

    it("should support lodash template for titles and messages", (done) => {
        const expectedFile = getFile("1.txt");

        const testString = "Template: <%= file.relative %>";
        const expectedString = "Template: 1.txt";

        const outstream = notify({
            message: testString,
            title: testString,
            notifier: mockGenerator((opts) => {
                expect(opts).to.be.ok;
                expect(opts.title).to.be.ok;
                expect(opts.message).to.be.ok;
                expect(String(opts.message)).to.be.equal(expectedString);
                expect(String(opts.title)).to.be.equal(expectedString);
            })
        });

        outstream.on("error", (err) => {
            expect(err).not.to.be.ok;
        });

        outstream.on("data", (file) => {
            expect(file).to.be.ok;
            expect(file.path).to.be.ok;
            expect(file.contents).to.be.ok;
            done();
        });

        outstream.resume().write(expectedFile);
    });

    context("onLast", () => {
        it("should only notify on the last file, if onLast flag is activated", (done) => {
            const instream = fast.src(srcPath);
            let numFunctionCalls = 0;
            const outstream = notify({
                onLast: true,
                notifier: mockGenerator((opts) => {
                    expect(opts).to.be.ok;
                    expect(opts.title).to.be.ok;
                    expect(opts.message).to.be.ok;
                    numFunctionCalls++;
                })
            });

            outstream.on("data", (file) => {
                expect(file).to.be.ok;
                expect(file.path).to.be.ok;
                expect(file.contents).to.be.ok;
            });

            outstream.on("end", () => {
                expect(numFunctionCalls).to.be.equal(1);
                done();
            });

            instream.pipe(outstream).resume();
        });

        it("should stream all files even if onLast is activated", (done) => {
            const instream = fast.src(srcPath);
            const outstream = notify({
                onLast: true,
                notifier: mockGenerator()
            });

            let numFilesBefore = 0;
            let numFilesAfter = 0;

            instream.through(function (file) {
                numFilesBefore++;
                this.push(file);
            }, () => {
                expect(numFilesBefore).to.be.equal(3);
            }).pipe(outstream).through(function (file) {
                numFilesAfter++;
                this.push(file);
            }, () => {
                expect(numFilesAfter).to.be.equal(3);

                done();
            }).resume();
        });

        it("should support lodash template for titles and messages when onLast", (done) => {
            const instream = fast.src(srcPath);
            let numFunctionCalls = 0;
            const outstream = notify({
                onLast: true,
                message: "Template: <%= file.relative %>",
                notifier: mockGenerator((opts) => {
                    expect(opts).to.be.ok;
                    expect(opts.title).to.be.ok;
                    expect(opts.message).to.be.ok;
                    expect(opts.message.startsWith("Template:")).to.be.true;
                    expect(opts.message.endsWith(".txt")).to.be.true;

                    numFunctionCalls++;
                })
            });

            outstream.on("data", (file) => {
                expect(file).to.be.ok;
                expect(file.path).to.be.ok;
                expect(file.contents).to.be.ok;
            });

            outstream.on("end", () => {
                expect(numFunctionCalls).to.be.equal(1);

                done();
            });

            instream.pipe(outstream).resume();
        });
    });

    describe("notify.onError()", () => {

        it("should have defined onError function on object", (done) => {
            expect(notify.onError).to.be.ok;
            done();
        });

        it("should call end on stream", (done) => {
            const onError = notify.onError({
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
            const onError = notify.onError({
                notifier: mockGenerator((opts) => {
                    expect(opts).to.be.ok;
                    expect(opts.title).to.be.ok;
                    expect(opts.message).to.be.ok;
                    expect(String(opts.message)).to.be.equal(testMessage);
                    expect(String(opts.title)).to.be.equal("Error");

                    done();
                })
            });

            fast.src(srcPath).through(function () {
                this.emit("error", new adone.x.Exception(testMessage));
            }).on("error", onError).resume();
        });

        it("should support lodash template for titles and messages on onError", (done) => {
            const testString = "Template: <%= error.message %>";
            const expectedString = "Template: test";
            const onError = notify.onError({
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

            fast.src(srcPath).through(function () {
                this.emit("error", new adone.x.Exception("test"));
            }).on("error", onError).resume();
        });
    });
});
