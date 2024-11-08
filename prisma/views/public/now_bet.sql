SELECT
  b.name AS brand,
  COALESCE(nr.payment, (0) :: double precision) AS bet
FROM
  (
    brand b
    LEFT JOIN (
      SELECT
        t.brand,
        sum(t.payment) AS payment
      FROM
        (
          transaction t
          LEFT JOIN latest_sell_transaction lst ON ((t.brand = lst.brand))
        )
      WHERE
        (t.transaction_date > lst.transaction_date)
      GROUP BY
        t.brand
    ) nr ON ((b.name = nr.brand))
  );