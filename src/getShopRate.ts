import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

export const getShopRate = async () => {
  const url = process.env.SHOP_URL || '';
  const result = await fetch(url, {
    method: 'GET'
  }).then((response) =>
    response.json().then((data) => ({
      status: response.status,
      body: data
    }))
  );
  return result.body.data;
};

// 引数チェック
if (process.argv[1] === __filename) {
  getShopRate();
}
