const {
    fs,
    std,
    project,
    vcs: { git }
} = adone;

const GITIGNORE_CONTENT =
    `# See http://help.github.com/ignore-files/ for more about ignoring files.

# IDEs and editors
/.idea
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace

# IDE - VSCode
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json

# misc
/.sass-cache
/connect.lock
/coverage
/libpeerconnection.log
npm-debug.log
testem.log
/typings

# e2e
/e2e/*.js
/e2e/*.map

# System Files
.DS_Store
Thumbs.db`;

export default class GitTask extends project.generator.task.Base {
    async run(info, context) {
        let gitignoreContent = GITIGNORE_CONTENT;
        if (!context.flag.skipNpm) {
            gitignoreContent += `
# dependencies
/node_modules`;
        }

        if (info.type !== "default") {
            gitignoreContent += `
# compiled output
/bin
/lib`;
        }
        this.manager.notify(this, "progress", {
            message: "{bold}git:{/bold} creating initial commit"
        });

        const time = adone.datetime.now() / 1000;
        const zoneOffset = adone.datetime().utcOffset();

        // Create .gitignore file
        await fs.writeFile(std.path.join(context.cwd, ".gitignore"), gitignoreContent);

        // Initialize repository, add all files to git and create first commit.
        const logoContent = await fs.readFile(std.path.join(adone.ETC_PATH, "media", "adone.txt"), { encoding: "utf8" });
        const repository = await git.Repository.init(context.cwd, 0);
        const index = await repository.refreshIndex();
        await index.addAll();
        await index.write();
        const oid = await index.writeTree();
        const author = git.Signature.create("ADONE", "info@adone.io", time, zoneOffset);
        const committer = git.Signature.create("ADONE", "info@adone.io", time, zoneOffset);
        await repository.createCommit("HEAD", author, committer, `initial commit from adone/cli v${adone.package.version}:\n\n  $ adone ${adone.runtime.app.argv.join(" ")}\n\n${logoContent}`, oid, []);
    }
}
