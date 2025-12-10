from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Tuple, Any
import math
from datetime import datetime
import io
import json
import os

# SQLAlchemy for persistence
try:
    from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON, ForeignKey
    from sqlalchemy.orm import sessionmaker, declarative_base
except Exception:
    create_engine = None
    declarative_base = None

# Excel handling
try:
    from openpyxl import load_workbook
except ImportError:
    load_workbook = None

# Graph-based routing
try:
    import networkx as nx
except ImportError:
    nx = None

app = FastAPI(title="SCEAP - Backend API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Data Models ====================

class CableInput(BaseModel):
    cable_number: str
    description: str
    load_kw: float
    load_kva: float
    voltage: float
    pf: float
    efficiency: float
    length: float
    runs: int
    cable_type: str
    from_equipment: str
    to_equipment: str

class CableResult(BaseModel):
    id: str
    cable_number: str
    description: str
    flc: float
    derated_current: float
    selected_size: float
    voltage_drop: float
    sc_check: bool
    grouping_factor: float
    status: str = "pending"
    cores: int = 3
    od: float = 0.0

class ExcelUploadResponse(BaseModel):
    success: bool
    cables_imported: int
    errors: List[str] = []
    results: List[CableResult] = []

class RoutingRequest(BaseModel):
    cable_id: str
    from_equipment: str
    to_equipment: str
    cable_od: float
    cable_csa: float
    runs: int

class RoutingResult(BaseModel):
    cable_id: str
    path: List[str]
    total_length: float
    fill_status: Dict[str, float]
    warnings: List[str] = []

class ProjectSetup(BaseModel):
    project_name: str
    plant_type: str
    standard: str
    voltage_levels: List[float]
    service_condition: str

# ==================== Cable Sizing Calculations ====================

def calculate_flc(load_kw: float, voltage: float, pf: float, efficiency: float) -> float:
    """Calculate Full Load Current: I = P / (√3 × V × PF × η)"""
    if voltage == 0 or pf == 0:
        return 0
    return load_kw / (math.sqrt(3) * voltage * pf * efficiency)

def apply_derating(current: float, grouping_factor: float = 0.8, temp_factor: float = 0.95, 
                   installation_factor: float = 1.0) -> float:
    """Apply derating factors"""
    return current / (grouping_factor * temp_factor * installation_factor)

def calculate_voltage_drop(flc: float, length: float, voltage: float, runs: int, 
                          resistance: float = 0.02) -> float:
    """Calculate voltage drop percentage: Vd% = (√3 × I × L × mV/A·m) / V × 100"""
    if voltage == 0:
        return 0
    impedance = resistance / runs
    vd = (math.sqrt(3) * flc * length * impedance) / voltage
    return (vd / voltage) * 100

def select_cable_size(derated_current: float, standard: str = "IEC") -> Tuple[str, float]:
    """Select cable size and return (size_string, size_mm2)"""
    cable_sizes_iec = [
        (10, 1.5), (16, 2.5), (25, 4), (35, 6), (50, 10),
        (63, 16), (80, 25), (100, 35), (125, 50), (160, 70),
        (200, 95), (250, 120), (315, 150), (400, 185), (500, 240)
    ]
    
    for amps, size in cable_sizes_iec:
        if derated_current <= amps:
            return (f"3 x {size}", size)
    
    return ("3 x 300", 300)

def check_short_circuit(cable_size: float) -> bool:
    """Simplified short circuit check"""
    return cable_size >= 1.5

def calculate_cable_od(cores: int, csa: float) -> float:
    """Estimate cable outer diameter based on cores and CSA"""
    base = math.sqrt(cores * csa) * 1.5
    return round(base, 1)

# ==================== Excel Import ====================

def parse_excel_cables(file_content: bytes) -> Tuple[List[CableInput], List[str]]:
    """Parse Excel file and extract cable data"""
    errors = []
    cables = []
    
    if not load_workbook:
        errors.append("openpyxl not installed")
        return cables, errors
    
    try:
        workbook = load_workbook(io.BytesIO(file_content))
        sheet = workbook.active
        
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                if not row[0]:
                    continue
                
                cable = CableInput(
                    cable_number=str(row[0]).strip(),
                    description=str(row[1]).strip() if row[1] else "",
                    load_kw=float(row[2]) if row[2] else 0,
                    load_kva=float(row[3]) if row[3] else 0,
                    voltage=float(row[4]) if row[4] else 415,
                    pf=float(row[5]) if row[5] else 0.9,
                    efficiency=float(row[6]) if row[6] else 0.95,
                    length=float(row[7]) if row[7] else 0,
                    runs=int(row[8]) if row[8] else 1,
                    cable_type=str(row[9]).strip() if row[9] else "C",
                    from_equipment=str(row[10]).strip() if row[10] else "",
                    to_equipment=str(row[11]).strip() if row[11] else "",
                )
                cables.append(cable)
            except (ValueError, IndexError, TypeError) as e:
                errors.append(f"Row {row_idx}: {str(e)}")
        
        return cables, errors
    except Exception as e:
        errors.append(f"Error: {str(e)}")
        return cables, errors

# ==================== Routing Engine ====================

class TrayNetwork:
    """Tray network for routing calculations"""
    
    def __init__(self):
        self.graph = nx.Graph() if nx else None
        self.tray_data = {}
        self._build_sample_network()
    
    def _build_sample_network(self):
        """Build sample tray network"""
        if not self.graph:
            return
        
        trays = ["PHF-01", "PHF-02", "PHF-03", "PHF-04", "PHF-05", "DB-01", "DB-02"]
        equipment = ["Transformer", "Panel A", "Panel B", "Motor M1", "Motor M2"]
        
        all_nodes = trays + equipment
        self.graph.add_nodes_from(all_nodes)
        
        connections = [
            ("Transformer", "PHF-01", 10),
            ("PHF-01", "PHF-02", 5),
            ("PHF-02", "PHF-03", 8),
            ("PHF-03", "DB-01", 6),
            ("DB-01", "Panel A", 12),
            ("DB-01", "Panel B", 15),
            ("PHF-02", "PHF-04", 7),
            ("PHF-04", "DB-02", 9),
            ("DB-02", "Motor M1", 10),
            ("DB-02", "Motor M2", 11),
        ]
        
        for src, dst, dist in connections:
            self.graph.add_edge(src, dst, weight=dist)
        
        self.tray_data = {
            "PHF-01": {"fill": 45, "capacity": 1000},
            "PHF-02": {"fill": 60, "capacity": 1000},
            "PHF-03": {"fill": 70, "capacity": 1000},
            "PHF-04": {"fill": 30, "capacity": 1000},
            "DB-01": {"fill": 55, "capacity": 800},
            "DB-02": {"fill": 65, "capacity": 800},
        }
    
    def find_shortest_path(self, source: str, target: str) -> Tuple[List[str], float]:
        """Find shortest path"""
        if not self.graph:
            return [source, target], 50.0
        
        try:
            path = nx.shortest_path(self.graph, source, target, weight='weight')
            length = nx.shortest_path_length(self.graph, source, target, weight='weight')
            return path, float(length)
        except:
            return [source, target], 50.0
    
    def find_least_fill_path(self, source: str, target: str) -> Tuple[List[str], float]:
        """Find least-fill path: penalize edges that connect to high-fill trays."""
        if not self.graph:
            return [source, target], 50.0

        # Build a temporary weighted graph where edge weight = base_weight + fill_penalty
        G = self.graph.copy()

        for u, v, data in G.edges(data=True):
            base = float(data.get('weight', 1.0))
            fill_u = float(self.tray_data.get(u, {}).get('fill', 0))
            fill_v = float(self.tray_data.get(v, {}).get('fill', 0))
            # penalty scale: each percent fill adds 0.2 units
            penalty = ((fill_u + fill_v) / 2.0) * 0.2
            data['weight'] = base + penalty

        try:
            path = nx.shortest_path(G, source, target, weight='weight')
            length = nx.shortest_path_length(G, source, target, weight='weight')
            return path, float(length)
        except Exception:
            return [source, target], 50.0

routing_engine = TrayNetwork()

# ==================== Database / Persistence ====================

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./sceap.db')
DB_AVAILABLE = create_engine is not None
Base = declarative_base() if declarative_base else None
Engine = None
SessionLocal = None

if DB_AVAILABLE:
    Engine = create_engine(DATABASE_URL, echo=False, future=True)
    SessionLocal = sessionmaker(bind=Engine, autoflush=False, autocommit=False)

    class ProjectModel(Base):
        __tablename__ = 'projects'
        id = Column(Integer, primary_key=True, index=True)
        project_id = Column(String, unique=True, index=True)
        name = Column(String)
        plant_type = Column(String)
        standard = Column(String)
        voltage_levels = Column(JSON)
        service_condition = Column(String)
        created_at = Column(DateTime)

    class CableResultModel(Base):
        __tablename__ = 'cable_results'
        id = Column(Integer, primary_key=True, index=True)
        result_id = Column(String, index=True)
        project_id = Column(String, ForeignKey('projects.project_id'), index=True)
        cable_number = Column(String)
        payload = Column(JSON)
        created_at = Column(DateTime)

    def init_db():
        try:
            Base.metadata.create_all(bind=Engine)
        except Exception:
            pass

else:
    def init_db():
        return


@app.on_event('startup')
def on_startup():
    init_db()

# ==================== API Endpoints ====================

@app.get("/")
async def root():
    return {"message": "SCEAP API Running", "version": "1.0.0"}

@app.post("/api/v1/cable/single")
async def calculate_single_cable(cable: CableInput) -> CableResult:
    """Calculate single cable"""
    try:
        flc = calculate_flc(cable.load_kw, cable.voltage, cable.pf, cable.efficiency)
        derated = apply_derating(flc)
        vdrop = calculate_voltage_drop(flc, cable.length, cable.voltage, cable.runs)
        selected_size, size_value = select_cable_size(derated)
        od = calculate_cable_od(3, size_value)
        
        return CableResult(
            id=cable.cable_number,
            cable_number=cable.cable_number,
            description=cable.description,
            flc=round(flc, 2),
            derated_current=round(derated, 2),
            selected_size=size_value,
            voltage_drop=round(vdrop, 2),
            sc_check=check_short_circuit(size_value),
            grouping_factor=0.8,
            status="pending",
            cores=3,
            od=od
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/cable/bulk")
async def calculate_bulk_cables(cables: List[CableInput]) -> List[CableResult]:
    """Calculate multiple cables"""
    results = []
    for cable in cables:
        result = await calculate_single_cable(cable)
        results.append(result)
    return results

@app.post("/api/v1/cable/bulk_excel")
async def upload_cable_excel(file: UploadFile = File(...)) -> ExcelUploadResponse:
    """Upload Excel and process"""
    try:
        content = await file.read()
        cables, errors = parse_excel_cables(content)
        
        results = []
        for cable in cables:
            try:
                result = await calculate_single_cable(cable)
                results.append(result)
            except Exception as e:
                errors.append(f"{cable.cable_number}: {str(e)}")
        
        return ExcelUploadResponse(
            success=len(errors) == 0,
            cables_imported=len(results),
            errors=errors,
            results=results
        )
    except Exception as e:
        return ExcelUploadResponse(success=False, cables_imported=0, errors=[str(e)])


@app.post('/api/v1/cable/save_bulk')
async def save_bulk_results(project_id: str, results: List[CableResult]):
    """Save bulk cable results associated with a project (DB persistence)."""
    if not DB_AVAILABLE:
        raise HTTPException(status_code=500, detail='Database support not available')

    db = SessionLocal()
    saved = 0
    try:
        for r in results:
            obj = CableResultModel(
                result_id=r.id,
                project_id=project_id,
                cable_number=r.cable_number,
                payload=r.dict(),
                created_at=datetime.utcnow()
            )
            db.add(obj)
            saved += 1
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

    return { 'saved': saved }


@app.get('/api/v1/project/{project_id}/cables')
async def get_project_cables(project_id: str):
    if not DB_AVAILABLE:
        raise HTTPException(status_code=500, detail='Database support not available')
    db = SessionLocal()
    try:
        rows = db.query(CableResultModel).filter(CableResultModel.project_id == project_id).all()
        return [r.payload for r in rows]
    finally:
        db.close()


@app.post('/api/v1/project/{project_id}/cable/{cable_id}/approve')
async def approve_cable(project_id: str, cable_id: str, status: str = 'approved'):
    """Update cable approval status in DB."""
    if not DB_AVAILABLE:
        return { 'status': status, 'cable_id': cable_id, 'project_id': project_id }

    db = SessionLocal()
    try:
        row = db.query(CableResultModel).filter(
            CableResultModel.project_id == project_id,
            CableResultModel.result_id == cable_id
        ).first()
        if row and row.payload:
            row.payload['status'] = status
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

    return { 'status': status, 'cable_id': cable_id }


@app.post("/api/v1/routing/auto", response_model=RoutingResult)
async def auto_route_cable(request: Dict[str, Any]):
    """Auto-route cable. Accepts simple payloads: {source, target, cable_id?} or full RoutingRequest fields."""
    try:
        source = request.get('source') or request.get('from_equipment') or request.get('from')
        target = request.get('target') or request.get('to_equipment') or request.get('to')
        cable_id = request.get('cable_id') or request.get('id') or 'CABLE-NA'

        path, length = routing_engine.find_shortest_path(source, target)
        fill_status = {}
        warnings = []

        for node in path:
            if node in routing_engine.tray_data:
                fill = routing_engine.tray_data[node]["fill"]
                fill_status[node] = fill
                if fill > 80:
                    warnings.append(f"{node} is {fill}% full")

        return RoutingResult(
            cable_id=cable_id,
            path=path,
            total_length=length,
            fill_status=fill_status,
            warnings=warnings
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/routing/optimize", response_model=RoutingResult)
async def optimize_route(request: Dict[str, Any]):
    """Optimize route. Accepts {source, target, algorithm} where algorithm can be 'shortest' or 'least-fill'."""
    try:
        source = request.get('source') or request.get('from_equipment') or request.get('from')
        target = request.get('target') or request.get('to_equipment') or request.get('to')
        cable_id = request.get('cable_id') or 'CABLE-NA'
        algorithm = request.get('algorithm', 'shortest')

        if algorithm == 'least-fill':
            path, length = routing_engine.find_least_fill_path(source, target)
        else:
            path, length = routing_engine.find_shortest_path(source, target)

        fill_status = {}
        warnings = []
        for node in path:
            if node in routing_engine.tray_data:
                fill = routing_engine.tray_data[node]['fill']
                fill_status[node] = fill
                if fill > 80:
                    warnings.append(f"{node} is {fill}% full")

        return RoutingResult(
            cable_id=cable_id,
            path=path,
            total_length=length,
            fill_status=fill_status,
            warnings=warnings
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/v1/routing/trays")
async def get_tray_network():
    """Get tray network"""
    trays_list = []
    for k, v in routing_engine.tray_data.items():
        trays_list.append({ 'name': k, 'fill_percentage': v.get('fill', 0), 'capacity': v.get('capacity', 0) })

    avg = 0
    if trays_list:
        avg = sum(t['fill_percentage'] for t in trays_list) / len(trays_list)

    return {
        "trays": trays_list,
        "total_trays": len(trays_list),
        "average_fill": avg
    }


@app.get('/api/v1/routing/graph')
async def get_routing_graph():
    """Return graph nodes and edges for frontend visualization"""
    if not routing_engine.graph:
        return { 'nodes': [], 'edges': [] }

    nodes = []
    for n in routing_engine.graph.nodes():
        meta = routing_engine.tray_data.get(n, {})
        nodes.append({
            'id': n,
            'label': n,
            'meta': meta
        })

    edges = []
    for u, v, data in routing_engine.graph.edges(data=True):
        edges.append({ 'source': u, 'target': v, 'weight': float(data.get('weight', 1.0)) })

    return { 'nodes': nodes, 'edges': edges }

@app.post("/api/v1/project/setup")
async def setup_project(project: ProjectSetup):
    """Setup project (persist to DB when available)"""
    pid = f"PROJ-{int(datetime.utcnow().timestamp())}"
    created = datetime.utcnow()
    if DB_AVAILABLE:
        db = SessionLocal()
        try:
            pm = ProjectModel(
                project_id=pid,
                name=project.project_name,
                plant_type=project.plant_type,
                standard=project.standard,
                voltage_levels=project.voltage_levels,
                service_condition=project.service_condition,
                created_at=created
            )
            db.add(pm)
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

    return {
        "project_id": pid,
        "created_at": created.isoformat(),
        "status": "initialized",
        "project": project
    }

@app.get("/api/v1/standards")
async def get_standards():
    """Get standards"""
    return {
        "IEC": {"standard_number": "IEC 60287", "title": "Calculation of continuous current rating"},
        "IS": {"standard_number": "IS 1554", "title": "Cross-linked polyethylene insulated cables"}
    }

@app.get("/api/v1/cable-sizes")
async def get_cable_sizes(standard: str = "IEC"):
    """Get cable sizes"""
    return {
        "standard": standard,
        "sizes": [
            {"amps": 10, "size": "1.5"}, {"amps": 16, "size": "2.5"},
            {"amps": 25, "size": "4"}, {"amps": 35, "size": "6"},
            {"amps": 50, "size": "10"}, {"amps": 63, "size": "16"},
            {"amps": 80, "size": "25"}, {"amps": 100, "size": "35"},
            {"amps": 125, "size": "50"}, {"amps": 160, "size": "70"},
            {"amps": 200, "size": "95"}, {"amps": 250, "size": "120"},
            {"amps": 315, "size": "150"}, {"amps": 400, "size": "185"},
            {"amps": 500, "size": "240"}
        ]
    }

@app.get("/api/v1/health")
async def health_check():
    """Health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "features": {
            "excel_import": load_workbook is not None,
            "routing": nx is not None
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
