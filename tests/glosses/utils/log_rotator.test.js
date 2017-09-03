describe("util", "LogRotator", () => {
    const { util: { LogRotator }, fs, compressor: { gz }, promise } = adone;

    /**
     * @type {adone.fs.Directory}
     */
    let tmpdir;

    beforeEach(async () => {
        tmpdir = await fs.Directory.createTmp();
    });

    afterEach(async () => {
        await tmpdir.unlink();
    });

    const files = async () => (await tmpdir.filesSync()).map((x) => x.filename()).sort();

    describe("rotate", () => {
        it("should reindex previous logfiles", async () => {
            const logfile = tmpdir.getFile("file.log");
            await logfile.create();
            expect(await files()).to.be.deep.equal(["file.log"]);
            const rotator = new LogRotator(logfile.path(), {
                maxFiles: 3,
                compress: false
            });
            await logfile.write("hello");
            await rotator.rotate();
            expect(await files()).to.be.deep.equal(["file.log", "file.log.0"]);
            expect(await logfile.size()).to.be.equal(0);
            expect(await tmpdir.getFile("file.log.0").contents("utf8")).to.be.equal("hello");

            await logfile.write("world");
            await rotator.rotate();
            expect(await files()).to.be.deep.equal(["file.log", "file.log.0", "file.log.1"]);
            expect(await logfile.size()).to.be.equal(0);
            expect(await tmpdir.getFile("file.log.0").contents("utf8")).to.be.equal("world");
            expect(await tmpdir.getFile("file.log.1").contents("utf8")).to.be.equal("hello");

            await logfile.write("!");
            await rotator.rotate();
            expect(await files()).to.be.deep.equal(["file.log", "file.log.0", "file.log.1", "file.log.2"]);
            expect(await logfile.size()).to.be.equal(0);
            expect(await tmpdir.getFile("file.log.0").contents("utf8")).to.be.equal("!");
            expect(await tmpdir.getFile("file.log.1").contents("utf8")).to.be.equal("world");
            expect(await tmpdir.getFile("file.log.2").contents("utf8")).to.be.equal("hello");
        });

        it("should not create more than maxFiles files", async () => {
            const logfile = tmpdir.getFile("file.log");
            await logfile.create();
            expect(await files()).to.be.deep.equal(["file.log"]);
            const rotator = new LogRotator(logfile.path(), {
                maxFiles: 3,
                compress: false
            });
            for (let i = 0; i < 10; ++i) {
                await logfile.write(`${i}`);
                await rotator.rotate();
            }
            expect(await files()).to.be.deep.equal(["file.log", "file.log.0", "file.log.1", "file.log.2"]);
            expect(await logfile.size()).to.be.equal(0);
            expect(await tmpdir.getFile("file.log.0").contents("utf8")).to.be.equal("9");
            expect(await tmpdir.getFile("file.log.1").contents("utf8")).to.be.equal("8");
            expect(await tmpdir.getFile("file.log.2").contents("utf8")).to.be.equal("7");
        });

        it("should compress files when compress = true and add gz prefix", async () => {
            const logfile = tmpdir.getFile("file.log");
            await logfile.create();

            const rotator = new LogRotator(logfile.path(), {
                maxFiles: 3,
                compress: true
            });

            logfile.write("hello");
            await rotator.rotate();
            expect(await files()).to.be.deep.equal(["file.log", "file.log.0.gz"]);
            {
                const compressed = await tmpdir.getFile("file.log.0.gz").contents("buffer");
                const decompressed = await gz.decompress(compressed);
                expect(decompressed).to.be.deep.equal(Buffer.from("hello"));
            }

            logfile.write("world");
            await rotator.rotate();
            expect(await files()).to.be.deep.equal(["file.log", "file.log.0.gz", "file.log.1.gz"]);
            {
                const compressed = await tmpdir.getFile("file.log.0.gz").contents("buffer");
                const decompressed = await gz.decompress(compressed);
                expect(decompressed).to.be.deep.equal(Buffer.from("world"));
            }
            {
                const compressed = await tmpdir.getFile("file.log.1.gz").contents("buffer");
                const decompressed = await gz.decompress(compressed);
                expect(decompressed).to.be.deep.equal(Buffer.from("hello"));
            }
        });
    });

    it("should understand human readable size", () => {
        const logfile = tmpdir.getFile("file.log");
        const rotator = new LogRotator(logfile.path(), {
            maxSize: "10mb"
        });
        expect(rotator.maxSize).to.be.equal(10 * 1024 * 1024);
    });

    it("should understand numerical size", () => {
        const logfile = tmpdir.getFile("file.log");
        const rotator = new LogRotator(logfile.path(), {
            maxSize: 10 * 1024 * 1024
        });
        expect(rotator.maxSize).to.be.equal(10 * 1024 * 1024);
    });

    it("should understand human readable time", () => {
        const logfile = tmpdir.getFile("file.log");
        const rotator = new LogRotator(logfile.path(), {
            checkInterval: "10.5 minutes"
        });
        expect(rotator.checkInterval).to.be.equal(10.5 * 60 * 1000);
    });

    it("should understand numerical time", () => {
        const logfile = tmpdir.getFile("file.log");
        const rotator = new LogRotator(logfile.path(), {
            checkInterval: 10.5 * 60 * 1000
        });
        expect(rotator.checkInterval).to.be.equal(10.5 * 60 * 1000);
    });

    it("should autocheck after start and stop after stop", async () => {
        const logfile = tmpdir.getFile("file.log");
        await logfile.create();
        const rotator = new LogRotator(logfile.path(), {
            maxSize: "10 kb",
            checkInterval: 200
        });
        rotator.start();

        expect(await files()).to.be.deep.equal(["file.log"]);
        await promise.delay(500);
        expect(await files()).to.be.deep.equal(["file.log"]);

        await logfile.append("hello");
        await promise.delay(500);
        expect(await files()).to.be.deep.equal(["file.log"]);

        await logfile.append("world");
        await promise.delay(500);
        expect(await files()).to.be.deep.equal(["file.log"]);

        await logfile.append(Buffer.alloc(100500).fill(13));
        await promise.delay(500);
        expect(await files()).to.be.deep.equal(["file.log", "file.log.0.gz"]);

        await logfile.append(Buffer.alloc(100500).fill(13));
        await promise.delay(500);
        expect(await files()).to.be.deep.equal(["file.log", "file.log.0.gz", "file.log.1.gz"]);

        rotator.stop();

        await logfile.append(Buffer.alloc(100500).fill(13));
        await promise.delay(500);
        expect(await files()).to.be.deep.equal(["file.log", "file.log.0.gz", "file.log.1.gz"]);
        expect(await logfile.size()).to.be.equal(100500);
    });

    it("should throw if maxSize is invalid", async () => {
        const logfile = tmpdir.getFile("file.log");
        await logfile.create();
        assert.throws(() => {
            new LogRotator(logfile.path(), {
                maxSize: "10wtf",
                checkInterval: 200
            });
        }, "invalid maxSize");
    });

    it("should throw if checkInterval is invalid", async () => {
        const logfile = tmpdir.getFile("file.log");
        await logfile.create();
        assert.throws(() => {
            new LogRotator(logfile.path(), {
                maxSize: "10kb",
                checkInterval: "10___"
            });
        }, "invalid checkInterval");
    });
});
