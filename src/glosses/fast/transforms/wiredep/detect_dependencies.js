const { fs, vendor, is, std: { path }, x, util } = adone;

const detectDependencies = async (config) => {
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
            reduce((acc, fileType) => {
                if (!acc[fileType]) {
                    acc[fileType] = prioritizeDependencies(config, `.${fileType}`);
                }
                return acc;
            }, {}),
        config.get("exclude")
    ));

    return config;
};


const findComponentConfigFile = async (config, component) => {
    let componentConfigFile;

    if (config.get("include-self") && component === config.get("bower.json").name) {
        return config.get("bower.json");
    }

    const defaultConfigFiles = ["bower.json", ".bower.json", "component.json", "package.json"];
    for (let configFile of defaultConfigFiles) {
        configFile = adone.std.path.join(config.get("bower-directory"), component, configFile);

        if (await fs.exists(configFile)) {
            componentConfigFile = JSON.parse(await fs.readFile(configFile));
            break;
        }
    }

    return componentConfigFile;
};


const findMainFiles = async (config, component, componentConfigFile) => {
    let filePaths = [];
    const file = {};
    const self = config.get("include-self") && component === config.get("bower.json").name;
    const cwd = self ? config.get("cwd") : adone.std.path.join(config.get("bower-directory"), component);

    if (vendor.lodash.isString(componentConfigFile.main)) {
        // start by looking for what every component should have: config.main
        filePaths = [componentConfigFile.main];
    } else if (is.array(componentConfigFile.main)) {
        filePaths = componentConfigFile.main;
    } else if (is.array(componentConfigFile.scripts)) {
        // still haven't found it. is it stored in config.scripts, then?
        filePaths = componentConfigFile.scripts;
    } else {
        for (const type of ["js", "css"]) {
            file[type] = path.join(config.get("bower-directory"), component, `${componentConfigFile.name}.${type}`);

            if (await fs.exists(file[type])) {
                filePaths.push(`${componentConfigFile.name}.${type}`);
            }
        }
    }

    let acc = [];
    for (const filePath of filePaths) {
        acc = acc.concat(
            (await fs.glob(filePath, { cwd, root: "/" }))
                .map((path) => adone.std.path.join(cwd, path))
        );
    }

    return adone.vendor.lodash.uniq(acc);
};


const gatherInfo = (config) => {
    return async (version, component) => {
        const dep = config.get("global-dependencies").get(component) || {
            main: "",
            type: "",
            name: "",
            dependencies: {}
        };

        const componentConfigFile = await findComponentConfigFile(config, component);
        if (!componentConfigFile) {
            const error = new x.NotFound(`${component} is not installed. Try running \`bower install\` or remove the component from your bower.json file.`);
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
        const fileTypes = vendor.lodash.chain(mains).map(adone.std.path.extname).uniq().value();

        dep.main = mains;
        dep.type = fileTypes;
        dep.name = componentConfigFile.name;

        const depIsExcluded = vendor.lodash.find(config.get("exclude"), (pattern) => {
            return path.join(config.get("bower-directory"), component).match(pattern);
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
};


const dependencyComparator = (a, b) => {
    let aNeedsB = false;
    let bNeedsA = false;

    aNeedsB = util.keys(a.dependencies).some((dependency) => dependency === b.name);

    if (aNeedsB) {
        return 1;
    }

    bNeedsA = util.keys(b.dependencies).some((dependency) => dependency === a.name);

    if (bNeedsA) {
        return -1;
    }

    return 0;
};


const merge = (left, right) => {
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

    return [...result, ...left.slice(leftIndex), ...right.slice(rightIndex)];
};


const mergeSort = (items) => {
    if (items.length < 2) {
        return items;
    }

    const middle = Math.floor(items.length / 2);

    return merge(
        mergeSort(items.slice(0, middle)),
        mergeSort(items.slice(middle))
    );
};


const prioritizeDependencies = (config, fileType) => {
    const globalDependencies = vendor.lodash.toArray(config.get("global-dependencies").get());

    const dependencies = globalDependencies.filter((dependency) => {
        return vendor.lodash.includes(dependency.type, fileType);
    });

    return vendor.lodash(mergeSort(dependencies)).
            map((x) => x.main).
            flatten().
            value().
            filter((main) => {
                return adone.std.path.extname(main) === fileType;
            });
};


const filterExcludedDependencies = (allDependencies, patterns) => {
    return vendor.lodash.transform(allDependencies, (result, dependencies, fileType) => {
        result[fileType] = vendor.lodash.reject(dependencies, (dependency) => {
            return vendor.lodash.find(patterns, (pattern) => {
                return dependency.replace(/\\/g, "/").match(pattern);
            });
        });
    });
};


export default detectDependencies;
