const {
    is,
    error,
    fs,
    nodejs,
    path
} = adone;

describe("nodejs", () => {
    const platform = nodejs.getCurrentPlatform();
    const arch = nodejs.getCurrentArch();
    const defaultExt = nodejs.DEFAULT_EXT;

    it("getExePath() should return correct path", async () => {
        const nodePath = await nodejs.getExePath();
        assert.equal(nodePath, process.execPath);
    });

    describe("getAchiveName()", () => {
        it("call without version should have thrown", async () => {
            await assert.throws(async () => nodejs.getArchiveName(), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({}), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: undefined }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: null }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "10" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "11.1" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "v11" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "v10.1" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "v12.12." }), error.NotvalidException);
        });

        it("call with default parameters", async () => {
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0" }), `node-v11.13.0-${platform}-${arch}${defaultExt}`);
        });

        it("call with specified ext", async () => {
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", platform: "linux", ext: ".tar.xz" }), `node-v11.13.0-linux-${arch}.tar.xz`);
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", platform: "linux", ext: ".tar.gz" }), `node-v11.13.0-linux-${arch}.tar.gz`);
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", platform: "win", ext: ".7z" }), `node-v11.13.0-win-${arch}.7z`);
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", platform: "win", ext: ".zip" }), `node-v11.13.0-win-${arch}.zip`);
        });

        it("call with incorrect ext should have throws", async () => {
            await assert.throws(async () => nodejs.getArchiveName({ version: "v11.13.0", platform: "win", ext: ".tag.gz" }), error.NotValidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "v11.13.0", platform: "win", ext: ".tag.xz" }), error.NotValidException);

            await assert.throws(async () => nodejs.getArchiveName({ version: "v11.13.0", platform: "linux", ext: ".7z" }), error.NotValidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "v11.13.0", platform: "linux", ext: ".zip" }), error.NotValidException);
        });

        it("call with arch parameter", async () => {
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", arch: "x64" }), `node-v11.13.0-${platform}-x64${defaultExt}`);
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", arch: "x32" }), `node-v11.13.0-${platform}-x32${defaultExt}`);
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", arch: "arm64" }), `node-v11.13.0-${platform}-arm64${defaultExt}`);
        });

        it("get archive name of sources", async () => {
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", type: "sources" }), `node-v11.13.0${defaultExt}`);
        });

        it("get archive name of headers", async () => {
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", type: "headers" }), `node-v11.13.0-headers${defaultExt}`);
        });

        it("get archive name of headers with omitted suffix", async () => {
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", type: "headers", omitSuffix: true }), `node-v11.13.0${defaultExt}`);
        });

        it("get archive name without ext", async () => {
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", ext: "" }), `node-v11.13.0-${platform}-${arch}`);
        });

        it("get archive name without platform", async () => {
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", ext: ".tar.gz", platform: "" }), `node-v11.13.0-${arch}.tar.gz`);
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", ext: "", platform: "" }), `node-v11.13.0-${arch}`);
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", platform: "" }), `node-v11.13.0-${arch}${defaultExt}`);
        });

        it("get archive name without arch", async () => {
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", ext: ".tar.gz", arch: "" }), `node-v11.13.0-${platform}.tar.gz`);
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", ext: "", arch: "", platform: "" }), "node-v11.13.0");
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", arch: "" }), `node-v11.13.0-${platform}${defaultExt}`);
            assert.equal(await nodejs.getArchiveName({ version: "v11.13.0", ext: "", arch: "" }), `node-v11.13.0-${platform}`);
        });
    });

    describe("getSHASUMS()", () => {
        it("throw if version is not valid", async () => {
            await assert.throws(async () => nodejs.getSHASUMS(), error.NotvalidException);
            await assert.throws(async () => nodejs.getSHASUMS({}), error.NotvalidException);
            await assert.throws(async () => nodejs.getSHASUMS({ version: undefined }), error.NotvalidException);
            await assert.throws(async () => nodejs.getSHASUMS({ version: null }), error.NotvalidException);
            await assert.throws(async () => nodejs.getSHASUMS({ version: "" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getSHASUMS({ version: "10" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getSHASUMS({ version: "11.1" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getSHASUMS({ version: "v11" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getSHASUMS({ version: "v10.1" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getSHASUMS({ version: "v12.12." }), error.NotvalidException);
        });

        it("get sha sums as utf8-string", async () => {
            const version = "12.0.0";
            const sums = await nodejs.getSHASUMS({ version });
            assert.isString(sums);
            assert.isTrue(sums.includes(await nodejs.getArchiveName({ version })));
        });

        it("get sha sums as object", async () => {
            const version = "11.0.0";
            const sums = await nodejs.getSHASUMS({ version, type: "object" });
            // console.log(adone.inspect(sums));
            assert.isTrue(is.plainObject(sums));
            assert.isTrue((await nodejs.getArchiveName({ version })) in sums);
        });

        it("get sha sums as array", async () => {
            const version = "11.0.0";
            const sums = await nodejs.getSHASUMS({ version, type: "array" });
            assert.isTrue(is.array(sums));
            const name = await nodejs.getArchiveName({ version });
            assert.isTrue(sums.findIndex((i) => i.name === name) > 0);
        });

        it("get sha sums as buffer", async () => {
            const version = "11.0.0";
            const sums = await nodejs.getSHASUMS({ version, type: "buffer" });
            assert.isTrue(is.buffer(sums));
            assert.isTrue(sums.includes(await nodejs.getArchiveName({ version })));
        });
    });

    describe("NodejsManager", () => {
        const tmpPaths = [];

        const createTmpPath = async () => {
            const tmpPath = await fs.tmpName();
            tmpPaths.push(tmpPath);
            return tmpPath;
        };

        const createManager = async (cache = {}) => {
            cache.basePath = cache.basePath || await createTmpPath();
            return new nodejs.NodejsManager({
                cache
            });
        };

        afterEach(async () => {
            for (const p of tmpPaths) {
                // eslint-disable-next-line no-await-in-loop
                await fs.remove(p);
            }
        });

        it("defaults", () => {
            const nm = new nodejs.NodejsManager();

            assert.deepEqual(adone.util.pick(nm.cache, ["basePath", "downloads", "release", "sources", "headers"]), {
                basePath: adone.getPath("var", "nodejs"),
                downloads: "downloads",
                release: "releases",
                sources: "sources",
                headers: "headers"
            });
        });

        it("custom base path", async () => {
            const basePath = await createTmpPath();
            const nm = await createManager({ basePath });

            assert.deepEqual(adone.util.pick(nm.cache, ["basePath", "downloads", "release", "sources", "headers"]), {
                basePath: path.join(basePath, "nodejs"),
                downloads: "downloads",
                release: "releases",
                sources: "sources",
                headers: "headers"
            });
        });

        it("custom cache dirs", async () => {
            const nm = await createManager({
                downloads: "archives",
                release: "rel",
                sources: "srcs",
                headers: "hdrs"
            });

            assert.equal(nm.cache.downloads, "archives");
            assert.equal(nm.cache.release, "rel");
            assert.equal(nm.cache.sources, "srcs");
            assert.equal(nm.cache.headers, "hdrs");
        });

        it("getCachePath() without parameters should returl base path", async () => {
            const nm = await createManager();

            assert.equal(await nm.getCachePath(), nm.cache.basePath);
        });

        it("getCachePath() should create all sub directories", async () => {
            const nm = await createManager();

            let p = await nm.getCachePath(nm.cache.downloads);
            assert.equal(p, path.join(nm.cache.basePath, nm.cache.downloads));
            assert.isTrue(await fs.isDirectory(p));

            p = await nm.getCachePath("some", "nested", "dir");
            assert.equal(p, path.join(nm.cache.basePath, "some", "nested", "dir"));
            assert.isTrue(await fs.isDirectory(p));
        });

        it("getCachePath() should create all sub directories", async () => {
            const nm = await createManager();
            let p = await nm.getCachePath(nm.cache.downloads);
            assert.equal(p, path.join(nm.cache.basePath, nm.cache.downloads));
            assert.isTrue(await fs.isDirectory(p));

            p = await nm.getCachePath(nm.cache.release);
            assert.equal(p, path.join(nm.cache.basePath, nm.cache.release));
            assert.isTrue(await fs.isDirectory(p));
        });

        describe("download", function () {
            this.timeout(100 * 1000);
            it("by default should download latest release for current system", async () => {
                const nm = await createManager();

                const version = await nodejs.checkVersion("latest");
                const result = await nm.download();

                assert.equal(result.downloaded, true);
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.downloads, { version, ext: "", platform: "", arch: "" }), await nodejs.getArchiveName({ version }));
                assert.equal(result.path, archivePath);
                assert.isTrue(await fs.isFile(archivePath));
            });

            it("download release for specified version", async () => {
                const nm = await createManager();

                const version = "v10.0.0";
                const result = await nm.download({ version });

                assert.equal(result.downloaded, true);
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.downloads, { version, ext: "", platform: "", arch: "" }), await nodejs.getArchiveName({ version }));
                assert.equal(result.path, archivePath);
                assert.isTrue(await fs.isFile(archivePath));
            });

            it("download release for specified platform and ext", async () => {
                const nm = await createManager();

                const version = await nodejs.checkVersion("latest");
                const ext = ".7z";
                const platform = "win";
                const result = await nm.download({ platform, ext });

                assert.equal(result.downloaded, true);
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.downloads, { version, ext: "", platform: "", arch: "" }), await nodejs.getArchiveName({ version, platform, ext }));
                assert.equal(result.path, archivePath);
                assert.isTrue(await fs.isFile(archivePath));
            });

            it("download release for specified platform, arch and ext", async () => {
                const nm = await createManager();

                const version = await nodejs.checkVersion("latest");
                const ext = ".7z";
                const arch = "x86";
                const platform = "win";
                const result = await nm.download({ platform, arch, ext });

                assert.equal(result.downloaded, true);
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.downloads, { version, ext: "", platform: "", arch: "" }), await nodejs.getArchiveName({ version, platform, arch, ext }));
                assert.equal(result.path, archivePath);
                assert.isTrue(await fs.isFile(archivePath));
            });

            it("download sources", async () => {
                const nm = await createManager();

                const version = await nodejs.checkVersion("latest");
                const type = "sources";
                const result = await nm.download({ version, type });

                assert.equal(result.downloaded, true);
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.downloads, { version, ext: "", platform: "", arch: "" }), await nodejs.getArchiveName({ version, type }));
                assert.equal(result.path, archivePath);
                assert.isTrue(await fs.isFile(archivePath));
            });

            it("download headers", async () => {
                const nm = await createManager();

                const version = await nodejs.checkVersion("latest");
                const type = "headers";
                const ext = ".tar.gz";
                const result = await nm.download({ version, type, ext });

                assert.equal(result.downloaded, true);
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.downloads, { version, ext: "", platform: "", arch: "" }), await nodejs.getArchiveName({ version, type, ext }));
                assert.equal(result.path, archivePath);
                assert.isTrue(await fs.isFile(archivePath));
            });

            it("download with hashsum calculating", async () => {
                const nm = await createManager();

                const version = await nodejs.checkVersion("latest");
                const type = "headers";
                const ext = ".tar.gz";
                const result = await nm.download({ version, type, ext, hash: "sha256" });

                const sums = await nodejs.getSHASUMS({ version, type: "object" });

                assert.equal(sums[await nodejs.getArchiveName({ version, type, ext })], result.hashsum);
            });
        });

        describe("extract", () => {
            const cases = [
                {
                    platform: "win",
                    ext: ".zip"
                },
                {
                    platform: "win",
                    ext: ".zip",
                    strip: true
                },
                {
                    platform: "linux",
                    ext: ".tar.gz"
                },
                {
                    platform: "linux",
                    ext: ".tar.gz",
                    strip: true
                },
                {
                    platform: "linux",
                    ext: ".tar.xz"
                },
                {
                    platform: "linux",
                    ext: ".tar.xz",
                    strip: true
                },
                {
                    type: "sources",
                    ext: ".tar.gz"
                },
                {
                    type: "sources",
                    ext: ".tar.xz",
                    strip: true
                },
                {
                    type: "headers",
                    ext: ".tar.gz"
                },
                {
                    type: "headers",
                    ext: ".tar.xz",
                    strip: true
                }
            ];

            for (const c of cases) {
                // eslint-disable-next-line no-loop-func
                it(adone.inspect(c, { style: "inline", minimal: true }), async () => {
                    const nm = await createManager();

                    const version = await nodejs.checkVersion("latest");
                    await nm.download({ version, ...c });
                    const destPath = await nm.extract({ version, ...c });

                    let archivePath;
                    if (c.strip) {
                        archivePath = await nm.getCachePath(nm.cache[c.type || "release"]);
                    } else {
                        archivePath = await nm.getCachePathFor(nm.cache[c.type || "release"], { version, ...c, omitSuffix: true, ext: "" });
                    }
                    assert.equal(destPath, archivePath);
                    assert.isTrue(await fs.isDirectory(destPath));
                    assert.sameMembers(await fs.readdir(destPath), await fs.readdir(archivePath));
                });
            }
        });
    });
});
