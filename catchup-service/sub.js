const redis = require("redis");
const subscriber = redis.createClient();

const sleep = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};
subscriber.on("message", async function(channel, message) {
  //console.log(message);
  await sleep(1000);
  console.log(message);
});
subscriber.subscribe("samplepubsub");
