import axios from "axios";
import crypto from "crypto";
import * as dotenv from "dotenv";
dotenv.config();

export const getAccessToken = async () => {
  const apiKey = process.env.API_KEY || "";
  const secretKey = process.env.API_SECRET_KEY || "";

  const timestamp = Date.now().toString();
  const method = "POST";
  const endPoint = process.env.API_ENDPONT || "";
  const path = "/v1/ws-auth";
  const reqBody = JSON.stringify({});

  const text = timestamp + method + path + reqBody;
  const sign = crypto
    .createHmac("sha256", secretKey)
    .update(text)
    .digest("hex");
  const options = {
    headers: {
      "API-KEY": apiKey,
      "API-TIMESTAMP": timestamp,
      "API-SIGN": sign,
    },
  };

  return new Promise<string>((resolve, reject) => {
    axios
      .post(endPoint + path, reqBody, options)
      .then(function (response) {
        // response.dataに実際のデータが入っている
        let result: string = response.data.data;
        resolve(result);
      })
      .catch(function (error) {
        // エラー時に実行
        reject(error);
      });
  });
};
