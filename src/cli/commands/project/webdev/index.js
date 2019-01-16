const {
    app: { logger, Subsystem, MainCommandMeta },
    project,
    runtime: { term }
} = adone;


export default class extends Subsystem {
    @MainCommandMeta({
    })
    async devCommand(args, opts) {
        try {
            adone.web.startCluster({});
        } catch (err) {
            adone.runtime.logger.error(err.stack);
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }
}
