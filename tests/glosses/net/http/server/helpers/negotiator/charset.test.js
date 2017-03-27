describe("glosses", "net", "http", "helpers", "negotiator", () => {
    const { util, net: { http: { server: { helper: { Negotiator } } } } } = adone;

    const createRequest = (headers) => {
        const request = {
            headers: {}
        };

        if (headers) {
            for (const [key, value] of util.entries(headers)) {
                request.headers[key.toLowerCase()] = value;
            }
        }

        return request;
    };

    const whenAcceptCharset = function whenAcceptCharset(acceptCharset, func) {
        const description = !acceptCharset ? "when no Accept-Charset" : `when Accept-Charset: ${acceptCharset}`;

        describe(description, () => {
            func(new Negotiator(createRequest({ "Accept-Charset": acceptCharset })));
        });
    };

    describe("negotiator.charset()", () => {
        whenAcceptCharset(undefined, (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.charset(), "*");
            });
        });

        whenAcceptCharset("*", (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.charset(), "*");
            });
        });

        whenAcceptCharset("*, UTF-8", (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.charset(), "*");
            });
        });

        whenAcceptCharset("*, UTF-8;q=0", (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.charset(), "*");
            });
        });

        whenAcceptCharset("ISO-8859-1", (negotiator) => {
            it("should return ISO-8859-1", () => {
                assert.strictEqual(negotiator.charset(), "ISO-8859-1");
            });
        });

        whenAcceptCharset("UTF-8;q=0", (negotiator) => {
            it("should return undefined", () => {
                assert.strictEqual(negotiator.charset(), undefined);
            });
        });

        whenAcceptCharset("UTF-8, ISO-8859-1", (negotiator) => {
            it("should return UTF-8", () => {
                assert.strictEqual(negotiator.charset(), "UTF-8");
            });
        });

        whenAcceptCharset("UTF-8;q=0.8, ISO-8859-1", (negotiator) => {
            it("should return ISO-8859-1", () => {
                assert.strictEqual(negotiator.charset(), "ISO-8859-1");
            });
        });

        whenAcceptCharset("UTF-8;q=0.9, ISO-8859-1;q=0.8, UTF-8;q=0.7", (negotiator) => {
            it("should return UTF-8", () => {
                assert.strictEqual(negotiator.charset(), "UTF-8");
            });
        });
    });

    describe("negotiator.charset(array)", () => {
        whenAcceptCharset(undefined, (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.charset([]), undefined);
            });

            it("should return first type in list", () => {
                assert.strictEqual(negotiator.charset(["UTF-8"]), "UTF-8");
                assert.strictEqual(negotiator.charset(["UTF-8", "ISO-8859-1"]), "UTF-8");
            });
        });

        whenAcceptCharset("*", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.charset([]), undefined);
            });

            it("should return first type in list", () => {
                assert.strictEqual(negotiator.charset(["UTF-8"]), "UTF-8");
                assert.strictEqual(negotiator.charset(["UTF-8", "ISO-8859-1"]), "UTF-8");
            });
        });

        whenAcceptCharset("*, UTF-8", (negotiator) => {
            it("should return first type in list", () => {
                assert.strictEqual(negotiator.charset(["UTF-8"]), "UTF-8");
                assert.strictEqual(negotiator.charset(["UTF-8", "ISO-8859-1"]), "UTF-8");
            });
        });

        whenAcceptCharset("*, UTF-8;q=0", (negotiator) => {
            it("should return most client-preferred charset", () => {
                assert.strictEqual(negotiator.charset(["UTF-8", "ISO-8859-1"]), "ISO-8859-1");
            });

            it("should exclude UTF-8", () => {
                assert.strictEqual(negotiator.charset(["UTF-8"]), undefined);
            });
        });

        whenAcceptCharset("ISO-8859-1", (negotiator) => {
            it("should return matching charset", () => {
                assert.strictEqual(negotiator.charset(["ISO-8859-1"]), "ISO-8859-1");
                assert.strictEqual(negotiator.charset(["UTF-8", "ISO-8859-1"]), "ISO-8859-1");
            });

            it("should be case insensitive, returning provided casing", () => {
                assert.strictEqual(negotiator.charset(["iso-8859-1"]), "iso-8859-1");
                assert.strictEqual(negotiator.charset(["iso-8859-1", "ISO-8859-1"]), "iso-8859-1");
                assert.strictEqual(negotiator.charset(["ISO-8859-1", "iso-8859-1"]), "ISO-8859-1");
            });

            it("should return undefined when no matching charsets", () => {
                assert.strictEqual(negotiator.charset(["utf-8"]), undefined);
            });
        });

        whenAcceptCharset("UTF-8;q=0", (negotiator) => {
            it("should always return undefined", () => {
                assert.strictEqual(negotiator.charset(["ISO-8859-1"]), undefined);
                assert.strictEqual(negotiator.charset(["UTF-8", "KOI8-R", "ISO-8859-1"]), undefined);
                assert.strictEqual(negotiator.charset(["KOI8-R"]), undefined);
            });
        });

        whenAcceptCharset("UTF-8, ISO-8859-1", (negotiator) => {
            it("should return first matching charset", () => {
                assert.strictEqual(negotiator.charset(["ISO-8859-1"]), "ISO-8859-1");
                assert.strictEqual(negotiator.charset(["UTF-8", "KOI8-R", "ISO-8859-1"]), "UTF-8");
            });

            it("should return undefined when no matching charsets", () => {
                assert.strictEqual(negotiator.charset(["KOI8-R"]), undefined);
            });
        });

        whenAcceptCharset("UTF-8;q=0.8, ISO-8859-1", (negotiator) => {
            it("should return most client-preferred charset", () => {
                assert.strictEqual(negotiator.charset(["ISO-8859-1"]), "ISO-8859-1");
                assert.strictEqual(negotiator.charset(["UTF-8", "KOI8-R", "ISO-8859-1"]), "ISO-8859-1");
                assert.strictEqual(negotiator.charset(["UTF-8", "KOI8-R"]), "UTF-8");
            });
        });

        whenAcceptCharset("UTF-8;q=0.9, ISO-8859-1;q=0.8, UTF-8;q=0.7", (negotiator) => {
            it("should use highest perferred order on duplicate", () => {
                assert.strictEqual(negotiator.charset(["ISO-8859-1"]), "ISO-8859-1");
                assert.strictEqual(negotiator.charset(["UTF-8", "ISO-8859-1"]), "UTF-8");
                assert.strictEqual(negotiator.charset(["ISO-8859-1", "UTF-8"]), "UTF-8");
            });
        });
    });

    describe("negotiator.charsets()", () => {
        whenAcceptCharset(undefined, (negotiator) => {
            it("should return *", () => {
                assert.deepEqual(negotiator.charsets(), ["*"]);
            });
        });

        whenAcceptCharset("*", (negotiator) => {
            it("should return *", () => {
                assert.deepEqual(negotiator.charsets(), ["*"]);
            });
        });

        whenAcceptCharset("*, UTF-8", (negotiator) => {
            it("should return client-preferred charsets", () => {
                assert.deepEqual(negotiator.charsets(), ["*", "UTF-8"]);
            });
        });

        whenAcceptCharset("*, UTF-8;q=0", (negotiator) => {
            it("should exclude UTF-8", () => {
                assert.deepEqual(negotiator.charsets(), ["*"]);
            });
        });

        whenAcceptCharset("UTF-8;q=0", (negotiator) => {
            it("should return empty list", () => {
                assert.deepEqual(negotiator.charsets(), []);
            });
        });

        whenAcceptCharset("ISO-8859-1", (negotiator) => {
            it("should return client-preferred charsets", () => {
                assert.deepEqual(negotiator.charsets(), ["ISO-8859-1"]);
            });
        });

        whenAcceptCharset("UTF-8, ISO-8859-1", (negotiator) => {
            it("should return client-preferred charsets", () => {
                assert.deepEqual(negotiator.charsets(), ["UTF-8", "ISO-8859-1"]);
            });
        });

        whenAcceptCharset("UTF-8;q=0.8, ISO-8859-1", (negotiator) => {
            it("should return client-preferred charsets", () => {
                assert.deepEqual(negotiator.charsets(), ["ISO-8859-1", "UTF-8"]);
            });
        });

        whenAcceptCharset("UTF-8;q=0.9, ISO-8859-1;q=0.8, UTF-8;q=0.7", (negotiator) => {
            it.skip("should use highest perferred order on duplicate", () => {
                assert.deepEqual(negotiator.charsets(), ["UTF-8", "ISO-8859-1"]);
            });
        });
    });

    describe("negotiator.charsets(array)", () => {
        whenAcceptCharset(undefined, (negotiator) => {
            it("should return empty list for empty list", () => {
                assert.deepEqual(negotiator.charsets([]), []);
            });

            it("should return original list", () => {
                assert.deepEqual(negotiator.charsets(["UTF-8"]), ["UTF-8"]);
                assert.deepEqual(negotiator.charsets(["UTF-8", "ISO-8859-1"]), ["UTF-8", "ISO-8859-1"]);
            });
        });

        whenAcceptCharset("*", (negotiator) => {
            it("should return empty list for empty list", () => {
                assert.deepEqual(negotiator.charsets([]), []);
            });

            it("should return original list", () => {
                assert.deepEqual(negotiator.charsets(["UTF-8"]), ["UTF-8"]);
                assert.deepEqual(negotiator.charsets(["UTF-8", "ISO-8859-1"]), ["UTF-8", "ISO-8859-1"]);
            });
        });

        whenAcceptCharset("*, UTF-8", (negotiator) => {
            it("should return matching charsets", () => {
                assert.deepEqual(negotiator.charsets(["UTF-8"]), ["UTF-8"]);
                assert.deepEqual(negotiator.charsets(["UTF-8", "ISO-8859-1"]), ["UTF-8", "ISO-8859-1"]);
            });
        });

        whenAcceptCharset("*, UTF-8;q=0", (negotiator) => {
            it("should exclude UTF-8", () => {
                assert.deepEqual(negotiator.charsets(["UTF-8"]), []);
                assert.deepEqual(negotiator.charsets(["UTF-8", "ISO-8859-1"]), ["ISO-8859-1"]);
            });
        });

        whenAcceptCharset("UTF-8;q=0", (negotiator) => {
            it("should always return empty list", () => {
                assert.deepEqual(negotiator.charsets(["ISO-8859-1"]), []);
                assert.deepEqual(negotiator.charsets(["UTF-8", "KOI8-R", "ISO-8859-1"]), []);
                assert.deepEqual(negotiator.charsets(["KOI8-R"]), []);
            });
        });

        whenAcceptCharset("ISO-8859-1", (negotiator) => {
            it("should return matching charsets", () => {
                assert.deepEqual(negotiator.charsets(["ISO-8859-1"]), ["ISO-8859-1"]);
                assert.deepEqual(negotiator.charsets(["UTF-8", "ISO-8859-1"]), ["ISO-8859-1"]);
            });

            it("should be case insensitive, returning provided casing", () => {
                assert.deepEqual(negotiator.charsets(["iso-8859-1"]), ["iso-8859-1"]);
                assert.deepEqual(negotiator.charsets(["iso-8859-1", "ISO-8859-1"]), ["iso-8859-1", "ISO-8859-1"]);
                assert.deepEqual(negotiator.charsets(["ISO-8859-1", "iso-8859-1"]), ["ISO-8859-1", "iso-8859-1"]);
            });

            it("should return empty list when no matching charsets", () => {
                assert.deepEqual(negotiator.charsets(["utf-8"]), []);
            });
        });

        whenAcceptCharset("UTF-8, ISO-8859-1", (negotiator) => {
            it("should return matching charsets", () => {
                assert.deepEqual(negotiator.charsets(["ISO-8859-1"]), ["ISO-8859-1"]);
                assert.deepEqual(negotiator.charsets(["UTF-8", "KOI8-R", "ISO-8859-1"]), ["UTF-8", "ISO-8859-1"]);
            });

            it("should return empty list when no matching charsets", () => {
                assert.deepEqual(negotiator.charsets(["KOI8-R"]), []);
            });
        });

        whenAcceptCharset("UTF-8;q=0.8, ISO-8859-1", (negotiator) => {
            it("should return matching charsets in client-preferred order", () => {
                assert.deepEqual(negotiator.charsets(["ISO-8859-1"]), ["ISO-8859-1"]);
                assert.deepEqual(negotiator.charsets(["UTF-8", "KOI8-R", "ISO-8859-1"]), ["ISO-8859-1", "UTF-8"]);
            });

            it("should return empty list when no matching charsets", () => {
                assert.deepEqual(negotiator.charsets(["KOI8-R"]), []);
            });
        });

        whenAcceptCharset("UTF-8;q=0.9, ISO-8859-1;q=0.8, UTF-8;q=0.7", (negotiator) => {
            it("should use highest perferred order on duplicate", () => {
                assert.deepEqual(negotiator.charsets(["ISO-8859-1"]), ["ISO-8859-1"]);
                assert.deepEqual(negotiator.charsets(["UTF-8", "ISO-8859-1"]), ["UTF-8", "ISO-8859-1"]);
                assert.deepEqual(negotiator.charsets(["ISO-8859-1", "UTF-8"]), ["UTF-8", "ISO-8859-1"]);
            });
        });
    });
});
