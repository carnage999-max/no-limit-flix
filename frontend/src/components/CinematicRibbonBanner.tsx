'use client';

import styles from './CinematicRibbonBanner.module.css';

export default function CinematicRibbonBanner() {
    return (
        <section aria-label="No Limit Flix cinematic banner" className={styles.banner}>
            <img
                src="/reel.png"
                alt=""
                className={styles.reelImage}
            />
            <div className={styles.glow} aria-hidden="true" />
        </section>
    );
}
