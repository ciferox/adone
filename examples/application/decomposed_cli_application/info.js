const {
    app
} = adone;

const {
    MainCommandMeta,
    CommandMeta
} = app;


export default class Info extends app.Subsystem {
    @MainCommandMeta()
    main() {
        console.info(`Node: ${process.version}`);
        console.info(`v8: ${process.versions.v8}`);
        console.info(`platform: ${process.platform}`);
    }

    @CommandMeta()
    node() {
        console.info(process.version);
    }

    @CommandMeta()
    v8() {
        console.info(process.versions.v8);
    }

    @CommandMeta()
    platform() {
        console.info(process.platform);
    }
}
