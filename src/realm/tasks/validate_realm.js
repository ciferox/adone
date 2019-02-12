const {
    task
} = adone;

export default class ValidateRealmTask extends task.Task {
    async run() {
        const REQUIRED_PATHS = [
            this.manager.config.RUNTIME_PATH,
            this.manager.config.VAR_PATH,
            this.manager.config.PACKAGES_PATH,
            this.manager.config.CONFIGS_PATH
        ];

        for (const p of REQUIRED_PATHS) {
            // eslint-disable-next-line
            if (!(await fs.exists(p))) {
                throw new adone.error.IllegalStateException("Realm is not initialized");
            }
        }
    }
}
