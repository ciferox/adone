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

    const whenAccept = (accept, func) => {
        const description = !accept ? "when no Accept" : `when Accept: ${accept}`;

        describe(description, () => {
            func(new Negotiator(createRequest({ Accept: accept })));
        });
    };

    const mediaTypesNegotiated = (negotiator, serverTypes, preferredTypes) => {
        return () => assert.deepEqual(negotiator.mediaTypes(serverTypes), preferredTypes);
    };

    const mediaTypesPreferred = (negotiator, preferredTypes) => () => assert.deepEqual(negotiator.mediaTypes(), preferredTypes);

    describe("negotiator.mediaType()", () => {
        whenAccept(undefined, (negotiator) => {
            it("should return */*", () => {
                assert.strictEqual(negotiator.mediaType(), "*/*");
            });
        });

        whenAccept("*/*", (negotiator) => {
            it("should return */*", () => {
                assert.strictEqual(negotiator.mediaType(), "*/*");
            });
        });

        whenAccept("application/json", (negotiator) => {
            it("should return application/json", () => {
                assert.deepEqual(negotiator.mediaType(), "application/json");
            });
        });

        whenAccept("application/json;q=0", (negotiator) => {
            it("should return undefined", () => {
                assert.strictEqual(negotiator.mediaType(), undefined);
            });
        });

        whenAccept("application/json;q=0.2, text/html", (negotiator) => {
            it("should return text/html", () => {
                assert.deepEqual(negotiator.mediaType(), "text/html");
            });
        });

        whenAccept("text/*", (negotiator) => {
            it("should return text/*", () => {
                assert.strictEqual(negotiator.mediaType(), "text/*");
            });
        });

        whenAccept("text/plain, application/json;q=0.5, text/html, */*;q=0.1", (negotiator) => {
            it("should return text/plain", () => {
                assert.strictEqual(negotiator.mediaType(), "text/plain");
            });
        });

        whenAccept("text/plain, application/json;q=0.5, text/html, text/xml, text/yaml, text/javascript, text/csv, text/css, text/rtf, text/markdown, application/octet-stream;q=0.2, */*;q=0.1", (negotiator) => {
            it("should return text/plain", () => {
                assert.strictEqual(negotiator.mediaType(), "text/plain");
            });
        });
    });

    describe("negotiator.mediaType(array)", () => {
        whenAccept(undefined, (negotiator) => {
            it("should return first item in list", () => {
                assert.strictEqual(negotiator.mediaType(["text/html"]), "text/html");
                assert.strictEqual(negotiator.mediaType(["text/html", "application/json"]), "text/html");
                assert.strictEqual(negotiator.mediaType(["application/json", "text/html"]), "application/json");
            });
        });

        whenAccept("*/*", (negotiator) => {
            it("should return first item in list", () => {
                assert.strictEqual(negotiator.mediaType(["text/html"]), "text/html");
                assert.strictEqual(negotiator.mediaType(["text/html", "application/json"]), "text/html");
                assert.strictEqual(negotiator.mediaType(["application/json", "text/html"]), "application/json");
            });
        });

        whenAccept("application/json", (negotiator) => {
            it("should be case insensitive", () => {
                assert.strictEqual(negotiator.mediaType(["application/JSON"]), "application/JSON");
            });

            it("should only return application/json", () => {
                assert.strictEqual(negotiator.mediaType(["text/html"]), undefined);
                assert.strictEqual(negotiator.mediaType(["text/html", "application/json"]), "application/json");
            });
        });

        whenAccept("application/json;q=0", (negotiator) => {
            it("should return undefined", () => {
                assert.strictEqual(negotiator.mediaType(), undefined);
            });
        });

        whenAccept("application/json;q=0.2, text/html", (negotiator) => {
            it("should prefer text/html over application/json", () => {
                assert.strictEqual(negotiator.mediaType(["application/json"]), "application/json");
                assert.strictEqual(negotiator.mediaType(["application/json", "text/html"]), "text/html");
                assert.strictEqual(negotiator.mediaType(["text/html", "application/json"]), "text/html");
            });
        });

        whenAccept("text/*", (negotiator) => {
            it("should prefer text media types", () => {
                assert.strictEqual(negotiator.mediaType(["application/json"]), undefined);
                assert.strictEqual(negotiator.mediaType(["application/json", "text/html"]), "text/html");
                assert.strictEqual(negotiator.mediaType(["text/html", "application/json"]), "text/html");
            });
        });

        whenAccept("text/*, text/plain;q=0", (negotiator) => {
            it("should prefer text media types", () => {
                assert.strictEqual(negotiator.mediaType(["application/json"]), undefined);
                assert.strictEqual(negotiator.mediaType(["application/json", "text/html"]), "text/html");
                assert.strictEqual(negotiator.mediaType(["text/html", "application/json"]), "text/html");
            });
        });

        whenAccept("text/plain, application/json;q=0.5, text/html, */*;q=0.1", (negotiator) => {
            it("should return in preferred order", () => {
                assert.strictEqual(negotiator.mediaType(["application/json", "text/plain", "text/html"]), "text/plain");
                assert.strictEqual(negotiator.mediaType(["image/jpeg", "text/html"]), "text/html");
                assert.strictEqual(negotiator.mediaType(["image/jpeg", "image/gif"]), "image/jpeg");
            });
        });

        whenAccept("text/plain, application/json;q=0.5, text/html, text/xml, text/yaml, text/javascript, text/csv, text/css, text/rtf, text/markdown, application/octet-stream;q=0.2, */*;q=0.1", (negotiator) => {
            it("should return the client-preferred order", () => {
                assert.strictEqual(negotiator.mediaType(["text/plain", "text/html", "text/xml", "text/yaml", "text/javascript", "text/csv", "text/css", "text/rtf", "text/markdown", "application/json", "application/octet-stream"]),
                    "text/plain");
            });
        });
    });

    describe("negotiator.mediaTypes()", () => {
        whenAccept(undefined, (negotiator) => {
            it("should return */*", () => {
                assert.deepEqual(negotiator.mediaTypes(), ["*/*"]);
            });
        });

        whenAccept("*/*", (negotiator) => {
            it("should return */*", mediaTypesPreferred(
                negotiator,
                ["*/*"]
            ));
        });

        whenAccept("application/json", (negotiator) => {
            it("should return application/json", () => {
                assert.deepEqual(negotiator.mediaTypes(), ["application/json"]);
            });
        });

        whenAccept("application/json;q=0", (negotiator) => {
            it("should return empty list", () => {
                assert.deepEqual(negotiator.mediaTypes(), []);
            });
        });

        whenAccept("application/json;q=0.2, text/html", (negotiator) => {
            it("should return text/html, application/json", () => {
                assert.deepEqual(negotiator.mediaTypes(), ["text/html", "application/json"]);
            });
        });

        whenAccept("text/*", (negotiator) => {
            it("should return text/*", () => {
                assert.deepEqual(negotiator.mediaTypes(), ["text/*"]);
            });
        });

        whenAccept("text/*, text/plain;q=0", (negotiator) => {
            it("should return text/*", () => {
                assert.deepEqual(negotiator.mediaTypes(), ["text/*"]);
            });
        });

        whenAccept("text/html;LEVEL=1", (negotiator) => {
            it("should return text/html;LEVEL=1", () => {
                assert.deepEqual(negotiator.mediaTypes(), ["text/html"]);
            });
        });

        whenAccept('text/html;foo="bar,text/css;";fizz="buzz,5", text/plain', (negotiator) => {
            it("should return text/html, text/plain", () => {
                assert.deepEqual(negotiator.mediaTypes(), ["text/html", "text/plain"]);
            });
        });

        whenAccept("text/plain, application/json;q=0.5, text/html, */*;q=0.1", (negotiator) => {
            it("should return text/plain, text/html, application/json, */*", () => {
                assert.deepEqual(negotiator.mediaTypes(), ["text/plain", "text/html", "application/json", "*/*"]);
            });
        });

        whenAccept("text/plain, application/json;q=0.5, text/html, text/xml, text/yaml, text/javascript, text/csv, text/css, text/rtf, text/markdown, application/octet-stream;q=0.2, */*;q=0.1", (negotiator) => {
            it("should return the client-preferred order", () => {
                assert.deepEqual(negotiator.mediaTypes(), ["text/plain", "text/html", "text/xml", "text/yaml", "text/javascript", "text/csv", "text/css", "text/rtf", "text/markdown", "application/json", "application/octet-stream", "*/*"]);
            });
        });
    });

    describe("negotiator.mediaTypes(array)", () => {
        whenAccept(undefined, (negotiator) => {
            it("should return return original list", mediaTypesNegotiated(
                negotiator,
                ["application/json", "text/plain"],
                ["application/json", "text/plain"]
            ));
        });

        whenAccept("*/*", (negotiator) => {
            it("should return return original list", mediaTypesNegotiated(
                negotiator,
                ["application/json", "text/plain"],
                ["application/json", "text/plain"]
            ));
        });

        whenAccept("*/*;q=0.8, text/*, image/*", (negotiator) => {
            it("should return return stable-sorted list", mediaTypesNegotiated(
                negotiator,
                ["application/json", "text/html", "text/plain", "text/xml", "application/xml", "image/gif", "image/jpeg", "image/png", "audio/mp3", "application/javascript", "text/javascript"],
                ["text/html", "text/plain", "text/xml", "text/javascript", "image/gif", "image/jpeg", "image/png", "application/json", "application/xml", "audio/mp3", "application/javascript"]
            ));
        });

        whenAccept("application/json", (negotiator) => {
            it("should accept application/json", mediaTypesNegotiated(
                negotiator,
                ["application/json"],
                ["application/json"]
            ));

            it("should be case insensitive", mediaTypesNegotiated(
                negotiator,
                ["application/JSON"],
                ["application/JSON"]
            ));

            it("should only return application/json", mediaTypesNegotiated(
                negotiator,
                ["text/html", "application/json"],
                ["application/json"]
            ));

            it("should ignore invalid types", mediaTypesNegotiated(
                negotiator,
                ["boom", "application/json"],
                ["application/json"]
            ));
        });

        whenAccept("application/json;q=0", (negotiator) => {
            it("should not accept application/json", mediaTypesNegotiated(
                negotiator,
                ["application/json"],
                []
            ));

            it("should not accept other media types", mediaTypesNegotiated(
                negotiator,
                ["application/json", "text/html", "image/jpeg"],
                []
            ));
        });

        whenAccept("application/json;q=0.2, text/html", (negotiator) => {
            it("should prefer text/html over application/json", mediaTypesNegotiated(
                negotiator,
                ["application/json", "text/html"],
                ["text/html", "application/json"]
            ));
        });

        whenAccept("application/json;q=0.9, text/html;q=0.8, application/json;q=0.7", (negotiator) => {
            it("should prefer application/json over text/html", mediaTypesNegotiated(
                negotiator,
                ["text/html", "application/json"],
                ["application/json", "text/html"]
            ));
        });

        whenAccept("application/json, */*;q=0.1", (negotiator) => {
            it("should prefer application/json over text/html", mediaTypesNegotiated(
                negotiator,
                ["text/html", "application/json"],
                ["application/json", "text/html"]
            ));
        });

        whenAccept('application/xhtml+xml;profile="http://www.wapforum.org/xhtml"', (negotiator) => {
            it('should accept application/xhtml+xml;profile="http://www.wapforum.org/xhtml"', mediaTypesNegotiated(
                negotiator,
                ['application/xhtml+xml;profile="http://www.wapforum.org/xhtml"'],
                ['application/xhtml+xml;profile="http://www.wapforum.org/xhtml"']
            ));
        });

        whenAccept("text/*", (negotiator) => {
            it("should prefer text media types", mediaTypesNegotiated(
                negotiator,
                ["text/html", "application/json", "text/plain"],
                ["text/html", "text/plain"]
            ));
        });

        whenAccept("text/*, text/html;level", (negotiator) => {
            it("should accept text/html", mediaTypesNegotiated(
                negotiator,
                ["text/html"],
                ["text/html"]
            ));
        });

        whenAccept("text/*, text/plain;q=0", (negotiator) => {
            it("should prefer text media types except text/plain", mediaTypesNegotiated(
                negotiator,
                ["text/html", "text/plain"],
                ["text/html"]
            ));
        });

        whenAccept("text/*, text/plain;q=0.5", (negotiator) => {
            it("should prefer text/plain below other text types", mediaTypesNegotiated(
                negotiator,
                ["text/html", "text/plain", "text/xml"],
                ["text/html", "text/xml", "text/plain"]
            ));
        });

        whenAccept("text/html;level=1", (negotiator) => {
            it("should accept text/html;level=1", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=1"],
                ["text/html;level=1"]
            ));

            it("should accept text/html;Level=1", mediaTypesNegotiated(
                negotiator,
                ["text/html;Level=1"],
                ["text/html;Level=1"]
            ));

            it("should not accept text/html;level=2", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=2"],
                []
            ));

            it("should not accept text/html", mediaTypesNegotiated(
                negotiator,
                ["text/html"],
                []
            ));

            it("should accept text/html;level=1;foo=bar", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=1;foo=bar"],
                ["text/html;level=1;foo=bar"]
            ));
        });

        whenAccept("text/html;level=1;foo=bar", (negotiator) => {
            it("should not accept text/html;level=1", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=1"],
                []
            ));

            it("should accept text/html;level=1;foo=bar", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=1;foo=bar"],
                ["text/html;level=1;foo=bar"]
            ));

            it("should accept text/html;foo=bar;level=1", mediaTypesNegotiated(
                negotiator,
                ["text/html;foo=bar;level=1"],
                ["text/html;foo=bar;level=1"]
            ));
        });

        whenAccept('text/html;level=1;foo="bar"', (negotiator) => {
            it("should accept text/html;level=1;foo=bar", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=1;foo=bar"],
                ["text/html;level=1;foo=bar"]
            ));

            it('should accept text/html;level=1;foo="bar"', mediaTypesNegotiated(
                negotiator,
                ['text/html;level=1;foo="bar"'],
                ['text/html;level=1;foo="bar"']
            ));
        });

        whenAccept('text/html;foo=";level=2;"', (negotiator) => {
            it("should not accept text/html;level=2", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=2"],
                []
            ));

            it('should accept text/html;foo=";level=2;"', mediaTypesNegotiated(
                negotiator,
                ['text/html;foo=";level=2;"'],
                ['text/html;foo=";level=2;"']
            ));
        });

        whenAccept("text/html;LEVEL=1", (negotiator) => {
            it("should accept text/html;level=1", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=1"],
                ["text/html;level=1"]
            ));

            it("should accept text/html;Level=1", mediaTypesNegotiated(
                negotiator,
                ["text/html;Level=1"],
                ["text/html;Level=1"]
            ));
        });

        whenAccept("text/html;LEVEL=1;level=2", (negotiator) => {
            it("should accept text/html;level=2", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=2"],
                ["text/html;level=2"]
            ));

            it("should not accept text/html;level=1", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=1"],
                []
            ));
        });

        whenAccept("text/html;level=2", (negotiator) => {
            it("should not accept text/html;level=1", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=1"],
                []
            ));
        });

        whenAccept("text/html;level=2, text/html", (negotiator) => {
            it("should prefer text/html;level=2 over text/html", mediaTypesNegotiated(
                negotiator,
                ["text/html", "text/html;level=2"],
                ["text/html;level=2", "text/html"]
            ));
        });

        whenAccept("text/html;level=2;q=0.1, text/html", (negotiator) => {
            it("should prefer text/html over text/html;level=2", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=2", "text/html"],
                ["text/html", "text/html;level=2"]
            ));
        });

        whenAccept("text/html;level=2;q=0.1;level=1", (negotiator) => {
            it("should not accept text/html;level=1", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=1"],
                []
            ));
        });

        whenAccept("text/html;level=2;q=0.1, text/html;level=1, text/html;q=0.5", (negotiator) => {
            it("should prefer text/html;level=1, text/html, text/html;level=2", mediaTypesNegotiated(
                negotiator,
                ["text/html;level=1", "text/html;level=2", "text/html"],
                ["text/html;level=1", "text/html", "text/html;level=2"]
            ));
        });

        whenAccept("text/plain, application/json;q=0.5, text/html, */*;q=0.1", (negotiator) => {
            it("should prefer text/plain over text/html", mediaTypesNegotiated(
                negotiator,
                ["text/html", "text/plain"],
                ["text/plain", "text/html"]
            ));

            it("should prefer application/json after text", mediaTypesNegotiated(
                negotiator,
                ["application/json", "text/html", "text/plain"],
                ["text/plain", "text/html", "application/json"]
            ));

            it("should prefer image/jpeg after text", mediaTypesNegotiated(
                negotiator,
                ["image/jpeg", "text/html", "text/plain"],
                ["text/plain", "text/html", "image/jpeg"]
            ));
        });

        whenAccept("text/plain, application/json;q=0.5, text/html, text/xml, text/yaml, text/javascript, text/csv, text/css, text/rtf, text/markdown, application/octet-stream;q=0.2, */*;q=0.1", (negotiator) => {
            it("should return the client-preferred order", mediaTypesNegotiated(
                negotiator,
                ["text/plain", "text/html", "text/xml", "text/yaml", "text/javascript", "text/csv", "text/css", "text/rtf", "text/markdown", "application/json", "application/octet-stream"],
                ["text/plain", "text/html", "text/xml", "text/yaml", "text/javascript", "text/csv", "text/css", "text/rtf", "text/markdown", "application/json", "application/octet-stream"]
            ));
        });
    });
});
