import JSBI from 'jsbi'
import { Interface } from '@ethersproject/abi'
import invariant from 'tiny-invariant'
import { abi } from '@uniswap/swap-router-contracts/artifacts/contracts/interfaces/IApproveAndCall.sol/IApproveAndCall.json'
import {
  NonfungiblePositionManager,
  toHex,
  Multicall,
  Payments,
  Route,
  Pool,
  Trade as Trade$1,
  encodeRouteToPath,
  SelfPermit,
  Position,
} from '@uniswap/v3-sdk'
import { abi as abi$1 } from '@uniswap/swap-router-contracts/artifacts/contracts/interfaces/IMulticallExtended.sol/IMulticallExtended.json'
import { validateAndParseAddress, TradeType, Fraction, CurrencyAmount, Price, Percent, WETH9 } from '@uniswap/sdk-core'
import { abi as abi$2 } from '@uniswap/swap-router-contracts/artifacts/contracts/interfaces/IPeripheryPaymentsWithFeeExtended.sol/IPeripheryPaymentsWithFeeExtended.json'
import { abi as abi$3 } from '@uniswap/swap-router-contracts/artifacts/contracts/interfaces/ISwapRouter02.sol/ISwapRouter02.json'

var MSG_SENDER = '0x0000000000000000000000000000000000000001'
var ADDRESS_THIS = '0x0000000000000000000000000000000000000002'
var ZERO = /*#__PURE__*/ JSBI.BigInt(0)
var ONE = /*#__PURE__*/ JSBI.BigInt(1) // = 1 << 23 or 100000000000000000000000

var V2_FEE_PATH_PLACEHOLDER = 8388608

var ApprovalTypes
;(function (ApprovalTypes) {
  ApprovalTypes[(ApprovalTypes['NOT_REQUIRED'] = 0)] = 'NOT_REQUIRED'
  ApprovalTypes[(ApprovalTypes['MAX'] = 1)] = 'MAX'
  ApprovalTypes[(ApprovalTypes['MAX_MINUS_ONE'] = 2)] = 'MAX_MINUS_ONE'
  ApprovalTypes[(ApprovalTypes['ZERO_THEN_MAX'] = 3)] = 'ZERO_THEN_MAX'
  ApprovalTypes[(ApprovalTypes['ZERO_THEN_MAX_MINUS_ONE'] = 4)] = 'ZERO_THEN_MAX_MINUS_ONE'
})(ApprovalTypes || (ApprovalTypes = {})) // type guard

function isMint(options) {
  return Object.keys(options).some(function (k) {
    return k === 'recipient'
  })
}
var ApproveAndCall = /*#__PURE__*/ (function () {
  /**
   * Cannot be constructed.
   */
  function ApproveAndCall() {}

  ApproveAndCall.encodeApproveMax = function encodeApproveMax(token) {
    return ApproveAndCall.INTERFACE.encodeFunctionData('approveMax', [token.address])
  }

  ApproveAndCall.encodeApproveMaxMinusOne = function encodeApproveMaxMinusOne(token) {
    return ApproveAndCall.INTERFACE.encodeFunctionData('approveMaxMinusOne', [token.address])
  }

  ApproveAndCall.encodeApproveZeroThenMax = function encodeApproveZeroThenMax(token) {
    return ApproveAndCall.INTERFACE.encodeFunctionData('approveZeroThenMax', [token.address])
  }

  ApproveAndCall.encodeApproveZeroThenMaxMinusOne = function encodeApproveZeroThenMaxMinusOne(token) {
    return ApproveAndCall.INTERFACE.encodeFunctionData('approveZeroThenMaxMinusOne', [token.address])
  }

  ApproveAndCall.encodeCallPositionManager = function encodeCallPositionManager(calldatas) {
    !(calldatas.length > 0)
      ? process.env.NODE_ENV !== 'production'
        ? invariant(false, 'NULL_CALLDATA')
        : invariant(false)
      : void 0

    if (calldatas.length == 1) {
      return ApproveAndCall.INTERFACE.encodeFunctionData('callPositionManager', calldatas)
    } else {
      var encodedMulticall = NonfungiblePositionManager.INTERFACE.encodeFunctionData('multicall', [calldatas])
      return ApproveAndCall.INTERFACE.encodeFunctionData('callPositionManager', [encodedMulticall])
    }
  }
  /**
   * Encode adding liquidity to a position in the nft manager contract
   * @param position Forcasted position with expected amount out from swap
   * @param minimalPosition Forcasted position with custom minimal token amounts
   * @param addLiquidityOptions Options for adding liquidity
   * @param slippageTolerance Defines maximum slippage
   */

  ApproveAndCall.encodeAddLiquidity = function encodeAddLiquidity(
    position,
    minimalPosition,
    addLiquidityOptions,
    slippageTolerance
  ) {
    var _position$mintAmounts = position.mintAmountsWithSlippage(slippageTolerance),
      amount0Min = _position$mintAmounts.amount0,
      amount1Min = _position$mintAmounts.amount1 // position.mintAmountsWithSlippage() can create amounts not dependenable in scenarios
    // such as range orders. Allow the option to provide a position with custom minimum amounts
    // for these scenarios

    if (JSBI.lessThan(minimalPosition.amount0.quotient, amount0Min)) {
      amount0Min = minimalPosition.amount0.quotient
    }

    if (JSBI.lessThan(minimalPosition.amount1.quotient, amount1Min)) {
      amount1Min = minimalPosition.amount1.quotient
    }

    if (isMint(addLiquidityOptions)) {
      return ApproveAndCall.INTERFACE.encodeFunctionData('mint', [
        {
          token0: position.pool.token0.address,
          token1: position.pool.token1.address,
          fee: position.pool.fee,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          amount0Min: toHex(amount0Min),
          amount1Min: toHex(amount1Min),
          recipient: addLiquidityOptions.recipient,
        },
      ])
    } else {
      return ApproveAndCall.INTERFACE.encodeFunctionData('increaseLiquidity', [
        {
          token0: position.pool.token0.address,
          token1: position.pool.token1.address,
          amount0Min: toHex(amount0Min),
          amount1Min: toHex(amount1Min),
          tokenId: toHex(addLiquidityOptions.tokenId),
        },
      ])
    }
  }

  ApproveAndCall.encodeApprove = function encodeApprove(token, approvalType) {
    switch (approvalType) {
      case ApprovalTypes.MAX:
        return ApproveAndCall.encodeApproveMax(token.wrapped)

      case ApprovalTypes.MAX_MINUS_ONE:
        return ApproveAndCall.encodeApproveMaxMinusOne(token.wrapped)

      case ApprovalTypes.ZERO_THEN_MAX:
        return ApproveAndCall.encodeApproveZeroThenMax(token.wrapped)

      case ApprovalTypes.ZERO_THEN_MAX_MINUS_ONE:
        return ApproveAndCall.encodeApproveZeroThenMaxMinusOne(token.wrapped)

      default:
        throw 'Error: invalid ApprovalType'
    }
  }

  return ApproveAndCall
})()
ApproveAndCall.INTERFACE = /*#__PURE__*/ new Interface(abi)

