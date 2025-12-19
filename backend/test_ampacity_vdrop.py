import pytest
from main import compute_ampacity_from_entry, calculate_voltage_drop


def test_compute_ampacity_from_entry_air():
    entry = {'size_mm2': 16, 'ampacity_air': 63}
    base_amp, amp, src = compute_ampacity_from_entry(entry, standard='IEC', grouping_factor=0.9, temp_factor=0.95)
    assert base_amp is not None
    assert amp is not None
    assert amp < base_amp
    assert 'ampacity_air' in src


def test_voltage_drop_with_reactance():
    # Use a typical conductor with R=0.0005 ohm/m and X=0.0003 ohm/m
    vd_no_x = calculate_voltage_drop(100, length=100, voltage=415, runs=1, resistance=0.0005, reactance=None)
    vd_with_x = calculate_voltage_drop(100, length=100, voltage=415, runs=1, resistance=0.0005, reactance=0.0003)
    assert vd_with_x >= vd_no_x