import { NextResponse } from 'next/server';

// Selbst-Registrierung ist deaktiviert.
//
// Der frühere Endpoint legte einen BETREUER OHNE kitaId an → der Account war
// unbrauchbar (jede mandantengescopte Query schlug fehl: „No KiTA assigned").
// Konten werden ausschliesslich von Leitung/Admin in der Benutzerverwaltung
// angelegt (mit Einrichtung + Rolle) und per „Passwort setzen"-E-Mail aktiviert.
// Siehe CLAUDE.md §3 (Mandantenfähigkeit, RBAC).
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Selbst-Registrierung ist deaktiviert. Bitte lassen Sie sich von Ihrer Kita-Leitung in der Benutzerverwaltung hinzufügen.',
      code: 'SIGNUP_DISABLED',
    },
    { status: 403 }
  );
}
