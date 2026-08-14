import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import HTTPException

from app.config import settings


def smtp_configured() -> bool:
    return bool(settings.smtp_user and settings.smtp_password and settings.smtp_from)


def send_email(to_email: str, subject: str, html: str) -> None:
    if not smtp_configured():
        raise HTTPException(
            status_code=503,
            detail="Email sending is not configured. Set SMTP_USER, SMTP_PASSWORD and SMTP_FROM in the environment.",
        )
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.ehlo()
            if settings.smtp_use_starttls:
                server.starttls()
                server.ehlo()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, [to_email], message.as_string())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not send the verification email. Please try again later.") from exc


def generate_deletion_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not local:
        return "***"
    if len(local) <= 2:
        return f"{local[0]}***@{domain}"
    return f"{local[0]}***{local[-1]}@{domain}"


def render_deletion_email(code: str, display_name: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E5E5;">
        <tr><td style="background:#D94848;padding:26px 28px;text-align:center;">
          <div style="font-size:15px;font-weight:800;color:#FFFFFF;letter-spacing:.5px;">XYTEEE</div>
          <div style="font-size:22px;font-weight:900;color:#FFFFFF;margin-top:6px;">Confirm account deletion</div>
        </td></tr>
        <tr><td style="padding:28px;color:#191919;font-size:14px;line-height:1.6;">
          <p style="margin:0 0 12px;">Hi {display_name if display_name else 'there'},</p>
          <p style="margin:0 0 16px;">We received a request to permanently delete your XYTEEE account. Use the code below to confirm. This code expires in <b>10 minutes</b>.</p>
          <div style="text-align:center;margin:22px 0;letter-spacing:10px;font-size:32px;font-weight:900;color:#191919;background:#F5F5F5;border-radius:12px;padding:18px 0;">{code}</div>
          <p style="margin:0 0 16px;color:#666666;">If you did not request this, you can safely ignore this email — your account will stay as it is.</p>
          <hr style="border:none;border-top:1px solid #EEEEEE;margin:22px 0;" />
          <p style="margin:0;font-size:12px;color:#999999;">This is an automated message from XYTEEE. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
