-- Populate sample budget data for 2026
-- Setting monthly targets for first 3 months of 2026 for all sites

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 1, 2026, '8000.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 2, 2026, '8500.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 3, 2026, '9000.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 4, 2026, '9500.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 5, 2026, '10000.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 6, 2026, '10500.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 7, 2026, '11000.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 8, 2026, '11500.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 9, 2026, '12000.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 10, 2026, '12500.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 11, 2026, '13000.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);

INSERT INTO budgets (siteId, month, year, budgetAmount) 
SELECT id, 12, 2026, '13500.00' FROM sites WHERE id <= 10
ON DUPLICATE KEY UPDATE budgetAmount = VALUES(budgetAmount);
