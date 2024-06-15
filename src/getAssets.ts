import axios from "axios";
import crypto from "crypto";
import * as dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.API_KEY || "";
const secretKey = process.env.API_SECRET_KEY || "";

const timestamp = Date.now().toString();
const method = "GET";
const endPoint = process.env.API_ENDPONT || "";
const path = "/v1/account/assets";

const text = timestamp + method + path;
const sign = crypto.createHmac("sha256", secretKey).update(text).digest("hex");
const options = {
  headers: {
    "API-KEY": apiKey,
    "API-TIMESTAMP": timestamp,
    "API-SIGN": sign,
  },
};

axios
  .get(endPoint + path, options)
  .then(function (response) {
    console.log(response.data);
  })
  .catch(function (error) {
    console.log(error);
  });
