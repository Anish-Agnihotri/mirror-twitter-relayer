const Twit = require("twit");
const axios = require("axios");
const Arweave = require("arweave");
const { PrismaClient } = require("@prisma/client");

// Initialize arweave
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

// Initialize prisma
const prisma = new PrismaClient();

// Initialize dotenv
require("dotenv").config();

// Initialize Twit
const twit = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
});

// Constants
const MIRROR_ADDRESS = "Ky1c1Kkt-jZ9sY1hvLF5nCf6WWdBhIU5Un_BMYh-t3c";
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
  const allMirrorPosts = await arweave.arql(MIRROR_TXIDS); // Collect all Mirror posts from Arweave
  const tweetedMirrorPosts = await prisma.posts.findMany(); // Collect already tweeted posts

  // Filter for only new posts
  const tweetedMirrorPostTXS = tweetedMirrorPosts.map((post) => post.tx);
  const newMirrorPosts = allMirrorPosts.filter(
    (postTX) => !tweetedMirrorPostTXS.includes(postTX)
  );

  // For each new post transaction
  for (const postTX of newMirrorPosts) {
    // Collect post url
    const url = await generateMirrorURL(postTX);
    // Create record in database of transaction
    await prisma.posts.create({
      data: {
        tx: postTX,
        url: url,
        tweeted: false,
      },
    });
  }

  // Collect all untweeted posts in database
  const untweetedPosts = await prisma.posts.findMany({
    where: {
      tweeted: false,
    },
  });
  // Filter untweeted posts for only unique URLs
  const untweetedPostURLS = untweetedPosts.map((post) => post.url);
  const untweetedPostURLSUnique = [...new Set(untweetedPostURLS)];

  // For each untweeted url, tweet and then toggle tweeted attribute
  for (const url of untweetedPostURLSUnique) {
    // Tweet if Mirror post exists at url
    await tweetIfExists(url);

    // Toggle tweeted attribute post tweet
    await prisma.posts.updateMany({
      where: {
        url: url,
      },
      data: {
        tweeted: true,
      },
    });
  }
}

async function generateMirrorURL(txID) {
  // Collect raw transaction data from ID
  const rawTransactionData = await arweave.transactions.getData(txID, {
    decode: true,
    string: true,
  });
  // JSON parse transaction data
  const parsedTransactionData = JSON.parse(rawTransactionData);

  // Collect publication + digest
  const publication = parsedTransactionData.content.publication;
  const digest = parsedTransactionData.originalDigest;

  // Return publication.mirror.xyz/digest format url
  return `https://${publication}.mirror.xyz/${digest}`;
}

async function tweetIfExists(tweetURL) {
  const pageContent = await axios.get(tweetURL); // Collect HTML page content
  const pageExists = !pageContent.data.includes("Page not found"); // Check if page exists

  // If page exists
  if (pageExists) {
    // Prepare tweet content
    const tweetContent = `✍️ New post on @viamirror: ${tweetURL}`;
    // Tweet out URL
    await twit.post("statuses/update", { status: tweetContent });
  }
}

runRelayer();
