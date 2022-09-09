import { Token } from '@uniswap/sdk-core'
import { Pool } from '@uniswap/v3-sdk'

/**
 * Simple utility function to get the output of an array of Pools or Pairs
 * @param pools
 * @param firstInputToken
 * @returns the output token of the last pool in the array
 */
export const getOutputOfPools = (pools: Pool[], firstInputToken: Token): Token => {
  const { inputToken: outputToken } = pools.reduce(
    ({ inputToken }, pool: Pool): { inputToken: Token } => {
      if (!pool.involvesToken(inputToken)) throw new Error('PATH')
      const outputToken: Token = pool.token0.equals(inputToken) ? pool.token1 : pool.token0
      return {
        inputToken: outputToken,
      }
    },
    { inputToken: firstInputToken }
  )
  return outputToken
}
