# Selenuim+Firefox
# from selenium import webdriver
# from selenium.webdriver.firefox.options import Options
from selenium import webdriver
#from webdriver_manager.chrome import ChromeDriverManager
#import chromedriver_binary
import time
from tempfile import mkdtemp

# htmlの解析とデータフレームへ
from bs4 import BeautifulSoup

import os
import os.path
from dotenv import load_dotenv
import sys

from constant import BRAND_NAME_LIST
import ping3

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
    options = webdriver.ChromeOptions()
    service = webdriver.ChromeService("/opt/chromedriver")
    options.binary_location = "/opt/chrome/chrome"
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1280x1696")
    options.add_argument("--single-process")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-dev-tools")
    options.add_argument("--no-zygote")
    options.add_argument(f"--user-data-dir={mkdtemp()}")
    options.add_argument(f"--data-path={mkdtemp()}")
    options.add_argument(f"--disk-cache-dir={mkdtemp()}")
    options.add_argument("--remote-debugging-port=9222")

    print('a')
    try:
        res = ping3.ping("example.com",timeout=180000,unit='ms') 
    except ping3.errors.Timeout:
        print(f'Host : NOT reachable (Timeout)')
    except ping3.errors.TimeToLiveExpired:
        print(f'Host : NOT reachable (TTL)')
    except ping3.errors.PingError:
        print(f'Host : NOT reachable (Error)')
    else:
        print(f'Host : is reachable     :{res}(ms)')
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
