// our config object - in a dynamic project you would fetch
// JSON from a server, and convert to an object...
import { alapConfig } from "./Config.js";

// our lib
import Alap from "../src/index.js";

// pass the config objecty
// alap(alapConfig);
const alap = new Alap(alapConfig);

alap.fun1("fun 1");
