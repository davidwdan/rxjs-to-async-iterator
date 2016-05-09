'use strict';

require('co-mocha');
const Rx = require('rxjs');
const chai = require('chai');
const expect = chai.expect;

const taiValue = require('../index'); // ... has side-effect of adding toAsyncIterator operator

describe('rxjs-to-async-iterator', () => {
  it('should not export any value', () => {
    expect(taiValue).to.deep.equal({});
      // IMPORTANT: Change from v2.0.2. The previous syntax was unsupported
      // and undocumented and it broke with Node 6.0, so I'm formally
      // decomissioning it now.
  });

  it('should patch Rx.Observable to add toAsyncIterator operator', () => {
    expect(Rx.Observable.prototype.toAsyncIterator).to.be.a('function');
  });

  it('can convert an empty Observable into an async iterator', function *() {
    const iter = Rx.Observable.empty().toAsyncIterator();
    yield iter.shouldComplete();
  });

  it('can convert an Observable that sends a single immediate value into an async iterator', function *() {
    const iter = Rx.Observable.of('blah').toAsyncIterator();
    expect(yield iter.nextValue()).to.equal('blah');
    yield iter.shouldComplete();
  });

  it('can convert an Observable that sends a single deferred value into an async iterator', function *() {
    const iter = Rx.Observable.timer(200).take(1).toAsyncIterator();
    expect(yield iter.nextValue()).to.equal(0);
    yield iter.shouldComplete();
  });

  it('should throw if complete is sent when next was expected', function *() {
    const iter = Rx.Observable.of('blah').toAsyncIterator();
    expect(yield iter.nextValue()).to.equal('blah');

    let didThrow = false;
    try {
      yield iter.nextValue();
        // NOTE: We can't use the typical expect(fn).to.throw() notation
        // because yield wouldn't be available to that inner function.
    } catch (err) {
      expect(err.message).to.equal('Expected next notification, got complete instead');
      didThrow = true;
    }
    expect(didThrow).to.equal(true);
  });

  it('should throw if error is sent when next was expected', function *() {
    const iter = Rx.Observable.concat(
      Rx.Observable.of('blah'),
      Rx.Observable.throw(new Error('whoops'))).toAsyncIterator();

    expect(yield iter.nextValue()).to.equal('blah');

    let didThrow = false;
    try {
      yield iter.nextValue();
        // NOTE: We can't use the typical expect(fn).to.throw() notation
        // because yield wouldn't be available to that inner function.
    } catch (err) {
      expect(err.message).to.equal('whoops');
      didThrow = true;
    }
    expect(didThrow).to.equal(true);
  });

  it('can convert an Observable that sends several immediate values into an async iterator', function *() {
    const iter = Rx.Observable.from([0, 1, 2]).toAsyncIterator();
    expect(yield iter.nextValue()).to.equal(0);
    expect(yield iter.nextValue()).to.equal(1);
    expect(yield iter.nextValue()).to.equal(2);
    yield iter.shouldComplete();
  });

  it('can convert an Observable that sends several deferred values into an async iterator', function *() {
    const iter = Rx.Observable.timer(200, 100).take(3).toAsyncIterator();
    expect(yield iter.nextValue()).to.equal(0);
    expect(yield iter.nextValue()).to.equal(1);
    expect(yield iter.nextValue()).to.equal(2);
    yield iter.shouldComplete();
  });

  it('should throw if next is sent when complete is expected', function *() {
    const iter = Rx.Observable.of(99).toAsyncIterator();
    let didThrow = false;
    try {
      yield iter.shouldComplete();
        // NOTE: We can't use the typical expect(fn).to.throw() notation
        // because yield wouldn't be available to that inner function.
    } catch (err) {
      expect(err.message).to.equal('Expected complete notification, got next(99) instead');
      didThrow = true;
    }

    expect(didThrow).to.equal(true);
  });

  it('should throw if error is sent when complete was expected', function *() {
    const iter = Rx.Observable.concat(
      Rx.Observable.of('blah'),
      Rx.Observable.throw(new Error('whoops'))).toAsyncIterator();

    expect(yield iter.nextValue()).to.equal('blah');

    let didThrow = false;
    try {
      yield iter.shouldComplete();
        // NOTE: We can't use the typical expect(fn).to.throw() notation
        // because yield wouldn't be available to that inner function.
    } catch (err) {
      expect(err.message).to.equal('whoops');
      didThrow = true;
    }
    expect(didThrow).to.equal(true);
  });

  it('can convert an Observable that sends an error immediately into an async iterator', function *() {
    const iter = Rx.Observable.throw(new Error('expected failure')).toAsyncIterator();
    expect((yield iter.shouldThrow()).message).to.equal('expected failure');
  });

  it('can convert an Observable that sends a deferred error into an async iterator', function *() {
    const iter = Rx.Observable.concat(
      Rx.Observable.timer(200).take(1).filter(() => false),
      Rx.Observable.throw(new Error('deferred error'))).toAsyncIterator();

    expect((yield iter.shouldThrow()).message).to.equal('deferred error');
  });

  it('should throw if next is sent when error is expected', function *() {
    const iter = Rx.Observable.from([99, 402]).toAsyncIterator();
    expect(yield iter.nextValue()).to.equal(99);

    let didThrow = false;
    try {
      yield iter.shouldThrow();
        // NOTE: We can't use the typical expect(fn).to.throw() notation
        // because yield wouldn't be available to that inner function.
    } catch (err) {
      expect(err.message).to.equal('Expected error notification, got next(402) instead');
      didThrow = true;
    }

    expect(didThrow).to.equal(true);
  });

  it('should throw if complete is sent when error is expected', function *() {
    const iter = Rx.Observable.of(99).toAsyncIterator();
    expect(yield iter.nextValue()).to.equal(99);

    let didThrow = false;
    try {
      yield iter.shouldThrow();
        // NOTE: We can't use the typical expect(fn).to.throw() notation
        // because yield wouldn't be available to that inner function.
    } catch (err) {
      expect(err.message).to.equal('Expected error notification, got complete instead');
      didThrow = true;
    }

    expect(didThrow).to.equal(true);
  });

  describe('.shouldBeEmpty', () => {
    it('should succeed for Observable.empty', function *() {
      yield Rx.Observable.empty().shouldBeEmpty();
    });

    it('should throw if any next is generated', function *() {
      let didThrow = false;

      try {
        yield Rx.Observable.of(42).shouldBeEmpty();
      } catch (err) {
        expect(err.message).to.equal('Expected complete notification, got next(42) instead');
        didThrow = true;
      }
      expect(didThrow).to.equal(true);
    });

    it('should throw if any error is generated', function *() {
      let didThrow = false;

      try {
        yield Rx.Observable.throw(new Error('blah blah')).shouldBeEmpty();
      } catch (err) {
        expect(err.message).to.equal('blah blah');
        didThrow = true;
      }
      expect(didThrow).to.equal(true);
    });
  });

  describe('.shouldGenerateOneValue', () => {
    it('should succeed if a single value is produced', function *() {
      expect(yield Rx.Observable.of(47).shouldGenerateOneValue()).to.equal(47);
    });

    it('should throw for Observable.empty', function *() {
      let didThrow = false;

      try {
        yield Rx.Observable.empty().shouldGenerateOneValue();
      } catch (err) {
        expect(err.message).to.equal('Expected next notification, got complete instead');
        didThrow = true;
      }
      expect(didThrow).to.equal(true);
    });

    it('should throw if two next events are generated', function *() {
      let didThrow = false;

      try {
        yield Rx.Observable.from([42, 45]).shouldGenerateOneValue();
      } catch (err) {
        expect(err.message).to.equal('Expected complete notification, got next(45) instead');
        didThrow = true;
      }
      expect(didThrow).to.equal(true);
    });

    it('should throw if any error is generated', function *() {
      let didThrow = false;

      try {
        yield Rx.Observable.throw(new Error('blah blah')).shouldBeEmpty();
      } catch (err) {
        expect(err.message).to.equal('blah blah');
        didThrow = true;
      }
      expect(didThrow).to.equal(true);
    });
  });

  describe('.shouldThrow', () => {
    it('should provide access to the original Error object that was thrown', function *() {
      const myError = new Error('this is what we throw');
      expect(yield Rx.Observable.throw(myError).shouldThrow()).to.equal(myError);
    });

    it('should throw for Observable.empty', function *() {
      let didThrow = false;

      try {
        yield Rx.Observable.empty().shouldThrow();
      } catch (err) {
        expect(err.message).to.equal('Expected error notification, got complete instead');
        didThrow = true;
      }
      expect(didThrow).to.equal(true);
    });

    it('should throw if an next event is generated', function *() {
      let didThrow = false;

      try {
        yield Rx.Observable.of(42).shouldThrow();
      } catch (err) {
        expect(err.message).to.equal('Expected error notification, got next(42) instead');
        didThrow = true;
      }
      expect(didThrow).to.equal(true);
    });
  });

  it('should not get confused when observing two different Observables', function *() {
    const b = new Rx.BehaviorSubject(51);
    const iterB = b.toAsyncIterator();

    expect(yield iterB.nextValue()).to.equal(51);

    const tryToBeTricky = () => {
      b.next(87);
      return Rx.Observable.of('mumble');
    };

    expect(yield tryToBeTricky().shouldGenerateOneValue()).to.equal('mumble');
    expect(yield iterB.nextValue()).to.equal(87);
  });

  describe('.unsubscribe', () => {
    it('should be defined as a method on asyncIterator', () => {
      const iter = Rx.Observable.of(99).toAsyncIterator();
      expect(iter).to.respondTo('unsubscribe');
    });

    it('should throw if called before first yield', function *() {
      const timerIter = Rx.Observable.timer(100).toAsyncIterator();
      expect(() => timerIter.unsubscribe()).to.throw(/unsubscribing before first yield not allowed/);
    });

    it('should cause subscription to be dropped', function *() {
      let timerCount = -1;

      const countedTimer = Rx.Observable.timer(100, 100)
        .do(count => {
          timerCount = count;
        });

      const timerIter = countedTimer.toAsyncIterator();
      expect(yield timerIter.nextValue()).to.equal(0);
      expect(yield timerIter.nextValue()).to.equal(1);
      expect(yield timerIter.nextValue()).to.equal(2);
      expect(timerCount).to.equal(2);

      timerIter.unsubscribe();
      expect(timerCount).to.equal(2);

      yield Rx.Observable.timer(300).shouldGenerateOneValue();
        // Ignore this. We're just sleeping past a couple of timer
        // ticks.

      expect(timerCount).to.equal(2);
    });
  });
});
