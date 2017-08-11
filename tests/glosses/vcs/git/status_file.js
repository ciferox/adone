const {
    vcs: { git: { StatusFile, Status } }
} = adone;

describe("StatusFile", () => {
    const pathName = "README.md";

    const testStatusFile = (status) => {
        const statusFile = new StatusFile({
            path: pathName,
            status: Status.STATUS[status]
        });
        let specialFunction = status.replace(/^(WT|INDEX)_/, "");
        specialFunction = `is${specialFunction[0]}${specialFunction.substring(1).toLowerCase()}`;
        if (/^WT_/.test(status)) {
            assert.ok(statusFile.inWorkingTree());
            assert.ok(!statusFile.inIndex());
        }
        if (/^INDEX_/.test(status)) {
            assert.ok(!statusFile.inWorkingTree());
            assert.ok(statusFile.inIndex());
        }
        assert.equal(statusFile.path(), pathName);
        assert.equal(statusFile.statusBit(), Status.STATUS[status]);
        assert.equal(statusFile.status(), status);
        assert.ok(statusFile[specialFunction]());
    };

    it.skip("identifies the proper statuses for CURRENT", () => {
        testStatusFile("CURRENT");
    });

    it.skip("identifies the proper statuses for WT_UNREADABLE", () => {
        testStatusFile("WT_UNREADABLE");
    });

    it("identifies the proper statuses for WT_NEW", () => {
        testStatusFile("WT_NEW");
    });

    it("identifies the proper statuses for WT_MODIFIED", () => {
        testStatusFile("WT_MODIFIED");
    });

    it("identifies the proper statuses for WT_DELETED", () => {
        testStatusFile("WT_DELETED");
    });

    it("identifies the proper statuses for WT_TYPECHANGE", () => {
        testStatusFile("WT_TYPECHANGE");
    });

    it("identifies the proper statuses for WT_RENAMED", () => {
        testStatusFile("WT_RENAMED");
    });

    it("identifies the proper statuses for IGNORED", () => {
        testStatusFile("IGNORED");
    });

    it("identifies the proper statuses for INDEX_NEW", () => {
        testStatusFile("INDEX_NEW");
    });

    it("identifies the proper statuses for INDEX_MODIFIED", () => {
        testStatusFile("INDEX_MODIFIED");
    });

    it("identifies the proper statuses for INDEX_DELETED", () => {
        testStatusFile("INDEX_DELETED");
    });

    it("identifies the proper statuses for INDEX_TYPECHANGE", () => {
        testStatusFile("INDEX_TYPECHANGE");
    });

    it("identifies the proper statuses for INDEX_RENAMED", () => {
        testStatusFile("INDEX_RENAMED");
    });
});
