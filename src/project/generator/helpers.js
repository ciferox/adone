const {
    fs,
    is,
    std,
    templating,
    text
} = adone;

export const generateFile = async (template, { name, fileName, cwd, skipName = false, rewriteFile = false, ...templateContext } = {}) => {
    if (is.string(name) && !skipName) {
        fileName = is.string(fileName) ? fileName : `${name}.js`;
        name = text.capitalize(text.toCamelCase(name));
    } else {
        name = "";
        fileName = is.string(fileName) ? fileName : "index.js";
    }

    const filePath = std.path.join(cwd, fileName);

    if ((await fs.exists(filePath)) && !rewriteFile) {
        throw new adone.x.Exists(`File '${filePath}' already exists`);
    }

    await fs.mkdirp(cwd);

    const content = await templating.nunjucks.renderString(template, {
        name,
        ...templateContext
    });

    await fs.writeFile(filePath, content);
};
