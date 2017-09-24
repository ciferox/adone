const {
    is,
    fs,
    std,
    tag,
    x,
    application: {
        STAGE_SYMBOL,
        SUBSYSTEMS_SYMBOL,
        STAGE_NEW,
        STAGE_CONFIGURING,
        STAGE_CONFIGURED,
        STAGE_INITIALIZING,
        STAGE_INITIALIZED,
        STAGE_UNINITIALIZING,
        STAGE_UNINITIALIZED
    }
} = adone;

export default class Subsystem extends adone.event.AsyncEmitter {
    constructor({ name = null } = {}) {
        super();

        this.name = name;

        this[STAGE_SYMBOL] = STAGE_NEW;
        this[SUBSYSTEMS_SYMBOL] = [];
        this.parent = null;
        this.app = this;
        this._ = this.data = {};
    }

    /**
     * Configures subsystem. This method should be redefined in derived class
     */
    configure() {
    }

    /**
     * Initializes subsystem. This method should be redefine in derived class
     */
    initialize() {
    }

    /**
     * Uninitializes subsystem. This method should be redefine in derived class
     */
    uninitialize() {
    }

    /**
     * Reinitializes subsystem.
     */
    async reinitialize() {
        await this.uninitialize();
        await this.initialize();
    }

    /**
     * Configures all subsystems
     * 
     * @returns {Promise<void>}
     */
    async configureSubsystems() {
        for (const sysInfo of this[SUBSYSTEMS_SYMBOL]) {
            await this._configureSubsystem(sysInfo); // eslint-disable-line
        }
    }

    /**
     * Initializes all subsystems.
     *
     * @returns {Promise<void>}
     */
    async initializeSubsystems() {
        for (const sys of this[SUBSYSTEMS_SYMBOL]) {
            await this._initializeSubsystem(sys); // eslint-disable-line
        }
    }

    /**
     * Uninitializes all subsystems.
     *
     * @returns {Promise<void>}
     */
    async uninitializeSubsystems() {
        for (let i = this[SUBSYSTEMS_SYMBOL].length; --i >= 0;) {
            await this._uninitializeSubsystem(this[SUBSYSTEMS_SYMBOL][i]); // eslint-disable-line
        }
        this[SUBSYSTEMS_SYMBOL].length = 0;
    }

    /**
     * Uninitializes specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    async uninitializeSubsystem(name) {
        for (const sysInfo of this[SUBSYSTEMS_SYMBOL]) {
            if (sysInfo.name === name) {
                await this._uninitializeSubsystem(sysInfo); // eslint-disable-line
                break;
            }
        }
    }

    /**
     * Returns subsystem instance by name
     *
     * @param {string} name Name of subsystem
     * @returns {adone.application.Subsystem}
     */
    subsystem(name) {
        const sysInfo = this.getSubsystemInfo(name);
        return sysInfo.instance;
    }

    /**
     * Initializes specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    async initializeSubsystem(name) {
        for (const sysInfo of this[SUBSYSTEMS_SYMBOL]) {
            if (sysInfo.name === name) {
                await this._initializeSubsystem(sysInfo); // eslint-disable-line
                break;
            }
        }
    }    

    defineCommand(...args) {
        return this.app.defineCommand(this, ...args);
    }

    /**
     * Adds a new subsystem to the application.
     *
     * @param {string|adone.application.Subsystem} subsystem Subsystem instance or absolute path.
     * @param {string} name Name of subsystem.
     * @param {string} description Description of subsystem.
     * @param {string} group Group of subsystem.
     * @param {array} configureArgs Arguments sending to configure() method of subsystem.
     * @param {boolean} addOnCommand If true, the subsystem will be added only if a command 'name' is requested.
     * @returns {null|Promise<object>}
     */
    async addSubsystem({ subsystem, name = null, description = "", group = "subsystem", configureArgs = [] } = {}) {
        let instance;
        if (is.string(subsystem)) {
            if (!std.path.isAbsolute(subsystem)) {
                throw new x.NotValid("Path must be absolute");
            }

            let SomeSubsystem = require(subsystem);
            if (SomeSubsystem.__esModule === true) {
                SomeSubsystem = SomeSubsystem.default;
            }
            instance = new SomeSubsystem({ name });
        } else if (is.subsystem(subsystem)) {
            instance = subsystem;
        } else {
            throw new x.NotValid("'subsystem' should be path or instance of adone.application.Subsystem");
        }

        if (!is.string(name)) {
            name = instance.constructor.name;
        }

        instance.parent = this;
        instance.app = this;

        const sysInfo = {
            name,
            description,
            group,
            configureArgs,
            instance,
            stage: STAGE_NEW
        };

        this[SUBSYSTEMS_SYMBOL].push(sysInfo);

        return sysInfo;
    }

