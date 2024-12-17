const entrypoint = require("./dist/entrypoint");
export const handler = async (event, context) => {
  console.log("## incoming event", event);
  await entrypoint();
};
