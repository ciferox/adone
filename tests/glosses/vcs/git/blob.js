// var assert = require("assert");
// var path = require("path");
// var local = path.join.bind(path, __dirname);
// var promisify = require("promisify-node");
// var fse = promisify("fs-extra");
// var exec = require("../../utils/execPromise");


const {
    is,
    fs,
    std: { path },
    vcs: { git: { Oid, Blob, Signature, Reference, Repository, TreeEntry } }
} = adone;

const exec = adone.system.process.shell;
const local = path.join.bind(path, __dirname, "fixtures");

describe("Blob", () => {
    const FileMode = TreeEntry.FILEMODE;

    const reposPath = local("repos/workdir");
    const oid = "111dd657329797f6165f52f5085f61ac976dcf04";
    let previousCommitOid = "";

    const commitFile = (repo, fileName, fileContent, commitMessage) => {
        let index;
        let treeOid;
        let parent;

        return fs.writeFile(path.join(repo.workdir(), fileName), fileContent).then(() => {
            return repo.refreshIndex();
        }).then((indexResult) => {
            index = indexResult;
        }).then(() => {
            return index.addByPath(fileName);
        }).then(() => {
            return index.write();
        }).then(() => {
            return index.writeTree();
        }).then((oidResult) => {
            treeOid = oidResult;
            return Reference.nameToId(repo, "HEAD");
        }).then((head) => {
            return repo.getCommit(head);
        }).then((parentResult) => {
            parent = parentResult;
            return Promise.all([
                Signature.create("Foo Bar", "foo@bar.com", 123456789, 60),
                Signature.create("Foo A Bar", "foo@bar.com", 987654321, 90)
            ]);
        }).then((signatures) => {
            const author = signatures[0];
            const committer = signatures[1];

            return repo.createCommit("HEAD", author, committer, commitMessage, treeOid, [parent]);
        });
    };

    before(() => {
        return Repository.open(reposPath).then((repository) => {
            return repository.getHeadCommit();
        }).then((commit) => {
            previousCommitOid = commit.id();
        });
    });

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repository) => {
            test.repository = repository;

            return repository.getBlob(oid);
        }).then((blob) => {
            test.blob = blob;
        });
    });

    after(() => {
        return exec("git clean -xdf", { cwd: reposPath }).then(() => {
            return exec("git checkout master", { cwd: reposPath });
        }).then(() => {
            return exec(`git reset --hard ${previousCommitOid}`, { cwd: reposPath });
        });
    });

    it("can provide content as a buffer", function () {
        const contents = this.blob.content();

        assert.ok(is.buffer(contents));
    });

    it("can provide content as a string", function () {
        const contents = this.blob.toString();

        assert.equal(typeof contents, "string");
        assert.equal(contents.slice(0, 7), "@import");
    });

    it("can determine if a blob is not a binary", function () {
        assert.equal(this.blob.filemode(), FileMode.BLOB);
    });

    it("can get a blob with an Oid object", function () {
        const oidObject = Oid.fromString(oid);
        return this.repository.getBlob(oidObject).then((blob) => {
            assert.equal(blob.id().toString(), oid);
        });
    });

    describe("createFromBuffer", () => {
        it("creates a new blob from the buffer", function () {
            const content = "This is a new buffer";
            const buf = Buffer.from(content, content.length);
            const test = this;

            return Blob.createFromBuffer(test.repository, buf, content.length).then((oid) => {
                return test.repository.getBlob(oid);
            }).then((newBlob) => {
                assert.equal(newBlob.toString(), content);
            });
        });

        it("creates blob with content equal to length", function () {
            const content = "This is a new buffer";
            const buf = Buffer.from(content, content.length);
            const test = this;

            return Blob.createFromBuffer(test.repository, buf, 2).then((oid) => {
                return test.repository.getBlob(oid);
            }).then((newBlob) => {
                assert.equal(newBlob.toString(), "Th");
            });
        });

        it("throws an error when repository is null", () => {
            return Blob.createFromBuffer(null, null, 0).catch((error) => {
                assert.strictEqual(error.message, "Repository repo is required.");
            });
        });

        it("throws an error when buffer is null", function () {
            const test = this;
            return Blob.createFromBuffer(test.repository, null).catch((error) => {
                assert.strictEqual(error.message, "Buffer buffer is required.");
            });
        });

        it("throws an error when no length is provided", function () {
            const test = this;
            return Blob.createFromBuffer(test.repository, Buffer.from("testing")).catch((error) => {
                assert.strictEqual(error.message, "Number len is required.");
            });
        });
    });

    describe("createFromDisk", () => {
        const fileName = path.join(reposPath, "testFile.zzz");
        const fileContent = "this is my file content";

        beforeEach(() => {
            return fs.writeFile(fileName, fileContent);
        });

        afterEach(() => {
            return fs.unlink(fileName);
        });

        it("creates a new blob from the file", function () {
            const test = this;

            return Blob.createFromDisk(test.repository, fileName).then((oid) => {
                return test.repository.getBlob(oid);
            }).then((newBlob) => {
                assert.equal(newBlob.toString(), fileContent);
            });
        });

        it("throws an error when the file cannot be found", function () {
            const test = this;

            return Blob.createFromDisk(test.repository, "aaaaaaaaaa").catch((error) => {
                assert.equal(error.errno, -3);
            });
        });

        it("throws an error when repository is null", () => {
            return Blob.createFromDisk(null, null, 0).catch((error) => {
                assert.strictEqual(error.message, "Repository repo is required.");
            });
        });

        it("throws an error when path is null", function () {
            const test = this;
            return Blob.createFromDisk(test.repository, null).catch((error) => {
                assert.strictEqual(error.message, "String path is required.");
            });
        });
    });

    describe("createFromWorkdir", () => {
        it("creates a blob from the file", function () {
            const fileName = "package.json";
            const filePath = path.join(reposPath, "package.json");
            const test = this;

            return fs.readFile(filePath).then((content) => {
                test.content = content.toString();
                return Blob.createFromWorkdir(test.repository, fileName);
            }).then((oid) => {
                return test.repository.getBlob(oid);
            }).then((newBlob) => {
                assert.equal(newBlob.toString(), test.content);
            });
        });

        it("throws an error when the file cannot be found", function () {
            const test = this;

            return Blob.createFromWorkdir(test.repository, "thisisabadfile.jpg").catch((error) => {
                assert.equal(error.errno, -3);
            });
        });

        it("throws an error when repository is null", () => {
            return Blob.createFromWorkdir(null, null, 0).catch((error) => {
                assert.strictEqual(error.message, "Repository repo is required.");
            });
        });

        it("throws an error when path is null", function () {
            const test = this;
            return Blob.createFromWorkdir(test.repository, null).catch((error) => {
                assert
                    .strictEqual(error.message, "String relative_path is required.");
            });
        });
    });

    describe("filteredContent", () => {
        const attrFileName = ".gitattributes";
        const filter = "*    text eol=crlf";
        const lineEndingRegex = /\r\n|\r|\n/;
        const newFileName = "testfile.test";

        it("retrieves the filtered content", function () {
            const test = this;

            return commitFile(test.repository, attrFileName, filter, "added gitattributes").then(() => {
                return commitFile(test.repository, newFileName, "this\nis\nfun\guys", "added LF ending file");
            }).then((oid) => {
                return test.repository.getCommit(oid);
            }).then((commit) => {
                test.filteredCommit = commit;
                return commit.getEntry(newFileName);
            }).then((entry) => {
                return entry.getBlob();
            }).then((lfBlob) => {
                test.lfBlob = lfBlob;
                const ending = test.lfBlob.toString().match(lineEndingRegex);
                assert.strictEqual(ending[0], "\n");

                return Blob.filteredContent(
                    test.lfBlob,
                    newFileName,
                    0
                );
            }).then((content) => {
                const ending = content.match(lineEndingRegex);
                assert.strictEqual(ending[0], "\r\n");
                assert.notStrictEqual(content, test.blob.toString());
            });
        });

        it("returns non-binary filtered content when checking binary", function () {
            const test = this;

            return commitFile(test.repository, attrFileName, filter, "added gitattributes").then(() => {
                return commitFile(test.repository, newFileName, "this\nis\nfun\guys", "added LF ending file");
            }).then((oid) => {
                return test.repository.getCommit(oid);
            }).then((commit) => {
                test.filteredCommit = commit;
                return commit.getEntry(newFileName);
            }).then((entry) => {
                return entry.getBlob();
            }).then((lfBlob) => {
                test.lfBlob = lfBlob;
                const ending = test.lfBlob.toString().match(lineEndingRegex);
                assert.strictEqual(ending[0], "\n");

                return Blob.filteredContent(
                    test.lfBlob,
                    newFileName,
                    1
                );
            }).then((content) => {
                const ending = content.match(lineEndingRegex);
                assert.strictEqual(ending[0], "\r\n");
                assert.notStrictEqual(content, test.blob.toString());
            });
        });

        it("returns nothing when checking binary blob", function () {
            const test = this;
            const binary = Buffer.from(new Uint8Array([1, 2, 3, 4, 5, 6]));

            return commitFile(test.repository, attrFileName, filter, "added gitattributes").then(() => {
                return commitFile(test.repository, newFileName, binary, "binary content");
            }).then((oid) => {
                return test.repository.getCommit(oid);
            }).then((commit) => {
                test.filteredCommit = commit;
                return commit.getEntry(newFileName);
            }).then((entry) => {
                return entry.getBlob();
            }).then((binaryBlob) => {
                test.binaryBlob = binaryBlob;
                assert.equal(true, binaryBlob.isBinary());

                return Blob.filteredContent(
                    test.binaryBlob,
                    newFileName,
                    1
                );
            }).then((content) => {
                assert.strictEqual(content, "");
            });
        });

        it("returns blob when not checking binary on binary blob", function () {
            const test = this;
            const binary = Buffer.from(new Uint8Array([1, 2, 3, 4, 5, 6]));

            return commitFile(test.repository, attrFileName, filter, "added gitattributes").then(() => {
                return commitFile(test.repository, newFileName, binary, "binary content");
            }).then((oid) => {
                return test.repository.getCommit(oid);
            }).then((commit) => {
                test.filteredCommit = commit;
                return commit.getEntry(newFileName);
            }).then((entry) => {
                return entry.getBlob();
            }).then((binaryBlob) => {
                test.binaryBlob = binaryBlob;
                assert.equal(true, binaryBlob.isBinary());

                return Blob.filteredContent(test.binaryBlob, newFileName, 0);
            }).then((content) => {
                assert.strictEqual(content, binary.toString());
            });
        });

        it("throws an error when the blob is null", () => {
            return Blob.filteredContent(null, "", 0).catch((err) => {
                assert.strictEqual(
                    err.message,
                    "Blob blob is required."
                );
            });
        });

        it("throws an error when the path is null", function () {
            const test = this;
            return Blob.filteredContent(test.blob, null, 0).catch((err) => {
                assert.strictEqual(err.message, "String as_path is required.");
            });
        });

        it("throws an error when the flag is undefined", function () {
            const test = this;
            return Blob.filteredContent(test.blob, "").catch((err) => {
                assert.strictEqual(
                    err.message,
                    "Number check_for_binary_data is required."
                );
            });
        });
    });
});