function validateAndParseBytes32(bytes32) {
  if (!bytes32.match(/^0x[0-9a-fA-F]{64}$/)) {
    throw new Error(bytes32 + ' is not valid bytes32.')
  }

  return bytes32.toLowerCase()
}

var MulticallExtended = /*#__PURE__*/ (function () {
  /**
   * Cannot be constructed.
   */
  function MulticallExtended() {}

  MulticallExtended.encodeMulticall = function encodeMulticall(calldatas, validation) {
    // if there's no validation, we can just fall back to regular multicall
    if (typeof validation === 'undefined') {
      return Multicall.encodeMulticall(calldatas)
    } // if there is validation, we have to normalize calldatas

    if (!Array.isArray(calldatas)) {
      calldatas = [calldatas]
    } // this means the validation value should be a previousBlockhash

    if (typeof validation === 'string' && validation.startsWith('0x')) {
      var previousBlockhash = validateAndParseBytes32(validation)
      return MulticallExtended.INTERFACE.encodeFunctionData('multicall(bytes32,bytes[])', [
        previousBlockhash,
        calldatas,
      ])
    } else {
      var deadline = toHex(validation)
      return MulticallExtended.INTERFACE.encodeFunctionData('multicall(uint256,bytes[])', [deadline, calldatas])
    }
  }

  return MulticallExtended
})()
MulticallExtended.INTERFACE = /*#__PURE__*/ new Interface(abi$1)

function encodeFeeBips(fee) {
  return toHex(fee.multiply(10000).quotient)
}

var PaymentsExtended = /*#__PURE__*/ (function () {
  /**
   * Cannot be constructed.
   */
  function PaymentsExtended() {}

  PaymentsExtended.encodeUnwrapWETH9 = function encodeUnwrapWETH9(amountMinimum, recipient, feeOptions) {
    // if there's a recipient, just pass it along
    if (typeof recipient === 'string') {
      return Payments.encodeUnwrapWETH9(amountMinimum, recipient, feeOptions)
    }

    if (!!feeOptions) {
      var feeBips = encodeFeeBips(feeOptions.fee)
      var feeRecipient = validateAndParseAddress(feeOptions.recipient)
      return PaymentsExtended.INTERFACE.encodeFunctionData('unwrapWETH9WithFee(uint256,uint256,address)', [
        toHex(amountMinimum),
        feeBips,
        feeRecipient,
      ])
    } else {
      return PaymentsExtended.INTERFACE.encodeFunctionData('unwrapWETH9(uint256)', [toHex(amountMinimum)])
    }
  }

  PaymentsExtended.encodeSweepToken = function encodeSweepToken(token, amountMinimum, recipient, feeOptions) {
    // if there's a recipient, just pass it along
    if (typeof recipient === 'string') {
      return Payments.encodeSweepToken(token, amountMinimum, recipient, feeOptions)
    }

    if (!!feeOptions) {
      var feeBips = encodeFeeBips(feeOptions.fee)
      var feeRecipient = validateAndParseAddress(feeOptions.recipient)
      return PaymentsExtended.INTERFACE.encodeFunctionData('sweepTokenWithFee(address,uint256,uint256,address)', [
        token.address,
        toHex(amountMinimum),
        feeBips,
        feeRecipient,
      ])
    } else {
      return PaymentsExtended.INTERFACE.encodeFunctionData('sweepToken(address,uint256)', [
        token.address,
        toHex(amountMinimum),
      ])
    }
  }

  PaymentsExtended.encodePull = function encodePull(token, amount) {
    return PaymentsExtended.INTERFACE.encodeFunctionData('pull', [token.address, toHex(amount)])
  }

  PaymentsExtended.encodeWrapETH = function encodeWrapETH(amount) {
    return PaymentsExtended.INTERFACE.encodeFunctionData('wrapETH', [toHex(amount)])
  }

  return PaymentsExtended
})()
PaymentsExtended.INTERFACE = /*#__PURE__*/ new Interface(abi$2)

