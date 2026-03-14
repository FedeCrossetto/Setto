// Maps muscle name keywords → diagram region IDs
const KEYWORD_MAP = [
  ['pectoralis major', 'chest'],
  ['pectoralis minor', 'chest'],
  ['pectoralis', 'chest'],
  ['deltoid anterior', 'shoulders'],
  ['deltoid lateral', 'shoulders'],
  ['deltoid posterior', 'rear-delts'],
  ['deltoid', 'shoulders'],
  ['biceps brachii', 'biceps'],
  ['brachialis', 'biceps'],
  ['brachioradialis', 'forearms'],
  ['forearm', 'forearms'],
  ['wrist flexor', 'forearms'],
  ['wrist extensor', 'forearms'],
  ['triceps brachii', 'triceps'],
  ['triceps', 'triceps'],
  ['rectus abdominis', 'abs'],
  ['transverse abdominis', 'abs'],
  ['iliopsoas', 'abs'],
  ['abs', 'abs'],
  ['external oblique', 'obliques'],
  ['internal oblique', 'obliques'],
  ['oblique', 'obliques'],
  ['serratus', 'obliques'],
  ['quadriceps', 'quads'],
  ['rectus femoris', 'quads'],
  ['vastus lateralis', 'quads'],
  ['vastus medialis', 'quads'],
  ['vastus intermedius', 'quads'],
  ['hamstring', 'hamstrings'],
  ['biceps femoris', 'hamstrings'],
  ['semitendinosus', 'hamstrings'],
  ['semimembranosus', 'hamstrings'],
  ['gastrocnemius', 'calves'],
  ['soleus', 'calves'],
  ['tibialis', 'calves'],
  ['latissimus dorsi', 'lats'],
  ['lat ', 'lats'],
  ['trapezius', 'traps'],
  ['rhomboid', 'upper-back'],
  ['infraspinatus', 'upper-back'],
  ['teres major', 'upper-back'],
  ['teres minor', 'upper-back'],
  ['posterior deltoid', 'rear-delts'],
  ['erector spinae', 'lower-back'],
  ['quadratus lumborum', 'lower-back'],
  ['lumbar', 'lower-back'],
  ['gluteus maximus', 'glutes'],
  ['gluteus medius', 'glutes'],
  ['gluteus minimus', 'glutes'],
  ['glute', 'glutes'],
  ['sternocleidomastoid', 'neck'],
  ['neck', 'neck'],
]

function muscleToRegion(name) {
  const lower = name.toLowerCase()
  for (const [kw, region] of KEYWORD_MAP) {
    if (lower.includes(kw)) return region
  }
  return null
}

function getActiveRegions(targetMuscles = [], secondaryMuscles = []) {
  const primary = new Set()
  const secondary = new Set()
  targetMuscles.forEach(m => { const r = muscleToRegion(m); if (r) primary.add(r) })
  secondaryMuscles.forEach(m => { const r = muscleToRegion(m); if (r && !primary.has(r)) secondary.add(r) })
  return { primary, secondary }
}

function useFill(region, primary, secondary) {
  if (primary.has(region)) return { fill: '#69f59a', opacity: 1 }
  if (secondary.has(region)) return { fill: '#69f59a', opacity: 0.4 }
  return { fill: 'currentColor', opacity: 0.12 }
}

