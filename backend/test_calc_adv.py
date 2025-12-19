import asyncio
import pytest
from main import (
    calculate_flc,
    calculate_flc_for_phase,
    adiabatic_short_circuit_capacity,
    calculate_voltage_drop,
    get_resistance_per_m,
    select_cable_size,
    calculate_single_cable,
    CableInput,
)


def test_flc_three_phase_basic():
    flc = calculate_flc(100, 415, 0.9, 0.95)
    assert flc > 0


def test_flc_single_phase():
    flc = calculate_flc_for_phase(10, 230, 0.9, 0.95, phase='single')
    assert flc > 0


def test_resistance_lookup():
    r = get_resistance_per_m(35)
    assert 0.0004 < r < 0.0006


def test_voltage_drop_estimate():
    # approximate: 100A, 50m, 35mm2
    r = get_resistance_per_m(35)
    vd = calculate_voltage_drop(100, 50, 415, runs=1, resistance=r, size_mm2=35)
    assert vd > 0


def test_adiabatic_capacity():
    I = adiabatic_short_circuit_capacity(95)
    assert I > 0


def test_calculate_single_cable():
    cable = CableInput(cable_number='T-001', description='calc-test', load_kw=50, voltage=415, pf=0.9, efficiency=0.95, length=30, runs=1)
    res = asyncio.run(calculate_single_cable(cable))
    assert res.flc > 0
    assert res.voltage_drop >= 0
    assert res.ampacity is not None
