Object.defineProperty(exports, "__esModule", {
    value: true
});

@adone.netron.Context()
class Test1 {
    constructor(subsystem) {
        this.subsystem = subsystem;
    }

    @adone.netron.Public()
    getInfo() {
        return this.subsystem.adoneConf.raw;
    }
}

exports.default = class Test1Service extends adone.application.Subsystem {
    configure(peer, adoneConf) {
        this.peer = peer;
        this.adoneConf = adoneConf;
    }

    async initialize() {
        this.context = new Test1(this);
        await this.peer.attachContextRemote(this.context, "test1");        
    }

    async uninitialize() {
        await this.peer.detachContextRemote(this.context);
    }
};
