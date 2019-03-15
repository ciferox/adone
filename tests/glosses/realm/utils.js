const {
    realm,
    std,
    util
} = adone;

const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
export const fixturePath = (...args) => std.path.join(FIXTURES_PATH, ...args);

let realmCounter = 1;
export const getRealmName = () => `project${realmCounter++}`;


export const realmPathFor = (...args) => std.path.join(__dirname, "realms", ...args);

export const createManagerFor = async ({ name, connect = true }) => {
    const manager = new realm.Manager({
        cwd: realmPathFor(...util.arrify(name))
    });
    connect && await manager.connect();
    return manager;
};
