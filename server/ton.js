const { TonClient, WalletContractV4, internal } = require("@ton/ton");
const { mnemonicToPrivateKey } = require("@ton/crypto");
const { Address, toNano } = require("@ton/core");
require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY;
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;

if (!SECRET_KEY || !TONCENTER_API_KEY) {
  throw new Error("❌ SECRET_KEY или TONCENTER_API_KEY не найдены в .env");
}

async function sendTonReward(toAddress, amountTon, comment = "Поздравляем!") {
  const client = new TonClient({
    endpoint: `https://toncenter.com/api/v2/jsonRPC?api_key=${TONCENTER_API_KEY}`
  });

  const keyPair = await mnemonicToPrivateKey(SECRET_KEY.split(" "));

  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey
  });
  const walletContract = client.open(wallet);

  const seqno = await walletContract.getSeqno();

  const msg = internal({
    to: Address.parse(toAddress),
    value: toNano(amountTon.toString()),
    body: comment
  });

  console.log("🚀 Отправляем", amountTon, "TON на", toAddress);

  await walletContract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [msg],
    sendMode: 3
  });
}

module.exports = { sendTonReward };
