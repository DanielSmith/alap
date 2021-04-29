"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = alap;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// const alap = {};
var refNames = {};
var alapConfig = void 0;
var alapElem = null;
var curTimerID = 0;

function alap(config) {
  console.dir(config);

  var bodyClickHandler = null;
  var bodyKeyHandler = null;
  var menuMouseEnterHandler = null;
  var menuMouseLeaveHandler = null;
  var theBody = document.querySelector("body");
  var alapActive = false;

  // function init(config = {}) {
  // is there an existing alap elenent?
  alapElem = document.getElementById("alap");
  if (alapElem) {
    document.removeChild(alapElem);
  }

  // start fresh
  alapElem = document.createElement("div");
  alapElem.setAttribute("id", "alap");

  document.body.append(alapElem);
  alapConfig = Object.assign({}, config);

  // any element with the class of 'alap'... does not have to be an
  // anchor ("a")
  var myLinks = Array.from(document.getElementsByClassName("alap"));

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = myLinks[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var curLink = _step.value;

      // dont allow more than one listener for a given signature
      // init may be called more than once (when elements are dynamically added
      // or updated). It's safe to call this when there is no listener bound
      curLink.removeEventListener("click", doClick);

      // ok, now we're good to bind
      curLink.addEventListener("click", doClick, false);
    }
    // }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  function removeMenu() {
    var alapElem = document.getElementById("alap");
    alapElem.style.display = "none";
    stopTimer();
  }

  bodyClickHandler = function bodyClickHandler(event) {
    // event.preventDefault();
    var inMenu = event.target.closest("#alap");

    if (!inMenu) {
      removeMenu();
    }

    console.log(inMenu);
  };

  bodyKeyHandler = function bodyKeyHandler(event) {
    if (event.keyCode == 27) {
      removeMenu();
    }
  };

  menuMouseLeaveHandler = function menuMouseLeaveHandler() {
    console.log("mouse out");
    startTimer();
  };

  menuMouseEnterHandler = function menuMouseEnterHandler() {
    console.log("mouse enter");
    stopTimer();
  };

  function startTimer() {
    curTimerID = setTimeout(removeMenu, 3000);
    console.log("start", curTimerID);
  }

  function stopTimer() {
    clearTimeout(curTimerID);
  }

  function parseLine(theStr) {
    var knownWords = [];
    var myData = "";
    var recurseIdElement = void 0;
    var checkline = void 0;

    if (!theStr) return [];

    // if we need to split for tag intersections and diffs later,
    // we provide a consistent space separated string
    myData = theStr.replace(/\s+|["']+/g, "");
    myData = myData.replace(/\-{1,}/g, " - ");
    myData = myData.replace(/\+{1,}/g, " + ");
    myData = myData.replace(/\|{1,}/g, " | ");

    myData = myData.replace(/,{1,}/g, ",");
    myData = myData.replace(/\.{1,}/g, ".");
    myData = myData.replace(/\#{1,}/g, "#");

    var dataElem = myData.split(",");
    // console.dir(dataElem);

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = dataElem[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var curDataElem = _step2.value;

        var curWord = curDataElem.toString();

        // too short? dont bother
        if (curWord.length < 2) {
          continue;
        }

        if (refNames.hasOwnProperty(curWord)) {
          // console.log("already have seen");
          // console.log(curWord);
        } else {
          if (curWord.charAt(0) == "#") {
            refNames[curWord] = 1;

            // go find a list of items elsewhere and bundle them in with
            // our current line...oh, and do it recursively...

            // get the #element....
            var theId = curWord.slice(1);
            recurseIdElement = document.getElementById(theId);

            checkline = recurseIdElement.getAttribute("data-alap-linkitems");
            knownWords.push.apply(knownWords, parseLine(checkline));
          } else {
            knownWords.push(curWord);
          }
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return knownWords;
  }

  function searchTags(searchStr) {
    // let theConfig = alapConfig.allLinks;
    var resultSet = [];

    if (searchStr.charAt(0) == ".") {
      searchStr = searchStr.slice(1);
    }

    for (var key in alapConfig.allLinks) {
      var theTags = cleanArgList(alapConfig.allLinks[key].tags);

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

  function cleanArgList(aList) {
    var allElems = [];

    // may need to test here for an object...
    var theElems = aList.toString().split(",");

    theElems.map(function (curElem) {
      allElems.push(curElem.replace(/\s+|["']+/g, ""));
    });

    return allElems;
  }

  function parseElem(theElem) {
    // alert(theElem);
    var resultSet = [];
    var curResultSet = [];
    var myIDsWithTag = [];

    var tokens = theElem.split(" ");

    // are we looking for an 'AND'?
    var needIntersection = 0;
    // are we looking to remove items?
    var needWithout = 0;
    // are we looking for an 'OR'?
    var needUnion = 0;

    console.dir(tokens);

    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = tokens[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var curToken = _step3.value;

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
            curResultSet = searchTags(curToken);

            if (needWithout) {
              resultSet = resultSet.filter(function (x) {
                return !curResultSet.includes(x);
              });
            } else if (needIntersection) {
              resultSet = resultSet.filter(function (x) {
                return curResultSet.includes(x);
              });
            } else if (needUnion) {
              resultSet = [].concat(_toConsumableArray(new Set([].concat(_toConsumableArray(resultSet), _toConsumableArray(curResultSet)))));
            } else {
              resultSet.push.apply(resultSet, curResultSet);
            }
            needWithout = 0;
            needIntersection = 0;
            needUnion = 0;

            break;

          // the normal case of getting data from an id
          default:
            if (alapConfig.allLinks[curToken] !== undefined) {
              resultSet.push(curToken.toString());
            }
            break;
        }
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

    console.dir(resultSet);
    return resultSet;
  }

  function offset(el) {
    var rect = el.getBoundingClientRect(),
        scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
  }

  function forceColorOpaque(color) {
    var m = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (m) {
      return "rgba(" + [m[1], m[2], m[3], "1.0"].join(",") + ")";
    }

    m = color.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*((0.)?\d+)\s*\)$/i);
    if (m) {
      return "rgba(" + [m[1], m[2], m[3], "1.0"].join(",") + ")";
    }
  }

  function doClick(event) {
    event.preventDefault();
    event.stopPropagation();

    var allDataElem = void 0;
    var theData = event.target.getAttribute("data-alap-linkitems");

    var theCSSClass = event.target.getAttribute("data-alap-cssclass") || null;
    var cssAttr = "";
    var theTargets = [];
    var allSeen = {};
    var anchorCSS = getComputedStyle(event.target, ":hover");

    alapActive = true;
    refNames = {};

    if (theCSSClass) {
      cssAttr = "class=\"" + theCSSClass + "\"";
      // alert(cssAttr);
    }

    // in case we have any strays...
    theBody.removeEventListener("click", bodyClickHandler);
    theBody.removeEventListener("keydown", bodyKeyHandler);

    theBody.addEventListener("click", bodyClickHandler, { once: true });
    theBody.addEventListener("keydown", bodyKeyHandler);

    var myOffset = offset(event.target);

    myOffset.top += 20;
    var divCSS = {};

    divCSS.zIndex = 10;
    if (anchorCSS.zIndex && anchorCSS.zIndex !== "auto") {
      divCSS.zIndex = anchorCSS.zIndex + 10;
    }

    divCSS.background = forceColorOpaque(anchorCSS.backgroundColor);

    // alapElem.style.top = 10;
    // alapElem.style.left = myOffset.left;
    alapElem.style.display = "block";

    // redo this...
    // alapElem.style.cssText = `
    // top: 10px;
    // position: absolute;
    // border: 2px solid black;
    // zIndex: ${divCSS.zIndex};
    // left: ${myOffset.left}px;
    // top: ${myOffset.top}px;
    // opacity: 1;
    // background: ${divCSS.background};
    // `;

    // redo this...
    alapElem.style.cssText = "\n    position: absolute;\n    border: 2px solid black;\n    zIndex: 10;\n    left: " + myOffset.left + "px;\n    top: " + myOffset.top + "px;\n    width: 200px;\n    opacity: 1;\n    background: #ffffff;\n    ";

    allDataElem = parseLine(theData);

    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _iterator4 = allDataElem[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var curElem = _step4.value;

        theTargets = [].concat(_toConsumableArray(theTargets), _toConsumableArray(parseElem(curElem)));
      }

      // console.dir(theTargets);
      // console.dir(alapConfig);
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4.return) {
          _iterator4.return();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }

    var menuHTML = "<ol " + cssAttr + ">";
    theTargets.map(function (curTarget) {
      var curInfo = alapConfig.allLinks[curTarget];

      // alert(curTarget);

      menuHTML += "\n        <li><a target=\"alapwindow\"\n        href=" + curInfo.url + ">" + curInfo.label + "</a></li>\n        ";
    });
    menuHTML += "</ol>";

    alapElem.innerHTML = menuHTML;

    // strays?
    alapElem.removeEventListener("mouseleave", menuMouseLeaveHandler);
    alapElem.removeEventListener("mouseenter", menuMouseEnterHandler);
    // add event handler on our menu for mouseouts...
    alapElem.addEventListener("mouseleave", menuMouseLeaveHandler);
    alapElem.addEventListener("mouseenter", menuMouseEnterHandler);
  }
}