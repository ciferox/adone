describe("glosses", "net", "http", "helpers", "mime types", () => {
    const { mimeType } = adone.net.http.server.helper;

    describe(".charset(type)", () => {
        it('should return "UTF-8" for "application/json"', () => {
            assert.equal(mimeType.charset("application/json"), "UTF-8");
        });

        it('should return "UTF-8" for "application/json; foo=bar"', () => {
            assert.equal(mimeType.charset("application/json; foo=bar"), "UTF-8");
        });

        it('should return "UTF-8" for "application/javascript"', () => {
            assert.equal(mimeType.charset("application/javascript"), "UTF-8");
        });

        it('should return "UTF-8" for "application/JavaScript"', () => {
            assert.equal(mimeType.charset("application/JavaScript"), "UTF-8");
        });

        it('should return "UTF-8" for "text/html"', () => {
            assert.equal(mimeType.charset("text/html"), "UTF-8");
        });

        it('should return "UTF-8" for "TEXT/HTML"', () => {
            assert.equal(mimeType.charset("TEXT/HTML"), "UTF-8");
        });

        it('should return "UTF-8" for any text/*', () => {
            assert.equal(mimeType.charset("text/x-bogus"), "UTF-8");
        });

        it("should return false for unknown types", () => {
            assert.strictEqual(mimeType.charset("application/x-bogus"), false);
        });

        it("should return false for any application/octet-stream", () => {
            assert.strictEqual(mimeType.charset("application/octet-stream"), false);
        });

        it("should return false for invalid arguments", () => {
            assert.strictEqual(mimeType.charset({}), false);
            assert.strictEqual(mimeType.charset(null), false);
            assert.strictEqual(mimeType.charset(true), false);
            assert.strictEqual(mimeType.charset(42), false);
        });
    });

    describe(".contentType(extension)", () => {
        it('should return content-type for "html"', () => {
            assert.equal(mimeType.contentType("html"), "text/html; charset=utf-8");
        });

        it('should return content-type for ".html"', () => {
            assert.equal(mimeType.contentType(".html"), "text/html; charset=utf-8");
        });

        it('should return content-type for "jade"', () => {
            assert.equal(mimeType.contentType("jade"), "text/jade; charset=utf-8");
        });

        it('should return content-type for "json"', () => {
            assert.equal(mimeType.contentType("json"), "application/json; charset=utf-8");
        });

        it("should return false for unknown extensions", () => {
            assert.strictEqual(mimeType.contentType("bogus"), false);
        });

        it("should return false for invalid arguments", () => {
            assert.strictEqual(mimeType.contentType({}), false);
            assert.strictEqual(mimeType.contentType(null), false);
            assert.strictEqual(mimeType.contentType(true), false);
            assert.strictEqual(mimeType.contentType(42), false);
        });
    });

    describe(".contentType(type)", () => {
        it('should attach charset to "application/json"', () => {
            assert.equal(mimeType.contentType("application/json"), "application/json; charset=utf-8");
        });

        it('should attach charset to "application/json; foo=bar"', () => {
            assert.equal(mimeType.contentType("application/json; foo=bar"), "application/json; foo=bar; charset=utf-8");
        });

        it('should attach charset to "TEXT/HTML"', () => {
            assert.equal(mimeType.contentType("TEXT/HTML"), "TEXT/HTML; charset=utf-8");
        });

        it('should attach charset to "text/html"', () => {
            assert.equal(mimeType.contentType("text/html"), "text/html; charset=utf-8");
        });

        it('should not alter "text/html; charset=iso-8859-1"', () => {
            assert.equal(mimeType.contentType("text/html; charset=iso-8859-1"), "text/html; charset=iso-8859-1");
        });

        it("should return type for unknown types", () => {
            assert.equal(mimeType.contentType("application/x-bogus"), "application/x-bogus");
        });
    });

    describe(".extension(type)", () => {
        it("should return extension for mime type", () => {
            assert.equal(mimeType.extension("text/html"), "html");
            assert.equal(mimeType.extension(" text/html"), "html");
            assert.equal(mimeType.extension("text/html "), "html");
        });

        it("should return false for unknown type", () => {
            assert.strictEqual(mimeType.extension("application/x-bogus"), false);
        });

        it("should return false for non-type string", () => {
            assert.strictEqual(mimeType.extension("bogus"), false);
        });

        it("should return false for non-strings", () => {
            assert.strictEqual(mimeType.extension(null), false);
            assert.strictEqual(mimeType.extension(undefined), false);
            assert.strictEqual(mimeType.extension(42), false);
            assert.strictEqual(mimeType.extension({}), false);
        });

        it("should return extension for mime type with parameters", () => {
            assert.equal(mimeType.extension("text/html;charset=UTF-8"), "html");
            assert.equal(mimeType.extension("text/HTML; charset=UTF-8"), "html");
            assert.equal(mimeType.extension("text/html; charset=UTF-8"), "html");
            assert.equal(mimeType.extension("text/html; charset=UTF-8 "), "html");
            assert.equal(mimeType.extension("text/html ; charset=UTF-8"), "html");
        });
    });

    describe(".lookup(extension)", () => {
        it('should return mime type for ".html"', () => {
            assert.equal(mimeType.lookup(".html"), "text/html");
        });

        it('should return mime type for ".js"', () => {
            assert.equal(mimeType.lookup(".js"), "application/javascript");
        });

        it('should return mime type for ".json"', () => {
            assert.equal(mimeType.lookup(".json"), "application/json");
        });

        it('should return mime type for ".rtf"', () => {
            assert.equal(mimeType.lookup(".rtf"), "application/rtf");
        });

        it('should return mime type for ".txt"', () => {
            assert.equal(mimeType.lookup(".txt"), "text/plain");
        });

        it('should return mime type for ".xml"', () => {
            assert.equal(mimeType.lookup(".xml"), "application/xml");
        });

        it("should work without the leading dot", () => {
            assert.equal(mimeType.lookup("html"), "text/html");
            assert.equal(mimeType.lookup("xml"), "application/xml");
        });

        it("should be case insensitive", () => {
            assert.equal(mimeType.lookup("HTML"), "text/html");
            assert.equal(mimeType.lookup(".Xml"), "application/xml");
        });

        it("should return false for unknown extension", () => {
            assert.strictEqual(mimeType.lookup(".bogus"), false);
            assert.strictEqual(mimeType.lookup("bogus"), false);
        });

        it("should return false for non-strings", () => {
            assert.strictEqual(mimeType.lookup(null), false);
            assert.strictEqual(mimeType.lookup(undefined), false);
            assert.strictEqual(mimeType.lookup(42), false);
            assert.strictEqual(mimeType.lookup({}), false);
        });
    });

    describe(".lookup(path)", () => {
        it("should return mime type for file name", () => {
            assert.equal(mimeType.lookup("page.html"), "text/html");
        });

        it("should return mime type for relative path", () => {
            assert.equal(mimeType.lookup("path/to/page.html"), "text/html");
            assert.equal(mimeType.lookup("path\\to\\page.html"), "text/html");
        });

        it("should return mime type for absolute path", () => {
            assert.equal(mimeType.lookup("/path/to/page.html"), "text/html");
            assert.equal(mimeType.lookup("C:\\path\\to\\page.html"), "text/html");
        });

        it("should be case insensitive", () => {
            assert.equal(mimeType.lookup("/path/to/PAGE.HTML"), "text/html");
            assert.equal(mimeType.lookup("C:\\path\\to\\PAGE.HTML"), "text/html");
        });

        it("should return false for unknown extension", () => {
            assert.strictEqual(mimeType.lookup("/path/to/file.bogus"), false);
        });

        it("should return false for path without extension", () => {
            assert.strictEqual(mimeType.lookup("/path/to/json"), false);
        });

        describe("path with dotfile", () => {
            it("should return false when extension-less", () => {
                assert.strictEqual(mimeType.lookup("/path/to/.json"), false);
            });

            it("should return mime type when there is extension", () => {
                assert.strictEqual(mimeType.lookup("/path/to/.config.json"), "application/json");
            });

            it("should return mime type when there is extension, but no path", () => {
                assert.strictEqual(mimeType.lookup(".config.json"), "application/json");
            });
        });
    });
});
