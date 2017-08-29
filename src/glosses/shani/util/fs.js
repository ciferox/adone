
const { std: { fs: sfs, path: spath, os }, is, fs } = adone;

export const createTempFile = async (prefix = spath.join(os.tmpdir(), spath.sep)) => {
    for (; ;) {
        const file = new fs.File(`${prefix}${adone.util.uuid.v4()}`);
        if (!(await file.exists())) {
            await file.create();
            return file;
        }
    }
};

export const createStructure = async (root, structure) => {
    for (const item of structure) {
        if (is.array(item)) {
            if (!item.length) {
                continue;
            }
            if (item.length === 2 && !is.array(item[1])) {
                await root.addFile(item[0], { contents: item[1] });
                continue;
            }
            const dir = await root.addDirectory(item[0]);
            if (item.length === 2) {
                await createStructure(dir, item[1]);
            }
        } else {
            await root.addFile(item);
        }
    }
};
