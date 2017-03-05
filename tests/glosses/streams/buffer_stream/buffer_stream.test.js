import fixtures from "./fixtures";
const { ReadableStream, WritableStream, DEFAULT_INITIAL_SIZE, DEFAULT_INCREMENT_AMOUNT } = adone.stream.buffer;

describe("A default buffer.ReadableStream", function () {
    let bs;

    beforeEach(function () {
        bs = new ReadableStream();
    });

    it("is a Stream", function () {
        expect(bs).to.be.an.instanceOf(require("stream").Stream);
    });

    it("is empty by default", function () {
        expect(bs.size()).to.equal(0);
    });

    it("has default backing buffer size", function () {
        expect(bs.maxSize()).to.equal(DEFAULT_INITIAL_SIZE);
    });

    describe("when stopped", function () {
        beforeEach(function () {
            bs.stop();
        });

        it("throws error on calling stop() again", function () {
            expect(bs.stop.bind(bs)).to.throw(Error);
        });

        it("throws error on calls to put()", function () {
            expect(bs.put.bind(bs)).to.throw(Error);
        });
    });

    it("emits end event when stopped", function (done) {
        bs.on("end", done);
        bs.stop();
        bs.read();
    });

    it("emits end event after data, when stopped", function (done) {
        let str = "";
        bs.on("readable", function () {
            str += (bs.read() || new Buffer(0)).toString("utf8");
        });
        bs.on("end", function () {
            expect(str).to.equal(fixtures.unicodeString);
            done();
        });
        bs.put(fixtures.unicodeString);
        bs.stop();
    });

    describe("when writing binary data", function () {
        let data;

        beforeEach(function (done) {
            bs.put(fixtures.binaryData);

            bs.once("readable", function () {
                data = bs.read();
                done();
            });
        });

        it("results in a Buffer", function () {
            expect(data).to.be.an.instanceOf(Buffer);
        });

        it("with the correct data", function () {
            expect(data).to.deep.equal(fixtures.binaryData);
        });
    });

    describe("when writing binary data larger than initial backing buffer size", function () {
        beforeEach(function () {
            bs.pause();
            bs.put(fixtures.largeBinaryData);
        });

        it("buffer is correct size", function () {
            expect(bs.size()).to.equal(fixtures.largeBinaryData.length);
        });

        it("backing buffer is correct size", function () {
            expect(bs.maxSize()).to.equal(DEFAULT_INITIAL_SIZE + DEFAULT_INCREMENT_AMOUNT);
        });
    });
});

describe("A buffer.ReadableStream using custom chunk size", function () {
    let bs;
    let data;

    beforeEach(function (done) {
        bs = new ReadableStream({
            chunkSize: 2
        });

        bs.once("readable", function () {
            data = bs.read();
            done();
        });
        bs.put(fixtures.binaryData);
    });

    it("yields a Buffer with the correct data", function () {
        expect(data).to.deep.equal(fixtures.binaryData.slice(0, 2));
    });
});

describe("A buffer.ReadableStream using custom frequency", function () {
    let bs;
    let time;
    
    beforeEach(function (done) {
        const startTime = new Date().getTime();

        bs = new ReadableStream({
            frequency: 300
        });

        bs.once("readable", function () {
            time = new Date().getTime() - startTime;
            done();
        });
        bs.put(fixtures.binaryData);
    });

    it("gave us data after the correct amount of time", function () {
        // Wtfux: sometimes the timer is coming back a millisecond or two
        // faster. So we do a 'close-enough' assertion here ;)
        expect(time).to.be.at.least(295);
    });
});

describe("buffer.WritableStream with defaults", function () {
    let bs;

    beforeEach(function () {
        bs = new WritableStream();
    });

    it("returns false on call to getContents() when empty", function () {
        expect(bs.getContents()).to.be.false;
    });

    it("returns false on call to getContentsAsString() when empty", function () {
        expect(bs.getContentsAsString()).to.be.false;
    });

    it("backing buffer should be default size", function () {
        expect(bs.maxSize()).to.equal(DEFAULT_INITIAL_SIZE);
    });

    describe("when writing a simple string", function () {
        beforeEach(function () {
            bs.write(fixtures.simpleString);
        });

        it("should have a backing buffer of correct length", function () {
            expect(bs.size()).to.equal(fixtures.simpleString.length);
        });

        it("should have a default max size", function () {
            expect(bs.maxSize()).to.equal(DEFAULT_INITIAL_SIZE);
        });

        it("contents should be correct", function () {
            expect(bs.getContentsAsString()).to.equal(fixtures.simpleString);
        });

        it("returns partial contents correctly", function () {
            const buf = Buffer.concat([
                bs.getContents(Math.floor(Buffer.byteLength(fixtures.simpleString) / 2)),
                bs.getContents()
            ]);
            expect(buf.toString()).to.equal(fixtures.simpleString);
        });
    });

    describe("when writing a large binary blob", function () {
        beforeEach(function () {
            bs.write(fixtures.largeBinaryData);
        });

        it("should have a backing buffer of correct length", function () {
            expect(bs.size()).to.equal(fixtures.largeBinaryData.length);
        });

        it("should have a larger backing buffer max size", function () {
            expect(bs.maxSize()).to.equal(DEFAULT_INITIAL_SIZE + DEFAULT_INCREMENT_AMOUNT);
        });

        it("contents are valid", function () {
            expect(bs.getContents()).to.deep.equal(fixtures.largeBinaryData);
        });
    });

    describe("when writing some simple data to the stream", function () {
        beforeEach(function () {
            bs = new WritableStream();
            bs.write(fixtures.simpleString);
        });

        describe("and retrieving half of it", function () {
            let firstStr;
            beforeEach(function () {
                firstStr = bs.getContentsAsString("utf8", Math.floor(fixtures.simpleString.length / 2));
            });

            it("returns correct data", function () {
                expect(firstStr).to.equal(fixtures.simpleString.substring(0, Math.floor(fixtures.simpleString.length / 2)));
            });

            it("leaves correct amount of data remaining in buffer", function () {
                expect(bs.size()).to.equal(Math.ceil(fixtures.simpleString.length / 2));
            });

            describe("and then retrieving the other half of it", function () {
                let secondStr;
                beforeEach(function () {
                    secondStr = bs.getContentsAsString("utf8", Math.ceil(fixtures.simpleString.length / 2));
                });

                it("returns correct data", function () {
                    expect(secondStr).to.equal(fixtures.simpleString.substring(Math.floor(fixtures.simpleString.length / 2)));
                });

                it("results in an empty buffer", function () {
                    expect(bs.size()).to.equal(0);
                });
            });
        });
    });
});

describe("buffer.WritableStream with a different initial size and increment amount", function () {
    let bs;

    beforeEach(function () {
        bs = new WritableStream({
            initialSize: 62,
            incrementAmount: 321
        });
    });

    it("has the correct initial size", function () {
        expect(bs.maxSize()).to.equal(62);
    });

    describe("after data is written", function () {
        beforeEach(function () {
            bs.write(fixtures.binaryData);
        });

        it("has correct initial size + custom increment amount", function () {
            expect(bs.maxSize()).to.equal(321 + 62);
        });
    });
});

describe("When buffer.WritableStream is written in two chunks", function () {
    let bs;
    beforeEach(function () {
        bs = new WritableStream();
        bs.write(fixtures.simpleString);
        bs.write(fixtures.simpleString);
    });

    it("buffer contents are correct", function () {
        expect(bs.getContentsAsString()).to.equal(fixtures.simpleString + fixtures.simpleString);
    });
});
