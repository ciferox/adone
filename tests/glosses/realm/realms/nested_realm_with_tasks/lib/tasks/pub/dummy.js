const {
    task: { task },
    realm: { BaseTask }
} = adone;

@task("dummy")
export default class DummyTask extends BaseTask {
    main() {
        return "root dummy";
    }
}
