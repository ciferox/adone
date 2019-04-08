const {
    is,
    cli: { style, chalk },
    error,
    fs,
    http,
    system,
    semver,
    std,
    util,
    system: { process: { execStdout } }
} = adone;

export const downloadIndex = async () => (await http.client.request("https://nodejs.org/download/release/index.json")).data;

export const getNodePath = () => fs.which("node");

export const getActiveNodeVersion = async () => {
    try {
        const binPath = await getNodePath();
        return execStdout(binPath, ["--version"]);
    } catch (err) {
        return "";
    }
};

export const checkNodeVersion = async (ver) => {
    const indexJson = await downloadIndex();

    let version = ver;
    if (!["latest", "latest-lts"].includes(version)) {
        version = semver.valid(version);
        if (is.null(version)) {
            throw new error.NotValidException(`Invalid version: ${chalk.bold(ver)}`);
        }
    }

    switch (version) {
        case "latest":
            version = indexJson[0].version;
            break;
        case "latest-lts":
            version = indexJson.find((item) => item.lts).version;
            break;
        default: {
            version = version.startsWith("v")
                ? version
                : `v${version}`;

            if (indexJson.findIndex((item) => item.version === version) === -1) {
                throw new error.NotValidException(`Invalid version: ${chalk.bold(ver)}`);
            }
        }
    }

    return version;
};

export const getNodeArchiveName = ({ version, platform = std.os.platform(), arch = std.os.arch(), archiveType = ".tar.xz" } = {}) => `node-${version}-${platform}-${arch}${archiveType}`;

export const getCachePath = async ({ version, archiveType, platform, arch } = {}) => {
    const basePath = system.env.home();
    const cachePath = std.path.join(basePath, ".anodejs_cache");
    await fs.mkdirp(cachePath);

    return version
        ? std.path.join(cachePath, getNodeArchiveName({ version, archiveType, platform, arch }))
        : cachePath;
};

export const downloadNode = async ({ version, outPath, force = false, progressBar, platform, arch, archiveType } = {}) => {
    const archName = getNodeArchiveName({ version, archiveType, platform, arch });
    const url = `https://nodejs.org/download/release/${version}/${archName}`;

    const tmpPath = await fs.tmpName();

    const downloader = new http.Downloader({
        url,
        dest: std.path.join(tmpPath, archName)
    });

    if (progressBar) {
        progressBar.clean = true;
        const progress = util.throttle.create((current, total) => {
            progressBar.update(current / total, {
                current: adone.pretty.size(current),
                total: adone.pretty.size(total)
            });
        }, { drop: true, dropLast: false, max: 1, interval: 100 });

        downloader.on("bytes", (current, total) => progress(current, total));
    }

    const cachePath = await getCachePath();
    let fullPath = await getCachePath({ version, archiveType, platform, arch });

    if (!is.string(outPath)) {
        outPath = cachePath;
    }

    fullPath = std.path.join(outPath, archName);

    if (outPath === cachePath && !force && await fs.exists(fullPath)) {
        throw new error.ExistsException(`Node.js ${style.primary(version)} already downloaded`);
    }

    try {
        await downloader.download();
        await adone.promise.delay(1000);
    } catch (err) {
        throw new error.Exception(`Could not get ${url}: ${err.response.status}`);
    }

    if (await fs.exists(fullPath)) {
        await fs.unlink(fullPath);
    }

    await adone.fast.src(util.globize(tmpPath), {
        base: tmpPath
    })
        // .decompress("xz")
        // .unpack("tar", { inRoot: true })
        .dest(outPath, {
            produceFiles: true
        });

    await fs.rm(tmpPath);

    return fullPath;
};


export const unpackNode = async ({ version, platform, arch, archiveType } = {}) => {
    const tmpPath = await fs.tmpName();
    const fullPath = await getCachePath({ version, archiveType, platform, arch });
    await adone.fast.src(fullPath)
        .decompress("xz")
        .unpack("tar", { inRoot: true })
        .dest(tmpPath);

    return std.path.join(tmpPath, getNodeArchiveName({ version, archiveType: "" }));
};
