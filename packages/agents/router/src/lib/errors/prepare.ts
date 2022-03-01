import { NxtpError } from "@connext/nxtp-utils";

export class ParamsInvalid extends NxtpError {
  cancellable = true;
  constructor(context: any = {}) {
    super(`Params invalid`, context, "ParamsInvalid");
  }
}

export class OriginDomainDataInvalid extends NxtpError {
  cancellable = true;
  constructor(context: any = {}) {
    super(`Invalid data on origin domain`, context, "OriginDomainDataInvalid");
  }
}

export class ExpiryInvalid extends NxtpError {
  cancellable = true;
  constructor(expiry: number, context: any = {}) {
    super(`Expiry ${expiry} invalid`, context, "ExpiryInvalid");
  }
}

export class BidExpiryInvalid extends NxtpError {
  cancellable = true;
  constructor(expiry: number, current: number, context: any = {}) {
    super(`Bid expiry ${expiry} invalid, current: ${current}`, context, "BidExpiryInvalid");
  }
}

export class AmountInvalid extends NxtpError {
  cancellable = true;
  constructor(amount: string, context: any = {}) {
    super(`Amount (${amount}) is invalid`, context, "AmountInvalid");
  }
}

export class NotEnoughLiquidity extends NxtpError {
  cancellable = true;
  constructor(chainId: number, assetId: string, balance: string, amountRequested: string, context: any = {}) {
    super(
      "Not enough liquidity for bid.",
      { ...context, chainId, assetId, balance, amountRequested },
      "NotEnoughLiquidity",
    );
  }
}

export class NotEnoughAmount extends NxtpError {
  cancellable = true;
  constructor(context: any = {}) {
    super(`Not enough amount for swap`, context, "NotEnoughAmount");
  }
}