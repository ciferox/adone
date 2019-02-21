const {
    is
} = adone;

export const getDefaultManager = async () => {
    if (is.undefined(adone.runtime.adoneProjectManager)) {
        const project = new adone.project.Manager({
            cwd: adone.ROOT_PATH
        });
        await project.load();
        adone.runtime.adoneProjectManager = project;
    }

    return adone.runtime.adoneProjectManager;
};

adone.lazify({
    Manager: "./manager",
    BaseTask: "./base_task",
    TransformTask: "./transform_task",
    task: "./tasks",
    helper: "./helpers"
}, adone.asNamespace(exports), require);
