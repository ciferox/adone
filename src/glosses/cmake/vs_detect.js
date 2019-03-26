const {
    noop,
    system: { process: { execStdout } },
    std: { path }
} = adone;

export const isInstalled = async (version) => {
    const vsInstalled = (await this._isVSInstalled(version));
    const vsvNextInstalled = (await this._isVSvNextInstalled(version));
    const buildToolsInstalled = (await this._isBuildToolsInstalled(version));
    const foundByVSWhere = (await this._isFoundByVSWhere(version));

    return vsInstalled || vsvNextInstalled || buildToolsInstalled || foundByVSWhere;
};

export const _isFoundByVSWhere = async (version) => {
    const mainVer = version.split(".")[0];
    const command = path.resolve("vswhere.exe");
    try {
        const stdout = await execStdout(command, ["-version", version]);
        return stdout && stdout.indexOf(`installationVersion: ${mainVer}`) > 0;
    } catch (e) {
        noop(e);
    }
    return false;
};

export const _isBuildToolsInstalled = async (version) => {
    const mainVer = version.split(".")[0];
    let key;
    let testPhrase;
    if (Number(mainVer) >= 15) {
        key = `HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VS.windows_toolscore,v${mainVer}`;
        testPhrase = "Version";
    } else {
        key = `HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VS.VisualCppBuildTools_x86_enu,v${mainVer}`;
        testPhrase = "Visual C++";
    }

    try {
        const stdout = await execStdout("reg", ["query", `"${key}"`]);
        return stdout && stdout.indexOf(testPhrase) > 0;
    } catch (e) {
        return false;
    }
};

export const _isVSInstalled = async (version) => {
    // On x64 this will look for x64 keys only, but if VS and compilers installed properly,
    // it will write it's keys to 64 bit registry as well.
    try {
        const stdout = await execStdout("reg", ["query", `"HKLM\\Software\\Microsoft\\VisualStudio\\${version}"`]);
        if (stdout) {
            const lines = stdout.split("\r\n").filter((line) => {
                return line.length > 10;
            });
            if (lines.length >= 4) {
                return true;
            }
        }
    } catch (e) {
        return false;
    }
};

export const _isVSvNextInstalled = async (version) => {
    const mainVer = version.split(".")[0];
    try {
        const stdout = await execStdout("reg", ["query", `"HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VisualStudio.MinShell.Msi,v${mainVer}"`]);
        if (stdout) {
            const lines = stdout.split("\r\n").filter((line) => {
                return line.length > 10;
            });
            if (lines.length >= 3) {
                return true;
            }
        }
    } catch (e) {
        return false;
    }
};
