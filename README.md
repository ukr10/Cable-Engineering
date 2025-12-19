# Smart Cable Engineering Automation Platform (SCEAP)

A full-stack web application for automating cable engineering workflows in power plants, replacing manual Excel-based processes with AI-assisted calculations, routing intelligence, and real-time reporting.

## 🚀 Features

### Current Implementation
- **Dashboard**: Executive summary with KPIs, tray fill heatmaps, and notifications
- **Cable Sizing Module**: Complete cable sizing calculations with IEC/IS standards
	- Import templates and catalog templates (XLSX) for consistent uploads
	- Results include detailed formula metadata and an optional formulas row in exports
- **Project Setup**: Project configuration and data import wizard
- **Responsive UI**: Modern dark theme with real-time calculations

### Planned Features
- Cable routing with graph optimization
- Tray/ductbank/conduit fill automation
- Raceway layout 2D/3D visualization
- Termination and interconnection management
- Drum estimation and material planning
- Multi-format report generation and export

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Git

## 🛠️ Installation

### 1. Clone and Navigate
```bash
cd /workspaces/Cable-Engineering
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
cd ..
```

## 🎯 Running the Application

### Frontend (Development)
```bash
cd frontend
npm run dev
```
Visit: http://localhost:3000

### Backend (Development)
```bash
cd backend
python -m uvicorn main:app --reload
```
API: http://localhost:8000
Docs: http://localhost:8000/docs

## 📂 Project Structure

```
├── frontend/                 # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── App.tsx          # Main router
│   │   └── index.css        # Global styles
│   └── package.json
│
├── backend/                  # FastAPI + Python
│   ├── main.py              # Main API
│   └── requirements.txt
│
└── README.md
```

## 🔌 API Endpoints

- `POST /api/v1/cable/single` - Calculate single cable
- `POST /api/v1/cable/bulk` - Calculate multiple cables
- `GET /api/v1/standards` - Get standards info
- `GET /api/v1/health` - Health check

## 🎨 Tech Stack

**Frontend**: React 18 + TypeScript + TailwindCSS + Vite
**Backend**: FastAPI + Python + Pydantic
**Charts**: Recharts
**Icons**: Lucide React

## 📖 Status

🟢 MVP Phase - Core modules functional and ready for testing
