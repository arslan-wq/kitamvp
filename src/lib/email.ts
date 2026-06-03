import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Absender aus verifizierter Domain (Resend). Fallback auf kitaluna-app.ch.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'KitaLuna <noreply@kitaluna-app.ch>';

export async function sendParentInvitationEmail(
  parentEmail: string,
  childFirstName: string,
  tempPassword: string
) {
  try {
    const completionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/parent/complete-profile?email=${encodeURIComponent(parentEmail)}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .code { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 6px; font-family: monospace; margin: 15px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👋 Willkommen bei KitaLuna!</h1>
        </div>
        <div class="content">
            <p>Hallo,</p>
            <p>Ihr Kind <strong>${childFirstName}</strong> wurde in unser KiTA Management System registriert!</p>
            
            <h2>Nächste Schritte:</h2>
            
            <h3>1️⃣ Vollständigen Sie Ihr Profil</h3>
            <p>Klicken Sie auf den Button unten, um Ihre persönlichen Daten einzugeben und ein sicheres Passwort zu wählen:</p>
            <center>
                <a href="${completionUrl}" class="button">Profil vervollständigen →</a>
            </center>
            
            <h3>2️⃣ Temporäres Passwort</h3>
            <p>Falls Sie den Link nicht funktioniert, können Sie sich mit folgendem Passwort einloggen:</p>
            <div class="code">
                <strong>Email:</strong> ${parentEmail}<br>
                <strong>Passwort:</strong> ${tempPassword}<br>
                <strong>URL:</strong> ${process.env.NEXT_PUBLIC_APP_URL}/auth/login
            </div>
            
            <h3>3️⃣ Funktionen im Portal</h3>
            <ul>
                <li>📋 Tagesberichte - Tägliche Aktivitäten Ihres Kindes</li>
                <li>📅 Zusatztage - Gebuchte Betreuungstage</li>
                <li>💬 Nachrichten - Direkte Kommunikation mit der KiTA</li>
                <li>🖼️ Fotos & Dokumente - Erinnerungen teilen</li>
            </ul>
            
            <p style="margin-top: 30px;">Bei Fragen kontaktieren Sie bitte die KiTA direkt.</p>
            <p>Viel Spaß im neuen Portal!</p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
                KitaLuna - Eltern Portal
            </p>
        </div>
        <div class="footer">
            <p>© 2026 KiTA Management Software. Alle Rechte vorbehalten.</p>
        </div>
    </div>
</body>
</html>
    `;

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: parentEmail,
      subject: `🎉 Willkommen! ${childFirstName} wurde registriert`,
      html: htmlContent,
    });

    if (response.error) {
      console.error(`📧 Resend lehnte Versand an ${parentEmail} ab:`, response.error);
      throw new Error(response.error.message || 'Resend error');
    }

    console.log(`✅ Email sent to ${parentEmail}`, response.data);
    return response;
  } catch (error) {
    console.error('📧 Email error:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string, name?: string) {
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1d1d1f">
      <div style="background:#555555;color:#fff;padding:28px;text-align:center;border-radius:16px 16px 0 0">
        <h1 style="margin:0">Passwort zurücksetzen</h1>
      </div>
      <div style="background:#f5f5f7;padding:28px;border-radius:0 0 16px 16px">
        <p>Hallo${name ? ' ' + name : ''},</p>
        <p>Sie haben das Zurücksetzen Ihres KitaLuna-Passworts angefordert. Klicken Sie auf den Button, um ein neues Passwort zu wählen:</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${resetUrl}" style="display:inline-block;background:#555555;color:#fff;padding:12px 28px;text-decoration:none;border-radius:12px;font-weight:bold">Neues Passwort wählen →</a>
        </p>
        <p style="color:#6e6e73;font-size:13px">Der Link ist 1 Stunde gültig. Falls Sie das nicht angefordert haben, ignorieren Sie diese E-Mail einfach.</p>
        <p style="color:#6e6e73;font-size:12px;margin-top:24px">KitaLuna</p>
      </div>
    </div>`;
  const response = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'KitaLuna – Passwort zurücksetzen',
    html,
  });
  if (response.error) {
    console.error('📧 Reset-Mail abgelehnt:', response.error);
    throw new Error(response.error.message || 'Resend error');
  }
  return response;
}

