// 総利益1000円未満の場合はメッセージを出力しない
export const MIN_GAIN_YEN_SUM = 1000;

// 伸び率10%以上の閾値
export const HIGH_GROWTH_RATE_THRESHOLD = 10;

// パーセンテージ計算用の倍率
export const PERCENTAGE_MULTIPLIER = 100;

// 小数点以下の桁数
export const DECIMAL_PLACES = 2;

// 比較レート計算で使用される倍率
export const COMPARISON_RATE_MULTIPLIER = 2;

// デフォルトの開始日
export const DEFAULT_START_DATE = "1990-01-01";

// デフォルトの終了日
export const DEFAULT_END_DATE = "2100-12-30";

// 除外する銘柄名
export const EXCLUDED_BRAND = "JPY";

// 年の開始日フォーマット
export const YEAR_START_DATE_FORMAT = "01-01";

// 年の終了日フォーマット
export const YEAR_END_DATE_FORMAT = "12-31";

// 月の開始日フォーマット
export const MONTH_START_DAY_FORMAT = "01";

// 資産比較時の許容誤差
export const ASSETS_COMPARISON_TOLERANCE = 1e-8;

// 資産比較時の小数点以下の桁数
export const ASSETS_DECIMAL_PLACES = 8;

// トランザクションの最大待機時間（ミリ秒）
export const TRANSACTION_MAX_WAIT = 10000;

// トランザクションのタイムアウト時間（ミリ秒）
export const TRANSACTION_TIMEOUT = 20000;
