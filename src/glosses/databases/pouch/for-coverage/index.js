const PouchDB = adone.database.pouch.DB;
import ajax from '../ajax';
import utils from './utils';
import errors from './errors';
import * as collate from '../collate';
// explicitly include find so coverage captures it correctly
import find from '../find';

PouchDB.ajax = ajax;
PouchDB.utils = utils;
PouchDB.Errors = errors;
PouchDB.collate = collate;
PouchDB.plugin(find);

export default PouchDB;