function _regeneratorRuntime() {
  /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */

  _regeneratorRuntime = function () {
    return exports
  }

  var exports = {},
    Op = Object.prototype,
    hasOwn = Op.hasOwnProperty,
    $Symbol = 'function' == typeof Symbol ? Symbol : {},
    iteratorSymbol = $Symbol.iterator || '@@iterator',
    asyncIteratorSymbol = $Symbol.asyncIterator || '@@asyncIterator',
    toStringTagSymbol = $Symbol.toStringTag || '@@toStringTag'

  function define(obj, key, value) {
    return (
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: !0,
        configurable: !0,
        writable: !0,
      }),
      obj[key]
    )
  }

  try {
    define({}, '')
  } catch (err) {
    define = function (obj, key, value) {
      return (obj[key] = value)
    }
  }

  function wrap(innerFn, outerFn, self, tryLocsList) {
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator,
      generator = Object.create(protoGenerator.prototype),
      context = new Context(tryLocsList || [])
    return (
      (generator._invoke = (function (innerFn, self, context) {
        var state = 'suspendedStart'
        return function (method, arg) {
          if ('executing' === state) throw new Error('Generator is already running')

          if ('completed' === state) {
            if ('throw' === method) throw arg
            return doneResult()
          }

          for (context.method = method, context.arg = arg; ; ) {
            var delegate = context.delegate

            if (delegate) {
              var delegateResult = maybeInvokeDelegate(delegate, context)

              if (delegateResult) {
                if (delegateResult === ContinueSentinel) continue
                return delegateResult
              }
            }

            if ('next' === context.method) context.sent = context._sent = context.arg
            else if ('throw' === context.method) {
              if ('suspendedStart' === state) throw ((state = 'completed'), context.arg)
              context.dispatchException(context.arg)
            } else 'return' === context.method && context.abrupt('return', context.arg)
            state = 'executing'
            var record = tryCatch(innerFn, self, context)

            if ('normal' === record.type) {
              if (((state = context.done ? 'completed' : 'suspendedYield'), record.arg === ContinueSentinel)) continue
              return {
                value: record.arg,
                done: context.done,
              }
            }

            'throw' === record.type && ((state = 'completed'), (context.method = 'throw'), (context.arg = record.arg))
          }
        }
      })(innerFn, self, context)),
      generator
    )
  }

  function tryCatch(fn, obj, arg) {
    try {
      return {
        type: 'normal',
        arg: fn.call(obj, arg),
      }
    } catch (err) {
      return {
        type: 'throw',
        arg: err,
      }
    }
  }

  exports.wrap = wrap
  var ContinueSentinel = {}

  function Generator() {}

  function GeneratorFunction() {}

  function GeneratorFunctionPrototype() {}

  var IteratorPrototype = {}
  define(IteratorPrototype, iteratorSymbol, function () {
    return this
  })
  var getProto = Object.getPrototypeOf,
    NativeIteratorPrototype = getProto && getProto(getProto(values([])))
  NativeIteratorPrototype &&
    NativeIteratorPrototype !== Op &&
    hasOwn.call(NativeIteratorPrototype, iteratorSymbol) &&
    (IteratorPrototype = NativeIteratorPrototype)
  var Gp = (GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype))

  function defineIteratorMethods(prototype) {
    ;['next', 'throw', 'return'].forEach(function (method) {
      define(prototype, method, function (arg) {
        return this._invoke(method, arg)
      })
    })
  }

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg)

      if ('throw' !== record.type) {
        var result = record.arg,
          value = result.value
        return value && 'object' == typeof value && hasOwn.call(value, '__await')
          ? PromiseImpl.resolve(value.__await).then(
              function (value) {
                invoke('next', value, resolve, reject)
              },
              function (err) {
                invoke('throw', err, resolve, reject)
              }
            )
          : PromiseImpl.resolve(value).then(
              function (unwrapped) {
                ;(result.value = unwrapped), resolve(result)
              },
              function (error) {
                return invoke('throw', error, resolve, reject)
              }
            )
      }

      reject(record.arg)
    }

    var previousPromise

    this._invoke = function (method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function (resolve, reject) {
          invoke(method, arg, resolve, reject)
        })
      }

      return (previousPromise = previousPromise
        ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg)
        : callInvokeWithMethodAndArg())
    }
  }

  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method]

    if (undefined === method) {
      if (((context.delegate = null), 'throw' === context.method)) {
        if (
          delegate.iterator.return &&
          ((context.method = 'return'),
          (context.arg = undefined),
          maybeInvokeDelegate(delegate, context),
          'throw' === context.method)
        )
          return ContinueSentinel
        ;(context.method = 'throw'), (context.arg = new TypeError("The iterator does not provide a 'throw' method"))
      }

      return ContinueSentinel
    }

    var record = tryCatch(method, delegate.iterator, context.arg)
    if ('throw' === record.type)
      return (context.method = 'throw'), (context.arg = record.arg), (context.delegate = null), ContinueSentinel
    var info = record.arg
    return info
      ? info.done
        ? ((context[delegate.resultName] = info.value),
          (context.next = delegate.nextLoc),
          'return' !== context.method && ((context.method = 'next'), (context.arg = undefined)),
          (context.delegate = null),
          ContinueSentinel)
        : info
      : ((context.method = 'throw'),
        (context.arg = new TypeError('iterator result is not an object')),
        (context.delegate = null),
        ContinueSentinel)
  }

  function pushTryEntry(locs) {
    var entry = {
      tryLoc: locs[0],
    }
    1 in locs && (entry.catchLoc = locs[1]),
      2 in locs && ((entry.finallyLoc = locs[2]), (entry.afterLoc = locs[3])),
      this.tryEntries.push(entry)
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {}
    ;(record.type = 'normal'), delete record.arg, (entry.completion = record)
  }

  function Context(tryLocsList) {
    ;(this.tryEntries = [
      {
        tryLoc: 'root',
      },
    ]),
      tryLocsList.forEach(pushTryEntry, this),
      this.reset(!0)
  }

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol]
      if (iteratorMethod) return iteratorMethod.call(iterable)
      if ('function' == typeof iterable.next) return iterable

      if (!isNaN(iterable.length)) {
        var i = -1,
          next = function next() {
            for (; ++i < iterable.length; )
              if (hasOwn.call(iterable, i)) return (next.value = iterable[i]), (next.done = !1), next

            return (next.value = undefined), (next.done = !0), next
          }

        return (next.next = next)
      }
    }

    return {
      next: doneResult,
    }
  }

  function doneResult() {
    return {
      value: undefined,
      done: !0,
    }
  }

  return (
    (GeneratorFunction.prototype = GeneratorFunctionPrototype),
    define(Gp, 'constructor', GeneratorFunctionPrototype),
    define(GeneratorFunctionPrototype, 'constructor', GeneratorFunction),
    (GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, 'GeneratorFunction')),
    (exports.isGeneratorFunction = function (genFun) {
      var ctor = 'function' == typeof genFun && genFun.constructor
      return !!ctor && (ctor === GeneratorFunction || 'GeneratorFunction' === (ctor.displayName || ctor.name))
    }),
    (exports.mark = function (genFun) {
      return (
        Object.setPrototypeOf
          ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype)
          : ((genFun.__proto__ = GeneratorFunctionPrototype), define(genFun, toStringTagSymbol, 'GeneratorFunction')),
        (genFun.prototype = Object.create(Gp)),
        genFun
      )
    }),
    (exports.awrap = function (arg) {
      return {
        __await: arg,
      }
    }),
    defineIteratorMethods(AsyncIterator.prototype),
    define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
      return this
    }),
    (exports.AsyncIterator = AsyncIterator),
    (exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
      void 0 === PromiseImpl && (PromiseImpl = Promise)
      var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl)
      return exports.isGeneratorFunction(outerFn)
        ? iter
        : iter.next().then(function (result) {
            return result.done ? result.value : iter.next()
          })
    }),
    defineIteratorMethods(Gp),
    define(Gp, toStringTagSymbol, 'Generator'),
    define(Gp, iteratorSymbol, function () {
      return this
    }),
    define(Gp, 'toString', function () {
      return '[object Generator]'
    }),
    (exports.keys = function (object) {
      var keys = []

      for (var key in object) keys.push(key)

      return (
        keys.reverse(),
        function next() {
          for (; keys.length; ) {
            var key = keys.pop()
            if (key in object) return (next.value = key), (next.done = !1), next
          }

          return (next.done = !0), next
        }
      )
    }),
    (exports.values = values),
    (Context.prototype = {
      constructor: Context,
      reset: function (skipTempReset) {
        if (
          ((this.prev = 0),
          (this.next = 0),
          (this.sent = this._sent = undefined),
          (this.done = !1),
          (this.delegate = null),
          (this.method = 'next'),
          (this.arg = undefined),
          this.tryEntries.forEach(resetTryEntry),
          !skipTempReset)
        )
          for (var name in this)
            't' === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined)
      },
      stop: function () {
        this.done = !0
        var rootRecord = this.tryEntries[0].completion
        if ('throw' === rootRecord.type) throw rootRecord.arg
        return this.rval
      },
      dispatchException: function (exception) {
        if (this.done) throw exception
        var context = this

        function handle(loc, caught) {
          return (
            (record.type = 'throw'),
            (record.arg = exception),
            (context.next = loc),
            caught && ((context.method = 'next'), (context.arg = undefined)),
            !!caught
          )
        }

        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i],
            record = entry.completion
          if ('root' === entry.tryLoc) return handle('end')

          if (entry.tryLoc <= this.prev) {
            var hasCatch = hasOwn.call(entry, 'catchLoc'),
              hasFinally = hasOwn.call(entry, 'finallyLoc')

            if (hasCatch && hasFinally) {
              if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0)
              if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc)
            } else if (hasCatch) {
              if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0)
            } else {
              if (!hasFinally) throw new Error('try statement without catch or finally')
              if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc)
            }
          }
        }
      },
      abrupt: function (type, arg) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i]

          if (entry.tryLoc <= this.prev && hasOwn.call(entry, 'finallyLoc') && this.prev < entry.finallyLoc) {
            var finallyEntry = entry
            break
          }
        }

        finallyEntry &&
          ('break' === type || 'continue' === type) &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc &&
          (finallyEntry = null)
        var record = finallyEntry ? finallyEntry.completion : {}
        return (
          (record.type = type),
          (record.arg = arg),
          finallyEntry
            ? ((this.method = 'next'), (this.next = finallyEntry.finallyLoc), ContinueSentinel)
            : this.complete(record)
        )
      },
      complete: function (record, afterLoc) {
        if ('throw' === record.type) throw record.arg
        return (
          'break' === record.type || 'continue' === record.type
            ? (this.next = record.arg)
            : 'return' === record.type
            ? ((this.rval = this.arg = record.arg), (this.method = 'return'), (this.next = 'end'))
            : 'normal' === record.type && afterLoc && (this.next = afterLoc),
          ContinueSentinel
        )
      },
      finish: function (finallyLoc) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i]
          if (entry.finallyLoc === finallyLoc)
            return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel
        }
      },
      catch: function (tryLoc) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i]

          if (entry.tryLoc === tryLoc) {
            var record = entry.completion

            if ('throw' === record.type) {
              var thrown = record.arg
              resetTryEntry(entry)
            }

            return thrown
          }
        }

        throw new Error('illegal catch attempt')
      },
      delegateYield: function (iterable, resultName, nextLoc) {
        return (
          (this.delegate = {
            iterator: values(iterable),
            resultName: resultName,
            nextLoc: nextLoc,
          }),
          'next' === this.method && (this.arg = undefined),
          ContinueSentinel
        )
      },
    }),
    exports
  )
}

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg)
    var value = info.value
  } catch (error) {
    reject(error)
    return
  }

  if (info.done) {
    resolve(value)
  } else {
    Promise.resolve(value).then(_next, _throw)
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
      args = arguments
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args)

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'next', value)
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'throw', err)
      }

      _next(undefined)
    })
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i]
    descriptor.enumerable = descriptor.enumerable || false
    descriptor.configurable = true
    if ('value' in descriptor) descriptor.writable = true
    Object.defineProperty(target, descriptor.key, descriptor)
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps)
  if (staticProps) _defineProperties(Constructor, staticProps)
  Object.defineProperty(Constructor, 'prototype', {
    writable: false,
  })
  return Constructor
}

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype)
  subClass.prototype.constructor = subClass

  _setPrototypeOf(subClass, superClass)
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf
    ? Object.setPrototypeOf.bind()
    : function _setPrototypeOf(o, p) {
        o.__proto__ = p
        return o
      }
  return _setPrototypeOf(o, p)
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return
  if (typeof o === 'string') return _arrayLikeToArray(o, minLen)
  var n = Object.prototype.toString.call(o).slice(8, -1)
  if (n === 'Object' && o.constructor) n = o.constructor.name
  if (n === 'Map' || n === 'Set') return Array.from(o)
  if (n === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen)
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length

  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]

  return arr2
}

