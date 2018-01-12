describe("stream", "CombinedStream", function () {
    const {
        stream: {
            CombinedStream
        },
        collection: {
            BufferList
        },
        fs,
        promise
    } = adone;

    it("append should call the function argument", async () => {
        const combinedStream = CombinedStream.create();
        combinedStream.append((next) => {
            next(new BufferList("hello "));
        });
        combinedStream.append((next) => {
            next(new BufferList("world"));
        });

        const dst = new BufferList();

        combinedStream.pipe(dst);

        expect(await dst).to.be.deep.equal(Buffer.from("hello world"));
    });

    it("should calculate dataSize", () => {
        const combinedStream = CombinedStream.create();

        assert.strictEqual(combinedStream.dataSize, 0);

        // Test one stream
        combinedStream._streams.push({ dataSize: 10 });
        combinedStream._updateDataSize();
        assert.strictEqual(combinedStream.dataSize, 10);

        // Test two streams
        combinedStream._streams.push({ dataSize: 23 });
        combinedStream._updateDataSize();
        assert.strictEqual(combinedStream.dataSize, 33);

        // Test currentStream
        combinedStream._currentStream = { dataSize: 20 };
        combinedStream._updateDataSize();
        assert.strictEqual(combinedStream.dataSize, 53);

        // Test currentStream without dataSize
        combinedStream._currentStream = {};
        combinedStream._updateDataSize();
        assert.strictEqual(combinedStream.dataSize, 33);

        // Test stream function
        combinedStream._streams.push(() => {});
        combinedStream._updateDataSize();
        assert.strictEqual(combinedStream.dataSize, 33);
    });

    it("should work with delayed streams strings and buffers", async () => {
        const combinedStream = CombinedStream.create();
        const buffer = Buffer.from("Bacon is delicious");
        const str = "The € kicks the $'s ass!";
        combinedStream.append(fs.createReadStream(this.file1));
        combinedStream.append(buffer);
        combinedStream.append(fs.createReadStream(this.file2));
        combinedStream.append((next) => {
            next(str);
        });

        const dest = new BufferList();

        combinedStream.pipe(dest);

        const data = await dest;

        assert.deepEqual(data, Buffer.concat([
            await fs.readFile(this.file1),
            buffer,
            await fs.readFile(this.file2),
            Buffer.from(str)
        ]));
    });

    it("should delay streams", async () => {
        const combinedStream = CombinedStream.create();
        combinedStream.append(fs.createReadStream(this.file1));
        combinedStream.append(fs.createReadStream(this.file2));

        const stream1 = combinedStream._streams[0];
        const stream2 = combinedStream._streams[1];

        const d = promise.defer();

        stream1.on("end", () => {
            d.resolve(stream2.dataSize);
        });

        const dest = new BufferList();
        combinedStream.pipe(dest);

        await combinedStream;
        expect(await d.promise).to.be.equal(0);
    });

    it("should correctly handle empty string", async () => {
        const s = CombinedStream.create();
        s.append("foo.");
        s.append("");
        s.append("bar");
        expect(await s.pipe(new BufferList())).to.be.deep.equal(Buffer.from("foo.bar"));
    });

    specify("isStreamLike", () => {
        assert(!CombinedStream.isStreamLike(true));
        assert(!CombinedStream.isStreamLike("I am a string"));
        assert(!CombinedStream.isStreamLike(7));
        assert(!CombinedStream.isStreamLike(() => {}));

        assert(CombinedStream.isStreamLike(new BufferList()));
    });

    it.todo("should set the max limit with maxDataSize", async () => {
        const combinedStream = CombinedStream.create({ pauseStreams: false, maxDataSize: 20736 });
        combinedStream.append(fs.createReadStream(this.file1));
        combinedStream.append(fs.createReadStream(this.file2));

        const s = spy();
        combinedStream.on("error", s);
        const data = await combinedStream.pipe(new BufferList());
        await s.waitForCall();
        expect(s).to.have.been.calledOnce;
        expect(s.args[0].message).to.be.equal("HA");
    });

    it("should not pause stream if pauseStreams is false", async () => {
        const combinedStream = CombinedStream.create({ pauseStreams: false });
        combinedStream.append(fs.createReadStream(this.file1));
        combinedStream.append(fs.createReadStream(this.file2));

        const stream1 = combinedStream._streams[0];
        const stream2 = combinedStream._streams[1];

        const d = promise.defer();
        stream1.on("end", () => {
            d.resolve(stream2.dataSize);
        });

        const dest = new BufferList();
        combinedStream.pipe(dest);

        expect(await dest).to.be.deep.equal(Buffer.concat([
            await fs.readFile(this.file1),
            await fs.readFile(this.file2)
        ]));

        expect(await d.promise).to.be.gt(0);
    });
});
