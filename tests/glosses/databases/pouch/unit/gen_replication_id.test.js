const memdown = require("memdown");
const PouchDB = adone.database.pouch.coverage.DB;
const genReplicationId = PouchDB.utils.generateReplicationId;
const sourceDb = new PouchDB({ name: "local_db", db: memdown });
const targetDb = new PouchDB({ name: "target_db", db: memdown });

describe("db", "pouch", "gen-replication-id", () => {
    it("is different with different `doc_ids` option", () => {
        const opts2 = { doc_ids: ["1"] };
        const opts1 = { doc_ids: ["2"] };

        return genReplicationId(sourceDb, targetDb, opts1).then(
            (replicationId1) => {
                return genReplicationId(sourceDb, targetDb, opts2).then(
                    (replicationId2) => {
                        assert.notEqual(replicationId2, replicationId1);
                    }
                );
            }
        );
    });

    it("ignores the order of array elements in the `doc_ids` option",
        () => {
            const opts1 = { doc_ids: ["1", "2", "3"] };
            const opts2 = { doc_ids: ["3", "2", "1"] };

            return genReplicationId(sourceDb, targetDb, opts1).then(
                (replicationId1) => {
                    return genReplicationId(sourceDb, targetDb, opts2).then(
                        (replicationId2) => {
                            assert.equal(replicationId2, replicationId1);
                        }
                    );
                }
            );
        }
    );

    it("is different with different `filter` option", () => {
        const opts1 = { filter: "ddoc/filter" };
        const opts2 = { filter: "ddoc/other_filter" };

        return genReplicationId(sourceDb, targetDb, opts1).then(
            (replicationId1) => {
                return genReplicationId(sourceDb, targetDb, opts2).then(
                    (replicationId2) => {
                        assert.notEqual(replicationId2, replicationId1);
                    }
                );
            }
        );
    });

    it("ignores the `query_params` option if there's no `filter` option",
        () => {
            const opts1 = { query_params: { foo: "bar" } };
            const opts2 = { query_params: { bar: "baz" } };

            return genReplicationId(sourceDb, targetDb, opts1).then(
                (replicationId1) => {
                    return genReplicationId(sourceDb, targetDb, opts2).then(
                        (replicationId2) => {
                            assert.equal(replicationId2, replicationId1);
                        }
                    );
                }
            );
        }
    );

    it("is different with same `filter` but different `query_params` option",
        () => {
            const opts1 = { filter: "ddoc/filter", query_params: { foo: "bar" } };
            const opts2 = { filter: "ddoc/other_filter" };

            return genReplicationId(sourceDb, targetDb, opts1).then(
                (replicationId1) => {
                    return genReplicationId(sourceDb, targetDb, opts2).then(
                        (replicationId2) => {
                            assert.notEqual(replicationId2, replicationId1);
                        }
                    );
                }
            );
        }
    );

    it("ignores the order of object properties in the `query_params` option",
        () => {
            const opts1 = {
                filter: "ddoc/filter",
                query_params: { foo: "bar", bar: "baz" }
            };
            const opts2 = {
                filter: "ddoc/filter",
                query_params: { bar: "baz", foo: "bar" }
            };

            return genReplicationId(sourceDb, targetDb, opts1).then(
                (replicationId1) => {
                    return genReplicationId(sourceDb, targetDb, opts2).then(
                        (replicationId2) => {
                            assert.equal(replicationId2, replicationId1);
                        }
                    );
                }
            );
        }
    );

    it("it ignores the `view` option unless the `filter` option value is `_view`", () => {
        const opts1 = { view: "ddoc/view" };
        const opts2 = { view: "ddoc/other_view" };
        const opts3 = { filter: "ddoc/view", view: "ddoc/view" };
        const opts4 = { filter: "ddoc/view", view: "ddoc/other_view" };
        const opts5 = { filter: "_view", view: "ddoc/other_view" };
        const opts6 = { filter: "_view", view: "ddoc/view" };

        return genReplicationId(sourceDb, targetDb, opts1).then(
            (replicationId1) => {
                return genReplicationId(sourceDb, targetDb, opts2).then(
                    (replicationId2) => {
                        assert.equal(replicationId2, replicationId1);
                        return replicationId2;
                    }
                );
            }
        ).then((replicationId2) => {
            return genReplicationId(sourceDb, targetDb, opts3).then(
                (replicationId3) => {
                    assert.notEqual(replicationId3, replicationId2);

                    return genReplicationId(sourceDb, targetDb, opts4).then(
                        (replicationId4) => {
                            assert.equal(replicationId4, replicationId3);
                            return replicationId4;
                        }
                    );
                }
            );
        }).then((replicationId4) => {
            return genReplicationId(sourceDb, targetDb, opts5).then(
                (replicationId5) => {
                    assert.notEqual(replicationId5, replicationId4);

                    return genReplicationId(sourceDb, targetDb, opts6).then(
                        (replicationId6) => {
                            assert.notEqual(replicationId6, replicationId5);
                        }
                    );
                }
            );
        });
    }
    );
});
