const { is, js: { compiler: { parse, traverse } } } = adone;

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "specter",
            group: "subsystem",
            help: "cli interface for unified system management",
            arguments: [
                {
                    name: "host",
                    type: String,
                    nargs: "+",
                    default: "localhost",
                    help: "host identity(ies)"
                }
            ],
            options: [
                {
                    name: ["--execute", "--exec", "-e"],
                    holder: "METHOD",
                    type: String,
                    default: "sysinfo",
                    help: "execute supplied method"
                }
            ],
            handler: this.mainCommand
        });
    }

    async mainCommand(args, opts) {
        const spec = await adone.specter();

        const expr = opts.get("e");
        const ast = parse(expr);
        let methodName;
        const methodArgs = [];
        traverse(ast, {
            Identifier(path) {
                methodName = path.node.name;
            },
            CallExpression(path) {
                methodName = path.node.callee.name;
                for (const a of path.node.arguments) {
                    switch (a.type) {
                        case "StringLiteral": methodArgs.push(a.value);
                    }
                }
                path.stop();
            }
        });

        if (!is.function(spec[methodName])) {
            throw new adone.x.Unknown(`Unknown method: ${methodName}`);
        }

        for (const host of args.get("host")) {
            try {
                await spec.addHost(host);
            } catch (err) {
                adone.error(err.message);
            }
        }

        const results = await spec[methodName](...methodArgs);
        for (const r of results) {
            adone.log(`Host: ${r.host.toString()}`);
            adone.log(adone.text.pretty.json(r.result));
            adone.log();
        }

        // if (result === "") {
        //     adone.info("nodejs not found, trying to install it...");
        //     adone.log(adone.std.path.join(this.adoneEtcPath, "scripts", "avm"));
        //     const remotePath = `/home/${sshSession.options.username}`;
        //     const remoteAvmBin = `${remotePath}/avm/avm`;
        //     await sshSession.putFile(adone.std.path.join(this.adoneEtcPath, "scripts", "avm"), remoteAvmBin);
        //     await sshSession.chmod(remoteAvmBin, 777);
        //     const nodeInstallCmd = `sudo ${remotePath}/avm/avm --prefix ${remotePath} latest`;
        //     adone.log(nodeInstallCmd);
        //     const result = (await sshSession.execOne(nodeInstallCmd));
        //     adone.log(result);
        // } else {
        //     adone.log(`Node path: ${result}`);
        //     adone.log(`Node version: ${(await sshSession.execOne("node --version")).replace(/[\n\r]/g, "")}`);
        // }

        return 0;
    }
}
