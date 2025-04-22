#!/usr/bin/env python3
"""
Environment Variable Checker for Inventory Tracker App
This script scans your codebase for environment variable usage and helps ensure
consistency between local development and deployment environments (Vercel/Render).
"""

import os
import re
import json
from collections import defaultdict
import argparse

# Patterns to find environment variable usage
PATTERNS = {
    'python': [
        r'os\.environ\.get\([\'"]([A-Za-z0-9_]+)[\'"]',  # os.environ.get('VAR_NAME'
        r'os\.environ\[[\'"]([A-Za-z0-9_]+)[\'"]\]',     # os.environ['VAR_NAME']
    ],
    'javascript': [
        r'process\.env\.([A-Za-z0-9_]+)',                # process.env.VAR_NAME
        r'process\.env\[[\'"]([A-Za-z0-9_]+)[\'"]\]',    # process.env['VAR_NAME']
    ]
}

# File extensions to language mapping
EXTENSIONS = {
    '.py': 'python',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'javascript',
    '.tsx': 'javascript',
}

def scan_file(file_path):
    """Scan a file for environment variable usage."""
    _, ext = os.path.splitext(file_path)
    lang = EXTENSIONS.get(ext)
    
    if not lang:
        return []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            content = f.read()
        except UnicodeDecodeError:
            print(f"Warning: Could not read {file_path} as text")
            return []
    
    env_vars = []
    for pattern in PATTERNS.get(lang, []):
        matches = re.findall(pattern, content)
        env_vars.extend(matches)
    
    return env_vars

def scan_directory(directory):
    """Recursively scan a directory for environment variable usage."""
    env_vars = defaultdict(set)
    
    for root, _, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            vars_in_file = scan_file(file_path)
            if vars_in_file:
                rel_path = os.path.relpath(file_path, directory)
                for var in vars_in_file:
                    env_vars[var].add(rel_path)
    
    return env_vars

def check_env_files(directory, env_vars):
    """Check if environment variables are defined in .env files."""
    env_files = [
        os.path.join(directory, '.env'),
        os.path.join(directory, '.env.example'),
        os.path.join(directory, '.env.local'),
        os.path.join(directory, '.env.development'),
        os.path.join(directory, '.env.production'),
        os.path.join(directory, 'frontend_app', '.env'),
        os.path.join(directory, 'frontend_app', '.env.example'),
        os.path.join(directory, 'frontend_app', '.env.local'),
    ]
    
    defined_vars = set()
    
    for env_file in env_files:
        if os.path.exists(env_file):
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        parts = line.split('=', 1)
                        if len(parts) == 2:
                            defined_vars.add(parts[0])
    
    return defined_vars

def check_vercel_config(directory):
    """Check for Vercel configuration files."""
    vercel_files = [
        os.path.join(directory, 'vercel.json'),
        os.path.join(directory, 'frontend_app', 'vercel.json'),
    ]
    
    vercel_vars = set()
    
    for vercel_file in vercel_files:
        if os.path.exists(vercel_file):
            try:
                with open(vercel_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    env = config.get('env', {})
                    vercel_vars.update(env.keys())
            except (json.JSONDecodeError, UnicodeDecodeError):
                print(f"Warning: Could not parse {vercel_file}")
    
    return vercel_vars

def generate_report(directory):
    """Generate a report on environment variable usage and configuration."""
    print(f"Scanning {directory} for environment variable usage...")
    
    # Scan codebase for environment variable usage
    env_vars = scan_directory(directory)
    
    # Check .env files
    defined_vars = check_env_files(directory, env_vars)
    
    # Check Vercel config
    vercel_vars = check_vercel_config(directory)
    
    # Generate report
    print("\n=== Environment Variable Report ===\n")
    
    print(f"Found {len(env_vars)} environment variables used in code:")
    for var, files in sorted(env_vars.items()):
        status = []
        if var in defined_vars:
            status.append("defined in .env")
        if var in vercel_vars:
            status.append("defined in vercel.json")
        
        status_str = f" ({', '.join(status)})" if status else " (NOT DEFINED)"
        print(f"  - {var}{status_str}")
        print(f"    Used in: {', '.join(sorted(files))}")
    
    print("\nMissing environment variables (used in code but not defined in .env):")
    missing = [var for var in env_vars if var not in defined_vars]
    if missing:
        for var in sorted(missing):
            print(f"  - {var}")
    else:
        print("  None! All variables are defined.")
    
    print("\nRecommendations:")
    print("1. Create .env files for both backend and frontend using the .env.example templates")
    print("2. Ensure all environment variables are set in your Vercel/Render dashboards")
    print("3. Use consistent variable names between local and deployment environments")
    print("4. For Vercel, add frontend variables with the REACT_APP_ prefix")
    print("5. For Render, add all backend variables to your service configuration")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check environment variables for consistency")
    parser.add_argument("--dir", default=".", help="Directory to scan (default: current directory)")
    args = parser.parse_args()
    
    generate_report(os.path.abspath(args.dir))
