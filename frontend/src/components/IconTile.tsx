'use client';

interface IconTileProps {
    label: string;
    imageSrc: string;
    selected?: boolean;
    onClick?: () => void;
    compact?: boolean;
    interactive?: boolean;
}

export default function IconTile({
    label,
    imageSrc,
    selected = false,
    onClick,
    compact = false,
    interactive = true,
}: IconTileProps) {
    const className = [
        'icon-tile-button',
        compact ? 'icon-tile--compact' : '',
        selected ? 'icon-tile--selected' : '',
        interactive ? 'icon-tile--interactive' : 'icon-tile--static',
    ]
        .filter(Boolean)
        .join(' ');

    if (!interactive) {
        return <img src={imageSrc} alt={label} className={`icon-tile__art ${className}`} />;
    }

    return (
        <button type="button" onClick={onClick} className={className} aria-label={label} title={label}>
            <img src={imageSrc} alt="" aria-hidden="true" className="icon-tile__art" />
            {selected ? <span className="icon-tile__badge" aria-hidden="true">Selected</span> : null}
        </button>
    );
}
