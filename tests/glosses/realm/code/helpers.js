const {
    is,
    fs,
    std: { path },
    realm: { code }
} = adone;

export const getModulePath = (...args) => path.join(__dirname, "fixtures", "modules", ...args);

export const createSandbox = (options) => {
    return new code.Sandbox(options);
};

export const createModule = async (path, { sandbox, load } = {}) => {
    const mod = new code.Module({ sandbox, file: path });
    if (load) {
        await mod.load(is.object(load) ? load : {});
    }
    return mod;
};


export const suiteRunner = (suite) => {
    const __ = adone.lazify({
        sandboxOptions: [suite, (mod) => mod.sandboxOptions],
        tests: [suite, (mod) => mod.tests]
    }, exports, require);

    const files = [];
    let sandbox;
    let tmpPath;

    const createFile = async (fileName, content) => {
        const filePath = path.join(tmpPath, fileName);
        await fs.writeFile(filePath, content, { encoding: "utf8" });
        files.push(filePath);
        return filePath;
    };

    return {
        async before() {
            tmpPath = await fs.tmpName();
            await fs.mkdirp(tmpPath);
            sandbox = createSandbox({
                input: path.join(tmpPath, "index.js")
            });
        },
        async after() {
            await fs.remove(tmpPath);
        },
        run() {
            for (const { descr, realName, fileName, testName, content, check, load } of __.tests) {
                const contents = adone.util.arrify(content);
                for (let i = 0; i < contents.length; i++) {
                    const c = contents[i] || "";
                    // eslint-disable-next-line no-loop-func
                    it(`${testName} - (case ${i + 1})`, async () => {
                        const filePath = await createFile(realName, c);
                        const mod = await createModule(path.join(tmpPath, fileName || realName), {
                            sandbox,
                            load
                        });

                        await check(mod, filePath, i);
                    });
                }
            }
        }
    };
};
