#!/usr/bin/env python3
"""
Socratis - One-Click Startup Script
Starts all services: Backend (Express), Frontend (Next.js), and Voice Agent (Python)
"""

import subprocess
import sys
import os
import time
import signal
from pathlib import Path

# Get the root directory (where this script is located)
ROOT_DIR = Path(__file__).parent.absolute()
SERVER_DIR = ROOT_DIR / "server"
CLIENT_DIR = ROOT_DIR / "client"
AGENT_DIR = ROOT_DIR / "server" / "agent"

processes = []

def cleanup(signum=None, frame=None):
    """Cleanup all spawned processes"""
    print("\n🛑 Shutting down all services...")
    for proc in processes:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except:
            try:
                proc.kill()
            except:
                pass
    print("✅ All services stopped.")
    sys.exit(0)

def start_service(name, cmd, cwd, log_file=None):
    """Start a service in a new process"""
    print(f"🚀 Starting {name}...")
    
    # Create log file for capturing output
    if log_file:
        log_path = ROOT_DIR / log_file
        stdout = open(log_path, 'w')
        stderr = subprocess.STDOUT
    else:
        stdout = subprocess.PIPE
        stderr = subprocess.PIPE
    
    # Start process without CREATE_NEW_CONSOLE to properly track status
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        shell=True,
        stdout=stdout,
        stderr=stderr
    )
    
    processes.append(proc)
    return proc

def main():
    print("=" * 60)
    print("🎙️  SOCRATIS - AI Interview Platform")
    print("=" * 60)
    print()
    
    # Register signal handlers for cleanup
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    # Check if directories exist
    if not SERVER_DIR.exists():
        print(f"❌ Server directory not found: {SERVER_DIR}")
        sys.exit(1)
    if not CLIENT_DIR.exists():
        print(f"❌ Client directory not found: {CLIENT_DIR}")
        sys.exit(1)
    if not AGENT_DIR.exists():
        print(f"❌ Agent directory not found: {AGENT_DIR}")
        sys.exit(1)
    
    # Start Backend Server (Port 4000)
    start_service(
        "Backend Server (Port 4000)",
        "npm run dev",
        SERVER_DIR,
        "backend.log"
    )
    time.sleep(3)  # Give server time to start
    
    # Start Frontend (Port 3000)
    start_service(
        "Frontend (Port 3000)",
        "npm run dev",
        CLIENT_DIR,
        "frontend.log"
    )
    time.sleep(3)  # Give Next.js time to compile
    
    # Start Voice Agent
    start_service(
        "Voice Agent (LiveKit)",
        "python agent.py start",
        AGENT_DIR,
        "agent.log"
    )
    
    print()
    print("=" * 60)
    print("✅ All services started!")
    print()
    print("📍 Frontend:  http://localhost:3000")
    print("📍 Backend:   http://localhost:4000")
    print("📍 Interview: http://localhost:3000/interview/new")
    print()
    print("📄 Logs: backend.log, frontend.log, agent.log")
    print()
    print("Press Ctrl+C to stop all services")
    print("=" * 60)
    
    # Service names for error reporting
    service_names = ["Backend", "Frontend", "Agent"]
    failed_services = set()
    
    # Keep the script running and monitor processes
    try:
        while True:
            time.sleep(2)
            # Check if any process has died
            for i, proc in enumerate(processes):
                if proc.poll() is not None and i not in failed_services:
                    failed_services.add(i)
                    exit_code = proc.returncode
                    log_file = ["backend.log", "frontend.log", "agent.log"][i]
                    print(f"⚠️  {service_names[i]} stopped (exit code: {exit_code}) - check {log_file}")
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()

