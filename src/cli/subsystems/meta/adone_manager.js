const { is, std, fs, util } = adone;

const getArch = () => {
    const arch = process.arch;
    switch (arch) {
        case "ia32": return "x32";
        default: return arch;
    }
};

export default class AdoneManager {
    constructor() {
        this.app = adone.appinstance;
        this.scriptName = is.win32 ? "adone.cmd" : "adone";
        this.nodePath = std.path.dirname(process.execPath);
        this.adoneScriptPath = std.path.join(this.nodePath, this.scriptName);
        this.nodeModulesDir = new fs.Directory(std.path.resolve(fs.homeDir(), ".node_modules"));
        this.destAdoneDir = this.nodeModulesDir.getDirectory("adone");
        this.adoneVersion = adone.package.version;
        this.name = `${process.platform}-${getArch()}.tar`;
    }

    async install() {
        const targets = this.getTargets();
        await this.destAdoneDir.create();
        await adone.fast.src(targets, { base: this.app.adoneRootPath }).dest(this.destAdoneDir.path());

        return this.installScript();
    }

    async installLink() {
        await this.nodeModulesDir.create();

        if (is.win32) {
            await fs.symlink(this.app.adoneRootPath, this.destAdoneDir.path(), "junction");
        } else {
            await fs.symlink(this.app.adoneRootPath, this.destAdoneDir.path());
        }

        return this.installScript();
    }

    async installScript() {
        const data = adone.templating.nunjucks.render(std.path.join(this.app.adoneDefaultsPath, "scripts", this.scriptName), { targetPath: this.destAdoneDir.resolve("bin", "adone.js") });
        await adone.fs.writeFile(this.adoneScriptPath, data);
        if (!is.win32) {
            await adone.fs.chmod(this.adoneScriptPath, 0o755);
        }
    }

    async uninstall() {
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

        try {
            await adone.fs.unlink(this.adoneScriptPath);
        } catch (err) {
        }
    }

    getArchiveName(type) {
        return `${this.name}.${type}`;
    }

    async createArchive(outPath, type = "gz") {
        return adone.fast
            .src(this.getTargets(), { base: this.app.adoneRootPath })
            .pack("tar", this.name)
            .compress(type)
            .dest(outPath);
    }

    getTargets() {
        return ["!**/*.map", "package.json", "README*", "LICENSE*"].concat(adone.package.files.map((x) => util.globize(x, { recursively: true })));
    }
}
