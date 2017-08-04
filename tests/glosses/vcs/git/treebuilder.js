const {
    fs,
    std: { path },
    vcs: { git: { Repository, Treebuilder, TreeEntry, Tree } }
} = adone;

const local = path.join.bind(path, __dirname, "fixtures");

describe("TreeBuilder", () => {
    const reposPath = local("repos/workdir");
    //setup test repo each test
    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath)
            .then((repo) => {
                test.repo = repo;
            });
    });
    //treebuilder created with no source when creating a new folder
    //  (each folder in git is a tree)
    //  or the root folder for a root commit
    it("Can create a new treebuilder with no source", function () {
        return Treebuilder.create(this.repo, null);
    });
    //treebuilder created with a source tree can add / read from tree
    it("Can create a treebuilder from the latest commit tree", function () {

        const test = this;
        //get latest commit
        return test.repo.getHeadCommit()
            //get tree of commit
            .then((commit) => {
                return commit.getTree();
            })
            //make treebuilder from tree
            .then((tree) => {
                return Treebuilder.create(test.repo, tree);
            })
            //verify treebuilder can do stuff
            .then((treeBuilder) => {
                //check
                //count how many entries we should have
                return fs.readdir(reposPath)
                    //treebuilder should have all entries in the clean working dir
                    //(minus .git folder)
                    .then((dirEntries) => {
                        return assert.equal(dirEntries.length - 1, treeBuilder.entrycount());
                    });
            });
    });
    //adding a tree is adding a folder
    it("Can add a new tree to an existing tree", function () {

        const test = this;
        //get latest commit
        return test.repo.getHeadCommit()
            //get tree of commit
            .then((commit) => {
                return commit.getTree();
            })
            //make treebuilder from tree
            .then((tree) => {
                return Treebuilder.create(test.repo, tree);
            })
            //verify treebuilder can do stuff
            .then((rootTreeBuilder) => {
                //new dir builder
                return Treebuilder.create(test.repo, null)
                    .then((newTreeBuilder) => {
                        //insert new dir
                        return rootTreeBuilder.insert("mynewfolder", newTreeBuilder.write(), TreeEntry.FILEMODE.TREE);
                    });
            })
            .then((newTreeEntry) => {
                assert(newTreeEntry.isTree(), "Created a tree (new folder) that is a tree");
                return Tree.lookup(test.repo, newTreeEntry.oid());
            });
    });
});
