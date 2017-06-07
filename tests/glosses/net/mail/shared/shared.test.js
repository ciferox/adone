describe("glosses", "net", "mail", "Shared Funcs Tests", () => {
    const { net: { mail: { __: { shared } } }, std: { http, fs, zlib, path }, stream } = adone;

    describe("Logger tests", () => {
        it("Should create a logger", () => {
            expect(typeof shared.getLogger({
                logger: false
            })).to.equal("object");
            expect(typeof shared.getLogger({
                logger: true
            })).to.equal("object");
            expect(typeof shared.getLogger()).to.equal("object");
        });
    });

    describe("Connection url parser tests", () => {
        it("Should parse connection url", () => {
            const url = "smtps://user:pass@localhost:123?tls.rejectUnauthorized=false&name=horizon";
            expect(shared.parseConnectionUrl(url)).to.deep.equal({
                secure: true,
                port: 123,
                host: "localhost",
                auth: {
                    user: "user",
                    pass: "pass"
                },
                tls: {
                    rejectUnauthorized: false
                },
                name: "horizon"
            });
        });

        it("should not choke on special symbols in auth", () => {
            const url = "smtps://user%40gmail.com:%3Apasswith%25Char@smtp.gmail.com";
            expect(shared.parseConnectionUrl(url)).to.deep.equal({
                secure: true,
                host: "smtp.gmail.com",
                auth: {
                    user: "user@gmail.com",
                    pass: ":passwith%Char"
                }
            });
        });
    });

    describe("Resolver tests", () => {
        const port = 10337;
        let server;

        beforeEach((done) => {
            server = http.createServer((req, res) => {
                if (/redirect/.test(req.url)) {
                    res.writeHead(302, {
                        Location: `http://localhost:${port}/message.html`
                    });
                    res.end(`Go to http://localhost:${port}/message.html`);
                } else if (/compressed/.test(req.url)) {
                    res.writeHead(200, {
                        "Content-Type": "text/plain",
                        "Content-Encoding": "gzip"
                    });
                    const stream = zlib.createGzip();
                    stream.pipe(res);
                    stream.write("<p>Tere, tere</p><p>vana kere!</p>\n");
                    stream.end();
                } else {
                    res.writeHead(200, {
                        "Content-Type": "text/plain"
                    });
                    res.end("<p>Tere, tere</p><p>vana kere!</p>\n");
                }
            });

            server.listen(port, done);
        });

        afterEach((done) => {
            server.close(done);
        });

        it("should set text from html string", (done) => {
            const mail = {
                data: {
                    html: "<p>Tere, tere</p><p>vana kere!</p>\n"
                }
            };
            shared.resolveContent(mail.data, "html", (err, value) => {
                expect(err).to.not.exist;
                expect(value).to.equal("<p>Tere, tere</p><p>vana kere!</p>\n");
                done();
            });
        });

        it("should set text from html buffer", (done) => {
            const mail = {
                data: {
                    html: new Buffer("<p>Tere, tere</p><p>vana kere!</p>\n")
                }
            };
            shared.resolveContent(mail.data, "html", (err, value) => {
                expect(err).to.not.exist;
                expect(value).to.deep.equal(mail.data.html);
                done();
            });
        });

        it("should set text from a html file", (done) => {
            const mail = {
                data: {
                    html: {
                        path: path.resolve(__dirname, "fixtures", "message.html")
                    }
                }
            };
            shared.resolveContent(mail.data, "html", (err, value) => {
                expect(err).to.not.exist;
                expect(value).to.be.instanceOf(Buffer);
                value = value.toString().replace(/\r\n/g, "\n");
                expect(value).to.equal("<p>Tere, tere</p><p>vana kere!</p>\n");
                done();
            });
        });

        it("should set text from an html url", (done) => {
            const mail = {
                data: {
                    html: {
                        path: `http://localhost:${port}/message.html`
                    }
                }
            };
            shared.resolveContent(mail.data, "html", (err, value) => {
                expect(err).to.not.exist;
                expect(value).to.deep.equal(new Buffer("<p>Tere, tere</p><p>vana kere!</p>\n"));
                done();
            });
        });

        it("should set text from redirecting url", (done) => {
            const mail = {
                data: {
                    html: {
                        path: `http://localhost:${port}/redirect.html`
                    }
                }
            };
            shared.resolveContent(mail.data, "html", (err, value) => {
                expect(err).to.not.exist;
                expect(value).to.deep.equal(new Buffer("<p>Tere, tere</p><p>vana kere!</p>\n"));
                done();
            });
        });

        it("should set text from gzipped url", (done) => {
            const mail = {
                data: {
                    html: {
                        path: `http://localhost:${port}/compressed.html`
                    }
                }
            };
            shared.resolveContent(mail.data, "html", (err, value) => {
                expect(err).to.not.exist;
                expect(value).to.deep.equal(new Buffer("<p>Tere, tere</p><p>vana kere!</p>\n"));
                done();
            });
        });

        it("should set text from a html stream", (done) => {
            const mail = {
                data: {
                    html: fs.createReadStream(path.resolve(__dirname, "fixtures", "message.html")).pipe(stream.replace("\r\n", "\n"))
                }
            };
            shared.resolveContent(mail.data, "html", (err, value) => {
                expect(err).to.not.exist;
                expect(mail).to.deep.equal({
                    data: {
                        html: new Buffer("<p>Tere, tere</p><p>vana kere!</p>\n")
                    }
                });
                expect(value).to.deep.equal(new Buffer("<p>Tere, tere</p><p>vana kere!</p>\n"));
                done();
            });
        });

        it("should return an error", (done) => {
            const mail = {
                data: {
                    html: {
                        path: `http://localhost:${port + 1000}/message.html`
                    }
                }
            };
            shared.resolveContent(mail.data, "html", (err) => {
                expect(err).to.exist;
                done();
            });
        });

        it("should return encoded string as buffer", (done) => {
            const str = "<p>Tere, tere</p><p>vana kere!</p>\n";
            const mail = {
                data: {
                    html: {
                        encoding: "base64",
                        content: new Buffer(str).toString("base64")
                    }
                }
            };
            shared.resolveContent(mail.data, "html", (err, value) => {
                expect(err).to.not.exist;
                expect(value).to.deep.equal(new Buffer(str));
                done();
            });
        });

        describe("data uri tests", () => {

            it("should resolve with mime type and base64", (done) => {
                const mail = {
                    data: {
                        attachment: {
                            path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
                        }
                    }
                };
                shared.resolveContent(mail.data, "attachment", (err, value) => {
                    expect(err).to.not.exist;
                    expect(value).to.deep.equal(new Buffer("iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==", "base64"));
                    done();
                });
            });

            it("should resolve with mime type and plaintext", (done) => {
                const mail = {
                    data: {
                        attachment: {
                            path: "data:image/png,tere%20tere"
                        }
                    }
                };
                shared.resolveContent(mail.data, "attachment", (err, value) => {
                    expect(err).to.not.exist;
                    expect(value).to.deep.equal(new Buffer("tere tere"));
                    done();
                });
            });

            it("should resolve with plaintext", (done) => {
                const mail = {
                    data: {
                        attachment: {
                            path: "data:,tere%20tere"
                        }
                    }
                };
                shared.resolveContent(mail.data, "attachment", (err, value) => {
                    expect(err).to.not.exist;
                    expect(value).to.deep.equal(new Buffer("tere tere"));
                    done();
                });
            });

            it("should resolve with mime type, charset and base64", (done) => {
                const mail = {
                    data: {
                        attachment: {
                            path: "data:image/png;charset=iso-8859-1;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
                        }
                    }
                };
                shared.resolveContent(mail.data, "attachment", (err, value) => {
                    expect(err).to.not.exist;
                    expect(value).to.deep.equal(new Buffer("iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==", "base64"));
                    done();
                });
            });
        });
    });

    describe("#assign tests", () => {
        it("should assign multiple objects to target", () => {
            const target = {
                a: 1,
                b: 2,
                c: 3
            };
            const arg1 = {
                b: 5,
                y: 66,
                e: 33
            };

            const arg2 = {
                y: 17,
                qq: 98
            };

            shared.assign(target, arg1, arg2);
            expect(target).to.deep.equal({
                a: 1,
                b: 5,
                c: 3,
                y: 17,
                e: 33,
                qq: 98
            });
        });
    });

    describe("#encodeXText tests", () => {
        it("should not encode atom", () => {
            expect(shared.encodeXText("teretere")).to.equal("teretere");
        });

        it("should not encode email", () => {
            expect(shared.encodeXText("andris.reinman@gmail.com")).to.equal("andris.reinman@gmail.com");
        });

        it("should encode space", () => {
            expect(shared.encodeXText("tere tere")).to.equal("tere+20tere");
        });

        it("should encode unicode", () => {
            expect(shared.encodeXText("tere tõre")).to.equal("tere+20t+C3+B5re");
        });

        it("should encode low codes", () => {
            expect(shared.encodeXText("tere t\tre")).to.equal("tere+20t+09re");
        });
    });
});