function _createForOfIteratorHelperLoose(o, allowArrayLike) {
  var it = (typeof Symbol !== 'undefined' && o[Symbol.iterator]) || o['@@iterator']
  if (it) return (it = it.call(o)).next.bind(it)

  if (
    Array.isArray(o) ||
    (it = _unsupportedIterableToArray(o)) ||
    (allowArrayLike && o && typeof o.length === 'number')
  ) {
    if (it) o = it
    var i = 0
    return function () {
      if (i >= o.length)
        return {
          done: true,
        }
      return {
        done: false,
        value: o[i++],
      }
    }
  }

  throw new TypeError(
    'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
  )
}

var Protocol
;(function (Protocol) {
  Protocol['V2'] = 'V2'
  Protocol['V3'] = 'V3'
  Protocol['MIXED'] = 'MIXED'
})(Protocol || (Protocol = {}))

var RouteV3 = /*#__PURE__*/ (function (_V3RouteSDK) {
  _inheritsLoose(RouteV3, _V3RouteSDK)

  function RouteV3(v3Route) {
    var _this

    _this = _V3RouteSDK.call(this, v3Route.pools, v3Route.input, v3Route.output) || this
    _this.protocol = Protocol.V3
    _this.path = v3Route.tokenPath
    return _this
  }

  return RouteV3
})(Route)

