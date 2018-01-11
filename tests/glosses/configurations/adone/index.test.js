const {
    is,
    configuration,
    std
} = adone;

describe("configuration", "Adone", () => {
    const fixture = (name = "") => std.path.join(__dirname, "fixtures", name);
    const fictureDir = new adone.fs.Directory(fixture());

    afterEach(async () => {
        await fictureDir.unlink({
            relPath: "proj"
        });
    });

    it("minimum possible configuration", async () => {
        await FS.createStructure(fictureDir, [
            ["proj", [
                ["adone.json", "{}"]
            ]]
        ]);

        const conf = await configuration.Adone.load({
            cwd: fixture("proj")
        });

        assert.deepEqual(conf.raw, {});
    });

    describe("structure", () => {
        it("no entries in empty configuration", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", "{}"]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });
            assert.deepEqual(conf.raw, {});
            assert.lengthOf(conf.getEntries(), 0);
        });

        it("no entries in configuration with empty struct", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {}
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {}
            });
            assert.lengthOf(conf.getEntries(), 0);
        });

        it("entry with relative path in 'src'", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                src: "src/"
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {
                    lib: {
                        src: "src/"
                    }
                }
            });

            assert.sameDeepMembers(conf.getEntries(), [
                {
                    id: "lib",
                    src: "src/**/*"
                }
            ]);
        });

        it("entry with glob path in 'src'", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                src: "src/**/*.js"
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {
                    lib: {
                        src: "src/**/*.js"
                    }
                }
            });

            assert.sameDeepMembers(conf.getEntries(), [
                {
                    id: "lib",
                    src: "src/**/*.js"
                }
            ]);
        });

        it("entry with 'src' contains filename", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                src: "src/index.js"
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {
                    lib: {
                        src: "src/index.js"
                    }
                }
            });

            assert.sameDeepMembers(conf.getEntries(), [
                {
                    id: "lib",
                    src: "src/index.js"
                }
            ]);
        });

        it("entry with 'src' and 'dst'", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                src: "src/**/*.js",
                                dst: "lib"
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {
                    lib: {
                        src: "src/**/*.js",
                        dst: "lib"
                    }
                }
            });

            assert.sameDeepMembers(conf.getEntries(), [
                {
                    id: "lib",
                    src: "src/**/*.js",
                    dst: "lib"
                }
            ]);
        });

        it("entry with only 'task' should have thrown", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                task: "copy"
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            await assert.throws(async () => conf.getEntries(), adone.x.NotValid);
        });

        it("entry with 'src' and 'task' and default 'dst'", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                src: "src/*.js",
                                task: "copy"
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {
                    lib: {
                        src: "src/*.js",
                        task: "copy"
                    }
                }
            });

            assert.sameDeepMembers(conf.getEntries(), [
                {
                    id: "lib",
                    src: "src/*.js",
                    dst: ".",
                    task: "copy"
                }
            ]);
        });

        it("entry with only 'namespace'", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                namespace: "adone"
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {
                    lib: {
                        namespace: "adone"
                    }
                }
            });

            assert.sameDeepMembers(conf.getEntries(), [
                {
                    id: "lib",
                    namespace: "adone"
                }
            ]);
        });

        it("entry with 'src' and 'namespace'", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                src: "src/**/*.js",
                                namespace: "adone"
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {
                    lib: {
                        src: "src/**/*.js",
                        namespace: "adone"
                    }
                }
            });

            assert.sameDeepMembers(conf.getEntries(), [
                {
                    id: "lib",
                    src: "src/**/*.js",
                    namespace: "adone",
                    index: "index.js"
                }
            ]);
        });

        it("entry with 'src', 'namespace' and 'index'", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                src: "src/**/*.js",
                                index: "adone.js",
                                namespace: "adone"
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {
                    lib: {
                        src: "src/**/*.js",
                        index: "adone.js",
                        namespace: "adone"
                    }
                }
            });

            assert.sameDeepMembers(conf.getEntries(), [
                {
                    id: "lib",
                    src: "src/**/*.js",
                    namespace: "adone",
                    index: "adone.js"
                }
            ]);
        });

        it("complex entry with sub structure", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                namespace: "adone",
                                index: "code:index.js",
                                struct: {
                                    code: {
                                        task: "transpile",
                                        src: [
                                            "src/**/*.js",
                                            "!src/assets/**/*"
                                        ],
                                        dst: "lib"
                                    },
                                    assets: {
                                        src: "src/assets/**/*",
                                        dst: "lib/assets"
                                    }
                                }
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {
                    lib: {
                        namespace: "adone",
                        index: "code:index.js",
                        struct: {
                            code: {
                                task: "transpile",
                                src: [
                                    "src/**/*.js",
                                    "!src/assets/**/*"
                                ],
                                dst: "lib"
                            },
                            assets: {
                                src: "src/assets/**/*",
                                dst: "lib/assets"
                            }
                        }
                    }
                }
            });

            assert.sameDeepMembers(conf.getEntries(), [
                {
                    id: "lib",
                    namespace: "adone",
                    index: "code:index.js"
                },
                {
                    id: "lib.code",
                    task: "transpile",
                    src: [
                        "src/**/*.js",
                        "!src/assets/**/*"
                    ],
                    dst: "lib"
                },
                {
                    id: "lib.assets",
                    src: "src/assets/**/*",
                    dst: "lib/assets"
                }
            ]);
        });

        it("complex entry with sub partial structure", async () => {
            await FS.createStructure(fictureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                namespace: "adone",
                                src: "src/**/*",
                                dst: "lib",
                                struct: {
                                    js: {
                                        task: "transpile",
                                        src: [
                                            "src/**/*.js",
                                            "!src/assets/**/*"
                                        ]
                                    }
                                }
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            assert.deepEqual(conf.raw, {
                struct: {
                    lib: {
                        namespace: "adone",
                        src: "src/**/*",
                        dst: "lib",
                        struct: {
                            js: {
                                task: "transpile",
                                src: [
                                    "src/**/*.js",
                                    "!src/assets/**/*"
                                ]
                            }
                        }
                    }
                }
            });

            assert.sameDeepMembers(conf.getEntries(), [
                {
                    id: "lib",
                    namespace: "adone",
                    index: "index.js",
                    src: [
                        "src/**/*",
                        "!src/**/*.js"
                    ],
                    dst: "lib"
                },
                {
                    id: "lib.js",
                    task: "transpile",
                    src: [
                        "src/**/*.js",
                        "!src/assets/**/*"
                    ],
                    dst: "lib"
                }
            ]);
        });

        it("multiple root namespaces is not allowed", async () => {
            const conf = await configuration.Adone.load({
                cwd: fixture("multiple_root_namespaces")
            });
            await assert.throws(async () => conf.getNamespace(), adone.x.NotAllowed);
        });
    });

    describe("sub configurations", () => {
        let config;

        beforeEach(async () => {
            config = await configuration.Adone.load({
                cwd: fixture("sub_configs")
            });
        });

        it("should load all sub configurations", async () => {
            const subConfigs = config.getSubConfigs();
            assert.lengthOf(subConfigs, 2);
        });

        it("get sub configuration by name", async () => {
            const subConfig = config.getSubConfig("sub2").config;

            assert.equal(subConfig.raw.name, "another_name");
            assert.equal(subConfig.raw.description, "another_descr");
            assert.equal(subConfig.raw.version, "2.0.0");
            assert.equal(subConfig.raw.author, "noname");
        });

        it("project entries of main configuration", async () => {
            assert.sameDeepMembers(config.getEntries(), [
                {
                    id: "sub1.js",
                    task: "transpile",
                    src: "sub1/src/*",
                    dst: "sub1/dst"
                },
                {
                    id: "sub2.js",
                    task: "transpile",
                    src: "sub2/src/**/*.js",
                    dst: "sub2/lib"
                },
                {
                    id: "sub2.other",
                    src: ["!sub2/src/**/*.js", "sub2/src/**/*"],
                    dst: "sub2/lib"
                }
            ]);

            assert.sameDeepMembers(config.getEntries("sub2"), [
                {
                    id: "sub2.js",
                    task: "transpile",
                    src: "sub2/src/**/*.js",
                    dst: "sub2/lib"
                },
                {
                    id: "sub2.other",
                    src: ["!sub2/src/**/*.js", "sub2/src/**/*"],
                    dst: "sub2/lib"
                }
            ]);
        });

        it("project entries of sub configurations", async () => {
            const subConfig1 = config.getSubConfig("sub1").config;
            const subConfig2 = config.getSubConfig("sub2").config;

            assert.sameDeepMembers(subConfig1.getEntries(), [
                {
                    id: "js",
                    task: "transpile",
                    src: "src/*",
                    dst: "dst"
                }
            ]);

            assert.sameDeepMembers(subConfig2.getEntries(), [
                {
                    id: "js",
                    task: "transpile",
                    src: "src/**/*.js",
                    dst: "lib"
                },
                {
                    id: "other",
                    src: ["!src/**/*.js", "src/**/*"],
                    dst: "lib"
                }
            ]);

            assert.sameDeepMembers(subConfig2.getEntries("js"), [
                {
                    id: "js",
                    task: "transpile",
                    src: "src/**/*.js",
                    dst: "lib"
                }
            ]);
        });
    });

    describe("adone configuration", () => {
        let config;
        let rawConfig;

        beforeEach(async () => {
            config = await configuration.Adone.load({
                cwd: std.path.join(adone.rootPath)
            });
            rawConfig = config.raw;
        });

        it("load config", async () => {
            assert.equal(rawConfig.name, "adone");
            assert.equal(rawConfig.description, "The generalized core of 'cyber-fractal systems' infrastructure.");
            assert.equal(rawConfig.version, "0.6.71");
            assert.equal(rawConfig.author, "Adone Core Team <info@adone.io>");
            assert.true(is.plainObject(rawConfig.struct));
        });

        it("project entries", async () => {
            assert.includeDeepMembers(config.getEntries(), [
                {
                    id: "assets",
                    description: "Assets",
                    src: [
                        "src/**/*",
                        "!src/**/*.js",
                        "!src/glosses/schema/__/dot/*",
                        "!src/**/native/**/*"
                    ],
                    dst: "lib",
                    dstClean: [
                        "lib/**/*",
                        "!lib/**/*.js",
                        "!lib/**/*.map",
                        "!lib/native/**/*"
                    ]
                },
                {
                    id: "lib.data",
                    description: "Data generic manipulation utilites and serializers",
                    src: [
                        "src/glosses/data/**/*.js",
                        "!src/glosses/data/base64.js",
                        "!src/glosses/data/bson/**/*.js",
                        "!src/glosses/data/json/**/*.js",
                        "!src/glosses/data/json5.js",
                        "!src/glosses/data/mpak.js",
                        "!src/glosses/data/yaml/**/*.js",
                        "!src/glosses/data/base58.js",
                        "!src/glosses/data/varint.js",
                        "!src/glosses/data/varint_signed.js",
                        "!src/glosses/data/protobuf/**/*.js",
                    ],
                    dst: "lib/glosses/data",
                    dstClean: "lib/glosses/data/**/*",
                    task: "transpile",
                    namespace: "data",
                    index: "index.js"
                },
                {
                    id: "lib.data.base64",
                    description: "Implementation of BASE64 serializer",
                    index: "glosses/data/base64",
                    src: "src/glosses/data/base64.js",
                    dst: "lib/glosses/data",
                    task: "transpile",
                    namespace: "base64"
                }
            ]);
        });

        it("project entries for path", async () => {
            assert.sameDeepMembers(config.getEntries("lib.templating"), [
                {
                    id: "lib.templating",
                    description: "Template engines",
                    index: "index.js",
                    task: "adoneTranspile",
                    src: [
                        "src/glosses/templating/**/*.js",
                        "!src/glosses/templating/dot/**/*.js",
                        "!src/glosses/templating/nunjucks/**/*.js"
                    ],
                    dst: "lib/glosses/templating",
                    dstClean: "lib/glosses/templating/**/*",
                    namespace: "templating"
                },
                {
                    id: "lib.templating.dot",
                    description: "Implementation of DoT template engine",
                    src: "src/glosses/templating/dot/**/*.js",
                    dst: "lib/glosses/templating/dot",
                    task: "adoneTranspile",
                    namespace: "dot",
                    index: "index.js"
                },
                {
                    id: "lib.templating.nunjucks",
                    description: "Implementation of Nunjucks template engine",
                    src: "src/glosses/templating/nunjucks/**/*.js",
                    dst: "lib/glosses/templating/nunjucks",
                    task: "adoneTranspile",
                    namespace: "nunjucks",
                    index: "index.js"
                }
            ]);
        });
    });
});
