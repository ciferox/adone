const { is } = adone;

const doT = {
    name: "doT",
    version: "1.1.1",
    templateSettings: {
        evaluate: /\{\{([\s\S]+?(\}?)+)\}\}/g,
        interpolate: /\{\{=([\s\S]+?)\}\}/g,
        encode: /\{\{!([\s\S]+?)\}\}/g,
        use: /\{\{#([\s\S]+?)\}\}/g,
        useParams: /(^|[^\w$])def(?:\.|\[['"])([\w$\.]+)(?:['"]\])?\s*:\s*([\w$\.]+|"[^"]+"|'[^']+'|\{[^}]+\})/g,
        define: /\{\{##\s*([\w\.$]+)\s*(:|=)([\s\S]+?)#\}\}/g,
        defineParams: /^\s*([\w$]+):([\s\S]+)/,
        conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
        iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*:\s*([\w$]+)\s*(?::\s*([\w$]+))?\s*\}\})/g,
        varname: "it",
        strip: true,
        append: true,
        selfcontained: false,
        doNotSkipEncoded: false
    },
    template: undefined, //fn, compile template
    compile: undefined, //fn, for express
    log: true
};

doT.encodeHTMLSource = function (doNotSkipEncoded) {
    const encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': "&#34;", "'": "&#39;", "/": "&#47;" };
    const matchHTML = doNotSkipEncoded ? /[&<>"'/]/g : /&(?!#?\w+;)|<|>|"|'|\//g;
    return (code) => code
        ? code.toString().replace(matchHTML, (m) => encodeHTMLRules[m] || m)
        : "";
};

const startend = {
    append: { start: "'+(", end: ")+'", startencode: "'+encodeHTML(" },
    split: { start: "';out+=(", end: ");out+='", startencode: "';out+=encodeHTML(" }
};
const skip = /$^/;

const resolveDefs = (c, block, def) => {
    return ((is.string(block)) ? block : block.toString())
        .replace(c.define || skip, (m, code, assign, value) => {
            if (code.indexOf("def.") === 0) {
                code = code.substring(4);
            }
            if (!(code in def)) {
                if (assign === ":") {
                    if (c.defineParams) {
                        value.replace(c.defineParams, (m, param, v) => {
                            def[code] = { arg: param, text: v };
                        });
                    }
                    if (!(code in def)) {
                        def[code] = value;
                    }
                } else {
                    new Function("def", `def['${code}']=${value}`)(def);
                }
            }
            return "";
        })
        .replace(c.use || skip, (m, code) => {
            if (c.useParams) {
                code = code.replace(c.useParams, (m, s, d, param) => {
                    if (def[d] && def[d].arg && param) {
                        const rw = (`${d}:${param}`).replace(/'|\\/g, "_");
                        def.__exp = def.__exp || {};
                        def.__exp[rw] = def[d].text.replace(new RegExp(`(^|[^\\w$])${def[d].arg}([^\\w$])`, "g"), `$1${param}$2`);
                        return `${s}def.__exp['${rw}']`;
                    }
                });
            }
            const v = new Function("def", `return ${code}`)(def);
            return v ? resolveDefs(c, v, def) : v;
        });
};

const unescape = (code) => {
    return `${code}`.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
};

doT.template = function (tmpl, c, def) {
    c = c || doT.templateSettings;
    const cse = c.append ? startend.append : startend.split;
    let needhtmlencode;
    let sid = 0;
    let indv;
    let str = (c.use || c.define) ? resolveDefs(c, tmpl, def || {}) : tmpl;

    const out = (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g, " ")
        .replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, "") : str)
        .replace(/'|\\/g, "\\$&")
        .replace(c.interpolate || skip, (m, code) => {
            return cse.start + unescape(code) + cse.end;
        })
        .replace(c.encode || skip, (m, code) => {
            needhtmlencode = true;
            return cse.startencode + unescape(code) + cse.end;
        })
        .replace(c.conditional || skip, (m, elsecase, code) => {
            return elsecase ?
                (code ? `';}else if(${unescape(code)}){out+='` : "';}else{out+='") :
                (code ? `';if(${unescape(code)}){out+='` : "';}out+='");
        })
        .replace(c.iterate || skip, (m, iterate, vname, iname) => {
            if (!iterate) {
                return "';} } out+='";
            }
            sid += 1; indv = iname || `i${sid}`; iterate = unescape(iterate);
            return `';var arr${sid}=${iterate};if(arr${sid}){var ${vname}, ${indv}=-1,l${sid}=arr${sid}.length-1;while(${indv}<l${sid}){${vname}=arr${sid}[${indv}+=1];out+='`;
        })
        .replace(c.evaluate || skip, (m, code) => {
            return `';${unescape(code)}out+='`;
        });

    str = (`var out='${out}';return out;`)
        .replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r")
        .replace(/(\s|;|\}|^|\{)out\+='';/g, "$1").replace(/\+''/g, "");
    //.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+=');

    if (needhtmlencode) {
        if (!c.selfcontained && !global._encodeHTML) {
            global._encodeHTML = doT.encodeHTMLSource(c.doNotSkipEncoded);
        }
        str = `var encodeHTML = typeof _encodeHTML !== 'undefined' ? _encodeHTML : (${
            doT.encodeHTMLSource.toString()}(${c.doNotSkipEncoded || ""}));${
            str}`;
    }
    try {
        return new Function(c.varname, str);
    } catch (e) {
        console.log(`Could not create a template function: ${str}`);
        throw e;
    }
};

doT.compile = function (tmpl, def) {
    return doT.template(tmpl, null, def);
};

const fs = require("fs");

const addexports = (exports) => {
    let ret = "";
    for (let i = 0; i < exports.length; i++) {
        ret += `itself.${exports[i]}=${exports[i]};`;
    }
    return ret;
};

const copy = (o, to) => {
    to = to || {};
    for (const property in o) {
        to[property] = o[property];
    }
    return to;
};

const readdata = (path) => {
    const data = fs.readFileSync(path);
    if (data) {
        return data.toString();
    }
    console.log(`problems with ${path}`);
};

class InstallDots {
    constructor(o) {
        this.__path = o.path || "./";
        if (this.__path[this.__path.length - 1] !== "/") {
            this.__path += "/";
        }
        this.__destination = o.destination || this.__path;
        if (this.__destination[this.__destination.length - 1] !== "/") {
            this.__destination += "/";
        }
        this.__global = o.global || "window.render";
        this.__rendermodule = o.rendermodule || {};
        this.__settings = o.templateSettings ? copy(o.templateSettings, copy(doT.templateSettings)) : undefined;
        this.__includes = {};
    }

    compileToFile(path, template, def) {
        def = def || {};
        const modulename = path.substring(path.lastIndexOf("/") + 1, path.lastIndexOf("."));
        const defs = copy(this.__includes, copy(def));
        const settings = this.__settings || doT.templateSettings;
        const compileoptions = copy(settings);
        const defaultcompiled = doT.template(template, settings, defs);
        const exports = [];
        let compiled = "";
        let fn;

        for (const property in defs) {
            if (defs[property] !== def[property] && defs[property] !== this.__includes[property]) {
                fn = undefined;
                if (is.string(defs[property])) {
                    fn = doT.template(defs[property], settings, defs);
                } else if (is.function(defs[property])) {
                    fn = defs[property];
                } else if (defs[property].arg) {
                    compileoptions.varname = defs[property].arg;
                    fn = doT.template(defs[property].text, compileoptions, defs);
                }
                if (fn) {
                    compiled += fn.toString().replace("anonymous", property);
                    exports.push(property);
                }
            }
        }
        compiled += defaultcompiled.toString().replace("anonymous", modulename);
        fs.writeFileSync(path, `(function(){${compiled}var itself=${modulename}, _encodeHTML=(${doT.encodeHTMLSource.toString()}(${settings.doNotSkipEncoded || ""}));${addexports(exports)}if(typeof module!=='undefined' && module.exports) module.exports=itself;else if(typeof define==='function')define(function(){return itself;});else {${this.__global}=${this.__global}||{};${this.__global}['${modulename}']=itself;}}());`);
    }

    compilePath(path) {
        const data = readdata(path);
        if (data) {
            return doT.template(data, this.__settings || doT.templateSettings, copy(this.__includes));
        }
    }

    compileAll() {
        if (doT.log) {
            console.log("Compiling all doT templates...");
        }

        const defFolder = this.__path;
        const sources = fs.readdirSync(defFolder);
        let k;
        let l;
        let name;

        for (k = 0, l = sources.length; k < l; k++) {
            name = sources[k];
            if (/\.def(\.dot|\.jst)?$/.test(name)) {
                if (doT.log) {
                    console.log(`Loaded def ${name}`);
                }
                this.__includes[name.substring(0, name.indexOf("."))] = readdata(defFolder + name);
            }
        }

        for (k = 0, l = sources.length; k < l; k++) {
            name = sources[k];
            if (/\.dot(\.def|\.jst)?$/.test(name)) {
                if (doT.log) {
                    console.log(`Compiling ${name} to function`);
                }
                this.__rendermodule[name.substring(0, name.indexOf("."))] = this.compilePath(defFolder + name);
            }
            if (/\.jst(\.dot|\.def)?$/.test(name)) {
                if (doT.log) {
                    console.log(`Compiling ${name} to file`);
                }
                this.compileToFile(`${this.__destination + name.substring(0, name.indexOf("."))}.js`,
                    readdata(defFolder + name));
            }
        }
        return this.__rendermodule;
    }
}

doT.process = function (options) {
    //path, destination, global, rendermodule, templateSettings
    return new InstallDots(options).compileAll();
};

export default doT;
