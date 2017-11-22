import Pool from "./pool";
import DefaultEvictor from "./default_evictor";
import PriorityQueue from "./priority_queue";
import ResourceRequest from "./resource_request";

export { DefaultEvictor, ResourceRequest };

export const create = (factory, config) => new Pool(DefaultEvictor, adone.collection.LinkedList, PriorityQueue, factory, config);

