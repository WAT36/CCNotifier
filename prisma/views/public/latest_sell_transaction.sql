SELECT
  t.id,
  t.brand,
  t.buysell,
  t.amount,
  t.rate,
  t.payment,
  t.transaction_date
FROM
  (
    transaction t
    JOIN (
      SELECT
        t_1.brand,
        max(t_1.transaction_date) AS transaction_date
      FROM
        transaction t_1
      WHERE
        (t_1.buysell = '売' :: text)
      GROUP BY
        t_1.brand
    ) latest_sell_t ON (
      (
        (t.brand = latest_sell_t.brand)
        AND (
          t.transaction_date = latest_sell_t.transaction_date
        )
      )
    )
  );