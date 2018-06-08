import { StatementBase } from './shared/Node';
export default class ThrowStatement extends StatementBase {
    hasEffects(_options) {
        return true;
    }
}
