describe("glosses", "utils", "iconv", "utf16", () => {
    const { util: { iconv } } = adone;

    const testStr = "1aя中文☃💩";
    const utf16beBuf = Buffer.from([
        0x00, 0x31, 0x00, 0x61, 0x04, 0x4f, 0x4e, 0x2d,
        0x65, 0x87, 0x26, 0x03, 0xd8, 0x3d, 0xdc, 0xa9
    ]);
    const utf16leBuf = Buffer.from(testStr, "ucs2");
    const utf16beBOM = Buffer.from([0xFE, 0xFF]);
    const utf16leBOM = Buffer.from([0xFF, 0xFE]);
    const sampleStr = '<?xml version="1.0" encoding="UTF-8"?>\n<俄语>данные</俄语>';

    describe("UTF-16BE codec", () => {
        it("encodes basic strings correctly", () => {
            assert.equal(iconv.encode(testStr, "UTF16-BE").toString("hex"), utf16beBuf.toString("hex"));
        });

        it("decodes basic buffers correctly", () => {
            assert.equal(iconv.decode(utf16beBuf, "UTF16-BE"), testStr);
        });

        it("decodes uneven length buffers with no error", () => {
            assert.equal(iconv.decode(Buffer.from([0, 0x61, 0]), "UTF16-BE"), "a");
        });
    });

    describe("UTF-16 encoder", () => {
        it("uses UTF-16LE and adds BOM when encoding", () => {
            assert.equal(iconv.encode(testStr, "utf-16").toString("hex"), utf16leBOM.toString("hex") + utf16leBuf.toString("hex"));
        });

        it("can use other encodings, for example UTF-16LE, with BOM", () => {
            assert.equal(iconv.encode(testStr, "utf-16", { use: "UTF-16LE" }).toString("hex"),
            utf16leBOM.toString("hex") + Buffer.from(testStr, "ucs2").toString("hex"));
        });
    });

    describe("UTF-16 decoder", () => {
        it("uses BOM to determine encoding", () => {
            assert.equal(iconv.decode(Buffer.concat([utf16leBOM, utf16leBuf]), "utf-16"), testStr);
            assert.equal(iconv.decode(Buffer.concat([utf16beBOM, utf16beBuf]), "utf-16"), testStr);
        });

        it("handles very short buffers nice", () => {
            assert.equal(iconv.decode(Buffer.from([]), "utf-16"), "");
            assert.equal(iconv.decode(Buffer.from([0x61]), "utf-16"), "");
        });

        it("uses spaces when there is no BOM to determine encoding", () => {
            assert.equal(iconv.decode(iconv.encode(sampleStr, "utf-16le"), "utf-16"), sampleStr);
            assert.equal(iconv.decode(iconv.encode(sampleStr, "utf-16be"), "utf-16"), sampleStr);
        });

        it("uses UTF-16LE if no BOM and heuristics failed", () => {
            assert.equal(iconv.decode(utf16leBuf, "utf-16"), testStr);
        });

        it("can be given a different default encoding", () => {
            assert.equal(iconv.decode(utf16leBuf, "utf-16", { default: "utf-16le" }), testStr);
        });
    });
});
