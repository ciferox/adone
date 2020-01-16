const {
    app,
    ipfs: { cli: { util: { singleton, getIPFS } } }
} = adone;

const {
    subsystem
} = app;

const subCommand = (name) => adone.path.join(__dirname, "commands", name);

@subsystem({
    subsystems: [
        {
            name: "daemon",
            description: "Start a long-running daemon process",
            subsystem: subCommand("daemon")
        },
        {
            name: "repo",
            description: "Manipulate the IPFS repo",
            subsystem: subCommand("repo")
        }
    ]
})
export default () => class IPFSCommand extends app.Subsystem {
    constructor(...args) {
        super(...args);

        this.getIpfs = singleton((cb) => getIPFS({
            silent: false,
            pass: "",
            migrate: false
        }, cb));
    }
};
