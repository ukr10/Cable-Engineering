# Quick Start Guide - Cable Engineering Platform

## Prerequisites
- Node.js 16+ and npm 8+
- Python 3.9+
- Git

## Installation (5 minutes)

### 1. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
pip install -r requirements.txt
```

### 2. Start Development Servers

**Terminal 1 - Frontend**:
```bash
cd frontend
npm run dev
# Opens http://localhost:5173
```

**Terminal 2 - Backend**:
```bash
cd backend
python -m uvicorn main:app --reload
# API available at http://localhost:8000
```

## Quick Navigation

| Module | URL | Purpose |
|--------|-----|---------|
| Dashboard | `/` | Executive overview & KPIs |
| Cable Sizing | `/sizing` | IEC-compliant cable calculations |
| Project Setup | `/setup` | Project initialization |
| Cable Routing | `/routing` | Optimal cable path planning |
| Tray Fill | `/tray-fill` | Capacity monitoring |
| Drum Estimation | `/drums` | Spool planning |
| Raceway Layout | `/raceway` | Visualization placeholder |
| Termination | `/termination` | Connection schedule |
| Reports | `/reports` | Export & reporting |

## Testing the Features

### 1. Cable Sizing Workflow
1. Navigate to **Cable Sizing**
2. Click **Upload Excel File**
3. Use sample data format:
   ```
   Cable Number | Description | kW | kVA | Voltage | PF | Efficiency | Length | Runs | Type | From Equip | To Equip
   CA-001       | Main Feed   | 50 | 60  | 400     | 0.8| 0.95      | 100    | 1    | XLPE | DB-01      | EQ-01
   ```
4. Review calculations in results table
5. Click cable to view 3D visualization
6. Use checkboxes to approve/reject
7. Export to CSV or JSON
8. Use XLSX export to include a formulas row: toggle **Formulas** on the results toolbar to include a second header row with the calculation formulas used and a column containing the formulas as JSON for each exported cable.

### 2. Cable Routing Workflow
1. Navigate to **Cable Routing**
2. Select **Source Equipment**: DB-01
3. Select **Target Equipment**: EQ-01
4. Choose **Algorithm**: Shortest Path
5. Click **Calculate Route**
6. View optimized path and tray fill status

### 3. Tray Fill Management
1. Navigate to **Tray Fill**
2. View real-time tray capacity
3. Click **Optimize Distribution** for recommendations
4. Review load balancing suggestions

## API Reference (Quick)

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

### List Cable Sizes
```bash
curl http://localhost:8000/api/v1/cable-sizes
```

### Single Cable Calculation
```bash
curl -X POST http://localhost:8000/api/v1/cable/single \
  -H "Content-Type: application/json" \
  -d '{
    "cable_number": "CA-001",
    "load_kw": 50,
    "voltage": 400,
    "length": 100,
    "derating_factor": 0.9
  }'
```

### Excel Bulk Import
```bash
curl -X POST http://localhost:8000/api/v1/cable/bulk_excel \
  -F "file=@cables.xlsx"
```

### Routing Calculation
```bash
curl -X POST http://localhost:8000/api/v1/routing/auto \
  -H "Content-Type: application/json" \
  -d '{
    "source": "DB-01",
    "target": "EQ-01"
  }'
```

### Get Tray Network
```bash
curl http://localhost:8000/api/v1/routing/trays
```

## Production Build

### Frontend
```bash
cd frontend
npm run build
# Output: dist/ folder (ready for nginx)
```

### Backend
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker (Optional)
```dockerfile
# Dockerfile.frontend
FROM node:18-alpine
WORKDIR /app
COPY frontend .
RUN npm install && npm run build
EXPOSE 3000

# Dockerfile.backend
FROM python:3.9-slim
WORKDIR /app
COPY backend .
RUN pip install -r requirements.txt
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0"]
```

## Troubleshooting

### "ModuleNotFoundError: No module named 'openpyxl'"
```bash
pip install openpyxl>=3.1.0
```

### "ModuleNotFoundError: No module named 'networkx'"
```bash
pip install networkx>=3.0
```

### Frontend build errors
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### CORS errors
- Check backend CORS middleware is running
- Verify frontend making requests to `http://localhost:8000`
- Check browser console for specific errors

### Port already in use
```bash
# Frontend (Vite)
npm run dev -- --port 5174

# Backend (FastAPI)
python -m uvicorn main:app --port 8001
```

## Next Steps

1. **Database Integration**: Replace in-memory storage with PostgreSQL
2. **User Authentication**: Add JWT-based login
3. **Advanced Visualization**: Integrate Three.js for 3D
4. **Reporting**: Implement PDF export
5. **Deployment**: Set up CI/CD pipeline
6. **CI**: A GitHub Actions workflow (`.github/workflows/ci.yml`) is included to run backend tests on push/PR.

## Support

### Key Files
- `IMPLEMENTATION_SUMMARY.md` - Complete technical overview
- `README.md` - Project description
- `backend/main.py` - API implementation
- `frontend/src/App.tsx` - Frontend routing

### API Documentation
Visit `http://localhost:8000/docs` for interactive Swagger UI

---

**Happy Engineering!** 🔌⚡
