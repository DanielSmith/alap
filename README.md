# alap

### Any link, all places. Enhance links with multiple targets.
____
## Overview

Alap enables attaching menus to links and images.

The traditional approach with an HTML anchor has been "each anchor, one target". Alap gives a flexible way to turn that into "each anchor, many targets". It can be used in a very simple mode ("I want this item, another item, and another, and that's it").

![CleanShot 2021-05-06 at 20 09 10](https://user-images.githubusercontent.com/167197/117380264-52fcc200-aea7-11eb-932d-a2e112ddc74b.gif)


Alap also lets you build up menu items in more powerful ways (treating tags like CSS Classes, using expressions to group or exclude items, and more).

## Features

* specify link items directly, or by tags
* use macros so that link specifications are completely on the JSON side
* simple expressions may be used to build up menus (AND, OR, WITHOUT)
* menu link items may be text or images
* menus may be attached to anchors or images
* control CSS on a per menu and per link item basis
* API - use as plain JavaScript, or create a wrapper from some other framework (such as Vue or React)
* control list type (ordered or unordered)
* menu dismissed by clicking outside, timeout, or ESC key

## Demo

There is an example within the package itself:
```sh
% cd examples/overview
% parcel serve index.html   --no-cache
Server running at http://localhost:1234 
✨  Built in 1.94s.
```

## Installation

```sh
npm i alap
```

In your `index.html`:

```html
  <script defer src="example.js"></script>
```

and then in your `example.js`, import your config object, alap, and initialize:

```js
import { alapConfig } from "./Config.js";

// our lib, locally...
import Alap from "../../src/index.js";

// ...or, if you are using npm, this would be:
// import Alap from "alap";

// pass the config object
const alap = new Alap(alapConfig);
```



## Configuration

Configuration is done in two places:

* data for all elements, via a JavaScript object.
* per-anchor config in the `data-alap-linkitems` attribute

See `examples/overview/Config.js` and `examples/tailwindcss/Config.js` for fully fleshed example objects.

### Config Object

Here is a small sample:

```js
export const alapConfig = {
  settings: {
    listType: "ul",
    menuTimeout: 5000,
  },

  macros: {
    cars1: {
      linkItems: "vwbug, bmwe36",
    }
  },

  allLinks: {
    bmwe36: {
      label: "BMW (E36) - Wikipedia",
      url: "http://en.wikipedia.org/wiki/BMW_3_Series_(E36)",
      tags: ["e36m3", "bmw", "car", "germany"],
    },

    another_item: {
      label: "Another Item",
      url: "https://example.org",
      tags: [
        "photography",
        "techreview",
        "youtube"
      ],
    }
  }
};
```

### The `settings` property

|  Setting | Values |
------| -----
listType | can be `ul` or `ol` for unordered, or ordered lists
menuTimeout | if you mouse away from the menu, time in milliseconds before menu dismisses itself. Example: 5000 would dismiss after 5 seconds


_Note: menu will also dismiss itself if you click outside of it, or hit the ESCape key_

### The `macros` property

There is a whole section later in this document about Macros. The gist of it is that it gives you a way to decouple your menu specification from the HTML side (example: the HTML side basically says "use whatever is in the `@cars1` macro")

### The `allLinks` property

Most of the configuration resides in this nested object. Each entry 
represents a possible menu list item.

Sample Entries:

```js
a_menu_item: {
  label: "Some Item",
  url: "https://example.org",
  cssClass: "violetclass",
  tags: ["photography", "techreview", "youtube"]
},

sf_skyline_img: {
  url: "https://unsplash.com/s/photos/san-francisco-skyline",
  image: "img/ross-joyner-TX6dBiMwBV0-unsplash.jpg",
  altText: "SF Painted Ladies",
  tags: ["sf_image", "city_images"],
},

navtop: {
  label: "top of document",
  url: "#top",
  targetWindow: "_self",
},
```

The ID for a menu item (such as "a_menu_item") must be unique to the object in use.

|  Setting | Values |
------| -----
label | the label that appears in the menu list item
url | the target URL to go to when clicked on. The default is to open it up in another tab.
tags | an array of strings. These can be referred to from the `data-alap-linkitems` like a CSS Class.  Example: in the data attribute, ".photography" would match all entries that have a tag of "photography"
image | can be used instead of a label, with a relative or absolute URL pointing at an image
altText | ALT text to be used with images, for accessibility
targetWindow | combine this with #relative links, for in-page navigation (default: `fromAlap`)
-----------



### HTML Anchor Configuration

Wherever you want to use alap on a page, you need to configure the anchor element. This is so that a) alap will recognize it (`class="alap"`) and b) alap will know what to look up (the `data-alap-linkitems` attribute)

Give each anchor a unique id. Alap uses it to generate CSS Class names, and it also can be helpful with Macros (more on that in the Macro section).

Sample:

```html
<a id="nyctag1" class="alap" data-alap-linkitems=".nyc"</a> 
```

### Referring to list item IDs

```html
<a id="my_nice_menu" class="alap"
  data-alap-linkitems="item1, item2, item3"</a> 
```

This would look for these entries in the Config Object: item1, item2, and item3

It is the simplest case. You're looking for specific items.
### Referring to tags by using a class specifier

