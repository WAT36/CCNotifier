SELECT
  th.brand,
  sum(th.yen_payment) AS yen_payment
FROM
  (
    "tradeHistory" th
    JOIN latest_shop_sell_trade lsst ON ((th.brand = lsst.brand))
  )
WHERE
  (th.id <= lsst.id)
GROUP BY
  th.brand;