var Trade = /*#__PURE__*/ (function () {
  //  construct a trade across v2 and v3 routes from pre-computed amounts
  function Trade(_ref) {
    var v3Routes = _ref.v3Routes,
      tradeType = _ref.tradeType
    this.swaps = []
    this.routes = [] // wrap v3 routes

    for (var _iterator = _createForOfIteratorHelperLoose(v3Routes), _step; !(_step = _iterator()).done; ) {
      var _step$value = _step.value,
        routev3 = _step$value.routev3,
        inputAmount = _step$value.inputAmount,
        outputAmount = _step$value.outputAmount
      var route = new RouteV3(routev3)
      this.routes.push(route)
      this.swaps.push({
        route: route,
        inputAmount: inputAmount,
        outputAmount: outputAmount,
      })
    }

    this.tradeType = tradeType // each route must have the same input and output currency

    var inputCurrency = this.swaps[0].inputAmount.currency
    var outputCurrency = this.swaps[0].outputAmount.currency
    !this.swaps.every(function (_ref2) {
      var route = _ref2.route
      return inputCurrency.wrapped.equals(route.input.wrapped)
    })
      ? process.env.NODE_ENV !== 'production'
        ? invariant(false, 'INPUT_CURRENCY_MATCH')
        : invariant(false)
      : void 0
    !this.swaps.every(function (_ref3) {
      var route = _ref3.route
      return outputCurrency.wrapped.equals(route.output.wrapped)
    })
      ? process.env.NODE_ENV !== 'production'
        ? invariant(false, 'OUTPUT_CURRENCY_MATCH')
        : invariant(false)
      : void 0 // pools must be unique inter protocols

    var numPools = this.swaps
      .map(function (_ref4) {
        var route = _ref4.route
        return route.pools.length
      })
      .reduce(function (total, cur) {
        return total + cur
      }, 0)
    var poolAddressSet = new Set()

    for (var _iterator2 = _createForOfIteratorHelperLoose(this.swaps), _step2; !(_step2 = _iterator2()).done; ) {
      var _route = _step2.value.route

      for (var _iterator3 = _createForOfIteratorHelperLoose(_route.pools), _step3; !(_step3 = _iterator3()).done; ) {
        var pool = _step3.value

        if (pool instanceof Pool) {
          poolAddressSet.add(Pool.getAddress(pool.token0, pool.token1, pool.fee))
        } else {
          throw new Error('Unexpected pool type in route when constructing trade object')
        }
      }
    }

    !(numPools == poolAddressSet.size)
      ? process.env.NODE_ENV !== 'production'
        ? invariant(false, 'POOLS_DUPLICATED')
        : invariant(false)
      : void 0
  }

  var _proto = Trade.prototype

  /**
   * Get the minimum amount that must be received from this trade for the given slippage tolerance
   * @param slippageTolerance The tolerance of unfavorable slippage from the execution price of this trade
   * @returns The amount out
   */
  _proto.minimumAmountOut = function minimumAmountOut(slippageTolerance, amountOut) {
    if (amountOut === void 0) {
      amountOut = this.outputAmount
    }

    !!slippageTolerance.lessThan(ZERO)
      ? process.env.NODE_ENV !== 'production'
        ? invariant(false, 'SLIPPAGE_TOLERANCE')
        : invariant(false)
      : void 0

    if (this.tradeType === TradeType.EXACT_OUTPUT) {
      return amountOut
    } else {
      var slippageAdjustedAmountOut = new Fraction(ONE)
        .add(slippageTolerance)
        .invert()
        .multiply(amountOut.quotient).quotient
      return CurrencyAmount.fromRawAmount(amountOut.currency, slippageAdjustedAmountOut)
    }
  }
  /**
   * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
   * @param slippageTolerance The tolerance of unfavorable slippage from the execution price of this trade
   * @returns The amount in
   */

  _proto.maximumAmountIn = function maximumAmountIn(slippageTolerance, amountIn) {
    if (amountIn === void 0) {
      amountIn = this.inputAmount
    }

    !!slippageTolerance.lessThan(ZERO)
      ? process.env.NODE_ENV !== 'production'
        ? invariant(false, 'SLIPPAGE_TOLERANCE')
        : invariant(false)
      : void 0

    if (this.tradeType === TradeType.EXACT_INPUT) {
      return amountIn
    } else {
      var slippageAdjustedAmountIn = new Fraction(ONE).add(slippageTolerance).multiply(amountIn.quotient).quotient
      return CurrencyAmount.fromRawAmount(amountIn.currency, slippageAdjustedAmountIn)
    }
  }
  /**
   * Return the execution price after accounting for slippage tolerance
   * @param slippageTolerance the allowed tolerated slippage
   * @returns The execution price
   */

  _proto.worstExecutionPrice = function worstExecutionPrice(slippageTolerance) {
    return new Price(
      this.inputAmount.currency,
      this.outputAmount.currency,
      this.maximumAmountIn(slippageTolerance).quotient,
      this.minimumAmountOut(slippageTolerance).quotient
    )
  }

  Trade.fromRoutes = /*#__PURE__*/ (function () {
    var _fromRoutes = /*#__PURE__*/ _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime().mark(function _callee(v3Routes, tradeType) {
        var populatedV3Routes, _iterator4, _step4, _step4$value, routev3, amount, v3Trade, inputAmount, outputAmount

        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) {
            switch ((_context.prev = _context.next)) {
              case 0:
                populatedV3Routes = []
                _iterator4 = _createForOfIteratorHelperLoose(v3Routes)

              case 2:
                if ((_step4 = _iterator4()).done) {
                  _context.next = 11
                  break
                }

                ;(_step4$value = _step4.value), (routev3 = _step4$value.routev3), (amount = _step4$value.amount)
                _context.next = 6
                return Trade$1.fromRoute(routev3, amount, tradeType)

              case 6:
                v3Trade = _context.sent
                ;(inputAmount = v3Trade.inputAmount), (outputAmount = v3Trade.outputAmount)
                populatedV3Routes.push({
                  routev3: routev3,
                  inputAmount: inputAmount,
                  outputAmount: outputAmount,
                })

              case 9:
                _context.next = 2
                break

              case 11:
                return _context.abrupt(
                  'return',
                  new Trade({
                    v3Routes: populatedV3Routes,
                    tradeType: tradeType,
                  })
                )

              case 12:
              case 'end':
                return _context.stop()
            }
          }
        }, _callee)
      })
    )

    function fromRoutes(_x, _x2) {
      return _fromRoutes.apply(this, arguments)
    }

    return fromRoutes
  })()

  Trade.fromRoute = /*#__PURE__*/ (function () {
    var _fromRoute = /*#__PURE__*/ _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime().mark(function _callee2(route, amount, tradeType) {
        var v3Routes, v3Trade, inputAmount, outputAmount
        return _regeneratorRuntime().wrap(function _callee2$(_context2) {
          while (1) {
            switch ((_context2.prev = _context2.next)) {
              case 0:
                v3Routes = []

                if (!(route instanceof Route)) {
                  _context2.next = 9
                  break
                }

                _context2.next = 4
                return Trade$1.fromRoute(route, amount, tradeType)

              case 4:
                v3Trade = _context2.sent
                ;(inputAmount = v3Trade.inputAmount), (outputAmount = v3Trade.outputAmount)
                v3Routes = [
                  {
                    routev3: route,
                    inputAmount: inputAmount,
                    outputAmount: outputAmount,
                  },
                ]
                _context2.next = 10
                break

              case 9:
                throw new Error('Invalid route type')

              case 10:
                return _context2.abrupt(
                  'return',
                  new Trade({
                    v3Routes: v3Routes,
                    tradeType: tradeType,
                  })
                )

              case 11:
              case 'end':
                return _context2.stop()
            }
          }
        }, _callee2)
      })
    )

    function fromRoute(_x3, _x4, _x5) {
      return _fromRoute.apply(this, arguments)
    }

    return fromRoute
  })()

  _createClass(Trade, [
    {
      key: 'inputAmount',
      get: function get() {
        if (this._inputAmount) {
          return this._inputAmount
        }

        var inputCurrency = this.swaps[0].inputAmount.currency
        var totalInputFromRoutes = this.swaps
          .map(function (_ref5) {
            var inputAmount = _ref5.inputAmount
            return inputAmount
          })
          .reduce(function (total, cur) {
            return total.add(cur)
          }, CurrencyAmount.fromRawAmount(inputCurrency, 0))
        this._inputAmount = totalInputFromRoutes
        return this._inputAmount
      },
    },
    {
      key: 'outputAmount',
      get: function get() {
        if (this._outputAmount) {
          return this._outputAmount
        }

        var outputCurrency = this.swaps[0].outputAmount.currency
        var totalOutputFromRoutes = this.swaps
          .map(function (_ref6) {
            var outputAmount = _ref6.outputAmount
            return outputAmount
          })
          .reduce(function (total, cur) {
            return total.add(cur)
          }, CurrencyAmount.fromRawAmount(outputCurrency, 0))
        this._outputAmount = totalOutputFromRoutes
        return this._outputAmount
      },
      /**
       * The price expressed in terms of output amount/input amount.
       */
    },
    {
      key: 'executionPrice',
      get: function get() {
        var _this$_executionPrice

        return (_this$_executionPrice = this._executionPrice) != null
          ? _this$_executionPrice
          : (this._executionPrice = new Price(
              this.inputAmount.currency,
              this.outputAmount.currency,
              this.inputAmount.quotient,
              this.outputAmount.quotient
            ))
      },
      /**
       * Returns the percent difference between the route's mid price and the price impact
       */
    },
    {
      key: 'priceImpact',
      get: function get() {
        if (this._priceImpact) {
          return this._priceImpact
        }

        var spotOutputAmount = CurrencyAmount.fromRawAmount(this.outputAmount.currency, 0)

        for (var _iterator5 = _createForOfIteratorHelperLoose(this.swaps), _step5; !(_step5 = _iterator5()).done; ) {
          var _step5$value = _step5.value,
            route = _step5$value.route,
            inputAmount = _step5$value.inputAmount
          var midPrice = route.midPrice
          spotOutputAmount = spotOutputAmount.add(midPrice.quote(inputAmount))
        }

        var priceImpact = spotOutputAmount.subtract(this.outputAmount).divide(spotOutputAmount)
        this._priceImpact = new Percent(priceImpact.numerator, priceImpact.denominator)
        return this._priceImpact
      },
    },
  ])

  return Trade
})()

