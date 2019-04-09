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
            this.cache.basePath = system.env.home();
        }
        if (!this.cache.dirName) {
            this.cache.dirName = ".anodejs_cache";
        }
        this.cache.downloadDir = this.cache.downloadDir || "download";
    }

    async getCachePath(...dirs) {
        const cachePath = std.path.join(this.cache.basePath, this.cache.dirName, ...dirs);
        await fs.mkdirp(cachePath);

        return cachePath;
    }

    async getDownloadPath({ version, archiveType, platform, arch } = {}) {
        const path = await this.getCachePath(this.cache.downloadDir);

        return version
            ? std.path.join(path, nodejs.getArchiveName({ version, archiveType, platform, arch }))
            : path;

    }

    async getDownloadedVersions() {
        const files = await fs.readdir(await this.getDownloadPath());
        return files.map((f) => /^node-(v\d+\.\d+\.\d+)-.+/.exec(f)[1]);
    }

    /**
     * Tries download Node.js from official site.
     * 
     * @param {*} param0 
     * @returns {Object { path, downloaded }} 
     */
    async download({ version, outPath, force = false, progressBar = false, platform, arch, archiveType } = {}) {
        const archName = nodejs.getArchiveName({ version, archiveType, platform, arch });

        const tmpPath = await fs.tmpName();

        const cachePath = await this.getDownloadPath();
        let fullPath = await this.getDownloadPath({ version, archiveType, platform, arch });

        if (!is.string(outPath) || outPath.length === 0) {
            outPath = cachePath;
        }

        fullPath = std.path.join(outPath, archName);

        const result = {
            path: fullPath,
            downloaded: false
        };

        if (outPath === cachePath && !force && await fs.exists(fullPath)) {
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

    async unpack({ outPath, version, platform, arch, archiveType } = {}) {
        const destPath = outPath || await fs.tmpName();
        const fullPath = await this.getDownloadPath({ version, archiveType, platform, arch });
        await adone.fast.src(fullPath)
            .decompress("xz")
            .unpack("tar", { inRoot: true })
            .dest(destPath);

        return std.path.join(destPath, nodejs.getArchiveName({ version, archiveType: "" }));
    }

    async deleteCurrent() {
        const basePath = await nodejs.getPrefixPath();
        for (const dirs of NODEJS_PATHS) {
            // eslint-disable-next-line no-await-in-loop
            await fs.rm(std.path.join(basePath, ...dirs));
        }
    }
}
