const {
    fs
} = adone;

const osenv = require("osenv");
const tar = require("tar");
const log = require("npmlog");
const request = require("request");
const minimatch = require("minimatch");
const mkdir = require("mkdirp");
const processRelease = require("../process-release");
const win = process.platform === "win32";

const {
    semver,
    std: { path, crypto }
} = adone;


const readCAFile = function (filename) {
    // The CA file can contain multiple certificates so split on certificate
    // boundaries.  [\S\s]*? is used to match everything including newlines.
    const ca = fs.readFileSync(filename, "utf8");
    const re = /(-----BEGIN CERTIFICATE-----[\S\s]*?-----END CERTIFICATE-----)/g;
    return ca.match(re);
};

const download = function (gyp, env, url) {
    log.http("GET", url);

    const requestOpts = {
        uri: url,
        headers: {
            "User-Agent": `node-gyp v${adone.package.version} (node ${process.version})`
        }
    };

    const cafile = gyp.opts.cafile;
    if (cafile) {
        requestOpts.ca = readCAFile(cafile);
    }

    // basic support for a proxy server
    const proxyUrl = gyp.opts.proxy
        || env.http_proxy
        || env.HTTP_PROXY
        || env.npm_config_proxy;
    if (proxyUrl) {
        if (/^https?:\/\//i.test(proxyUrl)) {
            log.verbose("download", 'using proxy url: "%s"', proxyUrl);
            requestOpts.proxy = proxyUrl;
        } else {
            log.warn("download", 'ignoring invalid "proxy" config setting: "%s"', proxyUrl);
        }
    }

    const req = request(requestOpts);
    req.on("response", (res) => {
        log.http(res.statusCode, url);
    });

    return req;
};


