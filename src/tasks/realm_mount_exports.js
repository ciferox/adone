import { checkRealm } from "./helpers";

const {
    cli: { style },
    is,
    std,
    realm,
    util
} = adone;

export default class extends realm.BaseTask {
    async main({ superRealm, subRealm } = {}) {
        this.manager.notify(this, "progress", {
            message: "checking realms"
        });

        this.superRealm = await checkRealm(superRealm);
        this.subRealm = await checkRealm(subRealm);

        const realmExports = this.subRealm.config.get("exports");
        if (is.undefined(realmExports)) {
            return;
        }

        let mountPoints;
        const mpIndexPath = std.path.join(superRealm.cwd, superRealm.config.get("mountPoints") || "lib/mount_points");

        try {
            mountPoints = require(mpIndexPath);
            if (mountPoints.default) {
                mountPoints = mountPoints.default;
            }
        } catch (err) {
            return;
        }

        for (const e of realmExports) {
            const { type } = e;

            this.manager.notify(this, "progress", {
                status: true,
                message: `mounting ${style.accent(e.type)}`
            });

            if (is.string(type) && is.class(mountPoints[type])) {
                const mountPoint = new mountPoints[type]();

                // eslint-disable-next-line no-await-in-loop
                await mountPoint.register({
                    superRealm,
                    subRealm,
                    realmExport: util.omit(e, "type")
                });
            }
        }

        this.manager.notify(this, "progress", {
            status: true,
            message: "exports processed"
        });
    }
}
