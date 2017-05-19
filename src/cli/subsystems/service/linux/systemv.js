const { std: { path, fs, child_process } } = adone;

const supportedos = ["debian", "centos", "redhat", "fedora", "ubuntu", "amzn"];
const getLinuxFlavor = () => {
    const family = adone.metrics.system.family.toLowerCase();

    let result = supportedos.find((name) => {
        return family === name;
    })[0];

    switch (result) {
        case "centos":
        case "fedora":
        case "amzn":
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

export default class extends adone.EventEmitter {
    constructor(config = {}) {
        super();

        this.config = config;
        this.scriptPath = path.join(adone.appinstance.adoneRootPath, "etc", "scripts", "startup", "service.js");
        this.templateRoot = path.join(adone.appinstance.adoneRootPath, "etc", "scripts", "startup", "systemv");
    }

    get exists() {
        return fs.existsSync(this._configFilePath());
    }

    _configFilePath() {
        return "/etc/init.d/omnitron";
    }

    async generate() {
        const osFamily = getLinuxFlavor();

        const context = {
            script: this.scriptPath,
            user: this.config.user,
            created: new Date()
        };

        return adone.templating.nunjucks.render(path.join(this.templateRoot, osFamily), context);
    }

    async createProcess() {
        const filepath = this._configFilePath();
        const exists = await adone.fs.exists(filepath);
        if (!exists) {
            const script = await this.generate();
            await adone.fs.writeFile(filepath, script);
            await adone.fs.chmod(filepath, "755");
            this.emit("install");
        } else {
            this.emit("alreadyinstalled");
        }
        return exists;
    }

    async removeProcess() {
        if (!(await adone.fs.exists(this._configFilePath()))) {
            return adone.fs.unlink(this._configFilePath());
        }
        this.emit("doesnotexist");
    }
}
