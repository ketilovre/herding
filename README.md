Herding
=======

`npm install herding`

Promise-based single-resolution LRU cache using [lru-cache](https://www.npmjs.com/package/lru-cache) and [Bluebird](https://www.npmjs.com/package/bluebird). Inspired by and similar to [bluecache](https://www.npmjs.com/package/bluecache) and [bluebird-lru-cache](https://www.npmjs.com/package/bluebird-lru-cache), but with the added bonus of dealing with the [Thundering herd problem](https://en.wikipedia.org/wiki/Thundering_herd_problem).

### Example

A cache is instantiated like so:
```javascript
var herding = require('herding');

var cache = herding(options);
```

The primary function takes a cache key and a function to resolve if the key cannot be found. It always returns a promise. The function may return either a promise or a regular value of some kind.
```javascript
var promise = cache(key, function() {
  return someValue();
  // or
  return new Promise(...)
})

promise.then(...)
```

### The thundering herd

The scenario we want to avoid is when 100 simultaneous requests results in a given value being resolved 100 times, when it should have been resolved once.

Let's say you have caching in front of some resource in mongo. If a large number of clients all request that resource at the same time, you don't want each request to result in a database lookup. Populating the key *after* you've received the result means you'll have more than one process trying to populate the same key with the same value at the same time.

Herding solves this by immediately injecting a promise on an empty key, and then resolving that promise with the result of the supplied function.

This way, the first cache miss will populate the key for all the other requests, who will receive the injected promise. When the promise later resolves, it will resolve for everyone at the same time, and the actual work will only be done once.

### Options

Herding accepts all the option values from [lru-cache](https://www.npmjs.com/package/lru-cache). Descriptions which have been altered from their original definition are in italics.

* `max` The maximum size of the cache, checked by applying the length
  function to all values in the cache.  Not setting this is kind of
  silly, since that's the whole purpose of this lib, but it defaults
  to `Infinity`.
* `maxAge` Maximum age in ms.  Items are not pro-actively pruned out
  as they age, but if you try to get an item that is too old, *it'll
  drop it and return a new promise to be resolved with the value from the supplied function. See `stale`.*
* `length` Function that is used to calculate the length of stored
  items.  If you're storing strings or buffers, then you probably want
  to do something like `function(n){return n.length}`.  The default is
  `function(n){return 1}`, which is fine if you want to store `n`
  like-sized things.
* `dispose` Function that is called on items when they are dropped
  from the cache.  This can be handy if you want to close file
  descriptors or do other cleanup tasks when items are no longer
  accessible.  Called with `key, value`.  It's called *before*
  actually removing the item from the internal cache, so if you want
  to immediately put it back in, you'll have to do that in a
  `nextTick` or `setTimeout` callback or it won't do anything.
* `stale` By default, if you set a maxAge, it'll only actually pull stale items out of the cache when you get(key). (That is, it's not pre-emptively doing a setTimeout or anything.) If you set stale:true, it'll return the stale value before deleting it. If you don't set this, then it'll *return a new promise to be resolved with the value from the supplied function*.

Additionally, Herding accepts the following option:

* `evictOnReject` If `true`, the key will be evicted when and if the promise is rejected or throws. Defaults to `false`. Note that even when `true`, the failed promise will be returned to everyone who requests the key before the eviction has occurred. Once the key has been evicted, the next request will create and resolve a new promise.

### API

`cache(key, valueFunction)`

The main entry point. Always returns a promise. If the key is not set, the returned promise will eventually resolve with the value from `valueFunction`.

Herding also proxies the following functions directly from `lru-cache`. See the [lru-cache docs](https://github.com/isaacs/node-lru-cache#api) for more information:

- `del`
- `reset`
- `has`
- `itemCount`
