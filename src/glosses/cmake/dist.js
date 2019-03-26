const urljoin = require("url-join");
import runtimePaths from "./runtime_paths";

const {
    fs,
    cmake: { environment, TargetOptions, Downloader, CMLog },
    std: { path },
    lodash: _
} = adone;

const testSum = function (sums, sum, fPath) {
    const serverSum = _.first(sums.filter((s) => {
        return s.getPath === fPath;
    }));
    if (serverSum && serverSum.sum === sum) {
        return;
    }
    throw new Error(`SHA sum of file '${fPath}' mismatch!`);
};

const getStat = function (path) {
    try {
        return fs.statSync(path);
    } catch (e) {
        return {
            isFile: _.constant(false),
            isDirectory: _.constant(false)
        };
    }
};

export default class Dist {
    constructor(options) {
        this.options = options || {};
        this.log = new CMLog(this.options);
        this.targetOptions = new TargetOptions(this.options);
        this.downloader = new Downloader(this.options);
    }

    get internalPath() {
        return path.join(environment.home, ".cmake-js",
            `${this.targetOptions.runtime}-${this.targetOptions.arch}`,
            `v${this.targetOptions.runtimeVersion}`);
    }

    get externalPath() {
        return runtimePaths.get(this.targetOptions).externalPath;
    }

    get downloaded() {
        let headers = false;
        let libs = true;

        let stat = getStat(this.internalPath);
        if (stat.isDirectory()) {
            if (this.headerOnly) {
                stat = getStat(path.join(this.internalPath, "include/node/node.h"));
                headers = stat.isFile();
            } else {
                stat = getStat(path.join(this.internalPath, "src/node.h"));
                if (stat.isFile()) {
                    stat = getStat(path.join(this.internalPath, "deps/v8/include/v8.h"));
                    headers = stat.isFile();
                }
            }
            if (environment.isWin) {
                for (const libPath of this.winLibs) {
                    stat = getStat(libPath);
                    libs = libs && stat.isFile();
                }
            }
        }
        return headers && libs;
    }

    get winLibs() {
        const libs = runtimePaths.get(this.targetOptions).winLibs;
        const result = [];
        for (const lib of libs) {
            result.push(path.join(this.internalPath, lib.dir, lib.name));
        }
        return result;
    }

    get headerOnly() {
        return runtimePaths.get(this.targetOptions).headerOnly;
    }


    async ensureDownloaded() {
        if (!this.downloaded) {
            await this.download();
        }
    }

    async download() {
        const log = this.log;
        log.info("DIST", "Downloading distribution files.");
        await fs.mkdirp(this.internalPath);
        const sums = await this._downloadShaSums();
        await Promise.all([this._downloadLibs(sums), this._downloadTar(sums)]);
    }

    async _downloadShaSums() {
        if (this.targetOptions.runtime === "node" || this.targetOptions.runtime === "iojs") {
            const sumUrl = urljoin(this.externalPath, "SHASUMS256.txt");
            const log = this.log;
            log.http("DIST", `\t- ${sumUrl}`);
            return (await this.downloader.downloadString(sumUrl))
                .split("\n")
                .map((line) => {
                    const parts = line.split(/\s+/);
                    return {
                        getPath: parts[1],
                        sum: parts[0]
                    };
                })
                .filter((i) => {
                    return i.getPath && i.sum;
                });
        }

        return null;
    }

    async _downloadTar(sums) {
        const log = this.log;
        const self = this;
        const tarLocalPath = runtimePaths.get(self.targetOptions).tarPath;
        const tarUrl = urljoin(self.externalPath, tarLocalPath);
        log.http("DIST", `\t- ${tarUrl}`);

        const sum = await this.downloader.downloadTgz(tarUrl, {
            hash: sums ? "sha256" : null,
            cwd: self.internalPath,
            strip: 1,
            filter(entryPath) {
                if (entryPath === self.internalPath) {
                    return true;
                }
                const ext = path.extname(entryPath);
                return ext && ext.toLowerCase() === ".h";
            }
        });

        if (sums) {
            testSum(sums, sum, tarLocalPath);
        }
    }

    async _downloadLibs(sums) {
        const log = this.log;
        const self = this;
        if (!environment.isWin) {
            return;
        }

        const paths = runtimePaths.get(self.targetOptions);
        for (const dirs of paths.winLibs) {
            const subDir = dirs.dir;
            const fn = dirs.name;
            const fPath = subDir ? urljoin(subDir, fn) : fn;
            const libUrl = urljoin(self.externalPath, fPath);
            log.http("DIST", `\t- ${libUrl}`);

            await fs.mkdirpAsync(path.join(self.internalPath, subDir)); // eslint-disable-line

            // eslint-disable-next-line
            const sum = await this.downloader.downloadFile(libUrl, {
                path: path.join(self.internalPath, fPath),
                hash: sums ? "sha256" : null
            });

            if (sums) {
                testSum(sums, sum, fPath);
            }
        }
    }
}
