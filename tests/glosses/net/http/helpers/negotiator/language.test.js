describe("glosses", "net", "http", "helpers", "negotiator", () => {
    const { util, net: { http: { helper: { Negotiator } } } } = adone;

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

    const whenAcceptLanguage = (acceptLanguage, func) => {
        const description = !acceptLanguage ? "when no Accept-Language" : `when Accept-Language: ${acceptLanguage}`;

        describe(description, () => {
            func(new Negotiator(createRequest({ "Accept-Language": acceptLanguage })));
        });
    };

    describe("negotiator.language()", () => {
        whenAcceptLanguage(undefined, (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.language(), "*");
            });
        });

        whenAcceptLanguage("*", (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.language(), "*");
            });
        });

        whenAcceptLanguage("*, en", (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.language(), "*");
            });
        });

        whenAcceptLanguage("*, en;q=0", (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.language(), "*");
            });
        });

        whenAcceptLanguage("*;q=0.8, en, es", (negotiator) => {
            it("should return en", () => {
                assert.deepEqual(negotiator.language(), "en");
            });
        });

        whenAcceptLanguage("en", (negotiator) => {
            it("should en", () => {
                assert.strictEqual(negotiator.language(), "en");
            });
        });

        whenAcceptLanguage("en;q=0", (negotiator) => {
            it("should return undefined", () => {
                assert.strictEqual(negotiator.language(), undefined);
            });
        });

        whenAcceptLanguage("en;q=0.8, es", (negotiator) => {
            it("should return es", () => {
                assert.strictEqual(negotiator.language(), "es");
            });
        });

        whenAcceptLanguage("en;q=0.9, es;q=0.8, en;q=0.7", (negotiator) => {
            it("should return en", () => {
                assert.strictEqual(negotiator.language(), "en");
            });
        });

        whenAcceptLanguage("en-US, en;q=0.8", (negotiator) => {
            it("should return en-US", () => {
                assert.strictEqual(negotiator.language(), "en-US");
            });
        });

        whenAcceptLanguage("en-US, en-GB", (negotiator) => {
            it("should return en-US", () => {
                assert.deepEqual(negotiator.language(), "en-US");
            });
        });

        whenAcceptLanguage("en-US;q=0.8, es", (negotiator) => {
            it("should return es", () => {
                assert.strictEqual(negotiator.language(), "es");
            });
        });

        whenAcceptLanguage("nl;q=0.5, fr, de, en, it, es, pt, no, se, fi, ro", (negotiator) => {
            it("should return fr", () => {
                assert.strictEqual(negotiator.language(), "fr");
            });
        });
    });

    describe("negotiator.language(array)", () => {
        whenAcceptLanguage(undefined, (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.language([]), undefined);
            });

            it("should return first language in list", () => {
                assert.strictEqual(negotiator.language(["en"]), "en");
                assert.strictEqual(negotiator.language(["es", "en"]), "es");
            });
        });

        whenAcceptLanguage("*", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.language([]), undefined);
            });

            it("should return first language in list", () => {
                assert.strictEqual(negotiator.language(["en"]), "en");
                assert.strictEqual(negotiator.language(["es", "en"]), "es");
            });
        });

        whenAcceptLanguage("*, en", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.language([]), undefined);
            });

            it("should return most preferred language", () => {
                assert.strictEqual(negotiator.language(["en"]), "en");
                assert.strictEqual(negotiator.language(["es", "en"]), "en");
            });
        });

        whenAcceptLanguage("*, en;q=0", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.language([]), undefined);
            });

            it("should exclude en", () => {
                assert.strictEqual(negotiator.language(["en"]), undefined);
                assert.strictEqual(negotiator.language(["es", "en"]), "es");
            });
        });

        whenAcceptLanguage("*;q=0.8, en, es", (negotiator) => {
            it("should prefer en and es over everything", () => {
                assert.deepEqual(negotiator.language(["en", "nl"]), "en");
                assert.deepEqual(negotiator.language(["ro", "nl"]), "ro");
            });
        });

        whenAcceptLanguage("en", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.language([]), undefined);
            });

            it("should return preferred langauge", () => {
                assert.strictEqual(negotiator.language(["en"]), "en");
                assert.strictEqual(negotiator.language(["es", "en"]), "en");
            });

            it("should accept en-US, preferring en over en-US", () => {
                assert.strictEqual(negotiator.language(["en-US"]), "en-US");
                assert.strictEqual(negotiator.language(["en-US", "en"]), "en");
                assert.strictEqual(negotiator.language(["en", "en-US"]), "en");
            });
        });

        whenAcceptLanguage("en;q=0", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.language([]), undefined);
            });

            it("should return preferred langauge", () => {
                assert.strictEqual(negotiator.language(["es", "en"]), undefined);
            });
        });

        whenAcceptLanguage("en;q=0.8, es", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.language([]), undefined);
            });

            it("should return preferred langauge", () => {
                assert.strictEqual(negotiator.language(["en"]), "en");
                assert.strictEqual(negotiator.language(["en", "es"]), "es");
            });
        });

        whenAcceptLanguage("en;q=0.9, es;q=0.8, en;q=0.7", (negotiator) => {
            it("should use highest perferred order on duplicate", () => {
                assert.strictEqual(negotiator.language(["es"]), "es");
                assert.strictEqual(negotiator.language(["en", "es"]), "en");
                assert.strictEqual(negotiator.language(["es", "en"]), "en");
            });
        });

        whenAcceptLanguage("en-US, en;q=0.8", (negotiator) => {
            it("should use prefer en-US over en", () => {
                assert.strictEqual(negotiator.language(["en", "en-US"]), "en-US");
                assert.strictEqual(negotiator.language(["en-GB", "en-US"]), "en-US");
                assert.strictEqual(negotiator.language(["en-GB", "es"]), "en-GB");
            });
        });

        whenAcceptLanguage("en-US, en-GB", (negotiator) => {
            it("should prefer en-US", () => {
                assert.deepEqual(negotiator.language(["en-US", "en-GB"]), "en-US");
                assert.deepEqual(negotiator.language(["en-GB", "en-US"]), "en-US");
            });
        });

        whenAcceptLanguage("en-US;q=0.8, es", (negotiator) => {
            it("should prefer es over en-US", () => {
                assert.strictEqual(negotiator.language(["es", "en-US"]), "es");
                assert.strictEqual(negotiator.language(["en-US", "es"]), "es");
                assert.strictEqual(negotiator.language(["en-US", "en"]), "en-US");
            });
        });

        whenAcceptLanguage("nl;q=0.5, fr, de, en, it, es, pt, no, se, fi, ro", (negotiator) => {
            it("should use prefer fr over nl", () => {
                assert.strictEqual(negotiator.language(["nl", "fr"]), "fr");
            });
        });
    });

    describe("negotiator.languages()", () => {
        whenAcceptLanguage(undefined, (negotiator) => {
            it("should return *", () => {
                assert.deepEqual(negotiator.languages(), ["*"]);
            });
        });

        whenAcceptLanguage("*", (negotiator) => {
            it("should return *", () => {
                assert.deepEqual(negotiator.languages(), ["*"]);
            });
        });

        whenAcceptLanguage("*, en", (negotiator) => {
            it("should return *, en", () => {
                assert.deepEqual(negotiator.languages(), ["*", "en"]);
            });
        });

        whenAcceptLanguage("*, en;q=0", (negotiator) => {
            it("should return *", () => {
                assert.deepEqual(negotiator.languages(), ["*"]);
            });
        });

        whenAcceptLanguage("*;q=0.8, en, es", (negotiator) => {
            it("should return preferred languages", () => {
                assert.deepEqual(negotiator.languages(), ["en", "es", "*"]);
            });
        });

        whenAcceptLanguage("en", (negotiator) => {
            it("should return preferred languages", () => {
                assert.deepEqual(negotiator.languages(), ["en"]);
            });
        });

        whenAcceptLanguage("en;q=0", (negotiator) => {
            it("should return empty list", () => {
                assert.deepEqual(negotiator.languages(), []);
            });
        });

        whenAcceptLanguage("en;q=0.8, es", (negotiator) => {
            it("should return preferred languages", () => {
                assert.deepEqual(negotiator.languages(), ["es", "en"]);
            });
        });

        whenAcceptLanguage("en;q=0.9, es;q=0.8, en;q=0.7", (negotiator) => {
            it.skip("should use highest perferred order on duplicate", () => {
                assert.deepEqual(negotiator.languages(), ["en", "es"]);
            });
        });

        whenAcceptLanguage("en-US, en;q=0.8", (negotiator) => {
            it("should return en-US, en", () => {
                assert.deepEqual(negotiator.languages(), ["en-US", "en"]);
            });
        });

        whenAcceptLanguage("en-US, en-GB", (negotiator) => {
            it("should return en-US, en-GB", () => {
                assert.deepEqual(negotiator.languages(), ["en-US", "en-GB"]);
            });
        });

        whenAcceptLanguage("en-US;q=0.8, es", (negotiator) => {
            it("should return es, en-US", () => {
                assert.deepEqual(negotiator.languages(), ["es", "en-US"]);
            });
        });

        whenAcceptLanguage("nl;q=0.5, fr, de, en, it, es, pt, no, se, fi, ro", (negotiator) => {
            it("should use prefer fr over nl", () => {
                assert.deepEqual(negotiator.languages(), ["fr", "de", "en", "it", "es", "pt", "no", "se", "fi", "ro", "nl"]);
            });
        });
    });

    describe("negotiator.languages(array)", () => {
        whenAcceptLanguage(undefined, (negotiator) => {
            it("should return original list", () => {
                assert.deepEqual(negotiator.languages(["en"]), ["en"]);
                assert.deepEqual(negotiator.languages(["es", "en"]), ["es", "en"]);
            });
        });

        whenAcceptLanguage("*", (negotiator) => {
            it("should return original list", () => {
                assert.deepEqual(negotiator.languages(["en"]), ["en"]);
                assert.deepEqual(negotiator.languages(["es", "en"]), ["es", "en"]);
            });
        });

        whenAcceptLanguage("*, en", (negotiator) => {
            it("should return list in client-preferred order", () => {
                assert.deepEqual(negotiator.languages(["en"]), ["en"]);
                assert.deepEqual(negotiator.languages(["es", "en"]), ["en", "es"]);
            });
        });

        whenAcceptLanguage("*, en;q=0", (negotiator) => {
            it("should exclude en", () => {
                assert.deepEqual(negotiator.languages(["en"]), []);
                assert.deepEqual(negotiator.languages(["es", "en"]), ["es"]);
            });
        });

        whenAcceptLanguage("*;q=0.8, en, es", (negotiator) => {
            it("should return preferred languages", () => {
                assert.deepEqual(negotiator.languages(["fr", "de", "en", "it", "es", "pt", "no", "se", "fi", "ro", "nl"]),
                    ["en", "es", "fr", "de", "it", "pt", "no", "se", "fi", "ro", "nl"]);
            });
        });

        whenAcceptLanguage("en", (negotiator) => {
            it("should return preferred languages", () => {
                assert.deepEqual(negotiator.languages(["en"]), ["en"]);
                assert.deepEqual(negotiator.languages(["en", "es"]), ["en"]);
                assert.deepEqual(negotiator.languages(["es", "en"]), ["en"]);
            });

            it("should accept en-US, preferring en over en-US", () => {
                assert.deepEqual(negotiator.languages(["en-US"]), ["en-US"]);
                assert.deepEqual(negotiator.languages(["en-US", "en"]), ["en", "en-US"]);
                assert.deepEqual(negotiator.languages(["en", "en-US"]), ["en", "en-US"]);
            });
        });

        whenAcceptLanguage("en;q=0", (negotiator) => {
            it("should return nothing", () => {
                assert.deepEqual(negotiator.languages(["en"]), []);
                assert.deepEqual(negotiator.languages(["en", "es"]), []);
            });
        });

        whenAcceptLanguage("en;q=0.8, es", (negotiator) => {
            it("should return preferred languages", () => {
                assert.deepEqual(negotiator.languages(["en"]), ["en"]);
                assert.deepEqual(negotiator.languages(["en", "es"]), ["es", "en"]);
                assert.deepEqual(negotiator.languages(["es", "en"]), ["es", "en"]);
            });
        });

        whenAcceptLanguage("en;q=0.9, es;q=0.8, en;q=0.7", (negotiator) => {
            it.skip("should return preferred languages", () => {
                assert.deepEqual(negotiator.languages(["en"]), ["en"]);
                assert.deepEqual(negotiator.languages(["en", "es"]), ["es", "en"]);
                assert.deepEqual(negotiator.languages(["es", "en"]), ["es", "en"]);
            });
        });

        whenAcceptLanguage("en-US, en;q=0.8", (negotiator) => {
            it("should be case insensitive", () => {
                assert.deepEqual(negotiator.languages(["en-us", "EN"]), ["en-us", "EN"]);
            });

            it("should prefer en-US over en", () => {
                assert.deepEqual(negotiator.languages(["en-US", "en"]), ["en-US", "en"]);
                assert.deepEqual(negotiator.languages(["en-GB", "en-US", "en"]), ["en-US", "en", "en-GB"]);
            });
        });

        whenAcceptLanguage("en-US, en-GB", (negotiator) => {
            it("should prefer en-US over en-GB", () => {
                assert.deepEqual(negotiator.languages(["en-US", "en-GB"]), ["en-US", "en-GB"]);
                assert.deepEqual(negotiator.languages(["en-GB", "en-US"]), ["en-US", "en-GB"]);
            });
        });

        whenAcceptLanguage("en-US;q=0.8, es", (negotiator) => {
            it("should prefer es over en-US", () => {
                assert.deepEqual(negotiator.languages(["en", "es"]), ["es", "en"]);
                assert.deepEqual(negotiator.languages(["en", "es", "en-US"]), ["es", "en-US", "en"]);
            });
        });

        whenAcceptLanguage("nl;q=0.5, fr, de, en, it, es, pt, no, se, fi, ro", (negotiator) => {
            it("should return preferred languages", () => {
                assert.deepEqual(negotiator.languages(["fr", "de", "en", "it", "es", "pt", "no", "se", "fi", "ro", "nl"]),
                    ["fr", "de", "en", "it", "es", "pt", "no", "se", "fi", "ro", "nl"]);
            });
        });
    });
});
