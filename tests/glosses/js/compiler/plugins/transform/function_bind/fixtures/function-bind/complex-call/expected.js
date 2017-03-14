var _context;

import { map, takeWhile, forEach } from "iterlib";

(_context = (_context = (_context = getPlayers(), map).call(_context, x => x.character()), takeWhile).call(_context, x => x.strength > 100), forEach).call(_context, x => console.log(x));
