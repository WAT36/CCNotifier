SELECT
  th.brand,
  count(*) AS count
FROM
  "tradeHistory" th
GROUP BY
  th.brand;