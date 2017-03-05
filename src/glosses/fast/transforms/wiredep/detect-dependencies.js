import adone from "adone";

/**
 * Detect dependencies of the components from `bower.json`.
 *
 * @param    {object} config the global configuration object.
 * @return {object} config
 */
async function detectDependencies(config) {
    const allDependencies = {};

    if (config.get("dependencies")) {
        adone.vendor.lodash.assign(allDependencies, config.get("bower.json").dependencies);
    }

    if (config.get("dev-dependencies")) {
        adone.vendor.lodash.assign(allDependencies, config.get("bower.json").devDependencies);
    }

    if (config.get("include-self")) {
        allDependencies[config.get("bower.json").name] = config.get("bower.json").version;
    }

    for (const dep in allDependencies) {
        await (gatherInfo(config)(allDependencies[dep], dep));
    }
    // adone.vendor.lodash.each(allDependencies, gatherInfo(config));

    config.set("global-dependencies-sorted", filterExcludedDependencies(
        config.get("detectable-file-types").
            reduce(function (acc, fileType) {
                if (!acc[fileType]) {
                    acc[fileType] = prioritizeDependencies(config, "." + fileType);
                }
                return acc;
            }, {}),
        config.get("exclude")
    ));

    return config;
}


/**
 * Find the component's JSON configuration file.
 *
 * @param    {object} config         the global configuration object
 * @param    {string} component    the name of the component to dig for
 * @return {object} the component's config file
 */
async function findComponentConfigFile(config, component) {
    let componentConfigFile;

    if (config.get("include-self") && component === config.get("bower.json").name) {
        return config.get("bower.json");
    }

    const defaultConfigFiles = ["bower.json", ".bower.json", "component.json", "package.json"];
    for (let configFile of defaultConfigFiles) {
        configFile = adone.std.path.join(config.get("bower-directory"), component, configFile);

        if (await adone.fs.exists(configFile)) {
            componentConfigFile = JSON.parse(await adone.fs.readFile(configFile));
            break;
        }
    }

    return componentConfigFile;
}


/**
 * Find the main file the component refers to. It's not always `main` :(
 *
 * @param    {object} config                the global configuration object
 * @param    {string} component         the name of the component to dig for
 * @param    {componentConfigFile}    the component's config file
 * @return {array} the array of paths to the component's primary file(s)
 */
async function findMainFiles(config, component, componentConfigFile) {
    let filePaths = [];
    const file = {};
    const self = config.get("include-self") && component === config.get("bower.json").name;
    const cwd = self ? config.get("cwd") : adone.std.path.join(config.get("bower-directory"), component);

    if (adone.vendor.lodash.isString(componentConfigFile.main)) {
        // start by looking for what every component should have: config.main
        filePaths = [componentConfigFile.main];
    } else if (adone.is.array(componentConfigFile.main)) {
        filePaths = componentConfigFile.main;
    } else if (adone.is.array(componentConfigFile.scripts)) {
        // still haven't found it. is it stored in config.scripts, then?
        filePaths = componentConfigFile.scripts;
    } else {
        for (const type of ["js", "css"]) {
            file[type] = adone.std.path.join(config.get("bower-directory"), component, componentConfigFile.name + "." + type);

            if (await adone.fs.exists(file[type])) {
                filePaths.push(componentConfigFile.name + "." + type);
            }
        }
    }

    let acc = new Array;
    for (const filePath of filePaths) {
        acc = acc.concat(
            (await adone.fs.glob(filePath, { cwd, root: "/" }))
            .map((path) =>  adone.std.path.join(cwd, path))
        );
    }

    return adone.vendor.lodash.uniq(acc);
}


/**
 * Store the information our prioritizer will need to determine rank.
 *
 * @param    {object} config     the global configuration object
 * @return {function} the iterator function, called on every component
 */
