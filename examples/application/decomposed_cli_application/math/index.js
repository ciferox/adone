const {
    app,
    std: { path }
} = adone;

const {
    DSubsystem
} = app;

@DSubsystem({
    subsystems: [
        {
            name: "complex",
            description: "Operations on complex numbers",
            subsystem: path.resolve(__dirname, "complex"),
            transpile: true
        },
        {
            name: "real",
            description: "Operations on real numbers",
            subsystem: path.resolve(__dirname, "real"),
            transpile: true
        }
    ]
})
export default class MathCLI extends app.Subsystem {
}