```html
<a id="my_nice_menu" class="alap"
  data-alap-linkitems=".bridge, .city"</a> 
```
This can be thought of much like a CSS Class (looking through all items, and finding matches for a certain class)

### Macros

One main area of the Config can be `macros`.

Here is a sample:

```javascript
cars1: {
  linkItems: "vwbug, bmwe36",
  config: {
    somekey: "somevalue",
  }
}
```

For the moment, the `config` section within a macro is not being used.

A macro is referred to in an anchor definition via the `@` character.  Example:

```html
 <a id="cars1" class="alap" data-alap-linkitems="@cars1">cars</a>
```

What is the benefit of using a macro?

A macro lets you say "in my HTML, don't hardwire specifics about the menu I want.  Go look it in up in the Config.  Grab it from the `linkItems` field there".

As a convenience, if you just specify "@", the macro will get its name from the id of the anchor tag. Example: `id="germanbeer" data-alap-linkitems="@"` would be like specifying the macro as "@germanbeer"
### Reserved for future use

Bare words (a list item identifier), '.', and '@' are currently used.

The '*', '%', and '#' symbols may be used in the future.
* '#' would have the functionality of getting definitions from **other** DOM IDs. I don't intend to support it, until I can fix the parsing so that it will work with expressions
* '%' and '*' may involve searching through URL, Labels, and Descriptions. I would want to build an alap-editor first (as in, drag and drop links to a target, and extract relevant data from the metadata found in the HEAD of that page)

### Combining things

As you may have guessed, you can combine different types of specifiers, in order to build up a menu item list. You can use tags ('.'), and specfic list item IDs:

```html
I like <a id="combo_example" class="alap"
  data-alap-linkitems="bmwe36, vwbug, .youtube">a lot of things</a>
```

### Expressions

Within the `data-alap-linkitems` attribute, you can use simple expressions to build up a list, and filter items out. We can use list item IDs and tags, along with AND, OR, and WITHOUT.
### Expressions: AND

The '+' operator means we want to match something in TWO places.  Here is a sample from the demo:

```html
<a id="nycandbridge" class="alap"
  data-alap-linkitems=".nyc + .bridge">"nyc AND bridge (+)"</a>
```

It means: find items that have the tag of "nyc" AND the tag of "bridge"
### Expressions: OR

The '|' operator means we want to match something in EITHER place.  Here is a sample from the demo:

```html
<a id="nycorbridge" class="alap"
  data-alap-linkitems=".nyc | .bridge">"nyc OR bridge (|)"</a>
```

It means: find items that have the tag of "nyc" OR the tag of "bridge"
### Expressions: WITHOUT

The '-' operator means we want to EXCLUDE items that match something.  Here is a sample from the demo:

```html
<a id="nycwobridge" class="alap"
  data-alap-linkitems=".nyc - .bridge">"nyc WITHOUT bridge (-)"</a>
```

It means: find items that have the tag of "nyc", and toss the items that match the tag of "bridge"



### Expressions: More Possibilities


You can chain them together for a more complex expression:

```html
<a id="nycorbridgenolon" class="alap"
  data-alap-linkitems=".nyc | .bridge - .london">nyc OR bridge, without London (| and -)</a>
```

It means: I want items that match the tag of "nyc" or "bridge", but toss out anything that includes the tag of "london".

## The API

_Documentation in progress - this is just a quick note for now_

### Constructor & Configure

```javascript
const alap = new Alap();

// pass the config object
alap.configure(alapConfig);
```

```configure(config = {}, mode = "vanilla")```

The config object is documented earlier in this README.

`mode` is optional. By default, it is "vanilla", which flags Alap to handle DOM and Events. I'm working on a Vue wrapper.

------
```processEvent(eventProperties, config = null)```

This is rough for now. A Vue example would handle a click:

```javascript
  const mev = reactive({ count: 1, theEventProperties: {} });
  provide('mev', mev);

  const alapClick = ((theevent) => {
    mev.theEventProperties = {
      target: theevent.target,
      pageX: theevent.pageX,
      pageY: theevent.pageY
    };
    mev.count++;
  });
```

In the Vue wrapper:
```javascript
const myattr = { ...mev };

myAlap.processEvent(myattr.theEventProperties);
```
More TK - is just a quick peek at what I am working on with Vue3.


------


By default, the 

## History, and the alap name

Alap is an ES6 rewrite of my 2012 MultiLinks package (which had depended on jQuery.

I pondered using MultiLink, ManyLinks, or MenuLinks.  The names are pretty much taken, and there is always the question of singular vs plural (link? links?).

Alap keeps it simple, and you can think of it as whatever acronym that seems memorable to you (such as "a link, all places").  There is also a tie-in to music:

> The Alap is the opening section of a typical North Indian classical performance. It is a form of melodic improvisation that introduces and develops a raga.

This fits the spirit :)  Alap is a means of dynamically creating a menu (especially if we think of run-time bits of JSON), which introduce other web pages.

Version 2.0: Introduces an API, so that Alap can be accessed from Frameworks such as Vue and React. The idea is for Alap to handle the data aspect, but not get involved in DOM and Event operations (that will be the job of per-Framework wrappers).

****
## Next Steps

* example with Vue 3
* example with React











