const {
    fs,
    std
} = adone;
let dbidx = 0;

export const location = function () {
    return std.path.join(__dirname, `_leveldown_test_db_${dbidx++}`);
};

export const lastLocation = function () {
    return std.path.join(__dirname, `_leveldown_test_db_${dbidx}`);
};

export const cleanup = async function () {
    let list = await fs.readdir(__dirname);
    list = list.filter((f) => {
        return (/^_leveldown_test_db_/).test(f);
    });

    for (const f of list) {
        await fs.rm(std.path.join(__dirname, f)); // eslint-disable-line
    }
};

export const setUp = function () {
    return cleanup();
};

export const tearDown = function () {
    return setUp();
};

export const collectEntries = async function (iterator) {
    const data = [];
    for (; ;) {
        const result = await iterator.next(); // eslint-disable-line
        if (!result) {
            break;
        }
        data.push(result);
    }
    await iterator.end();
    return data;
};
