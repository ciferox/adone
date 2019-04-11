describe("archive", "zip", "pack", () => {
    const { std: { fs }, archive: { zip: { pack, unpack } }, collection: { BufferList } } = adone;

    it("should pack and unpack", async () => {
        const fileMetadata = {
            mtime: new Date(),
            mode: 0o100664
        };
        const zipfile = new pack.ZipFile();
        zipfile.addFile(__filename, "unicōde.txt");
        zipfile.addFile(__filename, "without-compression.txt", { compress: false });
        zipfile.addReadStream(fs.createReadStream(__filename), "readStream.txt", fileMetadata);
        const expectedContents = fs.readFileSync(__filename);
        zipfile.addBuffer(expectedContents, "with/directories.txt", fileMetadata);
        zipfile.addBuffer(expectedContents, "with\\windows-paths.txt", fileMetadata);
        const finalSize = await zipfile.end();
        expect(finalSize).to.be.equal(-1, "final size is impossible to know before compression");
        const data = await new Promise((resolve, reject) => {
            zipfile.outputStream.pipe(new BufferList((err, data) => {
                err ? reject(err) : resolve(data);
            }));
        });

        const zipFile = await unpack.fromBuffer(data, { lazyEntries: true });
        const buffers = [];
        for (; ;) {
            const entry = await zipFile.readEntry();
            if (adone.is.null(entry)) {
                break;
            }
            const readStream = await zipFile.openReadStream(entry);
            const data = await readStream.pipe(adone.stream.concat.create("buffer"));
            buffers.push(data);
        }
        expect(buffers).to.have.lengthOf(5);
        for (const buf of buffers) {
            expect(buf).to.be.deep.equal(expectedContents);
        }
    });

    describe("the final size prediction with zip64", () => {
        const zip64Combinations = [
            [0, 0, 0, 0, 0],
            [1, 1, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1]
        ];
        for (const zip64Config of zip64Combinations) {
            specify(`[${zip64Config.join(", ")}]`, async () => {
                const options = {
                    compress: false,
                    size: null,
                    forceZip64Format: false
                };
                const zipfile = new pack.ZipFile();
                options.forceZip64Format = Boolean(zip64Config[0]);
                zipfile.addFile(__filename, "asdf.txt", options);
                options.forceZip64Format = Boolean(zip64Config[1]);
                zipfile.addFile(__filename, "fdsa.txt", options);
                options.forceZip64Format = Boolean(zip64Config[2]);
                zipfile.addBuffer(Buffer.from("buffer"), "buffer.txt", options);
                options.forceZip64Format = Boolean(zip64Config[3]);
                options.size = "stream".length;
                zipfile.addReadStream(new BufferList().append("stream"), "stream.txt", options);
                options.size = null;
                const finalSize = await zipfile.end({ forceZip64Format: Boolean(zip64Config[4]) });
                if (finalSize === -1) {
                    throw new Error("finalSize should be known");
                }
                const data = await zipfile.outputStream.pipe(adone.stream.concat.create("buffer"));
                expect(finalSize).to.be.equal(data.length);
            });
        }
    });

    it("should keep the order", async () => {
        const zipfile = new pack.ZipFile();
        // all options parameters are optional
        zipfile.addFile(__filename, "a.txt");
        zipfile.addBuffer(Buffer.from("buffer"), "b.txt");
        zipfile.addReadStream(new BufferList().append("stream"), "c.txt");
        zipfile.addEmptyDirectory("d/");
        zipfile.addEmptyDirectory("e");
        const finalSize = await zipfile.end();
        expect(finalSize).to.be.equal(-1, "final size should be unknown");
        const data = await zipfile.outputStream.pipe(adone.stream.concat.create("buffer"));
        const zipFile = await unpack.fromBuffer(data, { lazyEntries: true });
        const expected = ["a.txt", "b.txt", "c.txt", "d/", "e/"];
        const actual = [];
        for (; ;) {
            const entry = await zipFile.readEntry();
            if (adone.is.null(entry)) {
                break;
            }
            actual.push(entry.fileName);
        }
        expect(actual).to.be.deep.equal(expected);
    });

    it("should predict the final size with buffers", async () => {
        const zipfile = new pack.ZipFile();
        // all options parameters are optional
        zipfile.addBuffer(Buffer.from("hello"), "hello.txt", { compress: false });
        const finalSize = await zipfile.end();
        expect(finalSize).not.to.be.equal(-1, "final size should be known");
        const data = await zipfile.outputStream.pipe(adone.stream.concat.create("buffer"));
        expect(data.length).to.be.equal(finalSize, "prediction is wrong");
        const zipFile = await unpack.fromBuffer(data, { lazyEntries: true });
        const actual = [];
        for (; ;) {
            const entry = await zipFile.readEntry();
            if (adone.is.null(entry)) {
                break;
            }
            actual.push(entry.fileName);
        }
        expect(actual).to.be.deep.equal(["hello.txt"]);
    });

    describe("comments", () => {
        const weirdChars = "\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";

        it("case 1", async () => {
            const testCases = [
                ["Hello World", "Hello World"],
                [Buffer.from("Hello"), "Hello"],
                [weirdChars, weirdChars]
            ];
            for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i];
                const zipfile = new pack.ZipFile();
                // eslint-disable-next-line no-await-in-loop
                const finalSize = await zipfile.end({
                    comment: testCase[0]
                });
                expect(finalSize).not.to.be.equal(-1, "final size should be known");
                // eslint-disable-next-line no-await-in-loop
                const data = await zipfile.outputStream.pipe(new BufferList());
                expect(data.length).to.be.equal(finalSize, "prediction is wrong");
                // eslint-disable-next-line no-await-in-loop
                const zipFile = await unpack.fromBuffer(data);
                expect(zipFile.comment).to.be.equal(testCase[1], "comment is wrong");
            }
        });

        // (function () {
        //     const zipfile = new yazl.ZipFile();
        //     try {
        //         zipfile.end({
        //             comment: bufferFrom("01234567890123456789" + "\x50\x4b\x05\x06" + "01234567890123456789")
        //         });
        //     } catch (e) {
        //         if (e.toString().indexOf("comment contains end of central directory record signature") !== -1) {
        //             console.log("block eocdr signature in comment: pass");
        //             return;
        //         }
        //     }
        //     throw new Error("expected error for including eocdr signature in comment");
        // })();

        // (function () {
        //     const testCases = [
        //         ["Hello World!", "Hello World!"],
        //         [bufferFrom("Hello!"), "Hello!"],
        //         [weirdChars, weirdChars]
        //     ];
        //     testCases.forEach((testCase, i) => {
        //         const zipfile = new yazl.ZipFile();
        //         // all options parameters are optional
        //         zipfile.addBuffer(bufferFrom("hello"), "hello.txt", { compress: false, fileComment: testCase[0] });
        //         zipfile.end((finalSize) => {
        //             if (finalSize === -1) {
        //                 throw new Error("finalSize should be known");
        //             }
        //             zipfile.outputStream.pipe(new BufferList(((err, data) => {
        //                 if (err) {
        //                     throw err;
        //                 }
        //                 if (data.length !== finalSize) {
        //                     throw new Error(`finalSize prediction is wrong. ${finalSize} !== ${data.length}`);
        //                 }
        //                 yauzl.fromBuffer(data, (err, zipfile) => {
        //                     if (err) {
        //                         throw err;
        //                     }
        //                     const entryNames = ["hello.txt"];
        //                     zipfile.on("entry", (entry) => {
        //                         let expectedName = entryNames.shift();
        //                         if (entry.fileComment !== testCase[1]) {
        //                             throw new Error(`fileComment is wrong. ${JSON.stringify(entry.fileComment)} !== ${JSON.stringify(testCase[1])}`);
        //                         }
        //                     });
        //                     zipfile.on("end", () => {
        //                         if (entryNames.length === 0) { console.log("fileComment(" + i + "): pass"); }
        //                     });
        //                 });
        //             })));
        //         });
        //     });
        // })();
    });
    // it("comment 1", async () => {
    //     const zipfile = new pack.ZipFile();
    //     const comment = "Hello World";
    //     // zipfile.comment = comment;
    //     const finalSize = await zipfile.end({
    //         comment
    //     });
    //     expect(finalSize).not.to.be.equal(-1, "final size should be known");
    //     const data = await zipfile.outputStream.pipe(new BufferList());
    //     expect(data.length).to.be.equal(finalSize, "prediction is wrong");
    //     const zipFile = await unpack.fromBuffer(data);
    //     expect(zipFile.comment).to.be.equal(comment, "fileComment didn't match");
    // });

    // it("comment 2", async (done) => {
    //     const fileComment = "Hello World";
    //     const zipfile = new pack.ZipFile();
    //     // all options parameters are optional
    //     zipfile.addBuffer(Buffer.from("hello"), "hello.txt", { compress: false, fileComment });
    //     const finalSize = await zipfile.end();
    //     expect(finalSize).not.to.be.equal(-1, "final size should be known");
    //     const data = await zipfile.outputStream.pipe(new BufferList());
    //     expect(data.length).to.be.equal(finalSize, "prediction is wrong");
    //     const zipFile = await unpack.fromBuffer(data);
    //     const entryNames = ["hello.txt"];
    //     zipFile.on("entry", (entry) => {
    //         entryNames.shift();
    //         expect(entry.comment).to.be.equal(fileComment, "fileComment didn't match");
    //     });
    //     zipFile.on("end", () => {
    //         if (entryNames.length === 0) {
    //             done();
    //         }
    //     });
    // });
});
