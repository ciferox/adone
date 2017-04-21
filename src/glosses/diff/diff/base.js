export default class Diff {
    diff(oldString, newString, options = {}) {
        let callback = options.callback;
        if (adone.is.function(options)) {
            callback = options;
            options = {};
        }
        this.options = options;

        function done(value) {
            if (callback) {
                setTimeout(function () {
                    callback(undefined, value);
                }, 0);
                return true;
            } else {
                return value;
            }
        }

        // Allow subclasses to massage the input prior to running
        oldString = this.castInput(oldString);
        newString = this.castInput(newString);

        oldString = this.removeEmpty(this.tokenize(oldString));
        newString = this.removeEmpty(this.tokenize(newString));

        const newLen = newString.length;
        const oldLen = oldString.length;

        let editLength = 1;
        const maxEditLength = newLen + oldLen;
        const bestPath = [{ newPos: -1, components: [] }];

        // Seed editLength = 0, i.e. the content starts with the same values
        const oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);
        if (bestPath[0].newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
            // Identity per the equality and tokenizer
            return done([{ value: this.join(newString), count: newString.length }]);
        }

        // Main worker method. checks all permutations of a given edit length for acceptance.
        const execEditLength = () => {
            for (let diagonalPath = -1 * editLength; diagonalPath <= editLength; diagonalPath += 2) {
                let basePath;
                const addPath = bestPath[diagonalPath - 1];
                const removePath = bestPath[diagonalPath + 1];
                let oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;

                if (addPath) {
                    // No one else is going to attempt to use this value, clear it
                    bestPath[diagonalPath - 1] = undefined;
                }

                const canAdd = addPath && addPath.newPos + 1 < newLen;
                const canRemove = removePath && 0 <= oldPos && oldPos < oldLen;

                if (!canAdd && !canRemove) {
                    // If this path is a terminal then prune
                    bestPath[diagonalPath] = undefined;
                    continue;
                }

                // Select the diagonal that we want to branch from. We select the prior
                // path whose position in the new string is the farthest from the origin
                // and does not pass the bounds of the diff graph
                if (!canAdd || canRemove && addPath.newPos < removePath.newPos) {
                    basePath = clonePath(removePath);
                    this.pushComponent(basePath.components, undefined, true);
                } else {
                    basePath = addPath; // No need to clone, we've pulled it from the list
                    basePath.newPos++;
                    this.pushComponent(basePath.components, true, undefined);
                }

                oldPos = this.extractCommon(basePath, newString, oldString, diagonalPath);

                // If we have hit the end of both strings, then we are done
                if (basePath.newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
                    return done(buildValues(this, basePath.components, newString, oldString, this.useLongestToken));
                } else {
                    // Otherwise track this path as a potential candidate and continue.
                    bestPath[diagonalPath] = basePath;
                }
            }

            editLength++;
        };

        // Performs the length of edit iteration. Is a bit fugly as this has to support the
        // sync and async mode which is never fun. Loops over execEditLength until a value
        // is produced.
        if (callback) {
            (function exec() {
                setTimeout(function () {
                    // This should not happen, but we want to be safe.
                    /* istanbul ignore next */
                    if (editLength > maxEditLength) {
                        return callback();
                    }

                    if (!execEditLength()) {
                        exec();
                    }
                }, 0);
            })();
        } else {
            while (editLength <= maxEditLength) {
                const ret = execEditLength();
                if (ret) {
                    return ret;
                }
            }
        }
    }

    pushComponent(components, added, removed) {
        const last = components[components.length - 1];
        if (last && last.added === added && last.removed === removed) {
            // We need to clone here as the component clone operation is just
            // as shallow array clone
            components[components.length - 1] = { count: last.count + 1, added, removed };
        } else {
            components.push({ count: 1, added, removed });
        }
    }

    extractCommon(basePath, newString, oldString, diagonalPath) {
        const newLen = newString.length;
        const oldLen = oldString.length;
        let newPos = basePath.newPos;
        let oldPos = newPos - diagonalPath;
        let commonCount = 0;

        while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newString[newPos + 1], oldString[oldPos + 1])) {
            newPos++;
            oldPos++;
            commonCount++;
        }

        if (commonCount) {
            basePath.components.push({ count: commonCount });
        }

        basePath.newPos = newPos;
        return oldPos;
    }

    equals(left, right) {
        return left === right;
    }

    removeEmpty(array) {
        const ret = [];
        for (let i = 0; i < array.length; i++) {
            if (array[i]) {
                ret.push(array[i]);
            }
        }
        return ret;
    }

    castInput(value) {
        return value;
    }

    tokenize(value) {
        return value.split("");
    }

    join(chars) {
        return chars.join("");
    }
}

function buildValues(diff, components, newString, oldString, useLongestToken) {
    let componentPos = 0;
    const componentLen = components.length;
    let newPos = 0;
    let oldPos = 0;

    for (; componentPos < componentLen; componentPos++) {
        const component = components[componentPos];
        if (!component.removed) {
            if (!component.added && useLongestToken) {
                let value = newString.slice(newPos, newPos + component.count);
                value = value.map(function (value, i) {
                    const oldValue = oldString[oldPos + i];
                    return oldValue.length > value.length ? oldValue : value;
                });

                component.value = diff.join(value);
            } else {
                component.value = diff.join(newString.slice(newPos, newPos + component.count));
            }
            newPos += component.count;

            // Common case
            if (!component.added) {
                oldPos += component.count;
            }
        } else {
            component.value = diff.join(oldString.slice(oldPos, oldPos + component.count));
            oldPos += component.count;

            // Reverse add and remove so removes are output first to match common convention
            // The diffing algorithm is tied to add then remove output and this is the simplest
            // route to get the desired output with minimal overhead.
            if (componentPos && components[componentPos - 1].added) {
                const tmp = components[componentPos - 1];
                components[componentPos - 1] = components[componentPos];
                components[componentPos] = tmp;
            }
        }
    }

    // Special case handle for when one terminal is ignored. For this case we merge the
    // terminal into the prior string and drop the change.
    const lastComponent = components[componentLen - 1];
    if (componentLen > 1 && (lastComponent.added || lastComponent.removed) && diff.equals("", lastComponent.value)) {
        components[componentLen - 2].value += lastComponent.value;
        components.pop();
    }

    return components;
}

function clonePath(path) {
    return { newPos: path.newPos, components: path.components.slice(0) };
}
