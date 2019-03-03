const {
    is,
    task
} = adone;

// INCOMPLETE

export default class ListTask extends task.Task {
    async run({ type } = {}) {
        const result = {};
        if (is.string(type)) {
            const types = Object.keys(handlers);

            for (const type of types) {
                const handler = this._createHandlerClass(type);
                result[handler.name] = await handler.list(); // eslint-disable-line
            }
            return result;
        }

        return this._createHandlerClass(type).list();
    }
}
