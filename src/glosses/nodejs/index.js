const {
    error,
    is,
    fs,
    semver,
    std
} = adone;

adone.lazify({
    NodejsManager: "./manager",
    NodejsCompiler: "./compiler",
    NodejsPackager: "./packager"
}, adone.asNamespace(exports), require);

const versionRegex = () => /^v\d+\.\d+\.\d+/;

export const getCurrentPlatform = () => {
    const platform = std.os.platform();
    switch (platform) {
        case "win32":
            return "win";
        default:
            return platform;
    }
};

export const getCurrentArch = () => {
    const arch = std.os.arch();
    switch (arch) {
        case "ia32":
        case "x32":
            return "x86";
        default:
            return arch;
    }
};

export const DEFAULT_EXT = is.windows
    ? ".zip"
    : ".tar.xz";

const UNIX_EXTS = ["", ".tar.gz", ".tar.xz"];
const WIN_EXTS = ["", ".7z", ".zip"];

export const getArchiveName = async ({ version, platform = getCurrentPlatform(), arch = getCurrentArch(), type = "release", omitSuffix = false, ext = DEFAULT_EXT } = {}) => {
    if (!is.string(version) || !versionRegex().test(version)) {
        throw new error.NotValidException("Invalid version parameter");
    }
    if (ext.length > 0 && !ext.startsWith(".")) {
        ext = `.${ext}`;
    }

    if (type === "sources" || type === "headers") {
        if (!UNIX_EXTS.includes(ext)) {
            throw new error.NotValidException(`Archive extension should be '.tar.gz' or '.tar.xz. Got '${ext}'`);
        }
        const suffix = type === "headers"
            ? omitSuffix
                ? ""
                : "-headers"
            : "";
        return `node-${version}${suffix}${ext}`;
    } else if (type !== "release") {
        throw new error.NotValidException(`Unknown type of archive: ${type}`);
    }

    if (platform === "win") {
        if (!WIN_EXTS.includes(ext)) {
            throw new error.NotValidException(`For 'win' platform archive extension should be '.7z' or '.zip. Got '${ext}`);
        }
    } else if (!UNIX_EXTS.includes(ext)) {
        throw new error.NotValidException(`For unix platforms archive extension should be '.tar.gz' or '.tar.xz. Got '${ext}`);
    }

    return `node-${version}-${platform}-${arch}${ext}`;
};

export const getReleases = async () => (await adone.http.client.request("https://nodejs.org/download/release/index.json")).data;

export const getExePath = () => fs.which("node");

export const getPrefixPath = async () => std.path.dirname(std.path.dirname(await getExePath()));

export const getCurrentVersion = async () => {
    try {
        const exePath = await getExePath();
        return adone.process.execStdout(exePath, ["--version"]);
    } catch (err) {
        return "";
    }
};

export const checkVersion = async (ver) => {
    const indexJson = await getReleases();

    let version = ver;
    if (!["latest", "latest-lts"].includes(version)) {
        version = semver.valid(version);
        if (is.null(version)) {
            throw new error.NotValidException(`Invalid Node.js version: ${ver}`);
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
                throw new error.UnknownException(`Unknown Node.js version: ${ver}`);
            }
        }
    }

    return version;
};
