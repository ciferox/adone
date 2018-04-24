const {
    app,
    fs,
    is,
    runtime: { term },
    std,
    templating
} = adone;

const {
    DCliCommand
} = app;

let SCRIPT_TEMPLATE;

if (is.windows) {
    SCRIPT_TEMPLATE = '"{{ nodePath }}" "{{ path }}" {{ command }}%*';
} else {
    SCRIPT_TEMPLATE =
        `#!/bin/sh
"{{ nodePath }}"  "{{ path }}" {{ command }}"$@"
ret=$?
exit $ret`;
}

export default class LinkManager extends app.Subsystem {
    constructor() {
        super();

        templating.nunjucks.configure({
            autoescape: false
        });

        this.nodeBinPath = std.path.dirname(process.execPath);
        this.nodeModulesPath = is.windows ? std.path.join(fs.homeDir(), ".node_modules") : "/usr/local/lib/node";
    }

    @DCliCommand({
        name: ["list", "l"],
        help: "Show all links"
    })
    async listCommand() {
        try {
            const cliConfig = await adone.cli.Configuration.load();
            const links = cliConfig.getLinks();

            if (links.length > 0) {
                adone.log(adone.pretty.table(links, {
                    style: {
                        head: ["gray"],
                        compact: true
                    },
                    model: [
                        {
                            id: "name",
                            header: "Name",
                            style: "{green-fg}"
                        },
                        {
                            id: "chain",
                            header: "Chain"
                        },
                        {
                            id: "path",
                            header: "Path"
                        }
                    ]
                }));
            } else {
                term.print("{white-fg}No links{/}\n");
            }

        } catch (err) {
            term.print(`{red-fg}${err.message}{/}\n`);
        }
    }

    @DCliCommand({
        name: ["create", "c"],
        help: "Create link",
        arguments: [
            {
                name: "name",
                type: /([a-zA-Z]+)/g,
                help: "Commands chain in dot notation or 'adone' for linking adone cli itself"
            },
            {
                name: "linkname",
                type: String,
                help: "Name of link"
            }
        ]
    })
    async createCommand(args) {
        try {
            const chain = args.get("name");
            const cliConfig = await adone.cli.Configuration.load();

            if (chain.length > 1 && chain[0] === "adone") {
                chain.shift();
            }

            const linkName = args.get("linkname");
            const scriptPath = this._getScriptPath(linkName);

            if (await fs.exists(scriptPath)) {
                throw new adone.error.Exists(`File '${scriptPath}' already exists`);
            }

            const isAdone = chain.length === 1 && chain[0] === "adone";

            if (isAdone) {
                // Create global link to adone root path
                const destPath = std.path.join(this.nodeModulesPath, linkName);
                await fs.mkdirp(this.nodeModulesPath);
                await fs.symlink(adone.ROOT_PATH, destPath, is.windows ? "junction" : undefined);
            } else {
                // It might be worth to check the existence of the commands chain...
            }

            const path = std.path.join(adone.ROOT_PATH, "bin", "adone.js");

            if (isAdone) {
                await fs.symlink(path, scriptPath);
            } else {
                const data = await templating.nunjucks.renderString(SCRIPT_TEMPLATE, {
                    path,
                    command: chain.map((part) => `"${part}" `).join(""),
                    nodePath: process.execPath
                });

                if (await adone.fs.exists(scriptPath)) {
                    await adone.fs.unlink(scriptPath);
                }
                await adone.fs.writeFile(scriptPath, data);
                if (!is.windows) {
                    await adone.fs.chmod(scriptPath, 0o755);
                }
            }

            const strChain = chain.join(" ");

            await cliConfig.addLink({
                name: linkName,
                path: scriptPath,
                chain: strChain
            }, true);

            term.print(`Global link '${linkName}' to ${isAdone ? `'${chain[0]}'` : `'${strChain}' command chain`} successfully created\n`);
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}\n`);
        }
    }

    @DCliCommand({
        name: ["delete", "d"],
        help: "Delete link",
        arguments: [
            {
                name: "linkname",
                type: String,
                help: "Name of link"
            }
        ]
    })
    async deleteCommand(args) {
        try {
            const linkName = args.get("linkname");
            const cliConfig = await adone.cli.Configuration.load();
            const linkInfo = cliConfig.getLink(linkName);

            if (linkInfo.chain === "adone") {
                const destPath = std.path.join(this.nodeModulesPath, linkName);
                if (await fs.exists(destPath)) {
                    const st = await adone.fs.lstat(destPath);
                    if (st.isSymbolicLink()) {
                        await adone.fs.unlink(destPath);
                    }
                }
                const scriptPath = this._getScriptPath(linkName);
                try {
                    await fs.unlink(scriptPath);
                } catch (err) {
                    //
                }
            } else {
                if (!(await fs.exists(linkInfo.path))) {
                    await cliConfig.deleteLink(linkName);
                    throw new adone.error.NotExists(`File '${linkInfo.path}' is not exist`);
                }

                await fs.unlink(linkInfo.path);
            }
            await cliConfig.deleteLink(linkName);
            term.print(`Global link to ${linkInfo.chain === "adone" ? "'adone'" : `'${linkInfo.chain}' command chain`} successfully deleted\n`);
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}\n`);
        }
    }

    _getScriptPath(name) {
        return std.path.join(this.nodeBinPath, `${name}${(is.windows ? ".cmd" : "")}`);
    }
}
