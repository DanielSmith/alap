import "./style.css";
// our config object - in a dynamic project you would fetch
// JSON from a server, and convert to an object...
import { alapConfig } from "./Config.js";

// our lib, locally...
// import Alap from "./node_modules/alap/src/index.js";
import Alap from "../../src/index.js";

// ...or, if you are using npm, this would be:
//import Alap from "alap";

// pass the config object
const alap = new Alap(alapConfig);
