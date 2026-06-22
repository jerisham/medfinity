"""
Vercel build script for Medfinity.
"""
import subprocess
import sys


def main():
    print("Running collectstatic ...")
    result = subprocess.run(
        [sys.executable, "manage.py", "collectstatic", "--noinput"],
        check=True,
    )
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
