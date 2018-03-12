import appCMakeJSConfig from "./appCMakeJSConfig";

const {
    std: { path },
    cmake: { CMLog, Toolset, CMake, Dist },
    lodash: _
} = adone;

export default class BuildSystem {
    constructor(options) {
        this.options = options || {};
        this.options.directory = path.resolve(this.options.directory || process.cwd());
        this.log = new CMLog(this.options);
        const appConfig = appCMakeJSConfig(this.options.directory, this.log);
        if (_.isPlainObject(appConfig)) {
            if (_.keys(appConfig).length) {
                this.log.verbose("CFG", "Applying CMake.js config from root package.json:");
                this.log.verbose("CFG", JSON.stringify(appConfig));
                // Applying applications's config, if there is no explicit runtime related options specified
                this.options.runtime = this.options.runtime || appConfig.runtime;
                this.options.runtimeVersion = this.options.runtimeVersion || appConfig.runtimeVersion;
                this.options.arch = this.options.arch || appConfig.arch;
            }
        }
        this.log.verbose("CFG", "Build system options:");
        this.log.verbose("CFG", JSON.stringify(this.options));
        this.cmake = new CMake(this.options);
        this.dist = new Dist(this.options);
        this.toolset = new Toolset(this.options);
    }

    _showError(e) {
        if (this.log.level === "verbose" || this.log.level === "silly") {
            this.log.error("OMG", e.stack);
        } else {
            this.log.error("OMG", e.message);
        }
    }

    install() {
        return this._ensureInstalled();
    }


    getConfigureCommand() {
        return this._invokeCMake("getConfigureCommand");
    }

    configure() {
        return this._invokeCMake("configure");
    }

    getBuildCommand() {
        return this._invokeCMake("getBuildCommand");
    }

    build() {
        return this._invokeCMake("build");
    }

    getCleanCommand() {
        return this._invokeCMake("getCleanCommand");
    }

    clean() {
        return this._invokeCMake("clean");
    }

    reconfigure() {
        return this._invokeCMake("reconfigure");
    }

    rebuild() {
        return this._invokeCMake("rebuild");
    }

    compile() {
        return this._invokeCMake("compile");
    }

    async _ensureInstalled() {
        try {
            await this.toolset.initialize(true);
            await this.dist.ensureDownloaded();
        } catch (e) {
            this._showError(e);
            throw e;
        }
    }

    async _invokeCMake(method) {
        try {
            await this._ensureInstalled();
            return this.cmake[method]();
        } catch (e) {
            this._showError(e);
            throw e;
        }
    }
}
