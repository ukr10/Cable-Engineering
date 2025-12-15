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
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError
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
    description: str = ''
    load_kw: float = 0.0
    load_kva: float = 0.0
    voltage: float = 415.0
    pf: float = 0.9
    efficiency: float = 0.95
    length: float = 0.0
    runs: int = 1
    cable_type: str = 'C'
    from_equipment: str = ''
    to_equipment: str = ''
    # optional additional columns
    breaker_type: Optional[str] = None
    feeder_type: Optional[str] = None
    cores: Optional[int] = 3
    quantity: Optional[int] = 1
    voltage_variation: Optional[float] = None
    power_supply: Optional[str] = None
    installation: Optional[str] = None
    # Advanced fields
    prospective_sc: Optional[float] = None  # prospective short-circuit current (A)
    phase_type: Optional[str] = None  # 'single' or 'three'
    ambient_temp: Optional[float] = None  # in °C

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
    breaker_type: Optional[str] = None
    feeder_type: Optional[str] = None
    quantity: Optional[int] = None
    # additional diagnostics
    ampacity: Optional[float] = None
    ampacity_margin: Optional[float] = None
    ampacity_margin_pct: Optional[float] = None
    vd_limit: Optional[float] = None
    vd_pass: Optional[bool] = None
    ao: Optional[bool] = None
    resistance_per_m: Optional[float] = None
    prospective_sc: Optional[float] = None

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
    # load_kw is in kW, convert to Watts
    return (load_kw * 1000.0) / (math.sqrt(3) * voltage * pf * efficiency)


def calculate_flc_for_phase(load_kw: float, voltage: float, pf: float, efficiency: float, phase: str = 'three') -> float:
    """Calculate FLC taking into account single-phase or three-phase system."""
    if phase == 'single' or phase == '1' or phase == '1p':
        if voltage == 0 or pf == 0:
            return 0
        return (load_kw * 1000.0) / (voltage * pf * efficiency)
    # default to three-phase
    return calculate_flc(load_kw, voltage, pf, efficiency)

def apply_derating(current: float, grouping_factor: float = 0.8, temp_factor: float = 0.95, 
                   installation_factor: float = 1.0) -> float:
    """Apply derating factors"""
    return current / (grouping_factor * temp_factor * installation_factor)


def derive_grouping_factor(runs: int, feeder_type: Optional[str] = None, phase: str = 'three') -> float:
    """Derive a grouping factor from runs and feeder type. Simplified heuristics."""
    gf = 0.8
    if phase == 'single' or phase.startswith('1'):
        gf = 0.9
    if runs <= 1:
        gf *= 1.0
    elif runs == 2:
        gf *= 0.9
    elif runs == 3:
        gf *= 0.85
    else:
        gf *= 0.8

    if feeder_type and (str(feeder_type).lower().startswith('f') or str(feeder_type).lower().startswith('feeder')):
        gf *= 0.95
    return max(0.5, round(gf, 2))


def derive_temp_factor(ambient_temp: Optional[float]) -> float:
    """Approximate derating factor based on ambient temperature (per 10°C +5% derating approx.)"""
    if ambient_temp is None:
        return 0.95
    base = 30.0
    delta = ambient_temp - base
    steps = int(delta / 10.0)
    f = 1.0
    for _ in range(max(0, steps)):
        f *= 0.95
    return round(f, 3)


def adiabatic_short_circuit_capacity(size_mm2: float, t: float = 1.0, k: float = 115.0) -> float:
    """Adiabatic short circuit capacity approx for copper: I = K * sqrt(S/t) (I in A)
    K typical ~ 115 (copper), t is clearing time in seconds
    """
    try:
        return k * math.sqrt(size_mm2 / (t if t > 0 else 1.0))
    except Exception:
        return 0.0

