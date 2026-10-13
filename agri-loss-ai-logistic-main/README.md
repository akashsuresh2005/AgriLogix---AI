# 🌾 Agri Loss AI Logistic

**AI-Driven Post-Harvest Loss Reduction & Intelligent Supply Chain Logistics System**

---

## 📌 Overview

**Agri Loss AI Logistic** is an end-to-end intelligent platform engineered to mitigate post-harvest produce loss across regional agricultural supply chains. The system predicts spoilage probability, calculates remaining shelf life, projects potential financial loss, matches farmers with regional cold storage facilities, and monitors transit logistics.

The system combines:
- **Gradient Boosting Machine Learning Pipeline** for multi-factor spoilage and shelf-life prediction.
- **Deep Learning Produce Quality Inspection** (MobileNetV2) for image freshness analysis.
- **Dedicated Facility Management** for Karnataka cold storage hubs and capacity tracking.
- **Role-Based Access Control (RBAC)** supporting Farmers, Warehouse Managers, and Administrators.
- **Modern Responsive React Frontend** alongside a robust **FastAPI Backend**.

---

## 🧠 Technologies Used

### Frontend
- **React 18** SPA with **Vite**
- **Tailwind CSS** & **Lucide React**
- **React Router v6** (with Protected & Role-Protected Routes)
- **Leaflet** & **React-Leaflet** (Interactive Logistics Mapping)
- **Axios** (API Client with JWT Bearer Interceptors)

### Backend
- **Python 3.11**
- **FastAPI** (REST API with OpenAPI / Swagger documentation)
- **SQLAlchemy 2.0 ORM** (SQLite with WAL mode locally; PostgreSQL compatible)
- **Pydantic v2** & **Pydantic Settings**
- **Passlib (Bcrypt)** password hashing & **Python-Jose** JWT authentication

### Machine Learning & Data Processing
- **Scikit-Learn** & **XGBoost** (Gradient Boosting Classifier & Regressors)
- **TensorFlow / Keras** (MobileNetV2 produce classifier)
- **NumPy**, **Pandas**, **Pillow**
- **gTTS** (Text-to-Speech Voice Advisory in English & Regional Languages)

---

## 📂 Project Structure

```text
majorproject/
├── backend/
│   ├── main.py                  # FastAPI Application Entry & CORS Setup
│   ├── config.py                # Environment Settings (pydantic-settings)
│   ├── database.py              # SQLAlchemy Engine, SessionLocal, Pragma
│   ├── models.py                # SQLAlchemy Models (User, ColdStorage, Shipment, Prediction)
│   ├── schemas.py               # Pydantic Schemas & Request/Response Models
│   ├── auth.py                  # JWT Token Generation & Role Authorization
│   ├── routers/                 # API Routers (auth, admin, warehouses, farmers, predictions)
│   └── requirements.txt         # Backend Python Dependencies
│
├── frontend/
│   ├── index.html               # React HTML Entry Point
│   ├── package.json             # Frontend Dependencies & Scripts
│   ├── vite.config.js           # Vite Configuration
│   └── src/
│       ├── api/                 # Axios API Service Modules
│       ├── components/          # Reusable UI, Forms, Badges, LogisticsMap, Sidebar, Topbar
│       ├── context/             # AuthContext, NotificationContext, LanguageContext
│       ├── layouts/             # AppLayout, GuestLayout
│       ├── pages/
│       │   ├── admin/           # AdminDashboard, FacilityManagement, UserManagement, SystemHealth
│       │   ├── farmer/          # FarmerDashboard, NewPrediction, MyPredictions, WarehouseFinder
│       │   └── manager/         # ManagerDashboard, WarehouseCapacity, IncomingShipments
│       └── routes/              # AppRoutes, ProtectedRoute, RoleProtectedRoute
│
├── models/
│   └── vegetable_quality_v5_model.keras # Deep Learning Produce Quality Model
├── artifacts_v2.pkl             # Spoilage Prediction ML Pipeline Artifacts
├── .env.example                 # Sanitized Environment Configuration Template
├── requirements.txt             # Project-wide Python Dependencies
└── test_load.py                 # ML Artifact Verification Script
```

---

## 🖥️ Local Installation & Setup

### 1. Prerequisites
- Python 3.11
- Node.js (v18+ recommended) & npm

### 2. Environment Configuration
Copy the template to create your local `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` is configured (defaults to `sqlite:///./postharvest.db` for zero-setup local execution) and set a secure `SECRET_KEY`.

### 3. Backend Setup
Create and activate a Python virtual environment:
```bash
# Windows
python -m venv .venv
.\.venv\Scripts\activate

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

Install backend dependencies:
```bash
pip install -r requirements.txt
```

Start the FastAPI backend:
```bash
uvicorn backend.main:app --reload --port 8000
```
API Documentation will be available at:
- Swagger UI: `http://localhost:8000/api/docs`
- Health Endpoint: `http://localhost:8000/api/health`

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The web application will launch at:
- Application UI: `http://localhost:5173`

To build the frontend for production:
```bash
npm run build
```

---

## 🔐 User Account Provisioning & Roles

The system enforces role-based access control (RBAC) across three application roles:
- **System Administrator:** Global infrastructure telemetry, facility management, and user role administration.
- **Farmer:** Crop spoilage calculation, produce visual quality analysis, transit bookings, and personalized dispatch tracking.
- **Warehouse Manager:** Regional cold storage chamber occupancy and receiving gate inspections.

Initial accounts can be created via the registration portal (`/register`) or provisioned for development using `backend/seed_data.py`. For security, configure passwords and secrets in your local environment.

---

## 🧪 Verification & Automated Tests

To run the automated verification test suite (covering security guards, role authorization, facility capacity updates, ML predictions, and database persistence):
```bash
python scratch/test_verification_suite.py
```

To verify ML artifact unpickling:
```bash
python test_load.py
```

---

## 👥 Contributors

- **Bangalore Institute of Technology** — Department of Computer Science & Engineering
- Akash S Kulkarni
- Brijesh Gowda
- Shubham S M
- Likith G
