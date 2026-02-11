import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

export type TradeTickerData = {
  ask: string,
  bid: string,
  high: string,
  last: string,
  low: string,
  symbol: string,
  timestamp: string,
  volume: string
}

export const getTradeTicker = async () => {
  const endPoint = process.env.API_PUBLIC_ENDPONT || '';
  const path = '/v1/ticker';

  return await new Promise<TradeTickerData[]>((resolve, reject) => {
    axios
      .get(endPoint + path)
      .then(function (response) {
        // response.dataに実際のデータが入っている
        let result: TradeTickerData[] = response.data;
        console.log(result);
        resolve(result);
      })
      .catch(function (error) {
        console.log(error);
        // エラー時に実行
        reject(error);
      });
  });
};

getTradeTicker();
