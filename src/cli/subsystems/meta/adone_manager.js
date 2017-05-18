const { is, std, fs, util } = adone;

const configRelativePath = "etc/configs/adone.js".replace(/\//g, std.path.sep);

const getArch = () => {
    const arch = process.arch;
    switch (arch) {
        case "ia32": return "x86";
        default: return arch;
    }
};

const getPlatform = () => {
    const platform = process.platform;
    switch (platform) {
        case "win32": return "win";
        default: return platform;
    }
};

export default class AdoneManager {
    constructor() {
        this.app = adone.appinstance;
        this.nodePath = std.path.dirname(process.execPath);
        // this.nodeModulesDir = new fs.Directory(std.path.resolve(fs.homeDir(), ".node_modules"));
        this.nodeModulesDir = new fs.Directory("/usr/local/lib/node");
        this.adoneVersion = adone.package.version;
        this.name = `${getPlatform()}-${getArch()}.tar`;
    }

    async install(name, dirName, env) {
        this.destAdoneDir = this.nodeModulesDir.getDirectory(name);
        if (!(await this.destAdoneDir.exists())) {
            await this.destAdoneDir.create();
            await adone.fast.src(this.getTargets(), { base: this.app.adoneRootPath })
                .if((f) => f.relative === configRelativePath, adone.fast.plugin.replace(["\"development\"", "\".adone_dev\""], [`"${env}"`, `"${dirName}"`])).dest(this.destAdoneDir.path());

            await this.installScript(name);
            return true;
        }
        return false;
    }

    async uninstall(name) {
        this.destAdoneDir = this.nodeModulesDir.getDirectory(name);
        if (await this.destAdoneDir.exists()) {
            // Temporary backup whole adone directory.
            const backupPath = await fs.tmpName();
            await this.destAdoneDir.copyTo(backupPath);
            try {
                await this.destAdoneDir.unlink();
            } catch (err) {
                // Recovery files in case of unsuccessful deletion.
                await this.destAdoneDir.copyFrom(backupPath, { ignoreExisting: true });
                throw err;
            }
        }

        return this.uninstallScript(name);
    }

    async installLink(name) {
        this.destAdoneDir = this.nodeModulesDir.getDirectory(name);
        const destPath = this.destAdoneDir.path();
        if (is.win32) {
            await fs.symlink(this.app.adoneRootPath, destPath, "junction");
        } else {
            await fs.symlink(this.app.adoneRootPath, destPath);
        }

        return this.installScript(name);
    }

    async uninstallLink(name) {
        this.destAdoneDir = this.nodeModulesDir.getDirectory(name);
        const destPath = this.destAdoneDir.path();
        const st = await adone.fs.lstat(destPath);
        if (st.isSymbolicLink()) {
            await adone.fs.rm(destPath);
        }
        return this.uninstallScript(name);
    }

    async installScript(name) {
        const scriptPath = this.getScriptPath(name);
        const data = await adone.templating.nunjucks.render(std.path.join(this.app.adoneEtcPath, "scripts", (is.win32 ? "adone.cmd" : "adone")), { targetPath: this.destAdoneDir.resolve("bin", "adone.js") });
        if (await adone.fs.exists(scriptPath)) {
            await adone.fs.unlink(scriptPath);
        }
        await adone.fs.writeFile(scriptPath, data);
        if (!is.win32) {
            await adone.fs.chmod(scriptPath, 0o755);
        }
    }

    async uninstallScript(name) {
        const scriptPath = this.getScriptPath(name);
        try {
            await adone.fs.unlink(scriptPath);
        } catch (err) {
        }
    }

    getScriptPath(name) {
        return std.path.join(this.nodePath, `${name}${(is.win32 ? ".cmd" : "")}`);
    }

    getArchiveName(type) {
        return `${this.name}.${type}`;
    }

    async createArchive(outPath, { env, dirName, type = "gz" } = {}) {
        return adone.fast
            .src(this.getTargets(), { base: this.app.adoneRootPath })
            .if((f) => f.relative === configRelativePath, adone.fast.plugin.replace(["\"development\"", "\".adone_dev\""], [`"${env}"`, `"${dirName}"`]))
            .pack("tar", this.name)
            .compress(type)
            .dest(outPath);
    }

    getTargets() {
        return ["!**/*.map", "package.json", "README*", "LICENSE*"].concat(["bin", "lib", "etc"].map((x) => util.globize(x, { recursively: true })));
    }
}
