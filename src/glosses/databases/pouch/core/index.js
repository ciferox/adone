import PouchDB from "./setup";
import version from "./version";
import pouchDebug from "./../debug";
import pouchChangesFilter from "./../changes-filter";

// TODO: remove from pouchdb-core (breaking)
PouchDB.plugin(pouchDebug);

// TODO: remove from pouchdb-core (breaking)
PouchDB.plugin(pouchChangesFilter);

PouchDB.version = version;

export default PouchDB;
