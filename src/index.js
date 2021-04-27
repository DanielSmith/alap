// const alap = {};
let refNames = {};
let alapConfig;
let alapElem = null;
let curTimerID = 0;

export default function alap(config) {
  console.dir(config);

  let bodyClickHandler = null;
  let bodyKeyHandler = null;
  let menuMouseEnterHandler = null;
  let menuMouseLeaveHandler = null;
  let theBody = document.querySelector("body");
  let alapActive = false;

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
  // alapConfig = config;
  // alapConfig = { ...config };
  console.dir(alapConfig);

  // any element with the class of 'alap'... does not have to be an
  // anchor ("a")
  let myLinks = Array.from(document.getElementsByClassName("alap"));

  console.dir(myLinks);

  for (const curLink of myLinks) {
    // dont allow more than one listener for a given signature
    // init may be called more than once (when elements are dynamically added
    // or updated). It's safe to call this when there is no listener bound
    curLink.removeEventListener("click", doClick);

    // ok, now we're good to bind
    curLink.addEventListener("click", doClick, false);
  }
  // }

  function removeMenu() {
    const alapElem = document.getElementById("alap");
    alapElem.style.display = "none";
    stopTimer();
  }

  bodyClickHandler = function (event) {
    event.preventDefault();
    removeMenu();
  };

  bodyKeyHandler = function (event) {
    if (event.keyCode == 27) {
      removeMenu();
    }
  };

  menuMouseLeaveHandler = () => {
    console.log("mouse out");
    startTimer();
  };

  menuMouseEnterHandler = () => {
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
    let knownWords = [];
    let myData = "";

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

    let dataElem = myData.split(",");
    // console.dir(dataElem);

    for (const curDataElem of dataElem) {
      let curWord = curDataElem.toString();

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
          let theId = curWord.slice(1);
          recurseIdElement = document.getElementById(theId);

          checkline = recurseIdElement.getAttribute("data-alap-linkitems");
          knownWords.push.apply(knownWords, parseLine(checkline));
        } else {
          knownWords.push(curWord);
        }
      }
    }

    return knownWords;
  }

  function searchTags(searchStr) {
    // let theConfig = alapConfig.allLinks;
    let resultSet = [];

    if (searchStr.charAt(0) == ".") {
      searchStr = searchStr.slice(1);
    }

    // alert(searchStr);

    console.dir(alapConfig);
    console.dir(alapConfig.allLinks);

    for (const key in alapConfig.allLinks) {
      console.log(key);

      let theTags = cleanArgList(alapConfig.allLinks[key].tags);

      let foundMatch = 0;
      const numTags = theTags.length;

      for (let i = 0; i < numTags && foundMatch == 0; i++) {
        if (theTags[i] == searchStr) {
          foundMatch++;
          resultSet.push(key);
        }
      }
    }

    return resultSet;
  }

  function cleanArgList(aList) {
    const allElems = [];

    // may need to test here for an object...
    const theElems = aList.toString().split(",");

    theElems.map((curElem) => {
      allElems.push(curElem.replace(/\s+|["']+/g, ""));
    });

    return allElems;
  }

  function parseElem(theElem) {
    // alert(theElem);
    let resultSet = [];
    let curResultSet = [];
    let myIDsWithTag = [];

    let tokens = theElem.split(" ");

    // are we looking for an 'AND'?
    let needIntersection = 0;
    // are we looking to remove items?
    let needWithout = 0;
    // are we looking for an 'OR'?
    let needUnion = 0;

    console.dir(tokens);

    for (const curToken of tokens) {
      const firstChar = curToken.charAt(0);

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
            resultSet = resultSet.filter((x) => !curResultSet.includes(x));
          } else if (needIntersection) {
            resultSet = resultSet.filter((x) => curResultSet.includes(x));
          } else if (needUnion) {
            resultSet = [...new Set([...resultSet, ...curResultSet])];
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
    let m = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (m) {
      return "rgba(" + [m[1], m[2], m[3], "1.0"].join(",") + ")";
    }

    m = color.match(
      /^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*((0.)?\d+)\s*\)$/i
    );
    if (m) {
      return "rgba(" + [m[1], m[2], m[3], "1.0"].join(",") + ")";
    }
  }

  function doClick(event) {
    event.preventDefault();
    event.stopPropagation();

    let allDataElem;
    let theData = event.target.getAttribute("data-alap-linkitems");

    let theCSSClass = event.target.getAttribute("data-alap-cssclass") || null;
    let cssAttr = "";
    let theTargets = [];
    let allSeen = {};
    let anchorCSS = getComputedStyle(event.target, ":hover");

    alapActive = true;
    refNames = {};

    if (theCSSClass) {
      cssAttr = `class="${theCSSClass}"`;
      // alert(cssAttr);
    }

    // in case we have any strays...
    theBody.removeEventListener("click", bodyClickHandler);
    theBody.removeEventListener("keydown", bodyKeyHandler);

    theBody.addEventListener("click", bodyClickHandler, { once: true });
    theBody.addEventListener("keydown", bodyKeyHandler);

    let myOffset = offset(event.target);

    console.dir(myOffset);
    let divCSS = {};

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
    alapElem.style.cssText = `
    top: 10px;                        
    position: absolute;
    border: 2px solid black;
    zIndex: 10;
    left: ${myOffset.left}px;
    top: ${myOffset.top}px;
    width: 200px;
    opacity: 1;
    background: #ffccee;
    `;

    allDataElem = parseLine(theData);
    console.dir(allDataElem);

    for (const curElem of allDataElem) {
      theTargets = [...theTargets, ...parseElem(curElem)];
    }

    console.dir(theTargets);
    console.dir(alapConfig);

    let menuHTML = `<ol ${cssAttr}>`;
    theTargets.map((curTarget) => {
      let curInfo = alapConfig.allLinks[curTarget];

      // alert(curTarget);

      menuHTML += `
        <li><a target="alapwindow"
        href=${curInfo.url}>${curInfo.label}</a></li>
        `;
    });
    menuHTML += `</ol>`;

    console.log(menuHTML);

    alapElem.innerHTML = menuHTML;

    // strays?
    alapElem.removeEventListener("mouseleave", menuMouseLeaveHandler);
    alapElem.removeEventListener("mouseenter", menuMouseEnterHandler);
    // add event handler on our menu for mouseouts...
    alapElem.addEventListener("mouseleave", menuMouseLeaveHandler);
    alapElem.addEventListener("mouseenter", menuMouseEnterHandler);
  }
}
