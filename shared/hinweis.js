// Begrüßungshinweis beim ersten Besuch: privates Hobbyprojekt, Datenschutz.
// Wird bestätigt mit „Nicht mehr anzeigen“ (gespeichert im localStorage).
// Ändert sich der Text wesentlich, VERSION erhöhen – dann erscheint er einmal neu.

import { einstellungen } from './settings.js';
import { el } from './ui.js';

const VERSION = 1;

export function zeigeHinweisBeimErstenBesuch() {
  const speicher = einstellungen('hinweis', { bestaetigt: 0 });
  if (speicher.get('bestaetigt') >= VERSION) return;

  const merken = el('input', { type: 'checkbox', checked: true, id: 'hinweis-merken' });
  const knopf = el('button', { type: 'button', class: 'knopf-text knopf-text--voll hinweis__ok', text: 'Verstanden' });

  const dialog = el(
    'dialog',
    { class: 'hinweis', 'aria-labelledby': 'hinweis-titel' },
    el('h2', { id: 'hinweis-titel', text: 'Willkommen in der Kuhklasse' }),
    el(
      'p',
      {},
      'Die Kuhklasse ist ein ',
      el('strong', { text: 'privates Hobbyprojekt' }),
      ' eines Elternteils zum Üben zu Hause. Sie ist kein Angebot der Schule und keine geprüfte Lernsoftware.',
    ),
    el(
      'p',
      {},
      'Die Inhalte sind sorgfältig erstellt, Fehler sind trotzdem möglich. Im Zweifel gilt, was die Lehrkraft sagt. ',
      'Die Nutzung ist kostenlos und ohne Gewähr.',
    ),
    el(
      'p',
      {},
      el('strong', { text: 'Datenschutz: ' }),
      'keine Anmeldung, kein Tracking, keine Cookies, keine Werbung. Einstellungen bleiben nur in diesem Browser gespeichert. ',
      'Die Seite wird über GitHub Pages ausgeliefert, dabei verarbeitet GitHub technisch notwendige Zugriffsdaten wie die IP-Adresse.',
    ),
    el('label', { class: 'hinweis__merken' }, merken, ' Nicht mehr anzeigen'),
    el('div', { class: 'knopf-reihe' }, knopf),
  );

  knopf.addEventListener('click', () => {
    if (merken.checked) speicher.set('bestaetigt', VERSION);
    dialog.close();
    dialog.remove();
  });
  // Escape schließt nicht – der Hinweis soll bewusst bestätigt werden.
  dialog.addEventListener('cancel', (ereignis) => ereignis.preventDefault());

  document.body.append(dialog);
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  knopf.focus();
}
