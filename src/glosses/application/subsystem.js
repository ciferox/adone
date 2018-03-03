const {
    is,
    fs,
    std,
    tag,
    error,
    meta: { reflect },
    application: {
        humanizeState,
        STATE,
        SUBSYSTEM_ANNOTATION
    }
} = adone;

const NAME_SYMBOL = Symbol();
const ROOT_SYMBOL = Symbol();
const PARENT_SYMBOL = Symbol();
const OWNED_SYMBOL = Symbol();
const STATE_SYMBOL = Symbol.for("application.Subsystem#state");
const SUBSYSTEMS_SYMBOL = Symbol.for("application.Subsystem#subsystems");

const getSortedList = (subsystem) => {
    const subsystems = subsystem[SUBSYSTEMS_SYMBOL].slice();
    const edges = [];
    for (const sysInfo of subsystems) {
        const sysMeta = reflect.getMetadata(SUBSYSTEM_ANNOTATION, sysInfo.instance.constructor);
        if (sysMeta) {
            const deps = adone.util.arrify(sysMeta.dependencies);
            for (const name of deps) {
                edges.push([subsystem.getSubsystemInfo(name), sysInfo]);
            }
        }
    }
    return edges.length > 0 ? adone.util.toposort.array(subsystems, edges) : subsystems;
};


export default class Subsystem extends adone.event.AsyncEmitter {
    constructor({ name } = {}) {
        super();

        this[NAME_SYMBOL] = name;
        this[SUBSYSTEMS_SYMBOL] = [];
        this[STATE_SYMBOL] = STATE.INITIAL;
        this[OWNED_SYMBOL] = false;
    }

    /**
     * Returns name of subsystem
     */
    get name() {
        return this[NAME_SYMBOL];
    }

    set name(val) {
        throw new error.NotAllowed("Subsystem name is immutable");
    }

    /**
     * Returns root subsystem. In most cases, the root subsystem is the application.
     */
    get root() {
        return this[ROOT_SYMBOL];
    }

    set root(val) {
        throw new error.NotAllowed("Subsystem root is immutable");
    }

    /**
     * Sets root subsystem.
     * 
     * Note: This method can call only root subsystems (by design), for example, the applications.
     */
    setRoot(root) {
        this[ROOT_SYMBOL] = root;
    }

    /**
     * Returns parent subsystem - supersystem
     */
    get parent() {
        return this[PARENT_SYMBOL];
    }

    set parent(val) {
        throw new error.NotAllowed("Subsytem parent is immutable");
    }

    /**
     * Returns current state
     */
    get state() {
        return this[STATE_SYMBOL];
    }

    set state(val) {
        throw new error.NotAllowed("Subsystem state is immutable");
    }

    get isOwned() {
        return this[OWNED_SYMBOL];
    }

    /**
     * Sets new state (im most cases it's not a good idea to change state unless the common logic is redefined).
     * @param {*} newState new state
     */
    setState(newState) {
        this[STATE_SYMBOL] = newState;
        this.emit("state", newState);
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
                    reject(new error.Timeout(`Timeout occured while waiting for state: ${expectedState}`));
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
        const subsystems = getSortedList(this);
        for (const sysInfo of subsystems) {
            await this._configureSubsystem(sysInfo); // eslint-disable-line
        }
    }

    /**
     * Initializes all subsystems.
     *
     * @returns {Promise<void>}
     */
    async initializeSubsystems() {
        const subsystems = getSortedList(this);
        for (const sysInfo of subsystems) {
            await this._initializeSubsystem(sysInfo); // eslint-disable-line
        }
    }

    /**
     * Uninitializes all subsystems.
     *
     * @returns {Promise<void>}
     */
    async uninitializeSubsystems({ ignoreErrors = false, errorLogger = adone.logError } = {}) {
        const subsystems = getSortedList(this).reverse();
        for (const sysInfo of subsystems) {
            try {
                await this._uninitializeSubsystem(sysInfo); // eslint-disable-line
            } catch (err) {
                if (ignoreErrors) {
                    is.function(errorLogger) && errorLogger(err);
                }
                throw err;
            }
        }
    }

    // TODO: Incorrect implementation
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
     * Configures specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    async configureSubsystem(name) {
        const sysInfo = this.getSubsystemInfo(name);
        await this._configureSubsystem(sysInfo);
    }

