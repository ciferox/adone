/* global describe it */


import { SFTPStream, constants } from "../../../../../lib/glosses/net/ssh/ssh_streams";
const Stats = SFTPStream.Stats;
const STATUS_CODE = SFTPStream.STATUS_CODE;
const OPEN_MODE = SFTPStream.OPEN_MODE;


describe("SSH-Streams", function () {
    describe("SFTP", function () {
        it("open", function(done) {
            setup(this, done);

            var self = this;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var path_ = "/tmp/foo.txt";
                var handle_ = new Buffer("node.js");
                server.on("OPEN", function(id, path, pflags, attrs) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    assert(pflags === (OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.WRITE),
                        "Wrong flags: " + flagsToHuman(pflags));
                    server.handle(id, handle_);
                    server.end();
                });
                client.open(path_, "w", function(err, handle) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected open() error: " + err);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                });
            };
        });

        it("close", function(done) {
            setup(this, done);

            var self = this;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var handle_ = new Buffer("node.js");
                server.on("CLOSE", function(id, handle) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                client.close(handle_, function(err) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected close() error: " + err);
                });
            };
        });

        it("readData", function(done) {
            setup(this, done);

            var self = this;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var handle_ = new Buffer("node.js");
                var expected = new Buffer("node.jsnode.jsnode.jsnode.jsnode.jsnode.js");
                var buffer = new Buffer(expected.length);
                buffer.fill(0);
                server.on("READ", function(id, handle, offset, len) {
                    assert(++self.state.requests <= 2,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    assert(offset === 5, "Wrong read offset: " + offset);
                    assert(len === buffer.length, "Wrong read len: " + len);
                    server.data(id, expected);
                    server.end();
                });
                client.readData(handle_, buffer, 0, buffer.length, 5, clientReadCb);

                function clientReadCb(err, code) {
                    assert(++self.state.responses <= 2,
                        "Saw too many responses");
                    assert(!err, "Unexpected readData() error: " + err);
                    assert.deepEqual(buffer,
                        expected,
                        "read data mismatch");
                }
            };
        });

        it("write", function(done) {
            setup(this, done);

            var self = this;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var handle_ = new Buffer("node.js");
                var buf = new Buffer("node.jsnode.jsnode.jsnode.jsnode.jsnode.js");
                server.on("WRITE", function(id, handle, offset, data) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    assert(offset === 5, "Wrong write offset: " + offset);
                    assert.deepEqual(data, buf, "write data mismatch");
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                client.writeData(handle_, buf, 0, buf.length, 5, function(err, nb) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected writeData() error: " + err);
                    assert.equal(nb, buf.length);
                });
            };
        });

        it("write (overflow)", function(done) {
            setup(this, done, {
                requests: 3,
                responses: 1
            });

            var self = this;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var handle_ = new Buffer("node.js");
                var buf = new Buffer(3 * 32 * 1024);
                server.on("WRITE", function(id, handle, offset, data) {
                    ++self.state.requests;
                    assert.equal(id,
                        self.state.requests - 1,
                        "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    assert.equal(offset,
                        (self.state.requests - 1) * 32 * 1024,
                        "Wrong write offset: " + offset);
                    assert((offset + data.length) <= buf.length);
                    assert.deepEqual(data,
                        buf.slice(offset, offset + data.length),
                        "write data mismatch");
                    server.status(id, STATUS_CODE.OK);
                    if (self.state.requests === 3)
                        server.end();
                });
                client.writeData(handle_, buf, 0, buf.length, 0, function(err, nb) {
                    ++self.state.responses;
                    assert(!err, "Unexpected writeData() error: " + err);
                    assert.equal(nb, buf.length);
                });
            };
        });

        it("lstat", function(done) {
            setup(this, done);

            var self = this;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var path_ = "/foo/bar/baz";
                var attrs_ = new Stats({
                    size: 10 * 1024,
                    uid: 9001,
                    gid: 9001,
                    atime: (Date.now() / 1000) | 0,
                    mtime: (Date.now() / 1000) | 0
                });
                server.on("LSTAT", function(id, path) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    server.attrs(id, attrs_);
                    server.end();
                });
                client.lstat(path_, function(err, attrs) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected lstat() error: " + err);
                    assert.deepEqual(attrs, attrs_, "attrs mismatch");
                });
            };
        });

        it("fstat", function(done) {
            setup(this, done);

            var self = this;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var handle_ = new Buffer("node.js");
                var attrs_ = new Stats({
                    size: 10 * 1024,
                    uid: 9001,
                    gid: 9001,
                    atime: (Date.now() / 1000) | 0,
                    mtime: (Date.now() / 1000) | 0
                });
                server.on("FSTAT", function(id, handle) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    server.attrs(id, attrs_);
                    server.end();
                });
                client.fstat(handle_, function(err, attrs) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected fstat() error: " + err);
                    assert.deepEqual(attrs, attrs_, "attrs mismatch");
                });
            };
        });

        it("setstat", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var path_ = "/foo/bar/baz";
                var attrs_ = new Stats({
                    uid: 9001,
                    gid: 9001,
                    atime: (Date.now() / 1000) | 0,
                    mtime: (Date.now() / 1000) | 0
                });
                server.on("SETSTAT", function(id, path, attrs) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    assert.deepEqual(attrs, attrs_, "attrs mismatch");
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                client.setstat(path_, attrs_, function(err) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected setstat() error: " + err);
                });
            };
        });

        it("fsetstat", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var handle_ = new Buffer("node.js");
                var attrs_ = new Stats({
                    uid: 9001,
                    gid: 9001,
                    atime: (Date.now() / 1000) | 0,
                    mtime: (Date.now() / 1000) | 0
                });
                server.on("FSETSTAT", function(id, handle, attrs) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    assert.deepEqual(attrs, attrs_, "attrs mismatch");
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                client.fsetstat(handle_, attrs_, function(err) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected fsetstat() error: " + err);
                });
            };
        });

        it("opendir", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var handle_ = new Buffer("node.js");
                var path_ = "/tmp";
                server.on("OPENDIR", function(id, path) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    server.handle(id, handle_);
                    server.end();
                });
                client.opendir(path_, function(err, handle) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected opendir() error: " + err);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                });
            };
        });

        it("readdir", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var handle_ = new Buffer("node.js");
                var list_ = [{
                    filename: ".",
                    longname: "drwxr-xr-x  56 nodejs   nodejs      4096 Nov 10 01:05 .",
                    attrs: new Stats({
                        mode: 0o755 | constants.S_IFDIR,
                        size: 4096,
                        uid: 9001,
                        gid: 8001,
                        atime: 1415599549,
                        mtime: 1415599590
                    })
                }, {
                    filename: "..",
                    longname: "drwxr-xr-x   4 root     root        4096 May 16  2013 ..",
                    attrs: new Stats({
                        mode: 0o755 | constants.S_IFDIR,
                        size: 4096,
                        uid: 0,
                        gid: 0,
                        atime: 1368729954,
                        mtime: 1368729999
                    })
                }, {
                    filename: "foo",
                    longname: "drwxrwxrwx   2 nodejs   nodejs      4096 Mar  8  2009 foo",
                    attrs: new Stats({
                        mode: 0o777 | constants.S_IFDIR,
                        size: 4096,
                        uid: 9001,
                        gid: 8001,
                        atime: 1368729954,
                        mtime: 1368729999
                    })
                }, {
                    filename: "bar",
                    longname: "-rw-r--r--   1 nodejs   nodejs 513901992 Dec  4  2009 bar",
                    attrs: new Stats({
                        mode: 0o644 | constants.S_IFREG,
                        size: 513901992,
                        uid: 9001,
                        gid: 8001,
                        atime: 1259972199,
                        mtime: 1259972199
                    })
                }];
                server.on("READDIR", function(id, handle) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    server.name(id, list_);
                    server.end();
                });
                client.readdir(handle_, function(err, list) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected readdir() error: " + err);
                    assert.deepEqual(list,
                        list_.slice(2),
                        "dir list mismatch");
                });
            };
        });

        it("readdir (full)", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var handle_ = new Buffer("node.js");
                var list_ = [{
                    filename: ".",
                    longname: "drwxr-xr-x  56 nodejs   nodejs      4096 Nov 10 01:05 .",
                    attrs: new Stats({
                        mode: 0o755 | constants.S_IFDIR,
                        size: 4096,
                        uid: 9001,
                        gid: 8001,
                        atime: 1415599549,
                        mtime: 1415599590
                    })
                }, {
                    filename: "..",
                    longname: "drwxr-xr-x   4 root     root        4096 May 16  2013 ..",
                    attrs: new Stats({
                        mode: 0o755 | constants.S_IFDIR,
                        size: 4096,
                        uid: 0,
                        gid: 0,
                        atime: 1368729954,
                        mtime: 1368729999
                    })
                }, {
                    filename: "foo",
                    longname: "drwxrwxrwx   2 nodejs   nodejs      4096 Mar  8  2009 foo",
                    attrs: new Stats({
                        mode: 0o777 | constants.S_IFDIR,
                        size: 4096,
                        uid: 9001,
                        gid: 8001,
                        atime: 1368729954,
                        mtime: 1368729999
                    })
                }, {
                    filename: "bar",
                    longname: "-rw-r--r--   1 nodejs   nodejs 513901992 Dec  4  2009 bar",
                    attrs: new Stats({
                        mode: 0o644 | constants.S_IFREG,
                        size: 513901992,
                        uid: 9001,
                        gid: 8001,
                        atime: 1259972199,
                        mtime: 1259972199
                    })
                }];
                server.on("READDIR", function(id, handle) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    server.name(id, list_);
                    server.end();
                });
                client.readdir(handle_, {
                    full: true
                }, function(err, list) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected readdir() error: " + err);
                    assert.deepEqual(list, list_, "dir list mismatch");
                });
            };
        });

        it("remove", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var path_ = "/foo/bar/baz";
                server.on("REMOVE", function(id, path) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                client.unlink(path_, function(err) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected unlink() error: " + err);
                });
            };
        });

        it("mkdir", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var path_ = "/foo/bar/baz";
                server.on("MKDIR", function(id, path) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                client.mkdir(path_, function(err) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected mkdir() error: " + err);
                });
            };
        });

        it("rmdir", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var path_ = "/foo/bar/baz";
                server.on("RMDIR", function(id, path) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                client.rmdir(path_, function(err) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected rmdir() error: " + err);
                });
            };
        });

        it("realpath", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var path_ = "/foo/bar/baz";
                var name_ = {
                    filename: "/tmp/foo"
                };
                server.on("REALPATH", function(id, path) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    server.name(id, name_);
                    server.end();
                });
                client.realpath(path_, function(err, name) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected realpath() error: " + err);
                    assert.deepEqual(name, name_.filename, "name mismatch");
                });
            };
        });

        it("stat", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var path_ = "/foo/bar/baz";
                var attrs_ = new Stats({
                    size: 10 * 1024,
                    uid: 9001,
                    gid: 9001,
                    atime: (Date.now() / 1000) | 0,
                    mtime: (Date.now() / 1000) | 0
                });
                server.on("STAT", function(id, path) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    server.attrs(id, attrs_);
                    server.end();
                });
                client.stat(path_, function(err, attrs) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected stat() error: " + err);
                    assert.deepEqual(attrs, attrs_, "attrs mismatch");
                });
            };
        });

        it("rename", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var oldPath_ = "/foo/bar/baz";
                var newPath_ = "/tmp/foo";
                server.on("RENAME", function(id, oldPath, newPath) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(oldPath === oldPath_,
                        "Wrong old path: " + oldPath);
                    assert(newPath === newPath_,
                        "Wrong new path: " + newPath);
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                client.rename(oldPath_, newPath_, function(err) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected rename() error: " + err);
                });
            };
        });

        it("readlink", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var linkPath_ = "/foo/bar/baz";
                var name = {
                    filename: "/tmp/foo"
                };
                server.on("READLINK", function(id, linkPath) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(linkPath === linkPath_,
                        "Wrong link path: " + linkPath);
                    server.name(id, name);
                    server.end();
                });
                client.readlink(linkPath_, function(err, targetPath) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected readlink() error: " + err);
                    assert(targetPath === name.filename,
                        "Wrong target path: " + targetPath);
                });
            };
        });

        it("symlink", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var linkPath_ = "/foo/bar/baz";
                var targetPath_ = "/tmp/foo";
                server.on("SYMLINK", function(id, linkPath, targetPath) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(linkPath === linkPath_,
                        "Wrong link path: " + linkPath);
                    assert(targetPath === targetPath_,
                        "Wrong target path: " + targetPath);
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                client.symlink(targetPath_, linkPath_, function(err) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(!err, "Unexpected symlink() error: " + err);
                });
            };
        });

        it("readFile", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var path_ = "/foo/bar/baz";
                var handle_ = new Buffer("hi mom!");
                var data_ = new Buffer("hello world");
                server.once("OPEN", function(id, path, pflags, attrs) {
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    assert(pflags === OPEN_MODE.READ,
                        "Wrong flags: " + flagsToHuman(pflags));
                    server.handle(id, handle_);
                }).once("FSTAT", function(id, handle) {
                    assert(id === 1, "Wrong request id: " + id);
                    var attrs = new Stats({
                        size: data_.length,
                        uid: 9001,
                        gid: 9001,
                        atime: (Date.now() / 1000) | 0,
                        mtime: (Date.now() / 1000) | 0
                    });
                    server.attrs(id, attrs);
                }).once("READ", function(id, handle, offset, len) {
                    assert(id === 2, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    assert(offset === 0, "Wrong read offset: " + offset);
                    server.data(id, data_);
                }).once("CLOSE", function(id, handle) {
                    ++self.state.requests;
                    assert(id === 3, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                var buf = [];
                client.readFile(path_, function(err, buf) {
                    ++self.state.responses;
                    assert(!err, "Unexpected error: " + err);
                    assert.deepEqual(buf, data_, "data mismatch");
                });
            };
        });

        it("ReadStream", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var opens = 0;
                var reads = 0;
                var closes = 0;
                var path_ = "/foo/bar/baz";
                var handle_ = new Buffer("hi mom!");
                var data_ = new Buffer("hello world");
                server.on("OPEN", function(id, path, pflags, attrs) {
                    assert(++opens === 1, "Saw too many OPENs");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    assert(pflags === OPEN_MODE.READ,
                        "Wrong flags: " + flagsToHuman(pflags));
                    server.handle(id, handle_);
                }).on("READ", function(id, handle, offset, len) {
                    assert(++reads <= 2, "Saw too many READs");
                    assert(id === reads, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    if (reads === 1) {
                        assert(offset === 0, "Wrong read offset: " + offset);
                        server.data(id, data_);
                    } else
                        server.status(id, STATUS_CODE.EOF);
                }).on("CLOSE", function(id, handle) {
                    ++self.state.requests;
                    assert(++closes === 1, "Saw too many CLOSEs");
                    assert(id === 3, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                });
                var buf = [];
                client.createReadStream(path_).on("readable", function() {
                    var chunk;
                    while ((chunk = this.read()) !== null) {
                        buf.push(chunk);
                    }
                }).on("end", function() {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    buf = Buffer.concat(buf);
                    assert.deepEqual(buf, data_, "data mismatch");
                });
            };
        });

        it("ReadStream (error)", function(done) {
            setup(this, done);

            var self = this;
            var what = this.what;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var opens = 0;
                var path_ = "/foo/bar/baz";
                var error;
                server.on("OPEN", function(id, path, pflags, attrs) {
                    ++opens;
                    ++self.state.requests;
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    assert(pflags === OPEN_MODE.READ, "Wrong flags: " + flagsToHuman(pflags));
                    server.status(id, STATUS_CODE.NO_SUCH_FILE);
                    server.end();
                });
                client.createReadStream(path_).on("error", function(err) {
                    error = err;
                }).on("close", function() {
                    assert(opens === 1, "Saw " + opens + " OPENs");
                    assert(error, "Expected error");
                    assert(++self.state.responses === 1, "Saw too many responses");
                });
            };
        });

        it("WriteStream", function(done) {
            setup(this, done);

            var self = this;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var opens = 0;
                var writes = 0;
                var closes = 0;
                var fsetstat = false;
                var path_ = "/foo/bar/baz";
                var handle_ = new Buffer("hi mom!");
                var data_ = new Buffer("hello world");
                var expFlags = OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.WRITE;
                server.on("OPEN", function(id, path, pflags, attrs) {
                    assert(++opens === 1, "Saw too many OPENs");
                    assert(id === 0, "Wrong request id: " + id);
                    assert(path === path_, "Wrong path: " + path);
                    assert(pflags === expFlags,
                        "Wrong flags: " + flagsToHuman(pflags));
                    server.handle(id, handle_);
                }).once("FSETSTAT", function(id, handle, attrs) {
                    fsetstat = true;
                    assert(id === 1, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    assert.strictEqual(attrs.mode,
                        parseInt("0666", 8),
                        "Wrong file mode");
                    server.status(id, STATUS_CODE.OK);
                }).on("WRITE", function(id, handle, offset, data) {
                    assert(++writes <= 3, "Saw too many WRITEs");
                    assert(id === writes + 1, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    assert(offset === ((writes - 1) * data_.length),
                        "Wrong write offset: " + offset);
                    assert.deepEqual(data, data_, "Wrong data");
                    server.status(id, STATUS_CODE.OK);
                }).on("CLOSE", function(id, handle) {
                    ++self.state.requests;
                    assert(++closes === 1, "Saw too many CLOSEs");
                    assert(id === 5, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    server.status(id, STATUS_CODE.OK);
                    server.end();
                }).on("end", function() {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(opens === 1, "Wrong OPEN count");
                    assert(writes === 3, "Wrong WRITE count");
                    assert(closes === 1, "Wrong CLOSE count");
                    assert(fsetstat, "Expected FSETSTAT");
                });

                var writer = client.createWriteStream(path_);
                if (writer.cork)
                    writer.cork();
                writer.write(data_);
                writer.write(data_);
                writer.write(data_);
                if (writer.uncork)
                    writer.uncork();
                writer.end();
            };
        });

        it("readdir (EOF)", function(done) {
            setup(this, done);

            var self = this;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var handle_ = new Buffer("node.js");
                server.on("READDIR", function(id, handle) {
                    assert(++self.state.requests === 1,
                        "Saw too many requests");
                    assert(id === 0, "Wrong request id: " + id);
                    assert.deepEqual(handle, handle_, "handle mismatch");
                    server.status(id, STATUS_CODE.EOF);
                    server.end();
                });
                client.readdir(handle_, function(err, list) {
                    assert(++self.state.responses === 1,
                        "Saw too many responses");
                    assert(err && err.code === STATUS_CODE.EOF,
                        "Expected EOF, got: " + err);
                });
            };
        });

        it("\"continue\" event after push() === false", function(done) {
            setup(this, done, {
                requests: -1,
                responses: -1
            });

            var self = this;
            var client = this.client;
            var server = this.server;

            this.onReady = function() {
                var path_ = "/tmp/foo.txt";
                var reqs = 0;
                var continues = 0;

                client.unpipe(server);

                function clientCb(err, handle) {
                    assert(++self.state.responses <= reqs,
                        "Saw too many responses");
                    if (self.state.responses === reqs) {
                        assert(continues === 1, "no continue event seen");
                        server.end();
                    }
                }

                client.on("continue", function() {
                    assert(++continues === 1, "saw > 1 continue event");
                });

                for (;;) {
                    ++reqs;
                    if (!client.open(path_, "w", clientCb))
                        break;
                }

                client.pipe(server);
            };
        });

        it("Can parse status response without language", function(done) {
            var client = new SFTPStream();
            client.once("ready", function() {
                client.open("/foo/bar", "w", function(err, handle) {
                    assert(err, "Expected error");
                    assert.strictEqual(err.code, 4);
                    assert.strictEqual(err.message, "Uh oh");
                    assert.strictEqual(err.lang, "");
                    done();
                });
                client.write(new Buffer([
                    0, 0, 0, 18,
                    101,
                    0, 0, 0, 0,
                    0, 0, 0, SFTPStream.STATUS_CODE.FAILURE,
                    0, 0, 0, 5, 85, 104, 32, 111, 104
                ]));
            });
            client.write(new Buffer([
                0, 0, 0, 5,
                2,
                0, 0, 0, 3
            ]));
        });

        it("Can parse status response without message", function(done) {
            var client = new SFTPStream();
            client.once("ready", function() {
                client.open("/foo/bar", "w", function(err, handle) {
                    assert(err, "Expected error");
                    assert.strictEqual(err.code, 4);
                    assert.strictEqual(err.message, "Failure");
                    assert.strictEqual(err.lang, "");
                    done();
                });
                client.write(new Buffer([
                    0, 0, 0, 9,
                    101,
                    0, 0, 0, 0,
                    0, 0, 0, SFTPStream.STATUS_CODE.FAILURE
                ]));
            });
            client.write(new Buffer([
                0, 0, 0, 5,
                2,
                0, 0, 0, 3
            ]));
        });
    });
});

