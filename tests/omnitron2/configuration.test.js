import interfaceSuite from "../glosses/configurations/interface";

const {
    cli: { Configuration }
} = adone;

describe("omnitron2", "Configuration", () => {
    interfaceSuite(Configuration);
});
