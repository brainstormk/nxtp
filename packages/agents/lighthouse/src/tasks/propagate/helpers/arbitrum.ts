import { createLoggingContext, NxtpError, RequestContext } from "@connext/nxtp-utils";
import { BigNumber, constants, utils } from "ethers";

import { getContext } from "../propagate";
import { NoSpokeConnector, NoHubConnector, NoProviderForDomain } from "../errors";
import { ExtraPropagateParam } from "../operations/propagate";
import {
  getJsonRpcProvider,
  getL1ToL2MessageGasEstimator,
  getBaseFee,
  getInterface,
  getBestProvider,
} from "../../../mockable";

// example at https://github.com/OffchainLabs/arbitrum-tutorials/blob/master/packages/greeter/scripts/exec.js
export const getPropagateParams = async (
  l2domain: string,
  l2ChainId: number,
  l1ChainId: number,
  _requestContext: RequestContext,
): Promise<ExtraPropagateParam> => {
  const {
    config,
    logger,
    adapters: { chainreader, deployments },
  } = getContext();
  const { methodContext, requestContext } = createLoggingContext(getPropagateParams.name, _requestContext);
  logger.info("Getting propagate params for Arbitrum", requestContext, methodContext, { l2domain });
  const l2RpcUrl = await getBestProvider(config.chains[l2domain]?.providers ?? []);

  if (!l2RpcUrl) {
    throw new NoProviderForDomain(l2domain, requestContext, methodContext);
  }

  // must be ETH mainnet for arbitrum SDK
  const l1RpcUrl = await getBestProvider(config.chains[config.hubDomain]?.providers ?? []);
  if (!l1RpcUrl) {
    throw new NoProviderForDomain(config.hubDomain, requestContext, methodContext);
  }
  let submissionPriceWei;
  let maxGas;
  let gasPriceBid;
  let callValue;

  const l2SpokeConnector = deployments.spokeConnector(
    l2ChainId,
    "Arbitrum",
    config.environment === "staging" ? "Staging" : "",
  );
  if (!l2SpokeConnector) {
    throw new NoSpokeConnector(l2ChainId, requestContext, methodContext);
  }

  const l1HubConnector = deployments.hubConnector(
    l1ChainId,
    "Arbitrum",
    config.environment === "staging" ? "Staging" : "",
  );
  if (!l1HubConnector) {
    throw new NoHubConnector(l1ChainId, requestContext, methodContext);
  }

  try {
    const l2Provider = getJsonRpcProvider(l2RpcUrl);
    const l1ToL2MessageGasEstimate = getL1ToL2MessageGasEstimator(l2Provider);

    // example encoded payload: 0x4ff746f6000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000207465737400000000000000000000000000000000000000000000000000000000
    // length = 200 not including 0x = 100 bytes
    // TODO: verify this is the correct payload to use
    const l1Provider = getJsonRpcProvider(l1RpcUrl);

    gasPriceBid = await chainreader.getGasPrice(+l2domain, requestContext);
    logger.info(`Got current gas price bid: ${gasPriceBid.toString()}`, requestContext, methodContext, {
      gasPriceBid: gasPriceBid.toString(),
    });

    const baseFee = await getBaseFee(l1Provider);
    const spokeConnectorIface = getInterface(l2SpokeConnector.abi as any[]);
    const callData = spokeConnectorIface.encodeFunctionData("processMessage", [
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    ]);
    const L1ToL2MessageGasParams = await l1ToL2MessageGasEstimate.estimateAll(
      l1HubConnector.address,
      l2SpokeConnector.address,
      callData,
      constants.Zero,
      baseFee,
      l2SpokeConnector.address,
      l2SpokeConnector.address,
      l1Provider,
    );
    // multiply gasLimit by 15 to be successful in auto-redeem
    const gasLimitForAutoRedeem = L1ToL2MessageGasParams.gasLimit.mul(15);

    submissionPriceWei = L1ToL2MessageGasParams.maxSubmissionFee.mul(10).toString();
    maxGas = gasLimitForAutoRedeem.toString();
    callValue = BigNumber.from(submissionPriceWei).add(gasPriceBid.mul(maxGas)).toString();

    logger.info(`Got message gas params`, requestContext, methodContext, {
      maxFeePerGas: L1ToL2MessageGasParams.maxFeePerGas.toString(),
      maxSubmissionCost: L1ToL2MessageGasParams.maxSubmissionFee.toString(),
      gasLimit: L1ToL2MessageGasParams.gasLimit.toString(),
      gasLimitForAutoRedeem: gasLimitForAutoRedeem.toString(),
      submissionPriceWei: submissionPriceWei.toString(),
      maxGas: maxGas.toString(),
      gasPriceBid: gasPriceBid.toString(),
      callValue: callValue.toString(),
    });
  } catch (err: unknown) {
    console.log(err);
    logger.error("Error getting propagate params for Arbitrum", requestContext, methodContext, err as NxtpError);
    submissionPriceWei = "0";
    maxGas = "0";
    gasPriceBid = "0";
    callValue = "0";
  }

  const encodedData = utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "uint256"],
    [submissionPriceWei, maxGas, gasPriceBid],
  );

  return { _connector: "", _fee: callValue, _encodedData: encodedData };
};
