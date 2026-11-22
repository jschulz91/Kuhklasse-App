// Gemeinsame Bedienelemente: Vollbild und Elternbereich.

/** Vollbild-Knopf. Wird versteckt, wenn das Gerät kein Vollbild kann (z. B. iPhone). */
export function richteVollbildEin(knopf) {
  const wurzel = document.documentElement;
  const kann = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (!kann) {
    knopf.hidden = true;
    return;
  }

  const aktiv = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);

  const aktualisiere = () => {
    const an = aktiv();
    knopf.setAttribute('aria-pressed', String(an));
    knopf.setAttribute('aria-label', an ? 'Vollbild beenden' : 'Vollbild');
    knopf.dataset.vollbild = an ? 'an' : 'aus';
  };

  knopf.addEventListener('click', async () => {
    try {
      if (aktiv()) {
        await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
      } else {
        await (wurzel.requestFullscreen?.() ?? wurzel.webkitRequestFullscreen?.());
      }
    } catch {
      /* vom Browser abgelehnt – nichts zu tun */
    }
  });

  document.addEventListener('fullscreenchange', aktualisiere);
  document.addEventListener('webkitfullscreenchange', aktualisiere);
  aktualisiere();
}

/** Einklappbare Seitenleiste. Startet immer eingeklappt. */
export function richteElternbereichEin({ oeffner, leiste, schliesser }) {
  const oeffnen = () => {
    leiste.hidden = false;
    oeffner.setAttribute('aria-expanded', 'true');
    schliesser.focus();
  };
  const schliessen = () => {
    leiste.hidden = true;
    oeffner.setAttribute('aria-expanded', 'false');
    oeffner.focus();
  };

  leiste.hidden = true;
  oeffner.setAttribute('aria-expanded', 'false');
  oeffner.addEventListener('click', () => (leiste.hidden ? oeffnen() : schliessen()));
  schliesser.addEventListener('click', schliessen);
  document.addEventListener('keydown', (ereignis) => {
    if (ereignis.key === 'Escape' && !leiste.hidden) schliessen();
  });

  return { oeffnen, schliessen };
}

/** Kleiner Helfer: Element mit Attributen und Kindern bauen. */
export function el(tag, eigenschaften = {}, ...kinder) {
  const knoten = document.createElement(tag);
  for (const [name, wert] of Object.entries(eigenschaften)) {
    if (wert === undefined || wert === null || wert === false) continue;
    if (name === 'text') knoten.textContent = wert;
    else if (name === 'dataset') Object.assign(knoten.dataset, wert);
    else if (name.startsWith('on')) knoten.addEventListener(name.slice(2), wert);
    else knoten.setAttribute(name, wert === true ? '' : wert);
  }
  for (const kind of kinder.flat()) {
    if (kind !== undefined && kind !== null && kind !== false) {
      knoten.append(kind instanceof Node ? kind : String(kind));
    }
  }
  return knoten;
}
