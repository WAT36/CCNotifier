SELECT
  th.brand AS name
FROM
  "tradeHistory" th
GROUP BY
  th.brand;