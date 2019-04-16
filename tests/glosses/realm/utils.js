const {
    realm,
    std,
    util
} = adone;

const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
export const fixturePath = (...args) => std.path.join(FIXTURES_PATH, ...args);
export const getTmpPath = async (...args) => std.path.join(await adone.fs.tmpName(), ...args);

let realmCounter = 1;
export const getRealmName = () => `project${realmCounter++}`;


export const getRealmPathFor = (...args) => std.path.join(__dirname, "realms", ...args);

export const createManagerFor = async ({ name, connect = true }) => {
    const manager = new realm.RealmManager({
        cwd: getRealmPathFor(...util.arrify(name))
    });
    connect && await manager.connect({
        transpile: true
    });
    return manager;
};
