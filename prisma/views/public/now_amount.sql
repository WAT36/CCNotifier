SELECT
  tr.brand,
  sum(tr.contract_amount) AS contract_amount,
  sum(tr.givetake_amount) AS givetake_amount,
  (
    sum(tr.contract_amount) + sum(tr.givetake_amount)
  ) AS now_amount
FROM
  (
    SELECT
      th.brand,
      CASE
        th.buysell_category
        WHEN '売' :: text THEN (('-1' :: integer) :: numeric * th.contract_amount)
        ELSE th.contract_amount
      END AS contract_amount,
      CASE
        th.givetake_category
        WHEN '送付' :: text THEN (('-1' :: integer) :: numeric * th.givetake_amount)
        ELSE th.givetake_amount
      END AS givetake_amount
    FROM
      "tradeHistory" th
  ) tr
GROUP BY
  tr.brand;