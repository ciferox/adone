const {
    app
} = adone;

const {
    DMainCliCommand,
    DCliCommand
} = app;


export default class Info extends app.Subsystem {
    @DMainCliCommand()
    main() {
        adone.logInfo(`Node: ${process.version}`);
        adone.logInfo(`v8: ${process.versions.v8}`);
        adone.logInfo(`platform: ${process.platform}`);
    }

    @DCliCommand()
    node() {
        adone.logInfo(process.version);
    }

    @DCliCommand()
    v8() {
        adone.logInfo(process.versions.v8);
    }

    @DCliCommand()
    platform() {
        adone.logInfo(process.platform);
    }
}
