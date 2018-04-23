import "adone";

const {
    is,
    application,
    model: { ObjectModel, ArrayModel, BasicModel }
} = adone;

class TestJsApplication extends application.Application {
    async configure() {

    }

    async initialize() {

    }

    async main() {      
        const NetworkModel = new ObjectModel({
            addrs: [String, new ArrayModel(String)],
            muxer: ["mplex"],
            transport: ["tcp", "ws", new ArrayModel(["tcp", "ws"])]
        }).defaults({
            muxer: "mplex",
            transport: "tcp"
        });

        const conf = new NetworkModel({
            addrs: "//ip4/0.0.0.0//tcp/8888",
            transport: ["ws", "tcp"]
        });

        adone.logTrace(conf);
        adone.logTrace(conf.addrs);
        adone.logTrace(conf.muxer);
        adone.logTrace(conf.transport);

        // const Prim = BasicModel(Number).assert((x) => x < 35, "should be smaller than 35");
        // adone.log(Prim(36));

        return 0;
    }

    async uninitialize() {

    }
}

application.run(TestJsApplication);
