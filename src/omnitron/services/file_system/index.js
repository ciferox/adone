const { Private, Public, Contextable, Description } = adone.netron.decorator;

@Private
@Contextable
@Description("Common context")
export class Filesystem {
    @Public
    @Description("Creates a directory recursively")
    mkdir(path, mode) {
        return adone.fs.mkdir(path, mode);
    }
}
