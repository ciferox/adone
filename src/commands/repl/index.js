import REPL from "./repl";

const {
    app,
    cli: { chalk }
} = adone;

export default class REPLCommand extends app.Subsystem {
    @app.mainCommand()
    async repl(args, opts) {
        try {
            const r = new REPL({
                useGlobal: true,
                prompt: `${adone.text.unicode.approx(adone.text.unicode.symbol.pointer)} `,
                banner: `${chalk.bold.hex("689f63")("Node.JS")} ${process.version}, ${chalk.bold.hex("ab47bc")("ADONE")} v${adone.package.version}`,
                ...opts.getAll()
            });

            r.start();
        } catch (err) {
            console.error(adone.pretty.error(err));
            return 1;
        }
    }
}
