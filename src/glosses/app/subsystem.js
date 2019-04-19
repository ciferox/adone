const {
    is,
    fs,
    std,
    error,
    app: {
        getSubsystemMeta,
        STATE
    },
    util
} = adone;

const getSortedList = (subsystem) => {
    const subsystems = subsystem.getSubsystems().slice();
    const edges = [];
    for (const sysInfo of subsystems) {
        const sysMeta = getSubsystemMeta(sysInfo.instance.constructor);
        if (sysMeta) {
            const deps = adone.util.arrify(sysMeta.dependencies);
            for (const name of deps) {
                edges.push([subsystem.getSubsystemInfo(name), sysInfo]);
            }
        }
    }
    return edges.length > 0 ? adone.util.toposort.array(subsystems, edges) : subsystems;
};

const SUBSYSTEM_FSM_SCHEME = {
    initial: STATE.INITIAL,
    fail: STATE.FAIL,
    transitions: [
        {
            name: "configure",
            from: [STATE.INITIAL, STATE.UNINITIALIZED, STATE.FAIL],
            to: [STATE.CONFIGURING, STATE.CONFIGURED]
        },
        {
            name: "initialize",
            from: [STATE.CONFIGURED, STATE.UNINITIALIZED],
            to: [STATE.INITIALIZING, STATE.INITIALIZED]
        },
        {
            name: "uninitialize",
            from: STATE.INITIALIZED,
            to: [STATE.UNINITIALIZING, STATE.UNINITIALIZED]
        }
    ]
};


export default class Subsystem extends adone.fsm.StateMachine {
    #root;
    #parent;
    #name;
    #subsystems = [];
    #owned = false;

    constructor({ name, transitions, allowedStates } = {}) {
        let scheme = util.clone(SUBSYSTEM_FSM_SCHEME);

        if (is.array(transitions)) {
            scheme.transitions.push(...transitions);
        }

        if (is.object(allowedStates)) {
            for (const transition of scheme.transitions) {
                if (is.propertyDefined(allowedStates, transition.name)) {
                    transition.from = [...util.arrify(transition.from), ...util.arrify(allowedStates[transition.name])];
                }
            }
        }

        super(scheme);

        this.#name = name;
    }

    /**
     * Returns name of subsystem
     */
    get name() {
        return this.#name;
    }

    set name(val) {
        throw new error.ImmutableException("Subsystem name property is immutable");
    }

    /**
     * Returns root subsystem. In most cases, the root subsystem is the application.
     */
    get root() {
        return this.#root;
    }

    set root(val) {
        throw new error.ImmutableException("Subsystem root property is immutable");
    }

