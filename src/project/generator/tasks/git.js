const {
    fs,
    std,
    project,
    vcs: { git }
} = adone;

const GITIGNORE_CONTENT =
    `# See http://help.github.com/ignore-files/ for more about ignoring files.

# dependencies
/node_modules

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
Thumbs.db

# compiled output
/bin
/lib
`;

export default class GitTask extends project.generator.task.Base {
    async run(input, context) {
        const time = adone.datetime.now() / 1000;
        const zoneOffset = adone.datetime().utcOffset();

        // Create .gitignore file
        await fs.writeFile(std.path.join(context.project.cwd, ".gitignore"), GITIGNORE_CONTENT);

        // Initialize repository, add all files to git and create first commit.
        const logoContent = await fs.readFile(std.path.join(adone.ETC_PATH, "media", "adone.txt"), { encoding: "utf8" });
        const repository = await git.Repository.init(context.project.cwd, 0);
        const index = await repository.refreshIndex();
        await index.addAll();
        await index.write();
        const oid = await index.writeTree();
        const author = git.Signature.create("ADONE", "info@adone.io", time, zoneOffset);
        const committer = git.Signature.create("ADONE", "info@adone.io", time, zoneOffset);
        await repository.createCommit("HEAD", author, committer, `initial commit from adone/cli:\n\n  $ adone ${adone.runtime.app.argv.join(" ")}\n\n${logoContent}`, oid, []);
    }
}
