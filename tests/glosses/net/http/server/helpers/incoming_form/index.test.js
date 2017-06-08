describe("net", "http", "helpers", "incoming form", () => {
    const { fs, net: { http: { server: { helper: { IncomingForm } } } }, std: { path, http, net }, util } = adone;

    describe("unit", () => {
        const makeHeader = (filename) => `Content-Disposition: form-data; name="upload"; filename="${filename}"`;
        let form = null;

        beforeEach(() => {
            form = new IncomingForm();
        });

        it("should support filenames with regular characters", () => {
            const filename = "foo.txt";
            assert.equal(form._fileName(makeHeader(filename)), "foo.txt");
        });

        it("should support filenames with unescaped quotes", () => {
            const filename = 'my".txt';
            assert.equal(form._fileName(makeHeader(filename)), 'my".txt');
        });

        it("should support filenames with bad quote and additional sub-header", () => {
            const filename = 'my".txt';
            const header = `${makeHeader(filename)}; foo="bar"`;
            assert.equal(form._fileName(header), filename);
        });

        it("should support filenames with semicolon", () => {
            const filename = "my;.txt";
            assert.equal(form._fileName(makeHeader(filename)), "my;.txt");
        });

        it("should support filenames with utf8 characters", () => {
            const filename = "my&#9731;.txt";
            assert.equal(form._fileName(makeHeader(filename)), "my☃.txt");
        });

        it("should strip harmful characters from extension when keepExtensions", () => {
            form.keepExtensions = true;

            let ext = path.extname(form._uploadPath("fine.jpg?foo=bar"));
            assert.equal(ext, ".jpg");

            ext = path.extname(form._uploadPath("fine?foo=bar"));
            assert.equal(ext, "");

            ext = path.extname(form._uploadPath("super.cr2+dsad"));
            assert.equal(ext, ".cr2");

            ext = path.extname(form._uploadPath("super.bar"));
            assert.equal(ext, ".bar");

            ext = path.extname(form._uploadPath("file.aAa"));
            assert.equal(ext, ".aAa");
        });
    });


    let tmpdir = null;
    const fixtures = new adone.fs.Directory(path.resolve(__dirname, "fixtures"));

    before(async () => {
        tmpdir = await adone.fs.Directory.createTmp();
    });

    afterEach(async () => {
        await tmpdir.clean();
    });

    after(async () => {
        await tmpdir.unlink();
    });

    context("standalone", () => {
        specify("connect aborted", (done) => {
            const server = http.createServer((req) => {
                const form = new IncomingForm();
                let abortedReceived = false;
                form.on("aborted", () => {
                    abortedReceived = true;
                });
                form.on("error", () => {
                    if (!abortedReceived) {
                        done(new Error("Error event should follow aborted"));
                    }
                    server.close();
                    done();
                });
                form.on("end", () => {
                    server.close();
                    done(new Error('Unexpected "end" event'));
                });
                form.parse(req);
            }).listen(0, "127.0.0.1", () => {
                const client = net.connect(server.address().port);
                client.write(
                    "POST / HTTP/1.1\r\n" +
                    "Content-Length: 70\r\n" +
                    "Content-Type: multipart/form-data; boundary=foo\r\n\r\n");
                client.end();
            });
        });

        specify("content transfer encoding", (done) => {
            const server = http.createServer((req, res) => {
                const form = new IncomingForm();
                form.uploadDir = tmpdir.path();
                form.on("end", () => {
                    server.close();
                    done(new Error('Unexpected "end" event'));
                });
                form.on("error", (e) => {
                    res.writeHead(500);
                    res.end(e.message);
                });
                form.parse(req);
            });

            server.listen(0, "127.0.0.1", () => {
                const body =
                    "--foo\r\n" +
                    'Content-Disposition: form-data; name="file1"; filename="file1"\r\n' +
                    "Content-Type: application/octet-stream\r\n" +
                    "\r\nThis is the first file\r\n" +
                    "--foo\r\n" +
                    "Content-Type: application/octet-stream\r\n" +
                    'Content-Disposition: form-data; name="file2"; filename="file2"\r\n' +
                    "Content-Transfer-Encoding: unknown\r\n" +
                    "\r\nThis is the second file\r\n" +
                    "--foo--\r\n";

                const req = http.request({
                    method: "POST",
                    port: server.address().port,
                    headers: {
                        "Content-Length": body.length,
                        "Content-Type": "multipart/form-data; boundary=foo"
                    }
                });
                req.on("response", (res) => {
                    assert.equal(res.statusCode, 500);
                    res.on("data", adone.noop);
                    res.on("end", () => {
                        server.close();
                        done();
                    });
                });
                req.end(body);
            });
        });

        specify("keep alive errors", async () => {
            const err = spy();
            const ok = spy();

            const server = http.createServer((req, res) => {
                const form = new IncomingForm();
                form.on("error", () => {
                    res.writeHead(500);
                    res.end();
                    err();
                });
                form.on("end", () => {
                    res.writeHead(200);
                    res.end();
                    ok();
                });
                form.parse(req);
            });
            await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));


            const client = net.createConnection(server.address().port);

            // first send malformed post upload
            client.write("POST /upload-test HTTP/1.1\r\n" +
                "Host: localhost\r\n" +
                "Connection: keep-alive\r\n" +
                "Content-Type: multipart/form-data; boundary=----aaa\r\n" +
                "Content-Length: 10011\r\n\r\n" +
                "------aaa\n\r"); // expected \r\n

            await err.waitForCall();

            const buf = Buffer.alloc(10000);
            buf.fill("a");
            client.write(buf);

            // correct post upload
            client.write("POST /upload-test HTTP/1.1\r\n" +
                "Host: localhost\r\n" +
                "Connection: keep-alive\r\n" +
                "Content-Type: multipart/form-data; boundary=----aaa\r\n" +
                "Content-Length: 13\r\n\r\n" +
                "------aaa--\r\n");

            await ok.waitForCall();

            client.end();
            server.close();
        });
    });

    context("integration", () => {

        specify("octet stream", (done) => {
            const testFile = fixtures.getVirtualFile("file", "archive.tar.gz");

            const server = http.createServer((req, res) => {
                const form = new IncomingForm();
                form.uploadDir = tmpdir.path();

                form.parse(req, (err, fields, files) => {
                    expect(util.keys(files)).to.have.lengthOf(1);
                    const file = files.file;
                    expect(file.size).to.be.equal(162);

                    const uploaded = new adone.fs.File(file.path).contentSync();
                    const original = testFile.contentSync();

                    expect(uploaded).to.be.equal(original);
                    res.end();
                    server.close();
                    done();
                });
            });

            server.listen(0, "127.0.0.1", (err) => {
                if (err) {
                    done(err);
                    return;
                }
                const { port } = server.address();

                const request = http.request({
                    port,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/octet-stream"
                    }
                });
                fs.createReadStream(testFile.path()).pipe(request);
            });
        });

        specify("json", (done) => {
            const testData = {
                string: "hello",
                null: null,
                numbers: [1, 2, 3, 3.1415],
                object: { a: { a: 2 }, b: 4, c: ["strin"] }
            };

            const server = http.createServer((req, res) => {
                const form = new IncomingForm();

                form.parse(req, (err, fields) => {
                    res.end();
                    server.close();

                    assert.deepEqual(fields, testData);
                    done();
                });
            });

            server.listen(0, "127.0.0.1", (err) => {
                if (err) {
                    done(err);
                    return;
                }
                const { port } = server.address();

                const request = http.request({
                    port,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                request.end(JSON.stringify(testData));
            });
        });

        context("fixtures", () => {
            const compare = (file, expected, done) => {
                const server = http.createServer((req, res) => {
                    const form = new IncomingForm();
                    form.uploadDir = tmpdir.path();
                    form.hash = "sha1";
                    form.parse(req);
                    const parts = [];
                    form
                        .on("error", (err) => {
                            res.end();
                            server.close();
                            done(err);
                        })
                        .on("fileBegin", (name, value) => {
                            parts.push({ type: "file", name, value });
                        })
                        .on("field", (name, value) => {
                            parts.push({ type: "field", name, value });
                        })
                        .on("end", () => {
                            res.end("OK");
                            server.close();

                            expect(parts.length).to.be.equal(expected.length);

                            for (let i = 0; i < expected.length; ++i) {
                                expect(parts[i].name).to.be.equal(expected[i].name);
                                expect(parts[i].type).to.be.equal(expected[i].type);
                                if (expected[i].type === "file") {
                                    const file = parts[i].value;
                                    expect(file.name).to.be.equal(expected[i].filename);
                                    if (expected[i].sha1) {
                                        expect(file.hash).to.be.equal(expected[i].sha1);
                                    }
                                }
                            }

                            done();
                        });
                });

                server.listen(0, "127.0.0.1", () => {
                    const { port } = server.address();
                    const socket = net.createConnection(port);
                    const stream = fs.createReadStream(file.path());
                    stream.pipe(socket, { end: false });
                    socket.once("data", () => socket.end());
                });
            };

            context("encoding", () => {
                specify("menu_separator.png", (done) => {
                    compare(fixtures.getVirtualFile("http", "encoding", "menu_separator.png.http"), [{
                        type: "file",
                        name: "image",
                        filename: "menu_separator.png",
                        sha1: "c845ca3ea794be298f2a1b79769b71939eaf4e54"
                    }], done);
                });

                specify("beta-sticker-1.png", (done) => {
                    compare(fixtures.getVirtualFile("http", "encoding", "beta-sticker-1.png.http"), [{
                        type: "file",
                        name: "sticker",
                        filename: "beta-sticker-1.png",
                        sha1: "6abbcffd12b4ada5a6a084fe9e4584f846331bc4"
                    }], done);
                });

                specify("blank.gif", (done) => {
                    compare(fixtures.getVirtualFile("http", "encoding", "blank.gif.http"), [{
                        type: "file",
                        name: "file",
                        filename: "blank.gif",
                        sha1: "a1fdee122b95748d81cee426d717c05b5174fe96"
                    }], done);
                });

                specify("binaryfile.tar.gz", (done) => {
                    compare(fixtures.getVirtualFile("http", "encoding", "binaryfile.tar.gz.http"), [{
                        type: "file",
                        name: "file",
                        filename: "binaryfile.tar.gz",
                        sha1: "cfabe13b348e5e69287d677860880c52a69d2155"
                    }], done);
                });

                specify("plain.txt", (done) => {
                    compare(fixtures.getVirtualFile("http", "encoding", "plain.txt.http"), [{
                        type: "file",
                        name: "file",
                        filename: "plain.txt",
                        sha1: "b31d07bac24ac32734de88b3687dddb10e976872"
                    }], done);
                });
            });

            context("misc", () => {
                specify("empty", (done) => {
                    compare(fixtures.getVirtualFile("http", "misc", "empty.http"), [], done);
                });

                specify("empty urlencoded", (done) => {
                    compare(fixtures.getVirtualFile("http", "misc", "empty-urlencoded.http"), [], done);
                });

                specify("empty multipart", (done) => {
                    compare(fixtures.getVirtualFile("http", "misc", "empty-multipart.http"), [], done);
                });

                specify("empty multipart2", (done) => {
                    compare(fixtures.getVirtualFile("http", "misc", "empty-multipart2.http"), [], done);
                });

                specify("minimal", (done) => {
                    compare(fixtures.getVirtualFile("http", "misc", "minimal.http"), [], done);
                });
            });

            context("no filename", () => {
                specify("generic", (done) => {
                    compare(fixtures.getVirtualFile("http", "no-filename", "generic.http"), [{
                        type: "file",
                        name: "upload",
                        filename: "",
                        sha1: "b31d07bac24ac32734de88b3687dddb10e976872"
                    }], done);
                });

                specify("filename-name", (done) => {
                    compare(fixtures.getVirtualFile("http", "no-filename", "filename-name.http"), [{
                        type: "file",
                        name: "upload",
                        filename: "plain.txt",
                        sha1: "b31d07bac24ac32734de88b3687dddb10e976872"
                    }], done);
                });
            });

            context("preamble", () => {
                specify("crlf", (done) => {
                    compare(fixtures.getVirtualFile("http", "preamble", "crlf.http"), [{
                        type: "file",
                        name: "upload",
                        filename: "plain.txt",
                        sha1: "b31d07bac24ac32734de88b3687dddb10e976872"
                    }], done);
                });

                specify("preamble", (done) => {
                    compare(fixtures.getVirtualFile("http", "preamble", "preamble.http"), [{
                        type: "file",
                        name: "upload",
                        filename: "plain.txt",
                        sha1: "b31d07bac24ac32734de88b3687dddb10e976872"
                    }], done);
                });
            });

            context("special chars in filename", () => {
                specify("webkit", (done) => {
                    compare(fixtures.getVirtualFile("http", "special-chars-in-filename", "webkit.http"), [
                        { type: "field", name: "title", value: "Weird filename" },
                        { type: "file", name: "upload", filename: " ? % * | \" < > . ? ; ' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt" }
                    ], done);
                });

                specify("ff", (done) => {
                    compare(fixtures.getVirtualFile("http", "special-chars-in-filename", "ff.http"), [
                        { type: "field", name: "title", value: "Weird filename" },
                        { type: "file", name: "upload", filename: " ? % * | \" < > . ☃ ; ' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt" }
                    ], done);
                });

                specify("safari", (done) => {
                    compare(fixtures.getVirtualFile("http", "special-chars-in-filename", "safari.http"), [
                        { type: "field", name: "title", value: "Weird filename" },
                        { type: "file", name: "upload", filename: " ? % * | \" < > . ? ; ' @ # $ ^ & ( ) - _ = + { } [ ] ` ~.txt" }
                    ], done);
                });
            });

            context("workarounds", () => {
                specify("missing hyphens1", (done) => {
                    compare(fixtures.getVirtualFile("http", "workarounds", "missing-hyphens1.http"), [{
                        type: "file",
                        name: "upload",
                        filename: "plain.txt",
                        sha1: "b31d07bac24ac32734de88b3687dddb10e976872"
                    }], done);
                });

                specify("missing hyphens2", (done) => {
                    compare(fixtures.getVirtualFile("http", "workarounds", "missing-hyphens2.http"), [{
                        type: "file",
                        name: "upload",
                        filename: "plain.txt",
                        sha1: "b31d07bac24ac32734de88b3687dddb10e976872"
                    }], done);
                });
            });
        });
    });

    context("legacy", () => {
        context("integration", () => {
            context("multipart parser", () => {
                const cases = require("./multipart");
                const { MultipartParser } = IncomingForm;

                for (const [name, data] of util.entries(cases)) {
                    specify(name, () => {
                        const parts = [];
                        const parser = new MultipartParser();
                        parser.initWithBoundary(data.boundary);

                        let endCalled = false;
                        let part = null;
                        let headerField = null;
                        let headerValue = null;

                        parser.onPartBegin = () => {
                            part = { headers: {}, data: "" };
                            parts.push(part);
                            headerField = "";
                            headerValue = "";
                        };

                        parser.onHeaderField = (b, start, end) => {
                            headerField += b.toString("ascii", start, end);
                        };

                        parser.onHeaderValue = (b, start, end) => {
                            headerValue += b.toString("ascii", start, end);
                        };

                        parser.onHeaderEnd = () => {
                            part.headers[headerField] = headerValue;
                            headerField = "";
                            headerValue = "";
                        };

                        parser.onPartData = (b, start, end) => {
                            part.data += b.toString("ascii", start, end);
                        };

                        parser.onEnd = () => {
                            endCalled = true;
                        };

                        const buffer = Buffer.from(data.raw, "binary");
                        const CHUNK_LENGTH = 10;

                        let offset = 0;
                        while (offset < buffer.length) {
                            let chunk;
                            if (offset + CHUNK_LENGTH < buffer.length) {
                                chunk = buffer.slice(offset, offset + CHUNK_LENGTH);
                            } else {
                                chunk = buffer.slice(offset, buffer.length);
                            }
                            offset = offset + CHUNK_LENGTH;

                            const nparsed = parser.write(chunk);
                            if (nparsed !== chunk.length) {
                                if (data.expectError) {
                                    return;
                                }
                                throw new Error(`${chunk.length} bytes written, but only ${nparsed} bytes parsed!`);
                            }
                        }

                        if (data.expectError) {
                            throw new Error("expected parse error did not happen");
                        }

                        expect(endCalled).to.be.true;
                        expect(parts).to.be.deep.equal(data.parts);
                    });
                }
            });
        });

        context("simple", () => {
            context("querystring", () => {
                const { QuerystringParser } = IncomingForm;

                specify("constructor", () => {
                    const parser = new QuerystringParser();
                    expect(parser.buffer).to.be.empty;
                });

                specify("write", () => {
                    const parser = new QuerystringParser();

                    const a = Buffer.from("a=1");
                    assert.equal(parser.write(a), a.length);

                    const b = Buffer.from("&b=2");
                    parser.write(b);
                    assert.equal(parser.buffer, a + b);
                });

                specify("end", () => {
                    const parser = new QuerystringParser();
                    parser.write("a=1&b=2&c=3");
                    const onField = parser.onField = spy();
                    const onEnd = parser.onEnd = spy();
                    parser.end();
                    expect(onField).to.have.been.calledThrice;
                    expect(onEnd).to.have.been.calledOnce;
                    expect(onField).to.have.been.calledWith("a", "1");
                    expect(onField).to.have.been.calledWith("b", "2");
                    expect(onField).to.have.been.calledWith("c", "3");
                });
            });

            context("file", () => {
                const { File } = IncomingForm;

                specify("constructor", () => {
                    const file = new File();
                    expect(file.size).to.be.equal(0);
                    expect(file.path).to.be.null;
                    expect(file.name).to.be.null;
                    expect(file.type).to.be.null;
                    expect(file.lastModifiedDate).to.be.null;
                    expect(file._writeStream).to.be.null;
                });

                specify("write", async () => {
                    const file = new File();
                    const progress = spy();
                    file.on("progress", progress);
                    file._writeStream = new adone.collection.BufferList();
                    file.write(Buffer.from("hello"));
                    await adone.promise.delay(1);
                    expect(progress).to.be.calledOnce;
                    expect(progress.lastCall.args[0]).to.be.equal(5);  // bytes
                    expect(file._writeStream.toString()).to.be.equal("hello");
                    file.write(Buffer.from(" world"));
                    await adone.promise.delay(1);
                    expect(progress).to.be.calledTwice;
                    expect(progress.lastCall.args[0]).to.be.equal(11);  // bytes
                    expect(file._writeStream.toString()).to.be.equal("hello world");
                });

                specify("end", async () => {
                    const file = new File();
                    file._writeStream = new adone.collection.BufferList();
                    const onEnd = spy();
                    file.on("end", onEnd);
                    file.end();
                    await adone.promise.delay(1);
                    expect(onEnd).to.have.been.calledOnce;
                    expect(file._writeStream._writableState.ended).to.be.true;
                });
            });
        });

        specify("multiple files uploading", (done) => {
            const BOUNDARY = "---------------------------10102754414578508781458777923";
            const video = fixtures.getVirtualFile("multi_video.upload");
            const server = http.createServer((req, res) => {
                const form = new IncomingForm();
                form.uploadDir = tmpdir.path();
                form.hash = "sha1";
                form.parse(req);
                const uploads = {};
                form
                    .on("fileBegin", (field, file) => {
                        expect(field).to.be.equal("upload");
                        const tracker = { file, progress: [], ended: false };
                        uploads[file.name] = tracker;
                        file
                            .on("progress", (bytesReceived) => {
                                tracker.progress.push(bytesReceived);
                                expect(bytesReceived).to.be.equal(file.size);
                            })
                            .on("end", () => {
                                tracker.ended = true;
                            });
                    })
                    .on("field", (field, value) => {
                        expect(field).to.be.equal("title");
                        expect(value).to.be.empty;
                    })
                    .on("file", (field, file) => {
                        expect(field).to.be.equal("upload");
                        expect(uploads[file.name].file).to.be.equal(file);
                        expect(uploads[file.name].ended).to.be.true;
                    })
                    .on("end", () => {
                        assert.ok(uploads["shortest_video.flv"]);
                        assert.ok(uploads["shortest_video.flv"].ended);
                        assert.ok(uploads["shortest_video.flv"].progress.length > 3);
                        assert.equal(uploads["shortest_video.flv"].file.hash, "d6a17616c7143d1b1438ceeef6836d1a09186b3a");
                        assert.equal(uploads["shortest_video.flv"].progress.slice(-1), uploads["shortest_video.flv"].file.size);
                        assert.ok(uploads["shortest_video.mp4"]);
                        assert.ok(uploads["shortest_video.mp4"].ended);
                        assert.ok(uploads["shortest_video.mp4"].progress.length > 3);
                        assert.equal(uploads["shortest_video.mp4"].file.hash, "937dfd4db263f4887ceae19341dcc8d63bcd557f");

                        res.writeHead(200);
                        res.end("good");
                        server.close();
                        done();
                    });
            });

            server.listen(0, "127.0.0.1", () => {
                const { port } = server.address();

                const stat = video.statSync();

                const request = http.request({
                    port,
                    path: "/",
                    method: "POST",
                    headers: {
                        "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
                        "content-length": stat.size
                    }
                });

                video.contentStream(null).pipe(request);
            });
        });
    });
});
