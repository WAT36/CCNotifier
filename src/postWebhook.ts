import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "../.env") });

export const postWebhook = async (text: string) => {
  const webHookURL = process.env.WEBHOOK_URL || "";
  return await fetch(webHookURL, {
    method: "POST",
    body: JSON.stringify({
      text,
    }),
  });
};

// 引数チェック
if (process.argv[1] === __filename && process.argv.length !== 3) {
  console.error("Error: Usage: npx ts-node src/postWebhook.ts text");
  process.exit(1);
} else if (process.argv[1] === __filename) {
  postWebhook(process.argv[2]);
}
