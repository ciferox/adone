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

    const whenAcceptEncoding = (acceptEncoding, func) => {
        const description = !acceptEncoding ? "when no Accept-Encoding" : `when Accept-Encoding: ${acceptEncoding}`;

        describe(description, () => {
            func(new Negotiator(createRequest({ "Accept-Encoding": acceptEncoding })));
        });
    };

    describe("negotiator.encoding()", () => {
        whenAcceptEncoding(undefined, (negotiator) => {
            it("should return identity", () => {
                assert.strictEqual(negotiator.encoding(), "identity");
            });
        });

        whenAcceptEncoding("*", (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.encoding(), "*");
            });
        });

        whenAcceptEncoding("*, gzip", (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.encoding(), "*");
            });
        });

        whenAcceptEncoding("*, gzip;q=0", (negotiator) => {
            it("should return *", () => {
                assert.strictEqual(negotiator.encoding(), "*");
            });
        });

        whenAcceptEncoding("*;q=0", (negotiator) => {
            it("should return undefined", () => {
                assert.strictEqual(negotiator.encoding(), undefined);
            });
        });

        whenAcceptEncoding("*;q=0, identity;q=1", (negotiator) => {
            it("should return identity", () => {
                assert.strictEqual(negotiator.encoding(), "identity");
            });
        });

        whenAcceptEncoding("identity", (negotiator) => {
            it("should return identity", () => {
                assert.strictEqual(negotiator.encoding(), "identity");
            });
        });

        whenAcceptEncoding("identity;q=0", (negotiator) => {
            it("should return undefined", () => {
                assert.strictEqual(negotiator.encoding(), undefined);
            });
        });

        whenAcceptEncoding("gzip", (negotiator) => {
            it("should return gzip", () => {
                assert.strictEqual(negotiator.encoding(), "gzip");
            });
        });

        whenAcceptEncoding("gzip, compress;q=0", (negotiator) => {
            it("should return gzip", () => {
                assert.strictEqual(negotiator.encoding(), "gzip");
            });
        });

        whenAcceptEncoding("gzip, deflate", (negotiator) => {
            it("should return gzip", () => {
                assert.strictEqual(negotiator.encoding(), "gzip");
            });
        });

        whenAcceptEncoding("gzip;q=0.8, deflate", (negotiator) => {
            it("should return deflate", () => {
                assert.strictEqual(negotiator.encoding(), "deflate");
            });
        });

        whenAcceptEncoding("gzip;q=0.8, identity;q=0.5, *;q=0.3", (negotiator) => {
            it("should return gzip", () => {
                assert.strictEqual(negotiator.encoding(), "gzip");
            });
        });
    });

    describe("negotiator.encoding(array)", () => {
        whenAcceptEncoding(undefined, (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.encoding([]), undefined);
            });

            it("should only match identity", () => {
                assert.strictEqual(negotiator.encoding(["identity"]), "identity");
                assert.strictEqual(negotiator.encoding(["gzip"]), undefined);
            });
        });

        whenAcceptEncoding("*", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.encoding([]), undefined);
            });

            it("should return first item in list", () => {
                assert.strictEqual(negotiator.encoding(["identity"]), "identity");
                assert.strictEqual(negotiator.encoding(["gzip"]), "gzip");
                assert.strictEqual(negotiator.encoding(["gzip", "identity"]), "gzip");
            });
        });

        whenAcceptEncoding("*, gzip", (negotiator) => {
            it("should prefer gzip", () => {
                assert.strictEqual(negotiator.encoding(["identity"]), "identity");
                assert.strictEqual(negotiator.encoding(["gzip"]), "gzip");
                assert.strictEqual(negotiator.encoding(["compress", "gzip"]), "gzip");
            });
        });

        whenAcceptEncoding("*, gzip;q=0", (negotiator) => {
            it("should exclude gzip", () => {
                assert.strictEqual(negotiator.encoding(["identity"]), "identity");
                assert.strictEqual(negotiator.encoding(["gzip"]), undefined);
                assert.strictEqual(negotiator.encoding(["gzip", "compress"]), "compress");
            });
        });

        whenAcceptEncoding("*;q=0", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.encoding([]), undefined);
            });

            it("should match nothing", () => {
                assert.strictEqual(negotiator.encoding(["identity"]), undefined);
                assert.strictEqual(negotiator.encoding(["gzip"]), undefined);
            });
        });

        whenAcceptEncoding("*;q=0, identity;q=1", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.encoding([]), undefined);
            });

            it("should still match identity", () => {
                assert.strictEqual(negotiator.encoding(["identity"]), "identity");
                assert.strictEqual(negotiator.encoding(["gzip"]), undefined);
            });
        });

        whenAcceptEncoding("identity", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.encoding([]), undefined);
            });

            it("should only match identity", () => {
                assert.strictEqual(negotiator.encoding(["identity"]), "identity");
                assert.strictEqual(negotiator.encoding(["gzip"]), undefined);
            });
        });

        whenAcceptEncoding("identity;q=0", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.encoding([]), undefined);
            });

            it("should match nothing", () => {
                assert.strictEqual(negotiator.encoding(["identity"]), undefined);
                assert.strictEqual(negotiator.encoding(["gzip"]), undefined);
            });
        });

        whenAcceptEncoding("gzip", (negotiator) => {
            it("should return undefined for empty list", () => {
                assert.strictEqual(negotiator.encoding([]), undefined);
            });

            it("should return client-preferred encodings", () => {
                assert.strictEqual(negotiator.encoding(["gzip"]), "gzip");
                assert.strictEqual(negotiator.encoding(["identity", "gzip"]), "gzip");
                assert.strictEqual(negotiator.encoding(["identity"]), "identity");
            });
        });

        whenAcceptEncoding("gzip, compress;q=0", (negotiator) => {
            it("should not return compress", () => {
                assert.strictEqual(negotiator.encoding(["compress"]), undefined);
                assert.strictEqual(negotiator.encoding(["deflate", "compress"]), undefined);
                assert.strictEqual(negotiator.encoding(["gzip", "compress"]), "gzip");
            });
        });

        whenAcceptEncoding("gzip, deflate", (negotiator) => {
            it("should return first client-preferred encoding", () => {
                assert.strictEqual(negotiator.encoding(["deflate", "compress"]), "deflate");
            });
        });

        whenAcceptEncoding("gzip;q=0.8, deflate", (negotiator) => {
            it("should return most client-preferred encoding", () => {
                assert.strictEqual(negotiator.encoding(["gzip"]), "gzip");
                assert.strictEqual(negotiator.encoding(["deflate"]), "deflate");
                assert.strictEqual(negotiator.encoding(["deflate", "gzip"]), "deflate");
            });
        });

        whenAcceptEncoding("gzip;q=0.8, identity;q=0.5, *;q=0.3", (negotiator) => {
            it("should return most client-preferred encoding", () => {
                assert.strictEqual(negotiator.encoding(["gzip"]), "gzip");
                assert.strictEqual(negotiator.encoding(["compress", "identity"]), "identity");
            });
        });
    });

    describe("negotiator.encodings()", () => {
        whenAcceptEncoding(undefined, (negotiator) => {
            it("should return identity", () => {
                assert.deepEqual(negotiator.encodings(), ["identity"]);
            });
        });

        whenAcceptEncoding("*", (negotiator) => {
            it("should return *", () => {
                assert.deepEqual(negotiator.encodings(), ["*"]);
            });
        });

        whenAcceptEncoding("*, gzip", (negotiator) => {
            it("should prefer gzip", () => {
                assert.deepEqual(negotiator.encodings(), ["*", "gzip"]);
            });
        });

        whenAcceptEncoding("*, gzip;q=0", (negotiator) => {
            it("should return *", () => {
                assert.deepEqual(negotiator.encodings(), ["*"]);
            });
        });

        whenAcceptEncoding("*;q=0", (negotiator) => {
            it("should return an empty list", () => {
                assert.deepEqual(negotiator.encodings(), []);
            });
        });

        whenAcceptEncoding("*;q=0, identity;q=1", (negotiator) => {
            it("should return identity", () => {
                assert.deepEqual(negotiator.encodings(), ["identity"]);
            });
        });

        whenAcceptEncoding("identity", (negotiator) => {
            it("should return identity", () => {
                assert.deepEqual(negotiator.encodings(), ["identity"]);
            });
        });

        whenAcceptEncoding("identity;q=0", (negotiator) => {
            it("should return an empty list", () => {
                assert.deepEqual(negotiator.encodings(), []);
            });
        });

        whenAcceptEncoding("gzip", (negotiator) => {
            it("should return gzip, identity", () => {
                assert.deepEqual(negotiator.encodings(), ["gzip", "identity"]);
            });
        });

        whenAcceptEncoding("gzip, compress;q=0", (negotiator) => {
            it("should not return compress", () => {
                assert.deepEqual(negotiator.encodings(), ["gzip", "identity"]);
            });
        });

        whenAcceptEncoding("gzip, deflate", (negotiator) => {
            it("should return client-preferred encodings", () => {
                assert.deepEqual(negotiator.encodings(), ["gzip", "deflate", "identity"]);
            });
        });

        whenAcceptEncoding("gzip;q=0.8, deflate", (negotiator) => {
            it("should return client-preferred encodings", () => {
                assert.deepEqual(negotiator.encodings(), ["deflate", "gzip", "identity"]);
            });
        });

        whenAcceptEncoding("gzip;q=0.8, identity;q=0.5, *;q=0.3", (negotiator) => {
            it("should return client-preferred encodings", () => {
                assert.deepEqual(negotiator.encodings(), ["gzip", "identity", "*"]);
            });
        });
    });

    describe("negotiator.encodings(array)", () => {
        whenAcceptEncoding(undefined, (negotiator) => {
            it("should return empty list for empty list", () => {
                assert.deepEqual(negotiator.encodings([]), []);
            });

            it("should only match identity", () => {
                assert.deepEqual(negotiator.encodings(["identity"]), ["identity"]);
                assert.deepEqual(negotiator.encodings(["gzip"]), []);
            });
        });

        whenAcceptEncoding("*", (negotiator) => {
            it("should return empty list for empty list", () => {
                assert.deepEqual(negotiator.encodings([]), []);
            });

            it("should return original list", () => {
                assert.deepEqual(negotiator.encodings(["identity"]), ["identity"]);
                assert.deepEqual(negotiator.encodings(["gzip"]), ["gzip"]);
                assert.deepEqual(negotiator.encodings(["gzip", "identity"]), ["gzip", "identity"]);
            });
        });

        whenAcceptEncoding("*, gzip", (negotiator) => {
            it("should prefer gzip", () => {
                assert.deepEqual(negotiator.encodings(["identity"]), ["identity"]);
                assert.deepEqual(negotiator.encodings(["gzip"]), ["gzip"]);
                assert.deepEqual(negotiator.encodings(["compress", "gzip"]), ["gzip", "compress"]);
            });
        });

        whenAcceptEncoding("*, gzip;q=0", (negotiator) => {
            it("should exclude gzip", () => {
                assert.deepEqual(negotiator.encodings(["identity"]), ["identity"]);
                assert.deepEqual(negotiator.encodings(["gzip"]), []);
                assert.deepEqual(negotiator.encodings(["gzip", "compress"]), ["compress"]);
            });
        });

        whenAcceptEncoding("*;q=0", (negotiator) => {
            it("should always return empty list", () => {
                assert.deepEqual(negotiator.encodings([]), []);
                assert.deepEqual(negotiator.encodings(["identity"]), []);
                assert.deepEqual(negotiator.encodings(["gzip"]), []);
            });
        });

        whenAcceptEncoding("*;q=0, identity;q=1", (negotiator) => {
            it("should still match identity", () => {
                assert.deepEqual(negotiator.encodings([]), []);
                assert.deepEqual(negotiator.encodings(["identity"]), ["identity"]);
                assert.deepEqual(negotiator.encodings(["gzip"]), []);
            });
        });

        whenAcceptEncoding("identity", (negotiator) => {
            it("should return empty list for empty list", () => {
                assert.deepEqual(negotiator.encodings([]), []);
            });

            it("should only match identity", () => {
                assert.deepEqual(negotiator.encodings(["identity"]), ["identity"]);
                assert.deepEqual(negotiator.encodings(["gzip"]), []);
            });
        });

        whenAcceptEncoding("identity;q=0", (negotiator) => {
            it("should always return empty list", () => {
                assert.deepEqual(negotiator.encodings([]), []);
                assert.deepEqual(negotiator.encodings(["identity"]), []);
                assert.deepEqual(negotiator.encodings(["gzip"]), []);
            });
        });

        whenAcceptEncoding("gzip", (negotiator) => {
            it("should return empty list for empty list", () => {
                assert.deepEqual(negotiator.encodings([]), []);
            });

            it("should be case insensitive, returning provided casing", () => {
                assert.deepEqual(negotiator.encodings(["GZIP"]), ["GZIP"]);
                assert.deepEqual(negotiator.encodings(["gzip", "GZIP"]), ["gzip", "GZIP"]);
                assert.deepEqual(negotiator.encodings(["GZIP", "gzip"]), ["GZIP", "gzip"]);
            });

            it("should return client-preferred encodings", () => {
                assert.deepEqual(negotiator.encodings(["gzip"]), ["gzip"]);
                assert.deepEqual(negotiator.encodings(["gzip", "identity"]), ["gzip", "identity"]);
                assert.deepEqual(negotiator.encodings(["identity", "gzip"]), ["gzip", "identity"]);
                assert.deepEqual(negotiator.encodings(["identity"]), ["identity"]);
            });
        });

        whenAcceptEncoding("gzip, compress;q=0", (negotiator) => {
            it("should not return compress", () => {
                assert.deepEqual(negotiator.encodings(["gzip", "compress"]), ["gzip"]);
            });
        });

        whenAcceptEncoding("gzip, deflate", (negotiator) => {
            it("should return client-preferred encodings", () => {
                assert.deepEqual(negotiator.encodings(["gzip"]), ["gzip"]);
                assert.deepEqual(negotiator.encodings(["gzip", "identity"]), ["gzip", "identity"]);
                assert.deepEqual(negotiator.encodings(["deflate", "gzip"]), ["gzip", "deflate"]);
                assert.deepEqual(negotiator.encodings(["identity"]), ["identity"]);
            });
        });

        whenAcceptEncoding("gzip;q=0.8, deflate", (negotiator) => {
            it("should return client-preferred encodings", () => {
                assert.deepEqual(negotiator.encodings(["gzip"]), ["gzip"]);
                assert.deepEqual(negotiator.encodings(["deflate"]), ["deflate"]);
                assert.deepEqual(negotiator.encodings(["deflate", "gzip"]), ["deflate", "gzip"]);
            });
        });

        whenAcceptEncoding("gzip;q=0.8, identity;q=0.5, *;q=0.3", (negotiator) => {
            it("should return client-preferred encodings", () => {
                assert.deepEqual(negotiator.encodings(["gzip"]), ["gzip"]);
                assert.deepEqual(negotiator.encodings(["identity", "gzip", "compress"]), ["gzip", "identity", "compress"]);
            });
        });
    });
});
