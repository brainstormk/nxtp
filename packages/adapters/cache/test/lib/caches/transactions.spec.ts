import { Logger, CrossChainTxStatus, expect, mock, getRandomBytes32, mkAddress } from "@connext/nxtp-utils";
import { TransactionsCache } from "../../../src/index";
import { StoreChannel } from "../../../src/lib/entities";

const logger = new Logger({ level: "debug" });
const RedisMock = require("ioredis-mock");
let transactions: TransactionsCache;

const fakeTxs = [
  mock.entity.crossChainTx("3000", "4000"),
  mock.entity.crossChainTx(
    "3000",
    "4000",
    "1000",
    CrossChainTxStatus.Prepared,
    mkAddress("0xaaa"),
    getRandomBytes32(),
    1234,
    mkAddress("0xa"),
  ),
];

describe("TransactionCache", () => {
  before(async () => {
    logger.debug(`Subscribing to Channels for Redis Pub/Sub`);
    const RedisSub = new RedisMock();

    RedisSub.subscribe(StoreChannel.NewHighestNonce);
    RedisSub.subscribe(StoreChannel.NewPreparedTx);
    RedisSub.subscribe(StoreChannel.NewStatus);

    RedisSub.on("message", (chan: any, msg: any) => {
      console.log(`Got Subscribed Message Channel: ${chan as string}, Message Data: ${msg as string}`);
    });

    transactions = new TransactionsCache({ url: "mock", mock: true, logger });
  });

  describe("TransactionsCache", () => {
    describe("#storeStatus", () => {
      it("happy: should return true if `set` returns OK", async () => {
        const res = await transactions.storeStatus(fakeTxs[0].transactionId, CrossChainTxStatus.Prepared);
        expect(res).to.be.eq(true);
      });

      it("should return false if the new status is different from the previous one", async () => {
        await transactions.storeStatus(fakeTxs[0].transactionId, CrossChainTxStatus.Prepared);
        const res = await transactions.storeStatus(fakeTxs[0].transactionId, CrossChainTxStatus.Fulfilled);
        expect(res).to.be.eq(true);
      });

      it("should return false if the new status is same as the previous one", async () => {
        await transactions.storeStatus(fakeTxs[0].transactionId, CrossChainTxStatus.Prepared);
        const res = await transactions.storeStatus(fakeTxs[0].transactionId, CrossChainTxStatus.Prepared);
        expect(res).to.be.eq(false);
      });
    });

    describe("#getStatus", () => {
      it("happy: should get status of transaction by ID", async () => {
        await transactions.storeStatus(fakeTxs[1].transactionId, CrossChainTxStatus.Prepared);
        const status = await transactions.getStatus(fakeTxs[1].transactionId);
        expect(status).to.be.eq(CrossChainTxStatus.Prepared);
      });

      it("should return undefined if no exists", async () => {
        const status = await transactions.getStatus("0x111");
        expect(status).to.be.eq(undefined);
      });
    });

    describe("#getLatestNonce", () => {
      it("should get default nonce if no exists", async () => {
        await transactions.storeTxData([fakeTxs[1]]);
        const latestNonce = await transactions.getLatestNonce("1");
        expect(latestNonce).to.be.equal(0);
      });

      it("should get domain's latest nonce according to the cache", async () => {
        await transactions.storeTxData([fakeTxs[1]]);
        const latestNonce = await transactions.getLatestNonce("3000");
        expect(latestNonce).to.be.equal(fakeTxs[1].nonce);
      });
    });

    describe("#storeTxData", () => {
      it("happy: should store transaction data", async () => {
        const mockCrossChainTx = mock.entity.crossChainTx("100", "200");
        //add fake txid's status, should fire off event.
        await transactions.storeTxData([mockCrossChainTx]);
        let latestNonce = await transactions.getLatestNonce("100");
        expect(latestNonce).to.be.eq(1234);
      });

      it("should update latest nonce", async () => {
        let latestNonce = await transactions.getLatestNonce("100");
        expect(latestNonce).to.be.eq(1234);

        const mockCrossChainTx = mock.entity.crossChainTx(
          "100",
          "200",
          "1000",
          CrossChainTxStatus.Prepared,
          mkAddress("0xaaa"),
          getRandomBytes32(),
          1235,
          mkAddress("0xa"),
        );
        const res = await transactions.storeTxData([mockCrossChainTx]);
        latestNonce = await transactions.getLatestNonce("100");
        expect(latestNonce).to.be.eq(1235);
      });
    });

    describe("#getTxDataByDomainAndTxID", () => {
      it("should return null if no exists", async () => {
        const res = await transactions.getTxDataByDomainAndTxID("101", getRandomBytes32());
        expect(res).to.be.undefined;
      });

      it("happy case: should return data", async () => {
        const transactionId = getRandomBytes32();
        const mockCrossChainTx = mock.entity.crossChainTx(
          "101",
          "201",
          "1000",
          CrossChainTxStatus.Prepared,
          mkAddress("0xaaa"),
          transactionId,
          1234,
          mkAddress("0xa"),
        );
        await transactions.storeTxData([mockCrossChainTx]);

        const res = await transactions.getTxDataByDomainAndTxID("101", transactionId);
        expect(res.transactionId).to.eq(transactionId);
      });
    });

    describe("#getTxDataByDomainAndNonce", () => {
      it("should return null if no exists", async () => {
        const res = await transactions.getTxDataByDomainAndNonce("102", "1234");
        expect(res).to.be.undefined;
      });

      it("happy case: should return data", async () => {
        const transactionId = getRandomBytes32();
        const mockCrossChainTx = mock.entity.crossChainTx(
          "102",
          "202",
          "1000",
          CrossChainTxStatus.Prepared,
          mkAddress("0xaaa"),
          transactionId,
          1234,
          mkAddress("0xa"),
        );
        await transactions.storeTxData([mockCrossChainTx]);

        const res = await transactions.getTxDataByDomainAndNonce("102", "1234");
        expect(res.transactionId).to.eq(transactionId);
      });
    });
  });
});