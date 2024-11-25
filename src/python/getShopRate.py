# Selenuim+Firefox
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
import time

# htmlの解析とデータフレームへ
from bs4 import BeautifulSoup
# import re
# import pandas as pd
# import numpy as np

import os
import os.path
from dotenv import load_dotenv
import sys

# 引数チェック
args = sys.argv
if len(args) != 3:
    print("Error: Usage:{0} brand bid/ask".format(args[0]))
    sys.exit(1)

brand = args[1]
bid_ask = args[2]

brand_name_list = ['btc','eth','bch','ltc','xrp','xlm','bat','xtz','qtum','dot','atom','ada','mkr','dai','link','doge','sol','fil','sand','chz']
if brand not in brand_name_list:
    print("Error: brand must be in {0}".format(brand_name_list))
    sys.exit(1)
if bid_ask not in ['bid','ask']:
    print("Error: you must input bid or ask. not {0}".format(bid_ask))
    sys.exit(1)


# .envファイルの内容を読み込見込む
dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')
load_dotenv(dotenv_path)

# Firefox オプションを設定　ウインドウ非表示モード（--headless）
options = Options()
options.add_argument('--headless')
driver = webdriver.Firefox(options=options)

url = os.environ.get('SHOP_URL_PAGE').format(brand)

driver.get(url)
result = None
# 何回か実行して取得する（１回では取れないことがあるため）
for i in range(15):
    time.sleep(1)
    # ページソースを取得
    html = driver.page_source
    
    # 解析し取得
    soup = BeautifulSoup(html, "html.parser")
    tag_list = soup.find_all("p" if bid_ask == 'bid' else 'td', class_="l-brand__rate__information__text jsc-price-{0}".format(bid_ask))
    if len(tag_list)==0:
        # 値を取得できなかった場合は次へ
        continue
    else:
        result = tag_list[0].text.strip().replace(',','')
        if result.isdigit():
            # 値を取得できたらそこで終了
            break
        else:
            continue
else:
    print("")
    result = None

driver.quit()

# 値を返す
sys.stdout.write(result if result is not None else '')