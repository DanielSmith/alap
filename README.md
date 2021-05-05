# alap

### Any link, all places. Enhance links with multiple targets.
____
## Overview

Alap enables attaching menus to links.

The traditional approach with an HTML anchor has been "each anchor, one target". Alap gives a flexible way to turn that into "each anchor, many targets". It can be used in a very simple mode ("I want this item, another item, and another, and that's it").

![CleanShot 2021-05-05 at 15 33 01](https://user-images.githubusercontent.com/167197/117198802-747e8080-adb7-11eb-8fcd-05a07fbe5985.gif)

Alap also lets you build up menu items in more powerful ways (treating tags like CSS Classes, using expressions to group or exclude items, and more).


## Installation



Configuration is done via a JavaScript object.


## Demo
```
% cd examples
% parcel serve index.html   --no-cache
Server running at http://localhost:1234 
✨  Built in 1.94s.
```

## History, and the alap name

Alap is a plain vanilla JS rewrite of my 2012 MultiLinks package. That was done in jQuery.

I pondered using MultiLink, ManyLinks, or MenuLinks.  The names are pretty much taken, and there is always the question of singular vs plural (link? links?).

Alap keeps it simple, and you can think of it as whatever acronym that seems memorable to you (such as "a link, all places").  There is also a tie-in to music:

> The Alap is the opening section of a typical North Indian classical performance. It is a form of melodic improvisation that introduces and develops a raga.

This fits the spirit :)  Alap is a means of dynamically creating a menu (especially if we think of run-time bits of JSON), which introduce other web pages.



****
## Next Steps

* better looking example using Tailwind CSS
* example with Vue 3
* example with React