const install = function (gyp, argv, callback) {
    const release = processRelease(argv, gyp, process.version, process.release);

    // ensure no double-callbacks happen
    const cb = function (err) {
        if (cb.done) {
            return;
        }
        cb.done = true;
        if (err) {
            log.warn("install", "got an error, rolling back install");
            // roll-back the install if anything went wrong
            adone.nodejs.gyp.command.remove(gyp, [release.versionDir], (err2) => {
                callback(err);
            });
        } else {
            callback(null, release.version);
        }
    };

    /**
     * The EACCES fallback is a workaround for npm's `sudo` behavior, where
     * it drops the permissions before invoking any child processes (like
     * node-gyp). So what happens is the "nobody" user doesn't have
     * permission to create the dev dir. As a fallback, make the tmpdir() be
     * the dev dir for this installation. This is not ideal, but at least
     * the compilation will succeed...
     */

    const eaccesFallback = function () {
        const tmpdir = osenv.tmpdir();
        gyp.devDir = path.resolve(tmpdir, ".node-gyp");
        log.warn("EACCES", 'user "%s" does not have permission to access the dev dir "%s"', osenv.user(), devDir);
        log.warn("EACCES", 'attempting to reinstall using temporary dev dir "%s"', gyp.devDir);
        if (process.cwd() === tmpdir) {
            log.verbose("tmpdir == cwd", "automatically will remove dev files after to save disk space");
            gyp.todo.push({ name: "remove", args: argv });
        }
        adone.nodejs.gyp.command.install(gyp, argv, cb);
    };

    // Determine which node dev files version we are installing
    log.verbose("install", "input version string %j", release.version);

    if (!release.semver) {
        // could not parse the version string with semver
        return callback(new Error(`Invalid version number: ${release.version}`));
    }

    if (semver.lt(release.version, "0.8.0")) {
        return callback(new Error(`Minimum target version is \`0.8.0\` or greater. Got: ${release.version}`));
    }

    // 0.x.y-pre versions are not published yet and cannot be installed. Bail.
    if (release.semver.prerelease[0] === "pre") {
        log.verbose('detected "pre" node version', release.version);
        if (gyp.opts.nodedir) {
            log.verbose("--nodedir flag was passed; skipping install", gyp.opts.nodedir);
            callback();
        } else {
            callback(new Error('"pre" versions of node cannot be installed, use the --nodedir flag instead'));
        }
        return;
    }

    // flatten version into String
    log.verbose("install", "installing version: %s", release.versionDir);

    // the directory where the dev files will be installed
    const devDir = path.resolve(gyp.devDir, release.versionDir);

    const getContentSha = function (res, callback) {
        const shasum = crypto.createHash("sha256");
        res.on("data", (chunk) => {
            shasum.update(chunk);
        }).on("end", () => {
            callback(null, shasum.digest("hex"));
        });
    };

    /**
     * Checks if a given filename is "valid" for this installation.
     */

    const valid = function (file) {
        // header files
        return minimatch(file, "*.h", { matchBase: true }) || minimatch(file, "*.gypi", { matchBase: true });
    };

    const go = function () {
        log.verbose("ensuring nodedir is created", devDir);

        // first create the dir for the node dev files
        mkdir(devDir, (err, created) => {
            if (err) {
                if (err.code === "EACCES") {
                    eaccesFallback();
                } else {
                    cb(err);
                }
                return;
            }

            if (created) {
                log.verbose("created nodedir", created);
            }

            // now download the node tarball
            const tarPath = gyp.opts.tarball;
            let badDownload = false;
            let extractCount = 0;

            const contentShasums = {};
            const expectShasums = {};

            // checks if a file to be extracted from the tarball is valid.
            // only .h header files and the gyp files get extracted
            const isValid = function (path, entry) {
                const isValid = valid(path);
                if (isValid) {
                    log.verbose("extracted file from tarball", path);
                    extractCount++;
                } else {
                    // invalid
                    log.silly("ignoring from tarball", path);
                }
                return isValid;
            };

            const downloadShasums = function (done) {
                log.verbose("check download content checksum, need to download `SHASUMS256.txt`...");
                const shasumsPath = path.resolve(devDir, "SHASUMS256.txt");

                log.verbose("checksum url", release.shasumsUrl);
                let req;
                try {
                    req = download(gyp, process.env, release.shasumsUrl);
                } catch (e) {
                    return cb(e);
                }

                req.on("error", done);
                req.on("response", (res) => {
                    if (res.statusCode !== 200) {
                        done(new Error(`${res.statusCode} status code downloading checksum`));
                        return;
                    }

                    const chunks = [];
                    res.on("data", (chunk) => {
                        chunks.push(chunk);
                    });
                    res.on("end", () => {
                        const lines = Buffer.concat(chunks).toString().trim().split("\n");
                        lines.forEach((line) => {
                            const items = line.trim().split(/\s+/);
                            if (items.length !== 2) {
                                return;
                            }

                            // 0035d18e2dcf9aad669b1c7c07319e17abfe3762  ./node-v0.11.4.tar.gz
                            const name = items[1].replace(/^\.\//, "");
                            expectShasums[name] = items[0];
                        });

                        log.verbose("checksum data", JSON.stringify(expectShasums));
                        done();
                    });
                });
            };

            const downloadNodeLib = function (done) {
                log.verbose(`on Windows; need to download \`${release.name}.lib\`...`);
                const dir32 = path.resolve(devDir, "ia32");
                const dir64 = path.resolve(devDir, "x64");
                const libPath32 = path.resolve(dir32, `${release.name}.lib`);
                const libPath64 = path.resolve(dir64, `${release.name}.lib`);

                log.verbose(`32-bit ${release.name}.lib dir`, dir32);
                log.verbose(`64-bit ${release.name}.lib dir`, dir64);
                log.verbose(`\`${release.name}.lib\` 32-bit url`, release.libUrl32);
                log.verbose(`\`${release.name}.lib\` 64-bit url`, release.libUrl64);

                let async = 2;
                mkdir(dir32, (err) => {
                    if (err) {
                        return done(err);
                    }
                    log.verbose(`streaming 32-bit ${release.name}.lib to:`, libPath32);

                    let req;
                    try {
                        req = download(gyp, process.env, release.libUrl32, cb);
                    } catch (e) {
                        return cb(e);
                    }

                    req.on("error", done);
                    req.on("response", (res) => {
                        if (res.statusCode !== 200) {
                            done(new Error(`${res.statusCode} status code downloading 32-bit ${release.name}.lib`));
                            return;
                        }

                        getContentSha(res, (_, checksum) => {
                            contentShasums[release.libPath32] = checksum;
                            log.verbose("content checksum", release.libPath32, checksum);
                        });

                        const ws = fs.createWriteStream(libPath32);
                        ws.on("error", cb);
                        req.pipe(ws);
                    });
                    req.on("end", () => {
                        --async || done();
                    });
                });
                mkdir(dir64, (err) => {
                    if (err) {
                        return done(err);
                    }
                    log.verbose(`streaming 64-bit ${release.name}.lib to:`, libPath64);

                    let req;
                    try {
                        req = download(gyp, process.env, release.libUrl64, cb);
                    } catch (e) {
                        return cb(e);
                    }

                    req.on("error", done);
                    req.on("response", (res) => {
                        if (res.statusCode !== 200) {
                            done(new Error(`${res.statusCode} status code downloading 64-bit ${release.name}.lib`));
                            return;
                        }

                        getContentSha(res, (_, checksum) => {
                            contentShasums[release.libPath64] = checksum;
                            log.verbose("content checksum", release.libPath64, checksum);
                        });

                        const ws = fs.createWriteStream(libPath64);
                        ws.on("error", cb);
                        req.pipe(ws);
                    });
                    req.on("end", () => {
                        --async || done();
                    });
                });
            }; // downloadNodeLib()

            // invoked after the tarball has finished being extracted
            const afterTarball = function () {
                if (badDownload) {
                    return;
                }
                if (extractCount === 0) {
                    return cb(new Error("There was a fatal problem while downloading/extracting the tarball"));
                }
                log.verbose("tarball", "done parsing tarball");
                let async = 0;

                const deref = function (err) {
                    if (err) {
                        return cb(err);
                    }

                    async--;
                    if (!async) {
                        log.verbose("download contents checksum", JSON.stringify(contentShasums));
                        // check content shasums
                        for (const k in contentShasums) {
                            log.verbose(`validating download checksum for ${k}`, "(%s == %s)", contentShasums[k], expectShasums[k]);
                            if (contentShasums[k] !== expectShasums[k]) {
                                cb(new Error(`${k} local checksum ${contentShasums[k]} not match remote ${expectShasums[k]}`));
                                return;
                            }
                        }
                        cb();
                    }
                };

                if (win) {
                    // need to download node.lib
                    async++;
                    downloadNodeLib(deref);
                }

                // write the "installVersion" file
                async++;
                const installVersionPath = path.resolve(devDir, "installVersion");
                fs.writeFile(installVersionPath, `${gyp.installVersion}\n`, deref);

                // Only download SHASUMS.txt if not using tarPath override
                if (!tarPath) {
                    // download SHASUMS.txt
                    async++;
                    downloadShasums(deref);
                }

                if (async === 0) {
                    // no async tasks required
                    cb();
                }
            };

            // download the tarball and extract!

            if (tarPath) {
                return tar.extract({
                    file: tarPath,
                    strip: 1,
                    filter: isValid,
                    cwd: devDir
                }).then(afterTarball, cb);
            }

            let req;
            try {
                req = download(gyp, process.env, release.tarballUrl);
            } catch (e) {
                return cb(e);
            }

            // something went wrong downloading the tarball?
            req.on("error", (err) => {
                if (err.code === "ENOTFOUND") {
                    return cb(new Error("This is most likely not a problem with node-gyp or the package itself and\n" +
                        "is related to network connectivity. In most cases you are behind a proxy or have bad \n" +
                        "network settings."));
                }
                badDownload = true;
                cb(err);
            });

            req.on("close", () => {
                if (extractCount === 0) {
                    cb(new Error("Connection closed while downloading tarball file"));
                }
            });

            req.on("response", (res) => {
                if (res.statusCode !== 200) {
                    badDownload = true;
                    cb(new Error(`${res.statusCode} response downloading ${release.tarballUrl}`));
                    return;
                }
                // content checksum
                getContentSha(res, (_, checksum) => {
                    const filename = path.basename(release.tarballUrl).trim();
                    contentShasums[filename] = checksum;
                    log.verbose("content checksum", filename, checksum);
                });

                // start unzipping and untaring
                res.pipe(tar.extract({
                    strip: 1,
                    cwd: devDir,
                    filter: isValid
                }).on("close", afterTarball).on("error", cb));
            });
        }); // mkdir()
    }; // go()

    // If '--ensure' was passed, then don't *always* install the version;
    // check if it is already installed, and only install when needed
    if (gyp.opts.ensure) {
        log.verbose("install", "--ensure was passed, so won't reinstall if already installed");
        fs.stat(devDir, (err, stat) => {
            if (err) {
                if (err.code === "ENOENT") {
                    log.verbose("install", "version not already installed, continuing with install", release.version);
                    go();
                } else if (err.code === "EACCES") {
                    eaccesFallback();
                } else {
                    cb(err);
                }
                return;
            }
            log.verbose("install", 'version is already installed, need to check "installVersion"');
            const installVersionFile = path.resolve(devDir, "installVersion");
            fs.readFile(installVersionFile, "ascii", (err, ver) => {
                if (err && err.code !== "ENOENT") {
                    return cb(err);
                }
                const installVersion = parseInt(ver, 10) || 0;
                log.verbose('got "installVersion"', installVersion);
                log.verbose('needs "installVersion"', gyp.installVersion);
                if (installVersion < gyp.installVersion) {
                    log.verbose("install", "version is no good; reinstalling");
                    go();
                } else {
                    log.verbose("install", "version is good");
                    cb();
                }
            });
        });
    } else {
        go();
    }
};


module.exports = exports = install;

module.exports.test = { download, readCAFile };

exports.usage = "Install node development files for the specified node version.";
