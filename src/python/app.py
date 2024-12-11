import json
import time
import os
from getShopRate import get_shop_rate
import pings

def handler(event, context):
    p = pings.Ping() # Pingオブジェクト作成
    res = p.ping("google.com")  # googleを監視

    if res.is_reached():
        # 監視対象への接続ができた
        print("ping OK")
    else:
        # 監視対象への接続ができなかった
        print("ping NG")
    
    print(os.getcwd()) #pwd
    print(os.listdir()) #ls
    result = {}
    brands = ['btc']
    for brand in brands:
        brand_result = {}
        for ope in ['bid','ask']:
            start = time.time()
            print('Start!! {0}-{1}'.format(brand,ope))
            price = get_shop_rate(brand,ope)
            print('End...  {0}-{1}'.format(brand,ope))
            end = time.time()
            print('時間:'+end-start)
            brand_result[ope] = price
        result[brand] =  brand_result

    return {
        "statusCode": 200,
        "body": json.dumps(result)
    }