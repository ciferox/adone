const {
    fs,
    project: { Manager, Configuration },
    std,
    x
} = adone;

const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
const fixture = (name) => std.path.join(FIXTURES_PATH, name);

describe("project", "manager", () => {
    describe("initialization", () => {
        const paths = [];

        const getPathFor = (name) => {
            const path = fixture(name);
            paths.push(path);
            return path;
        };

        afterEach(async () => {
            for (const path of paths) {
                await fs.rm(path); // eslint-disable-line
            }
        });


        it("should have thrown if path exists and is not empty", async () => {
            const name = "project1";
            const path = getPathFor(name);
            await fs.mkdir(path);
            await fs.writeFile(std.path.join(path, "some_file"), "abc");

            const manager = new Manager(path);
            const err = await assert.throws(async () => manager.initialize({
                name: "test1"
            }));
            assert.instanceOf(err, x.Exists);
        });

        it("should have thrown if name of project is not specified", async () => {
            const name = "project1";
            const path = getPathFor(name);
            const manager = new Manager(path);
            const err = await assert.throws(async () => manager.initialize({
                description: "test1"
            }));
            assert.instanceOf(err, x.InvalidArgument);
        });

        it("minimal project", async () => {
            const name = "project1";
            const path = getPathFor(name);
            await fs.mkdir(path);

            const manager = new Manager(path);
            await manager.initialize({
                name
            });

            const adoneConf = await Configuration.load({
                cwd: path
            });

            assert.equal(adoneConf.raw.name, name);
            assert.sameMembers(await fs.readdir(path), ["adone.json"]);
        });

        it("minimal project with initialized git", async () => {
            const name = "project1";
            const description = "project description";
            const path = getPathFor(name);
            await fs.mkdir(path);

            const manager = new Manager(path);
            await manager.initialize({
                name,
                description,
                initGit: true
            });

            const adoneConf = await Configuration.load({
                cwd: path
            });

            assert.equal(adoneConf.raw.name, name);
            assert.equal(adoneConf.raw.description, description);
            assert.sameMembers(await fs.readdir(path), ["adone.json", ".git"]);
        });

        it.only("minimal project with initialized git", async () => {
            const name = "project1";
            const description = "project description";
            const path = getPathFor(name);
            await fs.mkdir(path);

            const manager = new Manager(path);
            await manager.initialize({
                name,
                description,
                initGit: true
            });

            const adoneConf = await Configuration.load({
                cwd: path
            });

            assert.equal(adoneConf.raw.name, name);
            assert.equal(adoneConf.raw.description, description);
            assert.sameMembers(await fs.readdir(path), ["adone.json", ".git"]);
        });
        
    });
});