    /**
     * Return true if this subsystem is root.
     */
    get isRoot() {
        return is.undefined(this.#root);
    }

    /**
     * Returns parent subsystem - supersystem
     */
    get parent() {
        return this.#parent;
    }

    set parent(val) {
        throw new error.ImmutableException("Subsytem parent property is immutable");
    }

    get owned() {
        return this.#owned;
    }

    set owned(val) {
        throw new error.ImmutableException("Subsytem owned property is immutable");
    }

    async configure(...args) {
        let result;
        if (is.function(this.onConfigure)) {
            result = await this.onConfigure(...args);
        }
        await this.configureSubsystems();
        return result;
    }

    async initialize(...args) {
        let result;
        if (is.function(this.onInitialize)) {
            result = await this.onInitialize(...args);
        }
        await this.initializeSubsystems();
        return result;
    }

    async uninitialize(...args) {
        let result;
        if (is.function(this.onUninitialize)) {
            result = await this.onUninitialize(...args);
        }
        await this.uninitializeSubsystems();
        return result;
    }

    async reinitialize(...args) {
        const r1 = await this.uninitialize(...args);
        const r2 = await this.initialize(...args);
        return [r1, r2];
    }

    /**
     * Configures all subsystems.
     *
     * @returns {Promise<void>}
     */
    async configureSubsystems() {
        const subsystems = getSortedList(this);
        for (const sysInfo of subsystems) {
            if (sysInfo.instance.isTransitionAllow("configure")) {
                await this.#configureSubsystem(sysInfo); // eslint-disable-line
            }
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
            if (sysInfo.instance.isTransitionAllow("initialize")) {
                await this.#initializeSubsystem(sysInfo); // eslint-disable-line
            }
        }
    }

    /**
     * Uninitializes all subsystems.
     *
     * @returns {Promise<void>}
     */
    async uninitializeSubsystems({ ignoreErrors = false, errorLogger = console.error } = {}) {
        const subsystems = getSortedList(this).reverse();
        for (const sysInfo of subsystems) {
            if (sysInfo.instance.isTransitionAllow("uninitialize")) {
                try {
                    await this.#uninitializeSubsystem(sysInfo); // eslint-disable-line
                } catch (err) {
                    if (ignoreErrors) {
                        is.function(errorLogger) && errorLogger(err);
                    }
                    throw err;
                }
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
        for (let i = this.#subsystems.length; --i >= 0;) {
            if (sysInfo.instance.isTransitionAllow("uninitialize")) {
                await this.#reinitializeSubsystem(this.#subsystems[i]); // eslint-disable-line
            }
        }
    }

    /**
     * Configures specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    configureSubsystem(name) {
        return this.#configureSubsystem(this.getSubsystemInfo(name));
    }

    /**
     * Loads subsystem and performs configuration and initialization phases.
     * 
     * @param {adone.app.Subsystem|string} subsystem instance of subsystem or path.
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
    async unloadSubsystem(name, timeout) {
        const { instance, path } = await this.getSubsystemInfo(name);

        switch (instance.getState()) {
            case STATE.CONFIGURING:
                await instance.waitUntilStateEnters(STATE.CONFIGURED, timeout);
                // May be break here?
            case STATE.INITIALIZING:
                await instance.waitUntilStateEnters(STATE.INITIALIZED, timeout);
            case STATE.INITIALIZED:
                await this.uninitializeSubsystem(name);
                break;
            case STATE.UNINITIALIZING:
                await instance.waitUntilStateEnters(STATE.UNINITIALIZED, timeout);
                break;
        }

        await this.deleteSubsystem(name);
        if (is.string(path)) {
            adone.require.uncache(path);
        }
    }

    /**
     * Initializes specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    initializeSubsystem(name) {
        return this.#initializeSubsystem(this.getSubsystemInfo(name));
    }

    /**
     * Uninitializes specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    uninitializeSubsystem(name) {
        return this.#uninitializeSubsystem(this.getSubsystemInfo(name));
    }

    /**
     * Reinitializes specified subsystem.
     *
     * @param {string} name Name of subsystem
     * @returns {Promise<void>}
     */
    reinitializeSubsystem(name) {
        return this.#reinitializeSubsystem(this.getSubsystemInfo(name));
    }

    /**
     * Returns subsystem instance by name.
     *
     * @param {string} name Name of subsystem
     * @returns {adone.app.Subsystem}
     */
    getSubsystem(name) {
        return this.getSubsystemInfo(name).instance;
    }

    /**
     * Checks whether subsystem exists.
     * @param {string} name name of subsystem
     */
    hasSubsystem(name) {
        return this.#subsystems.findIndex((s) => s.name === name) >= 0;
    }

    /**
     * Return true if at least there is one subsystem.
     */
    hasSubsystems(group) {
        let subsystems = this.#subsystems;
        if (is.string(group)) {
            subsystems = subsystems.filter((ss) => ss.group === group);
        }
        return subsystems.length > 0;
    }

    /**
     * Returns subsystem info by name.
     *
     * @param {Subsystem} name Name of subsystem
     */
    getSubsystemInfo(name) {
        const sysInfo = this.#subsystems.find((s) => s.name === name);
        if (is.undefined(sysInfo)) {
            throw new error.UnknownException(`Unknown subsystem: ${name}`);
        }
        return sysInfo;
    }

    /**
     * Returns list of all subsystem.
     */
    getSubsystems(group) {
        const subsystems = this.#subsystems;
        if (is.string(group)) {
            return subsystems.filter((ss) => ss.group === group);
        }

        return subsystems;
    }

    /**
     * Adds a new subsystem to the application.
     *
     * @param {string|adone.app.Subsystem} subsystem Subsystem instance or absolute path.
     * @param {string} name Name of subsystem.
     * @param {string} description Description of subsystem.
     * @param {string} group Group of subsystem.
     * @param {array} configureArgs Arguments sending to configure() method of subsystem.
     * @param {boolean} transpile Whether the code must be transpiled
     * @param {boolean} useFilename Resolve subsystem name from filename instead of class name.
     * @returns {null|Promise<object>}
     */
    addSubsystem({ subsystem, name = null, useFilename = false, description = "", group = "subsystem", configureArgs = [], transpile, bind, _basePath } = {}) {
        const instance = this.instantiateSubsystem(subsystem, { transpile });

        if (instance.#owned === true) {
            throw new error.NotAllowedException("Subsystem already owned by other subsystem");
        }

        if (is.string(subsystem) && useFilename) {
            if (is.string(_basePath)) {
                const relPath = std.path.normalize(std.path.relative(_basePath, subsystem));
                const dirName = std.path.dirname(relPath);
                name = dirName !== "."
                    ? dirName
                    : std.path.basename(relPath, ".js");
            } else {
                name = std.path.basename(subsystem, ".js");
            }
        }

        if (!is.string(name)) {
            name = instance.constructor.name;
        }

        if (this.hasSubsystem(name)) {
            throw new error.ExistsException(`Subsystem with name '${name}' already exists`);
        }

        const sysInfo = {
            name,
            description,
            group,
            configureArgs,
            instance,
            path: is.string(subsystem) ? subsystem : null
        };

        instance.#name = name;
        instance.#root = this.root || this;
        instance.#parent = this;
        instance.#owned = true;

        if (bind === true) {
            bind = name;
        }

        if (is.string(bind)) {
            if (this[bind]) {
                throw new error.NotAllowedException(`Property with name '${bind}' is already exist`);
            }
            this[bind] = instance;
            sysInfo.property = bind;
        }

        this.#subsystems.push(sysInfo);

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
            throw new error.NotValidException("Path should be absolute");
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
                    subsystem: fullPath,
                    _basePath: path
                };

                // eslint-disable-next-line
                this.addSubsystem(systemInfo);
            }
        }
    }

