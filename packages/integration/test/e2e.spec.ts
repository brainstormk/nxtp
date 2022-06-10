import { Logger } from "@connext/nxtp-utils";
import { TransactionService } from "@connext/nxtp-txservice";
import { Wallet } from "ethers";

import { enrollHandlers } from "./helpers/enrollHandlers";

const logger = new Logger({ name: "e2e" });

const wallet = Wallet.fromMnemonic("candy maple cake sugar pudding cream honey rich smooth crumble sweet treat");

const txService = new TransactionService(
  logger,
  {
    "1337": {
      providers: ["http://localhost:8547"],
    },
    "1338": {
      providers: ["http://localhost:8546"],
    },
  },
  wallet,
);

describe("e2e", () => {
  before(async () => {
    await enrollHandlers(
      [
        {
          domain: "1337",
          ConnextHandler: "0x8273e4B8ED6c78e252a9fCa5563Adfcc75C91b2A",
          PromiseRouterUpgradeBeaconProxy: "0xbaAA2a3237035A2c7fA2A33c76B44a8C6Fe18e87",
          RelayerFeeRouterUpgradeBeaconProxy: "0xEcFcaB0A285d3380E488A39B4BB21e777f8A4EaC",
        },
        {
          domain: "1338",
          ConnextHandler: "0x8273e4B8ED6c78e252a9fCa5563Adfcc75C91b2A",
          PromiseRouterUpgradeBeaconProxy: "0xbaAA2a3237035A2c7fA2A33c76B44a8C6Fe18e87",
          RelayerFeeRouterUpgradeBeaconProxy: "0xEcFcaB0A285d3380E488A39B4BB21e777f8A4EaC",
        },
      ],
      txService,
    );
  });

  it.only("sends a simple transfer with fast path", async () => {});
});