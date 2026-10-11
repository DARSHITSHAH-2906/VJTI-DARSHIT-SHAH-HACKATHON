"""
FINRISK-AI // Main Entry Point (src/main.py)
S&P Global & CRISIL Campus Hackathon Prototype Entry Point
"""

import sys
import os
import argparse
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from risk_engine import run_cli_demo, start_server


class WebTerminalHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve directly from src/web directory
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "web"))
        super().__init__(*args, directory=base_dir, **kwargs)


def launch_web_terminal(port=3000, open_browser=True):
    print(f"\n[+] Launching FINRISK-AI Interactive Financial Terminal on http://localhost:{port} ...")
    server_address = ('', port)
    httpd = HTTPServer(server_address, WebTerminalHandler)
    url = f"http://localhost:{port}/index.html"
    print(f"[OK] Web Terminal running! Open in browser: {url}")
    print("[*] Press Ctrl+C to terminate the local server.\n")
    if open_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping web terminal server.")
        httpd.server_close()


def main():
    parser = argparse.ArgumentParser(description="FINRISK-AI: Unified AI/NLP Risk Engine & Portfolio Intelligence")
    parser.add_argument("--mode", choices=["cli", "api", "web"], default="cli", 
                        help="Execution mode: 'cli' (default demo), 'api' (REST server), or 'web' (interactive dashboard)")
    parser.add_argument("--port", type=int, default=None, help="Port for web (default 3000) or api (default 8000)")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically launch browser in web mode")

    args = parser.parse_args()

    if args.mode == "web":
        port = args.port or 3000
        launch_web_terminal(port, open_browser=not args.no_browser)
    elif args.mode == "api":
        port = args.port or 8000
        start_server(port)
    else:
        # Default: Run full CLI demonstration
        run_cli_demo()
        print("\n" + "=" * 80)
        print("[INFO] NEXT STEPS TO DEMONSTRATE THE PROTOTYPE:")
        print("   1. Interactive Terminal UI : python main.py --mode web")
        print("   2. REST API Engine         : python main.py --mode api")
        print("   3. Or simply double-click  : src/web/index.html")
        print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
