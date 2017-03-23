const {
    std: { path: { relative, resolve, extname } },
    templating: { nunjucks },
    net: { http: { helper } },
    collection, util, fs, identity
} = adone;

const iconsMap = new Map([
    // base icons
    ["default", "page_white"],
    ["folder", "folder"],

    // generic mime type icons
    ["image", "image"],
    ["text", "page_white_text"],
    ["video", "film"],

    // generic mime suffix icons
    ["+json", "page_white_code"],
    ["+xml", "page_white_code"],
    ["+zip", "box"],

    // specific mime type icons
    ["application/font-woff", "font"],
    ["application/javascript", "page_white_code_red"],
    ["application/json", "page_white_code"],
    ["application/msword", "page_white_word"],
    ["application/pdf", "page_white_acrobat"],
    ["application/postscript", "page_white_vector"],
    ["application/rtf", "page_white_word"],
    ["application/vnd.ms-excel", "page_white_excel"],
    ["application/vnd.ms-powerpoint", "page_white_powerpoint"],
    ["application/vnd.oasis.opendocument.presentation", "page_white_powerpoint"],
    ["application/vnd.oasis.opendocument.spreadsheet", "page_white_excel"],
    ["application/vnd.oasis.opendocument.text", "page_white_word"],
    ["application/x-7z-compressed", "box"],
    ["application/x-sh", "application_xp_terminal"],
    ["application/x-font-ttf", "font"],
    ["application/x-msaccess", "page_white_database"],
    ["application/x-shockwave-flash", "page_white_flash"],
    ["application/x-sql", "page_white_database"],
    ["application/x-tar", "box"],
    ["application/x-xz", "box"],
    ["application/xml", "page_white_code"],
    ["application/zip", "box"],
    ["image/svg+xml", "page_white_vector"],
    ["text/css", "page_white_code"],
    ["text/html", "page_white_code"],
    ["text/less", "page_white_code"],

    // other, extension-specific icons
    [".accdb", "page_white_database"],
    [".apk", "box"],
    [".app", "application_xp"],
    [".as", "page_white_actionscript"],
    [".asp", "page_white_code"],
    [".aspx", "page_white_code"],
    [".bat", "application_xp_terminal"],
    [".bz2", "box"],
    [".c", "page_white_c"],
    [".cab", "box"],
    [".cfm", "page_white_coldfusion"],
    [".clj", "page_white_code"],
    [".cc", "page_white_cplusplus"],
    [".cgi", "application_xp_terminal"],
    [".cpp", "page_white_cplusplus"],
    [".cs", "page_white_csharp"],
    [".db", "page_white_database"],
    [".dbf", "page_white_database"],
    [".deb", "box"],
    [".dll", "page_white_gear"],
    [".dmg", "drive"],
    [".docx", "page_white_word"],
    [".erb", "page_white_ruby"],
    [".exe", "application_xp"],
    [".fnt", "font"],
    [".gam", "controller"],
    [".gz", "box"],
    [".h", "page_white_h"],
    [".ini", "page_white_gear"],
    [".iso", "cd"],
    [".jar", "box"],
    [".java", "page_white_cup"],
    [".jsp", "page_white_cup"],
    [".lua", "page_white_code"],
    [".lz", "box"],
    [".lzma", "box"],
    [".m", "page_white_code"],
    [".map", "map"],
    [".msi", "box"],
    [".mv4", "film"],
    [".otf", "font"],
    [".pdb", "page_white_database"],
    [".php", "page_white_php"],
    [".pl", "page_white_code"],
    [".pkg", "box"],
    [".pptx", "page_white_powerpoint"],
    [".psd", "page_white_picture"],
    [".py", "page_white_code"],
    [".rar", "box"],
    [".rb", "page_white_ruby"],
    [".rm", "film"],
    [".rom", "controller"],
    [".rpm", "box"],
    [".sass", "page_white_code"],
    [".sav", "controller"],
    [".scss", "page_white_code"],
    [".srt", "page_white_text"],
    [".tbz2", "box"],
    [".tgz", "box"],
    [".tlz", "box"],
    [".vb", "page_white_code"],
    [".vbs", "page_white_code"],
    [".xcf", "page_white_picture"],
    [".xlsx", "page_white_excel"],
    [".yaws", "page_white_code"]
]);
const iconsCache = new Map();

const defaultFilters = {
    filename: identity,
    size: (bytes, file) => {
        if (file.isDirectory) {
            return "";
        }
        return util.humanizeSize(bytes);
    },
    midificationDate: (obj) => {
        return obj.format("DD.MM.YYYY HH:mm:ss");
    },
    link: (_, file) => {
        if (file.isDirectory) {
            return `${file.filename}/`;
        }
        return file.filename;
    },
    crumb: identity,
    directory: identity
};
const templatesPath = resolve(__dirname, "template");
let environment = null;
const getEnvironment = (options = {}) => {
    if (options.filters) {
        const env = nunjucks.configure(templatesPath);
        const filters = adone.o(defaultFilters, options.filters);
        for (const [name, filter] of util.entries(filters)) {
            env.addFilter(name, filter);
        }
        return env;
    }
    if (environment) {
        return environment;
    }
    environment = nunjucks.configure(templatesPath);
    for (const [name, filter] of util.entries(defaultFilters)) {
        environment.addFilter(name, filter);
    }
    return environment;
};

