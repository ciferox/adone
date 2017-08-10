const {
    netron: { decorator: { Contextable, Description, Type } }
} = adone;

@Contextable
@Description("Sample context provided some backend information")
export default class Info {
    @Description("Returns system infomation")
    @Type(String)
    system() {
        adone.info("requested system");
        return adone.metrics.system.toString();
    }

    @Description("Returns current time")
    @Type(Date)
    time() {
        adone.info("requested time");
        return new Date();
    }
}
