const { hardware } = adone.metrics;
const { Type, Contextable, Description } = adone.netron.decorator;

@Contextable
@Description("Hardware metrics")
class Hardware {
    @Description("")
    @Type(Array)
    test() {
        return null;
    }
}

export default Hardware; // code generator fails when export + class decorator, todo: fix
