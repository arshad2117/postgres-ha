const { Pool } = require("pg");
const redis = require("redis");
require("dotenv").config();

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  retry_strategy: () => 1000
});
const util = require("util");

const pools = [];
createReplicaClients = () => {
  for (let i = 0; i < process.env.REPLICA_COUNT; i++) {
    let hostname = "PGHOST" + (i + 1);
    let portnum = "PGPORT" + (i + 1);
    const pool = new Pool({
      user: process.env.PGUSER,
      host: process.env[hostname] || "localhost",
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
      port: process.env[portnum]
    });
    pools.push(pool);
  }
};

const sleep = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

startHAService = async () => {
  await createReplicaClients();
};

commitRequest = async (id, command) => {
  while (true) {
    try {
      await pools[id].query(command);
      console.log("Replication from log successful");
      return;
    } catch (err) {
      console.log(err);
      console.log("Replication failed trying again");
      await sleep(500);
    }
  }
};

const brpoppr = util.promisify(client.brpop).bind(client);

startCatchUpService = async () => {
  while (true) {
    let res = await brpoppr([`log0`, `log1`, `log2`, 0]);
    console.log("HERE");
    console.log(parseInt(res[0][3]));
    await commitRequest(parseInt(res[0][3]), res[1]);
  }
};

startHAService();
startCatchUpService();
