describe("glosses", "net", "mail", "Mime-Type Tests", () => {
    const { net: { mail: { __: { mimeTypes } } } } = adone;

    describe("#detectExtension", () => {
        it("should detect default extension", () => {
            expect(mimeTypes.detectExtension(false)).to.equal("bin");
            expect(mimeTypes.detectExtension("unknown")).to.equal("bin");
            expect(mimeTypes.detectExtension("application/unknown")).to.equal("bin");
            expect(mimeTypes.detectExtension("text/unknown")).to.equal("txt");
        });

        it("should detect single extension", () => {
            expect(mimeTypes.detectExtension("text/plain")).to.equal("txt");
        });

        it("should detect first matching extension", () => {
            expect(mimeTypes.detectExtension("application/vnd.ms-excel")).to.equal("xls");
        });
    });

    describe("#detectMimeType", () => {
        it("should detect default mime type", () => {
            expect(mimeTypes.detectMimeType(false)).to.equal("application/octet-stream");
            expect(mimeTypes.detectMimeType("unknown")).to.equal("application/octet-stream");
        });

        it("should detect single mime type", () => {
            expect(mimeTypes.detectMimeType("txt")).to.equal("text/plain");
            expect(mimeTypes.detectMimeType("test.txt")).to.equal("text/plain");
            expect(mimeTypes.detectMimeType("path/to/test.txt?id=123")).to.equal("text/plain");
        });

        it("should detect first matching mime type", () => {
            expect(mimeTypes.detectMimeType("sgml")).to.equal("text/sgml");
            expect(mimeTypes.detectMimeType("test.sgml")).to.equal("text/sgml");
            expect(mimeTypes.detectMimeType("path/to/test.sgml?id=123")).to.equal("text/sgml");
        });
    });
});
