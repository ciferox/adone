describe("fs", "TailWatcher", () => {
    const { fs } = adone;
    const { TailWatcher } = fs;

    /**
     * @type {adone.fs.Directory}
     */
    let tmpdir;

    /**
     * @type {adone.fs.File}
     */
    let tmpfile;

    before(async () => {
        tmpdir = await fs.Directory.createTmp();
    });

    beforeEach(async () => {
        tmpfile = await tmpdir.addFile("file.log", { contents: "" });
    });

    afterEach(async () => {
        await tmpdir.clean();
    });

    after(async () => {
        await tmpdir.unlink();
    });

    const lineEndings = [{ le: "\r\n", desc: "Windows" }, { le: "\n", desc: "Linux" }];

    for (const { le, desc } of lineEndings) {
        // eslint-disable-next-line no-loop-func
        it(`should read a file with ${desc} line ending`, async () => {
            const text = `This is a ${desc} line ending${le}`;
            const expectedText = `This is a ${desc} line ending`;

            const tailedFile = new TailWatcher(tmpfile.path(), { encoding: "utf8" });

            const s = spy();
            tailedFile.on("line", s);
            const p = s.waitForNCalls(100);

            const fd = await fs.open(tmpfile.path(), "w+");
            for (let i = 0; i < 100; ++i) {
                // eslint-disable-next-line no-await-in-loop
                await fs.appendFile(fd, text);
            }
            await fs.close(fd);
            await p;
            tailedFile.unwatch();
            for (let i = 0; i < 100; ++i) {
                const call = s.getCall(i);
                expect(call).to.have.been.calledWithExactly(expectedText);
            }
        });
    }
});