export async function sendNewMessageEmail(
  to: string,
  opts: { name?: string; senderName: string; preview: string; title?: string | null; isAnnouncement?: boolean }
) {
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  const link = `${base}/messages`;
  const heading = opts.isAnnouncement ? '📢 Neue Mitteilung' : '💬 Neue Nachricht';
  const subject = opts.isAnnouncement
    ? `Neue Mitteilung: ${opts.title || 'Ankündigung'}`
    : `Neue Nachricht von ${opts.senderName}`;
  const safePreview = (opts.preview || '').slice(0, 240);
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1d1d1f">
      <div style="background:#555555;color:#fff;padding:28px;text-align:center;border-radius:16px 16px 0 0">
        <h1 style="margin:0;font-size:22px">${heading}</h1>
      </div>
      <div style="background:#f5f5f7;padding:28px;border-radius:0 0 16px 16px">
        <p>Hallo${opts.name ? ' ' + opts.name : ''},</p>
        <p>Sie haben eine neue Mitteilung von <strong>${opts.senderName}</strong> in KitaLuna erhalten:</p>
        ${opts.title ? `<p style="font-weight:bold;margin-bottom:4px">${opts.title}</p>` : ''}
        <div style="background:#fff;border:1px solid #ddd;border-radius:12px;padding:14px;color:#48484a">${safePreview}</div>
        <p style="text-align:center;margin:24px 0">
          <a href="${link}" style="display:inline-block;background:#555555;color:#fff;padding:12px 28px;text-decoration:none;border-radius:12px;font-weight:bold">Mitteilung ansehen →</a>
        </p>
        <p style="color:#6e6e73;font-size:12px;margin-top:24px">KitaLuna – Eltern Portal</p>
      </div>
    </div>`;
  const response = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  if (response.error) throw new Error(response.error.message || 'Resend error');
  return response;
}

export async function sendDailyReportEmail(
  to: string,
  opts: { parentName?: string; childName: string; dateLabel: string }
) {
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  const link = `${base}/daily-reports`;
  const subject = `Tagesbericht für ${opts.childName} – ${opts.dateLabel}`;
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1d1d1f">
      <div style="background:#555555;color:#fff;padding:28px;text-align:center;border-radius:16px 16px 0 0">
        <h1 style="margin:0;font-size:22px">📋 Neuer Tagesbericht</h1>
      </div>
      <div style="background:#f5f5f7;padding:28px;border-radius:0 0 16px 16px">
        <p>Hallo${opts.parentName ? ' ' + opts.parentName : ''},</p>
        <p>für <strong>${opts.childName}</strong> wurde ein neuer Tagesbericht vom <strong>${opts.dateLabel}</strong> erfasst.</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${link}" style="display:inline-block;background:#555555;color:#fff;padding:12px 28px;text-decoration:none;border-radius:12px;font-weight:bold">Tagesbericht ansehen →</a>
        </p>
        <p style="color:#6e6e73;font-size:12px;margin-top:24px">KitaLuna – Eltern Portal</p>
      </div>
    </div>`;
  const response = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  if (response.error) throw new Error(response.error.message || 'Resend error');
  return response;
}

