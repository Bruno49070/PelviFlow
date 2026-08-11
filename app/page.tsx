"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AppTab = "routine" | "history" | "settings";
type RunStatus = "ready" | "running" | "paused" | "completed";
type Motion =
  | "breathe"
  | "linear"
  | "down-hold"
  | "cooldown";

type Settings = {
  warmup: number;
  slowContract: number;
  slowRelease: number;
  quickPulse: number;
  reverseHold: number;
  reverseReturn: number;
  lightKegel: number;
  alternateReverse: number;
  cooldown: number;
  phaseSound: boolean;
  breathSound: boolean;
  vibration: boolean;
};

type Segment = {
  id: string;
  phase: string;
  shortPhase: string;
  instruction: string;
  action: string;
  duration: number;
  from: number;
  to: number;
  motion: Motion;
  repetition?: number;
  repetitions?: number;
  cue: "neutral" | "contract" | "release";
};

type HistoryEntry = {
  id: string;
  date: string;
  duration: number;
};

const DEFAULT_SETTINGS: Settings = {
  warmup: 120,
  slowContract: 7,
  slowRelease: 7,
  quickPulse: 1,
  reverseHold: 7,
  reverseReturn: 3,
  lightKegel: 3,
  alternateReverse: 7,
  cooldown: 90,
  phaseSound: true,
  breathSound: false,
  vibration: false,
};

const PHASES = [
  "Échauffement",
  "Kegels lents",
  "Kegels rapides",
  "Reverse Kegels",
  "Alternance",
  "Relâchement",
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function easeInOut(value: number) {
  return value < 0.5
    ? 2 * value * value
    : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function formatLongDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

function buildSegments(settings: Settings): Segment[] {
  const segments: Segment[] = [
    {
      id: "warmup",
      phase: "Échauffement",
      shortPhase: "1 sur 6",
      instruction: "Respire profondément, détends le bassin",
      action: "RESPIRATION",
      duration: settings.warmup,
      from: 50,
      to: 50,
      motion: "breathe",
      cue: "neutral",
    },
  ];

  for (let rep = 1; rep <= 10; rep += 1) {
    segments.push(
      {
        id: `slow-up-${rep}`,
        phase: "Kegels lents",
        shortPhase: "2 sur 6",
        instruction: "Contracte progressivement vers le haut",
        action: "CONTRACTE",
        duration: settings.slowContract,
        from: 50,
        to: 92,
        motion: "linear",
        repetition: rep,
        repetitions: 10,
        cue: "contract",
      },
      {
        id: `slow-down-${rep}`,
        phase: "Kegels lents",
        shortPhase: "2 sur 6",
        instruction: "Relâche doucement jusqu’au neutre",
        action: "RELÂCHE",
        duration: settings.slowRelease,
        from: 92,
        to: 50,
        motion: "linear",
        repetition: rep,
        repetitions: 10,
        cue: "release",
      },
    );
  }

  for (let rep = 1; rep <= 15; rep += 1) {
    segments.push(
      {
        id: `quick-up-${rep}`,
        phase: "Kegels rapides",
        shortPhase: "3 sur 6",
        instruction: "Impulsion brève vers le haut",
        action: "CONTRACTE",
        duration: settings.quickPulse,
        from: 50,
        to: 88,
        motion: "linear",
        repetition: rep,
        repetitions: 15,
        cue: "contract",
      },
      {
        id: `quick-down-${rep}`,
        phase: "Kegels rapides",
        shortPhase: "3 sur 6",
        instruction: "Reviens immédiatement au neutre",
        action: "RELÂCHE",
        duration: settings.quickPulse,
        from: 88,
        to: 50,
        motion: "linear",
        repetition: rep,
        repetitions: 15,
        cue: "release",
      },
    );
  }

  for (let rep = 1; rep <= 10; rep += 1) {
    segments.push(
      {
        id: `reverse-down-${rep}`,
        phase: "Reverse Kegels",
        shortPhase: "4 sur 6",
        instruction: "Ouvre et relâche activement vers le bas",
        action: "REVERSE KEGEL",
        duration: settings.reverseHold,
        from: 50,
        to: 8,
        motion: "down-hold",
        repetition: rep,
        repetitions: 10,
        cue: "release",
      },
      {
        id: `reverse-return-${rep}`,
        phase: "Reverse Kegels",
        shortPhase: "4 sur 6",
        instruction: "Reviens doucement au neutre",
        action: "NEUTRE",
        duration: settings.reverseReturn,
        from: 8,
        to: 50,
        motion: "linear",
        repetition: rep,
        repetitions: 10,
        cue: "neutral",
      },
    );
  }

  for (let rep = 1; rep <= 10; rep += 1) {
    segments.push(
      {
        id: `alternate-up-${rep}`,
        phase: "Alternance",
        shortPhase: "5 sur 6",
        instruction: "Une contraction légère, sans forcer",
        action: "KEGEL LÉGER",
        duration: settings.lightKegel,
        from: rep === 1 ? 50 : 8,
        to: 65,
        motion: "linear",
        repetition: rep,
        repetitions: 10,
        cue: "contract",
      },
      {
        id: `alternate-down-${rep}`,
        phase: "Alternance",
        shortPhase: "5 sur 6",
        instruction: "Puis un relâchement long et ample",
        action: "REVERSE KEGEL",
        duration: settings.alternateReverse,
        from: 65,
        to: 8,
        motion: "linear",
        repetition: rep,
        repetitions: 10,
        cue: "release",
      },
    );
  }

  segments.push({
    id: "cooldown",
    phase: "Relâchement",
    shortPhase: "6 sur 6",
    instruction: "Laisse tout se relâcher, respire calmement",
    action: "RESPIRATION",
    duration: settings.cooldown,
    from: 8,
    to: 43,
    motion: "cooldown",
    cue: "release",
  });

  return segments;
}

function segmentPosition(segment: Segment, elapsed: number) {
  const progress = clamp(elapsed / segment.duration, 0, 1);
  if (segment.motion === "breathe") {
    return 50 + Math.sin(progress * Math.PI * 12 - Math.PI / 2) * 4;
  }
  if (segment.motion === "down-hold") {
    const travel = clamp(progress / 0.28, 0, 1);
    return lerp(segment.from, segment.to, easeInOut(travel));
  }
  if (segment.motion === "cooldown") {
    const settling = easeInOut(clamp(progress * 8, 0, 1));
    const center = lerp(segment.from, segment.to, settling);
    return center + Math.sin(progress * Math.PI * 10 - Math.PI / 2) * 3;
  }
  return lerp(segment.from, segment.to, easeInOut(progress));
}

function getTimelinePosition(segments: Segment[], elapsed: number) {
  let passed = 0;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (elapsed < passed + segment.duration || index === segments.length - 1) {
      return {
        index,
        segment,
        localElapsed: clamp(elapsed - passed, 0, segment.duration),
        segmentStart: passed,
      };
    }
    passed += segment.duration;
  }
  return {
    index: segments.length - 1,
    segment: segments[segments.length - 1],
    localElapsed: segments[segments.length - 1].duration,
    segmentStart: passed,
  };
}

function playTone(frequency = 480, duration = 0.12) {
  if (typeof window === "undefined") return;
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return;
  const context = new AudioCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    context.currentTime + duration,
  );
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.02);
  oscillator.addEventListener("ended", () => context.close());
}

