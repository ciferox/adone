const {
    is,
    fs,
    datastore: { Key, backend: { Level }, wrapper: { Mount } }
} = adone;

const tmpdir = () => adone.fs.tmpName({
    prefix: "",
    nameGenerator: adone.util.uuid.v4
});


describe("datastore", "backend", "LevelDatastore", () => {
    describe("interface (memory)", () => {
        require("../../interface")({
            async setup() {
                const ds = new Level({
                    db: adone.database.level.backend.Memory
                });

                await ds.open();
                return ds;
            },
            teardown() {
            }
        });
    });

    describe("interface (leveldb)", () => {
        let dir;
        require("../../interface")({
            async setup() {
                if (is.undefined(dir)) {
                    dir = await tmpdir();
                }
                const ds = new Level({
                    location: dir
                });
                await ds.open();
                return ds;
            },
            async teardown() {
                await fs.rm(dir);
            }
        });
    });

    describe("interface (mount(leveldown, leveldown, leveldown))", () => {
        const dirs = [];

        require("../../interface")({
            async setup() {
                if (dirs.length === 0) {
                    dirs.push(await tmpdir(), await tmpdir(), await tmpdir());
                }
                const ds = new Mount([{
                    prefix: new Key("/a"),
                    datastore: new Level({
                        location: dirs[0]
                    })
                }, {
                    prefix: new Key("/q"),
                    datastore: new Level({
                        location: dirs[1]
                    })
                }, {
                    prefix: new Key("/z"),
                    datastore: new Level({
                        location: dirs[2]
                    })
                }]);

                await ds.open();
                return ds;
            },
            async teardown() {
                for (const dir of dirs) {
                    await fs.rm(dir); // eslint-disable-line
                }
            }
        });
    });
});
