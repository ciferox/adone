import REPL from "./repl";

const {
    app,
    cli: { chalk }
} = adone;

// TODO: implement completer
// TODO: expose some REPL options to cli
export default ({ banner, prompt = "> " } = {}) => class REPLCommand extends app.Subsystem {
    @app.mainCommand()
    async repl(args, opts) {
        try {
            const r = new REPL({
                useGlobal: true,
                prompt: "> ",
                banner,
                writer: (obj) => adone.inspect(obj, { depth: 4, style: "color" }),
                ...opts.getAll()
            });

            r.start();
        } catch (err) {
            console.error(adone.pretty.error(err));
            return 1;
        }
    }
};