function FrontSVG({ primary, secondary }) {
  const f = (r) => useFill(r, primary, secondary)
  return (
    <svg viewBox="0 0 100 260" className="w-full h-full" aria-hidden="true">
      {/* ─── Background body silhouette ─── */}
      <g opacity="0.15" fill="currentColor">
        <ellipse cx="50" cy="16" rx="13" ry="14" />
        <rect x="44" y="29" width="12" height="11" rx="3" />
        <ellipse cx="26" cy="46" rx="11" ry="8" transform="rotate(-18 26 46)" />
        <ellipse cx="74" cy="46" rx="11" ry="8" transform="rotate(18 74 46)" />
        <rect x="30" y="38" width="40" height="38" rx="8" />
        <rect x="32" y="72" width="36" height="36" rx="6" />
        <ellipse cx="50" cy="110" rx="20" ry="9" />
        <ellipse cx="20" cy="64" rx="7" ry="19" transform="rotate(8 20 64)" />
        <ellipse cx="80" cy="64" rx="7" ry="19" transform="rotate(-8 80 64)" />
        <ellipse cx="17" cy="90" rx="6" ry="14" transform="rotate(6 17 90)" />
        <ellipse cx="83" cy="90" rx="6" ry="14" transform="rotate(-6 83 90)" />
        <ellipse cx="39" cy="140" rx="12" ry="30" />
        <ellipse cx="61" cy="140" rx="12" ry="30" />
        <ellipse cx="37" cy="192" rx="9" ry="22" />
        <ellipse cx="63" cy="192" rx="9" ry="22" />
      </g>

      {/* ─── Head (non-muscle) ─── */}
      <ellipse cx="50" cy="16" rx="13" ry="14" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.2" />

      {/* ─── Neck ─── */}
      <rect x="44" y="29" width="12" height="11" rx="3" {...f('neck')} />

      {/* ─── Shoulders (deltoid) ─── */}
      <ellipse cx="26" cy="46" rx="11" ry="8" transform="rotate(-18 26 46)" {...f('shoulders')} />
      <ellipse cx="74" cy="46" rx="11" ry="8" transform="rotate(18 74 46)" {...f('shoulders')} />

      {/* ─── Chest ─── */}
      <path d="M34,40 C28,52 30,66 34,70 C40,74 50,72 50,40 Z" {...f('chest')} />
      <path d="M66,40 C72,52 70,66 66,70 C60,74 50,72 50,40 Z" {...f('chest')} />

      {/* ─── Abs ─── */}
      <path d="M43,70 C41,80 41,96 43,104 C46,108 50,108 54,104 C57,96 59,80 57,70 Z" {...f('abs')} />

      {/* ─── Obliques ─── */}
      <path d="M34,70 C28,80 28,96 32,102 C36,106 43,104 43,100 L43,70 Z" {...f('obliques')} />
      <path d="M66,70 C72,80 72,96 68,102 C64,106 57,104 57,100 L57,70 Z" {...f('obliques')} />

      {/* ─── Biceps ─── */}
      <ellipse cx="20" cy="64" rx="7" ry="19" transform="rotate(8 20 64)" {...f('biceps')} />
      <ellipse cx="80" cy="64" rx="7" ry="19" transform="rotate(-8 80 64)" {...f('biceps')} />

      {/* ─── Forearms ─── */}
      <ellipse cx="17" cy="90" rx="6" ry="14" transform="rotate(6 17 90)" {...f('forearms')} />
      <ellipse cx="83" cy="90" rx="6" ry="14" transform="rotate(-6 83 90)" {...f('forearms')} />

      {/* ─── Quads ─── */}
      <path d="M34,110 C28,128 30,154 36,160 C40,164 48,162 50,156 L50,110 Z" {...f('quads')} />
      <path d="M66,110 C72,128 70,154 64,160 C60,164 52,162 50,156 L50,110 Z" {...f('quads')} />

      {/* ─── Calves (front/tibialis) ─── */}
      <path d="M33,162 C28,178 30,202 36,208 C40,210 46,208 48,202 C50,188 48,164 43,160 Z" {...f('calves')} />
      <path d="M67,162 C72,178 70,202 64,208 C60,210 54,208 52,202 C50,188 52,164 57,160 Z" {...f('calves')} />

      {/* ─── Labels (only for active muscles) ─── */}
      {primary.has('chest') && <text x="50" y="57" fontSize="4.5" fill="white" textAnchor="middle" fontWeight="600" opacity="0.9">Pecho</text>}
      {primary.has('abs') && <text x="50" y="89" fontSize="4" fill="white" textAnchor="middle" fontWeight="600" opacity="0.9">Abdomen</text>}
      {primary.has('quads') && <text x="50" y="138" fontSize="4" fill="white" textAnchor="middle" fontWeight="600" opacity="0.9">Cuádriceps</text>}
    </svg>
  )
}

