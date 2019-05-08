// import { checkRealm } from "../helpers";

const {
    cli: { style },
    error,
    is,
    fast,
    fs,
    github: {
        GitHubReleaseManager
    },
    path,
    realm
} = adone;

@adone.task.task("realmPublish")
export default class extends realm.BaseTask {
    async main({ } = {}) {
        // const grm = new GitHubReleaseManager();

        return this.optRealmPath;
    }

}
