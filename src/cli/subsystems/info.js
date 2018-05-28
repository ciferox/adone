const {
    is,
    app: {
        Subsystem,
        DMainCliCommand
    },
    pretty,
    terminal: { chalk, esc },
    // meta,
    runtime: { term }
} = adone;

const acsiiSysIcon = adone.lazify({
    ubuntu: () => () => {
        const c1 = esc.red.open;
        const c2 = esc.white.open;
        const icon = `
${c1}            .-/+oossssoo+/-.           
        \`:+ssssssssssssssssss+:\`        
      -+ssssssssssssssssssyyssss+-      
    .ossssssssssssssssss${c2}dMMMNy${c1}sssso.    
   /sssssssssss${c2}hdmmNNmmyNMMMMh${c1}ssssss/   
  +sssssssss${c2}hm${c1}yd${c2}MMMMMMMNddddy${c1}ssssssss+  
 /ssssssss${c2}hNMMM${c1}yh${c2}hyyyyhmNMMMNh${c1}ssssssss/ 
.ssssssss${c2}dMMMNh${c1}ssssssssss${c2}hNMMMd${c1}ssssssss.
+ssss${c2}hhhyNMMNy${c1}ssssssssssss${c2}yNMMMy${c1}sssssss+
oss${c2}yNMMMNyMMh${c1}ssssssssssssss${c2}hmmmh${c1}ssssssso
oss${c2}yNMMMNyMMh${c1}sssssssssssssshmmmh${c1}ssssssso
+ssss${c2}hhhyNMMNy${c1}ssssssssssss${c2}yNMMMy${c1}sssssss+
.ssssssss${c2}dMMMNh${c1}ssssssssss${c2}hNMMMd${c1}ssssssss.
 /ssssssss${c2}hNMMM${c1}yh${c2}hyyyyhdNMMMNh${c1}ssssssss/ 
  +sssssssss${c2}dm${c1}yd${c2}MMMMMMMMddddy${c1}ssssssss+  
   /sssssssssss${c2}hdmNNNNmyNMMMMh${c1}ssssss/   
   -+sssssssssssssssss${c2}yyy${c1}ssss+-      
   .ossssssssssssssssss${c2}dMMMNy${c1}sssso.    
        \`:+ssssssssssssssssss+:\`        
            .-/+oossssoo+/-.            
`;

        return chalk.bold(icon);
    }
});

class SystemInfoRenderer {
    constructor() {
        this._title = null;
        this._data = null;
        this._lines = null;
        this._ready = adone.promise.defer();
    }

    async waitForComplete() {
        await this.render();
        return this._ready.promise;
    }

    async render() {
        const title = is.function(this.getTitle)
            ? await this.getTitle()
            : is.string(this.getTitle)
                ? this.getTitle
                : null;

        if (is.null(this._data)) {
            this._data = {};
            const sensors = await this.sensors();
            let total = 0;

            for (const sensor of sensors) {
                const getterName = adone.text.toCamelCase(`get_${sensor}`);
                let value;
                const getter = this[getterName];
                if (is.function(getter)) {
                    value = getter(); // eslint-disable-line
                    if (is.promise(value)) {
                        const progress = term.progress({
                            noRender: true
                        });
                        progress.setSchema(`${term.theme.primary(`${title}:`)} :spinner`);
                        total++;
                        value.then((result) => {
                            this._data[sensor] = result;
                            progress.setSchema(`${term.theme.primary(`${title}:`)} ${result}`);
                            progress.complete(true);
                            if (--total === 0) {
                                this._ready.resolve();
                            }
                        });
                        value = progress;
                    }
                } else if (is.string(getter)) {
                    value = getter;
                } else if (getter) {
                    value = adone.meta.inspect(getter, { style: "color", depth: 3 });
                } else {
                    continue;
                }

                this._data[sensor] = value;
            }
        }

        let lines;
        if (is.null(this._lines)) {
            lines = [];
            let hasProgresses = false;

            for (const [title, value] of Object.entries(this._data)) {
                if (is.string(value)) {
                    lines.push(term.theme.primary(`${title}: `) + value);
                } else if (value instanceof adone.terminal.Progress) {
                    lines.push(value.compile());
                    hasProgresses = true;
                }
            }

            if (!hasProgresses) {
                this._lines = lines;
            }
        } else {
            lines = this._lines;
        }

        return `${title || ""}\n${lines.join("\n")}`;
    }

