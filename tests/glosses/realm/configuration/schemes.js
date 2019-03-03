export default [
    {
        name: "no entries in empty configuration",
        config: {},
        expectedEntries: []
    },
    {
        name: "no entries in configuration with empty scheme",
        config: {
            scheme: {}
        },
        expectedEntries: []
    },
    {
        name: "entry with relative path in 'src'",
        config: {
            scheme: {
                lib: {
                    src: "src/"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: "src/**/*",
                index: "index.js"
            }
        ]
    },
    {
        name: "entry with glob path in 'src'",
        config: {
            scheme: {
                lib: {
                    src: "src/**/*.js"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: "src/**/*.js",
                index: "index.js"
            }
        ]
    },
    // {
    //     name: "entry with 'src' contains filename",
    //     config: {
    //         scheme: {
    //             lib: {
    //                 src: "src/index.js"
    //             }
    //         }
    //     },
    //     expectedEntries: [
    //         {
    //             id: "lib",
    //             src: "src/index.js"
    //         }
    //     ]
    // },
    {
        name: "entry with 'src' and 'dst'",
        config: {
            scheme: {
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
                dst: "lib",
                index: "index.js"
            }
        ]
    },
    {
        name: "entry with 'src' and 'task' and default 'dst'",
        config: {
            scheme: {
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
                index: "index.js",
                dst: ".",
                task: "copy"
            }
        ]
    },
    {
        name: "entry with 'src' and 'index'",
        config: {
            scheme: {
                lib: {
                    src: "src/**/*.js",
                    index: "adone.js"
                }
            }
        },
        expectedEntries: [
            {
                id: "lib",
                src: "src/**/*.js",
                index: "adone.js"
            }
        ]
    },
    // {
    //     name: "complex entry with sub structure",
    //     config: {
    //         scheme: {
    //             lib: {
    //                 index: "code:index.js",
    //                 scheme: {
    //                     code: {
    //                         task: "transpile",
    //                         src: [
    //                             "src/**/*.js",
    //                             "!src/assets/**/*"
    //                         ],
    //                         dst: "lib"
    //                     },
    //                     assets: {
    //                         src: "src/assets/**/*",
    //                         dst: "lib/assets"
    //                     }
    //                 }
    //             }
    //         }
    //     },
    //     expectedEntries: [
    //         {
    //             id: "lib",
    //             index: "code:index.js"
    //         },
    //         {
    //             id: "lib.code",
    //             task: "transpile",
    //             src: [
    //                 "src/**/*.js",
    //                 "!src/assets/**/*"
    //             ],
    //             dst: "lib"
    //         },
    //         {
    //             id: "lib.assets",
    //             src: "src/assets/**/*",
    //             dst: "lib/assets"
    //         }
    //     ]
    // },
    // {
    //     name: "complex entry with sub partial structure",
    //     config: {
    //         scheme: {
    //             lib: {
    //                 src: "src/**/*",
    //                 dst: "lib",
    //                 scheme: {
    //                     js: {
    //                         task: "transpile",
    //                         src: [
    //                             "src/**/*.js",
    //                             "!src/assets/**/*"
    //                         ]
    //                     }
    //                 }
    //             }
    //         }
    //     },
    //     expectedEntries: [
    //         {
    //             id: "lib",
    //             index: "index.js",
    //             src: [
    //                 "src/**/*",
    //                 "!src/**/*.js"
    //             ],
    //             dst: "lib"
    //         },
    //         {
    //             id: "lib.js",
    //             task: "transpile",
    //             src: [
    //                 "src/**/*.js",
    //                 "!src/assets/**/*"
    //             ],
    //             dst: "lib"
    //         }
    //     ]
    // },
    // {
    //     name: "ignore children-excludes if specified only one file",
    //     config: {
    //         scheme: {
    //             compressor: {
    //                 description: "Compressors",
    //                 task: "transpile",
    //                 src: "src/glosses/compressors/index.js",
    //                 dst: "lib/glosses/compressors",
    //                 scheme: {
    //                     brotli: {
    //                         description: "Brotli compression format",
    //                         src: [
    //                             "src/glosses/compressors/brotli/**/*.js",
    //                             "!src/glosses/compressors/brotli/native/**/*"
    //                         ],
    //                         dst: "lib/glosses/compressors/brotli",
    //                         task: "transpile",
    //                         native: {
    //                             src: "src/glosses/compressors/brotli/native",
    //                             dst: "lib/glosses/compressors/brotli/native"
    //                         }
    //                     },
    //                     deflate: {
    //                         description: "Deflate compressor/decompressor",
    //                         task: "transpile",
    //                         src: "src/glosses/compressors/deflate.js",
    //                         dst: "lib/glosses/compressors"
    //                     },
    //                     gz: {
    //                         description: "Gzip compressor/decompressor",
    //                         task: "transpile",
    //                         src: "src/glosses/compressors/gzip.js",
    //                         dst: "lib/glosses/compressors"
    //                     }
    //                 }
    //             }
    //         }
    //     },
    //     query: /compressor$/,
    //     expectedEntries: [
    //         {
    //             id: "compressor",
    //             description: "Compressors",
    //             index: "index.js",
    //             task: "transpile",
    //             src: "src/glosses/compressors/index.js",
    //             dst: "lib/glosses/compressors"
    //         }
    //     ]
    // },
    // {
    //     name: "ignore children-excludes if specified array of non-globs",
    //     config: {
    //         scheme: {
    //             compressor: {
    //                 description: "Compressors",
    //                 task: "transpile",
    //                 src: [
    //                     "src/glosses/compressors/index1.js",
    //                     "src/glosses/compressors/index2.js"
    //                 ],
    //                 dst: "lib/glosses/compressors",
    //                 scheme: {
    //                     brotli: {
    //                         description: "Brotli compression format",
    //                         src: [
    //                             "src/glosses/compressors/brotli/**/*.js",
    //                             "!src/glosses/compressors/brotli/native/**/*"
    //                         ],
    //                         dst: "lib/glosses/compressors/brotli",
    //                         task: "transpile",
    //                         native: {
    //                             src: "src/glosses/compressors/brotli/native",
    //                             dst: "lib/glosses/compressors/brotli/native"
    //                         }
    //                     },
    //                     deflate: {
    //                         description: "Deflate compressor/decompressor",
    //                         task: "transpile",
    //                         src: "src/glosses/compressors/deflate.js",
    //                         dst: "lib/glosses/compressors"
    //                     },
    //                     gz: {
    //                         description: "Gzip compressor/decompressor",
    //                         task: "transpile",
    //                         src: "src/glosses/compressors/gzip.js",
    //                         dst: "lib/glosses/compressors"
    //                     }
    //                 }
    //             }
    //         }
    //     },
    //     query: /compressor$/,
    //     expectedEntries: [
    //         {
    //             id: "compressor",
    //             description: "Compressors",
    //             index: "index.js",
    //             task: "transpile",
    //             src: [
    //                 "src/glosses/compressors/index1.js",
    //                 "src/glosses/compressors/index2.js"
    //             ],
    //             dst: "lib/glosses/compressors"
    //         }
    //     ]
    // },
    // {
    //     name: "should exclude native stuff in 'src'",
    //     query: /lib$/,
    //     config: {
    //         scheme: {
    //             lib: {
    //                 src: [
    //                     "src/**/*.js",
    //                     "!src/cli/adone.js"
    //                 ],
    //                 dst: "lib",
    //                 native: {
    //                     src: "src/native",
    //                     dst: "lib/native"
    //                 }
    //             }
    //         }
    //     },
    //     expectedEntries: [
    //         {
    //             id: "lib",
    //             src: [
    //                 "src/**/*.js",
    //                 "!src/cli/adone.js",
    //                 "!src/native/**/*"
    //             ],
    //             dst: "lib",
    //             native: {
    //                 src: "src/native",
    //                 dst: "lib/native"
    //             }
    //         }
    //     ]
    // },
    // {
    //     name: "root entry should include child-excludes in 'src' from deep",
    //     query: /lib$/,
    //     config: {
    //         scheme: {
    //             lib: {
    //                 description: "Glosses and components",
    //                 src: [
    //                     "src/**/*.js",
    //                     "!src/cli/adone.js"
    //                 ],
    //                 dst: "lib",
    //                 native: {
    //                     src: "src/native",
    //                     dst: "lib/native"
    //                 },
    //                 scheme: {
    //                     compressor: {
    //                         description: "Compressors",
    //                         task: "transpile",
    //                         src: "src/glosses/compressors/index.js",
    //                         dst: "lib/glosses/compressors",
    //                         scheme: {
    //                             brotli: {
    //                                 description: "Brotli compression format",
    //                                 src: [
    //                                     "src/glosses/compressors/brotli/**/*.js",
    //                                     "!src/glosses/compressors/brotli/native/**/*"
    //                                 ],
    //                                 dst: "lib/glosses/compressors/brotli",
    //                                 task: "transpile",
    //                                 native: {
    //                                     src: "src/glosses/compressors/brotli/native",
    //                                     dst: "lib/glosses/compressors/brotli/native"
    //                                 }
    //                             },
    //                             deflate: {
    //                                 description: "Deflate compressor/decompressor",
    //                                 task: "transpile",
    //                                 src: "src/glosses/compressors/deflate.js",
    //                                 dst: "lib/glosses/compressors"
    //                             },
    //                             gz: {
    //                                 description: "Gzip compressor/decompressor",
    //                                 task: "transpile",
    //                                 src: "src/glosses/compressors/gzip.js",
    //                                 dst: "lib/glosses/compressors"
    //                             }
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     },
    //     expectedEntries: [
    //         {
    //             id: "lib",
    //             description: "Glosses and components",
    //             src: [
    //                 "src/**/*.js",
    //                 "!src/cli/adone.js",
    //                 "!src/native/**/*",
    //                 "!src/glosses/compressors/index.js",
    //                 "!src/glosses/compressors/brotli/**/*.js",
    //                 "!src/glosses/compressors/brotli/native/**/*",
    //                 "!src/glosses/compressors/deflate.js",
    //                 "!src/glosses/compressors/gzip.js"
    //             ],
    //             dst: "lib",
    //             native: {
    //                 src: "src/native",
    //                 dst: "lib/native"
    //             }
    //         }
    //     ]
    // },
    // {
    //     name: "should not add duplicates of child-excludes in 'src' from deep",
    //     query: /lib$/,
    //     config: {
    //         scheme: {
    //             lib: {
    //                 src: [
    //                     "src/**/*.js",
    //                     "!src/cli/adone.js",
    //                     "!src/native/**/*",
    //                     "!src/glosses/compressors/brotli/**/*.js",
    //                     "!src/glosses/compressors/deflate.js"
    //                 ],
    //                 dst: "lib",
    //                 native: {
    //                     src: "src/native",
    //                     dst: "lib/native"
    //                 },
    //                 scheme: {
    //                     compressor: {
    //                         description: "Compressors",
    //                         task: "transpile",
    //                         src: "src/glosses/compressors/index.js",
    //                         dst: "lib/glosses/compressors",
    //                         scheme: {
    //                             brotli: {
    //                                 description: "Brotli compression format",
    //                                 src: [
    //                                     "src/glosses/compressors/brotli/**/*.js"
    //                                 ],
    //                                 dst: "lib/glosses/compressors/brotli",
    //                                 task: "transpile",
    //                                 native: {
    //                                     src: "src/glosses/compressors/brotli/native",
    //                                     dst: "lib/glosses/compressors/brotli/native"
    //                                 }
    //                             },
    //                             deflate: {
    //                                 description: "Deflate compressor/decompressor",
    //                                 task: "transpile",
    //                                 src: "src/glosses/compressors/deflate.js",
    //                                 dst: "lib/glosses/compressors"
    //                             },
    //                             gz: {
    //                                 description: "Gzip compressor/decompressor",
    //                                 task: "transpile",
    //                                 src: "src/glosses/compressors/gzip.js",
    //                                 dst: "lib/glosses/compressors"
    //                             }
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     },
    //     expectedEntries: [
    //         {
    //             id: "lib",
    //             src: [
    //                 "src/**/*.js",
    //                 "!src/cli/adone.js",
    //                 "!src/native/**/*",
    //                 "!src/glosses/compressors/brotli/**/*.js",
    //                 "!src/glosses/compressors/deflate.js",
    //                 "!src/glosses/compressors/index.js",
    //                 "!src/glosses/compressors/brotli/native/**/*",
    //                 "!src/glosses/compressors/gzip.js"
    //             ],
    //             dst: "lib",
    //             native: {
    //                 src: "src/native",
    //                 dst: "lib/native"
    //             }
    //         }
    //     ]
    // }
];