    /**
     * Adds subsystems from specified path.
     *
     * @param {string} path Subsystems path.
     * @param {array|function} filter Array of subsystem names or filter [async] function '(name) => true | false'.
     * @returns {Promise<void>}
     */
    async addSubsystemsFrom(path, { useFilename = false, filter, group = "subsystem", configureArgs = [], addOnCommand = false } = {}) {
        if (this[STAGE_SYMBOL] !== STAGE_CONFIGURING) {
            throw new x.NotAllowed("Subsystem can be added only during configuration of the application");
        }

        if (!std.path.isAbsolute(path)) {
            throw new x.NotValid("Path should be absolute");
        }

        const files = await fs.readdir(path);

        if (is.array(filter)) {
            const targetNames = filter;
            filter = (name) => targetNames.includes(name);
        } else if (!is.function(filter)) {
            filter = adone.truly;
        }

        for (const file of files) {
            if (await filter(file)) { // eslint-disable-line
                let name = null;
                if (useFilename) {
                    name = std.path.basename(file);
                }
                // eslint-disable-next-line
                await this.addSubsystem({
                    name,
                    subsystem: std.path.join(path, file),
                    group,
                    configureArgs,
                    addOnCommand
                });
            }
        }
    }

    /**
     * Returns subsystem info by name
     *
     * @param {Subsystem} name Name of subsystem
     */
    getSubsystemInfo(name) {
        for (const sysInfo of this[SUBSYSTEMS_SYMBOL]) {
            if (sysInfo.name === name) {
                return sysInfo;
            }
        }

        throw new x.Unknown(`Unknown subsystem: ${name}`);
    }

    netron() {

    }

    async _configureSubsystem(sysInfo) {
        sysInfo.stage = STAGE_CONFIGURING;
        await sysInfo.instance._configure(...sysInfo.configureArgs);
        sysInfo.stage = STAGE_CONFIGURED;
    }

    async _initializeSubsystem(sysInfo) {
        if (sysInfo.stage === STAGE_CONFIGURED) {
            sysInfo.stage = STAGE_INITIALIZING;
            await sysInfo.instance._initialize();
            sysInfo.stage = STAGE_INITIALIZED;
        }
    }

    async _uninitializeSubsystem(sysInfo) {
        if (sysInfo.stage === STAGE_INITIALIZED) {
            sysInfo.stage = STAGE_UNINITIALIZING;
            await sysInfo.instance._uninitialize();
            sysInfo.stage = STAGE_UNINITIALIZED;
        }
    }

    async _configure(...args) {
        this[STAGE_SYMBOL] = STAGE_CONFIGURING;
        const result = await this.configure(...args);
        await this.configureSubsystems();
        this[STAGE_SYMBOL] = STAGE_CONFIGURED;
        return result;
    }

    async _initialize() {
        this[STAGE_SYMBOL] = STAGE_INITIALIZING;
        await this.initialize();
        await this.initializeSubsystems();
        this[STAGE_SYMBOL] = STAGE_INITIALIZED;
    }

    async _uninitialize() {
        this[STAGE_SYMBOL] = STAGE_UNINITIALIZING;
        await this.uninitialize();
        await this.uninitializeSubsystems();
        this[STAGE_SYMBOL] = STAGE_UNINITIALIZED;
    }
}
tag.set(Subsystem, tag.SUBSYSTEM);
