const {
    error,
    fs,
    nodejs,
    std: { path },
    system
} = adone;

describe("nodejs", () => {
    const platform = nodejs.getCurrentPlatform();
    const arch = nodejs.getCurrentArch();
    const defaultExt = nodejs.DEFAULT_EXT;

    describe("getAchiveName()", () => {
        it("call without version should have thrown", async () => {
            await assert.throws(async () => nodejs.getArchiveName(), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({}), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: undefined }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: null }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "10" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "11.1" }), error.NotvalidException);
            await assert.throws(async () => nodejs.getArchiveName({ version: "11.13.0" }), error.NotvalidException);
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
                await fs.rm(p);
            }
        });

        it("defaults", () => {
            const nm = new nodejs.NodejsManager();

            assert.deepEqual(nm.cache, {
                basePath: path.join(system.env.home(), ".anodejs_cache"),
                download: "download",
                release: "release",
                sources: "sources",
                headers: "headers"
            });
        });

        it("custom base path", async () => {
            const basePath = await createTmpPath();
            const nm = await createManager({ basePath });

            assert.deepEqual(nm.cache, {
                basePath,
                download: "download",
                release: "release",
                sources: "sources",
                headers: "headers"
            });
        });

        it("custom cache dirs", async () => {
            const nm = await createManager({
                download: "archives",
                release: "rel",
                sources: "srcs",
                headers: "hdrs"
            });

            assert.equal(nm.cache.download, "archives");
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

            let p = await nm.getCachePath(nm.cache.download);
            assert.equal(p, path.join(nm.cache.basePath, nm.cache.download));
            assert.isTrue(await fs.isDirectory(p));

            p = await nm.getCachePath("some", "nested", "dir");
            assert.equal(p, path.join(nm.cache.basePath, "some", "nested", "dir"));
            assert.isTrue(await fs.isDirectory(p));
        });

        it("getCachePath() should create all sub directories", async () => {
            const nm = await createManager();
            let p = await nm.getCachePath(nm.cache.download);
            assert.equal(p, path.join(nm.cache.basePath, nm.cache.download));
            assert.isTrue(await fs.isDirectory(p));

            p = await nm.getCachePath(nm.cache.release);
            assert.equal(p, path.join(nm.cache.basePath, nm.cache.release));
            assert.isTrue(await fs.isDirectory(p));
        });

        describe("donwload", () => {
            it("by default should download latest release for current system", async () => {
                const nm = await createManager();

                const version = await nodejs.checkVersion("latest");
                const result = await nm.download();

                assert.equal(result.downloaded, true);
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.download, { version }));
                assert.equal(result.path, archivePath);
                assert.isTrue(await fs.isFile(archivePath));
            });

            it("download release for specified version", async () => {
                const nm = await createManager();

                const version = "v10.0.0";
                const result = await nm.download({ version });

                assert.equal(result.downloaded, true);
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.download, { version }));
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
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.download, { version, platform, ext }));
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
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.download, { version, platform, arch, ext }));
                assert.equal(result.path, archivePath);
                assert.isTrue(await fs.isFile(archivePath));
            });

            it("download sources", async () => {
                const nm = await createManager();

                const version = await nodejs.checkVersion("latest");
                const type = "sources";
                const result = await nm.download({ version, type });

                assert.equal(result.downloaded, true);
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.download, { version, type }));
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
                const archivePath = path.join(await nm.getCachePathFor(nm.cache.download, { version, type, ext }));
                assert.equal(result.path, archivePath);
                assert.isTrue(await fs.isFile(archivePath));
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
