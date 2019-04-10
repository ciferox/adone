const {
    app: {
        Subsystem,
        mainCommand
    },
} = adone;


export default class REPLCommand extends Subsystem {
    @mainCommand()
    async repl(args, opts) {
    }
}
