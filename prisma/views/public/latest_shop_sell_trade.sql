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
        t_1.brand,
        max(t_1.trade_date) AS trade_date
      FROM
        "tradeHistory" t_1
      WHERE
        (t_1.buysell_category = '売' :: text)
      GROUP BY
        t_1.brand
    ) latest_sell_t ON (
      (
        (th.brand = latest_sell_t.brand)
        AND (th.trade_date = latest_sell_t.trade_date)
      )
    )
  );