    /**
     * Returns instance of subsystem.
     * 
     * @param {adone.app.Subsystem|string} subsystem
     * @param {object} options 
     */
    instantiateSubsystem(subsystem, { transpile = false } = {}) {
        let instance;

        if (is.string(subsystem)) {
            if (!std.path.isAbsolute(subsystem)) {
                throw new error.NotValidException("Path must be absolute");
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
            throw new error.NotValidException("'subsystem' should be path or instance of adone.app.Subsystem");
        }

        return instance;
    }

    /**
     * Deletes subsytem.
     * 
     * @param {string} name subsystem name.
     */
    async deleteSubsystem(name, force = false) {
        const index = this.#subsystems.findIndex((s) => s.name === name);
        if (index < 0) {
            throw new error.UnknownException(`Unknown subsystem: ${name}`);
        }

        const sysInfo = this.#subsystems[index];
        const state = sysInfo.instance.getState();
        if (!force && ![STATE.INITIAL, STATE.UNINITIALIZED, STATE.FAIL].includes(state)) {
            throw new error.NotAllowedException(`The subsystem is used (state: ${state}) and can not be deleted`);
        }

        if (is.string(sysInfo.property) && is.subsystem(this[sysInfo.property])) {
            delete this[sysInfo.property];
        }

        this.#subsystems.splice(index, 1);

        const instance = sysInfo.instance;

        // TODO: allow more flexible way to handle this situation.
        // Fox example: providing onDelete() handler in subsystem.
        if (force && state === STATE.INITIALIZED) {
            await instance.uninitialize();
        }

        instance.#owned = false;
        instance.#root = undefined;
        instance.#parent = undefined;
    }

    #configureSubsystem(sysInfo) {
        return sysInfo.instance.configure(...sysInfo.configureArgs);
    }

    #initializeSubsystem(sysInfo) {
        return sysInfo.instance.initialize();
    }

    #uninitializeSubsystem(sysInfo) {
        return sysInfo.instance.uninitialize();
    }

    #reinitializeSubsystem(sysInfo) {
        return sysInfo.instance.reinitialize();
    }
}
