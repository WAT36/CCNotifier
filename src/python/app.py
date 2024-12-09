import json
from getShopRate import get_shop_rate

def handler(event, context):
    result = {}
    brands = ['btc']
    for brand in brands:
        brand_result = {}
        for ope in ['bid','ask']:
            price = get_shop_rate(brand,ope)
            brand_result[ope] = price
        result[brand] =  brand_result

    return {
        "statusCode": 200,
        "body": json.dumps(result)
    }