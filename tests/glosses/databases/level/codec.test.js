const { Codec } = adone.database.level;

describe("db", "level", "codec", () => {
    it("codec", () => {
        let codec = new Codec({ keyEncoding: "hex" });
        assert.ok(codec.keyAsBuffer());
        codec = new Codec();
        assert.notOk(codec.keyAsBuffer());
    });

    it("key as buffer", () => {
        const codec = new Codec({ keyEncoding: "hex" });
        assert.ok(codec.keyAsBuffer({}));
        assert.ok(codec.keyAsBuffer());
        assert.notOk(codec.keyAsBuffer({ keyEncoding: "utf8" }));
    });

    it("value as buffer", () => {
        const codec = new Codec({ valueEncoding: "hex" });
        assert.ok(codec.valueAsBuffer({}));
        assert.ok(codec.valueAsBuffer());
        assert.notOk(codec.valueAsBuffer({ valueEncoding: "utf8" }));
    });

    it("batch", () => {
        const codec = new Codec({});
        const ops = [
            { type: "put", key: "string", value: "string", valueEncoding: "utf8" },
            { type: "put", key: "json", value: {} }
        ];
        const opsSerialized = JSON.stringify(ops);

        let encoded = codec.encodeBatch(ops, { valueEncoding: "json" });

        assert.equal(opsSerialized, JSON.stringify(ops), "ops not changed");

        assert.deepEqual(encoded, [
            { type: "put", key: "string", value: "string" },
            { type: "put", key: "json", value: "{}" }
        ]);

        encoded = codec.encodeBatch(ops);
        assert.deepEqual(encoded, [
            { type: "put", key: "string", value: "string" },
            { type: "put", key: "json", value: {} }
        ]);
    });

    it("batch - legacy", () => {
        const codec = new Codec({});
        const ops = [
            { type: "put", key: "string", value: "string", encoding: "utf8" },
            { type: "put", key: "json", value: {} }
        ];
        const opsSerialized = JSON.stringify(ops);

        let encoded = codec.encodeBatch(ops, { encoding: "json" });

        assert.equal(opsSerialized, JSON.stringify(ops), "ops not changed");

        assert.deepEqual(encoded, [
            { type: "put", key: "string", value: "string" },
            { type: "put", key: "json", value: "{}" }
        ]);

        encoded = codec.encodeBatch(ops);
        assert.deepEqual(encoded, [
            { type: "put", key: "string", value: "string" },
            { type: "put", key: "json", value: {} }
        ]);
    });

    describe("createStreamDecoder", () => {
        const codec = new Codec({ keyEncoding: "hex" });

        it("keys and values", () => {
            const decoder = codec.createStreamDecoder({
                valueEncoding: "json",
                keys: true,
                values: true
            });
            assert.deepEqual(decoder(new Buffer("hey"), '"you"'), {
                key: "686579",
                value: "you"
            });
        });

        it("keys", () => {
            const decoder = codec.createStreamDecoder({
                keys: true
            });
            assert.equal(decoder(new Buffer("hey")), "686579");
        });

        it("values", () => {
            const decoder = codec.createStreamDecoder({
                valueEncoding: "hex",
                values: true
            });
            assert.equal(decoder(null, new Buffer("hey")), "686579");
        });
    });

    describe("createStreamDecoder - legacy", () => {
        const codec = new Codec({ keyEncoding: "hex" });

        it("keys and values", () => {
            const decoder = codec.createStreamDecoder({
                encoding: "json",
                keys: true,
                values: true
            });
            assert.deepEqual(decoder(new Buffer("hey"), '"you"'), {
                key: "686579",
                value: "you"
            });
        });

        it("keys", () => {
            const decoder = codec.createStreamDecoder({
                keys: true
            });
            assert.equal(decoder(new Buffer("hey")), "686579");
        });

        it("values", () => {
            const decoder = codec.createStreamDecoder({
                encoding: "hex",
                values: true
            });
            assert.equal(decoder(null, new Buffer("hey")), "686579");
        });
    });

    it("encode key", () => {
        const codec = new Codec({ keyEncoding: "hex" });

        let buf = codec.encodeKey("686579", {});
        assert.equal(buf.toString(), "hey");

        buf = codec.encodeKey("686579");
        assert.equal(buf.toString(), "hey");

        buf = codec.encodeKey("686579", {
            keyEncoding: "binary"
        });
        assert.equal(buf.toString(), "686579");

        buf = codec.encodeKey({ foo: "bar" }, {
            keyEncoding: "none"
        });
        assert.deepEqual(buf, { foo: "bar" });
    });

    it("encode value", () => {
        const codec = new Codec({ valueEncoding: "hex" });

        let buf = codec.encodeValue("686579", {});
        assert.equal(buf.toString(), "hey");

        buf = codec.encodeValue("686579");
        assert.equal(buf.toString(), "hey");

        buf = codec.encodeValue("686579", {
            valueEncoding: "binary"
        });
        assert.equal(buf.toString(), "686579");
    });

    it("decode key", () => {
        const codec = new Codec({ keyEncoding: "hex" });

        let buf = codec.decodeKey(new Buffer("hey"), {});
        assert.equal(buf, "686579");

        buf = codec.decodeKey(new Buffer("hey"));
        assert.equal(buf, "686579");

        buf = codec.decodeKey(new Buffer("hey"), {
            keyEncoding: "binary"
        });
        assert.equal(buf.toString(), "hey");
    });

    it("decode value", () => {
        const codec = new Codec({ valueEncoding: "hex" });

        let buf = codec.decodeValue(new Buffer("hey"), {});
        assert.equal(buf, "686579");

        buf = codec.decodeValue(new Buffer("hey"));
        assert.equal(buf, "686579");

        buf = codec.decodeValue(new Buffer("hey"), {
            valueEncoding: "binary"
        });
        assert.equal(buf.toString(), "hey");

        buf = codec.decodeValue(new Buffer("hey"), {
            valueEncoding: "utf8"
        });
        assert.equal(buf, "hey");
    });

    it("encode value - legacy", () => {
        const codec = new Codec({ encoding: "hex" });

        let buf = codec.encodeValue("686579", {});
        assert.equal(buf.toString(), "hey");

        buf = codec.encodeValue("686579");
        assert.equal(buf.toString(), "hey");

        buf = codec.encodeValue("686579", {
            encoding: "binary"
        });
        assert.equal(buf.toString(), "686579");
    });

    it("decode value - legacy", () => {
        const codec = new Codec({ encoding: "hex" });

        let buf = codec.decodeValue(new Buffer("hey"), {});
        assert.equal(buf, "686579");

        buf = codec.decodeValue(new Buffer("hey"));
        assert.equal(buf, "686579");

        buf = codec.decodeValue(new Buffer("hey"), {
            encoding: "binary"
        });
        assert.equal(buf.toString(), "hey");
    });

    it("encode ltgt", () => {
        const codec = new Codec({ keyEncoding: "hex" });

        let ltgt = {
            start: "686579",
            lte: "686579"
        };
        let encoded = codec.encodeLtgt(ltgt);
        assert.equal(encoded.start.toString(), "hey");
        assert.equal(encoded.lte.toString(), "hey");

        ltgt = {
            start: "686579",
            lte: "686579",
            keyEncoding: "json"
        };
        encoded = codec.encodeLtgt(ltgt);
        assert.equal(encoded.start, '"686579"');
        assert.equal(encoded.lte, '"686579"');
    });
});
