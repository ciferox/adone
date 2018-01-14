const request = require("request");
const MemoryStream = require("memory-stream");
const tar = require("tar");
const unzip = require("unzip");

const {
    is,
    fs,
    cmake: { CMLog },
    std: { zlib, crypto }
} = adone;

export default class Downloader {
    constructor(options) {
        this.options = options || {};
        this.log = new CMLog(this.options);
    }

    downloadToStream(url, stream, hash) {
        const self = this;
        const shasum = hash ? crypto.createHash(hash) : null;
        return new Promise(((resolve, reject) => {
            let length = 0;
            let done = 0;
            let lastPercent = 0;
            request
                .get(url)
                .on("error", (err) => {
                    reject(err);
                })
                .on("response", (data) => {
                    length = parseInt(data.headers["content-length"]);
                    if (!is.number(length)) {
                        length = 0;
                    }
                })
                .on("data", (chunk) => {
                    if (shasum) {
                        shasum.update(chunk);
                    }
                    if (length) {
                        done += chunk.length;
                        let percent = done / length * 100;
                        percent = Math.round(percent / 10) * 10 + 10;
                        if (percent > lastPercent) {
                            self.log.verbose("DWNL", `\t${lastPercent}%`);
                            lastPercent = percent;
                        }
                    }
                })
                .pipe(stream);

            stream.once("error", (err) => {
                reject(err);
            });

            stream.once("finish", () => {
                resolve(shasum ? shasum.digest("hex") : undefined);
            });
        }));
    }

    async downloadString(url) {
        const result = new MemoryStream();
        await this.downloadToStream(url, result);
        return result.toString();
    }

    async downloadFile(url, options) {
        if (is.string(options)) {
            options.path = options;
        }
        const result = fs.createWriteStream(options.path);
        const sum = await this.downloadToStream(url, result, options.hash);
        this.testSum(url, sum, options);
        return sum;
    }

    async downloadTgz(url, options) {
        if (is.string(options)) {
            options.cwd = options;
        }
        const gunzip = zlib.createGunzip();
        const extractor = tar.extract(options);
        gunzip.pipe(extractor);
        const sum = await this.downloadToStream(url, gunzip, options.hash);
        this.testSum(url, sum, options);
        return sum;
    }

    async downloadZip(url, options) {
        if (is.string(options)) {
            options.path = options;
        }
        const extractor = new unzip.Extract(options);
        const sum = await this.downloadToStream(url, extractor, options.hash);
        this.testSum(url, sum, options);
        return sum;
    }

    async testSum(url, sum, options) {
        if (options.hash && sum && options.sum && options.sum !== sum) {
            throw new Error(`${options.hash.toUpperCase()} sum of download '${url}' mismatch!`);
        }
    }
}
