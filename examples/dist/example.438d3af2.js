// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"Config.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.alapConfig = void 0;

/*
 **	Config.json
 */
var alapConfig = {
  allLinks: {
    bmwe36: {
      label: "BMW (E36) - Wikipedia",
      url: "http://en.wikipedia.org/wiki/BMW_3_Series_(E36)",
      tags: ["e36m3", "bmw", "car", "germany"]
    },
    vwbug: {
      label: "VW Bug",
      url: "http://en.wikipedia.org/wiki/Volkswagen_Beetle",
      tags: ["vw", "car", "germany"]
    },
    sierranevada: {
      label: "Sierra Nevada",
      url: "http://www.sierranevada.com/",
      tags: ["beer", "ale"]
    },
    fosters: {
      label: "Fosters Beer",
      url: "http://www.fostersbeer.com/",
      tags: ["australia", "beer", "lager"]
    },
    pilsnerurquell: {
      label: "Pilsner Urquell",
      url: "http://www.pilsnerurquell.com/us-home",
      tags: ["beer", "pilsner"]
    },
    radeberger: {
      label: "Radeberger Pilsner",
      url: "http://goo.gl/F7vhs",
      tags: ["beer", "pilsner", "germany"]
    },
    acrecoffee: {
      label: "Acre Coffee",
      url: "http://www.acrecoffee.com/",
      tags: ["cafe", "petaluma", "coffee"]
    },
    wsbistro: {
      label: "Water Street Bistro",
      url: "http://www.waterstreetbistro.net",
      tags: ["cafe", "petaluma", "frenchfood"]
    },
    aqus: {
      label: "Aqus Cafe",
      url: "http://aquscafe.com/",
      tags: ["cafe", "petaluma", "beer", "community", "coffee"]
    },
    jodiefoster: {
      label: "Jodie Foster",
      url: "http://en.wikipedia.org/wiki/Jodie_Foster",
      tags: ["actress"]
    },
    gracehopper: {
      label: "Grace Hopper",
      url: "http://en.wikipedia.org/wiki/Grace_Hopper",
      tags: ["navy", "computerscientist", "innovator"]
    },
    nychighline: {
      label: "The High Line",
      url: "http://www.thehighline.org/",
      tags: ["nyc", "park", "manhattan", "city"]
    },
    centralpark: {
      label: "The Official Website of Central Park",
      url: "http://www.centralparknyc.org",
      tags: ["nyc", "park", "manhattan", "city"]
    },
    prospectpark: {
      label: "Prospect Park",
      url: "http://www.prospectpark.org/",
      tags: ["nyc", "park", "brooklyn"]
    },
    mtainfo: {
      label: "mta.info - transit",
      url: "http://www.mta.info",
      tags: ["nyc", "transit", "subway", "bus"]
    },
    brooklynbridge: {
      label: "Brooklyn Bridge",
      url: "http://en.wikipedia.org/wiki/Brooklyn_Bridge",
      tags: ["nyc", "bridge", "brooklyn", "manhattan"]
    },
    manhattanbridge: {
      label: "Manhattan Bridge",
      url: "http://en.wikipedia.org/wiki/Manhattan_Bridge",
      tags: ["nyc", "bridge", "manhattan"]
    },
    visitbrooklyn: {
      label: "Visit Brooklyn",
      url: "http://www.visitbrooklyn.org/",
      tags: ["nyc", "brooklyn", "city"]
    },
    brooklynbrewery: {
      label: "Brooklyn Brewery",
      url: "http://brooklynbrewery.com/",
      tags: ["nyc", "brooklyn", "beer", "pub", "cafe"]
    },
    sydneyoz: {
      label: "Sydney, Australia",
      url: "http://en.wikipedia.org/wiki/Sydney",
      tags: ["australia", "sydney", "city"]
    },
    sydneybridgeclimb: {
      label: "Sydney Harbour Bridge Tour",
      url: "http://www.bridgeclimb.com",
      tags: ["australia", "sydney", "tour"]
    },
    sydneybotanical: {
      label: "Sydney Botanical Gardens",
      url: "http://www.rbgsyd.nsw.gov.au/",
      tags: ["australia", "sydney", "park"]
    },
    bluemountainsoz: {
      label: "Blue Mountains",
      url: "http://www.bluemts.com.au/",
      tags: ["australia", "mountain", "park"]
    },
    barossaoz: {
      label: "Australia - Barossa Valley Wine Region",
      url: "http://www.barossa.com/",
      tags: ["australia", "wine"]
    },
    melbournepz: {
      label: "Melbourne",
      url: "http://www.visitmelbourne.com/",
      tags: ["australia", "melbourne", "city"]
    },
    melbourneapoz: {
      label: "Melbourne - Albert Park / F1",
      url: "http://en.wikipedia.org/wiki/Melbourne_Grand_Prix_Circuit",
      tags: ["australia", "melbourne", "city", "park"]
    },
    ggbridge: {
      label: "Golden Gate Bridge",
      url: "http://en.wikipedia.org/wiki/Golden_Gate_Bridge",
      tags: ["sanfrancisco", "bridge"]
    },
    parispontneuf: {
      label: "Paris - Pont Neuf",
      url: "http://en.wikipedia.org/wiki/Pont_Neuf",
      tags: ["paris", "city", "bridge"]
    },
    londontowerbridge: {
      label: "London - Tower Bridge",
      url: "http://en.wikipedia.org/wiki/Tower_Bridge",
      tags: ["london", "city", "bridge"]
    },
    londonhyde: {
      label: "London - Hyde Park",
      url: "http://www.royalparks.gov.uk/Hyde-Park.aspx",
      tags: ["london", "city", "park"]
    },
    mlblog1: {
      label: "One Link, Many Paths, Clicking Choice! (MultiLink, Part 1)",
      url: "http://daniel.org/cafebucky/2012/02/26/one-link-many-paths-clicking-choice-multilink-part-1/",
      tags: ["alap", "blog"]
    },
    mlblog2: {
      label: "(MultiLink, Part 2) - where I introduce tags...",
      url: "http://daniel.org/cafebucky/2012/02/27/one-link-many-paths-clicking-choice-multilink-part-2/",
      tags: ["alap", "blog"]
    },
    mlblog3: {
      label: "(MultiLink, Part 3) - ID Includes and Tag Expressions...",
      url: "http://daniel.org/cafebucky/2012/03/01/one-link-many-paths-clicking-choice-multilink-part-3/",
      tags: ["alap", "blog"]
    }
  }
};
exports.alapConfig = alapConfig;
},{}],"../src/index.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var alap = /*#__PURE__*/function () {
  function alap(config) {
    var _this = this;

    _classCallCheck(this, alap);

    _defineProperty(this, "refNames", {});

    _defineProperty(this, "alapConfig", void 0);

    _defineProperty(this, "alapElem", null);

    _defineProperty(this, "curTimerID", 0);

    _defineProperty(this, "theBody", null);

    this.configure(config);

    this.boundDoClick = function () {
      return _this.doClick();
    };
  }

  _createClass(alap, [{
    key: "configure",
    value: function configure(config) {
      this.theBody = document.querySelector("body"); // function init(config = {}) {
      // is there an existing alap elenent?

      this.alapElem = document.getElementById("alapelem");

      if (this.alapElem) {
        document.removeChild(this.alapElem);
      } // start fresh


      this.alapElem = document.createElement("div");
      this.alapElem.setAttribute("id", "alapelem");
      document.body.append(this.alapElem);
      this.alapConfig = Object.assign({}, config);
      console.dir(this.alapConfig); // any element with the class of 'alap'... does not have to be an
      // anchor ("a")

      var myLinks = Array.from(document.getElementsByClassName("alap"));
      console.dir(myLinks);

      for (var _i = 0, _myLinks = myLinks; _i < _myLinks.length; _i++) {
        var curLink = _myLinks[_i];
        // dont allow more than one listener for a given signature
        // init may be called more than once (when elements are dynamically added
        // or updated). It's safe to call this when there is no listener bound
        curLink.removeEventListener("click", this.doClick); // console.log(curLink);
        // ok, now we're good to bind

        curLink.addEventListener("click", this.doClick.bind(this), false);
      }
    }
  }, {
    key: "removeMenu",
    value: function removeMenu() {
      this.alapElem = document.getElementById("alapelem");
      this.alapElem.style.display = "none";
      this.stopTimer();
    }
  }, {
    key: "bodyClickHandler",
    value: function bodyClickHandler(event) {
      // event.preventDefault();
      var inMenu = event.target.closest("#alapelem");

      if (!inMenu) {
        this.removeMenu();
      }
    }
  }, {
    key: "bodyKeyHandler",
    value: function bodyKeyHandler(event) {
      if (event.keyCode == 27) {
        this.removeMenu();
      }
    }
  }, {
    key: "menuMouseLeaveHandler",
    value: function menuMouseLeaveHandler() {
      this.startTimer();
    }
  }, {
    key: "menuMouseEnterHandler",
    value: function menuMouseEnterHandler() {
      this.stopTimer();
    }
  }, {
    key: "startTimer",
    value: function startTimer() {
      this.curTimerID = setTimeout(this.removeMenu.bind(this), 3000);
    }
  }, {
    key: "stopTimer",
    value: function stopTimer() {
      clearTimeout(this.curTimerID);
    }
  }, {
    key: "parseLine",
    value: function parseLine(theStr) {
      var knownWords = [];
      var myData = "";
      var recurseIdElement;
      var checkline;
      if (!theStr) return []; // if we need to split for tag intersections and diffs later,
      // we provide a consistent space separated string

      myData = theStr.replace(/\s+|["']+/g, "");
      myData = myData.replace(/\-{1,}/g, " - ");
      myData = myData.replace(/\+{1,}/g, " + ");
      myData = myData.replace(/\|{1,}/g, " | ");
      myData = myData.replace(/,{1,}/g, ",");
      myData = myData.replace(/\.{1,}/g, ".");
      myData = myData.replace(/\#{1,}/g, "#"); // for future use, '@' for macro...

      myData = myData.replace(/\@{1,}/g, "@");
      var dataElem = myData.split(",");

      var _iterator = _createForOfIteratorHelper(dataElem),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var curDataElem = _step.value;
          var curWord = curDataElem.toString(); // too short? dont bother

          if (curWord.length < 2) {
            continue;
          }

          if (this.refNames.hasOwnProperty(curWord)) {// console.log("already have seen");
            // console.log(curWord);
          } else {
            if (curWord.charAt(0) == "#") {
              this.refNames[curWord] = 1; // go find a list of items elsewhere and bundle them in with
              // our current line...oh, and do it recursively...
              // get the #element....

              var theId = curWord.slice(1);
              recurseIdElement = document.getElementById(theId);
              checkline = recurseIdElement.getAttribute("data-alap-linkitems");
              knownWords.push.apply(knownWords, this.parseLine(checkline));
            } else {
              knownWords.push(curWord);
            }
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return knownWords;
    }
  }, {
    key: "searchTags",
    value: function searchTags(searchStr) {
      // let theConfig = alapConfig.allLinks;
      var resultSet = [];

      if (searchStr.charAt(0) == ".") {
        searchStr = searchStr.slice(1);
      }

      for (var key in this.alapConfig.allLinks) {
        var theTags = this.cleanArgList(this.alapConfig.allLinks[key].tags);
        var foundMatch = 0;
        var numTags = theTags.length;

        for (var i = 0; i < numTags && foundMatch == 0; i++) {
          if (theTags[i] == searchStr) {
            foundMatch++;
            resultSet.push(key);
          }
        }
      }

      return resultSet;
    }
  }, {
    key: "cleanArgList",
    value: function cleanArgList(aList) {
      var allElems = []; // may need to test here for an object...

      var theElems = aList.toString().split(",");
      theElems.map(function (curElem) {
        allElems.push(curElem.replace(/\s+|["']+/g, ""));
      });
      return allElems;
    }
  }, {
    key: "parseElem",
    value: function parseElem(theElem) {
      // alert(theElem);
      var resultSet = [];
      var curResultSet = [];
      var myIDsWithTag = [];
      var tokens = theElem.split(" "); // are we looking for an 'AND'?

      var needIntersection = 0; // are we looking to remove items?

      var needWithout = 0; // are we looking for an 'OR'?

      var needUnion = 0;

      var _iterator2 = _createForOfIteratorHelper(tokens),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var curToken = _step2.value;
          var firstChar = curToken.charAt(0);

          switch (firstChar) {
            // intersection
            case "+":
              if (curToken.length == 1) {
                needIntersection = 1;
              }

              break;
            // without .. subtraction

            case "-":
              if (curToken.length == 1) {
                needWithout = 1;
              }

              break;
            // "OR"

            case "|":
              if (curToken.length == 1) {
                needUnion = 1;
              }

              break;
            // we're looking for a tag

            case ".":
              curResultSet = this.searchTags(curToken);

              if (needWithout) {
                resultSet = resultSet.filter(function (x) {
                  return !curResultSet.includes(x);
                });
              } else if (needIntersection) {
                resultSet = resultSet.filter(function (x) {
                  return curResultSet.includes(x);
                });
              } else if (needUnion) {
                resultSet = _toConsumableArray(new Set([].concat(_toConsumableArray(resultSet), _toConsumableArray(curResultSet))));
              } else {
                resultSet.push.apply(resultSet, curResultSet);
              }

              needWithout = 0;
              needIntersection = 0;
              needUnion = 0;
              break;
            // this is a no-op for now, reserving '@' for future use as macro

            case "@":
              break;
            // the normal case of getting data from an id

            default:
              if (this.alapConfig.allLinks[curToken] !== undefined) {
                resultSet.push(curToken.toString());
              }

              break;
          }
        } // console.dir(resultSet);

      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      return resultSet;
    }
  }, {
    key: "offset",
    value: function offset(el) {
      var rect = el.getBoundingClientRect(),
          scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
          scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft
      };
    }
  }, {
    key: "forceColorOpaque",
    value: function forceColorOpaque(color) {
      var m = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);

      if (m) {
        return "rgba(" + [m[1], m[2], m[3], "1.0"].join(",") + ")";
      }

      m = color.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*((0.)?\d+)\s*\)$/i);

      if (m) {
        return "rgba(" + [m[1], m[2], m[3], "1.0"].join(",") + ")";
      }
    }
  }, {
    key: "doClick",
    value: function doClick(event) {
      var _this2 = this;

      event.preventDefault();
      event.stopPropagation(); // console.dir(getComputedStyle(event.target));

      console.dir(event.target.className);
      var allDataElem;
      var theData = event.target.getAttribute("data-alap-linkitems");
      var theCSSClass = event.target.getAttribute("data-alap-cssclass") || null;
      var cssAttr = "";
      var theTargets = []; // let anchorCSS = getComputedStyle(event.target, ":hover");
      // let anchorCSS = getComputedStyle(event.target);

      var anchorCSS = getComputedStyle(event.target, ":link");
      var anchorCSSNormal = getComputedStyle(event.target);
      console.log(anchorCSSNormal.backgroundColor); // may not be needed

      this.refNames = {};

      if (theCSSClass) {
        cssAttr = "class=\"".concat(theCSSClass, "\""); // alert(cssAttr);
      } // in case we have any strays...


      this.theBody.removeEventListener("click", this.bodyClickHandler);
      this.theBody.removeEventListener("keydown", this.bodyKeyHandler);
      this.theBody.addEventListener("click", this.bodyClickHandler.bind(this), {
        once: true
      });
      this.theBody.addEventListener("keydown", this.bodyKeyHandler.bind(this));
      var myOffset = this.offset(event.target);
      myOffset.top += 20;
      var divCSS = {};
      divCSS.zIndex = 10;

      if (anchorCSS.zIndex && anchorCSS.zIndex !== "auto") {
        divCSS.zIndex = anchorCSS.zIndex + 10;
      }

      divCSS.backgroundColor = "red"; // this.forceColorOpaque(anchorCSS.backgroundColor);
      // alapElem.style.top = 10;
      // alapElem.style.left = myOffset.left;

      this.alapElem.style.display = "block";
      this.alapElem.style.opacity = 1;
      this.alapElem.style.backgroundColor = "red"; // this.forceColorOpaque(
      //   anchorCSS.backgroundColor
      // );
      //   anchorCSS.backgroundColor
      // );
      // redo this...

      this.alapElem.style.cssText = "\n      position: absolute;\n      border: 2px solid black;\n      zIndex: 10;\n      left: ".concat(myOffset.left, "px;\n      top: ").concat(myOffset.top, "px;\n      width: auto;\n\n      background-color: ").concat(anchorCSSNormal.backgroundColor, ";\n      opacity: 1.0;\n      "); // backgroundColor: anchorCSSNormal.backgroundColor;

      allDataElem = this.parseLine(theData);

      var _iterator3 = _createForOfIteratorHelper(allDataElem),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var curElem = _step3.value;
          theTargets = [].concat(_toConsumableArray(theTargets), _toConsumableArray(this.parseElem(curElem)));
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }

      var menuHTML = "<ol ".concat(cssAttr, ">");
      theTargets.map(function (curTarget) {
        var curInfo = _this2.alapConfig.allLinks[curTarget]; // alert(curTarget);

        menuHTML += "\n          <li><a target=\"alapwindow\"\n          href=".concat(curInfo.url, ">").concat(curInfo.label, "</a></li>\n          ");
      });
      menuHTML += "</ol>";
      this.alapElem.innerHTML = menuHTML; // strays?

      this.alapElem.removeEventListener("mouseleave", this.menuMouseLeaveHandler);
      this.alapElem.removeEventListener("mouseenter", this.menuMouseEnterHandler); // exit any existing timer...

      this.stopTimer();
      this.startTimer(); // add event handler on our menu for mouseouts...

      this.alapElem.addEventListener("mouseleave", this.menuMouseLeaveHandler.bind(this));
      this.alapElem.addEventListener("mouseenter", this.menuMouseEnterHandler.bind(this));
    }
  }]);

  return alap;
}();

exports.default = alap;
},{}],"example.js":[function(require,module,exports) {
"use strict";

var _Config = require("./Config.js");

var _index = _interopRequireDefault(require("../src/index.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// our config object - in a dynamic project you would fetch
// JSON from a server, and convert to an object...
// our lib
// pass the config objecty
// alap(alapConfig);
var alap = new _index.default(_Config.alapConfig);
},{"./Config.js":"Config.js","../src/index.js":"../src/index.js"}],"../../../lib/node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "53514" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../../../lib/node_modules/parcel-bundler/src/builtins/hmr-runtime.js","example.js"], null)
//# sourceMappingURL=/example.438d3af2.js.map