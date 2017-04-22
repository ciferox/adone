import mongodbVersionManager from "mongodb-version-manager";
import { sharded, replicaset, single } from "./topology";

const { promise: { promisify } } = adone;

describe("glosses", "databases", "mongo", "CRUD API", () => {
    before("mondodb check", async () => {
        const version = await promisify(mongodbVersionManager.current)();
        adone.info(`Running tests against MongoDB version ${version}`);
    });

    for (const topology of [
        "single",
        "sharded",
        "replicaset"
    ]) {
        describe(topology, function () {
            this.topology = topology;
            this.tmpdir = null;
            this.server = null;
            this.DB = null;
            this.db = null;

            before("create tmpdir", async () => {
                this.tmpdir = await adone.fs.Directory.createTmp();
            });

            after("unlink tmpdir", async () => {
                await this.tmpdir.unlink();
            });

            switch (topology) {
                case "single": {
                    single();
                    break;
                }
                case "sharded": {
                    sharded();
                    break;
                }
                case "replicaset": {
                    replicaset();
                    break;
                }
            }

            beforeEach("open connection", async () => {
                this.db = await this.DB.open();
            });

            afterEach("close connection", async () => {
                if (this.db) {
                    await this.db.close();
                    this.db = null;
                }
            });

            include("./crud_api");
            include("./crud");
        });
    }
});
