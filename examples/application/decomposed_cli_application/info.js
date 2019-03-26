const {
    app
} = adone;

const {
    mainCommand,
    command
} = app;


export default class Info extends app.Subsystem {
    @mainCommand()
    main() {
        console.info(`Node: ${process.version}`);
        console.info(`v8: ${process.versions.v8}`);
        console.info(`platform: ${process.platform}`);
    }

    @command()
    node() {
        console.info(process.version);
    }

    @command()
    v8() {
        console.info(process.versions.v8);
    }

    @command()
    platform() {
        console.info(process.platform);
    }
}
