import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

export const getRate = async () => {
  const endPoint = process.env.API_PUBLIC_ENDPONT || "";
  const path = "/v1/ticker?symbol=BTC";

  return new Promise<any>((resolve, reject) => {
    axios
      .get(endPoint + path)
      .then(function (response) {
        console.log(response.data);
        // response.dataに実際のデータが入っている
        let result: string = response.data;
        resolve(result);
      })
      .catch(function (error) {
        console.log(error);
        // エラー時に実行
        reject(error);
      });
  });
};

getRate();
