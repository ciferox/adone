import * as util from "./utils";

describe("database", "pouch", "issue221", () => {
    const dbName = "testdb";
    const dbRemote = "test_repl_remote";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName, dbRemote);
    });

    after(async () => {
        await util.destroy();
    });

    it("Testing issue #221", () => {
        const doc = { _id: "0", integer: 0 };
        const local = new DB(dbName);
        const remote = new DB(dbRemote);

        // Write a doc in CouchDB.
        return remote.put(doc).then((results) => {
            // Update the doc.
            doc._rev = results.rev;
            doc.integer = 1;
            return remote.put(doc);
        }).then(() => {
            // Compact the db.
            return remote.compact();
        }).then(() => {
            return remote.get(doc._id, { revs_info: true });
        }).then((data) => {
            const correctRev = data._revs_info[0];
            return local.replicate.from(remote).then(() => {
                // Check the Pouch doc.
                return local.get(doc._id, (err, results) => {
                    assert.equal(results._rev, correctRev.rev);
                    assert.equal(results.integer, 1);
                });
            });
        });
    });

    it("Testing issue #221 again", () => {
        const doc = { _id: "0", integer: 0 };
        const local = new DB(dbName);
        const remote = new DB(dbRemote);

        // Write a doc in CouchDB.
        return remote.put(doc).then((results) => {
            doc._rev = results.rev;
            // Second doc so we get 2 revisions from replicate.
            return remote.put(doc);
        }).then((results) => {
            doc._rev = results.rev;
            return local.replicate.from(remote);
        }).then(() => {
            doc.integer = 1;
            // One more change
            return remote.put(doc);
        }).then(() => {
            // Testing if second replications fails now
            return local.replicate.from(remote);
        }).then(() => {
            return local.get(doc._id);
        }).then((results) => {
            assert.equal(results.integer, 1);
        });
    });
});
