const {
    net: { ws: { util } }
} = adone;

describe("net", "ws", "util", () => {
    it("masks a buffer (1/2)", () => {
        const buf = Buffer.from([0x6c, 0x3c, 0x58, 0xd9, 0x3e, 0x21, 0x09, 0x9f]);
        const mask = Buffer.from([0x48, 0x2a, 0xce, 0x24]);

        util.mask(buf, mask, buf, 0, buf.length);

        assert.deepStrictEqual(
            buf,
            Buffer.from([0x24, 0x16, 0x96, 0xfd, 0x76, 0x0b, 0xc7, 0xbb])
        );
    });

    it("masks a buffer (2/2)", () => {
        const src = Buffer.from([0x6c, 0x3c, 0x58, 0xd9, 0x3e, 0x21, 0x09, 0x9f]);
        const mask = Buffer.from([0x48, 0x2a, 0xce, 0x24]);
        const dest = Buffer.alloc(src.length + 2);

        util.mask(src, mask, dest, 2, src.length);

        assert.deepStrictEqual(
            dest,
            Buffer.from([0x00, 0x00, 0x24, 0x16, 0x96, 0xfd, 0x76, 0x0b, 0xc7, 0xbb])
        );
    });

    it("unmasks a buffer", () => {
        const buf = Buffer.from([0x24, 0x16, 0x96, 0xfd, 0x76, 0x0b, 0xc7, 0xbb]);
        const mask = Buffer.from([0x48, 0x2a, 0xce, 0x24]);

        util.unmask(buf, mask);

        assert.deepStrictEqual(
            buf,
            Buffer.from([0x6c, 0x3c, 0x58, 0xd9, 0x3e, 0x21, 0x09, 0x9f])
        );
    });

    describe("validation", () => {
        const txt = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque gravida mattis rhoncus. Donec iaculis, metus quis varius accumsan, erat mauris condimentum diam, et egestas erat enim ut ligula. Praesent sollicitudin tellus eget dolor euismod euismod. Nullam ac augue nec neque varius luctus. Curabitur elit mi, consequat ultricies adipiscing mollis, scelerisque in erat. Phasellus facilisis fermentum ullamcorper. Nulla et sem eu arcu pharetra pellentesque. Praesent consectetur tempor justo, vel iaculis dui ullamcorper sit amet. Integer tristique viverra ullamcorper. Vivamus laoreet, nulla eget suscipit eleifend, lacus lectus feugiat libero, non fermentum erat nisi at risus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut pulvinar dignissim tellus, eu dignissim lorem vulputate quis. Morbi ut pulvinar augue.";

        it("returns true with an empty buffer", () => {
            assert.strictEqual(util.isValidUTF8(Buffer.alloc(0)), true);
        });
    
        it("returns true for a valid utf8 string", () => {
            assert.strictEqual(util.isValidUTF8(Buffer.from(txt)), true);
        });
    
        it("returns false for an erroneous string", () => {
            const invalid = Buffer.from([
                0xce, 0xba, 0xe1, 0xbd, 0xb9, 0xcf, 0x83, 0xce, 0xbc, 0xce, 0xb5, 0xed,
                0xa0, 0x80, 0x65, 0x64, 0x69, 0x74, 0x65, 0x64
            ]);
    
            assert.strictEqual(util.isValidUTF8(invalid), false);
        });
    
        it("returns true for valid cases from the autobahn test suite", () => {
            assert.strictEqual(
                util.isValidUTF8(Buffer.from("\xf0\x90\x80\x80")),
                true
            );
            assert.strictEqual(
                util.isValidUTF8(Buffer.from([0xf0, 0x90, 0x80, 0x80])),
                true
            );
        });
    
        it("returns false for erroneous autobahn strings", () => {
            assert.strictEqual(
                util.isValidUTF8(Buffer.from([0xce, 0xba, 0xe1, 0xbd])),
                false
            );
        });
    });
});