    // padding-left
    sensors() {
        return ["OS", "Uptime", "Memory"];
    }

    async getTitle() {
        if (is.null(this._title)) {
            const osInfo = await adone.system.info.osInfo();
            const title = `${await adone.system.user.username()}@${osInfo.hostname}`;
            this._title = `${term.theme.primary.bold(title)}\n${term.theme.primary("-".repeat(title.length))}`;
        }
        return this._title;
    }

    getOs() {
        return adone.metrics.system.toString();
    }

    async getUptime() {
        const sysTime = await adone.system.info.time();
        return pretty.time(sysTime.uptime * 1000);
    }

    async getMemory() {
        const sysMem = await adone.system.info.mem();
        return `${pretty.size(sysMem.total - sysMem.available)}/${pretty.size(sysMem.total)}`;
    }
}

// const VIRTUAL_NAMESPACES = [
//     "global",
//     "std",
//     "dev",
//     "vendor",
//     "npm"
// ];

// const ADONE_GLOBAL = ["adone", "global"];

// const getOwnPropertyDescriptor = (obj, propName) => {
//     let descr = Object.getOwnPropertyDescriptor(obj, propName);
//     if (!is.undefined(descr)) {
//         return descr;
//     }

//     let o = obj.__proto__;
//     for (; ;) {
//         if (!o) {
//             return undefined;
//         }
//         descr = Object.getOwnPropertyDescriptor(o, propName);
//         if (!is.undefined(descr)) {
//             return descr;
//         }
//         o = o.__proto__;
//     }
// };

export default class Info extends Subsystem {
    @DMainCliCommand({
        arguments: [
            {
                name: "name",
                type: String,
                default: "",
                help: "Name of namespace, package or something like"
            }
        ]
        // options: [
        //     {
        //         name: "--all",
        //         help: "Show all properties"
        //     },
        //     {
        //         name: "--depth",
        //         type: Number,
        //         default: 1,
        //         help: "The depth of object inspection"
        //     }
        // ]
    })
    async command(args, opts) {
        try {
            adone.log(chalk.bold.red(" WIP".repeat(adone.runtime.term.stats.cols / 4)));
            const name = args.get("name");
            if (name.length === 0) {
                const sysinfoRenderer = new SystemInfoRenderer();
                // const timer = setInterval(async () => {
                //     adone.log(await sysinfoRenderer.render());
                // }, 50);
                await sysinfoRenderer.waitForComplete();


                // clearInterval(timer);
                // return 0;

                // adone.log(lines.join("\n"));
                const sysInfo = await sysinfoRenderer.render();
                const adoneInfo = "";

                const leftTable = pretty.table([
                    {
                        logo: acsiiSysIcon.ubuntu(),
                        info: sysInfo
                    },
                    {
                        logo: adone.terminal.gradient.create("#8BC34A", "#673AB7").multiline(adone.adoneLogo),
                        info: adoneInfo
                    }
                ], {
                    noHeader: true,
                    borderless: true,
                    style: {
                        head: null,
                        compact: true
                    },
                    model: [
                        {
                            id: "logo",
                            align: "center"
                        },
                        {
                            id: "info",
                            align: "left"
                        }
                    ]
                });

                adone.log(leftTable);
                // const table = pretty.table([
                //     [adone.adoneLogo, "overlord@Hyper8"]
                // ], {
                //     noHeader: true,
                //     style: {
                //         head: null,
                //         compact: true
                //     },
                //     model: [
                //         {
                //             id: "name",
                //             header: "Package",
                //             handle: (item) => {
                //                 const color = item.isValid ? "{green-fg}" : "{red-fg}";
                //                 const version = is.undefined(item.version) ? "" : ` ${item.version}`;
                //                 const description = is.undefined(item.description) ? "" : ` {grey-fg}- ${item.description}{/grey-fg}`;
                //                 const invalid = item.isValid ? "" : `{red-fg} (${item.errInfo}){/red-fg}`;
                //                 const symlink = item.isSymlink ? " {yellow-fg}(symlink){/yellow-fg}" : "";

                //                 return `${color}{bold}${item.name}{/bold}${version}{/}${symlink}${description}${invalid}`;
                //             }
                //         }
                //     ]
                // });
                // adone.log(table);
            }
            return 0;
        } catch (err) {
            return 1;
        }
    }
}
