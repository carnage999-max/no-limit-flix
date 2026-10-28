/** Maps `items` with at most `limit` calls in flight, returning results in input order. */
export async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await fn(items[index], index);
        }
    };
    await Promise.all(Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, worker));
    return results;
}
