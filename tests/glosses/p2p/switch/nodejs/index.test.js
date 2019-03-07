describe("p2p", "switch", () => {
    require("./connection");
    require("./dial_fsm");
    require("./pnet");
    require("./transports");
    require("./stream_muxers");
    require("./secio");
    require("./swarm_no_muxing");
    require("./swarm_muxing");
    require("./circuit_relay");
    require("./identify");
    require("./limit_dialer");
    require("./stats");    
});
