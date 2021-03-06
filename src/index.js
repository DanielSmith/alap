export default class alap {
  alapConfig;
  alapElem = null;
  curTimerID = 0;
  theBody = null;
  listType = "ol";
  mode = "vanilla"; // vanilla, vue, react, etc
  menuTimeout = 5000;
  ESC_KEYCODE = 27;

  constructor(config = undefined, mode = "vanilla") {
    if (config && Object.keys(config).length) {
      this.configure(config, mode);
    }
  }

  // only use this with plain vanilla js
  // wrappers such as vue, react, svelte, etc
  // should manage <div id="alapelem">
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

  configure(config = {}, mode = "vanilla") {
    if (Object.keys(config).length === 0) {
      return;
    }

    this.mode = mode;

    this.alapConfig = Object.assign({}, config);
    this.listType = this.getSetting("listType", "ul");
    this.menuTimeout = +this.getSetting("menuTimeout", 5000);

    // if we are calling alap from plain js, we do some extra
    // setup.. otherwise, we leave it to the calling wrapper
    // to handle events (such as Vue and React)
    if (mode === "vanilla") {
      this.resetAlapElem();
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

  dumpConfig() {
    console.dir(this.alapConfig);
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

  // this is used when we have an event in vue, react, or some
  // other framework.. we just come here to gather info, and
  // bundle it up in an object.  It is up to the framework to
  // handle the Render and Event side of the menu
  processEvent(eventProperties, config = null) {
    const eventTarget = eventProperties.target;

    // in case the wrapper needs to override config..
    if (config != null) {
      this.alapConfig = config;
    }

    const myEventData = {
      valid: false,

      theData: null,
      theTargets: [],

      listType: this.listType,
      menuTimeout: this.menuTimeout,

      tagType: null,
      anchorID: "",
      cssAttr: "",
      anchorCSS: "",
      anchorCSSNormal: "",
      offset: {},
      left: 0,
      top: 0,

      // pointers
      config: this.alapConfig,
      allLinks: this.alapConfig.allLinks
    };

    myEventData.theData = eventTarget.getAttribute("data-alap-linkitems");
    if (!myEventData.theData) {
      return myEventData;
    }

    // check for a macro expansion...
    myEventData.theData = this.checkMacro(myEventData.theData);
    if (!myEventData.theData) {
      return myEventData;
    }

    myEventData.theTargets = this.getTargets(myEventData.theData);

    myEventData.tagType = eventTarget.tagName.toLowerCase();
    myEventData.anchorID = eventTarget.id || "";

    myEventData.anchorCSS = getComputedStyle(eventTarget, ":link");
    myEventData.anchorCSSNormal = getComputedStyle(eventTarget);

    if (myEventData.anchorID) {
      myEventData.cssAttr = `alap_${myEventData.anchorID}`;
    }

    // we use an absolute offset here, but in our css rules,
    // we should define in .alapelem:
    // margin-top: 1.5rem;
    // this gives a consistent offset based on rem
    myEventData.offset = this.offset(eventTarget);

    // our offset is fixed here, you can set margin-top
    // and margin-left in .alapelem to adjust as you wish
    // position: fixed;
    myEventData.left = myEventData.offset.left;
    myEventData.top = myEventData.offset.top;
    if (myEventData.tagType === "img") {
      myEventData.left = eventProperties.pageX;
      myEventData.top = eventProperties.pageY;
    }

    myEventData.valid = true;

    return myEventData;
  }

  // do we have a macro?
  checkMacro(theData) {
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
    }
    return theData;
  }

  getTargets(theData) {
    let allDataElem = this.parseLine(theData);
    let localTargets = [];

    for (const curElem of allDataElem) {
      localTargets = [...localTargets, ...this.parseElem(curElem)];
    }
    // remove duplicates
    if (localTargets.length) {
      localTargets = [...new Set([...localTargets])];
    }

    return localTargets;
  }

  getEntryByID(id) {
    if (this.alapConfig.allLinks && this.alapConfig.allLinks[id]) {
      return this.alapConfig.allLinks[id];
    } else {
      return null; //test
    }
  }

  // the event and DOM portions of this still need to be
  // split out, so that all of the functionality can be
  // accessed from the API.
  doClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const eventData = this.processEvent({
      target: event.target,
      pageX: event.pageX,
      pageY: event.pageY
    });

    if (!eventData.valid) return;
    let divCSS = {};

    divCSS.zIndex = 10;
    if (eventData.anchorCSS.zIndex && eventData.anchorCSS.zIndex !== "auto") {
      divCSS.zIndex = eventData.anchorCSS.zIndex + 10;
    }

    this.alapElem.style.display = "block";

    this.alapElem.style.cssText = `
      position: absolute;
      z-index: 10;
      left: ${eventData.left}px;
      top: ${eventData.top}px;
      `;

    // clear out any classes from our existing alapElem
    this.alapElem.removeAttribute("class");

    // ...and, if we have a specific css attribute to add,
    // the element is ready for a fresh class specifier
    this.alapElem.classList.add("alapelem");
    if (eventData.cssAttr) {
      this.alapElem.classList.add(eventData.cssAttr);
    }

    let menuHTML = `<${this.listType}>`;
    eventData.theTargets.map((curTarget) => {
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
    // exit any existing timer...
    this.stopTimer();
    this.startTimer();
  }
}