def calculate_voltage_drop(flc: float, length: float, voltage: float, runs: int = 1, 
                          resistance: Optional[float] = None, size_mm2: Optional[float] = None) -> float:
    """Calculate voltage drop percentage: Vd% = (√3 × I × L × mV/A·m) / V × 100"""
    if voltage == 0:
        return 0
    # If resistance is not supplied, derive from conductor size
    if resistance is None and size_mm2 is not None:
        resistance_per_m = get_resistance_per_m(size_mm2)
    elif resistance is not None:
        resistance_per_m = resistance
    else:
        resistance_per_m = 0.02

    # With multiple runs (parallel conductors), current per conductor decreases
    i_per_run = flc / (runs if runs and runs > 0 else 1)
    vd = (math.sqrt(3) * i_per_run * length * resistance_per_m) / voltage
    return vd * 100

def select_cable_size(derated_current: float, standard: str = "IEC", catalog_name: Optional[str] = None) -> Tuple[str, float, float, Optional[float]]:
    """Select cable size and return (size_string, size_mm2)"""
    # If a catalog_name is provided, load catalog from DB/in-memory
    catalog_list = None
    if catalog_name:
        if DB_USABLE:
            db = SessionLocal()
            try:
                try:
                    row = db.query(CatalogModel).filter(CatalogModel.name == catalog_name).first()
                    if row and row.payload:
                        catalog_list = row.payload
                except OperationalError:
                    # Table missing or DB inaccessible: fallback to in-memory catalog
                    catalog_list = CATALOG_STORE.get(catalog_name)
            finally:
                db.close()
        else:
            catalog_list = CATALOG_STORE.get(catalog_name)

    if not catalog_list:
        # fallback to default IEC table
        cable_sizes_iec = [
        (10, 1.5), (16, 2.5), (25, 4), (35, 6), (50, 10),
        (63, 16), (80, 25), (100, 35), (125, 50), (160, 70),
        (200, 95), (250, 120), (315, 150), (400, 185), (500, 240)
    ]
    
        for amps, size in cable_sizes_iec:
            if derated_current <= amps:
                res = get_resistance_per_m(size)
                return (f"3 x {size}", size, amps, res)
    else:
        # If catalog_list exists, try to find appropriate size by ampacity
        if catalog_list:
            for entry in catalog_list:
                if derated_current <= entry.get('ampacity', 0):
                    size = entry.get('size_mm2') or entry.get('size')
                    try:
                        res = float(entry.get('resistance_per_m') or entry.get('resistance_per_km') or 0) if (entry.get('resistance_per_m') or entry.get('resistance_per_km')) else None
                        if res is not None and res > 1:  # if given in ohm/km
                            res = res / 1000.0
                        return (f"3 x {size}", float(size), float(entry.get('ampacity') or entry.get('amp') or 0), res)
                    except Exception:
                        continue
    
    return ("3 x 300", 300, 0, None)

def check_short_circuit(cable_size: float) -> bool:
    """Simplified short circuit check"""
    return cable_size >= 1.5

def calculate_cable_od(cores: int, csa: float) -> float:
    """Estimate cable outer diameter based on cores and CSA"""
    base = math.sqrt(cores * csa) * 1.5
    return round(base, 1)


