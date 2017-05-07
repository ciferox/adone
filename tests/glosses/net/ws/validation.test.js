describe("net", "ws", "Validation", () => {
    describe("isValidUTF8", () => {
        let txt;
        before(async () => {
            const fixtures = new adone.fs.Directory(__dirname, "..", "fixtures");
            txt = await fixtures.getVirtualFile("lorem-ipsum.txt").content();
        });


        it("throws an error if the first argument is not a buffer", () => {
            assert.throws(() => adone.net.ws.is.validUTF8({}), /First argument needs to be a buffer/);
        });

        it("returns true with an empty buffer", () => {
            assert.strictEqual(adone.net.ws.is.validUTF8(Buffer.alloc(0)), true);
        });

        it("returns true for a valid utf8 string", () => {
            assert.strictEqual(adone.net.ws.is.validUTF8(Buffer.from(txt)), true);
        });

        it("returns false for an erroneous string", () => {
            const invalid = Buffer.from([
                0xce, 0xba, 0xe1, 0xbd, 0xb9, 0xcf, 0x83, 0xce, 0xbc, 0xce, 0xb5, 0xed,
                0xa0, 0x80, 0x65, 0x64, 0x69, 0x74, 0x65, 0x64
            ]);

            assert.strictEqual(adone.net.ws.is.validUTF8(invalid), false);
        });

        it("returns true for valid cases from the autobahn test suite", () => {
            assert.strictEqual(adone.net.ws.is.validUTF8(Buffer.from("\xf0\x90\x80\x80")), true);
            assert.strictEqual(adone.net.ws.is.validUTF8(Buffer.from([0xf0, 0x90, 0x80, 0x80])), true);
        });

        it("returns false for erroneous autobahn strings", () => {
            assert.strictEqual(adone.net.ws.is.validUTF8(Buffer.from([0xce, 0xba, 0xe1, 0xbd])), false);
        });
    });
});