const loadIcon = async (className) => {
    if (iconsCache.has(className)) {
        return iconsCache.get(className);
    }
    const content = fs.readFile(resolve(__dirname, "template", "icons", `${className}.png`), {
        encoding: "base64"
    });
    iconsCache.set(className, content);
    return content;
};

const getIconClass = (file) => {
    if (file.isDirectory) {
        return "folder";
    }
    const ext = extname(file.filename);
    if (iconsMap.has(ext)) {
        return iconsMap.get(ext);
    }
    const mime = helper.mimeType.lookup(ext);

    if (mime !== false) {
        if (iconsMap.has(mime)) {
            return iconsMap.get(mime);
        }
        const suffix = mime.split("+")[1];
        if (suffix && iconsMap.has(suffix)) {
            return iconsMap.get(suffix);
        }
        const type = mime.split("/")[1];
        if (type && iconsMap.has(type)) {
            return iconsMap.get(type);
        }
    }
    return iconsMap.get("default");
};

const sortFiles = (a, b) => {
    if (a.filename === "..") {
        return -1;
    }
    if (a.isDirectory && !b.isDirectory) {
        return -1;
    }
    if (!a.isDirectory && b.isDirectory) {
        return 1;
    }
    return b.modificationDate.unix() - a.modificationDate.unix();
};

export default class ListingTool {
    constructor(root, options = {}) {
        this.root = root;
        this.hidden = options.hidden;
        this.env = getEnvironment(options);
        this.loadIcon = options.loadIcon || loadIcon;
        this.getIconClass = options.getIconClass || getIconClass;
        this.listingCache = new collection.TimedoutMap(options.ttl ? options.ttl : 1000);
        this.statCache = new collection.TimedoutMap(options.ttl ? options.ttl : 1000);
        this.sortFiles = options.sortFiles || sortFiles;
    }

    async readdir(path) {
        if (this.listingCache.has(path)) {
            return this.listingCache.get(path);
        }
        let files = await fs.readdir(path);
        if (!this.hidden) {
            files = files.filter((x) => x[0] !== ".");
        }
        this.listingCache.set(path, files);
        return files;
    }

    async stat(path) {
        if (this.statCache.has(path)) {
            return this.statCache.get(path);
        }
        const stat = await fs.stat(path);
        this.statCache.set(path, stat);
        return stat;
    }

    async getFiles(path, includeParent = false) {
        const relativePath = relative(this.root, path);
        let files = await this.readdir(path);
        if (includeParent && relativePath !== "") {
            files = ["..", ...files];
        }

        files = await Promise.all(files.map(async (name) => {
            const stat = await this.stat(resolve(path, name));
            const res = {
                filename: encodeURIComponent(name),
                modificationDate: adone.date(stat.mtime),
                size: stat.size,
                isDirectory: stat.isDirectory()
            };
            res.icon = await getIconClass(res);

            return res;
        }));

        return files.sort(this.sortFiles);
    }

    getIcons(files) {
        const icons = util.unique(files.map((x) => x.icon));
        return Promise.all(icons.map(async (x) => {
            const content = await loadIcon(x);
            return { className: x, content };
        }));
    }

    getCrumb(path) {
        let crumb = path.split("/");
        if (crumb[crumb.length - 1] === "") {
            crumb.pop();
        }
        crumb = crumb.map((x, i) => {
            return {
                value: x,
                path: `${crumb.slice(0, i + 1).join("/")}/`
            };
        });
        crumb.shift();  // empty value
        if (crumb.length === 0 || crumb[0].path !== "/") {
            crumb.unshift({ value: "~", path: "/" });
        }
        return crumb;
    }

    async renderHTML(path, originalUrl) {
        const files = await this.getFiles(path, true);
        const icons = await this.getIcons(files);
        const crumb = this.getCrumb(originalUrl);

        return this.env.render("index.njk", { files, icons, crumb, directory: originalUrl });
    }

    async renderPlain(dirPath, path) {
        const files = await this.getFiles(dirPath);
        let result = "";
        for (const file of files) {
            const filePath = `${path}${file.filename}${file.isDirectory ? "/" : ""}`;
            result += `${filePath} ${file.size} ${file.modificationDate.unix()}\n`;
        }
        return result;
    }

    async renderJSON(dirPath, path) {
        const files = await this.getFiles(dirPath);
        return JSON.stringify(files.map((file) => {
            return {
                filename: file.filename,
                path: `${path}${file.filename}${file.isDirectory ? "/" : ""}`,
                size: file.size,
                modificationDate: file.modificationDate.unix(),
                isDirectory: file.isDirectory
            };
        }));
    }
}
