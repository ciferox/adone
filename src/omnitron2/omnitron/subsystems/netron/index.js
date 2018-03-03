const {
    application,
    runtime
} = adone;

const NAME = "Netron subsystem";

export default class extends application.Subsystem {
    async configure() {
        adone.logInfo(`${NAME} configured`);
    }

    async initialize() {
        await runtime.netron2.attachContext(this.root, "omnitron");
        adone.logInfo("Omnitron context attached");

        adone.logInfo(`${NAME} initialized`);
    }

    async uninitialize() {
        if (runtime.netron2.hasContext("omnitron")) {
            await runtime.netron2.detachContext("omnitron");
            adone.logInfo("Omnitron context detached");
        }
        adone.logInfo(`${NAME} uninitialized`);
    }
}
