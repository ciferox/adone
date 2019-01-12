const {
    app,
    omnitron,
    runtime: { logger }
} = adone;

const NAME = "Database subsystem";

export default class extends app.Subsystem {
    async configure() {
        logger.info(`${NAME} configured`);
    }

    async initialize() {
        this.root.db = await omnitron.DB.open();

        logger.info(`${NAME} initialized`);
    }

    async uninitialize() {
        await omnitron.DB.close();

        logger.info(`${NAME} uninitialized`);
    }
}