function gatherInfo(config) {
    /**
     * The iterator function, which is called on each component.
     *
     * @param    {string} version        the version of the component
     * @param    {string} component    the name of the component
     * @return {undefined}
     */
    return async function (version, component) {
        const dep = config.get("global-dependencies").get(component) || {
            main: "",
            type: "",
            name: "",
            dependencies: {}
        };

        const componentConfigFile = await findComponentConfigFile(config, component);
        if (!componentConfigFile) {
            const error = new adone.x.NotFound(component + " is not installed. Try running `bower install` or remove the component from your bower.json file.");
            error.code = "PKG_NOT_INSTALLED";
            throw error;
        }

        const overrides = config.get("overrides");

        if (overrides && overrides[component]) {
            if (overrides[component].dependencies) {
                componentConfigFile.dependencies = overrides[component].dependencies;
            }

            if (overrides[component].main) {
                componentConfigFile.main = overrides[component].main;
            }
        }

        const mains = await findMainFiles(config, component, componentConfigFile);
        const fileTypes = adone.vendor.lodash.chain(mains).map(adone.std.path.extname).uniq().value();

        dep.main = mains;
        dep.type = fileTypes;
        dep.name = componentConfigFile.name;

        const depIsExcluded = adone.vendor.lodash.find(config.get("exclude"), function (pattern) {
            return adone.std.path.join(config.get("bower-directory"), component).match(pattern);
        });

        if (dep.main.length === 0 && !depIsExcluded) {
            config.get("on-main-not-found")(component);
        }

        if (componentConfigFile.dependencies) {
            dep.dependencies = componentConfigFile.dependencies;
            for (const depName in componentConfigFile.dependencies) {
                await (gatherInfo(config)(componentConfigFile.dependencies[depName], depName));
            }
        }

        config.get("global-dependencies").set(component, dep);
    };
}


/**
 * Compare two dependencies to determine priority.
 *
 * @param    {object} a    dependency a
 * @param    {object} b    dependency b
 * @return {number} the priority of dependency a in comparison to dependency b
 */
function dependencyComparator(a, b) {
    let aNeedsB = false;
    let bNeedsA = false;

    aNeedsB = adone.util.keys(a.dependencies)
        .some(function (dependency) {
            return dependency === b.name;
        });

    if (aNeedsB) {
        return 1;
    }

    bNeedsA = adone.util.keys(b.dependencies)
        .some(function (dependency) {
            return dependency === a.name;
        });

    if (bNeedsA) {
        return -1;
    }

    return 0;
}


/**
 * Take two arrays, sort based on their dependency relationship, then merge them
 * together.
 *
 * @param    {array} left
 * @param    {array} right
 * @return {array} the sorted, merged array
 */
function merge(left, right) {
    const result = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
        if (dependencyComparator(left[leftIndex], right[rightIndex]) < 1) {
            result.push(left[leftIndex++]);
        } else {
            result.push(right[rightIndex++]);
        }
    }

    return result.
        concat(left.slice(leftIndex)).
        concat(right.slice(rightIndex));
}


/**
 * Take an array and slice it in halves, sorting each half along the way.
 *
 * @param    {array} items
 * @return {array} the sorted array
 */
function mergeSort(items) {
    if (items.length < 2) {
        return items;
    }

    const middle = Math.floor(items.length / 2);

    return merge(
        mergeSort(items.slice(0, middle)),
        mergeSort(items.slice(middle))
    );
}


/**
 * Sort the dependencies in the order we can best determine they're needed.
 *
 * @param    {object} config        the global configuration object
 * @param    {string} fileType    the type of file to prioritize
 * @return {array} the sorted items of "path/to/main/files.ext" sorted by type
 */
function prioritizeDependencies(config, fileType) {
    const globalDependencies = adone.vendor.lodash.toArray(config.get("global-dependencies").get());

    const dependencies = globalDependencies.filter(function (dependency) {
        return adone.vendor.lodash.includes(dependency.type, fileType);
    });

    return adone.vendor.lodash(mergeSort(dependencies)).
            map((x) => x.main).
            flatten().
            value().
            filter(function (main) {
                return adone.std.path.extname(main) === fileType;
            });
}


/**
 * Excludes dependencies that match any of the patterns.
 *
 * @param    {array} allDependencies    array of dependencies to filter
 * @param    {array} patterns                 array of patterns to match against
 * @return {array} items that don't match any of the patterns
 */
function filterExcludedDependencies(allDependencies, patterns) {
    return adone.vendor.lodash.transform(allDependencies, function (result, dependencies, fileType) {
        result[fileType] = adone.vendor.lodash.reject(dependencies, function (dependency) {
            return adone.vendor.lodash.find(patterns, function (pattern) {
                return dependency.replace(/\\/g, "/").match(pattern);
            });
        });
    });
}


export default detectDependencies;
