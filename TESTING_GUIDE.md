# SCEAP Testing Guide

## Quick Start (Docker)

```bash
cd /workspaces/Cable-Engineering
docker-compose up --build
```

Then open:
- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **Backend Health**: http://localhost:8000/api/v1/health

## Manual Local Setup (No Docker)

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

## Feature Checklist

### ✓ Dashboard
- Summary cards with key metrics
- Tray fill heatmap visualization
- Cable load distribution chart
- Quick access to other modules

**Test Path**: Navigate to Dashboard (default route `/`)

### ✓ Project Setup
- Project information form
- Standards selection (IEC/IS)
- Voltage level configuration

**Test Path**: `/project-setup`

### ✓ Cable Sizing (MVP Feature)
- Input panel with cable parameters
- Calculation engine (FLC, derating, voltage drop, etc.)
- Results table with editable rows
- Multi-select approval actions (Approve, Hold, Hide)
- 3D cable cross-section visualization
- Draggable specification panel
- Column customization with localStorage persistence
- Exports (CSV, JSON, XLSX)

**Test Path**: `/cable-sizing`

**Quick Test**:
1. Fill in cable parameters (Load kW, Voltage, PF, etc.)
2. Click "Calculate"
3. Review results in table
4. Select rows and click "Approve Selected"
5. Toggle columns on/off in the column picker modal
6. Export results (CSV/JSON/XLSX)

### ✓ Cable Routing
- Input form for source/target and cable selection
- Routing algorithm selection (Shortest Path / Least Fill)
- Tray network graph visualization
- Tray fill status bars

**Test Path**: `/cable-routing`

**Quick Test**:
1. Select source and target trays
2. Choose algorithm
3. Click "Calculate Route"
4. View path on graph and tray fills

### ✓ Tray Fill Planning
- Real-time tray fill percentage display
- Color-coded tray utilization
- Statistics (total trays, average fill, critical count)

**Test Path**: `/tray-fill`

### ✓ Raceway Layout
- Raceway segment list with dimensions
- Material and length specifications
- Route assignments

**Test Path**: `/raceway-layout`

### ✓ Drum Estimation
- Cable length and drum size inputs
- Drum capacity calculations
- Weight estimation
- Logistics breakdown

**Test Path**: `/drum-estimation`

### ✓ Termination Manager
- Termination tracking by cable
- Status updates (Pending/Completed/Verified)
- Connection type specification

**Test Path**: `/termination`

### ✓ Reports
- Report list with download capability
- File type indicators (PDF, CSV, Excel)
- Generation timestamps

**Test Path**: `/reports`

## API Testing

### Health Check
```bash
curl http://localhost:8000/api/v1/health | jq .
```

### Cable Sizing (Single)
```bash
curl -X POST http://localhost:8000/api/v1/cable/single \
  -H "Content-Type: application/json" \
  -d '{
    "cable_number": "CB-001",
    "description": "Test Cable",
    "load_kw": 100,
    "load_kva": 120,
    "voltage": 380,
    "pf": 0.95
  }' | jq .
```

### Bulk Calculation
```bash
curl -X POST http://localhost:8000/api/v1/cable/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "cables": [
      {"cable_number": "CB-001", "description": "Test", "load_kw": 100, "load_kva": 120, "voltage": 380, "pf": 0.95},
      {"cable_number": "CB-002", "description": "Test2", "load_kw": 50, "load_kva": 60, "voltage": 380, "pf": 0.95}
    ]
  }' | jq .
```

### Routing Auto
```bash
curl -X POST http://localhost:8000/api/v1/routing/auto \
  -H "Content-Type: application/json" \
  -d '{"source": "Tray-01", "target": "Tray-02", "cable_id": "CB-001"}' | jq .
```

### Get Routing Graph
```bash
curl http://localhost:8000/api/v1/routing/graph | jq .
```

### Get Tray Status
```bash
curl http://localhost:8000/api/v1/routing/trays | jq .
```

### Approval (New)
```bash
curl -X POST http://localhost:8000/api/v1/project/test-proj/cable/cb001/approve \
  -d "status=approved" | jq .
```

## Database

The system uses SQLite by default (`./backend/sceap.db`).

### View Database
```bash
cd backend
sqlite3 sceap.db ".tables"
sqlite3 sceap.db ".schema"
sqlite3 sceap.db "SELECT * FROM project_model LIMIT 5;"
```

### Reset Database
```bash
rm backend/sceap.db
# Restart backend to recreate
```

### Postgres (Optional)
```bash
export DATABASE_URL="postgresql+psycopg2://user:password@localhost:5432/sceap"
python backend/main.py
```

## UI Testing Checklist

- [ ] Sidebar navigation works
- [ ] All module pages load without errors
- [ ] Dark theme applies correctly
- [ ] Cable Sizing input/calculation/results flow works
- [ ] 3D visualization renders cable cross-section
- [ ] Draggable spec panel can be moved
- [ ] Column picker toggles visibility
- [ ] Exports (CSV/JSON/XLSX) generate files
- [ ] Approval actions update UI
- [ ] Routing graph displays correctly
- [ ] TrayFill chart updates in real-time

## Common Issues

### Frontend won't connect to API
- Check if backend is running on port 8000
- Verify `VITE_API_BASE` in `frontend/vite.config.ts`
- In Docker: ensure network connectivity between services

### 3D Cable Visualization not rendering
- Check browser console for WebGL errors
- Three.js libraries may need redownload if package-lock.json is old

### Database connection issues
- SQLite: verify file permissions on `./backend/sceap.db`
- Postgres: check connection string in `DATABASE_URL`

## Build & Deployment

### Production Build (Frontend)
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Production Run (Backend)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Performance Notes

- Frontend bundle is ~1.9 MB (including Three.js). Code-splitting can be enabled for large deployments.
- Backend calculations are synchronous. For high-load scenarios, consider async workers.
- Database queries are not paginated. Add pagination for large result sets.

## Support & Development

- **Backend API Docs**: http://localhost:8000/docs (Swagger UI)
- **Frontend Source**: `./frontend/src/`
- **Backend Source**: `./backend/main.py`
- **Docker Logs**: `docker-compose logs -f [service_name]`
