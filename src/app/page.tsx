export default function DashboardLayout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-4 space-y-6">
        <h1 className="text-2xl font-bold">AsyncBrief</h1>
        <nav className="space-y-2">
          <a href="#" className="block text-gray-300 hover:text-white">Dashboard</a>
          <a href="#" className="block text-gray-300 hover:text-white">Slack</a>
          <a href="#" className="block text-gray-300 hover:text-white">GitHub</a>
          <a href="#" className="block text-gray-300 hover:text-white">Settings</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100 p-6 overflow-y-scroll">
        <header className="mb-6">
          <h2 className="text-3xl font-semibold">Dashboard Overview</h2>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Slack Summary</h3>
            <p className="text-gray-500">Top threads, key decisions, open questions...</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">GitHub PRs & Issues</h3>
            <p className="text-gray-500">Recent activity, stale PRs, open issues...</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">Weekly Digest Preview</h3>
            <p className="text-gray-500">This week&rsquo;s summary ready to email or review...</p>
          </div>
        </section>
      </main>
    </div>
  );
}
