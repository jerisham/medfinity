"""
Vercel build script for Medfinity.

Vercel automatically runs `manage.py collectstatic` during the build, but
django-cloudinary-storage (installed for user-uploaded media via Cloudinary)
ships its own `collectstatic` command that overrides Django's default one
(Django resolves management commands by INSTALLED_APPS order, and
'cloudinary_storage' is listed before 'django.contrib.staticfiles'). That
override's copy_file() is a no-op for every file unless either:
  - STATICFILES_STORAGE is Cloudinary's StaticCloudinaryStorage (not the case
    here -- the frontend's plain HTML/CSS/JS is served from Vercel's own
    static CDN, not Cloudinary), or
  - --upload-unhashed-files is passed explicitly.

So this script re-runs collectstatic with that flag, which is the documented
escape hatch in django-cloudinary-storage for projects that use Cloudinary
for media but not for static files.
"""
import subprocess
import sys


def main():
    print("Running collectstatic with --upload-unhashed-files ...")
    result = subprocess.run(
        [sys.executable, "manage.py", "collectstatic", "--noinput", "--upload-unhashed-files"],
        check=True,
    )
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
