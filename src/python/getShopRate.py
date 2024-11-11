# Selenuim+Firefox
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
import time

# htmlの解析とデータフレームへ
from bs4 import BeautifulSoup

import os
import os.path
from dotenv import load_dotenv

# .envファイルの内容を読み込見込む
dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')
load_dotenv(dotenv_path)

# Firefox オプションを設定　ウインドウ非表示モード（--headless）
options = Options()
options.add_argument('--headless')
driver = webdriver.Firefox(options=options)
# driver = webdriver.Firefox()    # ウインドウを表示させる時

url = os.environ.get('SHOP_URL_PAGE')

driver.get(url)
result = None
# 何回か実行して取得する（１回では取れないことがあるため）
for i in range(10):
    time.sleep(1)
    # ページソースを取得
    html = driver.page_source
    
    # 解析し取得
    soup = BeautifulSoup(html, "html.parser")
    tag_list = soup.find_all("p", class_="l-brand__rate__information__text jsc-price-bid")
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
    print("can not extracted!! try again.")
    result = None

driver.quit()

print(result)