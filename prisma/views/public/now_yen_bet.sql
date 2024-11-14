SELECT
  b.name AS brand,
  COALESCE(
    (nr.contract_payment) :: double precision,
    (0) :: double precision
  ) AS yen_bet
FROM
  (
    brand b
    LEFT JOIN (
      SELECT
        after_sell.brand,
        sum(after_sell.contract_payment) AS contract_payment
      FROM
        (
          SELECT
            th.brand,
            th.contract_payment
          FROM
            (
              "tradeHistory" th
              LEFT JOIN latest_shop_sell_trade lst ON ((th.brand = lst.brand))
            )
          WHERE
            (th.trade_date > lst.trade_date)
        ) after_sell
      GROUP BY
        after_sell.brand
    ) nr ON ((b.name = nr.brand))
  );