export async function sendActivityEmail(
  to: string,
  opts: { parentName?: string; childName: string; activityLabel: string; timeLabel: string; details?: string | null }
) {
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  const link = `${base}/children`;
  const subject = `Aktivität: ${opts.childName} – ${opts.activityLabel}`;
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1d1d1f">
      <div style="background:#555555;color:#fff;padding:28px;text-align:center;border-radius:16px 16px 0 0">
        <h1 style="margin:0;font-size:22px">📊 Neue Aktivität</h1>
      </div>
      <div style="background:#f5f5f7;padding:28px;border-radius:0 0 16px 16px">
        <p>Hallo${opts.parentName ? ' ' + opts.parentName : ''},</p>
        <p>für <strong>${opts.childName}</strong> wurde eine Aktivität erfasst:</p>
        <div style="background:#fff;border:1px solid #ddd;border-radius:12px;padding:14px">
          <strong>${opts.activityLabel}</strong> · ${opts.timeLabel}${opts.details ? `<br><span style="color:#48484a">${opts.details}</span>` : ''}
        </div>
        <p style="text-align:center;margin:24px 0">
          <a href="${link}" style="display:inline-block;background:#555555;color:#fff;padding:12px 28px;text-decoration:none;border-radius:12px;font-weight:bold">Im Portal ansehen →</a>
        </p>
        <p style="color:#6e6e73;font-size:12px;margin-top:24px">KitaLuna – Eltern Portal</p>
      </div>
    </div>`;
  const response = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  if (response.error) throw new Error(response.error.message || 'Resend error');
  return response;
}

export async function sendStaffAssignmentEmail(
  to: string,
  opts: { staffName?: string; locationName: string; workingHours?: string | null }
) {
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  const link = `${base}/dashboard/schedule`;
  const subject = `Standort-Zuweisung: ${opts.locationName}`;
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1d1d1f">
      <div style="background:#555555;color:#fff;padding:28px;text-align:center;border-radius:16px 16px 0 0">
        <h1 style="margin:0;font-size:22px">📍 Neue Standort-Zuweisung</h1>
      </div>
      <div style="background:#f5f5f7;padding:28px;border-radius:0 0 16px 16px">
        <p>Hallo${opts.staffName ? ' ' + opts.staffName : ''},</p>
        <p>Du wurdest dem Standort <strong>${opts.locationName}</strong> zugewiesen.</p>
        ${opts.workingHours ? `<div style="background:#fff;border:1px solid #ddd;border-radius:12px;padding:14px"><strong>Arbeitszeiten:</strong> ${opts.workingHours}</div>` : ''}
        <p style="text-align:center;margin:24px 0">
          <a href="${link}" style="display:inline-block;background:#555555;color:#fff;padding:12px 28px;text-decoration:none;border-radius:12px;font-weight:bold">Zum Belegungsplan →</a>
        </p>
        <p style="color:#6e6e73;font-size:12px;margin-top:24px">KitaLuna</p>
      </div>
    </div>`;
  const response = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  if (response.error) throw new Error(response.error.message || 'Resend error');
  return response;
}

// Betreuungs-Anfrage (Anmeldung) oder Abmeldung durch Eltern → an zuständiges Personal/Admin
export async function sendStaffRequestEmail(
  to: string,
  opts: { kind: 'Betreuungsanfrage' | 'Abmeldung'; childName: string; periodLabel: string; parentName?: string; notes?: string | null }
) {
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  const link = `${base}/dashboard/schedule`;
  // Sauberer, eindeutiger Betreff (keine Inbox-Flut)
  const subject = `${opts.kind}: ${opts.childName} – ${opts.periodLabel}`;
  const icon = opts.kind === 'Abmeldung' ? '🚫' : '📅';
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1d1d1f">
      <div style="background:#555555;color:#fff;padding:28px;text-align:center;border-radius:16px 16px 0 0">
        <h1 style="margin:0;font-size:22px">${icon} Neue ${opts.kind}</h1>
      </div>
      <div style="background:#f5f5f7;padding:28px;border-radius:0 0 16px 16px">
        <p>${opts.parentName ? `${opts.parentName} hat` : 'Es wurde'} eine ${opts.kind.toLowerCase()} eingereicht:</p>
        <div style="background:#fff;border:1px solid #ddd;border-radius:12px;padding:14px">
          <strong>${opts.childName}</strong><br>
          <span style="color:#48484a">${opts.periodLabel}</span>
          ${opts.notes ? `<br><span style="color:#6e6e73;font-size:13px">${opts.notes}</span>` : ''}
        </div>
        <p style="text-align:center;margin:24px 0">
          <a href="${link}" style="display:inline-block;background:#555555;color:#fff;padding:12px 28px;text-decoration:none;border-radius:12px;font-weight:bold">Im Belegungsplan prüfen →</a>
        </p>
        <p style="color:#6e6e73;font-size:12px;margin-top:24px">KitaLuna</p>
      </div>
    </div>`;
  const response = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  if (response.error) throw new Error(response.error.message || 'Resend error');
  return response;
}

export async function sendWelcomeEmail(parentEmail: string, firstName: string) {
  try {
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: parentEmail,
      subject: `Willkommen ${firstName}!`,
      html: `
        <h1>Willkommen bei KitaLuna</h1>
        <p>Hallo ${firstName},</p>
        <p>Ihr Profil wurde erfolgreich erstellt!</p>
        <p>Sie können sich jetzt anmelden und die vollen Funktionen nutzen.</p>
      `,
    });

    return response;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
}
