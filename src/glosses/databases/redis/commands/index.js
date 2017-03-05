import adone from "adone";
import * as commands from "./commands";

/**
 * Redis command list
 *
 * All commands are lowercased.
 *
 * @var {string[]}
 * @public
 */
export const list = Object.keys(commands);

const flags = new Map();
for (const commandName of list) {
    flags.set(commandName, new Set(commands[commandName].flags));
}

/**
 * Check if the command exists
 *
 * @param {string} commandName - the command name
 * @return {boolean} result
 * @public
 */
export function exists(commandName) {
    return flags.has(commandName);
}

/**
 * Check if the command has the flag
 *
 * Some of possible flags: readonly, noscript, loading
 * @param {string} commandName - the command name
 * @param {string} flag - the flag to check
 * @return {boolean} result
 * @public
 */
export function hasFlag(commandName, flag) {
    if (!exists(commandName)) {
        throw new adone.x.InvalidArgument(`Unknown command ${commandName}`);
    }
    return flags.get(commandName).has(flag);
}

/**
 * Get indexes of keys in the command arguments
 *
 * @param {string} commandName - the command name
 * @param {string[]} args - the arguments of the command
 * @param {object} [options] - options
 * @param {boolean} [options.parseExternalKey] - parse external keys
 * @return {number[]} - the list of the index
 * @public
 *
 * @example
 * ```javascript
 * getKeyIndexes('set', ['key', 'value']) // [0]
 * getKeyIndexes('mget', ['key1', 'key2']) // [0, 1]
 * ```
 */
export function getKeyIndexes(commandName, args, options) {
    const command = commands[commandName];
    if (!command) {
        throw new adone.x.InvalidArgument(`Unknown command ${commandName}`);
    }

    if (!adone.is.array(args)) {
        throw new adone.x.InvalidArgument("Expect args to be an array");
    }

    const keys = [];
    let i;
    let keyStart;
    let keyStop;
    let parseExternalKey;
    switch (commandName) {
        case "zunionstore":
        case "zinterstore":
            keys.push(0);
        // fall through
        case "eval":
        case "evalsha":
            keyStop = Number(args[1]) + 2;
            for (i = 2; i < keyStop; i++) {
                keys.push(i);
            }
            break;
        case "sort":
            parseExternalKey = options && options.parseExternalKey;
            keys.push(0);
            for (i = 1; i < args.length - 1; i++) {
                if (!adone.is.string(args[i])) {
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
        case "migrate":
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
        default:
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

    return keys;
}

function getExternalKeyNameLength(key) {
    if (!adone.is.string(key)) {
        key = String(key);
    }
    const hashPos = key.indexOf("->");
    return hashPos === -1 ? key.length : hashPos;
}