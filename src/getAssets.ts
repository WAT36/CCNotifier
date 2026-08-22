import axios from 'axios';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

export const getAssets = async () => {
  const apiKey = process.env.API_KEY || '';
  const secretKey = process.env.API_SECRET_KEY || '';

  const timestamp = Date.now().toString();
  const method = 'GET';
  const endPoint = process.env.API_ENDPONT || '';
  const path = '/v1/account/assets';

  const text = timestamp + method + path;
  const sign = crypto.createHmac('sha256', secretKey).update(text).digest('hex');
  const options = {
    headers: {
      'API-KEY': apiKey,
      'API-TIMESTAMP': timestamp,
      'API-SIGN': sign
    }
  };

  return await new Promise<any>((resolve, reject) => {
    axios
      .get(endPoint + path, options)
      .then(function (response) {
        //console.log(response.data);
        // response.dataに実際のデータが入っている
        const result = response.data;
        // APIはエラー時もHTTP200で { status, messages } を返すため明示的にチェックする
        if (result?.status !== 0) {
          const messages = (result?.messages ?? [])
            .map((m: { message_code?: string; message_string?: string }) => `${m.message_code}: ${m.message_string}`)
            .join(', ');
          reject(new Error(`getAssets API error (status: ${result?.status}): ${messages}`));
          return;
        }
        resolve(result);
      })
      .catch(function (error) {
        console.log(error);
        // エラー時に実行
        reject(error);
      });
  });
};

if (require.main === module) {
  getAssets();
}
