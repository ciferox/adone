import interfaceSuite from "../glosses/configurations/interface";

const {
    cli: { Configuration }
} = adone;

describe("cli", "Configuration", () => {
    interfaceSuite(Configuration);
});
