import { Route as V3RouteSDK, Pool } from '@uniswap/v3-sdk';
import { Protocol } from './protocol';
import { Currency, Price, Token } from '@uniswap/sdk-core';
export interface IRoute<TInput extends Currency, TOutput extends Currency, TPool extends Pool> {
    protocol: Protocol;
    pools: TPool[];
    path: Token[];
    midPrice: Price<TInput, TOutput>;
    input: TInput;
    output: TOutput;
}
export declare class RouteV3<TInput extends Currency, TOutput extends Currency> extends V3RouteSDK<TInput, TOutput> implements IRoute<TInput, TOutput, Pool> {
    readonly protocol: Protocol;
    readonly path: Token[];
    constructor(v3Route: V3RouteSDK<TInput, TOutput>);
}
