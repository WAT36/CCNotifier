import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "../../.env") });

// 引数チェック
if (process.argv.length !== 3) {
  console.error("Error: Usage: npx ts-node src/postWebhook.ts text");
  process.exit(1);
}

const text = process.argv[2];

export const postWebhook = async (text: string) => {
  const webHookURL = process.env.WEBHOOK_URL || "";
  return await fetch(webHookURL, {
    method: "POST",
    body: JSON.stringify({
      text,
    }),
  });
};

postWebhook(text);
