const {
    fs,
    std,
    project,
    git
} = adone;

export default class GitTask extends project.BaseTask {
    async main(subCommand, info) {
        this.manager.notify(this, "progress", {
            message: "{bold}git:{/bold} creating initial commit"
        });

        switch (subCommand) {
            case "init":
                return this._init(info);
        }
    }

    async _init(info) {
        // Copy .gitignore file
        await fs.copy(std.path.join(__dirname, "gitignore_"), std.path.join(info.cwd, ".gitignore"));

        // Initialize repository, add all files to git and create first commit.
        const timestamp = adone.datetime.now() / 1000;
        const timezoneOffset = adone.datetime().utcOffset();

        const repo = {
            fs: adone.std.fs,
            dir: info.cwd
        };

        await git.init(repo);

        // const files = await fs.readdir(info.cwd);

        // for (const filepath of files) {
        //     // eslint-disable-next-line no-await-in-loop
        //     await git.add({
        //         ...repo,
        //         filepath
        //     });
        // }
        
        const sha = await git.commit({
            ...repo,
            timestamp,
            timezoneOffset,
            author: {
                name: "ADONE",
                email: "info@adone.io"
            },
            message: `initial commit from adone/cli v${adone.package.version}:\n\n${adone.adoneLogo}`
        });

        return sha;
    }
}
