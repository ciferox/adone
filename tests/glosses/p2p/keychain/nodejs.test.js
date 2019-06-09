const rimraf = require("rimraf");

const {
    async: { series },
    datastore: { backend: { FsDatastore } },
    std: { os, path }
} = adone;

describe("node", () => {
    const store1 = path.join(os.tmpdir(), "test-keystore-1");
    const store2 = path.join(os.tmpdir(), "test-keystore-2");
    const datastore1 = new FsDatastore(store1);
    const datastore2 = new FsDatastore(store2);

    before((done) => {
        series([
            (cb) => datastore1.open(cb),
            (cb) => datastore2.open(cb)
        ], done);
    });

    after((done) => {
        series([
            (cb) => datastore1.close(cb),
            (cb) => datastore2.close(cb),
            (cb) => rimraf(store1, cb),
            (cb) => rimraf(store2, cb)
        ], done);
    });

    require("./keychain")(datastore1, datastore2);
    require("./cms_interop")(datastore2);
    require("./peerid");
});
