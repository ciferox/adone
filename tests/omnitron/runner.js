if (adone.is.nil(process.env.ADONE_HOME)) {
    let home = "";
    if (process.env.HOME && !process.env.HOMEPATH) {
        home = adone.std.path.resolve(process.env.HOME, ".adone_test");
    } else if (process.env.HOME || process.env.HOMEPATH) {
        home = adone.std.path.resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, ".adone_test");
    } else {
        home = adone.std.path.resolve("/etc", ".adone_test");
    }
    process.env.ADONE_HOME = home;
}

export default class OmnitronRunner extends adone.Application {
    constructor() {
        super();

        this.dispatcher = new adone.omnitron.Dispatcher(this, { noisily: false });
    }

    run() {
        return adone.fs.rm(process.env.ADONE_HOME).then(() => {
            return super.run({ ignoreArgs: true });
        });
    }

    startOmnitron() {
        return this.dispatcher.start();
    }

    async stopOmnitron({ clean = true, killChildren = true } = {}) {
        return this.dispatcher.kill({ clean, killChildren });
    }

    async restartOmnitron({ options, forceStart = false, killChildren = false } = {}) {
        await this.stopOmnitron({ clean: false, killChildren });
        await this.startOmnitron();
        await this.connectOmnitron({ options, forceStart });
    }

    connectOmnitron({ options, forceStart = false } = {}) {
        return this.dispatcher.connectLocal(options, forceStart);
    }

    getInterface(name) {
        return this.dispatcher.getInterface(name);
    }
}
