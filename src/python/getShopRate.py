# Selenuim+Firefox
# from selenium import webdriver
# from selenium.webdriver.firefox.options import Options
from selenium import webdriver
#from webdriver_manager.chrome import ChromeDriverManager
#import chromedriver_binary
import time
from tempfile import mkdtemp
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

    # # Firefox オプションを設定　ウインドウ非表示モード（--headless）
    # if not os.path.exists("/tmp/profile"):
    #     os.makedirs("/tmp/profile")

    # options = Options()
    # options.set_preference("pdfjs.disabled", True)
    # options.set_preference("browser.download.folderList", 2)
    # options.set_preference("browser.download.manager.useWindow", False)

    # if not os.path.exists("/tmp/portal_downloads"):
    #     os.makedirs("/tmp/portal_downloads")
    # options.set_preference("browser.download.dir", os.path.abspath("/tmp/portal_downloads"))
    # options.set_preference("browser.helperApps.neverAsk.saveToDisk","application/pdf, application/force-download")
    # options.add_argument("--headless")
    # options.add_argument('--disable-gpu')
    # options.add_argument("--profile /tmp/profile")
    # options = Options()
    # options.timeouts = { 'script': 5000,'pageLoad': 5000,'implicit': 5000 }
    # options.add_argument('--headless')
    # driver = webdriver.Firefox(options=options)

    #service = Service(ChromeDriverManager().install())
    options = Options()
    service = Service("/opt/chromedriver")
    options.binary_location = "/opt/chrome/chrome"
    options.add_argument("start-maximized")
    options.add_argument("enable-automation")
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-infobars")
    options.add_argument('--disable-extensions')
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1280x1696")
    options.add_argument("--single-process")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-dev-tools")
    options.add_argument("--dns-prefetch-disable")
    options.add_argument('--ignore-certificate-errors')
    options.add_argument('--ignore-ssl-errors')
    options.add_argument("--no-zygote")
    options.add_argument("--enable-logging")
    options.add_argument("--log-level=0")
    options.add_argument("–blink-settings=imagesEnabled=false")
    options.add_argument(f"--user-data-dir={mkdtemp()}")
    options.add_argument(f"--data-path={mkdtemp()}")
    options.add_argument(f"--disk-cache-dir={mkdtemp()}")
    options.add_argument("--remote-debugging-port=9222")
    options.add_argument("--disable-browser-side-navigation")
    options.add_argument('--disable-blink-features=AutomationControlled')
    prefs = {"profile.default_content_setting_values.notifications" : 2}
    options.add_experimental_option("prefs",prefs)

    print('a')
    try:
        res = requests.get(os.environ.get('SHOP_URL_PAGE').format(brand), timeout=(180,180))
        print(res.status_code)
        print(len(res.text)) 
        time_elapsed = res.elapsed.total_seconds()
        print('time_elapsed:', time_elapsed)
    except:
        print(f'Host : NOT reachable (Error)')
    #print("MOZ_HEADLESS:"+os.environ.get('MOZ_HEADLESS'))
    print('b')
    url = os.environ.get('SHOP_URL_PAGE').format(brand)
    print(url)
    print('c')
    print('d')
    print('e')
    # driver = webdriver.Chrome(service=service, options=options)
    driver = webdriver.Chrome(options=options, service=service)
    print('f')
    # 明示的な待機を追加（必要ならTimeoutを長めに設定）
    driver.implicitly_wait(20)

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
