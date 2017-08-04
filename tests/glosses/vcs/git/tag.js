const {
    std: { path },
    vcs: { git: { Repository, Tag, Object: Obj, Oid, Reference, Signature } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Tag", () => {
    const reposPath = local("repos/workdir");
    const tagName = "annotated-tag";
    const tagFullName = `refs/tags/${tagName}`;
    const tagOid = "dc800017566123ff3c746b37284a24a66546667e";
    const commitPointedTo = "32789a79e71fbc9e04d3eff7425e1771eb595150";
    const commitPointedTo2 = "c82fb078a192ea221c9f1093c64321c60d64aa0d";
    const tagMessage = "This is an annotated tag\n";

    const testTag = (tag, name) => {
        assert.equal(tag.name(), name || tagName);
        assert.equal(tag.targetType(), Obj.TYPE.COMMIT);
        assert.equal(tag.message(), tagMessage);

        const target = tag.target();

        assert.ok(target.isCommit());
        assert.equal(target.id().toString(), commitPointedTo);
    };

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repo) => {
            test.repository = repo;
        });
    });

    it("can get a tag from a repo via the tag name", function () {
        return this.repository.getTagByName(tagName).then((tag) => {
            testTag(tag);
        });
    });

    it("can get a tag from a repo via the long tag name", function () {
        return this.repository.getTagByName(tagFullName).then((tag) => {
            testTag(tag);
        });
    });

    it("can get a tag from a repo via the tag's OID as a string", function () {
        return this.repository.getTag(tagOid).then((tag) => {
            testTag(tag);
        });
    });

    it("can get a tag from a repo via the tag's OID object", function () {
        const oid = Oid.fromString(tagOid);

        return this.repository.getTag(oid).then((tag) => {
            testTag(tag);
        });
    });

    it("can list tags in a repo", function () {
        return Tag.list(this.repository).then((tagNames) => {
            tagNames = tagNames.filter((tagNameTest) => {
                return tagNameTest === tagName;
            });

            assert.equal(tagNames.length, 1);
        });
    });

    it("can create a new annotated tag in a repo and delete it", function () {
        const oid = Oid.fromString(commitPointedTo);
        const name = "created-annotated-tag";
        const repository = this.repository;

        return repository.createTag(oid, name, tagMessage).then((tag) => {
            testTag(tag, name);
        }).then(() => {
            return repository.createTag(oid, name, tagMessage);
        }).then(() => {
            return Promise.reject(new Error(`should not be able to create the '${
                name}' tag twice`));
        }, () => {
            return Promise.resolve();
        }).then(() => {
            return repository.deleteTagByName(name);
        }).then(() => {
            return Reference.lookup(repository, `refs/tags/${name}`);
        }).then(() => {
            return Promise.reject(new Error(`the tag '${name}' should not exist`));
        }, () => {
            return Promise.resolve();
        });
    });

    it("can create a new lightweight tag in a repo and delete it", function () {
        const oid = Oid.fromString(commitPointedTo);
        const name = "created-lightweight-tag";
        const repository = this.repository;

        return repository.createLightweightTag(oid, name).then((reference) => {
            return reference.target();
        }).then((refOid) => {
            assert.equal(refOid.toString(), oid.toString());
        }).then(() => {
            return repository.createLightweightTag(oid, name);
        }).then(() => {
            return Promise.reject(new Error(`should not be able to create the '${name}' tag twice`));
        }, () => {
            return Promise.resolve();
        }).then(() => {
            return repository.deleteTagByName(name);
        }).then(() => {
            return Reference.lookup(repository, `refs/tags/${name}`);
        }).then(() => {
            return Promise.reject(new Error(`the tag '${name}' should not exist`));
        }, () => {
            return Promise.resolve();
        });
    });

    it("can create a new signed tag with Tag.create and delete it", function () {
        const name = "created-signed-tag-create";
        const repository = this.repository;
        const signature = Signature.default(repository);
        let commit = null;
        let commit2 = null;

        return repository.getCommit(commitPointedTo).then((theCommit) => {
            commit = theCommit;
            return repository.getCommit(commitPointedTo2);
        }).then((theCommit2) => {
            commit2 = theCommit2;
            return Tag.create(repository, name, commit, signature, tagMessage, 1);
        }).then((oid) => {
            return repository.getTag(oid);
        }).then((tag) => {
            testTag(tag, name);
            assert(tag.tagger(), signature);
        }).then(() => {
            // overwriting is okay
            return Tag.create(repository, name, commit2, signature, tagMessage, 1);
        }).then(() => {
            // overwriting is not okay
            return Tag.create(repository, name, commit, signature, tagMessage, 0);
        }).then(() => {
            return Promise.reject(new Error(`should not be able to create the '${
                name}' tag twice`));
        }, () => {
            return Promise.resolve().then(() => {
                return repository.deleteTagByName(name);
            }).then(() => {
                return Reference.lookup(repository, `refs/tags/${name}`);
            }).then(() => {
                return Promise.reject(new Error(`the tag '${name}' should not exist`));
            }, () => {
                return Promise.resolve();
            });
        });
    });

    it("can create a new signed tag with Tag.annotationCreate", function () {
        const oid = Oid.fromString(commitPointedTo);
        const name = "created-signed-tag-annotationCreate";
        const repository = this.repository;
        const signature = Signature.default(repository);
        let odb = null;

        return repository.odb().then((theOdb) => {
            odb = theOdb;
        }).then(() => {
            return Tag.annotationCreate(repository, name, oid, signature, tagMessage);
        }).then((oid) => {
            return odb.read(oid);
        }).then((object) => {
            assert(object.type(), Obj.TYPE.TAG);
        });
    });
});
