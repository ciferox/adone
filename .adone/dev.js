export default {
    tasks: {
        fork: {
            tags: ["src", "info", "share"]
        },
        pack: {
            tags: ["release", "info", "share"],
            filter: [
                "!bin/**/*.map",
                "!lib/**/*.map",
                "!.adone/kri.js",
                "!.adone/dev.js"
            ]
        },
        publish: {
            type: "github",
            apiBase: "https://api.github.com",
            owner: "ciferox",
            repo: "adone"
        }
    },
    defaultTask: "copy",
    nonWatchableTasks: [
        "cmake"
    ],
    units: {
        tasks: {
            description: "Realm tasks",
            src: "src/tasks/**/*.js",
            dst: "lib/tasks",
            task: "transpile",
            units: {
                assets: {
                    description: "Tasks assets",
                    src: [
                        "src/tasks/own/realm_create/helpers/eslintrc/eslintrc.js_",
                        "src/tasks/own/realm_create/helpers/git/gitignore_"
                    ],
                    dst: "lib/tasks",
                    task: "copy"
                }
            }
        },
        app: {
            description: "ADONE CLI application",
            units: {
                posix: {
                    description: "Executable for posix platforms",
                    src: "src/app/adone",
                    dst: "bin",
                    task: "transpileExe"
                },
                windows: {
                    description: "Executable fro windows platforms",
                    src: "src/app/adone.cmd",
                    dst: "bin",
                    task: "copy"
                },
                internals: {
                    description: "ADONE CLI internals",
                    src: [
                        "!src/app/adone",
                        "!src/app/adone.cmd",
                        "src/app/**/*.js"
                    ],
                    dst: "lib/app",
                    task: "transpile"
                }
            }
        },
        commands: {
            description: "ADONE CLI commands",
            units: {
                github: {
                    src: "src/commands/github/**/*.js",
                    dst: "lib/commands/github",
                    task: "transpile"
                },
                inspect: {
                    src: "src/commands/inspect/**/*.js",
                    dst: "lib/commands/inspect",
                    task: "transpile"
                },
                ipfs: {
                    src: "src/commands/ipfs/**/*.js",
                    dst: "lib/commands/ipfs",
                    task: "transpile"
                },
                omni: {
                    src: "src/commands/omni/**/*.js",
                    dst: "lib/commands/omni",
                    task: "transpile"
                },
                realm: {
                    src: "src/commands/realm/**/*.js",
                    dst: "lib/commands/realm",
                    task: "transpile"
                },
                rollup: {
                    src: "src/commands/rollup/**/*.ts",
                    dst: "lib/commands/rollup",
                    task: "tsc"
                },
                shell: {
                    src: "src/commands/shell/**/*.js",
                    dst: "lib/commands/shell",
                    task: "transpile"
                },
                system: {
                    src: "src/commands/system/**/*.js",
                    dst: "lib/commands/system",
                    task: "transpile"
                }
            }
        },
        common: {
            description: "ADONE common",
            src: [
                "src/index.js",
                "src/common.js"
            ],
            dst: "lib",
            task: "transpile"
        },
        native: {
            description: "Everything to build Node.js addons",
            src: "src/native/**/*",
            dst: "lib/native"
        },
        glosses: {
            description: "Glosses",
            units: {
                acorn: {
                    description: "A small, fast, JavaScript-based JavaScript parser ",
                    task: "transpile",
                    src: "src/glosses/acorn/index.js",
                    dst: "lib/glosses/acorn",
                    repository: "https://github.com/acornjs/acorn"
                },
                app: {
                    description: "Application framework",
                    src: "src/glosses/app/**/*.js",
                    dst: "lib/glosses/app",
                    task: "transpile",
                    units: {
                        lockfile: {
                            description: "Inter-process file locking implementation",
                            src: "src/glosses/app/lockfile.js",
                            dst: "lib/glosses/app",
                            task: "transpile"
                        }
                    }
                },
                archives: {
                    description: "Archivers",
                    src: "src/glosses/archives/index.js",
                    dst: "lib/glosses/archives",
                    task: "transpile",
                    units: {
                        zip: {
                            description: "ZIP",
                            src: "src/glosses/archives/zip/**/*.js",
                            dst: "lib/glosses/archives/zip",
                            task: "transpile"
                        },
                        tar: {
                            description: "TAR",
                            src: "src/glosses/archives/tar/**/*.js",
                            dst: "lib/glosses/archives/tar",
                            task: "transpile"
                        }
                    }
                },
                assertion: {
                    description: "Assertion utilites",
                    src: "src/glosses/assertion/**/*.js",
                    dst: "lib/glosses/assertion",
                    task: "transpile",
                    predecessor: [
                        "https://github.com/chaijs",
                        "https://github.com/domenic/sinon-chai",
                        "https://github.com/prodatakey/dirty-chai",
                        "https://github.com/domenic/chai-as-promised"
                    ]
                },
                async: {
                    description: "Async utilities for node and the browser",
                    task: "copy",
                    src: "src/glosses/async/index.js",
                    dst: "lib/glosses/async",
                    repository: "https://github.com/caolan/async"
                },
                babel: {
                    description: "Compiler for writing next generation JavaScript",
                    src: "src/glosses/babel/index.js",
                    dst: "lib/glosses/babel",
                    task: "transpile"
                },
                buffer: {
                    description: "Buffer implementations and utilites",
                    src: "src/glosses/buffer/**/*.js",
                    dst: "lib/glosses/buffer",
                    task: "transpile"
                },
                cli: {
                    description: "CLI components and utilities",
                    src: "src/glosses/cli/**/*.js",
                    dst: "lib/glosses/cli",
                    task: "transpile"
                },
                collections: {
                    description: "Implementations of common collections",
                    src: "src/glosses/collections/**/*.js",
                    dst: "lib/glosses/collections",
                    task: "transpile"
                },
                compressors: {
                    description: "Compressors",
                    task: "transpile",
                    src: "src/glosses/compressors/index.js",
                    dst: "lib/glosses/compressors",
                    units: {
                        brotli: {
                            description: "Brotli compression format",
                            src: "src/glosses/compressors/brotli/**/*.js",
                            dst: "lib/glosses/compressors/brotli",
                            task: "transpile"
                        },
                        deflate: {
                            description: "Deflate compressor/decompressor",
                            task: "transpile",
                            src: "src/glosses/compressors/deflate.js",
                            dst: "lib/glosses/compressors"
                        },
                        gz: {
                            description: "Gzip compressor/decompressor",
                            task: "transpile",
                            src: "src/glosses/compressors/gzip.js",
                            dst: "lib/glosses/compressors"
                        },
                        lzma: {
                            description: "LZMA compressor/decompressor",
                            task: "transpile",
                            src: "src/glosses/compressors/lzma.js",
                            dst: "lib/glosses/compressors"
                        },
                        snappy: {
                            description: "Snappy, a fast compressor/decompressor",
                            task: "transpile",
                            src: "src/glosses/compressors/snappy/**/*.js",
                            dst: "lib/glosses/compressors/snappy",
                            units: {
                                native: {
                                    task: "cmake",
                                    src: "src/glosses/compressors/snappy/native",
                                    dst: "lib/glosses/compressors/snappy/native"
                                }
                            }
                        },
                        xz: {
                            description: "XZ compressor/decompressor",
                            task: "transpile",
                            src: "src/glosses/compressors/xz.js",
                            dst: "lib/glosses/compressors"
                        }
                    }
                },
                configurations: {
                    description: "Configurations",
                    src: "src/glosses/configurations/**/*.js",
                    dst: "lib/glosses/configurations",
                    task: "transpile"
                },
                crypto: {
                    description: "Implementation of TLS and various other cryptographic tools",
                    src: "src/glosses/crypto/**/*.js",
                    dst: "lib/glosses/crypto",
                    task: "transpile",
                    predecessor: "https://github.com/digitalbazaar/forge"
                },
                data: {
                    description: "Data generic manipulation utilites and serializers",
                    src: "src/glosses/data/index.js",
                    dst: "lib/glosses/data",
                    task: "transpile",
                    units: {
                        basex: {
                            description: "Encode/decode any base",
                            task: "tsc",
                            src: "src/glosses/data/basex.ts",
                            dst: "lib/glosses/data",
                            original: "https://github.com/cryptocoinjs/base-x"
                        },
                        base64: {
                            description: "Implementation of BASE64 serializer",
                            task: "transpile",
                            src: "src/glosses/data/base64.js",
                            dst: "lib/glosses/data"
                        },
                        bson: {
                            description: "Implementation of BSON serializer",
                            task: "transpile",
                            src: "src/glosses/data/bson/**/*.js",
                            dst: "lib/glosses/data/bson"
                        },
                        json: {
                            description: "Implementation of JSON serializers",
                            task: "transpile",
                            src: "src/glosses/data/json/**/*.js",
                            dst: "lib/glosses/data/json"
                        },
                        json5: {
                            description: "Implementation of JSON5 serializer",
                            task: "transpile",
                            src: "src/glosses/data/json5/**/*.js",
                            dst: "lib/glosses/data/json5"
                        },
                        mpak: {
                            description: "Implementation of MessagePack serializer",
                            task: "transpile",
                            src: "src/glosses/data/mpak.js",
                            dst: "lib/glosses/data"
                        },
                        yaml: {
                            description: "Implementation of YAML serializer",
                            task: "transpile",
                            src: "src/glosses/data/yaml/**/*.js",
                            dst: "lib/glosses/data/yaml"
                        },
                        base32: {
                            description: "Implementation of Base32 serializer",
                            task: "transpile",
                            src: "src/glosses/data/base32.js",
                            dst: "lib/glosses/data"
                        },
                        base58: {
                            description: "Implementation of Base58 serializer",
                            task: "transpile",
                            src: "src/glosses/data/base58.js",
                            dst: "lib/glosses/data"
                        },
                        varint: {
                            description: "Implementation of Protobuf varint",
                            task: "transpile",
                            src: "src/glosses/data/varint.js",
                            dst: "lib/glosses/data"
                        },
                        varintSigned: {
                            description: "Implementation of Protobuf signed varint",
                            task: "transpile",
                            src: "src/glosses/data/varint_signed.js",
                            dst: "lib/glosses/data"
                        },
                        utf8: {
                            description: "UTF8 encoder/decoder",
                            task: "transpile",
                            src: "src/glosses/data/utf8.js",
                            dst: "lib/glosses/data"
                        }
                    }
                },
                databases: {
                    description: "Databases",
                    src: "src/glosses/databases/index.js",
                    dst: "lib/glosses/databases",
                    task: "transpile",
                    units: {
                        level: {
                            description: "Transparent key/value databases",
                            organization: "https://github.com/Level",
                            task: "transpile",
                            src: "src/glosses/databases/level/**/*.js",
                            dst: "lib/glosses/databases/level"
                        }
                    }
                },
                datastore: {
                    description: "Key-value datastore interface and implementation",
                    task: "transpile",
                    src: "src/glosses/datastores/**/*.js",
                    dst: "lib/glosses/datastores"
                },
                datetime: {
                    description: "Datetime utilites",
                    task: "transpile",
                    src: "src/glosses/datetime/**/*.js",
                    dst: "lib/glosses/datetime"
                },
                diff: {
                    description: "Text differencing",
                    task: "transpile",
                    src: "src/glosses/diff/**/*.js",
                    dst: "lib/glosses/diff"
                },
                error: {
                    description: "Exceptions and error helpers",
                    task: "transpile",
                    src: "src/glosses/errors/**/*.js",
                    dst: "lib/glosses/errors"
                },
                event: {
                    description: "Event emitters and other event utilites",
                    task: "transpile",
                    src: "src/glosses/events/**/*.js",
                    dst: "lib/glosses/events"
                },
                fast: {
                    description: "File automation streaming templates/transforms",
                    task: "transpile",
                    src: "src/glosses/fast/**/*.js",
                    dst: "lib/glosses/fast"
                },
                fs: {
                    description: "Replacement of native fs with promises and extras",
                    task: "transpile",
                    src: "src/glosses/fs/**/*.js",
                    dst: "lib/glosses/fs",
                    units: {
                        watcher: {
                            description: "File system watcher",
                            src: "src/glosses/fs/extra/watcher/*.js",
                            dst: "lib/glosses/fs/extra/watcher",
                            task: "transpile",
                            units: {
                                fsevents: {
                                    platform: "darwin",
                                    task: "transpile",
                                    src: "src/glosses/fs/extra/watcher/fsevents.js",
                                    dst: "lib/glosses/fs/extra/watcher"
                                },
                                native: {
                                    platform: "darwin",
                                    task: "cmake",
                                    src: "src/glosses/fs/extra/watcher/native",
                                    dst: "lib/glosses/fs/extra/watcher/native"
                                }
                            }
                        }
                    }
                },
                fsm: {
                    description: "Finite State Machine implementation",
                    task: "transpile",
                    src: "src/glosses/fsm/**/*.js",
                    dst: "lib/glosses/fsm"
                },
                geoip: {
                    description: "Geolocation utilites",
                    task: "transpile",
                    src: "src/glosses/geoip/**/*.js",
                    dst: "lib/glosses/geoip"
                },
                git: {
                    description: "A pure JavaScript implementation of git for node and browsers!",
                    repository: "https://github.com/isomorphic-git/isomorphic-git",
                    task: "transpile",
                    src: "src/glosses/git/index.js",
                    dst: "lib/glosses/git"
                },
                github: {
                    description: "GitHub API",
                    task: "transpile",
                    src: "src/glosses/github/**/*.js",
                    dst: "lib/glosses/github"
                },
                glob: {
                    description: "GLOB/matchers imlementation",
                    task: "transpile",
                    src: "src/glosses/glob/**/*.js",
                    dst: "lib/glosses/glob"
                },
                globals: {
                    description: "Global identifiers from different JavaScript environments",
                    task: "copy",
                    src: "src/glosses/globals/index.js",
                    dst: "lib/glosses/globals"
                },
                http: {
                    description: "All around of HTTP",
                    task: "transpile",
                    src: "src/glosses/http/**/*.js",
                    dst: "lib/glosses/http",
                    units: {
                        server: {
                            description: "HTTP server",
                            task: "transpile",
                            src: "src/glosses/http/server/**/*.js",
                            dst: "lib/glosses/http/server"
                        },
                        client: {
                            description: "HTTP client",
                            task: "transpile",
                            src: "src/glosses/http/client/**/*.js",
                            dst: "lib/glosses/http/client"
                        }
                    }
                },
                inspect: {
                    description: "Inspection tools",
                    task: "transpile",
                    src: "src/glosses/inspect/**/*.js",
                    dst: "lib/glosses/inspect"
                },
                ipfs: {
                    description: "IPFS",
                    task: "copy",
                    src: "src/glosses/ipfs/index.js",
                    dst: "lib/glosses/ipfs",
                    repository: "https://github.com/ipfs/js-ipfs"
                },
                is: {
                    description: "Implementation of common predicates",
                    task: "transpile",
                    src: "src/glosses/is/**/*.js",
                    dst: "lib/glosses/is"
                },
                js: {
                    description: "JavaScript language stuff",
                    repository: [
                        "https://github.com/babel/babel",
                        "https://github.com/acornjs/acorn",
                        "https://github.com/estools/esutils",
                        "https://github.com/benjamn/recast",
                        "https://github.com/pugjs/babylon-walk"
                    ],
                    task: "transpile",
                    src: "src/glosses/js/**/*.js",
                    dst: "lib/glosses/js"
                },
                lockfile: {
                    description: "An inter-process and inter-machine lockfile",
                    src: "src/glosses/lockfile/**/*.js",
                    dst: "lib/glosses/lockfile",
                    task: "transpile",
                    predecessor: "https://github.com/moxystudio/node-proper-lockfile"
                },
                lodash: {
                    description: "A modern JavaScript utility library delivering modularity, performance & extras",
                    task: "copy",
                    src: "src/glosses/lodash/index.js",
                    dst: "lib/glosses/lodash",
                    repository: "https://github.com/lodash/lodash"
                },
                logger: {
                    description: "Application logger",
                    src: "src/glosses/logger/**/*.js",
                    dst: "lib/glosses/logger",
                    task: "transpile"
                },
                math: {
                    description: "Implementation of common math classes and primitives",
                    task: "transpile",
                    src: "src/glosses/math/**/*.js",
                    dst: "lib/glosses/math"
                },
                model: {
                    description: "Model definition and validation",
                    task: "transpile",
                    src: "src/glosses/models/**/*.js",
                    dst: "lib/glosses/models"
                },
                module: {
                    description: "Module with support of transpilation",
                    task: "transpile",
                    src: "src/glosses/module/**/*.js",
                    dst: "lib/glosses/module"
                },
                multiformats: {
                    description: "Self-describing values for Future-proofing",
                    task: "transpile",
                    src: "src/glosses/multiformats/index.js",
                    dst: "lib/glosses/multiformats"
                },
                net: {
                    description: "All about networking",
                    task: "transpile",
                    src: "src/glosses/net/**/*.js",
                    dst: "lib/glosses/net"
                },
                netron: {
                    description: "Implementation of Netron",
                    task: "transpile",
                    src: "src/glosses/netron/**/*.js",
                    dst: "lib/glosses/netron"
                },
                nodejs: {
                    description: "Node.js toolkit",
                    task: "transpile",
                    src: "src/glosses/nodejs/**/*.js",
                    dst: "lib/glosses/nodejs",
                    units: {
                        cmake: {
                            description: "Node.js native addon build tool based on cmake",
                            src: "src/glosses/nodejs/cmake/**/*.js",
                            dst: "lib/glosses/nodejs/cmake",
                            task: "transpile",
                            units: {
                                addon: {
                                    task: "copy",
                                    src: "src/glosses/nodejs/cmake/addon/**/*",
                                    dst: "lib/glosses/nodejs/cmake/addon"
                                }
                            }
                        },
                        findVS2017: {
                            description: "Find VS2017",
                            src: "src/glosses/nodejs/find_vs2017/index.js",
                            dst: "lib/glosses/nodejs/find_vs2017",
                            task: "transpile",
                            units: {
                                script: {
                                    task: "copy",
                                    src: "src/glosses/nodejs/find_vs2017/find_vs2017.cs",
                                    dst: "lib/glosses/nodejs/find_vs2017"
                                }
                            }
                        }
                    }
                },
                notifier: {
                    description: "Implementation of system notifier",
                    task: "transpile",
                    src: "src/glosses/notifier/**/*.js",
                    dst: "lib/glosses/notifier",
                    units: {
                        exe: {
                            description: "Native third-party notifiers",
                            src: "src/glosses/notifier/__/notifiers/exe/**/*",
                            dst: "lib/glosses/notifier/__/notifiers/exe",
                            task: "copy"
                        }
                    }
                },
                omnitron: {
                    description: "Multi-purpose service oriented application framework",
                    task: "transpile",
                    src: "src/glosses/omnitron/**/*.js",
                    dst: "lib/glosses/omnitron"
                },
                p2p: {
                    description: "Multipurpose P2P implementation (forked from libp2p",
                    task: "transpile",
                    src: "src/glosses/p2p/index.js",
                    dst: "lib/glosses/p2p",
                    repository: "https://github.com/libp2p"
                },
                path: {
                    description: "Replacement of native path",
                    task: "transpile",
                    src: "src/glosses/path/index.js",
                    dst: "lib/glosses/path"
                },
                pretty: {
                    description: "Useful prettiers/pretty-printers",
                    task: "transpile",
                    src: "src/glosses/pretty/**/*.js",
                    dst: "lib/glosses/pretty"
                },
                process: {
                    description: "Process utilites",
                    task: "transpile",
                    src: "src/glosses/process/**/*.js",
                    dst: "lib/glosses/process"
                },
                promise: {
                    description: "Promise utilites",
                    task: "transpile",
                    src: "src/glosses/promise/**/*.js",
                    dst: "lib/glosses/promise"
                },
                punycode: {
                    description: "Implementation of punycode",
                    task: "transpile",
                    src: "src/glosses/punycode/index.js",
                    dst: "lib/glosses/punycode",
                    repository: "https://github.com/bestiejs/punycode.js"
                },
                puppeteer: {
                    description: "High-level API to control Chrome or Chromium over the DevTools Protocol",
                    task: "copy",
                    src: "src/glosses/puppeteer/index.js",
                    dst: "lib/glosses/puppeteer",
                    repository: "https://github.com/GoogleChrome/puppeteer"
                },
                realm: {
                    description: "Realm management",
                    task: "transpile",
                    src: "src/glosses/realm/**/*.js",
                    dst: "lib/glosses/realm"
                },
                reflect: {
                    description: "Prototype for a Metadata Reflection API for ECMAScript",
                    task: "transpile",
                    src: "src/glosses/reflect/index.js",
                    dst: "lib/glosses/reflect"
                },
                runtime: {
                    description: "Application wide runtime information",
                    task: "transpile",
                    src: "src/glosses/runtime/**/*.js",
                    dst: "lib/glosses/runtime"
                },
                regex: {
                    description: "Regular expression utiliter and common regular expressions",
                    task: "transpile",
                    src: "src/glosses/regex/**/*.js",
                    dst: "lib/glosses/regex"
                },
                rollup: {
                    description: "Next-generation ES module bundler",
                    task: "transpile",
                    src: "src/glosses/rollup/index.js",
                    dst: "lib/glosses/rollup",
                    repository: "https://github.com/rollup/rollup",
                    units: {
                        run: {
                            description: "CLI part or rollup",
                            task: "tsc",
                            src: [
                                "src/glosses/rollup/run/**/*.ts",
                                "!src/glosses/rollup/run/**/*.d.ts"
                            ],
                            dst: "lib/glosses/rollup/run",
                            compilerOptions: {
                                allowSyntheticDefaultImports: true,
                                noEmitOnError: true,
                                noUnusedLocals: true,
                                noUnusedParameters: true,
                                strictPropertyInitialization: false,
                                strictFunctionTypes: false,
                                strict: true
                            }
                        }
                    }
                },
                semver: {
                    description: "Semantic version parser",
                    task: "copy",
                    src: "src/glosses/semver/index.js",
                    dst: "lib/glosses/semver"
                },
                shell: {
                    description: "Portable implementation of Unix shell commands",
                    task: "transpile",
                    src: "src/glosses/shell/**/*.js",
                    dst: "lib/glosses/shell"
                },
                sourcemap: {
                    description: "Sourcemaps",
                    repository: [
                        "https://github.com/mozilla/source-map",
                        "https://github.com/Rich-Harris/sourcemap-codec",
                        "https://github.com/evanw/node-source-map-support",
                        "https://github.com/thlorenz/convert-source-map",
                        "https://github.com/thlorenz/inline-source-map"
                    ],
                    task: "transpile",
                    src: "src/glosses/sourcemap/index.js",
                    dst: "lib/glosses/sourcemap"
                },
                streams: {
                    description: "Different streams and stream utilites",
                    task: "transpile",
                    src: "src/glosses/streams/**/*.js",
                    dst: "lib/glosses/streams",
                    units: {
                    }
                },
                system: {
                    description: "System utilites",
                    task: "transpile",
                    src: "src/glosses/system/**/*.js",
                    dst: "lib/glosses/system",
                    units: {
                        env: {
                            description: "Some useful environment variables",
                            task: "transpile",
                            src: "src/glosses/system/env.js",
                            dst: "lib/glosses/system"
                        }
                    }
                },
                task: {
                    description: "Tasks management",
                    task: "transpile",
                    src: "src/glosses/tasks/**/*.js",
                    dst: "lib/glosses/tasks"
                },
                templating: {
                    description: "Template engines",
                    task: "transpile",
                    src: "src/glosses/templating/**/*.js",
                    dst: "lib/glosses/templating",
                    dstClean: "lib/glosses/templating/**/*",
                    units: {
                        dot: {
                            description: "Implementation of DoT template engine",
                            task: "transpile",
                            src: "src/glosses/templating/dot/**/*.js",
                            dst: "lib/glosses/templating/dot",
                            original: "https://github.com/olado/doT"
                        },
                        nunjucks: {
                            description: "Implementation of Nunjucks template engine",
                            task: "transpile",
                            src: "src/glosses/templating/nunjucks/**/*.js",
                            dst: "lib/glosses/templating/nunjucks",
                            original: "https://github.com/mozilla/nunjucks"
                        }
                    }
                },
                text: {
                    description: "Text utilites",
                    task: "transpile",
                    src: "src/glosses/text/**/*.js",
                    dst: "lib/glosses/text"
                },
                typeof: {
                    description: "Advanced typeof",
                    task: "transpile",
                    src: "src/glosses/typeof/**/*.js",
                    dst: "lib/glosses/typeof"
                },
                typescript: {
                    description: "TypeScript compiler",
                    task: "copy",
                    src: "src/glosses/typescript/index.js",
                    dst: "lib/glosses/typescript",
                    repository: "https://github.com/Microsoft/TypeScript"
                },
                uri: {
                    description: "URI manipulation",
                    task: "transpile",
                    src: "src/glosses/uri/index.js",
                    dst: "lib/glosses/uri"
                },
                util: {
                    description: "Utilites",
                    task: "transpile",
                    src: "src/glosses/utils/**/*.js",
                    dst: "lib/glosses/utils",
                    units: {
                        throttle: {
                            description: "Throttling asyncronous cuncurrency",
                            task: "transpile",
                            src: "src/glosses/utils/throttle/**/*.js",
                            dst: "lib/glosses/utils/throttle"
                        },
                        uuid: {
                            description: "Generate RFC-compliant UUIDs",
                            task: "transpile",
                            src: "src/glosses/utils/uuid/**/*.js",
                            dst: "lib/glosses/utils/uuid",
                            original: "https://github.com/kelektiv/node-uuid"
                        }
                    }
                },
                validation: {
                    description: "Data validation",
                    src: "src/glosses/validation/index.js",
                    dst: "lib/glosses/validation",
                    task: "transpile"
                },
                vault: {
                    description: "Vault implementation on top of leveldb",
                    task: "transpile",
                    src: "src/glosses/vault/**/*.js",
                    dst: "lib/glosses/vault"
                }
            }
        }
    }
};
