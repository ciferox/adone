const {
    application: { Subsystem, CliApplication },
    std: { path }
} = adone;

const {
    CliSubsystem
} = CliApplication;

@CliSubsystem({
    name: "complex",
    description: "Operations on complex numbers",
    subsystem: path.resolve(__dirname, "complex"),
    transpile: true
})
@CliSubsystem({
    name: "real",
    description: "Operations on real numbers",
    subsystem: path.resolve(__dirname, "real"),
    transpile: true
})
export default class MathCLI extends Subsystem {
}
