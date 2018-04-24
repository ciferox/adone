const {
    app,
    omnitron2
} = adone;

const NAME = "Database subsystem";

export default class extends app.Subsystem {
    async configure() {
        adone.logInfo(`${NAME} configured`);
    }

    async initialize() {
        this.root.db = await omnitron2.DB.open();

        adone.logInfo(`${NAME} initialized`);
    }

    async uninitialize() {
        await omnitron2.DB.close();

        adone.logInfo(`${NAME} uninitialized`);
    }
}
