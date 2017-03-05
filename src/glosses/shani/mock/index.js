/**
 * Core utilities. For internal use only.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
import match from "./match";
import collection from "./collection";
import spy from "./spy";
import spyCall from "./call";
import stub, { createStubInstance } from "./stub";
import mock from "./mock";
import expectation from "./mock-expectation";

export {
    match, collection, spy, spyCall, stub,
    createStubInstance, mock, expectation
};
