import * as commands from "./commands";
const { util, x, is } = adone;

export const list = util.keys(commands);

const flags = new Map();
for (const commandName of list) {
    flags.set(commandName, new Set(commands[commandName].flags));
}

export const exists = (commandName) => flags.has(commandName);

export const hasFlag = (commandName, flag) => {
    if (!exists(commandName)) {
        throw new x.InvalidArgument(`Unknown command ${commandName}`);
    }
    return flags.get(commandName).has(flag);
};

const getExternalKeyNameLength = (key) => {
    if (!is.string(key)) {
        key = String(key);
    }
    const hashPos = key.indexOf("->");
    return hashPos === -1 ? key.length : hashPos;
};

export const getKeyIndexes = (commandName, args, options) => {
    const command = commands[commandName];
    if (!command) {
        throw new x.InvalidArgument(`Unknown command ${commandName}`);
    }

    if (!is.array(args)) {
        throw new x.InvalidArgument("Expect args to be an array");
    }

    const keys = [];
    let i;
    let keyStart;
    let keyStop;
    let parseExternalKey;
    switch (commandName) {
        case "zunionstore":
        case "zinterstore": {
            keys.push(0);
        }
        // fall through
        case "eval":
        case "evalsha": {
            keyStop = Number(args[1]) + 2;
            for (i = 2; i < keyStop; i++) {
                keys.push(i);
            }
            break;
        }
        case "sort": {
            parseExternalKey = options && options.parseExternalKey;
            keys.push(0);
            for (i = 1; i < args.length - 1; i++) {
                if (!is.string(args[i])) {
                    continue;
                }
                const directive = args[i].toUpperCase();
                if (directive === "GET") {
                    i += 1;
                    if (args[i] !== "#") {
                        if (parseExternalKey) {
                            keys.push([i, getExternalKeyNameLength(args[i])]);
                        } else {
                            keys.push(i);
                        }
                    }
                } else if (directive === "BY") {
                    i += 1;
                    if (parseExternalKey) {
                        keys.push([i, getExternalKeyNameLength(args[i])]);
                    } else {
                        keys.push(i);
                    }
                } else if (directive === "STORE") {
                    i += 1;
                    keys.push(i);
                }
            }
            break;
        }
        case "migrate": {
            if (args[2] === "") {
                for (i = 5; i < args.length - 1; i++) {
                    if (args[i].toUpperCase() === "KEYS") {
                        for (let j = i + 1; j < args.length; j++) {
                            keys.push(j);
                        }
                        break;
                    }
                }
            } else {
                keys.push(2);
            }
            break;
        }
        default: {
            // step has to be at least one in this case, otherwise the command does not contain a key
            if (command.step > 0) {
                keyStart = command.keyStart - 1;
                keyStop = command.keyStop > 0 ? command.keyStop : args.length + command.keyStop + 1;
                for (i = keyStart; i < keyStop; i += command.step) {
                    keys.push(i);
                }
            }
            break;
        }
    }

    return keys;
};
