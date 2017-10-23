const {
    application: {
        Subsystem,
        CliApplication
    }
} = adone;

const {
    MainCommand,
    Command
} = CliApplication;


export default class Info extends Subsystem {
    @MainCommand()
    main() {
        adone.info(`Node: ${process.version}`);
        adone.info(`v8: ${process.versions.v8}`);
        adone.info(`platform: ${process.platform}`);
    }

    @Command()
    node() {
        adone.info(process.version);
    }

    @Command()
    v8() {
        adone.info(process.versions.v8);
    }

    @Command()
    platform() {
        adone.info(process.platform);
    }
}
