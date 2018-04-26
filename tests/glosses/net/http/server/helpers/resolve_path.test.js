describe("net", "http", "helpers", "resolve path", () => {
    const {
        std: { path: { sep, basename, join, normalize, resolve } },
        net: { http: { error, server: { helper: { resolvePath } } } }
    } = adone;

    describe("resolvePath(relativePath)", () => {
        describe("arguments", () => {
            describe("relativePath", () => {
                it("should be required", () => {
                    assert.throws(() => {
                        resolvePath();
                    }, /argument relativePath is required/);
                });

                it("should reject non-strings", () => {
                    for (const v of [42, {}, []]) {
                        assert.throws(() => {
                            resolvePath(v);
                        }, /argument relativePath must be a string/);
                    }
                });

                it("should resolve relative to cwd", () => {
                    assert.equal(normalize(resolvePath("index.js")), normalize(join(process.cwd(), "index.js")));
                });

                it("should resolve relative with special characters", () => {
                    assert.equal(normalize(resolvePath("f:oo$bar")),
                        normalize(join(process.cwd(), "./f:oo$bar")));
                });

                it("should accept empty string", () => {
                    assert.equal(normalize(resolvePath("")), normalize(process.cwd()));
                });
            });
        });

        describe("when relativePath is absolute", () => {
            it("should throw Malicious Path error", () => {
                assert.throws(() => {
                    resolvePath(join(__dirname, sep));
                }, error[400], "Malicious Path");
            });
        });

        describe("when relativePath contains a NULL byte", () => {
            it("should throw Malicious Path error", () => {
                assert.throws(() => {
                    resolvePath("hi\0there");
                }, error[400], "Malicious Path");
            });
        });

        describe("when relativePath resolves outside cwd", () => {
            it("should throw Forbidden error", () => {
                assert.throws(() => {
                    resolvePath("../index.js");
                }, error[403], "Forbidden");
            });
        });

        describe("when relativePath discloses cwd", () => {
            it("should throw Forbidden error", () => {
                assert.throws(() => {
                    resolvePath(join("test", "..", "..", basename(process.cwd()), "index.js"));
                }, error[403], "Forbidden");
            });
        });
    });

    describe("resolvePath(rootPath, relativePath)", () => {
        describe("arguments", () => {
            describe("rootPath", () => {
                it("should be required", () => {
                    assert.throws(() => {
                        resolvePath(undefined, "index.js");
                    }, /argument rootPath is required/);
                });

                it("should reject non-strings", () => {
                    for (const v of [42, {}, []]) {
                        assert.throws(() => {
                            resolvePath(v, "index.js");
                        }, /argument rootPath must be a string/);
                    }
                });

                it("should resolve relative to rootPath", () => {
                    assert.equal(normalize(resolvePath(__dirname, "index.js")), normalize(resolve(__dirname, "index.js")));
                });

                it("should resolve relative to rootPath with special characters", () => {
                    assert.equal(normalize(resolvePath(__dirname, "f:oo$bar")),
                        normalize(resolve(__dirname, "./f:oo$bar")));
                });

                it("should accept relative path", () => {
                    assert.equal(normalize(resolvePath(join(__dirname, ".."), "index.js")), normalize(resolve(join(__dirname, ".."), "index.js")));
                });
            });

            describe("relativePath", () => {
                it("should be required", () => {
                    assert.throws(() => {
                        resolvePath(__dirname, null);
                    }, /argument relativePath is required/);
                });

                it("should reject non-strings", () => {
                    for (const v of [42, {}, []]) {
                        assert.throws(() => {
                            resolvePath(__dirname, v);
                        }, /argument relativePath must be a string/);
                    }
                });

                it("should resolve relative to rootPath", () => {
                    assert.equal(normalize(resolvePath(__dirname, "index.js")), normalize(resolve(__dirname, "index.js")));
                });

                it("should accept empty string", () => {
                    assert.equal(normalize(resolvePath(__dirname, "")), normalize(__dirname));
                });
            });
        });

        describe("when relativePath is absolute", () => {
            it("should throw Malicious Path error", () => {
                assert.throws(() => {
                    resolvePath(__dirname, __dirname);
                }, error[400], "Malicious Path");
            });
        });

        describe("when relativePath contains a NULL byte", () => {
            it("should throw Malicious Path error", () => {
                assert.throws(() => {
                    resolvePath(__dirname, "hi\0there");
                }, error[400], "Malicious Path");
            });
        });

        describe("when relativePath resolves outside rootPath", () => {
            it("should throw Forbidden error", () => {
                assert.throws(() => {
                    resolvePath(__dirname, "../index.js");
                }, error[403], "Forbidden");
            });

            it("should not be tricked by missing separator", () => {
                assert.throws(() => {
                    resolvePath(__dirname, join("..", `${basename(__dirname)}2`, "index.js"));
                }, error[403], "Forbidden");
            });
        });

        describe("when relativePath discloses rootPath", () => {
            it("should throw Forbidden error", () => {
                assert.throws(() => {
                    resolvePath(__dirname, join("test", "..", "..", basename(__dirname), "index.js"));
                }, error[403], "Forbidden");
            });
        });
    });
});
