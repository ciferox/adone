describe("archive", "zip", "unpack", () => {
    const { archive: { zip }, std: { stream: { Readable, Writable } }, fs } = adone;

    const earliestTimestamp = new Date(2014, 7, 18, 0, 0, 0, 0);

    const thisDir = new adone.fs.Directory(__dirname);

    const openWithRandomAccess = async (zipfilePath, options, implementRead) => {
        class InefficientRandomAccessReader extends fs.AbstractRandomAccessReader {
            _readStreamForRange(start, end) {
                return adone.std.fs.createReadStream(zipfilePath, { start, end: end - 1 });
            }
        }

        if (implementRead) {
            InefficientRandomAccessReader.prototype.read = async (buffer, offset, length, position) => {
                const fd = await adone.fs.open(zipfilePath, "r");
                const bytesRead = await adone.fs.read(fd, buffer, offset, length, position);
                if (bytesRead < length) {
                    throw new Error("unexpected EOF");
                }
            };
        }

        const stats = await adone.fs.stat(zipfilePath);
        const reader = new InefficientRandomAccessReader();
        return zip.unpack.fromRandomAccessReader(reader, stats.size, options);
    };

    const addUnicodeSupport = (name) => {
        // reading and writing unicode filenames on mac is broken.
        // we keep all our test data ascii, and then swap in the real names here.
        // see https://github.com/thejoshwolfe/yauzl/issues/10
        name = name.replace(/Turmion Katilot/g, "Turmion Kätilöt");
        name = name.replace(/Mista veri pakenee/g, "Mistä veri pakenee");
        name = name.replace(/qi ge fangjian/g, "七个房间");
        return name;
    };

    const manuallyDecodeFileName = (fileName) => {
        // file names in this test suite are always utf8 compatible.
        fileName = fileName.toString("utf8");
        fileName = fileName.replace("\\", "/");
        if (fileName === "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f") {
            // we're not doing the unicode path extra field decoding outside of yauzl.
            // just hardcode this answer.
            fileName = "七个房间.txt";
        }
        return fileName;
    };

    const forceLF = (buf) => {
        const CRLF = Buffer.from("\r\n");
        const LF = Buffer.from("\n");
        const res = [];
        for (; ;) {
            const i = buf.indexOf(CRLF);
            if (i === -1) {
                break;
            }
            res.push(buf.slice(0, i), LF);
            buf = buf.slice(i + 2);
        }
        res.push(buf);
        return Buffer.concat(res);
    };

    describe("success", () => {
        const files = [];
        for (const d of ["success"/*, "wrong-entry-sizes"*/]) {
            const dir = thisDir.getDirectory(d);
            files.push(...dir.filesSync().filter((x) => x instanceof adone.fs.File));
        }
        for (const file of files) {
            const optionConfigurations = [
                // you can find more options coverage in the failure tests.
                { lazyEntries: true },
                { lazyEntries: true, decodeStrings: false }
            ];
            if (/wrong-entry-sizes/.test(file.path())) {
                optionConfigurations.forEach((options) => {
                    options.validateEntrySizes = false;
                });
            }
            const openFunctions = [
                (options) => zip.unpack.open(file.path(), options),
                (options) => zip.unpack.fromBuffer(adone.std.fs.readFileSync(file.path()), options),
                (options) => openWithRandomAccess(file.path(), options, true),
                (options) => openWithRandomAccess(file.path(), options, false)
            ];
            for (const [i, openFunction] of adone.util.enumerate(openFunctions)) {
                for (const [j, options] of adone.util.enumerate(optionConfigurations)) {
                    const relativePath = file.relativePath(thisDir);
                    const testId = `${relativePath}(${["fd", "buffer", "randomAccess", "minimalRandomAccess"][i]},${j}, lazy = ${options.lazyEntries}): `;
                    // eslint-disable-next-line no-loop-func
                    it(testId, async () => {
                        const expectedArchiveContents = {};
                        const DIRECTORY = Symbol("directory");

                        const unpackedDir = new adone.fs.Directory(file.dirname()).getDirectory(file.stem());

                        (function find(dir) {
                            const files = dir.filesSync();
                            for (const file of files) {
                                const key = addUnicodeSupport(file.relativePath(unpackedDir).replace(/\\/g, "/"));
                                if (file instanceof adone.fs.File) {
                                    switch (file.filename()) {
                                        case ".git_please_make_this_directory":
                                            // ignore
                                            break;
                                        case ".dont_expect_an_empty_dir_entry_for_this_dir":
                                            delete expectedArchiveContents[key];
                                            break;
                                        default:
                                            // normal file
                                            expectedArchiveContents[key] = file.contentsSync(null);
                                            break;
                                    }
                                } else {
                                    expectedArchiveContents[key] = DIRECTORY;
                                    find(file);
                                }
                            }
                        })(unpackedDir);

                        const zipfile = await openFunction(options);

                        const handle = async (entry) => {
                            let fileName = entry.fileName;
                            let fileComment = entry.fileComment;
                            if (options.decodeStrings === false) {
                                if (fileName.constructor !== Buffer) {
                                    throw new Error(`${testId}expected fileName to be a Buffer`);
                                }
                                fileName = manuallyDecodeFileName(fileName);
                                fileComment = manuallyDecodeFileName(fileComment);
                            }
                            if (fileComment !== "") {
                                throw new Error(`${testId}expected empty fileComment`);
                            }
                            const messagePrefix = `${testId + fileName}: `;
                            const timestamp = entry.getLastModDate();
                            if (timestamp < earliestTimestamp) {
                                throw new Error(`${messagePrefix}timestamp too early: ${timestamp}`);
                            }
                            if (timestamp > new Date()) {
                                throw new Error(`${messagePrefix}timestamp in the future: ${timestamp}`);
                            }
                            const fileNameKey = fileName.replace(/\/$/, "");
                            const expectedContents = expectedArchiveContents[fileNameKey];
                            if (adone.is.nil(expectedContents)) {
                                throw new Error(`${messagePrefix}not supposed to exist`);
                            }
                            delete expectedArchiveContents[fileNameKey];
                            if (fileName !== fileNameKey) {
                                // directory
                            } else {
                                const isEncrypted = entry.isEncrypted();
                                const isCompressed = entry.isCompressed();
                                if (/traditional-encryption/.test(relativePath) !== isEncrypted) {
                                    throw new Error("expected traditional encryption in the traditional encryption test cases");
                                }

                                let readStream;

                                if (isEncrypted) {
                                    readStream = await zipfile.openReadStream(entry, {
                                        decrypt: false,
                                        decompress: isCompressed ? false : null
                                    });
                                } else {
                                    readStream = await zipfile.openReadStream(entry);
                                }

                                const actualContents = await readStream.pipe(adone.stream.concat.create("buffer"));
                                // console.log(adone.inspect(actualContents));
                                if (Buffer.compare(Buffer.from(actualContents), expectedContents) !== 0) {
                                    throw new Error(`${messagePrefix}wrong contents`);
                                }
                            }
                        };
                        await new Promise((resolve, reject) => {
                            zipfile.readEntry();
                            zipfile.on("entry", (entry) => {
                                handle(entry).then(() => zipfile.readEntry()).catch(reject);
                            });
                            zipfile.on("end", () => {
                                resolve();
                            });
                        });

                        for (const fileName in expectedArchiveContents) {
                            if (expectedArchiveContents[fileName] !== DIRECTORY) {
                                throw new Error(`${testId + fileName}: missing file`);
                            }
                        }
                    });
                }
            }
        }
    });

    describe("failure", () => {
        const files = thisDir.getDirectory("failure")
            .filesSync()
            .filter((x) => x instanceof adone.fs.File);
        for (const file of files) {
            // eslint-disable-next-line no-loop-func
            it(file.relativePath(thisDir), async () => {
                const expectedErrorMessage = adone.std.path.basename(file.relativePath(thisDir)).replace(/(_\d+)?\.zip$/, "");
                let failedYet = false;
                let emittedError = false;
                let operationsInProgress = 0;
                const checkErrorMessage = (err) => {
                    const actualMessage = err.message.replace(/[^0-9A-Za-z-]+/g, " ");
                    if (actualMessage !== expectedErrorMessage) {
                        throw new Error(`wrong error message: ${actualMessage}`);
                    }
                    failedYet = true;
                    operationsInProgress = -Infinity;
                };
                try {
                    let zipfile;
                    // const zipfile = await zip.unpack.open(file.path());
                    if (/invalid characters in fileName/.test(file.path())) {
                        // this error can only happen when you specify an option
                        // yauzl.open(zipfilePath, { strictFileNames: true }, onZipFile);
                        zipfile = await zip.unpack.open(file.path(), { strictFileNames: true });
                    } else {
                        zipfile = await zip.unpack.open(file.path());
                        // yauzl.open(zipfilePath, onZipFile);
                    }

                    await new Promise((resolve, reject) => {
                        const noEventsAllowedAfterError = () => {
                            if (emittedError) {
                                reject(new Error("events emitted after error event"));
                            }
                        };

                        const doneWithSomething = () => {
                            operationsInProgress -= 1;
                            if (operationsInProgress !== 0) {
                                return;
                            }
                            if (!failedYet) {
                                reject(new Error("unexpected failure"));
                            }
                        };

                        zipfile.on("error", (err) => {
                            noEventsAllowedAfterError();
                            emittedError = true;
                            reject(err);
                        });
                        zipfile.on("entry", (entry) => {
                            noEventsAllowedAfterError();
                            // let's also try to read directories, cuz whatever.
                            operationsInProgress += 1;
                            zipfile.openReadStream(entry).then((stream) => {
                                stream.on("error", (err) => {
                                    reject(err);
                                });
                                stream.on("data", () => {
                                    // ignore
                                });
                                stream.on("end", () => {
                                    doneWithSomething();
                                });
                            }, reject);
                        });
                        operationsInProgress += 1;
                        zipfile.on("end", () => {
                            noEventsAllowedAfterError();
                            doneWithSomething();
                        });
                    });
                } catch (err) {
                    checkErrorMessage(err);
                }
            });
        }
    });

    describe("fromRandomAccessReader", () => {
        specify("errors", async () => {
            class TestRandomAccessReader extends fs.AbstractRandomAccessReader {
                _readStreamForRange(start, end) {
                    const brokenator = new Readable();
                    brokenator._read = function (size) {
                        brokenator.emit("error", new Error("all reads fail"));
                    };
                    return brokenator;
                }
            }

            const reader = new TestRandomAccessReader();
            const err = await zip.unpack.fromRandomAccessReader(reader, 0x1000).then(() => null, (e) => e);
            expect(err).not.to.be.null();
            expect(err.message).to.be.equal("all reads fail");
        });
    });

    specify("abort open read stream", async () => {
        const prefix = "abort open read stream: ";
        const zipfile = await zip.unpack.open(adone.path.join(__dirname, "big-compression.zip"), { lazyEntries: true });

        await new Promise((resolve, reject) => {
            let doneWithStream = false;

            zipfile.readEntry();
            zipfile.on("entry", async (entry) => {
                const readStream = await zipfile.openReadStream(entry);
                const writer = new Writable();
                let bytesSeen = 0;
                writer._write = function (chunk, encoding, callback) {
                    bytesSeen += chunk.length;
                    if (bytesSeen < entry.uncompressedSize / 10) {
                        // keep piping a bit longer
                        callback();
                    } else {
                        // alright, i've seen enough.
                        doneWithStream = true;
                        readStream.unpipe(writer);
                        readStream.destroy();

                        // now keep trying to use the fd
                        zipfile.readEntry();
                    }
                };
                readStream.pipe(writer);
            });
            zipfile.on("end", () => {

            });
            zipfile.on("close", () => {
                if (doneWithStream) {
                    resolve();
                } else {
                    reject(new Error(`${prefix}closed prematurely`));
                }
            });
            zipfile.on("error", (err) => {
                reject(err);
            });
        });
    });

    specify("zip64", async () => {
        const largeBinLength = 8000000000;
        const newLargeBinContentsProducer = () => {
            // emits the fibonacci sequence:
            // 0, 1, 1, 2, 3, 5, 8, 13, ...
            // with each entry encoded in a UInt32BE.
            // arithmetic overflow will happen eventually, resulting in wrap around.
            // as a consequence of limited precision, this sequence repeats itself after 6442450944 entires.
            // however, we only require 2000000000 entires, so it's good enough.
            const readStream = new Readable();
            let prev0 = -1;
            let prev1 = 1;
            let byteCount = 0;
            readStream._read = () => {
                for (; ;) {
                    if (byteCount >= largeBinLength) {
                        readStream.push(null);
                        return;
                    }
                    const bufferSize = Math.min(0x10000, largeBinLength - byteCount);
                    const buffer = Buffer.alloc(bufferSize);
                    for (let i = 0; i < bufferSize; i += 4) {
                        const n = ((prev0 + prev1) & 0xffffffff) >>> 0;
                        prev0 = prev1;
                        prev1 = n;
                        byteCount += 4;
                        buffer.writeUInt32BE(n, i, true);
                    }
                    readStream.emit("progress", byteCount, largeBinLength);
                    if (!readStream.push(buffer)) {
                        return;
                    }
                }
            };
            readStream.destroy = function () { };
            return readStream;
        };
        const makeRandomAccessReader = () => {
            const dir = thisDir.getDirectory("zip64");
            const file = dir.getFile("zip64.zip_fragment");
            const backendContents = file.contentsSync(null);
            if (backendContents.length <= 4) {
                throw new Error("unexpected EOF");
            }
            const largeBinContentsOffset = backendContents.readUInt32BE(0) - 4;
            if (largeBinContentsOffset > backendContents.length) {
                throw new Error(".zip_fragment header is malformed");
            }
            const largeBinContentsEnd = largeBinContentsOffset + largeBinLength;
            let firstRead = true;
            const pretendSize = backendContents.length + largeBinLength - 4;


            class InflatingRandomAccessReader extends fs.AbstractRandomAccessReader {
                _readStreamForRange(start, end) {
                    const thisIsTheFirstRead = firstRead;
                    firstRead = false;
                    const result = new adone.collection.BufferList();
                    if (end <= largeBinContentsOffset) {
                        result.append(backendContents.slice(start + 4, end + 4));
                    } else if (start >= largeBinContentsOffset + largeBinLength) {
                        result.append(backendContents.slice(start - largeBinLength + 4, end - largeBinLength + 4));
                    } else if (start === largeBinContentsOffset && end === largeBinContentsEnd) {
                        return newLargeBinContentsProducer();
                    } else if (thisIsTheFirstRead && start > largeBinContentsOffset && end === pretendSize) {
                        // yauzl's first move is to cast a large net to try to find the EOCDR.
                        // yauzl's only going to care about the end of this data, so fill in the gaps with dummy data.
                        const dummyTrash = Buffer.alloc(largeBinContentsEnd - start);
                        result.append(dummyTrash);
                        result.append(backendContents.slice(largeBinContentsOffset + 4));
                    } else {
                        throw new Error(`_readStreamForRange(${start}, ${end}) misaligned to range [${largeBinContentsOffset}, ${largeBinContentsEnd}]`);
                    }
                    result.destroy = function () { };
                    return result;
                }
            }

            const reader = new InflatingRandomAccessReader();
            return [reader, pretendSize];
        };
        const prefixLength = 0x100;
        const getPrefixOfStream = async (stream) => {
            const prefixBuffer = Buffer.alloc(prefixLength);
            const writer = new Writable();
            return new Promise((resolve) => {
                writer._write = function (chunk, encoding, callback) {
                    chunk.copy(prefixBuffer, 0, 0, prefixLength);
                    stream.unpipe(writer);
                    resolve(prefixBuffer);
                };
                stream.pipe(writer);
            });
        };
        const getPrefixOfLargeBinContents = () => getPrefixOfStream(newLargeBinContentsProducer());

        const [reader, size] = makeRandomAccessReader();
        const zipfile = await zip.unpack.fromRandomAccessReader(reader, size, { lazyEntries: true });
        const expected = [
            { name: "a.txt", contents: "hello a\n" },
            { name: "large.bin", contents: null },
            { name: "b.txt", contents: "hello b\n" }
        ];
        for (const { name, contents } of expected) {
            const entry = await zipfile.readEntry();
            if (entry.fileName !== name) {
                throw new Error(`expected 'a.txt'. got '${entry.fileName}'.`);
            }
            const readStream = await zipfile.openReadStream(entry);
            if (!adone.is.null(contents)) {
                const data = await readStream.pipe(adone.stream.concat.create("string"));
                if (data.toString() !== contents) {
                    throw new Error(`expected contents:\n${contents}\ngot:\n${data.toString()}\n`);
                }
            } else {
                const expectedPrefixBuffer = await getPrefixOfLargeBinContents();
                const actualPrefixBuffer = await getPrefixOfStream(readStream);
                readStream.destroy();
                if (Buffer.compare(expectedPrefixBuffer, actualPrefixBuffer) !== 0) {
                    throw new Error("large.bin contents read did not return expected stream");
                }
            }
        }
    });

    specify("openReadStream with range", async () => {
        const zipfileBuffer = Buffer.from("" +
            "504b03040a00000000006a54954ab413389510000000100000000a001c007374" +
            "6f7265642e7478745554090003d842fa5842c5f75875780b000104e803000004" +
            "e803000061616162616161626161616261616162504b03041400000008007554" +
            "954ab413389508000000100000000e001c00636f6d707265737365642e747874" +
            "5554090003ed42fa58ed42fa5875780b000104e803000004e80300004b4c4c4c" +
            "4a44c200504b03040a00090000008454954ab41338951c000000100000000d00" +
            "1c00656e637279707465642e74787455540900030743fa580743fa5875780b00" +
            "0104e803000004e8030000f72e7bb915142131c934f01b163fcadb2a8db7cdaf" +
            "d0a6f4dd1694c0504b0708b41338951c00000010000000504b03041400090008" +
            "008a54954ab413389514000000100000001c001c00656e637279707465642d61" +
            "6e642d636f6d707265737365642e74787455540900031343fa581343fa587578" +
            "0b000104e803000004e80300007c4d3ea0d9754b470d3eb32ada5741bfc848f4" +
            "19504b0708b41338951400000010000000504b01021e030a00000000006a5495" +
            "4ab413389510000000100000000a0018000000000000000000b4810000000073" +
            "746f7265642e7478745554050003d842fa5875780b000104e803000004e80300" +
            "00504b01021e031400000008007554954ab413389508000000100000000e0018" +
            "000000000001000000b48154000000636f6d707265737365642e747874555405" +
            "0003ed42fa5875780b000104e803000004e8030000504b01021e030a00090000" +
            "008454954ab41338951c000000100000000d0018000000000000000000b481a4" +
            "000000656e637279707465642e74787455540500030743fa5875780b000104e8" +
            "03000004e8030000504b01021e031400090008008a54954ab413389514000000" +
            "100000001c0018000000000001000000b48117010000656e637279707465642d" +
            "616e642d636f6d707265737365642e74787455540500031343fa5875780b0001" +
            "04e803000004e8030000504b0506000000000400040059010000910100000000", "hex");

        const shouldBeCompressed = (index) => (index & 1) !== 0;
        const shouldBeEncrypted = (index) => (index & 2) !== 0;
        const expectedFileDatas = [
            Buffer.from("61616162616161626161616261616162", "hex"),
            Buffer.from("4b4c4c4c4a44c200", "hex"),
            Buffer.from("f72e7bb915142131c934f01b163fcadb2a8db7cdafd0a6f4dd1694c0", "hex"),
            Buffer.from("7c4d3ea0d9754b470d3eb32ada5741bfc848f419", "hex")
        ];

        class StingyRandomAccessReader extends fs.AbstractRandomAccessReader {
            constructor(buffer) {
                super();
                this.buffer = buffer;
                this.upcomingByteCounts = [];
            }

            _readStreamForRange(start, end) {
                if (this.upcomingByteCounts.length > 0) {
                    const expectedByteCount = this.upcomingByteCounts.shift();
                    if (!adone.is.nil(expectedByteCount)) {
                        if (expectedByteCount !== end - start) {
                            done(new Error(`expected ${expectedByteCount} got ${end - start} bytes`));
                            return;
                        }
                    }
                }
                const result = new adone.std.stream.PassThrough();
                result.write(this.buffer.slice(start, end));
                result.end();
                return result;
            }
        }

        const zipfileReader = new StingyRandomAccessReader(zipfileBuffer);
        const options = { lazyEntries: true, autoClose: false };
        const zipfile = await zip.unpack.fromRandomAccessReader(zipfileReader, zipfileBuffer.length, options);
        const entries = [];
        try {
            await new Promise((resolve, reject) => {
                zipfile.readEntry();
                zipfile.on("entry", (entry) => {
                    const index = entries.length;
                    // asser the structure of the zipfile is what we expect
                    if (entry.isCompressed() !== shouldBeCompressed(index)) {
                        reject(new Error("assertion failure"));
                        return;
                    }
                    if (entry.isEncrypted() !== shouldBeEncrypted(index)) {
                        reject(new Error("assertion failure"));
                        return;
                    }
                    entries.push(entry);
                    zipfile.readEntry();
                });
                zipfile.on("end", resolve);
            });
            for (const start of [null, 0, 2]) {
                for (const end of [null, 3, 5]) {
                    for (const [index, entry] of adone.util.enumerate(entries)) {
                        const expectedFileData = expectedFileDatas[index];
                        const effectiveStart = !adone.is.nil(start) ? start : 0;
                        const effectiveEnd = !adone.is.nil(end) ? end : expectedFileData.length;
                        const expectedSlice = expectedFileData.slice(effectiveStart, effectiveEnd);
                        // the next read will be to check the local file header.
                        // then we assert that yauzl is asking for just the bytes we asked for.
                        zipfileReader.upcomingByteCounts = [null, expectedSlice.length];

                        const options = {};
                        if (!adone.is.nil(start)) {
                            options.start = start;
                        }
                        if (!adone.is.nil(end)) {
                            options.end = end;
                        }
                        if (entry.isCompressed()) {
                            options.decompress = false;
                        }
                        if (entry.isEncrypted()) {
                            options.decrypt = false;
                        }
                        const readStream = await zipfile.openReadStream(entry, options);
                        const data = await readStream.pipe(adone.stream.concat.create("buffer"));
                        const prefix = `openReadStream with range(${start},${end},${index}): `;
                        if (Buffer.compare(data, expectedSlice) !== 0) {
                            throw new Error(`${prefix}contents mismatch`);
                        }
                    }
                }
            }
        } finally {
            zipfile.close();
        }
    });
});
