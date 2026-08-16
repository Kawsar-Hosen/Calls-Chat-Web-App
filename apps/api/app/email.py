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


def render_password_reset_email(code: str, display_name: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <!-- Logo -->
    <tr><td style="text-align:center;padding-bottom:32px;">
      <span style="font-size:22px;font-weight:900;color:#111827;letter-spacing:1px;">XYTEEE</span>
    </td></tr>
    <!-- Heading -->
    <tr><td style="padding-bottom:16px;">
      <h1 style="margin:0;font-size:20px;font-weight:700;color:#111827;">Password Reset</h1>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding-bottom:24px;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.7;">Hi {display_name if display_name else 'there'},</p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">We received a request to reset your XYTEEE account password. Use the code below. It expires in <strong>10 minutes</strong>.</p>
    </td></tr>
    <!-- Code -->
    <tr><td style="padding-bottom:28px;">
      <p style="margin:0 0 10px;font-size:13px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your verification code</p>
      <p style="margin:0;font-size:32px;font-weight:900;color:#111827;letter-spacing:8px;font-family:'Courier New',monospace;">{code}</p>
    </td></tr>
    <!-- Divider -->
    <tr><td style="padding-bottom:24px;"><hr style="border:none;border-top:1px solid #E5E7EB;margin:0;" /></td></tr>
    <!-- Warning -->
    <tr><td style="padding-bottom:32px;">
      <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">Didn't request this? You can safely ignore this email. Your password will remain unchanged.</p>
    </td></tr>
    <!-- Social Links -->
    <tr><td style="text-align:center;padding-bottom:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>
          <!-- Email -->
          <td style="padding:0 12px;">
            <a href="mailto:contact@xyteee.com" style="text-decoration:none;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:50%;background:#F3F4F6;text-align:center;vertical-align:middle;">
                    <span style="font-size:16px;line-height:36px;">&#9993;</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
          <!-- LinkedIn -->
          <td style="padding:0 12px;">
            <a href="https://www.linkedin.com/in/kawsar-hosen?utm_source=share_via&amp;utm_content=profile&amp;utm_medium=member_android" style="text-decoration:none;" target="_blank">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:50%;background:#F3F4F6;text-align:center;vertical-align:middle;">
                    <span style="font-size:14px;font-weight:900;color:#0A66C2;line-height:36px;">in</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
          <!-- Website -->
          <td style="padding:0 12px;">
            <a href="https://xyteee.com" style="text-decoration:none;" target="_blank">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:50%;background:#F3F4F6;text-align:center;vertical-align:middle;">
                    <span style="font-size:16px;line-height:36px;">&#127760;</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- Footer -->
    <tr><td style="text-align:center;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">XYTEEE &middot; Secure Messaging<br/>This is an automated email. Please do not reply.</p>
    </td></tr>
  </table>
</body></html>"""


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not local:
        return "***"
    if len(local) <= 2:
        return f"{local[0]}***@{domain}"
    return f"{local[0]}***{local[-1]}@{domain}"


def render_deletion_email(code: str, display_name: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <!-- Logo -->
    <tr><td style="text-align:center;padding-bottom:32px;">
      <span style="font-size:22px;font-weight:900;color:#111827;letter-spacing:1px;">XYTEEE</span>
    </td></tr>
    <!-- Heading -->
    <tr><td style="padding-bottom:16px;">
      <h1 style="margin:0;font-size:20px;font-weight:700;color:#111827;">Account Deletion</h1>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding-bottom:24px;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.7;">Hi {display_name if display_name else 'there'},</p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">We received a request to permanently delete your XYTEEE account. Use the code below to confirm. It expires in <strong>10 minutes</strong>.</p>
    </td></tr>
    <!-- Code -->
    <tr><td style="padding-bottom:28px;">
      <p style="margin:0 0 10px;font-size:13px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your verification code</p>
      <p style="margin:0;font-size:32px;font-weight:900;color:#111827;letter-spacing:8px;font-family:'Courier New',monospace;">{code}</p>
    </td></tr>
    <!-- Divider -->
    <tr><td style="padding-bottom:24px;"><hr style="border:none;border-top:1px solid #E5E7EB;margin:0;" /></td></tr>
    <!-- Warning -->
    <tr><td style="padding-bottom:32px;">
      <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">Didn't request this? You can safely ignore this email. Your account will remain active and unchanged.</p>
    </td></tr>
    <!-- Social Links -->
    <tr><td style="text-align:center;padding-bottom:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>
          <!-- Email -->
          <td style="padding:0 12px;">
            <a href="mailto:contact@xyteee.com" style="text-decoration:none;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:50%;background:#F3F4F6;text-align:center;vertical-align:middle;">
                    <span style="font-size:16px;line-height:36px;">&#9993;</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
          <!-- LinkedIn -->
          <td style="padding:0 12px;">
            <a href="https://www.linkedin.com/in/kawsar-hosen?utm_source=share_via&amp;utm_content=profile&amp;utm_medium=member_android" style="text-decoration:none;" target="_blank">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:50%;background:#F3F4F6;text-align:center;vertical-align:middle;">
                    <span style="font-size:14px;font-weight:900;color:#0A66C2;line-height:36px;">in</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
          <!-- Website -->
          <td style="padding:0 12px;">
            <a href="https://xyteee.com" style="text-decoration:none;" target="_blank">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:50%;background:#F3F4F6;text-align:center;vertical-align:middle;">
                    <span style="font-size:16px;line-height:36px;">&#127760;</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
    <!-- Footer -->
    <tr><td style="text-align:center;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">XYTEEE &middot; Secure Messaging<br/>This is an automated email. Please do not reply.</p>
    </td></tr>
  </table>
</body></html>"""
