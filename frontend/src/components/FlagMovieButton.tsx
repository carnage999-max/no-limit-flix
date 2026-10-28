'use client';

import { Flag } from 'lucide-react';

interface FlagMovieButtonProps {
    flagged: boolean;
    busy?: boolean;
    onFlag: () => void;
    onUnflag: () => void;
    /** Icon-only circular button, for sitting on top of a poster tile rather than under a row. */
    compact?: boolean;
}

/** Admin control to mark a movie's metadata as suspected wrong, or to clear that mark. */
export default function FlagMovieButton({ flagged, busy = false, onFlag, onUnflag, compact = false }: FlagMovieButtonProps) {
    const handleClick = (event: React.MouseEvent) => {
        // Sits next to links and cards; a click here must not open the movie.
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        // One click, no questions asked — flagging is a quick "this looks wrong, come back to it"
        // marker, and the movie itself shows whoever picks it up what needs checking.
        if (flagged) onUnflag();
        else onFlag();
    };

    const label = flagged ? 'Clear the flag on this movie' : 'Flag this movie as having wrong metadata';

    if (compact) {
        return (
            <button
                type="button"
                onClick={handleClick}
                disabled={busy}
                aria-pressed={flagged}
                aria-label={label}
                title={label}
                style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(11, 11, 13, 0.7)',
                    border: flagged ? '1px solid rgba(248, 113, 113, 0.5)' : '1px solid rgba(212, 175, 55, 0.2)',
                    cursor: busy ? 'wait' : 'pointer',
                    opacity: busy ? 0.5 : flagged ? 1 : 0.6,
                    transition: 'all 0.2s',
                }}
            >
                <Flag size={16} color={flagged ? '#F87171' : '#D4AF37'} fill={flagged ? '#F87171' : 'none'} />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={busy}
            aria-pressed={flagged}
            title={label}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                minHeight: '32px',
                padding: '0.3rem 0.7rem',
                borderRadius: '999px',
                border: flagged ? '1px solid rgba(248, 113, 113, 0.55)' : '1px solid rgba(167, 171, 180, 0.3)',
                background: flagged ? 'rgba(248, 113, 113, 0.14)' : 'transparent',
                color: flagged ? '#F87171' : '#A7ABB4',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.6 : 1,
            }}
        >
            <Flag className="w-3 h-3" fill={flagged ? '#F87171' : 'none'} />
            {flagged ? 'Flagged · Clear' : 'Flag metadata'}
        </button>
    );
}
