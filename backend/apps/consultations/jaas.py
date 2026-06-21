"""
Jitsi as a Service (JaaS / 8x8.vc) integration.

JaaS lets video consults work without requiring a logged-in "moderator"
account on the public meet.jit.si — the backend signs a short-lived JWT per
user/room, and the doctor is always flagged as moderator so the room never
sits waiting for one to "show up".

Setup (optional — everything here degrades gracefully when unconfigured):
  1. Sign up free at https://jaas.8x8.vc and create an App.
  2. Download the generated private key and save it to
     backend/keys/jaas_private.pem (gitignored — never commit it).
  3. Set JAAS_APP_ID and JAAS_API_KEY_ID in backend/.env.
  4. (Optional) Set JAAS_PRIVATE_KEY_PATH if you used a different filename.

When any of the above is missing, jaas_configured() returns False and the
app transparently falls back to the public meet.jit.si rooms (no JWT, no
moderator flag) — video calls still work, they just rely on whoever joins
first.
"""

import time
import uuid

from django.conf import settings

PUBLIC_DOMAIN = "meet.jit.si"


def jaas_configured():
    """True only when an App ID, API key ID, and a private key file are all present."""
    return bool(
        settings.JAAS_APP_ID
        and settings.JAAS_API_KEY_ID
        and settings.JAAS_PRIVATE_KEY_PATH
        and settings.JAAS_PRIVATE_KEY_PATH.exists()
    )


def build_room_name(appointment_id, bare_room):
    """
    Return the room name the frontend should actually join.

    JaaS rooms must be scoped under the tenant's App ID
    (e.g. "vpaas-magic-cookie-xxx/medfinity-appt-1-ab12cd34"), while public
    meet.jit.si rooms just use the bare name directly.
    """
    if jaas_configured():
        return f"{settings.JAAS_APP_ID}/{bare_room}"
    return bare_room


def generate_meeting_link(appointment_id):
    """
    Create a unique room for an appointment.

    Returns a 3-tuple: (bare_room, jitsi_link, domain)
      - bare_room: stored on VideoConsultation.room_name (DB-unique, no App ID prefix)
      - jitsi_link: a shareable URL using whichever domain is active
      - domain: the Jitsi domain in use ('8x8.vc' when JaaS is configured, else meet.jit.si)
    """
    bare_room = f"medfinity-appt-{appointment_id}-{uuid.uuid4().hex[:8]}"
    domain = settings.JAAS_DOMAIN if jaas_configured() else PUBLIC_DOMAIN
    full_room = build_room_name(appointment_id, bare_room)
    jitsi_link = f"https://{domain}/{full_room}"
    return bare_room, jitsi_link, domain


def generate_user_jwt(full_room, user, is_moderator):
    """
    Sign a JaaS JWT scoping this user to this room.

    Returns None when JaaS isn't configured — the frontend treats a null
    jwt as "skip the auth header" and joins the public room instead.
    """
    if not jaas_configured():
        return None

    import jwt  # PyJWT — only imported when actually needed

    with open(settings.JAAS_PRIVATE_KEY_PATH, "r") as f:
        private_key = f.read()

    now = int(time.time())
    display_name = user.get_full_name() or user.username

    payload = {
        "aud": "jitsi",
        "iss": "chat",
        "sub": settings.JAAS_APP_ID,
        "room": full_room,
        "iat": now,
        "nbf": now - 5,
        "exp": now + 60 * 60 * 2,  # 2-hour validity, plenty for a consult
        "context": {
            "user": {
                "id": str(user.id),
                "name": display_name,
                "email": user.email,
                "moderator": is_moderator,
            },
            "features": {
                "livestreaming": False,
                "recording": False,
                "transcription": False,
                "outbound-call": False,
            },
        },
    }

    headers = {"kid": settings.JAAS_API_KEY_ID, "alg": "RS256"}
    token = jwt.encode(payload, private_key, algorithm="RS256", headers=headers)
    # PyJWT >= 2 returns a str already; older versions return bytes.
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token