import { Token } from '@uniswap/sdk-core';
import { Pool } from '@uniswap/v3-sdk';
/**
 * Simple utility function to get the output of an array of Pools or Pairs
 * @param pools
 * @param firstInputToken
 * @returns the output token of the last pool in the array
 */
export declare const getOutputOfPools: (pools: Pool[], firstInputToken: Token) => Token;
