// gloss: "Library code exposed as namespace at runtime"
// app: Managed application
// app.command: "Command for cli applications"
// app.subsystem: "Generic subsystem for applications
// omnitron.task
// omnitron.service
// omnitron.subsystem
// realm.task
// realm.handler
// 

export const TAG = {
    PUB: "pub", // tasks available from anywhere
    OWN: "own", // tasks available only for realm managing them
    DEV: "dev"  // tasks available only for realm managin them in dev stage (not included in release)
};

const realm = adone.lazify({
    Configuration: "./configuration",
    DevConfiguration: "./dev_configuration",
    Manager: "./manager",
    BaseTask: "./base_task",
    TransformTask: "./transform_task",
    MountPoint: "./mount_point",
    code: "./code",
    rootRealm: () => new realm.Manager({ cwd: adone.ROOT_PATH })
}, adone.asNamespace(exports), require);
