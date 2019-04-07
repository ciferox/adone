#!/usr/local/bin/node

import "..";
import Configuration from "../lib/app/configuration";

const {
    is,
    std,
    app
} = adone;

const {
    subsystem
} = app;

const command = (name) => std.path.join(__dirname, "..", "lib", "commands", name);

@subsystem({
    subsystems: [
        {
            name: "run",
            group: "common",
            description: "Run application/script/code",
            subsystem: command("run")
        },
        {
            name: "realm",
            group: "common",
            description: "Realm management",
            subsystem: command("realm")
        },
        {
            name: "inspect",
            group: "common",
            description: "Inspect adone namespace/object",
            subsystem: command("inspect")
        }
    ]
})
class AdoneCLI extends app.Application {
    async onConfigure() {
        !is.windows && this.exitOnSignal("SIGINT");

        this.config = await Configuration.load();

        this._configureLogger();

        // Expose cli interface for subsystems.
        // this.exposeCliInterface();

        // Add cli kit as a subsystem
        // this.addSubsystem({
        //     name: "kit",
        //     bind: true,
        //     subsystem: adone.cli.kit
        // });

        // Define command groups.
        const groups = this.config.getGroups();
        for (const group of groups) {
            this.helper.defineCommandsGroup(group);
        }

        await this._addInstalledSubsystems();
    }

    run() {
        const code = `
var a = function(a, b) {
    return a + b;
}`;

        const {
            js: { codeshift }
        } = adone;

        const j = codeshift;
        // codeshift(code)
        //     .find(codeshift.Identifier)
        //     .forEach((path) => {
        //         // do something with path
        //         console.log(path.node.name);
        //     });

        console.log(j(code)
            .find(j.FunctionExpression)
            // We check for this expression, as if it's in a function expression, we don't want to re-bind "this" by
            // using the arrowFunctionExpression. As that could potentially have some unintended consequences.
            .filter((p) => j(p).find(j.ThisExpression).size() == 0)
            .replaceWith((p) => {
                let body = p.value.body;
                // We can get a bit clever here. If we have a function that consists of a single return statement in it's body,
                // we can transform it to the more compact arrowFunctionExpression (a, b) => a + b, vs (a + b) => { return a + b }
                const useExpression = body.type === "BlockStatement" && body.body.length === 1 && body.body[0].type === "ReturnStatement";
                body = useExpression ? body.body[0].argument : body;
                return j.arrowFunctionExpression(p.value.params, body, useExpression);
            })
            .toSource());

        return 0;
        // print usage message by default
        console.log(`${this.helper.getHelpMessage()}\n`);
        return 0;
    }

    _configureLogger() {
        const {
            logging: { logger: { format } },
            cli: { chalk }
        } = adone;

        adone.app.runtime.logger.configure({
            level: "verbose",
            format: format.combine(
                format.colorize({
                    config: adone.logging.logger.config.adone
                }),
                format.padLevels(),
                format.printf((info) => {
                    let result = "";
                    if (is.string(info.prefix)) {
                        result += `[${info.prefix}] `;
                    }
                    if (is.string(info.icon)) {
                        result += `${info.icon}  `;
                    }
                    result += `${chalk.underline(info.level)}${info.message}`;
                    return result;
                })
            ),
            transports: [
                new adone.logging.logger.transport.Console()
            ]
        });
    }

    async _addInstalledSubsystems() {
        const commands = this.config.getCommands();
        for (const ss of commands) {
            // eslint-disable-next-line
            await this.helper.defineCommandFromSubsystem({
                ...adone.util.omit(ss, "name"),
                name: [ss.name, ...adone.util.arrify(ss.aliases)],
                lazily: true
            });
        }
    }
}

app.run(AdoneCLI, {
    useArgs: true
});
