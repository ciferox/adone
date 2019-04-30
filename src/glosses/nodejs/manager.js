const {
    is,
    fs,
    nodejs,
    path: aPath,
    util
} = adone;

const NODEJS_PATHS = [
    ["bin", "node"],
    ["bin", "npm"],
    ["bin", "npx"],
    ["include", "node"],
    ["lib", "node_modules", "npm"],
    ["share", "doc", "node"],
    ["share", "man", "man1", "node.1"],
    ["systemtap", "tapset", "node.stp"]
];

export default class NodejsManager {
    constructor({ cache } = {}) {
        this.cache = cache || {};
        if (!this.cache.basePath) {
            this.cache.basePath = aPath.join(adone.VAR_PATH, "nodejs");
        }
        this.cache.download = this.cache.download || "downloads";
        this.cache.release = this.cache.release || "releases";
        this.cache.sources = this.cache.sources || "sources";
        this.cache.headers = this.cache.headers || "headers";
    }

    async getCachePath(...dirs) {
        const cachePath = aPath.join(this.cache.basePath, ...dirs);
        await fs.mkdirp(cachePath);
        return cachePath;
    }

    async getCachePathFor(dirName, options) {
        return aPath.join(await this.getCachePath(dirName), await nodejs.getArchiveName(options));
    }

    async getDownloadedVersions() {
        const files = await fs.readdir(await this.getCachePath(this.cache.download));
        return files.map((f) => {
            const result = /^node-(v\d+\.\d+\.\d+)-.+/.exec(f);
            return !is.null(result)
                ? result[[1]]
                : "";
        }).filter(adone.identity);
    }

    /**
     * Tries download Node.js archive from official site.
     * 
     * @param {*} param0 
     * @returns {Object { path, downloaded }} 
     */
    async download({ version, outPath, force = false, progressBar = false, platform, arch, ext, type, hash } = {}) {
        if (!version) {
            version = await nodejs.checkVersion("latest");
        }

        const archName = await nodejs.getArchiveName({ version, type, ext, platform, arch });

        const tmpPath = await fs.tmpName();

        const downloadPath = aPath.join(await this.getCachePath(this.cache.download), await nodejs.getArchiveName({ version, ext: "", platform: "", arch: "" }));

        if (!is.string(outPath) || outPath.length === 0) {
            outPath = downloadPath;
        }

        const fullPath = aPath.join(outPath, archName);

        const result = {
            path: fullPath,
            downloaded: false
        };

        if (outPath === downloadPath && !force && await fs.pathExists(fullPath)) {
            result.downloaded = true;
            return result;
        }

        const url = `https://nodejs.org/download/release/${version}/${archName}`;
        const downloader = new adone.http.Downloader({
            url,
            dest: aPath.join(tmpPath, archName)
        });

        if (progressBar instanceof adone.cli.Progress) {
            progressBar.clean = true;
        } else if (progressBar === true) {
            progressBar = new adone.cli.Progress({
                clean: true,
                schema: "[:bar] :current/:total :percent"
            });
            progressBar.update(0);
        }

        if (progressBar) {
            const progress = util.throttle.create((current, total) => {
                progressBar.update(current / total, {
                    current: adone.pretty.size(current),
                    total: adone.pretty.size(total)
                });
            }, { drop: true, dropLast: false, max: 1, interval: 100 });

            downloader.on("bytes", (current, total) => progress(current, total));
        }

        try {
            const hashsum = await downloader.download(hash);
            await adone.promise.delay(500);
            result.downloaded = true;
            if (hash) {
                result.hashsum = hashsum;
            }
        } catch (err) {
            progressBar.destroy();
            console.error(err.stack);
            throw err;
            // throw new error.Exception(`Could not get ${url}: ${err.message}`);
        }

        if (await fs.exists(fullPath)) {
            await fs.unlink(fullPath);
        }

        await fs.copy(tmpPath, outPath);
        await fs.remove(tmpPath);

        return result;
    }

    // TODO: force disable 'strip' mode when extracting to default cache
    async extract({ outPath, version, platform, arch, type = "release", ext, strip = false } = {}) {
        const destPath = outPath || await this.getCachePath(this.cache[type]);

        const archName = await nodejs.getArchiveName({ version, type, ext, platform, arch });
        const downloadPath = aPath.join(await this.getCachePath(this.cache.download), await nodejs.getArchiveName({ version, ext: "", platform: "", arch: "" }));

        const fullPath = aPath.join(downloadPath, archName);

        await adone.fast.src(fullPath)
            .extract({
                strip: strip ? 1 : 0
            })
            .dest(destPath);

        return strip
            ? destPath
            : aPath.join(destPath, await nodejs.getArchiveName({ version, platform, arch, type, omitSuffix: true, ext: "" }));
    }

    async deleteCurrent() {
        const basePath = await nodejs.getPrefixPath();
        for (const dirs of NODEJS_PATHS) {
            // eslint-disable-next-line no-await-in-loop
            await fs.remove(aPath.join(basePath, ...dirs));
        }
    }
}
