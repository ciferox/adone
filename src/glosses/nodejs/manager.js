const {
    error,
    is,
    fs,
    nodejs,
    std,
    system,
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
            this.cache.basePath = std.path.join(system.env.home(), ".anodejs_cache");
        }
        this.cache.download = this.cache.download || "download";
        this.cache.release = this.cache.release || "release";
        this.cache.sources = this.cache.sources || "sources";
        this.cache.headers = this.cache.headers || "headers";
    }

    async getCachePath(...dirs) {
        const cachePath = std.path.join(this.cache.basePath, ...dirs);
        await fs.mkdirp(cachePath);
        return cachePath;
    }

    async getCachePathFor(dirName, options) {
        return std.path.join(await this.getCachePath(dirName), await nodejs.getArchiveName(options));
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
    async download({ version, outPath, force = false, progressBar = false, platform, arch, ext, type } = {}) {
        if (!version) {
            version = await nodejs.checkVersion("latest");
        }

        const archName = await nodejs.getArchiveName({ version, type, ext, platform, arch });

        const tmpPath = await fs.tmpName();

        const downloadPath = await this.getCachePath(this.cache.download);
        let fullPath = await this.getCachePathFor(this.cache.download, { version, type, ext, platform, arch });

        if (!is.string(outPath) || outPath.length === 0) {
            outPath = downloadPath;
        }

        fullPath = std.path.join(outPath, archName);

        const result = {
            path: fullPath,
            downloaded: false
        };

        if (outPath === downloadPath && !force && await fs.exists(fullPath)) {
            result.downloaded = false;
            return result;
        }

        const url = `https://nodejs.org/download/release/${version}/${archName}`;
        const downloader = new adone.http.Downloader({
            url,
            dest: std.path.join(tmpPath, archName)
        });

        if (progressBar instanceof adone.cli.Progress) {
            progressBar.clean = true;
        } else if (progressBar === true) {
            progressBar = new adone.cli.Progress({
                clean: true,
                schema: `downloading ${adone.cli.style.primary(version)} [:bar] :current/:total :percent`
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
            await downloader.download();
            await adone.promise.delay(500);
            result.downloaded = true;
        } catch (err) {
            throw new error.Exception(`Could not get ${url}: ${err.response.status}`);
        }

        if (await fs.exists(fullPath)) {
            await fs.unlink(fullPath);
        }

        await fs.copy(tmpPath, outPath);
        await fs.rm(tmpPath);

        return result;
    }

    // TODO: force disable 'strip' mode when extracting to default cache
    async extract({ outPath, version, platform, arch, type, ext, strip = false } = {}) {
        const destPath = outPath || await this.getCachePath(this.cache[type || "release"]);
        const fullPath = await this.getCachePathFor(this.cache.download, { version, type, ext, platform, arch });

        await adone.fast.src(fullPath)
            .extract({
                strip: strip ? 1 : 0
            })
            .dest(destPath);

        return strip
            ? destPath
            : std.path.join(destPath, await nodejs.getArchiveName({ version, platform, arch, type, omitSuffix: true, ext: "" }));
    }

    async deleteCurrent() {
        const basePath = await nodejs.getPrefixPath();
        for (const dirs of NODEJS_PATHS) {
            // eslint-disable-next-line no-await-in-loop
            await fs.rm(std.path.join(basePath, ...dirs));
        }
    }
}
