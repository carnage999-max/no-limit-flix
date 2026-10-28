'use client';

import { Flag } from 'lucide-react';

interface FlagMovieButtonProps {
    flagged: boolean;
    busy?: boolean;
    onFlag: (reason?: string) => void;
    onUnflag: () => void;
}

/** Admin control to mark a movie's metadata as suspected wrong, or to clear that mark. */
export default function FlagMovieButton({ flagged, busy = false, onFlag, onUnflag }: FlagMovieButtonProps) {
    const handleClick = (event: React.MouseEvent) => {
        // Sits next to links and cards; a click here must not open the movie.
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        if (flagged) {
            onUnflag();
            return;
        }
        const reason = window.prompt('What looks wrong? (poster, title, year, description...) Optional.');
        if (reason === null) return;
        onFlag(reason.trim() || undefined);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={busy}
            aria-pressed={flagged}
            title={flagged ? 'Clear the flag on this movie' : 'Flag this movie as having wrong metadata'}
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
