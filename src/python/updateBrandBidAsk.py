import sys
import os
import os.path
from dotenv import load_dotenv
from supabase import create_client, Client
import datetime

def update_brand_bidask(brand,bidask,value):
    # .envファイルの内容を読み込見込む
    dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')
    load_dotenv(dotenv_path)

    # データベースとのコネクション確立
    url: str = os.environ.get("PYTHON_DB_URL")
    key: str = os.environ.get("PYTHON_DB_KEY")
    supabase: Client = create_client(url, key)

    if bidask == 'bid':
        supabase.table("brandBidAsk").upsert({"brand": brand, "bid_price": value, "bid_updated_time": datetime.datetime.now(datetime.timezone.utc).isoformat()}).execute()
    elif bidask == 'ask':
        supabase.table("brandBidAsk").upsert({"brand": brand, "ask_price": value, "ask_updated_time": datetime.datetime.now(datetime.timezone.utc).isoformat()}).execute()
    else:
        print("Error: arg2 is bid or ask. not ({0})".format(bidask))

if __name__ == "__main__": 
    if len(sys.argv) != 4:
        print("Error: Usage: {0} brand bid/ask (value). not ({0})".format(sys.argv))
        sys.exit(1)
    
    brand = sys.argv[1].upper()
    bidAsk = sys.argv[2]
    value = sys.argv[3]

    # 引数チェック
    if (bidAsk != "bid" and bidAsk != "ask"):
        print("Error: bidAsk must be 'bid' or 'ask'. not " + bidAsk)
        sys.exit(1)

    update_brand_bidask(brand,bidAsk,value) 
