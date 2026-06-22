"""
Vercel build script for Medfinity.
"""
import subprocess
import sys

def run(cmd):
    subprocess.run(cmd, check=True)

def main():
    print("Running migrations...")
    run([sys.executable, "manage.py", "migrate", "--noinput"])
    print("Running collectstatic...")
    run([sys.executable, "manage.py", "collectstatic", "--noinput"])

if __name__ == "__main__":
    main()
