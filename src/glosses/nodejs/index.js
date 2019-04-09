const {
    error,
    is,
    fs,
    semver,
    std
} = adone;

adone.lazify({
    NodejsManager: "./manager"
}, adone.asNamespace(exports), require);

export const getArchiveName = ({ version, platform = std.os.platform(), arch = std.os.arch(), archiveType = ".tar.xz" } = {}) => `node-${version}-${platform}-${arch}${archiveType}`;

export const getReleases = async () => (await adone.http.client.request("https://nodejs.org/download/release/index.json")).data;

export const getExePath = () => fs.which("node");

export const getPrefixPath = async () => std.path.dirname(std.path.dirname(await getExePath()));

export const getCurrentVersion = async () => {
    try {
        const exePath = await getExePath();
        return adone.system.process.execStdout(exePath, ["--version"]);
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
