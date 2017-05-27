const { fast } = adone;
const { File, plugin: { wrap } } = fast;

describe("Fast", () => {
    describe("transforms", () => {
        describe("wrap", () => {
            it("should pass an empty file as it is", (done) => {
                wrap("")
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isNull()).to.be.true;
                        done();
                    }).resume().write(new File({}));
            });

            it("should produce expected file via buffer", (done) => {
                wrap("<%= contents %>bar")
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.true;
                        expect(String(file.contents)).to.be.equal("foobar");
                        done();
                    })
                    .resume()
                    .write(new File({ contents: new Buffer("foo") }));
            });

            it("should produce expected file via stream", (done) => {
                const stream = new adone.std.stream.PassThrough().pause();
                stream.end(Buffer.from("b"));
                wrap("a<%= contents %>c")
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isStream()).to.be.true;
                        file.contents.on("data", (data) => {
                            expect(String(data)).to.be.equal("abc");
                            done();
                        });
                    })
                    .resume()
                    .write(new File({ contents: stream }));
            });

            it("should error when no template is provided", () => {
                expect(wrap.bind(null)).to.throw(/must be a string or a function/);
            });

            it("should handle a template from a file", (done) => {
                FS.createTempFile().then((file) => {
                    return file.write("BEFORE <%= contents %> AFTER").then(() => file);
                }).then((file) => {
                    wrap({ src: file.path() })
                        .on("error", done)
                        .on("data", (file) => {
                            expect(file.isBuffer()).to.be.true;
                            expect(String(file.contents)).to.be.equal("BEFORE Hello AFTER");
                            done();
                        }).resume().write(new File({ contents: new Buffer("Hello") }));
                });
            });

            it("should handle a template from a function", (done) => {
                wrap(() => {
                    return "BEFORE <%= contents %> AFTER";
                })
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.true;
                        expect(String(file.contents)).to.be.equal("BEFORE Hello AFTER");
                        done();
                    })
                    .resume()
                    .write(new File({ contents: new Buffer("Hello") }));
            });

            it("should fail when it cannot read the template file.", (done) => {
                wrap({ src: "something_that_doesnt_exist" })
                    .on("error", (err) => {
                        expect(err.code).to.be.equal("ENOENT");
                        done();
                    })
                    .resume()
                    .write(new File({ contents: new Buffer("Hello") }));
            });

            it("should handle template data and options", (done) => {
                wrap(
                    "BEFORE <%= data.contents %> <%= data.someVar %> AFTER",
                    { someVar: "someVal" },
                    { variable: "data" }
                )
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.true;
                        expect(String(file.contents)).to.be.equal("BEFORE Hello someVal AFTER");
                        done();
                    })
                    .resume()
                    .write(new File({ contents: new Buffer("Hello") }));
            });

            it("should allow for dynamic options", (done) => {
                const srcFile = new File({ contents: new Buffer("Hello") });
                srcFile.dataProp = "data";

                wrap(
                    "BEFORE <%= data.contents %> <%= data.someVar %> AFTER",
                    { someVar: "someVal" },
                    (file) => {
                        return { variable: file.dataProp };
                    }
                )
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.true;
                        expect(String(file.contents)).to.be.equal("BEFORE Hello someVal AFTER");
                        done();
                    })
                    .resume()
                    .write(srcFile);
            });

            it("should allow file props in the template data", (done) => {
                const srcFile = new File({ contents: new Buffer("Hello") });
                srcFile.someProp = "someValue";

                wrap("Contents: [<%= contents %>] - File prop: [<%= file.someProp %>]")
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer());
                        expect(String(file.contents)).to.be.equal("Contents: [Hello] - File prop: [someValue]");
                        done();
                    }).resume().write(srcFile);
            });

            it("should make data props override file data", (done) => {
                const srcFile = new File({ contents: new Buffer("Hello") });
                srcFile.someProp = "bar";

                wrap("<%= contents %> - <%= file.someProp %>", {
                    file: { someProp: "foo" }
                })
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.ok;
                        expect(String(file.contents)).to.be.equal("Hello - foo");
                        done();
                    }).resume().write(srcFile);
            });

            it("should allow for dynamic data", (done) => {
                const srcFile = new File({ contents: new Buffer("Hello") });
                srcFile.someProp = "bar";

                wrap("<%= contents %> - <%= file.someProp %>", (file) => {
                    return {
                        file: { someProp: `foo-${file.someProp}` }
                    };
                })
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.ok;
                        expect(String(file.contents)).to.be.equal("Hello - foo-bar");
                        done();
                    }).resume().write(srcFile);
            });

            it("should not pollute file data across multiple streams", (done) => {
                const srcFile1 = new File({ contents: new Buffer("1") });
                srcFile1.foo = "one";

                const srcFile2 = new File({ contents: new Buffer("2") });
                srcFile2.bar = "two";

                const expected = ["one  1", "two  2"];

                const stream = wrap("<%= file.one %> <%= file.two %> <%= contents %>")
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.ok;
                        expect(String(file.contents), expected.shift()).to.be.ok;
                        if (expected.length === 0) {
                            done();
                        }
                    });

                stream.write(srcFile1);
                stream.write(srcFile2);
                stream.end();
                stream.resume();
            });

            it("should merge file.data property", (done) => {
                const srcFile = new File({ contents: new Buffer("Hello") });
                srcFile.data = { prop: "foo" };

                wrap("<%= contents %> <%= prop %>")
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.ok;
                        expect(String(file.contents)).to.be.equal("Hello foo");
                        done();
                    }).resume().write(srcFile);
            });

            it("should allow for expressions", (done) => {
                wrap("<%= path.dirname(file.path) %>", { file: { path: "a/b" } }, { imports: { path: adone.std.path } })
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.ok;
                        expect(String(file.contents)).to.be.equal("a");
                        done();
                    }).resume().write(new File({
                        path: "test/fixtures/hello.txt",
                        contents: new Buffer("Hello")
                    }));
            });

            it("should parse JSON files by default", (done) => {
                wrap("BEFORE <%= contents.name %> AFTER")
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.ok;
                        expect(String(file.contents)).to.be.equal("BEFORE foo AFTER");
                        done();
                    })
                    .resume()
                    .write(new File({
                        path: "data.json",
                        contents: new Buffer("{\"name\": \"foo\"}")
                    }));
            });

            it("should parse JSON5 files by default", (done) => {
                wrap("BEFORE <%= contents.name %> AFTER")
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.ok;
                        expect(String(file.contents)).to.be.equal("BEFORE Infinity AFTER");
                        done();
                    })
                    .resume()
                    .write(new File({
                        path: "data.json5",
                        contents: new Buffer("{ name: Infinity }")
                    }));
            });

            it("option parse=false should disable file parsing", (done) => {
                wrap("<%= contents %>", null, { parse: false })
                    .on("error", done)
                    .on("data", (file) => {
                        expect(file.isBuffer()).to.be.ok;
                        expect(String(file.contents)).to.be.equal("name: foo");
                        done();
                    })
                    .resume()
                    .write(new File({
                        path: "data.yml",
                        contents: new Buffer("name: foo")
                    }));
            });

            it("should throw exception object passed for template and no src property is set",
                () => {
                    expect(wrap.bind(null, {})).to.throw("Expecting `src` option");
                });

            it("should throw exception if data file parse is invalid", (done) => {
                wrap("<%= contents %>")
                    .on("error", (err) => {
                        expect(err.message).to.be.equal("Error parsing: data.json");
                        done();
                    })
                    .resume()
                    .write(new File({
                        path: "data.json",
                        contents: new Buffer("This is an invalid JSON file.")
                    }));
            });

            it("should throw exception if template is invalid", (done) => {
                wrap("<%= contents.does.not.exist %>")
                    .on("error", (err) => {
                        expect(err.message).to.equal("Cannot read property 'not' of undefined");
                        done();
                    })
                    .resume()
                    .write(new File({
                        path: "data.json",
                        contents: new Buffer("{\"name\": \"foo\"}")
                    }));
            });

            describe("integration", () => {
                let fromdir;
                let root;
                let srcPath;

                before(async () => {
                    root = await adone.fs.Directory.createTmp();
                });

                after(async () => {
                    await root.unlink();
                });

                beforeEach(async () => {
                    fromdir = await root.addDirectory("from");
                    srcPath = fromdir.getVirtualFile("**", "*.js").path();
                });

                afterEach(async () => {
                    await root.clean();
                });

                it("should wrap", async () => {
                    await fromdir.addFile("hello.js", {
                        content: "console.log(123);"
                    });
                    await fast.src(srcPath).wrap("function() { <%= file.contents %> }").map((file) => {
                        expect(file.contents.toString()).to.be.equal("function() { console.log(123); }");
                    });
                });

                it("should support variables", async () => {
                    await fromdir.addFile("hello.js", {
                        content: "console.log(123);"
                    });
                    await fast.src(srcPath).wrap("function() { <%= file.contents %> } <%= a %>", { a: 123 }).map((file) => {
                        expect(file.contents.toString()).to.be.equal("function() { console.log(123); } 123");
                    });
                });

                it("should support custom variable names", async () => {
                    await fromdir.addFile("hello.js", {
                        content: "console.log(123);"
                    });
                    await fast.src(srcPath).wrap("function() { <%= d.file.contents %> } <%= d.a %>", { a: 123 }, { variable: "d" }).map((file) => {
                        expect(file.contents.toString()).to.be.equal("function() { console.log(123); } 123");
                    });
                });
            });
        });
    });
});
