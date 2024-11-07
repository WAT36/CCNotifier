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
        t2.brand,
        max(t2.transaction_date) AS transaction_date
      FROM
        transaction t2
      GROUP BY
        t2.brand
    ) max_t ON (
      (
        (t.brand = max_t.brand)
        AND (t.transaction_date = max_t.transaction_date)
      )
    )
  );