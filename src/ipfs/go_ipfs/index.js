
/**
 * Download go-ipfs distribution package for desired version, platform and architecture,
 * and unpack it to a desired output directory.
 *
 * API:
 * download([<version>, <platform>, <arch>, <outputPath>])
 *
 * Defaults:
 * go-ipfs version: value in package.json/go-ipfs/version
 * go-ipfs platform: the platform this program is run from
 * go-ipfs architecture: the architecture of the hardware this program is run from
 * go-ipfs install path: './go-ipfs'
 *
 * Example:
 * const download = require('go-ipfs-dep')
 *
 * download("v0.4.5", "linux", "amd64", "/tmp/go-ipfs"])
 * .then((res) => console.log('filename:', res.file, "output:", res.dir))
 * .catch((e) => console.error(e))
 */
const goenv = require("go-platform");
const gunzip = require("gunzip-maybe");
const path = require("path");
const request = require("request");
const tarFS = require("tar-fs");
const unzip = require("unzip-stream");
const support = require("./check_support");

export const defaultVersion = "0.4.18";
export const defaultUrl = "https://dist.ipfs.io";

// Main function
export const download = function (ver, platform, arch) {
    return new Promise((resolve, reject) => {
        //            Environment Variables           Args        Defaults
        ver = process.env.TARGET_VERSION || ver || `v${defaultVersion}`;
        platform = process.env.TARGET_OS || platform || goenv.GOOS;
        arch = process.env.TARGET_ARCH || arch || goenv.GOARCH;
        const distUrl = process.env.GO_IPFS_DIST_URL || defaultUrl;

        // Make sure we support the requested package
        try {
            support.verify(ver, platform, arch);
        } catch (e) {
            return reject(e);
        }

        // Flag for Windows
        const isWindows = support.isWindows(platform);

        // Create the download url
        const fileExtension = isWindows ? ".zip" : ".tar.gz";
        const fileName = `ipfs_${ver}_${platform}-${arch}${fileExtension}`;
        const url = `${distUrl}/go-ipfs/${ver}/go-${fileName}`;

        // Success callback wrapper
        // go-ipfs contents are in 'go-ipfs/', so append that to the path
        const done = () => resolve({
            fileName,
            installPath: path.join(adone.realm.getRootRealm().env.OPT_PATH, "/go-ipfs/")
        });

        // Unpack the response stream
        const unpack = (stream) => {
            // TODO: handle errors for both cases
            if (isWindows) {
                return stream.pipe(
                    unzip
                        .Extract({ path: adone.realm.getRootRealm().env.OPT_PATH })
                        .on("close", done)
                );
            }

            return stream
                .pipe(gunzip())
                .pipe(
                    tarFS
                        .extract(adone.realm.getRootRealm().env.OPT_PATH)
                        .on("finish", done)
                );
        };

        // Start
        process.stdout.write(`Downloading ${url}\n`);

        request.get(url, (err, res, body) => {
            if (err) {
                // TODO handle error: haad?
                return reject(err);
            }
            // Handle errors
            if (res.statusCode !== 200) {
                reject(new Error(`${res.statusCode} - ${res.body}`));
            }
        }).on("response", (res) => {
            // Unpack only if the request was successful
            if (res.statusCode !== 200) {
                return;
            }

            unpack(res);
        });
    });
};
