// our config object - in a dynamic project you would fetch
// JSON from a server, and convert to an object...
import { alapConfig } from "./config.js";

// our lib
import { alap } from "../dist/index.js";

// pass the config objecty
alap(alapConfig);
