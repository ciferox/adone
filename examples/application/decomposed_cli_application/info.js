const {
    app,
    runtime: { logger }
} = adone;

const {
    DMainCliCommand,
    DCliCommand
} = app;


export default class Info extends app.Subsystem {
    @DMainCliCommand()
    main() {
        logger.info(`Node: ${process.version}`);
        logger.info(`v8: ${process.versions.v8}`);
        logger.info(`platform: ${process.platform}`);
    }

    @DCliCommand()
    node() {
        logger.info(process.version);
    }

    @DCliCommand()
    v8() {
        logger.info(process.versions.v8);
    }

    @DCliCommand()
    platform() {
        logger.info(process.platform);
    }
}
