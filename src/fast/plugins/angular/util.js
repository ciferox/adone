const { js, util, vendor } = adone;

export const findDependencies = (source) => {
    const potentialModuleNameVariable = {};
    let rootDeps = [];
    const modules = {};

    const ast = js.compiler.parse(source, { sourceType: "module" });
    js.compiler.traverse(ast, {
        exit: ({ node, parent }) => {
            if (node.type === "VariableDeclarator" && node.init && node.init.type === "StringLiteral") {
                potentialModuleNameVariable[node.id.name] = node.init.value;
            }
            if (!(node.type === "MemberExpression" && node.object.name === "angular" && node.property.name === "module")) {
                if (node.type === "CallExpression" && node.callee.name === "angularModule" && node.arguments.length > 0 && node.arguments[0].value === "ng") {
                    modules.ng = [];
                }
                return;
            }
            const moduleNameArg = parent.arguments[0];
            const moduleName = moduleNameArg.value || potentialModuleNameVariable[moduleNameArg.name];
            if (parent.arguments[1]) {
                // if already declared, will reset dependencies, like how angular behaves (latest declaration wins)
                modules[moduleName] = vendor.lodash.map(parent.arguments[1].elements, "value");
            } else {
                rootDeps.push(moduleName);
            }
        }
    });


    const moduleKeys = util.keys(modules);
    const moduleValues = util.values(modules);

    const { lodash: _ } = vendor;

    // aggregates all root + sub depedencies, and remove ones that were declared locally
    rootDeps = _(rootDeps).union(_.flatten(moduleValues)).uniq().value();
    rootDeps = _.difference(rootDeps, moduleKeys);

    const isAngular = moduleKeys.length > 0 || rootDeps.length > 0;
    if (isAngular && !_.has(modules, "ng") && !_.some(rootDeps, "ng")) {
        rootDeps.unshift("ng");
    }

    return { dependencies: rootDeps, modules };
};
