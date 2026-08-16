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
<html lang="en">
<head><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <!-- Logo -->
        <tr><td style="text-align:center;padding-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;background:#FFFFFF;border-radius:14px;padding:10px 22px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <tr><td style="font-size:20px;font-weight:900;color:#111827;letter-spacing:-0.5px;">X Y T E E</td></tr>
          </table>
        </td></tr>
        <!-- Main Card -->
        <tr><td style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr><td style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 50%,#A855F7 100%);padding:36px 32px 32px;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;background:rgba(255,255,255,0.15);border-radius:50%;width:64px;height:64px;">
              <tr><td align="center" valign="middle" style="font-size:28px;">&#128274;</td></tr>
            </table>
            <div style="font-size:24px;font-weight:900;color:#FFFFFF;margin-top:16px;line-height:1.2;">Password Reset</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px;">Secure your account</div>
          </td></tr>
          <!-- Body -->
          <tr><td style="padding:32px 32px 12px;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111827;">Hi {display_name if display_name else 'there'} &#128075;</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.7;">We received a request to reset the password for your XYTEEE account. Enter the verification code below to continue.</p>
            <!-- Code Boxes -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;">
              <tr>
                {''.join(f'<td style="width:calc((100% - 60px) / 6);text-align:center;"><div style="background:#F9FAFB;border:2px solid {"#4F46E5" if i == 0 else "#E5E7EB"};border-radius:12px;padding:14px 0;font-size:26px;font-weight:900;color:#111827;">{digit}</div></td>' + ('<td style="width:12px;"></td>' if i < 5 else '') for i, digit in enumerate(code))}
              </tr>
            </table>
            <!-- Timer badge -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr><td style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:20px;padding:6px 16px;font-size:12px;font-weight:700;color:#92400E;text-align:center;">&#9200; Expires in 10 minutes</td></tr>
            </table>
            <!-- Divider -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F3F4F6;"></td></tr></table>
            <!-- Warning -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0;width:100%;">
              <tr><td style="background:#EFF6FF;border:1px solid #DBEAFE;border-left:4px solid #3B82F6;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#1E40AF;line-height:1.6;"><b>Didn't request this?</b> You can safely ignore this email. Your password will stay the same.</p>
              </td></tr>
            </table>
          </td></tr>
          <!-- Footer -->
          <tr><td style="padding:20px 32px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F3F4F6;"></td></tr></table>
            <p style="margin:16px 0 0;font-size:11px;color:#9CA3AF;text-align:center;line-height:1.6;">This is an automated security email from XYTEEE.<br/>Please do not reply to this message.</p>
          </td></tr>
        </td></tr>
        <!-- Bottom branding -->
        <tr><td style="text-align:center;padding:20px 0 0;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">XYTEEE &middot; Secure Messaging</p>
        </td></tr>
      </table>
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
<html lang="en">
<head><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <!-- Logo -->
        <tr><td style="text-align:center;padding-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;background:#FFFFFF;border-radius:14px;padding:10px 22px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <tr><td style="font-size:20px;font-weight:900;color:#111827;letter-spacing:-0.5px;">X Y T E E</td></tr>
          </table>
        </td></tr>
        <!-- Main Card -->
        <tr><td style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr><td style="background:linear-gradient(135deg,#DC2626 0%,#E11D48 50%,#F43F5E 100%);padding:36px 32px 32px;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;background:rgba(255,255,255,0.15);border-radius:50%;width:64px;height:64px;">
              <tr><td align="center" valign="middle" style="font-size:28px;">&#9888;&#65039;</td></tr>
            </table>
            <div style="font-size:24px;font-weight:900;color:#FFFFFF;margin-top:16px;line-height:1.2;">Account Deletion</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px;">Confirm to proceed</div>
          </td></tr>
          <!-- Body -->
          <tr><td style="padding:32px 32px 12px;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111827;">Hi {display_name if display_name else 'there'} &#128075;</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.7;">We received a request to permanently delete your XYTEEE account. Enter the verification code below to confirm this action.</p>
            <!-- Code Boxes -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;">
              <tr>
                {''.join(f'<td style="width:calc((100% - 60px) / 6);text-align:center;"><div style="background:#F9FAFB;border:2px solid {"#DC2626" if i == 0 else "#E5E7EB"};border-radius:12px;padding:14px 0;font-size:26px;font-weight:900;color:#111827;">{digit}</div></td>' + ('<td style="width:12px;"></td>' if i < 5 else '') for i, digit in enumerate(code))}
              </tr>
            </table>
            <!-- Timer badge -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr><td style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:20px;padding:6px 16px;font-size:12px;font-weight:700;color:#92400E;text-align:center;">&#9200; Expires in 10 minutes</td></tr>
            </table>
            <!-- Divider -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F3F4F6;"></td></tr></table>
            <!-- Warning -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0;width:100%;">
              <tr><td style="background:#FEF2F2;border:1px solid #FECACA;border-left:4px solid #EF4444;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#991B1B;line-height:1.6;"><b>Didn't request this?</b> You can safely ignore this email. Your account will remain active and unchanged.</p>
              </td></tr>
            </table>
          </td></tr>
          <!-- Footer -->
          <tr><td style="padding:20px 32px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F3F4F6;"></td></tr></table>
            <p style="margin:16px 0 0;font-size:11px;color:#9CA3AF;text-align:center;line-height:1.6;">This is an automated security email from XYTEEE.<br/>Please do not reply to this message.</p>
          </td></tr>
        </td></tr>
        <!-- Bottom branding -->
        <tr><td style="text-align:center;padding:20px 0 0;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">XYTEEE &middot; Secure Messaging</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