    /**
     * Loads subsystem and performs configuration and initialization phases.
     * 
     * @param {adone.application.Subsystem|string} subsystem instance of subsystem or path.
     * @param {object} options 
     */
    async loadSubsystem(subsystem, { name = null, description = "", group, transpile = false } = {}) {
        const sysInfo = this.addSubsystem({ subsystem, name, description, group, transpile });
        name = sysInfo.name;
        await this.configureSubsystem(name);
        await this.initializeSubsystem(name);
        return sysInfo;
    }

    /**
     * Uninitializes subsystem and performs full unload of subsystem including require cache.
     * 
     * @param {string} name 
     */
    async unloadSubsystem(name) {
        const { instance, path } = await this.getSubsystemInfo(name);
        switch (instance[STATE_SYMBOL]) {
            case STATE.INITIALIZED:
                await this.uninitializeSubsystem(name);
                break;
            case STATE.INITIALIZING:
            case STATE.CONFIGURED: // ?
            case STATE.CONFIGURING: // ?
                await instance.waitForState(STATE.INITIALIZED);
                await this.uninitializeSubsystem(name);
                break;
            case STATE.UNINITIALIZING:
                await instance.waitForState(STATE.UNINITIALIZED);
                break;
        }
        await this.deleteSubsystem(name);
        if (is.string(path)) {
            adone.require.cache.unref(path);
        }
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
     * Reinitializes specified subsystem.
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
    getSubsystem(name) {
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
     * @param {boolean} transpile Whether the code must be transpiled
     * @returns {null|Promise<object>}
     */
    addSubsystem({ subsystem, name = null, useFilename = false, description = "", group = "subsystem", configureArgs = [], transpile, bind } = {}) {
        const instance = this.instantiateSubsystem(subsystem, { transpile });

        if (instance[OWNED_SYMBOL] === true) {
            throw new error.NotAllowed("Subsystem already owned by other subsystem");
        }

        if (is.string(subsystem) && useFilename) {
            name = std.path.basename(subsystem, ".js");
        }

        if (!is.string(name)) {
            name = instance.constructor.name;
        }

        if (this.hasSubsystem(name)) {
            throw new error.Exists(`Subsystem with name '${name}' already exists`);
        }

        const sysInfo = {
            name,
            description,
            group,
            configureArgs,
            instance,
            path: is.string(subsystem) ? subsystem : null
        };

        instance[NAME_SYMBOL] = name;
        instance[ROOT_SYMBOL] = this.root;
        instance[PARENT_SYMBOL] = this;
        instance[OWNED_SYMBOL] = true;

        if (bind === true) {
            bind = name;
        }

        if (is.string(bind)) {
            if (this[bind]) {
                throw new error.NotAllowed(`Property with name '${bind}' is already exist`);
            }
            this[bind] = instance;
            sysInfo.property = bind;
        }

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
    async addSubsystemsFrom(path, { filter, ...options } = {}) {
        if (!std.path.isAbsolute(path)) {
            throw new error.NotValid("Path should be absolute");
        }

        const files = await fs.readdir(path);

        if (is.array(filter)) {
            const targetNames = filter;
            filter = (name) => targetNames.includes(name);
        } else if (!is.function(filter)) {
            filter = adone.truly;
        }

        for (const file of files) {
            let fullPath = std.path.join(path, file);
            const st = await fs.lstat(fullPath); // eslint-disable-line
            if (st.isDirectory()) {
                fullPath = std.path.join(fullPath, "index.js");
                // eslint-disable-next-line
                if (!(await fs.exists(fullPath))) {
                    continue;
                }
            } else if (st.isFile()) {
                if (!file.endsWith(".js")) {
                    continue;
                }
            } else if (!st.isSymbolicLink()) {
                continue;
            }

            if (await filter(file)) { // eslint-disable-line
                const systemInfo = {
                    ...options,
                    subsystem: fullPath
                };

                // eslint-disable-next-line
                this.addSubsystem(systemInfo);
            }
        }
    }

    /**
     * Returns instance of subsystem.
     * 
     * @param {adone.application.Subsystem|string} subsystem
     * @param {object} options 
     */
    instantiateSubsystem(subsystem, { transpile = false } = {}) {
        let instance;

        if (is.string(subsystem)) {
            if (!std.path.isAbsolute(subsystem)) {
                throw new error.NotValid("Path must be absolute");
            }
            let SubsystemClass = adone.require(subsystem, { transpile });
            if (SubsystemClass.__esModule === true) {
                SubsystemClass = SubsystemClass.default;
            }
            instance = new SubsystemClass();
        } else {
            instance = subsystem;
        }

        if (!is.subsystem(instance)) {
            throw new error.NotValid("'subsystem' should be path or instance of adone.application.Subsystem");
        }

        return instance;
    }

    /**
     * Deletes subsytem
     * @param {string} name subsystem name.
     */
    deleteSubsystem(name, force = false) {
        const index = this[SUBSYSTEMS_SYMBOL].findIndex((s) => s.name === name);
        if (index < 0) {
            throw new error.Unknown(`Unknown subsystem: ${name}`);
        }
        if (!force && ![STATE.INITIAL, STATE.UNINITIALIZED, STATE.FAILED].includes(this[SUBSYSTEMS_SYMBOL][index].instance[STATE_SYMBOL])) {
            throw new error.NotAllowed("The subsystem is used and can not be deleted");
        }

        const sysInfo = this[SUBSYSTEMS_SYMBOL][index];
        if (is.string(sysInfo.property) && is.subsystem(this[sysInfo.property])) {
            delete this[sysInfo.property];
        }

        this[SUBSYSTEMS_SYMBOL].splice(index, 1);

        const instance = sysInfo.instance;
        instance[OWNED_SYMBOL] = false;
        instance[STATE_SYMBOL] = STATE.INITIAL;
        instance[ROOT_SYMBOL] = undefined;
        instance[PARENT_SYMBOL] = undefined;

    }

    /**
     * Returns subsystem info by name.
     *
     * @param {Subsystem} name Name of subsystem
     */
    getSubsystemInfo(name) {
        const sysInfo = this[SUBSYSTEMS_SYMBOL].find((s) => s.name === name);
        if (is.undefined(sysInfo)) {
            throw new error.Unknown(`Unknown subsystem: ${name}`);
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
            throw new error.IllegalState(`Illegal state of '${sysInfo.name}' subsystem for configure: ${humanizeState(sysInfo.instance[STATE_SYMBOL])}`);
        }
    }

    async _initializeSubsystem(sysInfo) {
        if (sysInfo.instance[STATE_SYMBOL] === STATE.CONFIGURED) {
            await sysInfo.instance._initialize();
        } else if (sysInfo.instance[STATE_SYMBOL] !== STATE.INITIALIZED) {
            throw new error.IllegalState(`Illegal state of '${sysInfo.name}' subsystem for initialize: ${humanizeState(sysInfo.instance[STATE_SYMBOL])}`);
        }
    }

    async _uninitializeSubsystem(sysInfo) {
        if (sysInfo.instance[STATE_SYMBOL] === STATE.INITIALIZED) {
            await sysInfo.instance._uninitialize();
        } else if (sysInfo.instance[STATE_SYMBOL] !== STATE.UNINITIALIZED) {
            throw new error.IllegalState(`Illegal state of '${sysInfo.name}' subsystem for uninitialize: ${humanizeState(sysInfo.instance[STATE_SYMBOL])}`);
        }
    }

    async _reinitializeSubsystem(sysInfo) {
        if (sysInfo.instance[STATE_SYMBOL] === STATE.INITIALIZED) {
            await sysInfo.instance._reinitialize();
        } else {
            throw new error.IllegalState(`Illegal state of '${sysInfo.name}' subsystem for reinitialize: ${humanizeState(sysInfo.instance[STATE_SYMBOL])}`);
        }
    }

    async _configure(...args) {
        this.setState(STATE.CONFIGURING);
        await this.configure(...args);
        await this.configureSubsystems();
        this.setState(STATE.CONFIGURED);
    }

    async _initialize() {
        this.setState(STATE.INITIALIZING);
        await this.initialize();
        await this.initializeSubsystems();
        this.setState(STATE.INITIALIZED);
    }

    async _uninitialize() {
        this.setState(STATE.UNINITIALIZING);
        await this.uninitialize();
        await this.uninitializeSubsystems();
        this.setState(STATE.UNINITIALIZED);
    }

    async _forceConfigured() {
        this.setState(STATE.CONFIGURED);
        for (const sysInfo of this[SUBSYSTEMS_SYMBOL]) {
            sysInfo.instance._forceConfigured();
        }
    }

    async _reinitialize() {
        await this._uninitialize();
        await this._forceConfigured();
        await this._initialize();
    }
}
tag.add(Subsystem, "SUBSYSTEM");
