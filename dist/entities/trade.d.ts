import { Currency, CurrencyAmount, Percent, Price, TradeType } from '@uniswap/sdk-core'
import { Pool, Route as V3RouteSDK } from '@uniswap/v3-sdk'
import { IRoute } from './route'
export declare class Trade<TInput extends Currency, TOutput extends Currency, TTradeType extends TradeType> {
  readonly routes: IRoute<TInput, TOutput, Pool>[]
  readonly tradeType: TTradeType
  private _outputAmount
  private _inputAmount
  /**
   * The swaps of the trade, i.e. which routes and how much is swapped in each that
   * make up the trade. May consist of swaps in v2 or v3.
   */
  readonly swaps: {
    route: IRoute<TInput, TOutput, Pool>
    inputAmount: CurrencyAmount<TInput>
    outputAmount: CurrencyAmount<TOutput>
  }[]
  constructor({
    v3Routes,
    tradeType,
  }: {
    v3Routes: {
      routev3: V3RouteSDK<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[]
    tradeType: TTradeType
  })
  get inputAmount(): CurrencyAmount<TInput>
  get outputAmount(): CurrencyAmount<TOutput>
  private _executionPrice
  /**
   * The price expressed in terms of output amount/input amount.
   */
  get executionPrice(): Price<TInput, TOutput>
  /**
   * The cached result of the price impact computation
   * @private
   */
  private _priceImpact
  /**
   * Returns the percent difference between the route's mid price and the price impact
   */
  get priceImpact(): Percent
  /**
   * Get the minimum amount that must be received from this trade for the given slippage tolerance
   * @param slippageTolerance The tolerance of unfavorable slippage from the execution price of this trade
   * @returns The amount out
   */
  minimumAmountOut(slippageTolerance: Percent, amountOut?: CurrencyAmount<TOutput>): CurrencyAmount<TOutput>
  /**
   * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
   * @param slippageTolerance The tolerance of unfavorable slippage from the execution price of this trade
   * @returns The amount in
   */
  maximumAmountIn(slippageTolerance: Percent, amountIn?: CurrencyAmount<TInput>): CurrencyAmount<TInput>
  /**
   * Return the execution price after accounting for slippage tolerance
   * @param slippageTolerance the allowed tolerated slippage
   * @returns The execution price
   */
  worstExecutionPrice(slippageTolerance: Percent): Price<TInput, TOutput>
  static fromRoutes<TInput extends Currency, TOutput extends Currency, TTradeType extends TradeType>(
    v3Routes: {
      routev3: V3RouteSDK<TInput, TOutput>
      amount: TTradeType extends TradeType.EXACT_INPUT ? CurrencyAmount<TInput> : CurrencyAmount<TOutput>
    }[],
    tradeType: TTradeType
  ): Promise<Trade<TInput, TOutput, TTradeType>>
  static fromRoute<TInput extends Currency, TOutput extends Currency, TTradeType extends TradeType>(
    route: V3RouteSDK<TInput, TOutput>,
    amount: TTradeType extends TradeType.EXACT_INPUT ? CurrencyAmount<TInput> : CurrencyAmount<TOutput>,
    tradeType: TTradeType
  ): Promise<Trade<TInput, TOutput, TTradeType>>
}
