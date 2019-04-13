const { is, std: { fs, stream }, stream: { as } } = adone;

const fixture = (name) => adone.std.path.join(__dirname, "fixtures", name);

class Through extends stream.PassThrough {
    constructor(data, readableObjectMode = false) {
        super({
            writableObjectMode: true,
            readableObjectMode
        });
        if (is.string(data) || is.buffer(data)) {
            this.push(data);
        }
        if (is.array(data)) {
            for (const i of data) {
                this.push(i);
            }
        }
        this.end();
    }
}

describe("stream", "as", () => {
    const makeSetup = (intoStream) => {
        const setup = (streamDef, opts) => as.string(intoStream(streamDef), opts);
        setup.array = (streamDef, opts) => as.array(intoStream(streamDef), opts);
        setup.buffer = (streamDef, opts) => as.buffer(intoStream(streamDef), opts);
        return setup;
    };

    const setup = makeSetup((data) => new Through(data));
    setup.obj = makeSetup((data) => new Through(data, true));

    it("get stream as a buffer", async () => {
        assert.isTrue((await as.buffer(fs.createReadStream(fixture("as")))).equals(Buffer.from("unicorn\n")));
    });

    it("get stream as an array", async () => {
        const f = fs.createReadStream(fixture("as_array"), "utf8");
        f.setEncoding("utf8");
        assert.equal(typeof (await as.array(f))[0], "string");
    });

    it("get object stream as an array", async () => {
        const result = await setup.obj.array([{ foo: true }, { bar: false }]);
        assert.deepEqual(result, [{ foo: true }, { bar: false }]);
    });

    it("get non-object stream as an array of strings", async () => {
        const result = await setup.array(["foo", "bar"], { encoding: "utf8" });
        assert.deepEqual(result, ["foo", "bar"]);
    });

    it("get non-object stream as an array of Buffers", async () => {
        const result = await setup.array(["foo", "bar"], { encoding: "buffer" });
        assert.deepEqual(result, [Buffer.from("foo"), Buffer.from("bar")]);
    });

    it("getStream should not affect additional listeners attached to the stream", async () => {
        const fixture = new Through(["foo", "bar"]);
        fixture.on("data", (chunk) => assert.isTrue(is.buffer(chunk)));
        assert.equal(await as.string(fixture), "foobar");
    });

    it("maxBuffer throws when size is exceeded", async () => {
        await assert.throws(async () => setup(["abcd"], { maxBuffer: 3 }));
        await assert.doesNotThrow(async () => setup(["abc"], { maxBuffer: 3 }));

        await assert.throws(async () => setup.buffer(["abcd"], { maxBuffer: 3 }));
        await assert.doesNotThrow(async () => setup.buffer(["abc"], { maxBuffer: 3 }));
    });

    it("maxBuffer applies to length of arrays when in objectMode", async () => {
        await assert.throws(async () => as.array(new Through([{ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }], true), { maxBuffer: 3 }), /maxBuffer exceeded/);
        await assert.doesNotThrow(async () => as.array(new Through([{ a: 1 }, { b: 2 }, { c: 3 }], true), { maxBuffer: 3 }));
    });

    it("maxBuffer applies to length of data when not in objectMode", async () => {
        await assert.throws(async () => setup.array(["ab", "cd", "ef"], { encoding: "utf8", maxBuffer: 5 }), /maxBuffer exceeded/);
        await assert.doesNotThrow(async () => setup.array(["ab", "cd", "ef"], { encoding: "utf8", maxBuffer: 6 }));
        await assert.throws(async () => setup.array(["ab", "cd", "ef"], { encoding: "buffer", maxBuffer: 5 }), /maxBuffer exceeded/);
        await assert.doesNotThrow(async () => setup.array(["ab", "cd", "ef"], { encoding: "buffer", maxBuffer: 6 }));
    });

    it("maxBuffer throws a MaxBufferError", async () => {
        await assert.throws(async () => setup(["abcd"], { maxBuffer: 3 }), adone.error.OutOfRangeException);
    });

    it("Promise rejects when input stream emits an error", async () => {
        const readable = new adone.std.stream.Readable();
        const data = "invisible pink unicorn";
        const error = new Error("Made up error");
        const reads = data.match(/.{1,5}/g);

        readable._read = function () {
            if (reads.length === 0) {
                setImmediate(() => {
                    this.emit("error", error);
                });
                return;
            }

            this.push(reads.shift());
        };

        const err = await assert.throws(async () => as.string(readable));
        assert.equal(err, error);
        assert.equal(err.bufferedData, data);
    });

});
