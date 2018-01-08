const {
    application
} = adone;

const {
    DMainCliCommand,
    DCliCommand
} = application;


export default class Info extends application.Subsystem {
    @DMainCliCommand()
    main() {
        adone.info(`Node: ${process.version}`);
        adone.info(`v8: ${process.versions.v8}`);
        adone.info(`platform: ${process.platform}`);
    }

    @DCliCommand()
    node() {
        adone.info(process.version);
    }

    @DCliCommand()
    v8() {
        adone.info(process.versions.v8);
    }

    @DCliCommand()
    platform() {
        adone.info(process.platform);
    }
}
