import {
  CrossChainTx,
  getChainIdFromDomain,
  RequestContext,
  FulfilledTransaction,
  createLoggingContext,
} from "@connext/nxtp-utils";
import { getTransactionManagerAddress, getTxManagerInerface } from ".";
import { getContext } from "../../router";
import { constants } from "ethers";

import { SanitationCheckFailed } from "../errors";

export const sanitationCheck = async (
  transactionData: CrossChainTx,
  functionCall: "prepare" | "fulfill" | "reconcile",
  _requestContext?: RequestContext<string>,
) => {
  const {
    adapters: { txservice },
  } = getContext();
  const { requestContext, methodContext } = createLoggingContext(sanitationCheck.name);

  if (functionCall === "fulfill") {
    // Check out if this transaction provides fast liquidity
    // TransactionManager.sol:  bool _isFast = reconciledTransactions[_transactionId] == bytes32(0);
    const transactionId = transactionData.transactionId;
    const chainId = await getChainIdFromDomain(transactionData.destinationDomain);
    const txManagerContractAddress = getTransactionManagerAddress(chainId);
    const encodeReconciledTransaction = getTxManagerInerface().encodeFunctionData("reconciledTransactions", [
      transactionId,
    ]);
    const reconciledTxHash = await txservice.readTx({
      chainId,
      to: txManagerContractAddress,
      data: encodeReconciledTransaction,
    });

    const isFast = reconciledTxHash == constants.HashZero;

    // If the transaction provides fast liquidity, ensure it has not been fulfilled already
    // If not, check the reconciled transactions to ensur it is the right data
    if (isFast) {
      const encodeRoutedTransaction = getTxManagerInerface().encodeFunctionData("routedTransactions", [transactionId]);
      const fulfilledTxEncoded = await txservice.readTx({
        chainId,
        to: txManagerContractAddress,
        data: encodeRoutedTransaction,
      });
      const [fulfillTx] = getTxManagerInerface().decodeFunctionResult("routedTransactions", fulfilledTxEncoded);
      const fulfillTxTyped = fulfillTx as FulfilledTransaction;
      if (fulfillTxTyped.router != constants.AddressZero) {
        throw new SanitationCheckFailed("fulfill", transactionId, chainId, { requestContext, methodContext });
      }
    } else {
    }
  } else if (functionCall == "reconcile") {
    // This function is called by the bridge router to pass through the information provided by the user on prepare.
  }
};

/**
 * Returns transacting asset address on destination domain corresponding to transacting asset on origin domain
 *
 * @param originDomain The domain for sending chain
 * @param originTransactingAsset The asset the caller sent with the transaction
 * @param destinationDomain The domain for receiving chain
 * @returns
 */
export const getDestinationTransactingAsset = async (
  originDomain: string,
  originTransactingAsset: string,
  destinationDomain: string,
): Promise<string> => {
  // TODO: Not implemented yet
  return originTransactingAsset;
};

/**
 * Returns local asset address on destination domain corresponding to local asset on origin domain
 *
 * @param originDomain
 * @param originLocalAsset The asset sent over the bridge
 * @param destinationDomain
 * @returns
 */
export const getDestinationLocalAsset = async (
  originDomain: string,
  originLocalAsset: string,
  destinationDomain: string,
): Promise<string> => {
  // TODO: Not implemented yet
  return originLocalAsset;
};

/**
 * Returns input amount to get `amountOut` in `outputAsset` on `domain` through stable swap
 *
 * @param amountOut The output amount to get
 * @param domain The domain that we're getting tokens on
 * @param outputAsset The output asset address
 * @param inputAsset The input asset address
 */
export const getAmountIn = async (
  amountOut: string,
  domain: string,
  outputAsset: string,
  inputAsset: string,
): Promise<string> => {
  // TODO: moved to utils after everything done correctly
  return amountOut;
};

/**
 * Returns output amount in `outputAsset` to get by swapping `amountIn` input asset through stable swap
 *
 * @param amountIn The input amount to swap
 * @param domain The domain that we're getting tokens on
 * @param outputAsset The output asset address
 * @param inputAsset The input asset address
 * @returns
 */
export const getAmountOut = async (
  amountIn: string,
  domain: string,
  outputAsset: string,
  inputAsset: string,
): Promise<string> => {
  // TODO: moved to utils after everything done correctly
  return amountIn;
};