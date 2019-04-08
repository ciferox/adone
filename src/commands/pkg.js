const {
    is,
    fs,
    app: {
        Subsystem,
        mainCommand
    },
    std
} = adone;

export default class PackageCommand extends Subsystem {
    @mainCommand()
    async main(args, opts, { rest }) {
        
    }
}
