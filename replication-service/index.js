const express = require("express");
const { Pool } = require("pg");
const SECRETS = require("./secrets.json");
const asyncRep = require("./asynchronousRep");
require("dotenv").config();
const pools = [];
var leaderId = 0;

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

startHAService = async () => {
  await createReplicaClients();
};

const app = express();
app.use(express.json());
startHAService();

app.post("/applyQuery", async (req, res) => {
  var response = await asyncRep.asynchronousReplication(
    pools,
    req.body.command,
    leaderId
  );
  console.log(response);
  leaderId = response.leaderId;

  res.send(response);
});

app.listen(3000, () => console.log("Listening on port 3000"));
