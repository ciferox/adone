describe("net", "http", "helper", "raw body", () => {
    const {
        net: { http: { server: { helper: { getRawBody } } } },
        std: { fs, stream: { PassThrough, Readable } }
    } = adone;

    const file = __filename;
    const length = fs.statSync(file).size;
    const string = fs.readFileSync(file, "utf8");

    const checkBuffer = (buf) => {
        assert.ok(Buffer.isBuffer(buf));
        assert.equal(buf.length, length);
        assert.equal(buf.toString("utf8"), string);
    };

    const checkString = (str) => {
        assert.ok(typeof str === "string");
        assert.equal(str, string);
    };

    const createStream = (buf) => {
        if (!buf) {
            return fs.createReadStream(file);
        }

        const stream = new Readable();
        stream._read = function () {
            stream.push(buf);
            stream.push(null);
        };

        return stream;
    };

    it("should work without any options", async () => {
        const buf = await getRawBody(createStream());
        checkBuffer(buf);
    });

    it("should work with `true` as an option", async () => {
        const buf = await getRawBody(createStream(), true);
        checkString(buf);
    });

    it("should work with length", async () => {
        const buf = await getRawBody(createStream(), {
            length
        });
        checkBuffer(buf);
    });

    it("should work when length=0", async () => {
        const t = new PassThrough();
        t.end();

        const str = await getRawBody(t, {
            length: 0,
            encoding: true
        });
        assert.equal(str, "");
    });

    it("should work with limit", async () => {
        const buf = await getRawBody(createStream(), {
            limit: length + 1
        });
        checkBuffer(buf);
    });

    it("should work with limit as a string", async () => {
        const buf = await getRawBody(createStream(), {
            limit: "1gb"
        });
        checkBuffer(buf);
    });

    it("should work with limit and length", async () => {
        const buf = await getRawBody(createStream(), {
            length,
            limit: length + 1
        });
        checkBuffer(buf);
    });

    it("should check options for limit and length", async () => {
        const err = await getRawBody(createStream(), {
            length,
            limit: length - 1
        }).then(() => null, (e) => e);
        assert.equal(err.status, 413);
        assert.equal(err.status, 413);
        assert.equal(err.expected, length);
        assert.equal(err.length, length);
        assert.equal(err.limit, length - 1);
        assert.equal(err.type, "entity.too.large");
        assert.equal(err.message, "request entity too large");
    });

    it("should work with an empty stream", async () => {
        const stream = new Readable();
        stream.push(null);

        process.nextTick(() => stream.emit("end"));
        const buf = await getRawBody(stream, {
            length: 0,
            limit: 1
        });
        assert.equal(buf.length, 0);

    });

    it("should throw on empty string and incorrect length", async () => {
        const stream = new Readable();
        stream.push(null);

        process.nextTick(() => stream.emit("end"));

        const err = await getRawBody(stream, {
            length: 1,
            limit: 2
        }).then(() => null, (e) => e);
        assert.equal(err.status, 400);
    });

    it("should throw if length > limit", async () => {
        const err = await getRawBody(createStream(), {
            limit: length - 1
        }).then(() => null, (e) => e);
        assert.equal(err.status, 413);
    });

    it("should throw if incorrect length supplied", async () => {
        const err = await getRawBody(createStream(), {
            length: length - 1
        }).then(() => null, (e) => e);
        assert.equal(err.status, 400);
    });

    it("should work with if length is null", async () => {
        const buf = await getRawBody(createStream(), {
            length: null,
            limit: length + 1
        });
        checkBuffer(buf);
    });

    it('should work with {"test":"å"}', async () => {
        const stream = new Readable();
        stream.push('{"test":"å"}');
        stream.push(null);

        const buf = await getRawBody(stream, {
            length: 13
        });
        assert.ok(buf);
        assert.equal(buf.length, 13);
    });

    it("should throw if stream encoding is set", async () => {
        const stream = new Readable();
        stream.push("akl;sdjfklajsdfkljasdf");
        stream.push(null);
        stream.setEncoding("utf8");

        const err = await getRawBody(stream)
            .then(() => null, (e) => e);
        assert.equal(err.status, 500);
    });

    it("should throw when given an invalid encoding", async () => {
        const stream = new Readable();
        stream.push("akl;sdjfklajsdfkljasdf");
        stream.push(null);

        const err = await getRawBody(stream, "akljsdflkajsdf")
            .then(() => null, (e) => e);

        assert.ok(err);
        assert.equal(err.message, "specified encoding unsupported");
        assert.equal(err.status, 415);
        assert.equal(err.type, "encoding.unsupported");
    });

    describe("when an encoding is set", () => {
        it("should return a string", async () => {
            const str = await getRawBody(createStream(), {
                encoding: "utf-8"
            });
            assert.equal(str, string);
        });

        it("should handle encoding true as utf-8", async () => {
            const str = await getRawBody(createStream(), {
                encoding: true
            });
            assert.equal(str, string);
        });

        it("should handle encoding as options string", async () => {
            const str = await getRawBody(createStream(), "utf-8");
            assert.equal(str, string);
        });

        it("should decode codepage string", async () => {
            const stream = createStream(new Buffer("bf43f36d6f20657374e1733f", "hex"));
            const string = "¿Cómo estás?";
            const str = await getRawBody(stream, "iso-8859-1", );
            assert.equal(str, string);
        });

        it("should decode UTF-8 string", async () => {
            const stream = createStream(new Buffer("c2bf43c3b36d6f20657374c3a1733f", "hex"));
            const string = "¿Cómo estás?";
            const str = await getRawBody(stream, "utf-8");
            assert.equal(str, string);
        });

        it("should decode UTF-16 string (LE BOM)", async () => {
            // BOM makes this LE
            const stream = createStream(new Buffer("fffebf004300f3006d006f002000650073007400e10073003f00", "hex"));
            const string = "¿Cómo estás?";
            const str = await getRawBody(stream, "utf-16");
            assert.equal(str, string);
        });

        it("should decode UTF-16 string (BE BOM)", async () => {
            // BOM makes this BE
            const stream = createStream(new Buffer("feff00bf004300f3006d006f002000650073007400e10073003f", "hex"));
            const string = "¿Cómo estás?";
            const str = await getRawBody(stream, "utf-16");
            assert.equal(str, string);
        });

        it("should decode UTF-16LE string", async () => {
            // UTF-16LE is different from UTF-16 due to BOM behavior
            const stream = createStream(new Buffer("bf004300f3006d006f002000650073007400e10073003f00", "hex"));
            const string = "¿Cómo estás?";
            const str = await getRawBody(stream, "utf-16le");
            assert.equal(str, string);
        });

        it("should correctly calculate the expected length", async () => {
            const stream = createStream(new Buffer('{"test":"å"}'));

            await getRawBody(stream, {
                encoding: "utf-8",
                length: 13
            });
        });
    });
});
