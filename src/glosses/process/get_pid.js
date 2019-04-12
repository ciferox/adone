const {
    is
} = adone;

const { 
    platformGetList
} = adone.private(adone.process);

const cols = is.darwin ? [3, 8] : is.linux ? [4, 6] : [1, 4];
const isProtocol = (x) => /^\s*(tcp|udp)/i.test(x);

const parsePid = (input) => {
    if (!is.string(input)) {
        return null;
    }

    const match = input.match(/(?:^|",|",pid=)(\d+)/);
    return match ? parseInt(match[1], 10) : null;
};

const getPort = (input, list) => {
    const regex = new RegExp(`[.:]${input}$`);
    const port = list.find((x) => regex.test(x[cols[0]]));

    if (!port) {
        throw new Error(`Couldn't find a process with port \`${input}\``);
    }

    return parsePid(port[cols[1]]);
};

const getList = async () => {
    return (await platformGetList())
        .split("\n")
        .reduce((result, x) => {
            if (isProtocol(x)) {
                result.push(x.match(/\S+/g) || []);
            }

            return result;
        }, []);
};

export const getPidByPort = (input) => {
    if (!is.number(input)) {
        return Promise.reject(new TypeError(`Expected a number, got ${adone.typeOf(input)}`));
    }

    return getList().then((list) => getPort(input, list));
};

export const getPidsByPorts = async (input) => {
    if (!is.array(input)) {
        return Promise.reject(new TypeError(`Expected an array, got ${adone.typeOf(input)}`));
    }

    let list = await getList();
    list = await Promise.all(input.map((x) => [x, getPort(x, list)]));
    return new Map(list);
};

export const getAllPidsByPorts = async () => {
    const list = await getList();
    const ret = new Map();

    for (const x of list) {
        const match = x[cols[0]].match(/[^]*[.:](\d+)$/);

        if (match) {
            ret.set(parseInt(match[1], 10), parsePid(x[cols[1]]));
        }
    }

    return ret;
};
