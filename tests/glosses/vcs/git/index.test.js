const {
    std: { path }
} = adone;

const exec = adone.system.process.shell;
const local = path.join.bind(path, __dirname, "fixtures");
const workdirPath = local("repos/workdir");

describe("vcs", "git", () => {
    before(function () {
        this.timeout(350000);

        const url = "https://github.com/nodegit/test";
        return adone.fs.rm(local("repos")).then(() => {
            return adone.fs.rm(local("home"));
        }).then(() => {
            return adone.fs.mkdir(local("repos"));
        }).then(() => {
            return exec(`git init ${local("repos", "empty")}`);
        }).then(() => {
            return exec(`git clone ${url} ${workdirPath}`);
        }).then(() => {
            return exec("git checkout rev-walk", { cwd: workdirPath });
        }).then(() => {
            return exec("git checkout checkout-test", { cwd: workdirPath });
        }).then(() => {
            return exec("git checkout master", { cwd: workdirPath });
        }).then(() => {
            return adone.fs.mkdir(local("repos", "nonrepo"));
        }).then(() => {
            return adone.fs.writeFile(local("repos", "nonrepo", "file.txt"), "This is a bogus file");
        }).then(() => {
            return adone.fs.mkdir(local("home"));
        }).then(() => {
            return adone.fs.writeFile(local("home", ".gitconfig"), "[user]\n  name = John Doe\n  email = johndoe@example.com");
        });
    });

    beforeEach(function () {
        this.timeout(4000);
        return exec("git clean -xdf", { cwd: workdirPath }).then(() => {
            return exec("git checkout master", { cwd: workdirPath });
        }).then(() => {
            return exec("git reset --hard", { cwd: workdirPath });
        });
    });

    afterEach((done) => {
    //     process.nextTick(() => {
    //         if (global.gc) {
    //             global.gc();
    //         }
    //         done();
    //     });
        done();
    });

    include("./annotated_commit");
    include("./attr");
    include("./blame");
    include("./blob");
    include("./branch");
    include("./checkout");
    include("./cherrypick");
    include("./clone");
    include("./commit");
    include("./config");
    include("./convenient_line");
    include("./cred");
    // include("./diff");
    // include("./filter");
    include("./graph");
    include("./ignore");
    include("./index");
    include("./merge");
    include("./note");
    include("./odb");
    include("./oid");
    include("./packbuilder");
    include("./patch");
    include("./pathspec");
    include("./rebase");
    include("./refs");
    // include("./remote");
    include("./repository");
    include("./reset");
    // include("./revert");
    include("./revparse");
    include("./revwalk");
    include("./signature");
    include("./stage");
    include("./stash");
    include("./status");
    include("./status_file");
    include("./status_list");
    include("./submodule");
    include("./tag");
    include("./thread_safety");
    include("./tree");
    include("./treebuilder");
    include("./tree_entry");
});

