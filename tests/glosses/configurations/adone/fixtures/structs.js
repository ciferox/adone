export default [
    {
        name: "no entries in empty configuration",
        config: {},
        expectedEntries: []
    },
    {
        name: "no entries in configuration with empty struct",
        config: {
            struct: {}
        },
        expectedEntries: []
    },
    {
        name: "entry with relative path in 'src'",
        config: {
            struct: {
                lib: {
                    src: "src/"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: "src/**/*"
            }
        ]
    },
    {
        name: "entry with glob path in 'src'",
        config: {
            struct: {
                lib: {
                    src: "src/**/*.js"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: "src/**/*.js"
            }
        ]
    },
    {
        name: "entry with 'src' contains filename",
        config: {
            struct: {
                lib: {
                    src: "src/index.js"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: "src/index.js"
            }
        ]
    },
    {
        name: "entry with 'src' and 'dst'",
        config: {
            struct: {
                lib: {
                    src: "src/**/*.js",
                    dst: "lib"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: "src/**/*.js",
                dst: "lib"
            }
        ]
    },
    {
        name: "entry with 'src' and 'task' and default 'dst'",
        config: {
            struct: {
                lib: {
                    src: "src/*.js",
                    task: "copy"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: "src/*.js",
                dst: ".",
                task: "copy"
            }
        ]
    },
    {
        name: "entry with only 'namespace'",
        config: {
            struct: {
                lib: {
                    namespace: "adone"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                namespace: "adone"
            }
        ]
    },
    {
        name: "entry with 'src' and 'namespace'",
        config: {
            struct: {
                lib: {
                    src: "src/**/*.js",
                    namespace: "adone"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: "src/**/*.js",
                namespace: "adone",
                index: "index.js"
            }
        ]
    },
    {
        name: "entry with 'src', 'namespace' and 'index'",
        config: {
            struct: {
                lib: {
                    src: "src/**/*.js",
                    index: "adone.js",
                    namespace: "adone"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: "src/**/*.js",
                namespace: "adone",
                index: "adone.js"
            }
        ]
    },
    {
        name: "complex entry with sub structure",
        config: {
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
        },
        expectedEntries: [
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
        ]
    },
    {
        name: "complex entry with sub partial structure",
        config: {
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
        },
        expectedEntries: [
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
        ]
    },
    {
        name: "ignore children-excludes if specified only one file",
        config: {
            struct: {
                compressor: {
                    description: "Compressors",
                    namespace: "compressor",
                    task: "transpile",
                    src: "src/glosses/compressors/index.js",
                    dst: "lib/glosses/compressors",
                    struct: {
                        brotli: {
                            description: "Brotli compression format",
                            namespace: "brotli",
                            src: [
                                "src/glosses/compressors/brotli/**/*.js",
                                "!src/glosses/compressors/brotli/native/**/*"
                            ],
                            dst: "lib/glosses/compressors/brotli",
                            task: "transpile",
                            native: {
                                src: "src/glosses/compressors/brotli/native",
                                dst: "lib/glosses/compressors/brotli/native"
                            }
                        },
                        deflate: {
                            description: "Deflate compressor/decompressor",
                            namespace: "deflate",
                            task: "transpile",
                            src: "src/glosses/compressors/deflate.js",
                            dst: "lib/glosses/compressors"
                        },
                        gz: {
                            description: "Gzip compressor/decompressor",
                            namespace: "gz",
                            task: "transpile",
                            src: "src/glosses/compressors/gzip.js",
                            dst: "lib/glosses/compressors"
                        }
                    }
                }
            }
        },
        query: /compressor$/,
        expectedEntries: [
            {
                id: "compressor",
                description: "Compressors",
                namespace: "compressor",
                index: "index.js",
                task: "transpile",
                src: "src/glosses/compressors/index.js",
                dst: "lib/glosses/compressors"
            }
        ]
    },
    {
        name: "ignore children-excludes if specified array of non-globs",
        config: {
            struct: {
                compressor: {
                    description: "Compressors",
                    namespace: "compressor",
                    task: "transpile",
                    src: [
                        "src/glosses/compressors/index1.js",
                        "src/glosses/compressors/index2.js"
                    ],
                    dst: "lib/glosses/compressors",
                    struct: {
                        brotli: {
                            description: "Brotli compression format",
                            namespace: "brotli",
                            src: [
                                "src/glosses/compressors/brotli/**/*.js",
                                "!src/glosses/compressors/brotli/native/**/*"
                            ],
                            dst: "lib/glosses/compressors/brotli",
                            task: "transpile",
                            native: {
                                src: "src/glosses/compressors/brotli/native",
                                dst: "lib/glosses/compressors/brotli/native"
                            }
                        },
                        deflate: {
                            description: "Deflate compressor/decompressor",
                            namespace: "deflate",
                            task: "transpile",
                            src: "src/glosses/compressors/deflate.js",
                            dst: "lib/glosses/compressors"
                        },
                        gz: {
                            description: "Gzip compressor/decompressor",
                            namespace: "gz",
                            task: "transpile",
                            src: "src/glosses/compressors/gzip.js",
                            dst: "lib/glosses/compressors"
                        }
                    }
                }
            }
        },
        query: /compressor$/,
        expectedEntries: [
            {
                id: "compressor",
                description: "Compressors",
                namespace: "compressor",
                index: "index.js",
                task: "transpile",
                src: [
                    "src/glosses/compressors/index1.js",
                    "src/glosses/compressors/index2.js"
                ],
                dst: "lib/glosses/compressors"
            }
        ]
    },
    {
        name: "should exclude native stuff in 'src'",
        query: /lib$/,
        config: {
            struct: {
                lib: {
                    src: [
                        "src/**/*.js",
                        "!src/cli/adone.js"
                    ],
                    dst: "lib",
                    native: {
                        src: "src/native",
                        dst: "lib/native"
                    }
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: [
                    "src/**/*.js",
                    "!src/cli/adone.js",
                    "!src/native/**/*"
                ],
                dst: "lib",
                native: {
                    src: "src/native",
                    dst: "lib/native"
                }
            }
        ]
    },
    {
        name: "root entry should include child-excludes in 'src' from deep",
        query: /lib$/,
        config: {
            struct: {
                lib: {
                    description: "Glosses and components",
                    src: [
                        "src/**/*.js",
                        "!src/cli/adone.js"
                    ],
                    dst: "lib",
                    native: {
                        src: "src/native",
                        dst: "lib/native"
                    },
                    struct: {
                        compressor: {
                            description: "Compressors",
                            namespace: "compressor",
                            task: "transpile",
                            src: "src/glosses/compressors/index.js",
                            dst: "lib/glosses/compressors",
                            struct: {
                                brotli: {
                                    description: "Brotli compression format",
                                    namespace: "brotli",
                                    src: [
                                        "src/glosses/compressors/brotli/**/*.js",
                                        "!src/glosses/compressors/brotli/native/**/*"
                                    ],
                                    dst: "lib/glosses/compressors/brotli",
                                    task: "transpile",
                                    native: {
                                        src: "src/glosses/compressors/brotli/native",
                                        dst: "lib/glosses/compressors/brotli/native"
                                    }
                                },
                                deflate: {
                                    description: "Deflate compressor/decompressor",
                                    namespace: "deflate",
                                    task: "transpile",
                                    src: "src/glosses/compressors/deflate.js",
                                    dst: "lib/glosses/compressors"
                                },
                                gz: {
                                    description: "Gzip compressor/decompressor",
                                    namespace: "gz",
                                    task: "transpile",
                                    src: "src/glosses/compressors/gzip.js",
                                    dst: "lib/glosses/compressors"
                                }
                            }
                        }
                    }
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                description: "Glosses and components",
                src: [
                    "src/**/*.js",
                    "!src/cli/adone.js",
                    "!src/native/**/*",
                    "!src/glosses/compressors/index.js",
                    "!src/glosses/compressors/brotli/**/*.js",
                    "!src/glosses/compressors/brotli/native/**/*",
                    "!src/glosses/compressors/deflate.js",
                    "!src/glosses/compressors/gzip.js"
                ],
                dst: "lib",
                native: {
                    src: "src/native",
                    dst: "lib/native"
                }
            }
        ]
    },
    {
        name: "should not add duplicates of child-excludes in 'src' from deep",
        query: /lib$/,
        config: {
            struct: {
                lib: {
                    src: [
                        "src/**/*.js",
                        "!src/cli/adone.js",
                        "!src/native/**/*",
                        "!src/glosses/compressors/brotli/**/*.js",
                        "!src/glosses/compressors/deflate.js"
                    ],
                    dst: "lib",
                    native: {
                        src: "src/native",
                        dst: "lib/native"
                    },
                    struct: {
                        compressor: {
                            description: "Compressors",
                            namespace: "compressor",
                            task: "transpile",
                            src: "src/glosses/compressors/index.js",
                            dst: "lib/glosses/compressors",
                            struct: {
                                brotli: {
                                    description: "Brotli compression format",
                                    namespace: "brotli",
                                    src: [
                                        "src/glosses/compressors/brotli/**/*.js"
                                    ],
                                    dst: "lib/glosses/compressors/brotli",
                                    task: "transpile",
                                    native: {
                                        src: "src/glosses/compressors/brotli/native",
                                        dst: "lib/glosses/compressors/brotli/native"
                                    }
                                },
                                deflate: {
                                    description: "Deflate compressor/decompressor",
                                    namespace: "deflate",
                                    task: "transpile",
                                    src: "src/glosses/compressors/deflate.js",
                                    dst: "lib/glosses/compressors"
                                },
                                gz: {
                                    description: "Gzip compressor/decompressor",
                                    namespace: "gz",
                                    task: "transpile",
                                    src: "src/glosses/compressors/gzip.js",
                                    dst: "lib/glosses/compressors"
                                }
                            }
                        }
                    }
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: [
                    "src/**/*.js",
                    "!src/cli/adone.js",
                    "!src/native/**/*",
                    "!src/glosses/compressors/brotli/**/*.js",
                    "!src/glosses/compressors/deflate.js",
                    "!src/glosses/compressors/index.js",
                    "!src/glosses/compressors/brotli/native/**/*",
                    "!src/glosses/compressors/gzip.js"
                ],
                dst: "lib",
                native: {
                    src: "src/native",
                    dst: "lib/native"
                }
            }
        ]
    }
];
