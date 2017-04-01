const { hardware } = adone.metrics;
const { Type, Contextable, Description } = adone.netron.decorator;

@Contextable
@Description("Hardware metrics")
export default class Hardware {    
    @Description("")
    @Type(Array)
    test() {
        return null;
    }
}
