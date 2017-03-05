import adone from "adone";
const { Contextable, Description, Public, Private, Type } = adone.netron.decorator;

@Private
@Contextable
@Description("Directories and files sharing service")
export class Serve {
    initialize() {

    }

    @Public
    @Description("")
    serve() {
        return null;
    }
}
