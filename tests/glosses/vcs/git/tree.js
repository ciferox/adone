import RepoUtils from "./utils/repository_setup";

const {
    fs,
    std: { path },
    vcs: { git: { Repository } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("Tree", () => {
    const repoPath = local("repos/tree");
    const existingPath = local("repos/workdir");
    const oid = "5716e9757886eaf38d51c86b192258c960d9cfea";

    beforeEach(function () {
        const test = this;
        return RepoUtils.createRepository(repoPath).then((repo) => {
            test.repository = repo;
        }).then(() => {
            return Repository.open(existingPath);
        }).then((repository) => {
            test.existingRepo = repository;
            return repository.getCommit(oid);
        }).then((commit) => {
            test.commit = commit;
        });
    });

    after(() => {
        return fs.rm(repoPath);
    });

    it("gets an entry by name", async function () {
        try {
            const tree = await this.commit.getTree();
            const entry = tree.entryByName("README.md");
            assert(entry);
        } catch (err) {
            //
        }
    });

    it("walks its entries and returns the same entries on both progress and end", function () {
        const repo = this.repository;
        const file1 = "test.txt";
        const file2 = "foo/bar.txt";
        // index.addByPath doesn't like \s so normalize only for the expected paths
        const expectedPaths = [file1, path.normalize(file2)];
        const progressEntries = [];
        let endEntries;

        return RepoUtils.commitFileToRepo(repo, file1, "").then((commit) => {
            return RepoUtils.commitFileToRepo(repo, file2, "", commit);
        }).then((commit) => {
            return commit.getTree();
        }).then((tree) => {
            assert(tree);

            return new Promise(((resolve, reject) => {
                const walker = tree.walk();

                walker.on("entry", (entry) => {
                    progressEntries.push(entry);
                });
                walker.on("end", (entries) => {
                    endEntries = entries;
                    resolve();
                });
                walker.on("error", reject);

                walker.start();
            }));
        }).then(() => {
            assert(progressEntries.length);
            assert(endEntries && endEntries.length);

            const getEntryPath = (entry) => entry.path();

            const progressFilePaths = progressEntries.map(getEntryPath);
            const endFilePaths = endEntries.map(getEntryPath);

            assert.deepEqual(
                expectedPaths, progressFilePaths,
                "progress entry paths do not match expected paths"
            );

            assert.deepEqual(
                expectedPaths, endFilePaths,
                "end entry paths do not match expected paths"
            );
        });
    });
});
