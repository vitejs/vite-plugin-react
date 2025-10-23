// Simulate fetching user data
async function fetchUser() {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  return {
    name: 'Demo User',
    status: 'online',
    lastSeen: new Date().toLocaleTimeString(),
  }
}

export async function DynamicUserWidget() {
  const user = await fetchUser()

  return (
    <div className="dynamic-card user-widget">
      <h3>User Status</h3>
      <div className="user-info">
        <div className="user-name">{user.name}</div>
        <div className="user-status">
          <span className={`status-indicator ${user.status}`}></span>
          {user.status}
        </div>
        <div className="user-last-seen">Last seen: {user.lastSeen}</div>
      </div>
    </div>
  )
}
