const { shell } = adone;
const { Contextable, Description, Type, Public, Private, Args } = adone.netron.decorator;

@Private
@Contextable
@Description("Shell context")
class Shell {
    initialize() {

    }

    @Public
    @Description("Returns current working directory")
    @Type(String)
    pwd() {
        return shell.pwd();
    }

    @Public
    @Description("")
    @Args(String)
    @Type()
    cd(dir) {
        return shell.cd(dir);
    }

    @Public
    @Description("Returns current user")
    @Type(String)
    whoami() {
        return shell.whoami();
    }
}

export default Shell;
