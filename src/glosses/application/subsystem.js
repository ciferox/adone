const {
    is,
    fs,
    std,
    tag,
    x,
    application: {
        STATE
    }
} = adone;

const SUBSYSTEMS_SYMBOL = Symbol.for("application.Subsystem#subsystems");
const STATE_SYMBOL = Symbol.for("application.Subsystem#state");

export default class Subsystem extends adone.event.AsyncEmitter {
    constructor({ name = null } = {}) {
        super();

        this.name = name;
        this.parent = null;
        this[SUBSYSTEMS_SYMBOL] = [];
        this[STATE_SYMBOL] = STATE.INITIAL;
    }

    /**
     * Configures subsystem. This method should be redefined in derived class.
     */
    configure() {
    }

    /**
     * Initializes subsystem. This method should be redefined in derived class.
     */
    initialize() {
    }

    /**
     * Uninitializes subsystem. This method should be redefined in derived class.
     */
    uninitialize() {
    }

    /**
     * Configures all subsystems.
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
     * Configure specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    async configureSubsystem(name) {
        const sysInfo = this.getSubsystemInfo(name);
        await this._configureSubsystem(sysInfo);
    }

    /**
     * Initializes specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    async initializeSubsystem(name) {
        const sysInfo = this.getSubsystemInfo(name);
        await this._initializeSubsystem(sysInfo);
    }

    /**
     * Uninitializes specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    async uninitializeSubsystem(name) {
        const sysInfo = this.getSubsystemInfo(name);
        await this._uninitializeSubsystem(sysInfo);
    }

    /**
     * Returns subsystem instance by name.
     *
     * @param {string} name Name of subsystem
     * @returns {adone.application.Subsystem}
     */
    subsystem(name) {
        const sysInfo = this.getSubsystemInfo(name);
        return sysInfo.instance;
    }

    /**
     * Checks whether subsystem exists.
     * @param {*} name name of subsystem
     */
    hasSubsystem(name) {
        return this[SUBSYSTEMS_SYMBOL].findIndex((s) => s.name === name) >= 0;
    }

    /**
     * Return true if at least there is one subsystem.
     */
    hasSubsystems() {
        return this[SUBSYSTEMS_SYMBOL].length > 0;
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
    addSubsystem({ subsystem, name = null, description = "", group = "subsystem", configureArgs = [], transpile = false } = {}) {
        let instance;
        if (is.string(subsystem)) {
            if (!std.path.isAbsolute(subsystem)) {
                throw new x.NotValid("Path must be absolute");
            }
            let SomeSubsystem = transpile
                ? adone.require(subsystem)
                : require(subsystem);
            if (SomeSubsystem.__esModule === true) {
                SomeSubsystem = SomeSubsystem.default;
            }
            instance = new SomeSubsystem();
        } else {
            instance = subsystem;
        }

        if (!is.subsystem(instance)) {
            throw new x.NotValid("'subsystem' should be path or instance of adone.application.Subsystem");
        }

        if (!is.string(name)) {
            name = instance.constructor.name;
        }

        instance.parent = this;

        const sysInfo = {
            name,
            description,
            group,
            configureArgs,
            instance,
            state: STATE.INITIAL
        };

        this[SUBSYSTEMS_SYMBOL].push(sysInfo);

        return sysInfo;
    }

    /**
     * Deletes subsytem
     * @param {string} name subsystem name.
     */
    deleteSubsystem(name, force = false) {
        const index = this[SUBSYSTEMS_SYMBOL].findIndex((s) => s.name === name);
        if (index < 0) {
            throw new x.Unknown(`Unknown subsystem: ${name}`);
        }
        if (!force && ![STATE.INITIAL, STATE.UNINITIALIZED, STATE.FAILED].includes(this[SUBSYSTEMS_SYMBOL][index].state)) {
            throw new x.NotAllowed("The subsystem is used and can not be deleted");
        }

        this[SUBSYSTEMS_SYMBOL].splice(index, 1);
    }

    /**
     * Adds subsystems from specified path.
     *
     * @param {string} path Subsystems path.
     * @param {array|function} filter Array of subsystem names or filter [async] function '(name) => true | false'.
     * @returns {Promise<void>}
     */
    async addSubsystemsFrom(path, { useFilename = false, filter, group = "subsystem", configureArgs = [], addOnCommand = false } = {}) {
        if (this[STATE_SYMBOL] !== STATE.CONFIGURING) {
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
     * Returns subsystem info by name.
     *
     * @param {Subsystem} name Name of subsystem
     */
    getSubsystemInfo(name) {
        const sysInfo = this[SUBSYSTEMS_SYMBOL].find((s) => s.name === name);
        if (is.undefined(sysInfo)) {
            throw new x.Unknown(`Unknown subsystem: ${name}`);
        }
        return sysInfo;
    }

    /**
     * Returns list of all subsystem.
     */
    getSubsystems() {
        return this[SUBSYSTEMS_SYMBOL];
    }

    async _configureSubsystem(sysInfo) {
        sysInfo.state = STATE.CONFIGURING;
        await sysInfo.instance._configure(...sysInfo.configureArgs);
        sysInfo.state = STATE.CONFIGURED;
    }

    async _initializeSubsystem(sysInfo) {
        if (sysInfo.state === STATE.CONFIGURED) {
            sysInfo.state = STATE.INITIALIZING;
            await sysInfo.instance._initialize();
            sysInfo.state = STATE.INITIALIZED;
        }
    }

    async _uninitializeSubsystem(sysInfo) {
        if (sysInfo.state === STATE.INITIALIZED) {
            sysInfo.state = STATE.UNINITIALIZING;
            await sysInfo.instance._uninitialize();
            sysInfo.state = STATE.UNINITIALIZED;
        }
    }

    async _configure(...args) {
        this[STATE_SYMBOL] = STATE.CONFIGURING;
        const result = await this.configure(...args);
        await this.configureSubsystems();
        this[STATE_SYMBOL] = STATE.CONFIGURED;
        return result;
    }

    async _initialize() {
        this[STATE_SYMBOL] = STATE.INITIALIZING;
        await this.initialize();
        await this.initializeSubsystems();
        this[STATE_SYMBOL] = STATE.INITIALIZED;
    }

    async _uninitialize() {
        this[STATE_SYMBOL] = STATE.UNINITIALIZING;
        await this.uninitialize();
        await this.uninitializeSubsystems();
        this[STATE_SYMBOL] = STATE.UNINITIALIZED;
    }

    async _reinitialize(reconfigure = false) {
        await this._uninitialize();
        if (reconfigure) {
            this[STATE_SYMBOL] = STATE.INITIAL;
            await this._configure();
        } else {
            this[STATE_SYMBOL] = STATE.CONFIGURED;
        }
        await this.initialize();
    }
}
tag.add(Subsystem, "SUBSYSTEM");
