SELECT
  r.brand,
  r.bid_price,
  r.ask_price,
  r.created_time
FROM
  "priceRateHistory" r
WHERE
  (
    r.created_time = (
      SELECT
        max(r2.created_time) AS max
      FROM
        "priceRateHistory" r2
      WHERE
        ((r2.brand) :: text = (r.brand) :: text)
    )
  );