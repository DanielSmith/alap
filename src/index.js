export default class alap {
  refNames = {};
  alapConfig;
  alapElem = null;
  curTimerID = 0;
  theBody = null;
  listType = "ol";
  menuTimeout = 5000;
  ESC_KEYCODE = 27;

  constructor(config) {
    this.configure(config);
  }

  resetAlapElem() {
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
  }

  resetEvents() {
    // in case of a stray
    this.theBody.removeEventListener("click", this.bodyClickHandler);
    this.theBody.addEventListener("click", this.bodyClickHandler.bind(this));

    // in case we have any strays...
    this.theBody.removeEventListener("keydown", this.bodyKeyHandler);
    this.theBody.addEventListener("keydown", this.bodyKeyHandler.bind(this));

    // strays?
    this.alapElem.removeEventListener("mouseleave", this.menuMouseLeaveHandler);
    this.alapElem.removeEventListener("mouseenter", this.menuMouseEnterHandler);

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

  configure(config = {}) {
    if (Object.keys(config).length === 0) {
      return;
    }

    this.resetAlapElem();

    this.alapConfig = Object.assign({}, config);
    this.listType = this.getSetting("listType", "ul");
    this.menuTimeout = +this.getSetting("menuTimeout", 5000);

    // any element with the class of 'alap'... does not have to be an anchor element
    let myLinks = Array.from(document.getElementsByClassName("alap"));

    for (const curLink of myLinks) {
      // dont allow more than one listener for a given signature
      // init may be called more than once (when elements are dynamically added
      // or updated). It's safe to call this when there is no listener bound
      curLink.removeEventListener("click", this.doClick);
      // ok, now we're good to bind
      curLink.addEventListener("click", this.doClick.bind(this), false);
    }

    this.resetEvents();
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

  setSetting(settingName, value) {
    if (this.alapConfig && this.alapConfig.settings) {
      this.alapConfig.settings[settingName] = value;
    }
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
    if (event.keyCode == this.ESC_KEYCODE) {
      this.removeMenu();
    }
  }

  menuMouseLeaveHandler() {
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

  cleanMyData(theStr) {
    let myData = "";

    // if we need to split for tag intersections and diffs later,
    // we provide a consistent space separated string
    myData = theStr.replace(/\s+|["']+/g, "");
    myData = myData.replace(/\-{1,}/g, " - ");
    myData = myData.replace(/\+{1,}/g, " + ");
    myData = myData.replace(/\|{1,}/g, " | ");

    myData = myData.replace(/,{1,}/g, ",");
    myData = myData.replace(/\.{1,}/g, ".");
    myData = myData.replace(/\@{1,}/g, "@");

    // future use
    myData = myData.replace(/\#{1,}/g, "#");
    myData = myData.replace(/\*{1,}/g, "*");
    myData = myData.replace(/\%{1,}/g, "%");

    return myData;
  }

  parseLine(theStr) {
    let knownWords = [];
    let myData = "";

    if (!theStr) return [];

    myData = this.cleanMyData(theStr);
    let dataElem = myData.split(/[,]/);

    for (const curDataElem of dataElem) {
      let curWord = curDataElem.toString();
      curWord = curWord.trim();

      // too short? dont bother
      if (curWord.length < 2) {
        continue;
      }

      knownWords.push(curWord);

      // do we still need refNames??

      // if (this.refNames.hasOwnProperty(curWord)) {
      //   // console.log("already have seen");
      //   // console.log(curWord);
      // } else {
      // }
    }

    return knownWords;
  }

  searchTags(searchStr) {
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

  cleanArgList(aList = []) {
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

    // nothing to do...
    if (!theData) return;

    let tagType = event.target.tagName.toLowerCase();

    let cssAttr = "";
    let anchorID = event.target.id || "";
    let theTargets = [];
    let anchorCSS = getComputedStyle(event.target, ":link");
    let anchorCSSNormal = getComputedStyle(event.target);

    // may not be needed
    this.refNames = {};

    if (anchorID) {
      cssAttr = `alap_${anchorID}`;
    }

    // do we have a macro?
    if (theData.charAt(0) === "@") {
      let checkMacroName = null;

      // a bare '@'? Ok, we will use the DOM ID
      if (theData.length === 1) {
        if (anchorID) {
          checkMacroName = anchorID;
        }
      } else {
        checkMacroName = theData.slice(1);
      }

      if (
        checkMacroName &&
        this.alapConfig.macros &&
        this.alapConfig.macros[checkMacroName] &&
        this.alapConfig.macros[checkMacroName].linkItems
      ) {
        theData = this.alapConfig.macros[checkMacroName].linkItems;
      }

      // tk - check macro for settings overrides
    }

    // we use an absolute offset here, but in our css rules,
    // we should define in .alapelem:
    // margin-top: 1.5rem;
    // this gives a consistent offset based on rem
    let myOffset = this.offset(event.target);
    let divCSS = {};

    divCSS.zIndex = 10;
    if (anchorCSS.zIndex && anchorCSS.zIndex !== "auto") {
      divCSS.zIndex = anchorCSS.zIndex + 10;
    }

    this.alapElem.style.display = "block";

    // our offset is fixed here, you can set margin-top
    // and margin-left in .alapelem to adjust as you wish
    // position: fixed;

    let left = myOffset.left;
    let top = myOffset.top;
    if (tagType === "img") {
      left = event.pageX;
      top = event.pageY;
    }

    this.alapElem.style.cssText = `
      position: absolute;
      z-index: 10;
      left: ${left}px;
      top: ${top}px;
      `;

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

      let listItemContent = curInfo.label;
      // however .. if we have an image...
      if (curInfo.image) {
        let altText = `image for ${curTarget}`;
        if (curInfo.altText) {
          altText = curInfo.altText;
        }

        listItemContent = `
        <img alt="${altText}" src="${curInfo.image}">
        `;
      }

      let targetWindow = "fromAlap";
      // however .. if we have a specific target
      if (curInfo.targetWindow) {
        targetWindow = curInfo.targetWindow;
      }

      menuHTML += `
          <li class="${cssClass}"><a target="${targetWindow}"
          href=${curInfo.url}>${listItemContent}</a></li>
          `;
    });
    menuHTML += `</${this.listType}>`;

    this.alapElem.innerHTML = menuHTML;
    -(
      // exit any existing timer...
      this.stopTimer()
    );
    this.startTimer();
  }
}
