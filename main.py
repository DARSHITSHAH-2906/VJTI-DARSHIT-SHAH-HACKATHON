"""
FINRISK-AI // Root Entry Point (main.py)
Forwards execution to src/main.py
"""

import sys
import os
import io

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Delegate to src/main.py
src_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
sys.path.insert(0, src_dir)

import main

if __name__ == "__main__":
    main.main()
