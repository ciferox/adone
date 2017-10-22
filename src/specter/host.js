const { is } = adone;

export default class Host {
    constructor(access) {
        if (is.plainObject(access)) {
            this.access = access;
        } else if (is.string(access)) {
            const url = new adone.std.url.URL(access);
            this.access = {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port,
                username: url.username,
                password: url.password
            };
        } else {
            this.access = {
                protocol: "local:",
                hostname: undefined,
                port: undefined,
                username: undefined,
                password: undefined
            };
        }
        this.connection = undefined;
    }

    async getConnection() {
        if (is.undefined(this.connection)) {
            if (this.access.protocol === "ssh:") {
                this.connection = await adone.net.ssh.Session.connect(this.access);
            }
        }
        return this.connection;
    }

    isLocal() {
        return this.access.protocol === "local:";
    }
    
    isSSH() {
        return this.access.protocol === "ssh:";
    }

    toString() {
        if (this.isLocal()) {
            return "localhost";
        }
        return `${this.access.protocol}//${this.access.hostname}${is.undefined(this.access.port) ? "" : `:${this.access.port}`}`;
    }
}
