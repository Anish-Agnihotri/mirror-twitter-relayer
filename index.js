const Arweave = require("arweave");
const axios = require("axios");

// Initialize arweave
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

// Constants
const MIRROR_ADDRESS = "Ky1c1Kkt-jZ9sY1hvLF5nCf6WWdBhIU5Un_BMYh-t3c";
const MIRROR_CONTRACT = "0x6e3fcbb6f5c0d206b061a04f92827c780eec58b5";
const MIRROR_TXIDS = {
  op: "and",
  expr1: {
    op: "equals",
    expr1: "from",
    expr2: MIRROR_ADDRESS,
  },
  expr2: {
    op: "equals",
    expr1: "App-Name",
    expr2: "MirrorXYZ",
  },
};

async function runRelayer() {
  //const allMirrorPosts = await arweave.arql(MIRROR_TXIDS);
  const url = await generateMirrorURL(
    "DHMhh2FcD3jdQJiAaEmsxO9vAZ9BC7-jkL9hbfi2R8Y"
  );
  console.log(url);
}

async function generateMirrorURL(txID) {
  const rawTransactionData = await arweave.transactions.getData(txID, {
    decode: true,
    string: true,
  });
  const parsedTransactionData = JSON.parse(rawTransactionData);
  const publication = parsedTransactionData.content.publication;
  const digest = parsedTransactionData.originalDigest;

  return `https://${publication}.mirror.xyz/${digest}`;
}

runRelayer();
