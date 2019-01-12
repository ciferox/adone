const {
    app,
    omnitron
} = adone;

const NAME = "Database subsystem";

export default class extends app.Subsystem {
    async configure() {
        adone.logInfo(`${NAME} configured`);
    }

    async initialize() {
        this.root.db = await omnitron.DB.open();

        adone.logInfo(`${NAME} initialized`);
    }

    async uninitialize() {
        await omnitron.DB.close();

        adone.logInfo(`${NAME} uninitialized`);
    }
}
