import { useProgress } from '../../hooks/useProgress'

const R = 18
const CIRC = 2 * Math.PI * R

export default function ProgressRing() {
    const { pct, hints } = useProgress()
    const offset = CIRC - CIRC * pct / 100

    return (
        <div className="progress-ring-wrap">
            <svg width="46" height="46" viewBox="0 0 46 46">
                <circle cx="23" cy="23" r={R} fill="none" stroke="#E8E8E4" strokeWidth="4" />
                <circle
                    cx="23" cy="23" r={R} fill="none"
                    stroke="#C47B3A" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={offset}
                    transform="rotate(-90 23 23)"
                    style={{ transition: 'stroke-dashoffset .4s ease' }}
                />
                <text x="23" y="27" textAnchor="middle" fontSize="10" fontWeight="600" fill="#0D0D0F">{pct}%</text>
            </svg>
            <div className="progress-ring-info">
                <div className="progress-ring-pct">{pct}%</div>
                <div className="progress-ring-sub">
                    {hints.length ? `Додайте: ${hints.slice(0, 3).join(', ')}` : 'Профіль повний ✓'}
                </div>
            </div>
        </div>
    )
}