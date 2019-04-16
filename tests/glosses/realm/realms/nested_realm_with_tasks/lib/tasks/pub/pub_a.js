const {
    task: { task },
    realm: { BaseTask }
} = adone;

@task("pubA")
export default class PubTaskA extends BaseTask {
    main() {
        return "pub aaa";
    }
}
