const {
    std: { path },
    vcs: { git: { Repository, Object: Obj, Oid } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Odb", () => {
    const reposPath = local("repos/workdir");

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repo) => {
            test.repo = repo;

            return repo;
        }).then((repo) => {
            return repo.odb();
        }).then((odb) => {
            test.odb = odb;

            return odb;
        });
    });

    it("can read raw objects directly from the odb using an OID", function () {
        const oid = Oid.fromString("32789a79e71fbc9e04d3eff7425e1771eb595150");
        return this.odb.read(oid).then((object) => {
            assert.equal(object.type(), Obj.TYPE.COMMIT);
        });
    });

    it("can read objects directly from the odb using a string", function () {
        return this.odb.read("32789a79e71fbc9e04d3eff7425e1771eb595150").then((object) => {
            assert.equal(object.type(), Obj.TYPE.COMMIT);
        });
    });

    it("can write raw objects to git", function () {
        const obj = "test data";
        const odb = this.odb;

        return odb.write(obj, obj.length, Obj.TYPE.BLOB).then((oid) => {
            assert.ok(oid instanceof Oid);

            return odb.read(oid);
        }).then((object) => {
            assert.equal(object.type(), Obj.TYPE.BLOB);
            assert.equal(object.toString(), obj);
            assert.equal(object.size(), obj.length);
        });
    });
});