function setup(self, done, expected) {
    var expectedRequests = (expected && expected.requests) || 1;
    var expectedResponses = (expected && expected.responses) || 1;
    var clientEnded = false;
    var serverEnded = false;

    self.state = {
        clientReady: false,
        serverReady: false,
        requests: 0,
        responses: 0
    };

    self.client = new SFTPStream();
    self.server = new SFTPStream({
        server: true
    });

    self.server.on("error", onError)
        .on("ready", onReady)
        .on("end", onEnd);
    self.client.on("error", onError)
        .on("ready", onReady)
        .on("end", onEnd);

    function onError(err) {
        var which = (this === self.server ? "server" : "client");
        assert(false, "Unexpected " + which + " error: " + err);
    }

    function onReady() {
        if (this === self.client) {
            assert(!self.state.clientReady, "Received multiple ready events for client");
            self.state.clientReady = true;
        } else {
            assert(!self.state.serverReady, "Received multiple ready events for server");
            self.state.serverReady = true;
        }
        if (self.state.clientReady && self.state.serverReady)
            self.onReady && self.onReady();
    }

    function onEnd() {
        if (this === self.client) {
            assert(!clientEnded, "Received multiple close events for client");
            clientEnded = true;
        } else {
            assert(!serverEnded, "Received multiple close events for server");
            serverEnded = true;
        }
        if (clientEnded && serverEnded) {
            var msg;
            if (expectedRequests > 0) {
                msg = "Expected " + expectedRequests + " request(s) but received " +
                    self.state.requests;
                assert(self.state.requests === expectedRequests, msg);
            }
            if (expectedResponses > 0) {
                msg = "Expected " + expectedResponses + " response(s) but received " +
                    self.state.responses;
                assert(self.state.responses === expectedResponses, msg);
            }
            done();
        }
    }

    process.nextTick(function() {
        self.client.pipe(self.server).pipe(self.client);
    });
}

function flagsToHuman(flags) {
    var ret = [];

    for (var i = 0, keys = Object.keys(OPEN_MODE), len = keys.length; i < len; ++i)
        if (flags & OPEN_MODE[keys[i]])
            ret.push(keys[i]);

    return ret.join(" | ");
}
