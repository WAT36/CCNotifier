SELECT
  t.brand AS name
FROM
  transaction t
GROUP BY
  t.brand;