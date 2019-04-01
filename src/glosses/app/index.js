const {
    is
} = adone;

export const STATE = {
    INITIAL: "initial",
    CONFIGURING: "configuring",
    CONFIGURED: "configured",
    INITIALIZING: "initializing",
    INITIALIZED: "initialized",
    RUNNING: "running",
    UNINITIALIZING: "uninitializing",
    UNINITIALIZED: "uninitialized",
    FAIL: "fail"
};

// Decorators
const SUBSYSTEM_ANNOTATION = "subsystem";

const setSubsystemMeta = (target, info) => Reflect.defineMetadata(SUBSYSTEM_ANNOTATION, info, target);
export const getSubsystemMeta = (target) => Reflect.getMetadata(SUBSYSTEM_ANNOTATION, target);

const SubsystemDecorator = (sysInfo = {}) => (target) => {
    const info = getSubsystemMeta(target);
    if (is.undefined(info)) {
        setSubsystemMeta(target, sysInfo);
    } else {
        Object.assign(info, sysInfo);
    }
};

export const subsystem = SubsystemDecorator;
export const mainCommand = (info = {}) => (target, key, descriptor) => {
    let sysMeta = getSubsystemMeta(target.constructor);
    info.handler = descriptor.value;
    if (is.undefined(sysMeta)) {
        if (target instanceof adone.app.Application) {
            sysMeta = {
                mainCommand: info
            };
        } else {
            sysMeta = info;
        }
        setSubsystemMeta(target.constructor, sysMeta);
    } else {
        if (target instanceof adone.app.Application) {
            sysMeta.mainCommand = info;
        } else {
            Object.assign(sysMeta, info);
        }
    }
};
export const command = (commandInfo = {}) => (target, key, descriptor) => {
    let sysMeta = getSubsystemMeta(target.constructor);
    commandInfo.handler = descriptor.value;
    if (is.undefined(sysMeta)) {
        sysMeta = {
            commands: [
                commandInfo
            ]
        };
        setSubsystemMeta(target.constructor, sysMeta);
    } else {
        if (!is.array(sysMeta.commands)) {
            sysMeta.commands = [
                commandInfo
            ];
        } else {
            sysMeta.commands.push(commandInfo);
        }
    }
};

adone.lazify({
    Subsystem: "./subsystem",
    Application: "./application",
    AppHelper: "./app_helper",
    lockfile: "./lockfile",
    run: "./run"
}, adone.asNamespace(exports), require);

// application runtime
export const runtime = {
    app: null,
    lockFiles: {},
    logger: adone.logging.logger.create({
        level: "info"
    })
};
