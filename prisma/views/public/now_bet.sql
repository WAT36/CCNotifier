SELECT
  b.name AS brand,
  COALESCE(nr.contract_amount, (0) :: double precision) AS contract_amount,
  COALESCE(nr.givetake_amount, (0) :: double precision) AS givetake_amount,
  COALESCE(nr.now_amount, (0) :: double precision) AS now_amount,
  COALESCE(nr.contract_payment, (0) :: double precision) AS yen_bet
FROM
  (
    brand b
    LEFT JOIN (
      SELECT
        after_sell.brand,
        sum(after_sell.contract_amount) AS contract_amount,
        sum(after_sell.contract_payment) AS contract_payment,
        sum(after_sell.givetake_amount) AS givetake_amount,
        (
          sum(after_sell.contract_amount) + sum(after_sell.givetake_amount)
        ) AS now_amount
      FROM
        (
          SELECT
            th.brand,
            th.contract_amount,
            th.contract_payment,
            CASE
              WHEN (th.givetake_category = '送付' :: text) THEN (
                ('-1' :: integer) :: double precision * th.givetake_amount
              )
              ELSE th.givetake_amount
            END AS givetake_amount
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