function playBreathCue(cue: Segment["cue"]) {
  if (typeof window === "undefined") return;
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return;
  const context = new AudioCtor();
  const duration = 0.48;
  const buffer = context.createBuffer(
    1,
    Math.floor(context.sampleRate * duration),
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = cue === "contract" ? 880 : 560;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.linearRampToValueAtTime(0.045, context.currentTime + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.connect(filter).connect(gain).connect(context.destination);
  source.start();
  source.addEventListener("ended", () => context.close());
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`toggle-row ${disabled ? "is-disabled" : ""}`}>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle" aria-hidden="true">
        <span />
      </span>
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={`slider-row ${disabled ? "is-disabled" : ""}`}>
      <span>
        <strong>{label}</strong>
        <output>{value} s</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function Home() {
  const [tab, setTab] = useState<AppTab>("routine");
  const [status, setStatus] = useState<RunStatus>("ready");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const clockOrigin = useRef(0);
  const previousSegment = useRef(-1);
  const sessionSaved = useRef(false);

  const segments = useMemo(() => buildSegments(settings), [settings]);
  const totalDuration = useMemo(
    () => segments.reduce((sum, segment) => sum + segment.duration, 0),
    [segments],
  );
  const timeline = useMemo(
    () => getTimelinePosition(segments, elapsed),
    [segments, elapsed],
  );

  const phaseSegments = segments.filter(
    (segment) => segment.phase === timeline.segment.phase,
  );
  const phaseDuration = phaseSegments.reduce(
    (sum, segment) => sum + segment.duration,
    0,
  );
  let phasePassed = 0;
  for (const segment of phaseSegments) {
    if (segment.id === timeline.segment.id) break;
    phasePassed += segment.duration;
  }
  const phaseProgress = clamp(
    (phasePassed + timeline.localElapsed) / phaseDuration,
    0,
    1,
  );
  const bubblePosition = segmentPosition(
    timeline.segment,
    timeline.localElapsed,
  );
  const phaseNumber = PHASES.indexOf(timeline.segment.phase) + 1;
  const repetitionsRemaining = timeline.segment.repetitions
    ? timeline.segment.repetitions - (timeline.segment.repetition ?? 1) + 1
    : null;
  const isLocked = status === "running" || status === "paused";

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("pelviflow-settings");
      const savedHistory = localStorage.getItem("pelviflow-history");
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch {
      // Keep safe defaults when local data is unavailable or malformed.
    }
    setHydrated(true);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("pelviflow-settings", JSON.stringify(settings));
  }, [hydrated, settings]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("pelviflow-history", JSON.stringify(history));
  }, [history, hydrated]);

  useEffect(() => {
    if (status !== "running") return;
    let animationFrame = 0;
    const tick = () => {
      const nextElapsed = (Date.now() - clockOrigin.current) / 1000;
      if (nextElapsed >= totalDuration) {
        setElapsed(totalDuration);
        setStatus("completed");
        return;
      }
      setElapsed(nextElapsed);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [status, totalDuration]);

  useEffect(() => {
    if (status !== "running" || previousSegment.current === timeline.index) {
      return;
    }
    const previous =
      previousSegment.current >= 0 ? segments[previousSegment.current] : null;
    const phaseChanged = previous && previous.phase !== timeline.segment.phase;
    if (settings.phaseSound && phaseChanged) playTone(510, 0.16);
    if (settings.breathSound) playBreathCue(timeline.segment.cue);
    if (settings.vibration && "vibrate" in navigator) {
      navigator.vibrate(phaseChanged ? [45, 35, 45] : 40);
    }
    previousSegment.current = timeline.index;
  }, [segments, settings, status, timeline.index, timeline.segment]);

  useEffect(() => {
    if (status !== "completed" || sessionSaved.current) return;
    const entry: HistoryEntry = {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      duration: totalDuration,
    };
    setHistory((current) => [entry, ...current].slice(0, 60));
    sessionSaved.current = true;
    if (settings.phaseSound) playTone(620, 0.28);
    if (settings.vibration && "vibrate" in navigator) navigator.vibrate([60, 50, 90]);
  }, [settings.phaseSound, settings.vibration, status, totalDuration]);

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function startRoutine() {
    if (status === "completed") setElapsed(0);
    const startAt = status === "paused" ? elapsed : 0;
    clockOrigin.current = Date.now() - startAt * 1000;
    previousSegment.current = -1;
    sessionSaved.current = false;
    setElapsed(startAt);
    setStatus("running");
    setTab("routine");
    if (settings.phaseSound) playTone(420, 0.12);
  }

  function pauseRoutine() {
    setStatus("paused");
  }

  function resetRoutine() {
    setStatus("ready");
    setElapsed(0);
    previousSegment.current = -1;
    sessionSaved.current = false;
  }

  function skipPhase() {
    const currentPhase = timeline.segment.phase;
    let nextPhaseStart = timeline.segmentStart;
    let nextPhaseIndex = timeline.index;

    for (let index = timeline.index; index < segments.length; index += 1) {
      if (segments[index].phase !== currentPhase) {
        nextPhaseIndex = index;
        break;
      }
      nextPhaseStart += segments[index].duration;
    }

    if (nextPhaseIndex === timeline.index) return;
    clockOrigin.current = Date.now() - nextPhaseStart * 1000;
    previousSegment.current = timeline.index;
    setElapsed(nextPhaseStart);
  }

  function clearHistory() {
    setHistory([]);
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <button
          className="brand"
          onClick={() => setTab("routine")}
          aria-label="Retour à la routine"
        >
          <span className="brand-mark"><span /></span>
          <span>PelviFlow</span>
        </button>
        <div className="session-total" aria-label="Durée de la routine">
          <span>ROUTINE</span>
          <strong>{formatTime(totalDuration)}</strong>
        </div>
      </header>

      <section className={`screen ${tab === "routine" ? "active" : ""}`}>
        <div className="routine-card">
          <div className="phase-heading" aria-live="polite">
            <div>
              <span className="eyebrow">PHASE {phaseNumber} · {timeline.segment.shortPhase}</span>
              <h1>{timeline.segment.phase}</h1>
            </div>
            {repetitionsRemaining !== null && (
              <div className="rep-badge">
                <strong>{repetitionsRemaining}</strong>
                <span>restante{repetitionsRemaining > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          <div className="phase-progress" aria-hidden="true">
            <span style={{ width: `${phaseProgress * 100}%` }} />
          </div>

          <div className="guide-area">
            <div className="gauge-copy gauge-copy-top">
              <strong>CONTRACTION</strong>
              <span>maximale</span>
            </div>
            <div className="gauge-copy gauge-copy-mid">
              <strong>NEUTRE</strong>
            </div>
            <div className="gauge-copy gauge-copy-bottom">
              <strong>RELÂCHEMENT</strong>
              <span>maximal</span>
            </div>

            <div
              className={`vertical-gauge cue-${timeline.segment.cue}`}
              role="img"
              aria-label={`Niveau guidé : ${Math.round(bubblePosition)} pour cent`}
            >
              <div className="gauge-line" />
              <span className="tick tick-top" />
              <span className="tick tick-mid" />
              <span className="tick tick-bottom" />
              <div
                className="guide-bubble"
                style={{ top: `${100 - bubblePosition}%` }}
              >
                <span />
              </div>
            </div>

            {status === "paused" && (
              <div className="pause-overlay"><span>EN PAUSE</span></div>
            )}
          </div>

          <div className="instruction" aria-live="polite">
            <span className={`action action-${timeline.segment.cue}`}>
              {status === "ready"
                ? "PRÊT ?"
                : status === "completed"
                  ? "TERMINÉ"
                  : timeline.segment.action}
            </span>
            <p>
              {status === "ready"
                ? "Installe-toi confortablement et relâche les épaules"
                : status === "completed"
                  ? "Routine terminée. Prends un instant avant de te relever."
                  : timeline.segment.instruction}
            </p>
          </div>

          <div className="timer-row">
            <div>
              <span>ÉTAPE</span>
              <strong>{formatTime(timeline.segment.duration - timeline.localElapsed)}</strong>
            </div>
            <div className="overall-time">
              <span>RESTANT</span>
              <strong>{formatTime(totalDuration - elapsed)}</strong>
            </div>
          </div>

          <div className="controls">
            {status === "ready" && (
              <button className="primary-button" onClick={startRoutine}>
                <span className="play-icon" aria-hidden="true" />
                Démarrer la routine
              </button>
            )}
            {status === "running" && (
              <div className="control-row">
                <button className="primary-button" onClick={pauseRoutine}>
                  <span className="pause-icon" aria-hidden="true" />
                  Mettre en pause
                </button>
                {phaseNumber < PHASES.length && (
                  <button
                    className="skip-button"
                    onClick={skipPhase}
                    aria-label={`Passer à la phase ${PHASES[phaseNumber]}`}
                  >
                    Passer
                    <span className="skip-icon" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {status === "paused" && (
              <>
                <div className="control-row">
                  <button className="primary-button" onClick={startRoutine}>
                    <span className="play-icon" aria-hidden="true" />
                    Reprendre
                  </button>
                  {phaseNumber < PHASES.length && (
                    <button
                      className="skip-button"
                      onClick={skipPhase}
                      aria-label={`Passer à la phase ${PHASES[phaseNumber]}`}
                    >
                      Passer
                      <span className="skip-icon" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <button className="secondary-button" onClick={resetRoutine}>
                  Arrêter
                </button>
              </>
            )}
            {status === "completed" && (
              <button className="primary-button" onClick={resetRoutine}>
                Recommencer
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={`screen secondary-screen ${tab === "history" ? "active" : ""}`}>
        <div className="page-heading">
          <span className="eyebrow">PROGRESSION</span>
          <h1>Historique</h1>
          <p>Les séances sont enregistrées uniquement sur cet appareil.</p>
        </div>
        <div className="summary-grid">
          <article>
            <span>SÉANCES</span>
            <strong>{history.length}</strong>
          </article>
          <article>
            <span>TEMPS TOTAL</span>
            <strong>{formatLongDuration(history.reduce((sum, item) => sum + item.duration, 0))}</strong>
          </article>
        </div>
        <div className="history-list">
          {history.length === 0 ? (
            <div className="empty-state">
              <span className="empty-bubble" />
              <h2>Aucune séance pour le moment</h2>
              <p>Ta première routine terminée apparaîtra ici.</p>
              <button onClick={() => setTab("routine")}>Commencer</button>
            </div>
          ) : (
            history.map((item) => {
              const date = new Date(item.date);
              return (
                <article className="history-item" key={item.id}>
                  <div className="history-check">✓</div>
                  <div>
                    <strong>{date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</strong>
                    <span>{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <b>{formatLongDuration(item.duration)}</b>
                </article>
              );
            })
          )}
        </div>
        {history.length > 0 && (
          <button className="clear-button" onClick={clearHistory}>Effacer l’historique</button>
        )}
      </section>

      <section className={`screen secondary-screen ${tab === "settings" ? "active" : ""}`}>
        <div className="page-heading">
          <span className="eyebrow">PERSONNALISATION</span>
          <h1>Réglages</h1>
          <p>Adapte la routine à ton rythme, sans dépasser ton confort.</p>
        </div>
        {isLocked && (
          <div className="locked-note">Termine ou arrête la séance pour modifier les durées.</div>
        )}
        <div className="settings-card">
          <div className="settings-title">
            <h2>Durées</h2>
            <span>{formatTime(totalDuration)} au total</span>
          </div>
          <Slider label="Échauffement" value={settings.warmup} min={60} max={180} disabled={isLocked} onChange={(value) => updateSetting("warmup", value)} />
          <Slider label="Kegel lent · contraction" value={settings.slowContract} min={5} max={8} disabled={isLocked} onChange={(value) => updateSetting("slowContract", value)} />
          <Slider label="Kegel lent · relâchement" value={settings.slowRelease} min={6} max={8} disabled={isLocked} onChange={(value) => updateSetting("slowRelease", value)} />
          <Slider label="Kegel rapide · impulsion" value={settings.quickPulse} min={1} max={2} disabled={isLocked} onChange={(value) => updateSetting("quickPulse", value)} />
          <Slider label="Reverse Kegel · maintien" value={settings.reverseHold} min={6} max={8} disabled={isLocked} onChange={(value) => updateSetting("reverseHold", value)} />
          <Slider label="Retour au neutre" value={settings.reverseReturn} min={2} max={5} disabled={isLocked} onChange={(value) => updateSetting("reverseReturn", value)} />
          <Slider label="Alternance · Kegel léger" value={settings.lightKegel} min={2} max={3} disabled={isLocked} onChange={(value) => updateSetting("lightKegel", value)} />
          <Slider label="Alternance · Reverse Kegel" value={settings.alternateReverse} min={6} max={8} disabled={isLocked} onChange={(value) => updateSetting("alternateReverse", value)} />
          <Slider label="Relâchement final" value={settings.cooldown} min={60} max={120} disabled={isLocked} onChange={(value) => updateSetting("cooldown", value)} />
        </div>
        <div className="settings-card">
          <div className="settings-title"><h2>Guidage</h2></div>
          <Toggle label="Bip de phase" description="Signal discret entre les six phases" checked={settings.phaseSound} onChange={(value) => updateSetting("phaseSound", value)} />
          <Toggle label="Souffle sonore" description="Repère doux aux changements d’effort" checked={settings.breathSound} onChange={(value) => updateSetting("breathSound", value)} />
          <Toggle label="Vibrations" description="Retour haptique à chaque mouvement" checked={settings.vibration} onChange={(value) => updateSetting("vibration", value)} />
        </div>
        <button
          className="reset-settings"
          disabled={isLocked}
          onClick={() => setSettings(DEFAULT_SETTINGS)}
        >
          Restaurer les réglages d’origine
        </button>
      </section>

      <nav className="bottom-nav" aria-label="Navigation principale">
        <button className={tab === "routine" ? "selected" : ""} onClick={() => setTab("routine")}>
          <span className="nav-gauge" aria-hidden="true"><i /></span>
          <span>Routine</span>
        </button>
        <button className={tab === "history" ? "selected" : ""} onClick={() => setTab("history")}>
          <span className="nav-history" aria-hidden="true">✓</span>
          <span>Historique</span>
        </button>
        <button className={tab === "settings" ? "selected" : ""} onClick={() => setTab("settings")}>
          <span className="nav-settings" aria-hidden="true">•••</span>
          <span>Réglages</span>
        </button>
      </nav>
    </main>
  );
}
