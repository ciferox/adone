export default [
    {
        name: "no namespaces",
        config: {
            struct: {
                bin: {
                    description: "Adone CLI",
                    src: "src/cli/adone.js",
                    dst: "bin",
                    task: "adoneTranspileExe"
                }
            }
        },
        expected: {}
    },
    {
        name: "no namespaces with index",
        config: {
            struct: {
                bin: {
                    description: "Adone CLI",
                    src: "src/cli/adone.js",
                    dst: "bin",
                    task: "adoneTranspileExe",
                    index: "index.js"
                }
            }
        },
        expected: {}
    },
    {
        name: "namespace with default index",
        config: {
            struct: {
                lib: {
                    author: "Adone Core Team",
                    description: "Glosses and components",
                    src: [
                        "src/**/*.js",
                        "!src/cli/adone.js",
                        "!src/native/**/*"
                    ],
                    dst: "lib",
                    namespace: "adone"
                }
            }
        },
        expected: {
            adone: {
                author: "Adone Core Team",
                description: "Glosses and components",
                index: {
                    src: "src/index.js",
                    dst: "lib/index.js"
                }
            }
        }
    },
    {
        name: "namespace with specified index",
        config: {
            struct: {
                lib: {
                    src: "src/**/*.js",
                    dst: "lib",
                    index: "adone.js",
                    namespace: "adone"
                }
            }
        },
        expected: {
            adone: {
                index: {
                    src: "src/adone.js",
                    dst: "lib/adone.js"
                }
            }
        }
    },
    {
        name: "sub namespaces",
        config: {
            struct: {
                lib: {
                    src: [
                        "src/**/*.js",
                        "!src/cli/adone.js",
                        "!src/native/**/*"
                    ],
                    dst: "lib",
                    namespace: "adone",
                    struct: {
                        cli: {
                            src: [
                                "src/cli/**/*",
                                "!src/cli/adone.js"
                            ],
                            dst: "lib/cli",
                            task: "adoneTranspile",
                            namespace: "cli"
                        },
                        app: {
                            src: "src/glosses/app/**/*.js",
                            dst: "lib/glosses/app",
                            task: "transpile",
                            namespace: "application",
                            struct: {
                                report: {
                                    namespace: "report",
                                    src: "src/glosses/app/report/**/*.js",
                                    dst: "lib/glosses/app/report",
                                    task: "transpile",
                                    native: {
                                        src: "src/glosses/app/report/native",
                                        dst: "lib/glosses/app/report/native",
                                        type: "gyp"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        expected: {
            adone: {
                index: {
                    src: "src/index.js",
                    dst: "lib/index.js"
                },
                namespace: {
                    cli: {
                        index: {
                            src: "src/cli/index.js",
                            dst: "lib/cli/index.js"
                        }
                    },
                    app: {
                        index: {
                            src: "src/glosses/app/index.js",
                            dst: "lib/glosses/app/index.js"
                        },
                        namespace: {
                            report: {
                                index: {
                                    src: "src/glosses/app/report/index.js",
                                    dst: "lib/glosses/app/report/index.js"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
];
