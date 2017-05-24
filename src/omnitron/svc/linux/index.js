const { std: { path, fs } } = adone;

const supportedos = ["debian", "centos", "redhat", "fedora", "ubuntu"];

const getLinuxFlavor = () => {
    const family = adone.metrics.system.family.toLowerCase();

    let result = supportedos.find((name) => {
        return family === name;
    })[0];

    switch (result) {
        case "centos":
        case "fedora":
        case "redhat":
            result = "redhat";
            break;

        case "ubuntu":
        case "debian":
        default:
            result = "debian";
            break;
    }
    return result;
};

export default class Service {
    constructor(config = {}) {
        this.config = Object.assign({
            mode: "sysv",
            user: adone.util.userid.username(),
            group: adone.util.userid.groupname()
        }, config);

        if (!((this.config.mode === "sysd" && (fs.existsSync("/bin/systemctl") || fs.existsSync("/usr/bin/systemctl"))) ||
            (this.config.mode === "sysv" && fs.existsSync("/etc/init.d")))) {
            throw new Error("Could not detect init system");
        }

        this.scriptPath = path.join(__dirname, "..", "wrapper.js");
        this.templateRoot = path.join(adone.appinstance.adoneRootPath, "etc", "scripts", "omnitron");

        switch (this.config.mode) {
            case "sysv":
                this.startupScriptPath = "/etc/init.d/omnitron";
                break;
            case "sysd":
                this.startupScriptPath = "/etc/systemd/system/omnitron.service";
                break;
        }
    }

    async install() {
        const filePath = this.startupScriptPath;
        const exists = await adone.fs.exists(filePath);
        if (!exists) {
            const context = {
                script: this.scriptPath,
                user: this.config.user
            };

            if (this.config.mode === "sysv") {
                const osFamily = getLinuxFlavor();

                context.created = new Date();

                let templatePath;

                if (osFamily === "debian") {
                    templatePath = path.join(this.templateRoot, `sysv_${osFamily}`);
                } else {
                    templatePath = path.join(this.templateRoot, "sysd");
                }

                const script = await adone.templating.nunjucks.render(templatePath, context);
                await adone.fs.writeFile(filePath, script);
                adone.info(`Startup script '${filePath}' created`);
                await adone.fs.chmod(filePath, "755");
                adone.info("chmod => 755");
                if (osFamily === "debian") {
                    await adone.system.process.exec("/usr/sbin/update-rc.d", ["omnitron", "defaults"]);
                } else {
                    await adone.system.process.exec("/sbin/chkconfig", ["omnitron", "on"]);
                }
                adone.info("System startup enabled");
            } else if (this.config.mode === "sysd") {
                context.execPath = process.execPath;
                context.pidPath = adone.std.path.join(adone.appinstance.config.adone.home, "omnitron.pid");

                const script = await adone.templating.nunjucks.render(path.join(this.templateRoot, "sysd"), context);
                await adone.fs.writeFile(filePath, script);
                adone.info(`Startup script '${filePath}' created`);
                await adone.system.process.exec("systemctl", ["daemon-reload"]);
                await adone.system.process.exec("systemctl", ["enable", "omnitron.service"]);
                adone.info("System startup enabled");
            }
        } else {
            adone.info(`Startup script '${filePath}' already exists`);
        }

        return exists;
    }

    async uninstall() {
        const filePath = this.startupScriptPath;
        const exists = await adone.fs.exists(filePath);
        if (exists) {
            if (this.config.mode === "sysv") {
                const osFamily = getLinuxFlavor();

                if (osFamily === "debian") {
                    await adone.system.process.exec("/usr/sbin/update-rc.d", ["-f", "omnitron", "remove"]);
                } else {
                    await adone.system.process.exec("/sbin/chkconfig", ["omnitron", "off"]);
                }
            } else if (this.config.mode == "sysd") {
                await adone.system.process.exec("systemctl", ["disable", "omnitron.service"])
            }
            adone.info("System startup disabled");

            await adone.fs.unlink(filePath);
            adone.info(`Startup script '${filePath}' deleted`);
            return;
        }
        adone.info(`Startup script '${filePath}' not exists`);
    }
}
