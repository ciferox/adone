import { scopeEval } from '../utils';

function evalFilter(input) {
  return scopeEval('"use strict";\nreturn ' + input + ';', {});
}

export default evalFilter;
