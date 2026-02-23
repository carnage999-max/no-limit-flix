'use client';

import { Suspense } from 'react';
import SeriesDetailContent from './content';

export default function SeriesDetailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SeriesDetailContent />
        </Suspense>
    );
}
