export default class alap {
  refNames = {};
  alapConfig;
  alapElem = null;
  curTimerID = 0;
  theBody = null;

  constructor(config) {
    this.configure(config);

    this.boundDoClick = () => this.doClick();
  }

  configure(config) {
    this.theBody = document.querySelector("body");

    // function init(config = {}) {
    // is there an existing alap elenent?
    this.alapElem = document.getElementById("alap");
    if (this.alapElem) {
      document.removeChild(this.alapElem);
    }

    // start fresh
    this.alapElem = document.createElement("div");
    this.alapElem.setAttribute("id", "alap");

    document.body.append(this.alapElem);
    this.alapConfig = Object.assign({}, config);
    console.dir(this.alapConfig);

    // any element with the class of 'alap'... does not have to be an
    // anchor ("a")
    let myLinks = Array.from(document.getElementsByClassName("alap"));
    console.dir(myLinks);

    for (const curLink of myLinks) {
      // dont allow more than one listener for a given signature
      // init may be called more than once (when elements are dynamically added
      // or updated). It's safe to call this when there is no listener bound
      curLink.removeEventListener("click", this.doClick);

      console.log(curLink);

      // ok, now we're good to bind
      curLink.addEventListener("click", this.doClick.bind(this), false);
    }
  }

  afun(arg) {
    alert("  dls  see" + arg);
  }

  removeMenu() {
    this.alapElem = document.getElementById("alap");
    this.alapElem.style.display = "none";
    this.stopTimer();
  }

  bodyClickHandler(event) {
    // event.preventDefault();
    let inMenu = event.target.closest("#alap");

    if (!inMenu) {
      this.removeMenu();
    }

    console.log(inMenu);
  }

  bodyKeyHandler(event) {
    if (event.keyCode == 27) {
      this.removeMenu();
    }
  }

  menuMouseLeaveHandler() {
    console.log("mouse out");
    this.startTimer();
  }

  menuMouseEnterHandler() {
    console.log("mouse enter");
    this.stopTimer();
  }

  startTimer() {
    this.curTimerID = setTimeout(this.removeMenu.bind(this), 3000);
    console.log("start", this.curTimerID);
  }

  stopTimer() {
    clearTimeout(this.curTimerID);
  }

  parseLine(theStr) {
    let knownWords = [];
    let myData = "";
    let recurseIdElement;
    let checkline;

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

    for (const curDataElem of dataElem) {
      let curWord = curDataElem.toString();

      // too short? dont bother
      if (curWord.length < 2) {
        continue;
      }

      if (this.refNames.hasOwnProperty(curWord)) {
        // console.log("already have seen");
        // console.log(curWord);
      } else {
        if (curWord.charAt(0) == "#") {
          this.refNames[curWord] = 1;

          // go find a list of items elsewhere and bundle them in with
          // our current line...oh, and do it recursively...

          // get the #element....
          let theId = curWord.slice(1);
          recurseIdElement = document.getElementById(theId);

          checkline = recurseIdElement.getAttribute("data-alap-linkitems");
          knownWords.push.apply(knownWords, this.parseLine(checkline));
        } else {
          knownWords.push(curWord);
        }
      }
    }

    return knownWords;
  }

  searchTags(searchStr) {
    // let theConfig = alapConfig.allLinks;
    let resultSet = [];

    if (searchStr.charAt(0) == ".") {
      searchStr = searchStr.slice(1);
    }

    for (const key in this.alapConfig.allLinks) {
      let theTags = this.cleanArgList(this.alapConfig.allLinks[key].tags);

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

  cleanArgList(aList) {
    const allElems = [];

    // may need to test here for an object...
    const theElems = aList.toString().split(",");

    theElems.map((curElem) => {
      allElems.push(curElem.replace(/\s+|["']+/g, ""));
    });

    return allElems;
  }

  parseElem(theElem) {
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
          curResultSet = this.searchTags(curToken);

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
          if (this.alapConfig.allLinks[curToken] !== undefined) {
            resultSet.push(curToken.toString());
          }
          break;
      }
    }

    // console.dir(resultSet);
    return resultSet;
  }

  offset(el) {
    const rect = el.getBoundingClientRect(),
      scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
  }

  forceColorOpaque(color) {
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

  doClick(event) {
    event.preventDefault();
    event.stopPropagation();

    let allDataElem;
    let theData = event.target.getAttribute("data-alap-linkitems");

    let theCSSClass = event.target.getAttribute("data-alap-cssclass") || null;
    let cssAttr = "";
    let theTargets = [];
    let allSeen = {};
    let anchorCSS = getComputedStyle(event.target, ":hover");

    // may not be needed
    this.refNames = {};

    if (theCSSClass) {
      cssAttr = `class="${theCSSClass}"`;
      // alert(cssAttr);
    }

    // in case we have any strays...
    this.theBody.removeEventListener("click", this.bodyClickHandler);
    this.theBody.removeEventListener("keydown", this.bodyKeyHandler);

    this.theBody.addEventListener("click", this.bodyClickHandler.bind(this), {
      once: true,
    });
    this.theBody.addEventListener("keydown", this.bodyKeyHandler.bind(this));

    let myOffset = this.offset(event.target);

    myOffset.top += 20;
    let divCSS = {};

    divCSS.zIndex = 10;
    if (anchorCSS.zIndex && anchorCSS.zIndex !== "auto") {
      divCSS.zIndex = anchorCSS.zIndex + 10;
    }

    divCSS.background = this.forceColorOpaque(anchorCSS.backgroundColor);

    // alapElem.style.top = 10;
    // alapElem.style.left = myOffset.left;
    this.alapElem.style.display = "block";

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
    this.alapElem.style.cssText = `
      position: absolute;
      border: 2px solid black;
      zIndex: 10;
      left: ${myOffset.left}px;
      top: ${myOffset.top}px;
      width: 200px;
      opacity: 1;
      background: #ffffff;
      `;

    allDataElem = this.parseLine(theData);

    for (const curElem of allDataElem) {
      theTargets = [...theTargets, ...this.parseElem(curElem)];
    }

    // console.dir(theTargets);
    // console.dir(alapConfig);

    let menuHTML = `<ol ${cssAttr}>`;
    theTargets.map((curTarget) => {
      let curInfo = this.alapConfig.allLinks[curTarget];

      // alert(curTarget);

      menuHTML += `
          <li><a target="alapwindow"
          href=${curInfo.url}>${curInfo.label}</a></li>
          `;
    });
    menuHTML += `</ol>`;

    this.alapElem.innerHTML = menuHTML;

    // strays?
    this.alapElem.removeEventListener("mouseleave", this.menuMouseLeaveHandler);
    this.alapElem.removeEventListener("mouseenter", this.menuMouseEnterHandler);

    // exit any existing timer...
    this.stopTimer();
    this.startTimer();
    // add event handler on our menu for mouseouts...
    this.alapElem.addEventListener(
      "mouseleave",
      this.menuMouseLeaveHandler.bind(this)
    );
    this.alapElem.addEventListener(
      "mouseenter",
      this.menuMouseEnterHandler.bind(this)
    );
  }
}
