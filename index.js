'use strict';

var lru = require('lru-cache')
var BlueProm = require('bluebird')

function Herding(options) {

  if (!(this instanceof Herding)) {
    return new Herding(options)
  }

  options = options || {}
  var cache = lru(options)
  var evictOnReject = false

  if (options.evictOnReject) {
    evictOnReject = options.evictOnReject
  }

  function herd(key, setFunc) {

    var cachedValue = cache.get(key)
    if (cachedValue !== undefined) {
      return cachedValue
    }

    var promise = BlueProm.resolve(setFunc())
      .then(function(value) {
        return value
      }, function(reason) {
        if (evictOnReject) {
          cache.del(key)
        }
        throw reason
      })

    cache.set(key, promise)
    return promise
  }

  herd.del = function(key) {
    return cache.del(key)
  }

  herd.reset = function() {
    return cache.reset()
  }

  herd.has = function(key) {
    return cache.has(key)
  }

  herd.itemCount = function() {
    return cache.itemCount
  }

  return herd
}

if (typeof module === 'object' && module.exports) {
  exports["default"] = Herding
  module.exports = exports["default"]
} else {
  this.Herding = Herding
}
