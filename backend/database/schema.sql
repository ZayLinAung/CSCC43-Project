-- ==============================
--  ENUM TYPES
-- ==============================
-- CREATE TYPE transaction_type AS ENUM (
--     'cash_deposit',
--     'cash_withdraw',
--     'stock_buy',
--     'stock_sell'
-- );

-- ==============================
--  PORTFOLIO TABLE
-- ==============================

CREATE TABLE IF NOT EXISTS portfolio (
    portfolio_id SERIAL PRIMARY KEY,    
    cash REAL DEFAULT 0             
);


-- ==============================
--  TRANSACTION TABLE
-- ==============================

CREATE TABLE IF NOT EXISTS transaction (
    transaction_id SERIAL PRIMARY KEY,         
    amount REAL DEFAULT 0,                     
    type transaction_type NOT NULL,                 
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),   
    portfolio_id INT NOT NULL,                      
    username VARCHAR,
    stock_symbol VARCHAR DEFAULT NULL,
    shares INT DEFAULT NULL,                                   

    FOREIGN KEY (portfolio_id)
        REFERENCES portfolio (portfolio_id)
        ON DELETE CASCADE,                         
    FOREIGN KEY (username)
        REFERENCES users (username)
        ON DELETE SET NULL                          
);


-- ==============================
--  PORTFOLIO_STOCK TABLE
-- ==============================

CREATE TABLE IF NOT EXISTS portfolio_holdings (
    portfolio_id INT NOT NULL,                     
    stock_symbol VARCHAR(10) NOT NULL,              
    shares INT DEFAULT 0 CHECK (shares >= 0),       

    PRIMARY KEY (portfolio_id, stock_symbol),      

    FOREIGN KEY (portfolio_id)
        REFERENCES portfolio (portfolio_id)
        ON DELETE CASCADE                      
);

CREATE TABLE IF NOT EXISTS portfolio_owned (
    portfolio_id INT NOT NULL PRIMARY KEY,
    username VARCHAR,
    FOREIGN KEY(portfolio_id)
        REFERENCES portfolio(portfolio_id)
        ON DELETE CASCADE,
    FOREIGN KEY(username)
        REFERENCES users(username)
        ON DELETE CASCADE
);