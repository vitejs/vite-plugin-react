// Simulate async data fetching
async function fetchDynamicData(url: URL) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    timestamp: new Date().toISOString(),
    path: url.pathname,
    searchParams: Object.fromEntries(url.searchParams),
  }
}

export async function DynamicContent({ url }: { url: URL }) {
  const data = await fetchDynamicData(url)

  return (
    <div className="dynamic-card">
      <h3>Dynamic Server Data</h3>
      <p>
        This content was fetched at request time and streamed to the client.
      </p>
      <dl>
        <dt>Request Time:</dt>
        <dd>{data.timestamp}</dd>
        <dt>Path:</dt>
        <dd>{data.path}</dd>
        {Object.keys(data.searchParams).length > 0 && (
          <>
            <dt>Query Params:</dt>
            <dd>{JSON.stringify(data.searchParams)}</dd>
          </>
        )}
      </dl>
    </div>
  )
}
