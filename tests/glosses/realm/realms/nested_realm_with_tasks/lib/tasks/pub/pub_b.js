const {
    task: { task },
    realm: { BaseTask }
} = adone;

@task("pubB")
export default class PubTaskB extends BaseTask {
    main() {
        return "pub bbb";
    }
}
