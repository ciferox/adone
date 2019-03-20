const {
    stream: { pull },
    std: { fs, path }
} = adone;
const { traverse } = pull;

const start = path.resolve(__dirname, "..");

const ls_r = function (start, type) {
    type = type || traverse.depthFirst;
    return type(start, (dir) => {
        const def = pull.defer();
        fs.readdir(dir, (err, ls) => {
            if (err) {
                return def.abort(err.code === "ENOTDIR" ? true : err);
            }

            def.resolve(
                pull.values(ls || [])
                    .pipe(pull.map((file) => {
                        return path.resolve(dir, file);
                    }))
            );
        });

        return def;
    });
};

describe.todo("stream", "pull", "traverse", () => {
    it("widthFirst", (done) => {
        let max = 0; let didStart;

        pull(
            ls_r(start, traverse.widthFirst),
            pull.map((file) => {
                if (file === start) {
                    didStart = true;
                }
                return file.split("/").length;
            }),
            pull.filter((d) => {
                assert.ok(d >= max);
                if (d > max) {
                    return max = d, true;
                }
            }),
            pull.through(console.log),
            pull.drain(null, () => {
                assert.ok(didStart);
                done();
            })
        );
    });

    it("depthFirst", (done) => {
        const seen = {};
        //assert that for each item,
        //you have seen the dir already
        pull(
            ls_r(start, traverse.depthFirst),
            pull.through((file) => {
                if (file != start) {
                    const dir = path.dirname(file);
                    assert.ok(seen[dir]);
                }
                //console.log(dir)
                seen[file] = true;
            }),
            pull.onEnd(() => {
                done();
            })
        );

    });

    it("leafFirst", (done) => {
        const seen = {};
        const expected = {};
        expected[start] = true;
        //assert that for each item,
        //you have seen the dir already
        pull(
            ls_r(start, traverse.leafFirst),
            pull.through((file) => {
                if (file !== start) {
                    const dir = path.dirname(file);
                    assert.ok(!seen[dir]);
                    expected[dir] = true;
                }
                if (expected[file]) {
                    delete expected[file];
                }
            }),
            pull.drain(null, () => {
                for (const k in expected) {
                    assert.ok(false, k);
                }
                done();
            })
        );
    });

    describe("error", () => {
        const start = path.resolve(__dirname, "..");

        const ls_error = function (start, type, err) {
            let i = 0;
            type = type || traverse.depthFirst;
            return type(start, (dir) => {
                const def = pull.defer();
                if (++i === 10) {
                    return function (_, cb) {
                        cb(err);
                    };
                }
                fs.readdir(dir, (err, ls) => {
                    if (err) {
                        return def.abort(err.code === "ENOTDIR" ? true : err);
                    }

                    def.resolve(
                        pull.values(ls || [])
                            .pipe(pull.map((file) => {
                                return path.resolve(dir, file);
                            }))
                    );
                });

                return def;
            });
        };

        it("depthFirst - error", (done) => {
            const seen = {}; const err = new Error("test error"); const i = 0;
            //assert that for each item,
            //you have seen the dir already
            pull(
                ls_error(start, traverse.depthFirst, err),
                pull.drain(null, (_err) => {
                    assert.equal(_err, err);
                    done();
                })
            );

        });
    });
});
