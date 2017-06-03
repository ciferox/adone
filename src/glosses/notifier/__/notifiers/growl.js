const { is, EventEmitter, notifier: { __ }, std: { net, crypto, fs, util: { format } } } = adone;

const nl = "\r\n";

class GNTP {
    constructor(type, opts = {}) {
        this.type = type;
        this.host = opts.host || "localhost";
        this.port = opts.port || 23053;
        this.request = `GNTP/1.0 ${type} NONE${nl}`;
        this.resources = [];
        this.attempts = 0;
        this.maxAttempts = 5;
    }

    parseResp(resp) {
        const parsed = {};
        const [head, ...body] = resp.slice(0, resp.indexOf(nl + nl)).split(nl);

        parsed.state = head.match(/-(OK|ERROR|CALLBACK)/)[0].slice(1);
        body.forEach((ln) => {
            ln = ln.split(": ");
            parsed[ln[0]] = ln[1];
        });

        return parsed;
    }

    async retry() {
        await adone.promise.delay(750);
        return this.send();
    }

    addResource(file) {
        const id = crypto.createHash("md5").update(file).digest("hex");
        const header = `Identifier: ${id}${nl}Length: ${file.length}${nl}${nl}`;
        this.resources.push({ header, file });
        return `x-growl-resource://${id}`;
    }

    add(name, val) {
        if (is.undefined(val)) {
            return;
        }

        /* Handle icon files when they're image paths or Buffers. */
        if (/-Icon/.test(name) && !/^https?:\/\//.test(val)) {
            if (/\.(png|gif|jpe?g)$/.test(val)) {
                val = this.addResource(fs.readFileSync(val));
            } else if (val instanceof Buffer) {
                val = this.addResource(val);
            }
        }

        this.request += `${name}: ${val}${nl}`;
    }

    newline() {
        this.request += nl;
    }

    async send() {
        const socket = net.connect(this.port, this.host);
        let resp = "";

        this.attempts += 1;

        socket.on("connect", () => {
            socket.write(this.request);

            this.resources.forEach((res) => {
                socket.write(res.header);
                socket.write(res.file);
                socket.write(nl + nl);
            });
        });

        socket.on("data", (data) => {
            resp += data.toString();

            /* Wait until we have a complete response which is signaled by two CRLF's. */
            if (resp.slice(resp.length - 4) !== (nl + nl)) {
                return;
            }

            resp = this.parseResp(resp);

            /* We have to manually close the connection for certain responses; otherwise,
               reset `resp` to prepare for the next response chunk.  */
            if (resp.state === "ERROR" || resp.state === "CALLBACK") {
                socket.end();
            } else {
                resp = "";
            }
        });

        return new Promise((resolve, reject) => {
            socket.on("end", () => {
                /* Retry on 200 (timed out), 401 (unknown app), or 402 (unknown notification). */
                if (["200", "401", "402"].indexOf(resp["Error-Code"]) >= 0) {
                    if (this.attempts <= this.maxAttempts) {
                        resolve(this.retry());
                    } else {
                        const msg = 'GNTP request to "%s:%d" failed with error code %s (%s)';
                        reject(new Error(format(msg, this.host, this.port, resp["Error-Code"], resp["Error-Description"])));
                    }
                } else {
                    resolve(resp);
                }
            });

            socket.on("error", () => {
                reject(new Error(format('Error while sending GNTP request to "%s:%d"', this.host, this.port)));
                socket.destroy();
            });
        });

    }
}

class Growly {
    constructor() {
        this.appname = "Growly";
        this.notifications = undefined;
        this.labels = undefined;
        this.count = 0;
        this.registered = false;
        this.host = undefined;
        this.port = undefined;
    }

    getLabels() {
        return this.notifications.map((notif) => {
            return notif.label;
        });
    }

    setHost(host, port) {
        this.host = host;
        this.port = port;
    }

    async register(appname, appicon, notifications) {
        if (is.object(appicon)) {
            notifications = appicon;
            appicon = undefined;
        }

        if (is.undefined(notifications) || !notifications.length) {
            notifications = [{ label: "default", dispname: "Default Notification", enabled: true }];
        }

        this.appname = appname;
        this.notifications = notifications;
        this.labels = this.getLabels();
        this.registered = true;

        const gntp = new GNTP("REGISTER", { host: this.host, port: this.port });
        gntp.add("Application-Name", appname);
        gntp.add("Application-Icon", appicon);
        gntp.add("Notifications-Count", notifications.length);
        gntp.newline();

        notifications.forEach((notif) => {
            if (is.undefined(notif.enabled)) {
                notif.enabled = true;
            }
            gntp.add("Notification-Name", notif.label);
            gntp.add("Notification-Display-Name", notif.dispname);
            gntp.add("Notification-Enabled", notif.enabled ? "True" : "False");
            gntp.add("Notification-Icon", notif.icon);
            gntp.newline();
        });

        return gntp.send();
    }

    async notify(text, opts) {
        if (!this.registered) {
            await this.register(this.appname);
        }

        opts = opts || {};

        const gntp = new GNTP("NOTIFY", { host: this.host, port: this.port });
        gntp.add("Application-Name", this.appname);
        gntp.add("Notification-Name", opts.label || this.labels[0]);
        gntp.add("Notification-ID", ++this.count);
        gntp.add("Notification-Title", opts.title);
        gntp.add("Notification-Text", text);
        gntp.add("Notification-Sticky", opts.sticky ? "True" : "False");
        gntp.add("Notification-Priority", opts.priority);
        gntp.add("Notification-Icon", opts.icon);
        gntp.add("Notification-Coalescing-ID", opts.coalescingId || undefined);
        gntp.add("Notification-Callback-Context", "context");
        gntp.add("Notification-Callback-Context-Type", "string");
        gntp.add("Notification-Callback-Target", undefined);
        gntp.newline();

        const resp = await gntp.send();
        if (resp.state === "CALLBACK") {
            return resp["Notification-Callback-Result"].toLowerCase();
        }
    }
}

const growly = new Growly();


const errorMessageNotFound = "Couldn't connect to growl (might be used as a fallback). Make sure it is running";

let hasGrowl = void 0;

export default class Growl extends EventEmitter {
    constructor(options = {}) {
        super();
        options = adone.util.clone(options);
        growly.appname = options.name || "Node";
        this.options = options;
    }

    async notify(options) {
        growly.setHost(this.options.host, this.options.port);
        options = adone.util.clone(options);

        if (is.string(options)) {
            options = { title: "", message: options };
        }

        if (!options.message) {
            throw new Error("Message is required.");
        }

        if (!hasGrowl) {
            throw new Error(errorMessageNotFound);
        }

        hasGrowl = await __.util.checkGrowl(growly);

        if (!hasGrowl) {
            throw new Error(errorMessageNotFound);
        }

        options.title = options.title || "Node Notification";

        return __.util.actionJackerDecorator(this, options, (data) => {
            if (data === "click") {
                return "click";
            }
            if (data === "timedout") {
                return "timeout";
            }
            return false;
        }, () => {
            options = __.util.mapToGrowl(options);
            return growly.notify(options.message, options);
        });
    }
}
