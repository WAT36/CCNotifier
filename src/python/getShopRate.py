# -*- coding: utf-8 -*-
from selenium import webdriver
import time
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

# htmlの解析とデータフレームへ
from bs4 import BeautifulSoup

import os
import os.path
from dotenv import load_dotenv
import sys

from constant import BRAND_NAME_LIST
import requests

# 文字列が数字かを判定する関数
def is_num(s):
    try:
        if s.isdigit():
            return True
        float(s)
    except ValueError:
        return False
    else:
        return True



def get_shop_rate(brand,bid_ask):
    if brand not in BRAND_NAME_LIST:
        print("Error: brand must be in {0}".format(BRAND_NAME_LIST))
        sys.exit(1)
    if bid_ask not in ['bid','ask']:
        print("Error: you must input bid or ask. not {0}".format(bid_ask))
        sys.exit(1)

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")

    print('a')
    try:
        res = requests.get(os.environ.get('SHOP_URL_PAGE').format(brand), timeout=(180,180))
        print(res.status_code)
        print(len(res.text)) 
        time_elapsed = res.elapsed.total_seconds()
        print('time_elapsed:', time_elapsed)
    except:
        print('Host : NOT reachable (Error)')
    print('b')
    url = os.environ.get('SHOP_URL_PAGE').format(brand)
    print(url)
    print('c')
    driver = webdriver.Chrome(options=chrome_options, service=Service("/usr/bin/chromedriver"))
    print('d')
    # 明示的な待機を追加（必要ならTimeoutを長めに設定）
    driver.implicitly_wait(20)
    print('e')
    for i in range(5):
        try:
            print("({0})fetching from {1}...".format(str(i),url))
            driver.get(url)
        except TimeoutException:
            print("Timeout!! "+str(i))
            continue
        else:
            break
    else:
        print("(last one)fetching from {0}...".format(url))
        driver.get(url)

    print('g')
    result = None
    # 何回か実行して取得する（１回では取れないことがあるため）
    for i in range(5):
        print('h,'+str(i))
        time.sleep(1)
        # ページソースを取得
        html = driver.page_source
        print('i,'+str(i))        
        # 解析し取得
        soup = BeautifulSoup(html, "html.parser")
        tag_list = soup.find_all("p" if bid_ask == 'bid' else 'td', class_="l-brand__rate__information__text jsc-price-{0}".format(bid_ask))
        print('j,'+str(i),tag_list)
        if len(tag_list)==0:
            # 値を取得できなかった場合は次へ
            continue
        else:
            result = tag_list[0].text.strip().replace(',','')
            if is_num(result):
                # 値を取得できたらそこで終了
                break
            else:
                continue
    else:
        print("")
        result = None
    print('k')
    driver.quit()

    # 値を返す
    sys.stdout.write(result if result is not None else '')
    return result

if __name__ == "__main__": 
    # 引数チェック
    args = sys.argv
    if len(args) != 3:
        print("Error: Usage:{0} brand bid/ask".format(args[0]))
        sys.exit(1)

    brand = args[1]
    bid_ask = args[2]

    # .envファイルの内容を読み込見込む
    dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')
    load_dotenv(dotenv_path)

    get_shop_rate(brand,bid_ask)