def get_resistance_per_m(size_mm2: float) -> float:
    """Approximate resistance per meter (Ohm/m) for copper conductors at 20°C.
    Values are based on typical tabulated resistances (ohm/km) / 1000.
    """
    table_ohm_per_km = {
        1.5: 12.1,
        2.5: 7.41,
        4: 4.61,
        6: 3.08,
        10: 1.83,
        16: 1.15,
        25: 0.727,
        35: 0.524,
        50: 0.387,
        70: 0.268,
        95: 0.193,
        120: 0.153,
        150: 0.124,
        185: 0.101,
        240: 0.075
    }
    # Find nearest key
    if size_mm2 in table_ohm_per_km:
        return table_ohm_per_km[size_mm2] / 1000.0
    # fallback: choose nearest smaller or default to 0.02 ohm/m
    keys = sorted(table_ohm_per_km.keys())
    for k in keys:
        if size_mm2 <= k:
            return table_ohm_per_km[k] / 1000.0
    return table_ohm_per_km[keys[-1]] / 1000.0

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

        # Build header map from first row
        header_row = [str(cell).strip() if cell is not None else '' for cell in next(sheet.iter_rows(min_row=1, max_row=1, values_only=True))]
        headers = [h.lower().strip().replace(' ', '_').replace('.', '').replace('-', '_') for h in header_row]
        idx_map = {name: i for i, name in enumerate(headers)}

        def get_val(row, key):
            i = idx_map.get(key)
            if i is None or i >= len(row):
                return None
            return row[i]

        # Basic header validation
        if not any(k in idx_map for k in ('cable_number', 'cable_no', 'cable')):
            errors.append('Missing key column: cable_number/cable_no/cable')
            return [], errors
        if not any(k in idx_map for k in ('load_kw', 'kw', 'load')):
            # not fatal, add warning but allow import
            errors.append('Warning: load_kw/kw/load column missing or unmapped; assuming 0 kW for rows.')

        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                if not row[0]:
                    continue
                
                cable = CableInput(
                    cable_number=str(get_val(row, 'cable_number') or get_val(row, 'cable_no') or get_val(row, 'cable')),
                    description=str(get_val(row, 'description') or get_val(row, 'desc') or '') if (get_val(row, 'description') or get_val(row, 'desc')) else '',
                    load_kw=float(get_val(row, 'load_kw') or get_val(row, 'kw') or get_val(row, 'kW') or get_val(row, 'load')) if (get_val(row, 'load_kw') or get_val(row, 'kw') or get_val(row, 'kW') or get_val(row, 'load')) else 0,
                    load_kva=float(get_val(row, 'load_kva') or get_val(row, 'kva') or 0) if (get_val(row, 'load_kva') or get_val(row, 'kva')) else 0,
                    voltage=float(get_val(row, 'voltage') or get_val(row, 'v') or 415) if (get_val(row, 'voltage') or get_val(row, 'v')) else 415,
                    pf=float(get_val(row, 'pf') or 0.9) if (get_val(row, 'pf')) else 0.9,
                    efficiency=float(get_val(row, 'efficiency') or 0.95) if (get_val(row, 'efficiency')) else 0.95,
                    length=float(get_val(row, 'length') or 0) if (get_val(row, 'length')) else 0,
                    runs=int(get_val(row, 'runs') or 1) if (get_val(row, 'runs')) else 1,
                    cable_type=str(get_val(row, 'cable_type') or 'C') if (get_val(row, 'cable_type')) else 'C',
                    from_equipment=str(get_val(row, 'from_equipment') or get_val(row, 'from') or '') if (get_val(row, 'from_equipment') or get_val(row, 'from')) else '',
                    to_equipment=str(get_val(row, 'to_equipment') or get_val(row, 'to') or '') if (get_val(row, 'to_equipment') or get_val(row, 'to')) else '',
                    breaker_type=str(get_val(row, 'breaker_type') or get_val(row, 'breaker') or '') if (get_val(row, 'breaker_type') or get_val(row, 'breaker')) else None,
                    feeder_type=str(get_val(row, 'feeder_type') or '') if get_val(row, 'feeder_type') else None,
                    cores=int(get_val(row, 'cores') or 3) if get_val(row, 'cores') else 3,
                    quantity=int(get_val(row, 'quantity') or 1) if get_val(row, 'quantity') else 1,
                    voltage_variation=float(get_val(row, 'voltage_variation') or 0) if get_val(row, 'voltage_variation') else None,
                    power_supply=str(get_val(row, 'power_supply') or '') if get_val(row, 'power_supply') else None,
                    installation=str(get_val(row, 'installation') or '') if get_val(row, 'installation') else None,
                    prospective_sc=float(get_val(row, 'prospective_sc') or get_val(row, 'prospective_sc_ka') or 0) if (get_val(row, 'prospective_sc') or get_val(row, 'prospective_sc_ka')) else None,
                    phase_type=str(get_val(row, 'phase') or get_val(row, 'phase_type') or 'three') if (get_val(row, 'phase') or get_val(row, 'phase_type')) else None,
                    ambient_temp=float(get_val(row, 'ambient_temp') or get_val(row, 'ambient_temperature') or 0) if (get_val(row, 'ambient_temp') or get_val(row, 'ambient_temperature')) else None,
                )
                cables.append(cable)
            except (ValueError, IndexError, TypeError) as e:
                errors.append(f"Row {row_idx}: {str(e)}")
        
        return cables, errors
    except Exception as e:
        errors.append(f"Error: {str(e)}")
        return cables, errors


