require('should')
var BlueProm = require('bluebird')
var herding = require('../')

describe('Herding', function() {

  describe('main', function() {

    it('should set and get simple values', function(done) {
      var cache = herding()

      cache('key', function() {
        return 'value'
      })
        .then(function(value) {
          value.should.eql('value')
          return cache('key', function() {
            return 'otherValue'
          })
        })
        .then(function(value) {
          value.should.eql('value')
          done()
        })
    })

    it('should get and set promises', function(done) {
      var cache = herding()

      cache('key', function() {
        return BlueProm.resolve('value')
      })
        .then(function(value) {
          value.should.eql('value')
          return cache('key', function() {
            return BlueProm.resolve('otherValue')
          })
        })
        .then(function(value) {
          value.should.eql('value')
          done()
        })
    })

    it('should, by default, not evict rejected promises', function(done) {
      var cache = herding()

      cache('key', function() {
        return BlueProm.reject('ERROR')
      })
        .catch(function(error) {
          error.should.eql('ERROR')
          cache.has('key').should.be.true()
          done()
        })
    })

    it('should evict rejected promises with evictOnReject set to true', function(done) {
      var cache = herding({evictOnReject: true})

      cache('key', function() {
        return BlueProm.reject('ERROR')
      })
        .catch(function(error) {
          error.should.eql('ERROR')
          cache.has('key').should.be.false()
          done()
        })
    })

    it('should resolve the first cache miss, regardless of resolution time', function(done) {
      var cache = herding()
      var arr = []
      for (var i = 0; i < 100; i++) {
        arr.push(i)
      }
      arr.forEach(function(i) {
        cache('key', function() {
          return new BlueProm(function(resolve, reject) {
            setTimeout(function() {
              resolve(i)
            }, 100 - i)
          })
        })
      })

      cache('key', function() {
        throw 'error'
      })
        .then(function(value) {
          value.should.eql(0)
          done()
        })
    })

    it('should drop an outdated value and return a new promise instead, with stale:false', function(done) {
      var cache = herding({stale: false, maxAge: 1})

      cache('key', function() {
        return 1
      })
        .then(function(value) {
          value.should.eql(1)

          setTimeout(function() {
            cache('key', function() {
              return 2
            })
              .then(function(value) {
                value.should.eql(2)
                done()
              })
          }, 10)
        })
    })

    it('should return an outdated value one last time with stale:true', function(done) {
      var cache = herding({stale: true, maxAge: 1})

      cache('key', function() {
        return 1
      })
        .then(function(value) {
          value.should.eql(1)

          setTimeout(function() {
            cache('key', function() {
              return 2
            })
              .then(function(value) {
                value.should.eql(1)
                return cache('key', function() {
                  return 2
                })
              })
              .then(function(value) {
                value.should.eql(2)
                done()
              })
          }, 10)
        })
    })
  })

  describe('has', function() {

    it('should return true if the value is set', function(done) {
      var cache = herding()

      cache('key', function() {
        return 1
      })
        .then(function(value) {
          value.should.eql(1)
          cache.has('key').should.be.true()
          done()
        })
    })

    it('should return false if the value is not set', function() {
      var cache = herding()

      cache.has('key').should.be.false()
    })
  })

  describe('del', function() {

    it('should remove a set value', function(done) {
      var cache = herding()

      cache('key', function() {
        return 1
      })
        .then(function(value) {
          value.should.eql(1)
          cache.del('key')
          cache.has('key').should.be.false()
          done()
        })
    })
  })

  describe('reset', function() {

    it('should remove all values', function(done) {
      var cache = herding()

      cache('key1', function() {
        return 1
      })
        .then(function(value1) {
          value1.should.eql(1)
          return cache('key2', function() {
            return 2
          })
        })
        .then(function(value2) {
          value2.should.eql(2)
          cache.has('key1').should.be.true()
          cache.has('key2').should.be.true()
          cache.reset()
          cache.has('key1').should.be.false()
          cache.has('key2').should.be.false()
          done()
        })
    })
  })

  describe('itemCount', function() {

    it('should return the number of values/keys', function(done) {
      var cache = herding()

      cache('key1', function() {
        return 1
      })
        .then(function(value1) {
          value1.should.eql(1)
          return cache('key2', function() {
            return 2
          })
        })
        .then(function(value2) {
          value2.should.eql(2)
          cache.itemCount().should.eql(2)
          done()
        })
    })
  })
})
