SELECT
  DISTINCT EXTRACT(
    year
    FROM
      th.trade_date
  ) AS year
FROM
  "tradeHistory" th
ORDER BY
  (
    EXTRACT(
      year
      FROM
        th.trade_date
    )
  );