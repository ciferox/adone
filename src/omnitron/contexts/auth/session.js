const { netron: { decorator: { Contextable, Description, Public, Private } } } = adone;

@Contextable
@Private
@Description("User session")
export default class Session {
    constructor(auth, sessionData) {
        this.auth = auth;
        this.data = sessionData;
        this.id = sessionData._id;
    }

    @Public
    @Description("Close user session")
    async logout() {
        await this.auth.iDs.remove({ _id: this.id, _type: "session" });
        this.auth._releaseSession(this.id);
    }

    @Public
    @Description("Returns user's session key")
    getKey() {
        return this.data.key;
    }
}
