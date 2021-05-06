export default class alap {
  refNames = {};
  alapConfig;
  alapElem = null;
  curTimerID = 0;
  theBody = null;
  listType = "ol";
  menuTimeout = 5000;

  constructor(config) {
    this.configure(config);
    this.boundDoClick = () => this.doClick();
  }

  configure(config) {
    this.theBody = document.querySelector("body");

    // is there an existing alap elenent?
    this.alapElem = document.getElementById("alapelem");
    if (this.alapElem) {
      document.removeChild(this.alapElem);
    }

    // start fresh
    this.alapElem = document.createElement("div");
    this.alapElem.setAttribute("id", "alapelem");

    document.body.append(this.alapElem);
    this.alapConfig = Object.assign({}, config);

    this.listType = this.getSetting("listType", "ul");
    this.menuTimeout = +this.getSetting("menuTimeout", 5000);

    // any element with the class of 'alap'... does not have to be an
    // anchor ("a")
    let myLinks = Array.from(document.getElementsByClassName("alap"));
    // console.dir(myLinks);

    for (const curLink of myLinks) {
      // dont allow more than one listener for a given signature
      // init may be called more than once (when elements are dynamically added
      // or updated). It's safe to call this when there is no listener bound
      curLink.removeEventListener("click", this.doClick);
      // ok, now we're good to bind
      curLink.addEventListener("click", this.doClick.bind(this), false);
    }

    // in case of a stray one
    this.theBody.removeEventListener("click", this.bodyClickHandler);
    this.theBody.addEventListener("click", this.bodyClickHandler.bind(this));
  }

  getSetting(settingName, defaultValue = "") {
    let retVal = defaultValue;

    if (this.alapConfig && this.alapConfig.settings) {
      if (this.alapConfig.settings[settingName]) {
        retVal = this.alapConfig.settings[settingName];
      }
    }

    return retVal;
  }

  removeMenu() {
    this.alapElem = document.getElementById("alapelem");
    this.alapElem.style.display = "none";
    this.stopTimer();
  }

  bodyClickHandler(event) {
    let inMenu = event.target.closest("#alapelem");

    if (!inMenu) {
      this.removeMenu();
    }
  }

  bodyKeyHandler(event) {
    if (event.keyCode == 27) {
      this.removeMenu();
    }
  }

  menuMouseLeaveHandler() {
    console.log("      this.menuMouseLeaveHandler");
    this.startTimer();
  }

  menuMouseEnterHandler() {
    this.stopTimer();
  }

  startTimer() {
    if (this.curTimerID) {
      clearTimeout(this.curTimerID);
    }
    this.curTimerID = setTimeout(this.removeMenu.bind(this), this.menuTimeout);
  }

  stopTimer() {
    clearTimeout(this.curTimerID);
    this.curTimerID = 0;
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

    // for future use, '@' for macro...
    myData = myData.replace(/\@{1,}/g, "@");

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
    }

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

    let cssAttr = "";
    let anchorID = event.target.id || "";
    let theTargets = [];
    // let anchorCSS = getComputedStyle(event.target, ":hover");
    // let anchorCSS = getComputedStyle(event.target);
    let anchorCSS = getComputedStyle(event.target, ":link");
    let anchorCSSNormal = getComputedStyle(event.target);

    // may not be needed
    this.refNames = {};

    if (anchorID) {
      cssAttr = `alap_${anchorID}`;
    }

    // in case we have any strays...
    this.theBody.removeEventListener("keydown", this.bodyKeyHandler);
    this.theBody.addEventListener("keydown", this.bodyKeyHandler.bind(this));

    let myOffset = this.offset(event.target);

    myOffset.top += 20;
    let divCSS = {};

    divCSS.zIndex = 10;
    if (anchorCSS.zIndex && anchorCSS.zIndex !== "auto") {
      divCSS.zIndex = anchorCSS.zIndex + 10;
    }

    // alapElem.style.top = 10;
    // alapElem.style.left = myOffset.left;
    this.alapElem.style.display = "block";
    this.alapElem.style.opacity = 1;
    this.alapElem.style.backgroundColor = "red"; // this.forceColorOpaque(

    // redo this...
    this.alapElem.style.cssText = `
      position: absolute;
      z-index: 10;
      left: ${myOffset.left}px;
      top: ${myOffset.top}px;
      width: auto;
      background-color: ${anchorCSSNormal.backgroundColor};
      opacity: 1.0;
      `;

    // backgroundColor: anchorCSSNormal.backgroundColor;
    allDataElem = this.parseLine(theData);

    for (const curElem of allDataElem) {
      theTargets = [...theTargets, ...this.parseElem(curElem)];
    }

    // remove duplicates
    if (theTargets.length) {
      theTargets = [...new Set([...theTargets])];
    }

    // clear out any classes from our existing alapElem
    this.alapElem.removeAttribute("class");

    // ...and, if we have a specific css attribute to add,
    // the element is ready for a fresh class specifier
    this.alapElem.classList.add("alapelem");
    if (cssAttr) {
      this.alapElem.classList.add(cssAttr);
    }

    let menuHTML = `<${this.listType}>`;
    theTargets.map((curTarget) => {
      let curInfo = this.alapConfig.allLinks[curTarget];

      let cssClass = "alapListElem";
      if (curInfo.cssClass) {
        cssClass += ` ${curInfo.cssClass}`;
      }

      menuHTML += `
          <li class="${cssClass}"><a target="alapwindow"
          href=${curInfo.url}>${curInfo.label}</a></li>
          `;
    });
    menuHTML += `</${this.listType}>`;

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
