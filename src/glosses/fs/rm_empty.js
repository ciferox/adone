const {
    fs,
    std
} = adone;

const isDirectory = async (filepath) => {
    try {
        const stat = await fs.stat(filepath);
        return stat.isDirectory();
    } catch (err) {
        return false;
    }
};
const isEmpty = (files, filterFn) => {
    for (let i = 0; i < files.length; ++i) {
        if (!filterFn(files[i])) {
            return false;
        }
    }
    return true;
};

export default async function (path, { cwd = process.cwd(), filter = (filename) => /(?:Thumbs\.db|\.DS_Store)$/i.test(filename) } = {}) {
    const dirname = std.path.resolve(cwd, path);
    const deleted = [];

    const remove = async function (filepath) {
        const dir = std.path.resolve(filepath);

        if (dir.indexOf(dirname) !== 0) {
            return;
        }

        if (!(await isDirectory(dir))) {
            return;
        }

        const files = await fs.readdir(dir);

        if (isEmpty(files, filter)) {
            await fs.rm(dir);
            deleted.push(dir);
            await remove(std.path.dirname(dir));
        } else {
            for (const file of files) {
                await remove(std.path.resolve(dir, file)); // eslint-disable-line
            }
        }
    };

    await remove(dirname);

    return deleted;
}
