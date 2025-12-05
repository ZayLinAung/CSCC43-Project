# 📈 CSCC43 Project — Social Network for Stocks  
*A Full-Stack Database-Backed Stock Portfolio & Social Trading Platform*  

---

## 📌 Overview

This application implements a full social-network–style platform centered around stock portfolios.  
It showcases complete database integration, analytics, caching, and prediction features while fulfilling all CSCC43 project requirements.

The system includes:

- Robust **database design** and SQL-backed functionality  
- **Portfolio & stock list management**  
- **Statistical computations** (variance, covariance, Beta, correlation matrices)  
- **Future stock price prediction** using *Exponential Smoothing*  
- **Redis caching** for expensive analytical and forecasting queries  
- A modern web interface built with **Next.js + Tailwind CSS**  
- Backend services implemented in **FastAPI (Python)**  
- **PostgreSQL** as the primary relational database

The platform integrates both the **five years of historical daily stock data** and **new user-submitted daily stock entries**, combining them into a unified queryable dataset.

---

## 🚀 Features

### 🔐 User Authentication & Accounts
- User registration and login  
- Secure account session handling  
- Each user may manage **multiple portfolios** and **multiple stock lists**

---

## 💼 Portfolio Management

Users can:

- Deposit and withdraw cash  
- Buy and sell shares  
- View unified historical + new stock data  
- Track present market value using the latest available close price  
- Inspect all holdings across the portfolio  

### Portfolio Analytics
All statistics are computed *inside PostgreSQL* for accuracy and performance:

- **Coefficient of Variation (COV)**  
- **Beta coefficient**  
- **Covariance matrix**  
- **Correlation matrix**

These computations can be slow, so we implemented **Redis caching** to dramatically speed up repeated analytical queries.

---

## 📊 Historical Price Visualization
For each stock in a portfolio or stock list:

- Users can view historical **close price charts**  
- Supported custom intervals: *1 week, 1 month, 3 months, 1 year, 5 years*  
- Data is pulled from both historical dataset and newly added entries, merged seamlessly

---

## 🔮 Future Price Prediction (Exponential Smoothing)

The application predicts future stock close prices using:

### ➤ **Holt–Winters Exponential Smoothing**

The prediction engine:

- Fits a time-series model to the historical close price  
- Generates forecasts for a user-selected future window  
- Uses **Redis caching** to avoid repeated recomputation  
- Integrates prediction plots directly into the portfolio UI

While prediction accuracy is not graded in CSCC43, this fulfills the requirement to integrate external data mining/prediction tools.

---

## 🧑‍🤝‍🧑 Social Networking Features

The system includes a full miniature social network:

### Friends
- Send friend requests  
- View incoming and outgoing requests  
- Accept / reject / remove friends  
- 5-minute cooldown for re-sending rejected requests  
- Friend lists are **private** (not visible to others)

### Stock Lists
- Create stock lists (symbol + shares)  
- Set visibility to:
  - **Private**
  - **Shared** with specific friends
  - **Public** for everyone  
- Delete stock lists you own

### Reviews
- Users can leave **one review** per stock list accessible to them  
- Reviews on non-public lists are visible only to the creator and reviewer  
- Reviews on public lists are visible to everyone  
- Review deletion is allowed by either the reviewer or the creator

---

## 🛠️ Tech Stack

### **Frontend**
- **Next.js**
- **React**
- **Tailwind CSS**
- Dynamic visualizations with charts

### **Backend**
- **FastAPI (Python)**
- RESTful service architecture
- Integration with analytical libraries (Pandas, Statsmodels)

### **Database**
- **PostgreSQL**
- SQL schema-based design  
- heavy use of aggregations, window functions, analytic queries

### **Caching**
- **Redis**  
- Used to cache:
  - Statistical computations  
  - Prediction outputs  
  - Heavy analytical queries

### **Prediction**
- **Holt–Winters Exponential Smoothing**  
- Provided through `statsmodels`  
- Stored and served efficiently via Redis

---
