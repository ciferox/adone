describe("glosses", "utils", "iconv", "bom handling", () => {
    const { util: { iconv } } = adone;

    const sampleStr = '<?xml version="1.0" encoding="UTF-8"?>\n<俄语>данные</俄语>';
    const strBOM = "\ufeff";
    const utf8BOM = new Buffer([0xEF, 0xBB, 0xBF]);
    const utf16beBOM = new Buffer([0xFE, 0xFF]);
    const utf16leBOM = new Buffer([0xFF, 0xFE]);

    it("strips UTF-8 BOM", () => {
        const body = Buffer.concat([utf8BOM, new Buffer(sampleStr)]);
        assert.equal(iconv.decode(body, "utf8"), sampleStr);
    });

    it("strips UTF-16 BOM", () => {
        let body = Buffer.concat([utf16leBOM, iconv.encode(sampleStr, "utf16le")]);
        assert.equal(iconv.decode(body, "utf16"), sampleStr);
        assert.equal(iconv.decode(body, "utf16le"), sampleStr);

        body = Buffer.concat([utf16beBOM, iconv.encode(sampleStr, "utf16be")]);
        assert.equal(iconv.decode(body, "utf16"), sampleStr);
        assert.equal(iconv.decode(body, "utf16be"), sampleStr);
    });

    it("doesn't strip BOMs when stripBOM=false", () => {
        let body = Buffer.concat([utf8BOM, new Buffer(sampleStr)]);
        assert.equal(iconv.decode(body, "utf8", { stripBOM: false }), strBOM + sampleStr);

        body = Buffer.concat([utf16leBOM, iconv.encode(sampleStr, "utf16le")]);
        assert.equal(iconv.decode(body, "utf16", { stripBOM: false }), strBOM + sampleStr);
        assert.equal(iconv.decode(body, "utf16le", { stripBOM: false }), strBOM + sampleStr);

        body = Buffer.concat([utf16beBOM, iconv.encode(sampleStr, "utf16be")]);
        assert.equal(iconv.decode(body, "utf16", { stripBOM: false }), strBOM + sampleStr);
        assert.equal(iconv.decode(body, "utf16be", { stripBOM: false }), strBOM + sampleStr);
    });

    it("adds/strips UTF-7 BOM", () => {
        const bodyWithBOM = iconv.encode(sampleStr, "utf7", { addBOM: true });
        const body = iconv.encode(sampleStr, "utf7");
        assert.notEqual(body.toString("hex"), bodyWithBOM.toString("hex"));
        assert.equal(iconv.decode(body, "utf7"), sampleStr);
    });

    it("adds UTF-8 BOM when addBOM=true", () => {
        const body = Buffer.concat([utf8BOM, new Buffer(sampleStr)]).toString("hex");
        assert.equal(iconv.encode(sampleStr, "utf8", { addBOM: true }).toString("hex"), body);
    });

    it("adds UTF-16 BOMs when addBOM=true", () => {
        var body = Buffer.concat([utf16leBOM, iconv.encode(sampleStr, "utf16le")]).toString("hex");
        assert.equal(iconv.encode(sampleStr, "utf16le", { addBOM: true }).toString("hex"), body);

        var body = Buffer.concat([utf16beBOM, iconv.encode(sampleStr, "utf16be")]).toString("hex");
        assert.equal(iconv.encode(sampleStr, "utf16be", { addBOM: true }).toString("hex"), body);
    });

    it("'UTF-16' encoding adds BOM by default, but can be overridden with addBOM=false", () => {
        var body = Buffer.concat([utf16leBOM, iconv.encode(sampleStr, "utf16le")]).toString("hex");
        assert.equal(iconv.encode(sampleStr, "utf16").toString("hex"), body);

        var body = Buffer.concat([iconv.encode(sampleStr, "utf16le")]).toString("hex");
        assert.equal(iconv.encode(sampleStr, "utf16", { addBOM: false }).toString("hex"), body);
    });


    it("when stripping BOM, calls callback 'stripBOM' if provided", () => {
        let bomStripped = false;
        const stripBOM = function () {
            bomStripped = true;
        };

        let body = Buffer.concat([utf8BOM, new Buffer(sampleStr)]);
        assert.equal(iconv.decode(body, "utf8", { stripBOM }), sampleStr);
        assert(bomStripped);

        bomStripped = false;

        body = new Buffer(sampleStr);
        assert.equal(iconv.decode(body, "utf8", { stripBOM }), sampleStr);
        assert(!bomStripped);
    });
});
