const { std: { path } } = adone;
let dbidx = 0;

export const location = function () {
    return path.join(__dirname, `_leveldown_test_db_${dbidx++}`);
};

export const lastLocation = function () {
    return path.join(__dirname, `_leveldown_test_db_${dbidx}`);
};

export const cleanup = async function () {
    let list = await adone.fs.readdir(__dirname);   
    list = list.filter((f) => {
        return (/^_leveldown_test_db_/).test(f);
    });

    for (const f of list) {
        await adone.fs.rm(path.join(__dirname, f));
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
    for ( ;; ) {
        const result = await iterator.next();
        if (!result) {
            break;
        }
        data.push(result);
    }
    await iterator.end();
    return data;
};
