
class $$$Clean extends Task {
    async run() {
        await Promise.all(paths.map((x) => adone.fs.rm(x.dest)));
    }
}

class $$$Build extends Task {
    run() {
        return fast
            .map(paths)
            .error((err) => adone.error(err))
            .transpile(transpileOptions)
            .if((x) => x.relative === paths[0], fast.plugin.chmod(chmodOptions))
            .notify(notifyOptions)
            .dest();
    }
}

class $$$Watch extends Task {
    constructor() {
        this.stream = fast
            .watch(paths)
            .error((err) => adone.error(err))
            .transpile(transpileOptions)
            .if((x) => x.relative === paths[0], fast.plugin.chmod(chmodOptions))
            .notify(notifyOptions)
            .dest();
    }
    run() {
        return this.stream;
    }

    stop() {
        return this.stream.end();
    }
}

class $$$Default extends Task {
    async run() {
        await this.manager.run("$$$Clean");
        await this.manager.run("$$$Build");
        return this.manager.run("$$$Watch");
    }
}
