import fixtures from "./fixtures";
const { ReadableStream, WritableStream, DEFAULT_INITIAL_SIZE, DEFAULT_INCREMENT_AMOUNT } = adone.stream.buffer;

describe("stream", "buffer", () => {
    describe("default ReadableStream", () => {
        let bs;

        beforeEach(() => {
            bs = new ReadableStream();
        });

        it("is a Stream", () => {
            expect(bs).to.be.an.instanceOf(require("stream").Stream);
        });

        it("is empty by default", () => {
            expect(bs.size()).to.equal(0);
        });

        it("has default backing buffer size", () => {
            expect(bs.maxSize()).to.equal(DEFAULT_INITIAL_SIZE);
        });

        describe("when stopped", () => {
            beforeEach(() => {
                bs.stop();
            });

            it("throws error on calling stop() again", () => {
                expect(bs.stop.bind(bs)).to.throw(Error);
            });

            it("throws error on calls to put()", () => {
                expect(bs.put.bind(bs)).to.throw(Error);
            });
        });

        it("emits end event when stopped", (done) => {
            bs.on("end", done);
            bs.stop();
            bs.read();
        });

        it("emits end event after data, when stopped", (done) => {
            let str = "";
            bs.on("readable", () => {
                str += (bs.read() || Buffer.allocUnsafe(0)).toString("utf8");
            });
            bs.on("end", () => {
                expect(str).to.equal(fixtures.unicodeString);
                done();
            });
            bs.put(fixtures.unicodeString);
            bs.stop();
        });

        describe("when writing binary data", () => {
            let data;

            beforeEach((done) => {
                bs.put(fixtures.binaryData);

                bs.once("readable", () => {
                    data = bs.read();
                    done();
                });
            });

            it("results in a Buffer", () => {
                expect(data).to.be.an.instanceOf(Buffer);
            });

            it("with the correct data", () => {
                expect(data).to.deep.equal(fixtures.binaryData);
            });
        });

        describe("when writing binary data larger than initial backing buffer size", () => {
            beforeEach(() => {
                bs.pause();
                bs.put(fixtures.largeBinaryData);
            });

            it("buffer is correct size", () => {
                expect(bs.size()).to.equal(fixtures.largeBinaryData.length);
            });

            it("backing buffer is correct size", () => {
                expect(bs.maxSize()).to.equal(DEFAULT_INITIAL_SIZE + DEFAULT_INCREMENT_AMOUNT);
            });
        });
    });

    describe("A ReadableStream using custom chunk size", () => {
        let bs;
        let data;

        beforeEach((done) => {
            bs = new ReadableStream({
                chunkSize: 2
            });

            bs.once("readable", () => {
                data = bs.read();
                done();
            });
            bs.put(fixtures.binaryData);
        });

        it("yields a Buffer with the correct data", () => {
            expect(data).to.deep.equal(fixtures.binaryData.slice(0, 2));
        });
    });

    describe("ReadableStream using custom frequency", () => {
        let bs;
        let time;

        beforeEach((done) => {
            const startTime = new Date().getTime();

            bs = new ReadableStream({
                frequency: 300
            });

            bs.once("readable", () => {
                time = new Date().getTime() - startTime;
                done();
            });
            bs.put(fixtures.binaryData);
        });

        it("gave us data after the correct amount of time", () => {
            // Wtfux: sometimes the timer is coming back a millisecond or two
            // faster. So we do a 'close-enough' assertion here ;)
            expect(time).to.be.at.least(295);
        });
    });

    describe("WritableStream with defaults", () => {
        let bs;

        beforeEach(() => {
            bs = new WritableStream();
        });

        it("returns false on call to getContents() when empty", () => {
            expect(bs.getContents()).to.be.false;
        });

        it("returns false on call to getContentsAsString() when empty", () => {
            expect(bs.getContentsAsString()).to.be.false;
        });

        it("backing buffer should be default size", () => {
            expect(bs.maxSize()).to.equal(DEFAULT_INITIAL_SIZE);
        });

        describe("when writing a simple string", () => {
            beforeEach(() => {
                bs.write(fixtures.simpleString);
            });

            it("should have a backing buffer of correct length", () => {
                expect(bs.size()).to.equal(fixtures.simpleString.length);
            });

            it("should have a default max size", () => {
                expect(bs.maxSize()).to.equal(DEFAULT_INITIAL_SIZE);
            });

            it("contents should be correct", () => {
                expect(bs.getContentsAsString()).to.equal(fixtures.simpleString);
            });

            it("returns partial contents correctly", () => {
                const buf = Buffer.concat([
                    bs.getContents(Math.floor(Buffer.byteLength(fixtures.simpleString) / 2)),
                    bs.getContents()
                ]);
                expect(buf.toString()).to.equal(fixtures.simpleString);
            });
        });

        describe("when writing a large binary blob", () => {
            beforeEach(() => {
                bs.write(fixtures.largeBinaryData);
            });

            it("should have a backing buffer of correct length", () => {
                expect(bs.size()).to.equal(fixtures.largeBinaryData.length);
            });

            it("should have a larger backing buffer max size", () => {
                expect(bs.maxSize()).to.equal(DEFAULT_INITIAL_SIZE + DEFAULT_INCREMENT_AMOUNT);
            });

            it("contents are valid", () => {
                expect(bs.getContents()).to.deep.equal(fixtures.largeBinaryData);
            });
        });

        describe("when writing some simple data to the stream", () => {
            beforeEach(() => {
                bs = new WritableStream();
                bs.write(fixtures.simpleString);
            });

            describe("and retrieving half of it", () => {
                let firstStr;
                beforeEach(() => {
                    firstStr = bs.getContentsAsString("utf8", Math.floor(fixtures.simpleString.length / 2));
                });

                it("returns correct data", () => {
                    expect(firstStr).to.equal(fixtures.simpleString.substring(0, Math.floor(fixtures.simpleString.length / 2)));
                });

                it("leaves correct amount of data remaining in buffer", () => {
                    expect(bs.size()).to.equal(Math.ceil(fixtures.simpleString.length / 2));
                });

                describe("and then retrieving the other half of it", () => {
                    let secondStr;
                    beforeEach(() => {
                        secondStr = bs.getContentsAsString("utf8", Math.ceil(fixtures.simpleString.length / 2));
                    });

                    it("returns correct data", () => {
                        expect(secondStr).to.equal(fixtures.simpleString.substring(Math.floor(fixtures.simpleString.length / 2)));
                    });

                    it("results in an empty buffer", () => {
                        expect(bs.size()).to.equal(0);
                    });
                });
            });
        });
    });

    describe("WritableStream with a different initial size and increment amount", () => {
        let bs;

        beforeEach(() => {
            bs = new WritableStream({
                initialSize: 62,
                incrementAmount: 321
            });
        });

        it("has the correct initial size", () => {
            expect(bs.maxSize()).to.equal(62);
        });

        describe("after data is written", () => {
            beforeEach(() => {
                bs.write(fixtures.binaryData);
            });

            it("has correct initial size + custom increment amount", () => {
                expect(bs.maxSize()).to.equal(321 + 62);
            });
        });
    });

    describe("WritableStream is written in two chunks", () => {
        let bs;
        beforeEach(() => {
            bs = new WritableStream();
            bs.write(fixtures.simpleString);
            bs.write(fixtures.simpleString);
        });

        it("buffer contents are correct", () => {
            expect(bs.getContentsAsString()).to.equal(fixtures.simpleString + fixtures.simpleString);
        });
    });
});
