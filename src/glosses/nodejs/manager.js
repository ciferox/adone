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
    ["share", "systemtap", "tapset", "node.stp"]
];

export default class NodejsManager {
    constructor({ realm, cache } = {}) {
        this.cache = new nodejs.FsCache({
            downloads: "downloads",
            release: "releases",
            sources: "sources",
            headers: "headers",
            ...cache,
            realm,
            appName: "nodejs"
        });
    }

    async getCachePath(...dirs) {
        return this.cache.getPath(...dirs);
    }

    async getCachePathFor(dirName, options) {
        return aPath.join(await this.getCachePath(dirName), await nodejs.getArchiveName(options));
    }

    async getDownloadedVersions({ type } = {}) {
        const cachePath = await this.getCachePath(this.cache.downloads);
        const files = await fs.readdir(cachePath);

        const result = [];

        for (const file of files) {
            // eslint-disable-next-line no-await-in-loop
            const name = await nodejs.getArchiveName({ type, version: file.slice(5) });
            // eslint-disable-next-line no-await-in-loop
            if (await fs.pathExists(aPath.join(cachePath, file, name))) {
                result.push(/^node-(v\d+\.\d+\.\d+)-.+/.exec(name)[[1]]);
            }
        }

        return result;
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

        const downloadPath = aPath.join(await this.getCachePath(this.cache.downloads), await nodejs.getArchiveName({ version, ext: "", platform: "", arch: "" }));

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
        const tmpFullPath = aPath.join(tmpPath, archName);
        const downloader = new adone.http.Downloader({
            url,
            dest: tmpFullPath
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

        await fs.mkdirp(outPath);
        await fs.copyFile(tmpFullPath, fullPath);
        await fs.remove(tmpPath);

        return result;
    }

    /**
     * Downloads development files for current platform.
     */
    async prepareDevFiles({ version } = {}) {
        if (!version) {
            version = await nodejs.checkVersion("latest");
        }

        await this.download({
            version,
            type: "headers"
        });

        const nodePath = await this.extract({
            version,
            type: "headers"
        });

        if (is.windows) {
            const dirName = adone.std.os.arch() === "x64" ? "win-x64" : "win-x86";
            const url = `https://nodejs.org/download/release/${version}/${dirName}/node.lib`;
            const destPath = aPath.join(nodePath, dirName);
            await fs.mkdirp(destPath);
            const downloader = new adone.http.Downloader({
                url,
                dest: aPath.join(destPath, "node.lib")
            });

            try {
                await downloader.download();
                await adone.promise.delay(500);
            } catch (err) {
                console.error(err.stack);
                throw err;
            }
        }
        return nodePath;
    }

    // TODO: force disable 'strip' mode when extracting to default cache
    async extract({ outPath, version, platform, arch, type = "release", ext, strip = false } = {}) {
        const destPath = outPath || await this.getCachePath(this.cache[type]);

        const archName = await nodejs.getArchiveName({ version, type, ext, platform, arch });
        const downloadPath = aPath.join(await this.getCachePath(this.cache.downloads), await nodejs.getArchiveName({ version, ext: "", platform: "", arch: "" }));

        const fullPath = aPath.join(downloadPath, archName);
        const fullDestPath = aPath.join(destPath, await nodejs.getArchiveName({ version, platform, arch, type, omitSuffix: true, ext: "" }));

        if (!(await fs.pathExists(fullDestPath))) {
            await adone.fast.src(fullPath)
                .extract({
                    strip: strip ? 1 : 0
                })
                .dest(destPath);
        }

        return strip
            ? destPath
            : fullDestPath;
    }

    async removeActive() {
        try {
            const basePath = await nodejs.getPrefixPath();

            for (const dirs of NODEJS_PATHS) {
                // eslint-disable-next-line no-await-in-loop
                await fs.remove(aPath.join(basePath, ...dirs));
            }
        } catch (err) {
            // Node.js is not installed
        }
    }
}
