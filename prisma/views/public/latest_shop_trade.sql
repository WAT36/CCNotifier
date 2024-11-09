SELECT
  th.id,
  th.brand,
  th.settlement_category,
  th.buysell_category,
  th.yen_payment,
  th.contract_amount,
  th.contract_rate,
  th.contract_payment,
  th.trade_date
FROM
  (
    "tradeHistory" th
    JOIN (
      SELECT
        th2.brand,
        max(th2.trade_date) AS trade_date
      FROM
        "tradeHistory" th2
      WHERE
        (
          th2.settlement_category = '販売所取引' :: text
        )
      GROUP BY
        th2.brand
    ) max_th ON (
      (
        (th.brand = max_th.brand)
        AND (th.trade_date = max_th.trade_date)
      )
    )
  );