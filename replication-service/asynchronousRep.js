const redis = require("redis");
require("dotenv").config();
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  retry_strategy: () => 1000
});

convertToQuery = command => {
  if (command.type == "GET") {
    return "SELECT VALUE FROM PGHA WHERE KEY='" + `${command.key}` + "'";
  } else {
    return (
      "INSERT INTO PGHA VALUES('" +
      `${command.key}', ${command.value}) ON CONFLICT (KEY) DO UPDATE SET VALUE=${command.value}`
    );
  }
};

pushToLog = (id, command) => {
  console.log(id);
  var lognum = `log${id}`;
  client.lpush([lognum, command], (err, reply) => {
    console.log(`PUSHED TO LOG ${lognum}`);
    console.log(reply);
  });
};

asynchronousReplication = async (pools, cmd, leaderId) => {
  // GET REQUEST
  if (cmd.type == "GET") {
    try {
      let res = await pools[leaderId].query(convertToQuery(cmd));
      return { leaderId: leaderId, success: true, result: res };
    } catch (err) {
      console.log(convertToQuery(cmd));
      console.log(leaderId);
      console.log(err);
      console.log(`OPERATION WITH LEADER WITH ID ${leaderId} UNSUCCESSFUL`);
      leaderId = (leaderId + 1) % 3;
      return await asynchronousReplication(pools, cmd, leaderId);
    }
  } else {
    // SET REQUEST
    const command = convertToQuery(cmd);
    console.log(command);
    console.log(leaderId);
    let done = 0,
      res = {};
    try {
      res = await pools[leaderId].query(command);
      done = 1;
    } catch (err) {
      console.log(`REPLICATION ON LEADER WITH ID ${leaderId} failed`);
      console.log(`RETRYING REQUEST WITH LEADER AS ${(leaderId + 1) % 3}`);
      leaderId = (leaderId + 1) % 3;
      return await asynchronousReplication(pools, cmd, leaderId);
    }
    if (done == 1) {
      for (let i = 0; i < pools.length; i++) {
        var c = i;
        if (c != leaderId) {
          pushToLog(c, command);
        }
      }
      console.log(`OPERATION WITH LEADER ${leaderId} Successful`);
      console.log(leaderId);
      return { leaderId: leaderId, success: true, result: res };
    }
  }
};

exports.asynchronousReplication = asynchronousReplication;
