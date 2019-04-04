const {
    is,
    util
} = adone;

// https://github.com/sindresorhus/parent-module
export default (filepath) => {
    const stacks = util.getCallsites();

    if (!filepath) {
        return stacks[2].getFileName();
    }

    let seenVal = false;

    // Skip the first stack as it's this function
    stacks.shift();

    for (const stack of stacks) {
        const parentFilepath = stack.getFileName();

        if (!is.string(parentFilepath)) {
            continue;
        }

        if (parentFilepath === filepath) {
            seenVal = true;
            continue;
        }

        // Skip native modules
        if (parentFilepath === "module.js") {
            continue;
        }

        if (seenVal && parentFilepath !== filepath) {
            return parentFilepath;
        }
    }
};