def parse_catalog_excel(file_content: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Parse catalog excel (size, ampacity) into a list of dicts"""
    errors = []
    catalog = []
    if not load_workbook:
        errors.append("openpyxl not installed")
        return catalog, errors
    try:
        workbook = load_workbook(io.BytesIO(file_content))
        sheet = workbook.active
        # Expect headers like: size_mm2, ampacity
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                if not row[0]:
                    continue
                size = float(row[0])
                ampacity = float(row[1]) if row[1] is not None else 0
                catalog.append({ 'size_mm2': size, 'ampacity': ampacity })
            except (ValueError, IndexError, TypeError) as e:
                errors.append(f"Row {row_idx}: {str(e)}")
        # Sort ascending by ampacity
        catalog = sorted(catalog, key=lambda x: x.get('ampacity', 0))
        return catalog, errors
    except Exception as e:
        errors.append(f"Error: {str(e)}")
        return catalog, errors

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
print(f"[startup] Using DATABASE_URL={DATABASE_URL}")
# If the default sqlite file exists but is not writable by this process, switch to a local fallback
if DATABASE_URL.startswith('sqlite:///'):
    dbfile = DATABASE_URL.replace('sqlite:///', '')
    try:
        if os.path.exists(dbfile) and not os.access(dbfile, os.W_OK):
            # create a per-user fallback DB in workspace
            fallback = './sceap_dev.db'
            print(f"[startup] WARNING: DB file {dbfile} not writable. Switching DB to {fallback}")
            DATABASE_URL = f"sqlite:///{fallback}"
    except Exception:
        pass
DB_AVAILABLE = create_engine is not None
DB_USABLE = False
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
    class CatalogModel(Base):
        __tablename__ = 'catalogs'
        id = Column(Integer, primary_key=True, index=True)
        name = Column(String, unique=True, index=True)
        payload = Column(JSON)
        created_at = Column(DateTime)

    def init_db():
            try:
                Base.metadata.create_all(bind=Engine)
            except Exception:
                pass

    def is_db_writable() -> bool:
        """Attempt to write a minimal transaction to determine DB usability."""
        global DB_USABLE
        if not DB_AVAILABLE or Engine is None:
            DB_USABLE = False
            return False
        try:
            # Attempt to create tables and a session
            Base.metadata.create_all(bind=Engine)
            db = SessionLocal()
            try:
                # Try a lightweight query
                db.execute(text("SELECT 1"))
                db.rollback()
            finally:
                db.close()
            DB_USABLE = True
            return True
        except Exception:
            import traceback
            print("[startup] DB usability check failed:")
            traceback.print_exc()
            DB_USABLE = False
            return False

else:
    def init_db():
        return

# In-memory fallback for catalogs when DB is not available
CATALOG_STORE: Dict[str, List[Dict[str, Any]]] = {}
INMEM_PROJECTS: Dict[str, Dict[str, Any]] = {}
INMEM_CABLE_RESULTS: Dict[str, Dict[str, Any]] = {}

# Default catalog (IEC-like)
DEFAULT_CATALOG = [
    { 'ampacity': 10, 'size_mm2': 1.5 },
    { 'ampacity': 16, 'size_mm2': 2.5 },
    { 'ampacity': 25, 'size_mm2': 4 },
    { 'ampacity': 35, 'size_mm2': 6 },
    { 'ampacity': 50, 'size_mm2': 10 },
    { 'ampacity': 63, 'size_mm2': 16 },
    { 'ampacity': 80, 'size_mm2': 25 },
    { 'ampacity': 100, 'size_mm2': 35 },
    { 'ampacity': 125, 'size_mm2': 50 },
    { 'ampacity': 160, 'size_mm2': 70 },
]



@app.on_event('startup')
def on_startup():
    init_db()
    # Check DB write usability; if not usable we will fall back to in-memory stores
    is_db_writable()
    # Re-run create_all to ensure any new models are created (handles reloads)
    try:
        if DB_AVAILABLE and Engine is not None and Base is not None:
            Base.metadata.create_all(bind=Engine)
    except Exception:
        # If DB operations failed, ensure an in-memory fallback default catalog exists
        if 'default' not in CATALOG_STORE:
            CATALOG_STORE['default'] = DEFAULT_CATALOG
        pass
    # ensure default catalog exists
    try:
        if DB_USABLE:
            db = SessionLocal()
            try:
                # If the catalogs table doesn't exist yet, try to create it before querying
                try:
                    existing = db.query(CatalogModel).filter(CatalogModel.name == 'default').first()
                except OperationalError:
                    # Attempt a create_all to add missing tables then retry once
                    try:
                        Base.metadata.create_all(bind=Engine)
                    except Exception:
                        pass
                    existing = None
                if not existing:
                    obj = CatalogModel(name='default', payload=DEFAULT_CATALOG, created_at=datetime.utcnow())
                    db.add(obj)
                    db.commit()
                # Migrate any in-memory catalogs into db if present
                for n, c in list(CATALOG_STORE.items()):
                    try:
                        exist = db.query(CatalogModel).filter(CatalogModel.name == n).first()
                        if not exist:
                            db.add(CatalogModel(name=n, payload=c, created_at=datetime.utcnow()))
                    except Exception:
                        db.rollback()
                db.commit()
                # Migrate in-memory projects if present
                for pid, pdata in list(INMEM_PROJECTS.items()):
                    try:
                        exist = db.query(ProjectModel).filter(ProjectModel.project_id == pid).first()
                        if not exist:
                            pm = ProjectModel(
                                project_id=pdata.get('project_id'),
                                name=pdata.get('name'),
                                plant_type=pdata.get('plant_type'),
                                standard=pdata.get('standard'),
                                voltage_levels=pdata.get('voltage_levels'),
                                service_condition=pdata.get('service_condition'),
                                created_at=datetime.utcnow()
                            )
                            db.add(pm)
                    except Exception:
                        db.rollback()
                db.commit()
                # Migrate in-memory cable results
                for pid, results in list(INMEM_CABLE_RESULTS.items()):
                    for rid, payload in results.items():
                        try:
                            exist = db.query(CableResultModel).filter(CableResultModel.result_id == rid, CableResultModel.project_id == pid).first()
                            if not exist:
                                obj = CableResultModel(
                                    result_id=rid,
                                    project_id=pid,
                                    cable_number=payload.get('cable_number', rid),
                                    payload=payload,
                                    created_at=datetime.utcnow()
                                )
                                db.add(obj)
                        except Exception:
                            db.rollback()
                db.commit()
            finally:
                db.close()
        else:
            if 'default' not in CATALOG_STORE:
                CATALOG_STORE['default'] = DEFAULT_CATALOG
    except Exception:
        pass

# ==================== API Endpoints ====================

@app.get("/")
async def root():
    return {"message": "SCEAP API Running", "version": "1.0.0", "db_usable": DB_USABLE}

@app.post("/api/v1/cable/single")
async def calculate_single_cable(cable: CableInput, catalog_name: Optional[str] = None) -> CableResult:
    """Calculate single cable"""
    try:
        # Use phase-based FLC and refine derating factors
        phase = (cable.phase_type or ('single' if cable.cores == 1 else 'three'))
        flc = calculate_flc_for_phase(cable.load_kw, cable.voltage, cable.pf, cable.efficiency, phase)
        grouping = derive_grouping_factor(cable.runs or 1, cable.feeder_type, phase)
        temp_factor = derive_temp_factor(cable.ambient_temp)
        installation_factor = 1.0
        derated = apply_derating(flc, grouping_factor=grouping, temp_factor=temp_factor, installation_factor=installation_factor)
        selected_size_str, size_value, ampacity, resistance_per_m = select_cable_size(derated, catalog_name=catalog_name)
        vdrop = calculate_voltage_drop(flc, cable.length, cable.voltage, resistance=resistance_per_m, size_mm2=size_value, runs=cable.runs)
        od = calculate_cable_od(3, size_value)
        
        vd_limit = 5.0
        if cable.voltage and cable.voltage > 1000:
            vd_limit = 3.0

        vd_pass = (vdrop <= vd_limit)
        # Short-circuit check: if user supplied prospective_sc, verify adiabatic capacity
        sc_pass = check_short_circuit(size_value)
        if cable.prospective_sc:
            adi = adiabatic_short_circuit_capacity(size_value)
            sc_pass = adi >= float(cable.prospective_sc)
        ampacity_margin = None
        ampacity_margin_pct = None
        if ampacity is not None:
            try:
                ampacity_val = float(ampacity)
                ampacity_margin = round(ampacity_val - derated, 2)
                ampacity_margin_pct = round(((ampacity_val - derated) / ampacity_val) * 100, 2) if ampacity_val != 0 else None
            except Exception:
                ampacity_val = None

        ao = False
        if ampacity is not None and ampacity_margin is not None:
            ao = (ampacity_margin >= 0) and vd_pass and sc_pass

        return CableResult(
            id=cable.cable_number,
            cable_number=cable.cable_number,
            description=cable.description,
            flc=round(flc, 2),
            derated_current=round(derated, 2),
            selected_size=size_value,
            voltage_drop=round(vdrop, 2),
            sc_check=sc_pass,
            grouping_factor=0.8,
            status="pending",
            cores=3,
            od=od
            ,
            ampacity=ampacity if ampacity is not None else None,
            ampacity_margin=ampacity_margin,
            ampacity_margin_pct=ampacity_margin_pct,
            vd_limit=vd_limit,
            vd_pass=vd_pass
            ,
            ao=ao
            ,
            prospective_sc=cable.prospective_sc
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/cable/bulk")
async def calculate_bulk_cables(cables: List[CableInput], catalog_name: Optional[str] = None) -> List[CableResult]:
    """Calculate multiple cables"""
    results = []
    for cable in cables:
        result = await calculate_single_cable(cable, catalog_name=catalog_name)
        results.append(result)
    return results

@app.post("/api/v1/cable/bulk_excel")
async def upload_cable_excel(file: UploadFile = File(...), catalog_name: Optional[str] = None) -> ExcelUploadResponse:
    """Upload Excel and process"""
    try:
        content = await file.read()
        cables, errors = parse_excel_cables(content)
        
        results = []
        for cable in cables:
            try:
                result = await calculate_single_cable(cable, catalog_name=catalog_name)
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
    saved = 0
    if DB_USABLE:
        db = SessionLocal()
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
            # Fallback to in-memory store on failure
            for r in results:
                INMEM_CABLE_RESULTS.setdefault(project_id, {})[r.id] = r.dict()
                saved += 1
        finally:
            db.close()
    else:
        for r in results:
            INMEM_CABLE_RESULTS.setdefault(project_id, {})[r.id] = r.dict()
            saved += 1

    return { 'saved': saved }


@app.post('/api/v1/catalogs/upload')
async def upload_catalog(file: UploadFile = File(...), name: Optional[str] = None):
    """Upload a catalog (Excel) and store it by name."""
    try:
        content = await file.read()
        catalog, errors = parse_catalog_excel(content)
        if errors:
            return { 'success': False, 'errors': errors }
        if not name:
            name = f"catalog-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        if DB_USABLE:
            db = SessionLocal()
            try:
                obj = CatalogModel(name=name, payload=catalog, created_at=datetime.utcnow())
                db.add(obj)
                db.commit()
                return { 'success': True, 'name': name }
            except OperationalError:
                # DB/table not writable - fallback to in-memory store
                CATALOG_STORE[name] = catalog
                return { 'success': True, 'name': name }
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500, detail=str(e))
            finally:
                db.close()
        else:
            CATALOG_STORE[name] = catalog
            return { 'success': True, 'name': name }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/v1/catalogs')
async def list_catalogs():
    """Return list of available catalogs (names)."""
    names = []
    if DB_USABLE:
        db = SessionLocal()
        try:
            try:
                rows = db.query(CatalogModel).all()
                names = [r.name for r in rows]
            except OperationalError:
                # Table possibly missing; try to create tables then re-query
                try:
                    Base.metadata.create_all(bind=Engine)
                except Exception:
                    pass
                try:
                    rows = db.query(CatalogModel).all()
                    names = [r.name for r in rows]
                except Exception:
                    # fallback to in-memory store on repeated failure
                    names = list(CATALOG_STORE.keys())
        finally:
            db.close()
    else:
        names = list(CATALOG_STORE.keys())
    return { 'catalogs': names }


@app.get('/api/v1/catalogs/{name}')
async def get_catalog(name: str):
    """Return the catalog payload by name."""
    if DB_USABLE:
        db = SessionLocal()
        try:
            try:
                row = db.query(CatalogModel).filter(CatalogModel.name == name).first()
            except OperationalError:
                # Create missing tables and retry once
                try:
                    Base.metadata.create_all(bind=Engine)
                except Exception:
                    pass
                row = None

            if not row:
                # fallback to in-memory store
                if name in CATALOG_STORE:
                    return { 'name': name, 'catalog': CATALOG_STORE[name] }
                raise HTTPException(status_code=404, detail='Catalog not found')
            return { 'name': row.name, 'catalog': row.payload }
        finally:
            db.close()
    else:
        if name not in CATALOG_STORE:
            raise HTTPException(status_code=404, detail='Catalog not found')
        return { 'name': name, 'catalog': CATALOG_STORE[name] }


@app.get('/api/v1/project/{project_id}/cables')
async def get_project_cables(project_id: str):
    if DB_USABLE:
        db = SessionLocal()
        try:
            rows = db.query(CableResultModel).filter(CableResultModel.project_id == project_id).all()
            return [r.payload for r in rows]
        finally:
            db.close()
    else:
        # return in-memory results
        results = INMEM_CABLE_RESULTS.get(project_id, {})
        return list(results.values())


@app.post('/api/v1/project/{project_id}/cable/{cable_id}/approve')
async def approve_cable(project_id: str, cable_id: str, status: str = 'approved'):
    """Update cable approval status in DB."""
    if DB_USABLE:
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
    else:
        # in-memory fallback
        project_store = INMEM_CABLE_RESULTS.get(project_id, {})
        if cable_id in project_store:
            project_store[cable_id]['status'] = status
            INMEM_CABLE_RESULTS[project_id] = project_store

    return { 'status': status, 'cable_id': cable_id }


@app.put('/api/v1/project/{project_id}/cable/{cable_number}')
async def upsert_project_cable(project_id: str, cable_number: str, payload: CableResult):
    """Create or update a cable result associated with a project."""
    if DB_USABLE:
        db = SessionLocal()
        try:
            row = db.query(CableResultModel).filter(
                CableResultModel.project_id == project_id,
                CableResultModel.result_id == payload.id
            ).first()
            if row:
                row.payload = payload.dict()
                row.created_at = datetime.utcnow()
                db.commit()
                return { 'updated': payload.cable_number }
            else:
                obj = CableResultModel(
                    result_id=payload.id,
                    project_id=project_id,
                    cable_number=payload.cable_number,
                    payload=payload.dict(),
                    created_at=datetime.utcnow()
                )
                db.add(obj)
                db.commit()
                return { 'created': payload.cable_number }
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()
    else:
        # Save to in-memory store (upsert behavior)
        project_store = INMEM_CABLE_RESULTS.setdefault(project_id, {})
        existed = payload.id in project_store
        project_store[payload.id] = payload.dict()
        INMEM_CABLE_RESULTS[project_id] = project_store
        return { 'updated' if existed else 'created': payload.cable_number }


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
    if DB_USABLE:
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
    else:
        INMEM_PROJECTS[pid] = {
            'project_id': pid,
            'name': project.project_name,
            'plant_type': project.plant_type,
            'standard': project.standard,
            'voltage_levels': project.voltage_levels,
            'service_condition': project.service_condition,
            'created_at': created.isoformat()
        }

    return {
        "project_id": pid,
        "created_at": created.isoformat(),
        "status": "initialized",
        "project": project
    }


@app.get('/api/v1/projects')
async def list_projects():
    if DB_USABLE:
        db = SessionLocal()
        try:
            rows = db.query(ProjectModel).all()
            return [{ 'project_id': r.project_id, 'name': r.name, 'plant_type': r.plant_type, 'standard': r.standard } for r in rows]
        finally:
            db.close()
    else:
        return list(INMEM_PROJECTS.values())

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
