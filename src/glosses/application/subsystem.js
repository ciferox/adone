const {
    is,
    fs,
    std,
    tag,
    x,
    application: {
        humanizeState,
        STATE
    }
} = adone;

const STATE_SYMBOL = Symbol.for("application.Subsystem#state");
const SUBSYSTEMS_SYMBOL = Symbol.for("application.Subsystem#subsystems");

export default class Subsystem extends adone.event.AsyncEmitter {
    constructor({ name = null } = {}) {
        super();

        this.name = name;
        this.parent = null;
        this[SUBSYSTEMS_SYMBOL] = [];
        this[STATE_SYMBOL] = STATE.INITIAL;
    }

    /**
     * Returns current state
     */
    getState() {
        return this[STATE_SYMBOL];
    }

    /**
     * Sets new state (im most cases it's not a good idea to change state unless the common logic is redifined).
     * @param {*} newState new state
     */
    async setState(newState) {
        this[STATE_SYMBOL] = newState;
        await this.emitParallel("state", newState);
    }

    /**
     * Returns promise that will be resolved when state become as expected.
     * @param {*} expectedState state for wating
     * @param {*} timeout waiting timeout 
     */
    waitForState(expectedState, timeout) {
        return new Promise((resolve, reject) => {
            const awaiter = (state) => {
                if (state === expectedState) {
                    this.removeListener("state", awaiter);
                    resolve();
                }
            };
            this.on("state", awaiter);
            if (is.number(timeout) && timeout > 0) {
                setTimeout(() => {
                    this.removeListener("state", awaiter);
                    reject(new adone.x.Timeout(`Timeout occured while waiting for state: ${expectedState}`));
                }, timeout);
            }
        });
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
        for (const sysInfo of this[SUBSYSTEMS_SYMBOL]) {
            await this._initializeSubsystem(sysInfo); // eslint-disable-line
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
    }

    /**
     * Reinitializes all subsystems.
     *
     * @returns {Promise<void>}
     */
    async reinitializeSubsystems() {
        for (let i = this[SUBSYSTEMS_SYMBOL].length; --i >= 0;) {
            await this._reinitializeSubsystem(this[SUBSYSTEMS_SYMBOL][i]); // eslint-disable-line
        }
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
     * Reinitializa specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    async reinitializeSubsystem(name) {
        const sysInfo = this.getSubsystemInfo(name);
        await this._reinitializeSubsystem(sysInfo);
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
            instance
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
        if (!force && ![STATE.INITIAL, STATE.UNINITIALIZED, STATE.FAILED].includes(this[SUBSYSTEMS_SYMBOL][index][STATE_SYMBOL])) {
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
        if (sysInfo.instance[STATE_SYMBOL] === STATE.INITIAL) {
            await sysInfo.instance._configure(...sysInfo.configureArgs);
        } else if (sysInfo.instance[STATE_SYMBOL] !== STATE.CONFIGURED) {
            throw new adone.x.IllegalState(`Illegal state of '${sysInfo.name}' subsystem for configure: ${humanizeState(sysInfo.instance[STATE_SYMBOL])}`);
        }
    }

    async _initializeSubsystem(sysInfo) {
        if (sysInfo.instance[STATE_SYMBOL] === STATE.CONFIGURED) {
            await sysInfo.instance._initialize();
        } else if (sysInfo.instance[STATE_SYMBOL] !== STATE.INITIALIZED) {
            throw new adone.x.IllegalState(`Illegal state of '${sysInfo.name}' subsystem for initialize: ${humanizeState(sysInfo.instance[STATE_SYMBOL])}`);
        }
    }

    async _uninitializeSubsystem(sysInfo) {
        if (sysInfo.instance[STATE_SYMBOL] === STATE.INITIALIZED) {
            await sysInfo.instance._uninitialize();
        } else if (sysInfo.instance[STATE_SYMBOL] !== STATE.UNINITIALIZED) {
            throw new adone.x.IllegalState(`Illegal state of '${sysInfo.name}' subsystem for uninitialize: ${humanizeState(sysInfo.instance[STATE_SYMBOL])}`);
        }
    }

    async _reinitializeSubsystem(sysInfo) {
        if (sysInfo.instance[STATE_SYMBOL] === STATE.INITIALIZED) {
            await sysInfo.instance._reinitialize();
        } else {
            throw new adone.x.IllegalState(`Illegal state of '${sysInfo.name}' subsystem for reinitialize: ${humanizeState(sysInfo.instance[STATE_SYMBOL])}`);
        }
    }

    async _configure(...args) {
        await this.setState(STATE.CONFIGURING);
        await this.configure(...args);
        await this.configureSubsystems();
        await this.setState(STATE.CONFIGURED);
    }

    async _initialize() {
        await this.setState(STATE.INITIALIZING);
        await this.initialize();
        await this.initializeSubsystems();
        await this.setState(STATE.INITIALIZED);
    }

    async _uninitialize() {
        await this.setState(STATE.UNINITIALIZING);
        await this.uninitialize();
        await this.uninitializeSubsystems();
        await this.setState(STATE.UNINITIALIZED);
    }

    async _forceInitialize() {
        await this.setState(STATE.CONFIGURED);
        for (const sysInfo of this[SUBSYSTEMS_SYMBOL]) {
            sysInfo.instance._forceInitialize();
        }
    }

    async _reinitialize() {
        await this._uninitialize();
        await this._forceInitialize();
        await this._initialize();
    }
}
tag.add(Subsystem, "SUBSYSTEM");