function BackSVG({ primary, secondary }) {
  const f = (r) => useFill(r, primary, secondary)
  return (
    <svg viewBox="0 0 100 260" className="w-full h-full" aria-hidden="true">
      {/* ─── Background body silhouette ─── */}
      <g opacity="0.15" fill="currentColor">
        <ellipse cx="50" cy="16" rx="13" ry="14" />
        <rect x="44" y="29" width="12" height="11" rx="3" />
        <ellipse cx="26" cy="46" rx="11" ry="8" transform="rotate(-18 26 46)" />
        <ellipse cx="74" cy="46" rx="11" ry="8" transform="rotate(18 74 46)" />
        <rect x="28" y="38" width="44" height="74" rx="8" />
        <ellipse cx="50" cy="118" rx="22" ry="12" />
        <ellipse cx="20" cy="64" rx="7" ry="19" transform="rotate(8 20 64)" />
        <ellipse cx="80" cy="64" rx="7" ry="19" transform="rotate(-8 80 64)" />
        <ellipse cx="17" cy="90" rx="6" ry="14" transform="rotate(6 17 90)" />
        <ellipse cx="83" cy="90" rx="6" ry="14" transform="rotate(-6 83 90)" />
        <ellipse cx="39" cy="152" rx="12" ry="30" />
        <ellipse cx="61" cy="152" rx="12" ry="30" />
        <ellipse cx="37" cy="200" rx="9" ry="22" />
        <ellipse cx="63" cy="200" rx="9" ry="22" />
      </g>

      {/* ─── Head ─── */}
      <ellipse cx="50" cy="16" rx="13" ry="14" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.2" />

      {/* ─── Neck ─── */}
      <rect x="44" y="29" width="12" height="11" rx="3" {...f('neck')} />

      {/* ─── Rear Deltoids ─── */}
      <ellipse cx="26" cy="46" rx="11" ry="8" transform="rotate(-18 26 46)" {...f('rear-delts')} />
      <ellipse cx="74" cy="46" rx="11" ry="8" transform="rotate(18 74 46)" {...f('rear-delts')} />

      {/* ─── Traps ─── */}
      <path d="M34,34 C26,42 28,60 38,66 L50,60 L62,66 C72,60 74,42 66,34 C60,28 40,28 34,34 Z" {...f('traps')} />

      {/* ─── Upper Back (rhomboids / mid-traps) ─── */}
      <path d="M40,64 C36,76 36,90 40,96 L50,92 L60,96 C64,90 64,76 60,64 Z" {...f('upper-back')} />

      {/* ─── Lats ─── */}
      <path d="M28,60 C22,72 24,96 32,104 C36,108 42,104 42,98 C40,80 36,64 30,58 Z" {...f('lats')} />
      <path d="M72,60 C78,72 76,96 68,104 C64,108 58,104 58,98 C60,80 64,64 70,58 Z" {...f('lats')} />

      {/* ─── Lower Back ─── */}
      <path d="M38,96 C34,106 36,116 40,120 L50,122 L60,120 C64,116 66,106 62,96 Z" {...f('lower-back')} />

      {/* ─── Triceps ─── */}
      <ellipse cx="20" cy="64" rx="7" ry="19" transform="rotate(8 20 64)" {...f('triceps')} />
      <ellipse cx="80" cy="64" rx="7" ry="19" transform="rotate(-8 80 64)" {...f('triceps')} />

      {/* ─── Forearms (back) ─── */}
      <ellipse cx="17" cy="90" rx="6" ry="14" transform="rotate(6 17 90)" {...f('forearms')} />
      <ellipse cx="83" cy="90" rx="6" ry="14" transform="rotate(-6 83 90)" {...f('forearms')} />

      {/* ─── Glutes ─── */}
      <path d="M32,120 C26,132 28,148 38,154 C44,158 50,156 50,150 C50,150 50,156 50,150 C50,156 56,158 62,154 C72,148 74,132 68,120 Z" {...f('glutes')} />

      {/* ─── Hamstrings ─── */}
      <path d="M33,154 C27,172 29,196 36,202 C40,206 48,204 50,198 L50,154 Z" {...f('hamstrings')} />
      <path d="M67,154 C73,172 71,196 64,202 C60,206 52,204 50,198 L50,154 Z" {...f('hamstrings')} />

      {/* ─── Calves (back) ─── */}
      <path d="M32,204 C27,220 29,242 36,248 C40,250 46,248 48,242 C50,228 48,206 43,202 Z" {...f('calves')} />
      <path d="M68,204 C73,220 71,242 64,248 C60,250 54,248 52,242 C50,228 52,206 57,202 Z" {...f('calves')} />

      {/* ─── Labels ─── */}
      {primary.has('traps') && <text x="50" y="50" fontSize="4" fill="white" textAnchor="middle" fontWeight="600" opacity="0.9">Trapecio</text>}
      {primary.has('lats') && <text x="50" y="84" fontSize="4" fill="white" textAnchor="middle" fontWeight="600" opacity="0.9">Dorsales</text>}
      {primary.has('glutes') && <text x="50" y="140" fontSize="4" fill="white" textAnchor="middle" fontWeight="600" opacity="0.9">Glúteos</text>}
      {primary.has('hamstrings') && <text x="50" y="178" fontSize="4" fill="white" textAnchor="middle" fontWeight="600" opacity="0.9">Isquios</text>}
    </svg>
  )
}

const REGION_LABELS = {
  chest: 'Pecho',
  shoulders: 'Hombros',
  'rear-delts': 'Deltoides Post.',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazos',
  abs: 'Abdomen',
  obliques: 'Oblicuos',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  calves: 'Gemelos',
  glutes: 'Glúteos',
  traps: 'Trapecio',
  'upper-back': 'Espalda Alta',
  lats: 'Dorsales',
  'lower-back': 'Lumbar',
  neck: 'Cuello',
}

export default function MuscleDiagram({ targetMuscles = [], secondaryMuscles = [] }) {
  const { primary, secondary } = getActiveRegions(targetMuscles, secondaryMuscles)

  const primaryList = [...primary].map(r => REGION_LABELS[r]).filter(Boolean)
  const secondaryList = [...secondary].map(r => REGION_LABELS[r]).filter(Boolean)

  return (
    <div>
      <div className="flex gap-3 h-52">
        {/* Front view */}
        <div className="flex-1 relative">
          <div className="absolute inset-x-0 top-0 text-center">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Frente</span>
          </div>
          <div className="h-full text-text-secondary">
            <FrontSVG primary={primary} secondary={secondary} />
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-border self-stretch" />

        {/* Back view */}
        <div className="flex-1 relative">
          <div className="absolute inset-x-0 top-0 text-center">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Espalda</span>
          </div>
          <div className="h-full text-text-secondary">
            <BackSVG primary={primary} secondary={secondary} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {primaryList.map(label => (
          <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-text">
            <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
            {label}
          </span>
        ))}
        {secondaryList.map(label => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full bg-primary opacity-40 shrink-0" />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
