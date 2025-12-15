#!/usr/bin/env python3
"""
Simple smoke test for cable calculations
"""
import asyncio
from main import calculate_single_cable, CableInput
from main import save_bulk_results
from main import CableResult


async def run_test():
    cable = CableInput(cable_number='CB-TEST', description='smoke', load_kw=75, voltage=415, pf=0.9, efficiency=0.95, length=30, runs=3)
    res = await calculate_single_cable(cable)
    print('Result', res)
    assert res.flc > 0
    assert res.derated_current > 0
    assert res.selected_size > 0
    assert res.voltage_drop >= 0
    assert res.ampacity is not None
    print('Smoke test passed')

    # Test save bulk
    cr = CableResult(**res.dict())
    result = await save_bulk_results('test_project', [cr])
    print('Saved bulk result:', result)


if __name__ == '__main__':
    asyncio.run(run_test())
