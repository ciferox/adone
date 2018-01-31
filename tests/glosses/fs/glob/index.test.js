describe("fs", "glob", () => {
    const { is, fs, std } = adone;
    const { glob } = fs;
    const { Glob } = glob;
    const { delay } = adone.promise;

    const virtual = new fs.engine.MemoryEngine();

    const root = std.path.resolve("/");

    const normalizePath = !is.windows ? adone.identity : (x) => {
        x = x.replace(/\//g, "\\");
        if (x[0] === "\\") {
            x = `${root}${x.slice(1)}`;
        }
        return x;
    };

    const normalizePaths = is.windows
        ? (x) => x.map(normalizePath)
        : adone.identity;

    before(() => {
        const stdfs = new fs.engine.StandardEngine().mount(virtual, "/virtual");
        stdfs.mock(adone.std.fs);
    });

    after(() => {
        adone.std.fs.restore();
    });

    beforeEach(() => {
        virtual.clean();
    });

    it("should return files from directory when *", async () => {
        virtual.addFiles("{1..10}", () => "hello");
        const result = await glob("/virtual/*");
        expect(result).to.have.lengthOf(10);
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/1",
            "/virtual/10",
            "/virtual/2",
            "/virtual/3",
            "/virtual/4",
            "/virtual/5",
            "/virtual/6",
            "/virtual/7",
            "/virtual/8",
            "/virtual/9"
        ]));
    });

    it("should return only directories when */ and mark them with /", async () => {
        virtual.add((ctx) => ({
            "{a..e}": {
                a: ctx.file("hello")
            },
            f: ctx.file("hello"),
            g: ctx.file("hello")
        }));

        const result = await glob("/virtual/*/");
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/a/",
            "/virtual/b/",
            "/virtual/c/",
            "/virtual/d/",
            "/virtual/e/"
        ]));
    });

    it("should recursively walk through directories when **", async () => {
        virtual.add((ctx) => ({
            a: {
                b: {
                    c: {
                        d: ctx.file("hello")
                    }
                },
                e: ctx.file("hello")
            },
            f: ctx.file("hello")
        }));

        const result = await glob("/virtual/**");
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/",
            "/virtual/a",
            "/virtual/a/b",
            "/virtual/a/b/c",
            "/virtual/a/b/c/d",
            "/virtual/a/e",
            "/virtual/f"
        ]));
    });

    it("should return only directories when **/", async () => {
        virtual.add((ctx) => ({
            a: {
                b: {
                    c: {
                        d: ctx.file("hello")
                    }
                },
                e: ctx.file("hello")
            },
            f: ctx.file("hello")
        }));

        const result = await glob("/virtual/**/");
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/",
            "/virtual/a/",
            "/virtual/a/b/",
            "/virtual/a/b/c/"
        ]));
    });

    it("should not return the root when **/*", async () => {
        virtual.add((ctx) => ({
            a: {
                b: {
                    c: {
                        d: ctx.file("hello")
                    }
                },
                e: ctx.file("hello")
            },
            f: ctx.file("hello")
        }));

        const result = await glob("/virtual/**/*");
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/a",
            "/virtual/a/b",
            "/virtual/a/b/c",
            "/virtual/a/b/c/d",
            "/virtual/a/e",
            "/virtual/f"
        ]));
    });

    it("should return only nested directories when **/*/", async () => {
        virtual.add((ctx) => ({
            a: {
                b: {
                    c: {
                        d: ctx.file("hello")
                    }
                },
                e: ctx.file("hello")
            },
            f: ctx.file("hello")
        }));

        const result = await glob("/virtual/**/*/");
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/a/",
            "/virtual/a/b/",
            "/virtual/a/b/c/"
        ]));
    });

    it("should return only matched files with **", async () => {
        virtual.add((ctx) => ({
            a: {
                b: {
                    c: {
                        d: ctx.file("hello")
                    },
                    e: ctx.file("hello")
                },
                e: {
                    e: ctx.file("hello")
                }
            },
            f: ctx.file("hello"),
            fe: {
                fe: ctx.file("hello")
            }
        }));

        const result = await glob("/virtual/**/*e");
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/a/b/e",
            "/virtual/a/e",
            "/virtual/a/e/e",
            "/virtual/fe",
            "/virtual/fe/fe"
        ]));
    });

    it("should return only matched directories with **", async () => {
        virtual.add((ctx) => ({
            a: {
                b: {
                    c: {
                        d: ctx.file("hello")
                    },
                    e: ctx.file("hello")
                },
                e: {
                    e: {
                        e: ctx.file("hello")
                    }
                }
            },
            f: ctx.file("hello"),
            fe: {
                fe: ctx.file("hello")
            }
        }));

        const result = await glob("/virtual/**/*e/");
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/a/e/",
            "/virtual/a/e/e/",
            "/virtual/fe/"
        ]));
    });

    it("should match nested patterns", async () => {
        virtual.add((ctx) => ({
            a: {
                b: {
                    c: ctx.file("hello")
                }
            },
            b: {
                b: {
                    c: ctx.file("hello")
                }
            }
        }));

        const result = await glob("/virtual/**/b/*");

        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/a/b/c",
            "/virtual/b/b",
            "/virtual/b/b/c"
        ]));
    });

    describe("non-glob patterns", () => {
        it("should return a file", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello")
            }));

            const result = await glob("/virtual/a");
            expect(result).to.be.deep.equal(normalizePaths(["/virtual/a"]));
        });

        it("should return a directory", async () => {
            virtual.add((ctx) => ({
                a: {
                    b: ctx.file("hello")
                }
            }));

            const result = await glob("/virtual/a/");
            expect(result).to.be.deep.equal(normalizePaths(["/virtual/a/"]));
        });

        it("should return nothing if not a directory matches to a directory pattern", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello")
            }));

            const result = await glob("/virtual/a/");
            expect(result).to.be.empty();
        });

        it("should return nothing if there is no match", async () => {
            const result = await glob("/virtual/a");
            expect(result).to.be.empty();
        });
    });

    describe("symlinks", () => {
        it("should stop recursion on a symlink", async () => {
            virtual.add((ctx) => ({
                a: {
                    b: ctx.symlink("../b")
                },
                b: {
                    c: ctx.file("hello"),
                    d: {
                        e: ctx.file("hello"),
                        f: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/*");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/a",
                "/virtual/a/b",
                "/virtual/a/b/c",
                "/virtual/a/b/d",
                "/virtual/b",
                "/virtual/b/c",
                "/virtual/b/d",
                "/virtual/b/d/e",
                "/virtual/b/d/f"
            ]));
        });

        it("should not get into an infinite loop with cyclic references", async () => {
            virtual.add((ctx) => ({
                a: {
                    b: ctx.symlink("../b"),
                    c: ctx.file("hello")
                },
                b: {
                    a: ctx.symlink("../a"),
                    c: ctx.file("hello")
                }
            }));

            const result = await glob("/virtual/**/*");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/a",
                "/virtual/a/b",
                "/virtual/a/b/a",
                "/virtual/a/b/c",
                "/virtual/a/c",
                "/virtual/b",
                "/virtual/b/a",
                "/virtual/b/a/b",
                "/virtual/b/a/c",
                "/virtual/b/c"
            ]));
        });

        it("should not fail on dead links", async () => {
            virtual.add((ctx) => ({
                a: {
                    a0: ctx.file("hello"),
                    b: ctx.symlink("../c")
                }
            }));

            const result = await glob("/virtual/**/*");
            expect(result).to.be.deep.equal(normalizePaths([
                "/virtual/a",
                "/virtual/a/a0",
                "/virtual/a/b"
            ]));
        });

        it("should follow symlinks when follow = true", { skip: is.windows }, async () => {
            virtual.add((ctx) => ({
                a: {
                    a0: ctx.file("hello")
                },
                b: {
                    b0: ctx.file("hello"),
                    a: ctx.symlink("../a")
                },
                c: {
                    c0: ctx.file("hello"),
                    d: {
                        d0: ctx.file("hello"),
                        b: ctx.symlink("../../b"),
                        d1: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/*", { follow: true });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/a",
                "/virtual/a/a0",
                "/virtual/b",
                "/virtual/b/a",
                "/virtual/b/a/a0",
                "/virtual/b/b0",
                "/virtual/c",
                "/virtual/c/c0",
                "/virtual/c/d",
                "/virtual/c/d/b",
                "/virtual/c/d/b/a",
                "/virtual/c/d/b/a/a0",
                "/virtual/c/d/b/b0",
                "/virtual/c/d/d0",
                "/virtual/c/d/d1"
            ]));
        });

        it("should get into an infinite loop with cyclic references when follow = true but stop when the ELOOP raises", async () => {
            virtual.add((ctx) => ({
                a: {
                    b: ctx.symlink("../b"),
                    c: ctx.file("hello")
                },
                b: {
                    a: ctx.symlink("../a"),
                    c: ctx.file("hello")
                }
            }));

            const result = await glob("/virtual/**/*", { follow: true });
            expect(result.length).to.be.greaterThan(10); // 10 with no follow, here we must have much more
            expect(result).to.include(normalizePath("/virtual/a/b/a"));
            expect(result).to.include(normalizePath("/virtual/a/b/a/b/a/b/a/b"));
            expect(result).to.include(normalizePath("/virtual/b/a/b"));
            expect(result).to.include(normalizePath("/virtual/b/a/b/a/b/a/b/a"));
        });

        it("should return a directory when directories are requested if a symlink refers to a directory", async () => {
            virtual.add((ctx) => ({
                a: {
                    b: ctx.symlink("../b"),
                    c: ctx.file("hello")
                },
                b: {
                    c: ctx.file("hello")
                },
                c: ctx.symlink("b")
            }));
            {
                const result = await glob("/virtual/**/*/");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/a/",
                    "/virtual/a/b/",
                    "/virtual/b/",
                    "/virtual/c/"
                ]));
            }
            {
                const result = await glob("/virtual/c/");
                expect(result).to.be.deep.equal(normalizePaths(["/virtual/c/"]));
            }
            {
                const result = await glob("/virtual/*/");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/a/",
                    "/virtual/b/",
                    "/virtual/c/"
                ]));
            }
        });

        it("should correctly work with nested globstars", async () => {
            virtual.add((ctx) => ({
                a: {
                    symlink: {
                        a: {
                            b: {
                                c: ctx.symlink("../..")
                            }
                        }
                    }
                }
            }));

            {
                const result = await glob("a/symlink/a/b/c/**/b/c/**", { cwd: "/virtual" });
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "a/symlink/a/b/c/a/b/c",
                    "a/symlink/a/b/c/a/b/c/a",
                    "a/symlink/a/b/c/a/b/c/a/b",
                    "a/symlink/a/b/c/a/b/c/a/b/c"
                ]));
            }
            {
                const result = await glob("a/symlink/a/b/c/**/b/c/**/b/c/**", { cwd: "/virtual" });
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "a/symlink/a/b/c/a/b/c/a/b/c",
                    "a/symlink/a/b/c/a/b/c/a/b/c/a",
                    "a/symlink/a/b/c/a/b/c/a/b/c/a/b",
                    "a/symlink/a/b/c/a/b/c/a/b/c/a/b/c"
                ]));
            }
            {
                const result = await glob("a/symlink/a/b/**/b/c/**", { cwd: "/virtual" });
                expect(result).to.be.empty();
            }
        });

        it("should correctly work with non normalized paths", async () => {
            virtual.add((ctx) => ({
                a: {
                    symlink: {
                        a: {
                            b: {
                                c: ctx.symlink("../..")
                            }
                        }
                    }
                }
            }));

            const result = await glob("a/symlink/a/b/c/a/b/c/a/b/c//a/b/c////a/b/c/**/b/c/**", { cwd: "/virtual" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "a/symlink/a/b/c/a/b/c/a/b/c//a/b/c////a/b/c/a/b/c",
                "a/symlink/a/b/c/a/b/c/a/b/c//a/b/c////a/b/c/a/b/c/a",
                "a/symlink/a/b/c/a/b/c/a/b/c//a/b/c////a/b/c/a/b/c/a/b",
                "a/symlink/a/b/c/a/b/c/a/b/c//a/b/c////a/b/c/a/b/c/a/b/c"
            ]));
        });

        it("should correctly work with many links", async () => {
            virtual.add((ctx) => ({
                a: {
                    b: ctx.symlink("../b")
                },
                b: {
                    c: ctx.symlink("../c")
                },
                c: {
                    d: ctx.symlink("../d")
                },
                d: {
                    e: ctx.symlink("../e")
                },
                e: {
                    f: {
                        g: {
                            h: ctx.symlink("../../../b")
                        }
                    },
                    t: {
                        u: ctx.symlink("../../a"),
                        v: ctx.symlink("../../f")
                    }
                },
                f: {
                    a: ctx.file("hello")
                }
            }));
            {
                const result = await glob("/virtual/**/*");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/a",
                    "/virtual/a/b",
                    "/virtual/a/b/c",
                    "/virtual/b",
                    "/virtual/b/c",
                    "/virtual/b/c/d",
                    "/virtual/c",
                    "/virtual/c/d",
                    "/virtual/c/d/e",
                    "/virtual/d",
                    "/virtual/d/e",
                    "/virtual/d/e/f",
                    "/virtual/d/e/t",
                    "/virtual/e",
                    "/virtual/e/f",
                    "/virtual/e/f/g",
                    "/virtual/e/f/g/h",
                    "/virtual/e/f/g/h/c",
                    "/virtual/e/t",
                    "/virtual/e/t/u",
                    "/virtual/e/t/u/b",
                    "/virtual/e/t/v",
                    "/virtual/e/t/v/a",
                    "/virtual/f",
                    "/virtual/f/a"
                ]));
            }
            {
                const result = await glob("/virtual/**/*/");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/a/",
                    "/virtual/a/b/",
                    "/virtual/a/b/c/",
                    "/virtual/b/",
                    "/virtual/b/c/",
                    "/virtual/b/c/d/",
                    "/virtual/c/",
                    "/virtual/c/d/",
                    "/virtual/c/d/e/",
                    "/virtual/d/",
                    "/virtual/d/e/",
                    "/virtual/d/e/f/",
                    "/virtual/d/e/t/",
                    "/virtual/e/",
                    "/virtual/e/f/",
                    "/virtual/e/f/g/",
                    "/virtual/e/f/g/h/",
                    "/virtual/e/f/g/h/c/",
                    "/virtual/e/t/",
                    "/virtual/e/t/u/",
                    "/virtual/e/t/u/b/",
                    "/virtual/e/t/v/",
                    "/virtual/f/"
                ]));
            }
            {
                const result = await glob("/virtual/**/*/*");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/a/b",
                    "/virtual/a/b/c",
                    "/virtual/a/b/c/d",
                    "/virtual/b/c",
                    "/virtual/b/c/d",
                    "/virtual/b/c/d/e",
                    "/virtual/c/d",
                    "/virtual/c/d/e",
                    "/virtual/c/d/e/f",
                    "/virtual/c/d/e/t",
                    "/virtual/d/e",
                    "/virtual/d/e/f",
                    "/virtual/d/e/f/g",
                    "/virtual/d/e/t",
                    "/virtual/d/e/t/u",
                    "/virtual/d/e/t/v",
                    "/virtual/e/f",
                    "/virtual/e/f/g",
                    "/virtual/e/f/g/h",
                    "/virtual/e/f/g/h/c",
                    "/virtual/e/f/g/h/c/d",
                    "/virtual/e/t",
                    "/virtual/e/t/u",
                    "/virtual/e/t/u/b",
                    "/virtual/e/t/u/b/c",
                    "/virtual/e/t/v",
                    "/virtual/e/t/v/a",
                    "/virtual/f/a"
                ]));
            }
        });
    });

    describe(". link", () => {
        it("should work", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            {
                const result = await glob("/virtual/.");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/."
                ]));
            }
            {
                const result = await glob("/virtual/./");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/./"
                ]));
            }
            {
                const result = await glob("/virtual/./*");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/./a",
                    "/virtual/./b"
                ]));
            }
            {
                const result = await glob("/virtual/*/.");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/b/."
                ]));
            }
        });

        it("should work with **", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/./*");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/./a",
                "/virtual/./b",
                "/virtual/b/./b0",
                "/virtual/b/./c",
                "/virtual/b/c/./c0"
            ]));
        });

        it("should normally handle . in differenct places", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/././*/./");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/././b/./",
                "/virtual/b/././c/./"
            ]));
        });
    });

    describe(".. link", () => {
        it("should work", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            {
                const result = await glob("/virtual/b/..");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/b/.."
                ]));
            }
            {
                const result = await glob("/virtual/b/../");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/b/../"
                ]));
            }
            {
                const result = await glob("/virtual/b/../b/../*");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/b/../b/../a",
                    "/virtual/b/../b/../b"
                ]));
            }
            {
                const result = await glob("/virtual/*/..");
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/b/.."
                ]));
            }
        });

        it("should work with **", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/*/**/../*");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/b/../a",
                "/virtual/b/../b",
                "/virtual/b/c/../b0",
                "/virtual/b/c/../c"
            ]));
        });

        it("should normally handle .. in differenct places", async () => {
            virtual.add((ctx) => ({
                e: {
                    a: ctx.file("hello"),
                    b: {
                        b0: ctx.file("hello"),
                        c: {
                            c0: ctx.file("hello")
                        }
                    },
                    c: {
                        e: ctx.symlink("../b")
                    }
                }
            }));

            const result = await glob("/virtual/*/**/././../*/./..");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/e/././../e/./..",
                "/virtual/e/b/././../b/./..",
                "/virtual/e/b/././../c/./..",
                "/virtual/e/b/c/././../c/./..",
                "/virtual/e/c/././../b/./..",
                "/virtual/e/c/././../c/./..",
                "/virtual/e/c/e/././../b/./..",
                "/virtual/e/c/e/././../c/./.."
            ]));
        });
    });

    describe("cwd option", () => {
        it("should set cwd for patterns and return relative results", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("**/*", { cwd: "/virtual" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "a",
                "b",
                "b/b0",
                "b/c",
                "b/c/c0"
            ]));
        });

        it("should properly handle ..", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("../**/*", { cwd: "/virtual/b" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "../a",
                "../b",
                "../b/b0",
                "../b/c",
                "../b/c/c0"
            ]));
        });

        it("should properly handle .", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("./**/*", { cwd: "/virtual" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "./a",
                "./b",
                "./b/b0",
                "./b/c",
                "./b/c/c0"
            ]));
        });

        it("should not emit the empty root when **", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("a"),
                b: {
                    a: ctx.file("a")
                }
            }));

            const result = await glob("**", { cwd: "/virtual" });
            expect(result).to.be.deep.equal(normalizePaths([
                "a",
                "b",
                "b/a"
            ]));
        });

        it("should strip trailing slashes", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("a"),
                b: {
                    a: ctx.file("a")
                }
            }));

            const result = await glob("**", { cwd: "/virtual///////////" });
            expect(result).to.be.deep.equal(normalizePaths([
                "a",
                "b",
                "b/a"
            ]));
        });
    });

    describe("root option", () => {
        it("should use the given root insead of default", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("a"),
                b: {
                    a: ctx.file("a"),
                    c: ctx.file("a")
                }
            }));

            const result = await glob("/*", { root: "/virtual/b" });
            expect(result).to.be.deep.equal(normalizePaths([
                "/virtual/b/a",
                "/virtual/b/c"
            ]));
        });

        it("should strip trailing slashes", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("a"),
                b: {
                    a: ctx.file("a"),
                    c: ctx.file("a")
                }
            }));

            const result = await glob("/*", { root: "/virtual/b/////////" });
            expect(result).to.be.deep.equal(normalizePaths([
                "/virtual/b/a",
                "/virtual/b/c"
            ]));
        });

        it("should support roots relative to the cwd", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("a"),
                b: {
                    a: ctx.file("a"),
                    c: ctx.file("a")
                }
            }));

            const result = await glob("/*", { root: "b", cwd: "/virtual" });
            expect(result).to.be.deep.equal(normalizePaths([
                "/virtual/b/a",
                "/virtual/b/c"
            ]));
        });
    });

    describe("nodir option", () => {
        it("should exclude directories from the result", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/*", { nodir: true });
            expect(result).to.be.deep.equal(normalizePaths([
                "/virtual/a",
                "/virtual/b/b0",
                "/virtual/b/c/c0"
            ]));
        });
    });

    describe("rawEntries option", () => {
        it("should not extract path from the entries and pass them into the stream", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/*", { rawEntries: true });
            expect(result).to.have.lengthOf(5);
            for (const res of result) {
                expect(res).not.to.be.a("string");
                expect(res).to.have.property("path");
                expect(res).to.have.property("absolutePath");
                expect(res).to.have.property("stat");
            }
        });
    });

    describe("stat option", () => {
        it("should provide stat for all the entries and return raw entries", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/*", { stat: true });
            expect(result).to.have.lengthOf(5);
            for (const res of result) {
                expect(res).not.to.be.a("string");
                const { stat } = res;
                expect(stat).to.be.instanceOf(adone.std.fs.Stats);
            }
        });
    });

    describe("dot option", () => {
        it("should not emit dotted(hidden) entries by default", async () => {
            virtual.add((ctx) => ({
                ".a": ctx.file("hello"),
                b: {
                    ".b0": ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello"),
                        ".d": {
                            d0: ctx.file("hello")
                        }
                    }
                }
            }));

            const result = await glob("/virtual/**/*");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/b",
                "/virtual/b/c",
                "/virtual/b/c/c0"
            ]));
        });

        it("should emit hidden entries when dot is true", async () => {
            virtual.add((ctx) => ({
                ".a": ctx.file("hello"),
                b: {
                    ".b0": ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello"),
                        ".d": {
                            d0: ctx.file("hello")
                        }
                    }
                }
            }));

            const result = await glob("/virtual/**/*", { dot: true });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/.a",
                "/virtual/b",
                "/virtual/b/.b0",
                "/virtual/b/c",
                "/virtual/b/c/.d",
                "/virtual/b/c/.d/d0",
                "/virtual/b/c/c0"
            ]));
        });

        it("should emit hidden entries when it is explicitly set", async () => {
            virtual.add((ctx) => ({
                ".a": ctx.file("hello"),
                b: {
                    ".b0": ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello"),
                        ".d": {
                            d0: ctx.file("hello")
                        }
                    }
                }
            }));

            const result = await glob("/virtual/**/.*");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/.a",
                "/virtual/b/.b0",
                "/virtual/b/c/.d"
            ]));
        });
    });

    describe("absolute option", () => {
        it("should return absolute paths, not relative to the cwd", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("**/*", { cwd: "/virtual", absolute: true });
            expect(result).to.be.deep.equal(normalizePaths([
                "/virtual/a",
                "/virtual/b",
                "/virtual/b/b0",
                "/virtual/b/c",
                "/virtual/b/c/c0"
            ]));
        });

        it("should return normalized absolute patterns when absolute, normalized and cwd are set", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("*/./*", { cwd: "/virtual", absolute: true, normalized: true });
            expect(result).to.be.deep.equal(normalizePaths([
                "/virtual/b/b0",
                "/virtual/b/c"
            ]));
        });
    });

    describe("normalized option", () => {
        it("should not normalize by default", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/*/./*");
            expect(result).to.be.deep.equal(normalizePaths([
                "/virtual/b/./b0",
                "/virtual/b/./c"
            ]));
        });

        it("should return normalized paths when normalized is set", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/*/./*", { normalized: true });
            expect(result).to.be.deep.equal(normalizePaths([
                "/virtual/b/b0",
                "/virtual/b/c"
            ]));
        });

        it("should return normalized relative paths for relative patterns", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("*/./*", { normalized: true, cwd: "/virtual" });
            expect(result).to.be.deep.equal(normalizePaths([
                "b/b0",
                "b/c"
            ]));
        });
    });

    describe("multiple patterns", () => {
        it("should support multiple patterns when the first argument is an array", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["/virtual/**/a", "/virtual/**/*0"]);
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/a",
                "/virtual/b/b0",
                "/virtual/b/c/c0"
            ]));
        });

        it("should correctly handle relative and non relative given patterns", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["**/*0", "/virtual/**/c"], { cwd: "/virtual" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/b/c",
                "b/b0",
                "b/c/c0"
            ]));
        });
    });

    describe("unique option", () => {
        it("should remove duplicates by default", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["**/a*", "**/*a"], { cwd: "/virtual" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "a"
            ]));
        });

        it("should not remove duplicates when unique is unset", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["**/a*", "**/*a"], { cwd: "/virtual", unique: false });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "a",
                "a"
            ]));
        });

        it("should remove duplicates when absolute is set and relative and absolute patterns are given", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));
            {
                const result = await glob(["/virtual/**/a*", "**/*a"], { cwd: "/virtual" });
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/a",
                    "a"
                ]));
            }
            {
                const result = await glob(["/virtual/**/a*", "**/*a"], { cwd: "/virtual", absolute: true });
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "/virtual/a"
                ]));
            }
        });

        it("should remove duplicates when normalized is set", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            {
                const result = await glob(["**/b/.", "**/b"], { cwd: "/virtual" });
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "b",
                    "b/."
                ]));
            }
            {
                const result = await glob(["**/b/.", "**/b"], { cwd: "/virtual", normalized: true });
                expect(result.sort()).to.be.deep.equal(normalizePaths([
                    "b"
                ]));
            }

        });
    });

    describe("index option", () => {
        it("should return rawEntries if index option is set", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["**/*0", "/virtual/**/c"], { cwd: "/virtual", index: true });
            expect(result.map((x) => x.path).sort()).to.be.deep.equal(normalizePaths([
                "/virtual/b/c",
                "b/b0",
                "b/c/c0"
            ]));
            for (const res of result) {
                switch (res.path) {
                    case "/virtual/b/c": {
                        expect(res.index).to.be.equal(1);
                        break;
                    }
                    case "b/b0":
                    case "b/c/c0": {
                        expect(res.index).to.be.equal(0);
                        break;
                    }
                }
            }
        });

        it("should calculate index among the matching patterns", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["**/*0", "!**/*.js", "/virtual/**/c"], { cwd: "/virtual", index: true });
            expect(result.map((x) => x.path).sort()).to.be.deep.equal(normalizePaths([
                "/virtual/b/c",
                "b/b0",
                "b/c/c0"
            ]));
            for (const res of result) {
                switch (res.path) {
                    case "/virtual/b/c": {
                        expect(res.index).to.be.equal(1);
                        break;
                    }
                    case "b/b0":
                    case "b/c/c0": {
                        expect(res.index).to.be.equal(0);
                        break;
                    }
                }
            }
        });
    });

    describe("ignoring", () => {
        it("should support ignore patterns via ! prefix", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello"),
                        e: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["**/*", "!**/c*"], { cwd: "/virtual" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "a",
                "b",
                "b/b0",
                "b/c/e"
            ]));
        });

        it("should exclude subtree with **", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello"),
                        e: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["**/*", "!b/**"], { cwd: "/virtual" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "a"
            ]));
        });

        it("should not exclude the directory itself when **/*", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello"),
                        e: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["**/*", "!b/**/*"], { cwd: "/virtual" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "a",
                "b"
            ]));
        });

        it("should not exclude files with matching name for **", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                c: {
                    baa: ctx.file("hello"),
                    b: {
                        noway: ctx.file("hello")
                    }
                },
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello"),
                        e: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["**/*", "!**/b*/**/*"], { cwd: "/virtual" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "a",
                "b",
                "c",
                "c/b",
                "c/baa"
            ]));
        });

        it("should support multiple ignore patterns", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                c: {
                    baa: ctx.file("hello"),
                    b: {
                        noway: ctx.file("hello")
                    }
                },
                b: {
                    b0: ctx.file("hello"),
                    c: {
                        c0: ctx.file("hello"),
                        e: ctx.file("hello")
                    }
                },
                d: {
                    a: {
                        b: ctx.file("hello")
                    },
                    b: ctx.file("hello")
                },
                e: {
                    e: {
                        f: ctx.file("1")
                    },
                    g: ctx.file("1")
                },
                f: {
                    asdasdy: ctx.file("1"),
                    h: ctx.file("1"),
                    i: {
                        j: {
                            k: {
                                l: ctx.file("1")
                            },
                            c: {
                                a: ctx.file("2")
                            }
                        },
                        e: {
                            b: ctx.file("3")
                        }
                    }
                }
            }));

            const result = await glob(["**/*", "!**/c/**", "!**/*y", "!d/a/b", "!*/e/*"], { cwd: "/virtual" });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "a",
                "b",
                "b/b0",
                "d",
                "d/a",
                "d/b",
                "e",
                "e/e",
                "e/g",
                "f",
                "f/h",
                "f/i",
                "f/i/e",
                "f/i/e/b",
                "f/i/j",
                "f/i/j/k",
                "f/i/j/k/l"
            ]));
        });

        it("should support dotted files", async () => {
            virtual.add((ctx) => ({
                a: ctx.file("hello"),
                c: {
                    baa: ctx.file("hello"),
                    b: {
                        ".noway": ctx.file("hello")
                    }
                },
                b: {
                    b0: ctx.file("hello"),
                    ".c": {
                        c0: ctx.file("hello"),
                        e: ctx.file("hello")
                    }
                }
            }));

            const result = await glob(["**/*", "!**/.*", "!**/.*/**"], { cwd: "/virtual", dot: true });
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "a",
                "b",
                "b/b0",
                "c",
                "c/b",
                "c/baa"
            ]));
        });
    });

    it("should support braces", async () => {
        virtual.add((ctx) => ({
            a: {
                b: ctx.file("hello"),
                c: {
                    d: ctx.file("hello")
                }
            },
            b: {
                c: ctx.file("hello"),
                d: {
                    e: ctx.file("hello")
                }
            }
        }));

        const result = await glob("/virtual/{a,b}/**");
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/a/",
            "/virtual/a/b",
            "/virtual/a/c",
            "/virtual/a/c/d",
            "/virtual/b/",
            "/virtual/b/c",
            "/virtual/b/d",
            "/virtual/b/d/e"
        ]));
    });

    it("should correctly handle non normalized cases", async () => {
        virtual.add((ctx) => ({
            a: {
                abcdef: {
                    g: {
                        h: ctx.file("hello")
                    }
                },
                abcfed: {
                    g: {
                        h: ctx.file("hello")
                    }
                }
            }
        }));

        {
            const result = await glob("/virtual/a/abc{fed/g,def}/**///**/");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/a/abcdef/",
                "/virtual/a/abcdef/g/",
                "/virtual/a/abcfed/g/"
            ]));
        }
    });

    it("should support subpaths in braces", async () => {
        virtual.add((ctx) => ({
            a: {
                b: ctx.file("hello"),
                c: {
                    d: ctx.file("hello")
                }
            },
            b: {
                c: ctx.file("hello"),
                d: {
                    e: ctx.file("hello"),
                    f: {
                        g: ctx.file("hello")
                    }
                }
            }
        }));

        const result = await glob("/virtual/{a,b/d}/**/*");
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/a/b",
            "/virtual/a/c",
            "/virtual/a/c/d",
            "/virtual/b/d/e",
            "/virtual/b/d/f",
            "/virtual/b/d/f/g"
        ]));
    });

    describe("extglob", () => {
        it("should support negation inside patterns", async () => {
            virtual.add((ctx) => ({
                a: {
                    b: ctx.file("hello"),
                    c: {
                        d: ctx.file("hello"),
                        "a.js": ctx.file("hello")
                    },
                    d: {
                        "b.js": ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/!(*.js|b)");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/a",
                "/virtual/a/c",
                "/virtual/a/c/d",
                "/virtual/a/d"
            ]));
        });

        it("should support ?", async () => {
            virtual.add((ctx) => ({
                a: {
                    c: {
                        a: ctx.file("hello")
                    },
                    c0: {
                        b: ctx.file("hello")
                    },
                    c1: {
                        c: ctx.file("hello")
                    },
                    c2: {
                        d: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/c?(0|2|3)/*");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/a/c/a",
                "/virtual/a/c0/b",
                "/virtual/a/c2/d"
            ]).sort());
        });

        it("should support *", async () => {
            virtual.add((ctx) => ({
                a: {
                    bcore: {
                        a: ctx.file("hello")
                    },
                    beorc: {
                        b: ctx.file("hello")
                    },
                    bcorecoreeroc: {
                        c: ctx.file("hello")
                    },
                    bcorew: {
                        d: ctx.file("hello")
                    },
                    b: {
                        e: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/b*(c|o|r|e)/*");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/a/b/e",
                "/virtual/a/bcore/a",
                "/virtual/a/bcorecoreeroc/c",
                "/virtual/a/beorc/b"
            ]));
        });

        it("should support +", async () => {
            virtual.add((ctx) => ({
                a: {
                    core: {
                        a: ctx.file("hello")
                    },
                    eorc: {
                        b: ctx.file("hello")
                    },
                    corecoreeroc: {
                        c: ctx.file("hello")
                    },
                    corew: {
                        d: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/+(c|o|r|e)/*");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/a/core/a",
                "/virtual/a/corecoreeroc/c",
                "/virtual/a/eorc/b"
            ]));
        });

        it("should support @", async () => {
            virtual.add((ctx) => ({
                a: {
                    core: {
                        a: ctx.file("hello")
                    },
                    eorc: {
                        b: ctx.file("hello")
                    },
                    corew: {
                        d: ctx.file("hello")
                    },
                    hew: {
                        e: ctx.file("hello")
                    }
                }
            }));

            const result = await glob("/virtual/**/@(core*|*w)/*");
            expect(result.sort()).to.be.deep.equal(normalizePaths([
                "/virtual/a/core/a",
                "/virtual/a/corew/d",
                "/virtual/a/hew/e"
            ]));
        });
    });

    it("should support regex character classes", async () => {
        virtual.add((ctx) => ({
            a: ctx.file("hello"),
            b: ctx.file("hello"),
            c: ctx.file("hello"),
            a5: ctx.file("hello")
        }));

        const result = await glob("/virtual/[ab]?([1-5])");
        expect(result.sort()).to.be.deep.equal(normalizePaths([
            "/virtual/a",
            "/virtual/a5",
            "/virtual/b"
        ]));
    });

    it("should emit error event when some error occures", async () => {
        virtual.add((ctx) => ({
            a: ctx.file("hello"),
            b: ctx.file("hello"),
            c: ctx.file("hello"),
            a5: ctx.file({
                contents: "hello",
                beforeHook() {
                    // each syscall will throw
                    throw new Error("Hello");
                }
            })
        }));

        const err = await assert.throws(async () => {
            await glob("/virtual/**/*");
        });
        expect(err.message).to.be.equal("Hello");
    });

    it("should stop the stream on the first error", async () => {
        const fileHook1 = spy();
        const fileHook2 = spy();
        virtual.add((ctx) => ({
            a: ctx.file("hello"),
            b: ctx.file("hello"),
            c: ctx.file("hello"),
            a5: ctx.file("hello"),
            d: [{
                e: ctx.file({
                    contents: "hello",
                    beforeHook: fileHook1
                })
            }, {
                beforeHook() {
                    // throw on each syscall
                    throw new Error("hello");
                }
            }],
            e: {
                f: {
                    g: {
                        h: ctx.file({
                            contents: "hello",
                            beforeHook: fileHook2
                        })
                    }
                }
            }
        }));

        const stream = glob("/virtual/**/*");
        const data = spy();
        const error = spy();
        const end = spy();
        stream.on("error", error).on("data", data).on("end", end).resume();
        await end.waitForCall();
        expect(error).to.have.been.calledOnce();
        // a a5 b c d e, d will throw on lstat and the stream should stop e/f should not be emitted
        expect(data).to.have.callCount(6);
        expect(fileHook1).to.have.not.been.called();
        expect(fileHook2).to.have.not.been.called();
    });

    it("should not emit 1-level files for **/*/**", async () => {
        virtual.add((ctx) => ({
            a: {
                a: ctx.file("hello"),
                d: {
                    e: ctx.file("hello")
                }
            },
            b: ctx.file("hello")
        }));

        const result = await glob("**/*/**", { cwd: "/virtual" });
        expect(result).to.be.deep.equal(normalizePaths([
            "a",
            "a/a",
            "a/d",
            "a/d/e"
        ]));
    });

    describe("Glob", () => {
        describe("pause/resume", () => {
            beforeEach(() => {
                virtual.add((ctx) => ({
                    a: ctx.file("hello")
                }));
            });

            it("should be paused by default", async () => {
                const s = spy();
                const glob = new Glob("/virtual/**/*");
                glob.on("match", s);
                expect(glob.isPaused()).to.be.true();
                await delay(10);
                expect(s).to.have.not.been.called();
            });

            it("should resume the process asynchronously", async () => {
                const s = spy();
                const glob = new Glob("/virtual/**/*");
                glob.on("match", s);
                expect(glob.isPaused()).to.be.true();
                glob.resume();
                expect(glob.isPaused()).to.be.true();
                expect(s).to.have.not.been.called();
                await delay(10);
                expect(s).to.have.been.calledOnce();
            });

            it("should not resume if paused synchronously", async () => {
                const s = spy();
                const glob = new Glob("/virtual/**/*");
                glob.on("match", s);
                expect(glob.isPaused()).to.be.true();
                glob.resume();
                glob.pause();
                await delay(10);
                expect(s).to.have.not.been.called();
            });
        });

        describe("end", () => {
            it("should emit end event when the process ends", async () => {
                virtual.add((ctx) => ({
                    "{1..10}": {
                        "{a..f}": ctx.file("hello")
                    }
                }));

                const glob = new Glob("/virtual/**/*");
                const match = spy();
                const end = spy();
                glob.on("match", match).on("end", end).resume();
                await end.waitForCall();
                expect(match).to.have.callCount(10 + 6 * 10);
            });

            it("should end the process and do not emit further match events", async () => {
                virtual.add((ctx) => ({
                    "{1..10}": {
                        "{a..f}": ctx.file("hello")
                    }
                }));

                const glob = new Glob("/virtual/**/*");
                const match = spy();
                const end = spy();
                glob.on("match", match).on("end", end).on("match", () => glob.end()).resume();
                await end.waitForCall();
                await delay(100);
                expect(match).to.have.been.calledOnce();
            });

            it("should end synchronously end the process but asynchronously emit end event", async () => {
                virtual.add((ctx) => ({
                    "{1..10}": {
                        "{a..f}": ctx.file("hello")
                    }
                }));

                const glob = new Glob("/virtual/**/*");
                const end = spy();
                glob.on("end", end).end();
                expect(end).to.have.not.been.called();
                await delay(10);
                expect(end).to.have.been.calledOnce();
            });

            it("should synchronously end synchronously resumed stream and the stream should not emit match events", async () => {
                virtual.add((ctx) => ({
                    "{1..10}": {
                        "{a..f}": ctx.file("hello")
                    }
                }));

                const glob = new Glob("/virtual/**/*");
                const match = spy();
                const end = spy();
                glob.on("match", match).on("end", end).resume().end();
                expect(end).to.have.not.been.called();
                await delay(50);
                expect(end).to.have.been.calledOnce();
                expect(match).to.have.not.been.called();
            });
        });
    });

    describe("integration", () => {
        /**
         * @type {adone.fs.Directory}
         */
        let fixtures = null;

        /**
         * @type {string}
         */
        let cwd;

        before(async () => {
            fixtures = await fs.Directory.createTmp();
            cwd = fixtures.path();

            await fixtures.addFile("b");
            await fixtures.addFile("c");
            const a = await fixtures.addDirectory("a");
            await a.addFile("abcdef", "g", "h");
            await a.addFile(".abcdef", "x", "y", "z", "a");
            await a.addFile("abcfed", "g", "h");
            await a.addFile("b", "c", "d");
            await a.addFile("bc", "e", "f");
            await a.addFile("c", "d", "c", "b");
            await a.addFile("cb", "e", "f");
            const c = await a.addDirectory("symlink", "a", "b");
            if (!is.windows) {
                await fs.symlink("../..", c.getDirectory("c").path());
            }
            await a.addFile("x", ".y", "b");
            await a.addFile("z", ".y", "b");
        });

        after(async () => {
            await fixtures.unlink();
        });

        const cases = JSON.parse(fs.readFileSync(adone.std.path.join(__dirname, "bash_results.json")));

        for (const [pattern, expected] of Object.entries(cases)) {
            it(pattern, async function () { // eslint-disable-line
                if (
                    is.windows
                    && (
                        pattern.includes("symlink") // depends on the symlink behaviour
                        || pattern === "**/abcdef/g/../**"
                        || pattern === "**/abcdef/g/.././*"
                    )
                ) {
                    this.skip();
                    return;
                }
                for (const e of expected) {
                    if (is.windows && e.includes("symlink")) {
                        this.skip();
                        return;
                    }
                }
                const result = await glob(pattern, { cwd });
                expect(result.sort()).to.be.deep.equal(normalizePaths(expected));
            });
        }
    });
});