var ZERO$1 = /*#__PURE__*/ JSBI.BigInt(0)
var REFUND_ETH_PRICE_IMPACT_THRESHOLD = /*#__PURE__*/ new Percent(
  /*#__PURE__*/ JSBI.BigInt(50),
  /*#__PURE__*/ JSBI.BigInt(100)
)
/**
 * Represents the Uniswap V2 + V3 SwapRouter02, and has static methods for helping execute trades.
 */

var SwapRouter = /*#__PURE__*/ (function () {
  /**
   * Cannot be constructed.
   */
  function SwapRouter() {}
  /**
   * @notice Generates the calldata for a Swap with a V3 Route.
   * @param trade The V3Trade to encode.
   * @param options SwapOptions to use for the trade.
   * @param routerMustCustody Flag for whether funds should be sent to the router
   * @param performAggregatedSlippageCheck Flag for whether we want to perform an aggregated slippage check
   * @returns A string array of calldatas for the trade.
   */

  SwapRouter.encodeV3Swap = function encodeV3Swap(trade, options, routerMustCustody, performAggregatedSlippageCheck) {
    var calldatas = []

    for (var _iterator = _createForOfIteratorHelperLoose(trade.swaps), _step; !(_step = _iterator()).done; ) {
      var _step$value = _step.value,
        route = _step$value.route,
        inputAmount = _step$value.inputAmount,
        outputAmount = _step$value.outputAmount
      var amountIn = toHex(trade.maximumAmountIn(options.slippageTolerance, inputAmount).quotient)
      var amountOut = toHex(trade.minimumAmountOut(options.slippageTolerance, outputAmount).quotient) // flag for whether the trade is single hop or not

      var singleHop = route.pools.length === 1
      var recipient = routerMustCustody
        ? ADDRESS_THIS
        : typeof options.recipient === 'undefined'
        ? MSG_SENDER
        : validateAndParseAddress(options.recipient)

      if (singleHop) {
        if (trade.tradeType === TradeType.EXACT_INPUT) {
          var exactInputSingleParams = {
            tokenIn: route.tokenPath[0].address,
            tokenOut: route.tokenPath[1].address,
            fee: route.pools[0].fee,
            recipient: recipient,
            amountIn: amountIn,
            amountOutMinimum: performAggregatedSlippageCheck ? 0 : amountOut,
            sqrtPriceLimitX96: 0,
          }
          calldatas.push(SwapRouter.INTERFACE.encodeFunctionData('exactInputSingle', [exactInputSingleParams]))
        } else {
          var exactOutputSingleParams = {
            tokenIn: route.tokenPath[0].address,
            tokenOut: route.tokenPath[1].address,
            fee: route.pools[0].fee,
            recipient: recipient,
            amountOut: amountOut,
            amountInMaximum: amountIn,
            sqrtPriceLimitX96: 0,
          }
          calldatas.push(SwapRouter.INTERFACE.encodeFunctionData('exactOutputSingle', [exactOutputSingleParams]))
        }
      } else {
        var path = encodeRouteToPath(route, trade.tradeType === TradeType.EXACT_OUTPUT)

        if (trade.tradeType === TradeType.EXACT_INPUT) {
          var exactInputParams = {
            path: path,
            recipient: recipient,
            amountIn: amountIn,
            amountOutMinimum: performAggregatedSlippageCheck ? 0 : amountOut,
          }
          calldatas.push(SwapRouter.INTERFACE.encodeFunctionData('exactInput', [exactInputParams]))
        } else {
          var exactOutputParams = {
            path: path,
            recipient: recipient,
            amountOut: amountOut,
            amountInMaximum: amountIn,
          }
          calldatas.push(SwapRouter.INTERFACE.encodeFunctionData('exactOutput', [exactOutputParams]))
        }
      }
    }

    return calldatas
  }

  SwapRouter.encodeSwaps = function encodeSwaps(trades, options, isSwapAndAdd) {
    // If dealing with an instance of the aggregated Trade object, unbundle it to individual trade objects.
    if (trades instanceof Trade) {
      !trades.swaps.every(function (swap) {
        return swap.route.protocol == Protocol.V3
      })
        ? process.env.NODE_ENV !== 'production'
          ? invariant(false, 'UNSUPPORTED_PROTOCOL')
          : invariant(false)
        : void 0
      var individualTrades = []

      for (var _iterator2 = _createForOfIteratorHelperLoose(trades.swaps), _step2; !(_step2 = _iterator2()).done; ) {
        var _step2$value = _step2.value,
          route = _step2$value.route,
          inputAmount = _step2$value.inputAmount,
          outputAmount = _step2$value.outputAmount

        if (route.protocol == Protocol.V3) {
          individualTrades.push(
            Trade$1.createUncheckedTrade({
              route: route,
              inputAmount: inputAmount,
              outputAmount: outputAmount,
              tradeType: trades.tradeType,
            })
          )
        } else {
          throw new Error('UNSUPPORTED_TRADE_PROTOCOL')
        }
      }

      trades = individualTrades
    }

    if (!Array.isArray(trades)) {
      trades = [trades]
    }

    var numberOfTrades = trades.reduce(function (numberOfTrades, trade) {
      return numberOfTrades + (trade instanceof Trade$1 ? trade.swaps.length : 1)
    }, 0)
    var sampleTrade = trades[0] // All trades should have the same starting/ending currency and trade type

    !trades.every(function (trade) {
      return trade.inputAmount.currency.equals(sampleTrade.inputAmount.currency)
    })
      ? process.env.NODE_ENV !== 'production'
        ? invariant(false, 'TOKEN_IN_DIFF')
        : invariant(false)
      : void 0
    !trades.every(function (trade) {
      return trade.outputAmount.currency.equals(sampleTrade.outputAmount.currency)
    })
      ? process.env.NODE_ENV !== 'production'
        ? invariant(false, 'TOKEN_OUT_DIFF')
        : invariant(false)
      : void 0
    !trades.every(function (trade) {
      return trade.tradeType === sampleTrade.tradeType
    })
      ? process.env.NODE_ENV !== 'production'
        ? invariant(false, 'TRADE_TYPE_DIFF')
        : invariant(false)
      : void 0
    var calldatas = []
    var inputIsNative = sampleTrade.inputAmount.currency.isNative
    var outputIsNative = sampleTrade.outputAmount.currency.isNative // flag for whether we want to perform an aggregated slippage check
    //   1. when there are >2 exact input trades. this is only a heuristic,
    //      as it's still more gas-expensive even in this case, but has benefits
    //      in that the reversion probability is lower

    var performAggregatedSlippageCheck = sampleTrade.tradeType === TradeType.EXACT_INPUT && numberOfTrades > 2 // flag for whether funds should be send first to the router
    //   1. when receiving ETH (which much be unwrapped from WETH)
    //   2. when a fee on the output is being taken
    //   3. when performing swap and add
    //   4. when performing an aggregated slippage check

    var routerMustCustody = outputIsNative || !!options.fee || !!isSwapAndAdd || performAggregatedSlippageCheck // encode permit if necessary

    if (options.inputTokenPermit) {
      !sampleTrade.inputAmount.currency.isToken
        ? process.env.NODE_ENV !== 'production'
          ? invariant(false, 'NON_TOKEN_PERMIT')
          : invariant(false)
        : void 0
      calldatas.push(SelfPermit.encodePermit(sampleTrade.inputAmount.currency, options.inputTokenPermit))
    }

    for (var _iterator3 = _createForOfIteratorHelperLoose(trades), _step3; !(_step3 = _iterator3()).done; ) {
      var trade = _step3.value

      if (trade instanceof Trade$1) {
        for (
          var _iterator4 = _createForOfIteratorHelperLoose(
              SwapRouter.encodeV3Swap(trade, options, routerMustCustody, performAggregatedSlippageCheck)
            ),
            _step4;
          !(_step4 = _iterator4()).done;

        ) {
          var calldata = _step4.value
          calldatas.push(calldata)
        }
      } else {
        throw new Error('Unsupported trade object')
      }
    }

    var ZERO_IN = CurrencyAmount.fromRawAmount(sampleTrade.inputAmount.currency, 0)
    var ZERO_OUT = CurrencyAmount.fromRawAmount(sampleTrade.outputAmount.currency, 0)
    var minimumAmountOut = trades.reduce(function (sum, trade) {
      return sum.add(trade.minimumAmountOut(options.slippageTolerance))
    }, ZERO_OUT)
    var quoteAmountOut = trades.reduce(function (sum, trade) {
      return sum.add(trade.outputAmount)
    }, ZERO_OUT)
    var totalAmountIn = trades.reduce(function (sum, trade) {
      return sum.add(trade.maximumAmountIn(options.slippageTolerance))
    }, ZERO_IN)
    return {
      calldatas: calldatas,
      sampleTrade: sampleTrade,
      routerMustCustody: routerMustCustody,
      inputIsNative: inputIsNative,
      outputIsNative: outputIsNative,
      totalAmountIn: totalAmountIn,
      minimumAmountOut: minimumAmountOut,
      quoteAmountOut: quoteAmountOut,
    }
  }
  /**
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade.
   * @param trades to produce call parameters for
   * @param options options for the call parameters
   */

  SwapRouter.swapCallParameters = function swapCallParameters(trades, options) {
    var _SwapRouter$encodeSwa = SwapRouter.encodeSwaps(trades, options),
      calldatas = _SwapRouter$encodeSwa.calldatas,
      sampleTrade = _SwapRouter$encodeSwa.sampleTrade,
      routerMustCustody = _SwapRouter$encodeSwa.routerMustCustody,
      inputIsNative = _SwapRouter$encodeSwa.inputIsNative,
      outputIsNative = _SwapRouter$encodeSwa.outputIsNative,
      totalAmountIn = _SwapRouter$encodeSwa.totalAmountIn,
      minimumAmountOut = _SwapRouter$encodeSwa.minimumAmountOut // unwrap or sweep

    if (routerMustCustody) {
      if (outputIsNative) {
        calldatas.push(PaymentsExtended.encodeUnwrapWETH9(minimumAmountOut.quotient, options.recipient, options.fee))
      } else {
        calldatas.push(
          PaymentsExtended.encodeSweepToken(
            sampleTrade.outputAmount.currency.wrapped,
            minimumAmountOut.quotient,
            options.recipient,
            options.fee
          )
        )
      }
    } // must refund when paying in ETH: either with an uncertain input amount OR if there's a chance of a partial fill.
    // unlike ERC20's, the full ETH value must be sent in the transaction, so the rest must be refunded.

    if (inputIsNative && (sampleTrade.tradeType === TradeType.EXACT_OUTPUT || SwapRouter.riskOfPartialFill(trades))) {
      calldatas.push(Payments.encodeRefundETH())
    }

    return {
      calldata: MulticallExtended.encodeMulticall(calldatas, options.deadlineOrPreviousBlockhash),
      value: toHex(inputIsNative ? totalAmountIn.quotient : ZERO$1),
    }
  }
  /**
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade.
   * @param trades to produce call parameters for
   * @param options options for the call parameters
   */

  SwapRouter.swapAndAddCallParameters = function swapAndAddCallParameters(
    trades,
    options,
    position,
    addLiquidityOptions,
    tokenInApprovalType,
    tokenOutApprovalType
  ) {
    var _SwapRouter$encodeSwa2 = SwapRouter.encodeSwaps(trades, options, true),
      calldatas = _SwapRouter$encodeSwa2.calldatas,
      inputIsNative = _SwapRouter$encodeSwa2.inputIsNative,
      outputIsNative = _SwapRouter$encodeSwa2.outputIsNative,
      sampleTrade = _SwapRouter$encodeSwa2.sampleTrade,
      totalAmountSwapped = _SwapRouter$encodeSwa2.totalAmountIn,
      quoteAmountOut = _SwapRouter$encodeSwa2.quoteAmountOut,
      minimumAmountOut = _SwapRouter$encodeSwa2.minimumAmountOut // encode output token permit if necessary

    if (options.outputTokenPermit) {
      !quoteAmountOut.currency.isToken
        ? process.env.NODE_ENV !== 'production'
          ? invariant(false, 'NON_TOKEN_PERMIT_OUTPUT')
          : invariant(false)
        : void 0
      calldatas.push(SelfPermit.encodePermit(quoteAmountOut.currency, options.outputTokenPermit))
    }

    var chainId = sampleTrade.route.chainId
    var zeroForOne = position.pool.token0.wrapped.address === totalAmountSwapped.currency.wrapped.address

    var _SwapRouter$getPositi = SwapRouter.getPositionAmounts(position, zeroForOne),
      positionAmountIn = _SwapRouter$getPositi.positionAmountIn,
      positionAmountOut = _SwapRouter$getPositi.positionAmountOut // if tokens are native they will be converted to WETH9

    var tokenIn = inputIsNative ? WETH9[chainId] : positionAmountIn.currency.wrapped
    var tokenOut = outputIsNative ? WETH9[chainId] : positionAmountOut.currency.wrapped // if swap output does not make up whole outputTokenBalanceDesired, pull in remaining tokens for adding liquidity

    var amountOutRemaining = positionAmountOut.subtract(quoteAmountOut.wrapped)

    if (amountOutRemaining.greaterThan(CurrencyAmount.fromRawAmount(positionAmountOut.currency, 0))) {
      // if output is native, this means the remaining portion is included as native value in the transaction
      // and must be wrapped. Otherwise, pull in remaining ERC20 token.
      outputIsNative
        ? calldatas.push(PaymentsExtended.encodeWrapETH(amountOutRemaining.quotient))
        : calldatas.push(PaymentsExtended.encodePull(tokenOut, amountOutRemaining.quotient))
    } // if input is native, convert to WETH9, else pull ERC20 token

    inputIsNative
      ? calldatas.push(PaymentsExtended.encodeWrapETH(positionAmountIn.quotient))
      : calldatas.push(PaymentsExtended.encodePull(tokenIn, positionAmountIn.quotient)) // approve token balances to NFTManager

    if (tokenInApprovalType !== ApprovalTypes.NOT_REQUIRED)
      calldatas.push(ApproveAndCall.encodeApprove(tokenIn, tokenInApprovalType))
    if (tokenOutApprovalType !== ApprovalTypes.NOT_REQUIRED)
      calldatas.push(ApproveAndCall.encodeApprove(tokenOut, tokenOutApprovalType)) // represents a position with token amounts resulting from a swap with maximum slippage
    // hence the minimal amount out possible.

    var minimalPosition = Position.fromAmounts({
      pool: position.pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount0: zeroForOne ? position.amount0.quotient.toString() : minimumAmountOut.quotient.toString(),
      amount1: zeroForOne ? minimumAmountOut.quotient.toString() : position.amount1.quotient.toString(),
      useFullPrecision: false,
    }) // encode NFTManager add liquidity

    calldatas.push(
      ApproveAndCall.encodeAddLiquidity(position, minimalPosition, addLiquidityOptions, options.slippageTolerance)
    ) // sweep remaining tokens

    inputIsNative
      ? calldatas.push(PaymentsExtended.encodeUnwrapWETH9(ZERO$1))
      : calldatas.push(PaymentsExtended.encodeSweepToken(tokenIn, ZERO$1))
    outputIsNative
      ? calldatas.push(PaymentsExtended.encodeUnwrapWETH9(ZERO$1))
      : calldatas.push(PaymentsExtended.encodeSweepToken(tokenOut, ZERO$1))
    var value

    if (inputIsNative) {
      value = totalAmountSwapped.wrapped.add(positionAmountIn.wrapped).quotient
    } else if (outputIsNative) {
      value = amountOutRemaining.quotient
    } else {
      value = ZERO$1
    }

    return {
      calldata: MulticallExtended.encodeMulticall(calldatas, options.deadlineOrPreviousBlockhash),
      value: value.toString(),
    }
  } // if price impact is very high, there's a chance of hitting max/min prices resulting in a partial fill of the swap

  SwapRouter.riskOfPartialFill = function riskOfPartialFill(trades) {
    if (Array.isArray(trades)) {
      return trades.some(function (trade) {
        return SwapRouter.v3TradeWithHighPriceImpact(trade)
      })
    } else {
      return SwapRouter.v3TradeWithHighPriceImpact(trades)
    }
  }

  SwapRouter.v3TradeWithHighPriceImpact = function v3TradeWithHighPriceImpact(trade) {
    return trade.priceImpact.greaterThan(REFUND_ETH_PRICE_IMPACT_THRESHOLD)
  }

  SwapRouter.getPositionAmounts = function getPositionAmounts(position, zeroForOne) {
    var _position$mintAmounts = position.mintAmounts,
      amount0 = _position$mintAmounts.amount0,
      amount1 = _position$mintAmounts.amount1
    var currencyAmount0 = CurrencyAmount.fromRawAmount(position.pool.token0, amount0)
    var currencyAmount1 = CurrencyAmount.fromRawAmount(position.pool.token1, amount1)

    var _ref = zeroForOne ? [currencyAmount0, currencyAmount1] : [currencyAmount1, currencyAmount0],
      positionAmountIn = _ref[0],
      positionAmountOut = _ref[1]

    return {
      positionAmountIn: positionAmountIn,
      positionAmountOut: positionAmountOut,
    }
  }

  return SwapRouter
})()
SwapRouter.INTERFACE = /*#__PURE__*/ new Interface(abi$3)

/**
 * Simple utility function to get the output of an array of Pools or Pairs
 * @param pools
 * @param firstInputToken
 * @returns the output token of the last pool in the array
 */
var getOutputOfPools = function getOutputOfPools(pools, firstInputToken) {
  var _pools$reduce = pools.reduce(
      function (_ref, pool) {
        var inputToken = _ref.inputToken
        if (!pool.involvesToken(inputToken)) throw new Error('PATH')
        var outputToken = pool.token0.equals(inputToken) ? pool.token1 : pool.token0
        return {
          inputToken: outputToken,
        }
      },
      {
        inputToken: firstInputToken,
      }
    ),
    outputToken = _pools$reduce.inputToken

  return outputToken
}

export {
  ADDRESS_THIS,
  ApprovalTypes,
  ApproveAndCall,
  MSG_SENDER,
  MulticallExtended,
  ONE,
  PaymentsExtended,
  Protocol,
  RouteV3,
  SwapRouter,
  Trade,
  V2_FEE_PATH_PLACEHOLDER,
  ZERO,
  getOutputOfPools,
  isMint,
}
//# sourceMappingURL=router-sdk.esm.js.map
