const {
    app,
    runtime: { logger }
} = adone;

const {
    MainCommandMeta,
    CommandMeta
} = app;


export default class Info extends app.Subsystem {
    @MainCommandMeta()
    main() {
        logger.info(`Node: ${process.version}`);
        logger.info(`v8: ${process.versions.v8}`);
        logger.info(`platform: ${process.platform}`);
    }

    @CommandMeta()
    node() {
        logger.info(process.version);
    }

    @CommandMeta()
    v8() {
        logger.info(process.versions.v8);
    }

    @CommandMeta()
    platform() {
        logger.info(process.platform);
    }
}
