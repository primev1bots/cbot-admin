// App.tsx
import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./components/auth";

import Dashboard from "./components/Dashboard";
import Ads from "./components/Ads";
import Tasks from "./components/Task";
import Profile from "./components/Profile";
import TelegramNotifier from "./components/TelegramNotifier";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import Logout from "./components/Logout"; // ✅ correct import
import WithdrawalManagement from "./components/Withdrawal";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Check auth status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);


  if (loading) return <div className="p-10 text-center">Loading...</div>;

  // 🔒 Not logged in → show Login page
  if (!user) return <Login onLogin={setUser} />;

  // ✅ Logged in → show main admin UI



  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        setActiveTab={setActiveTab}
        activeTab={activeTab}
      />

      {/* Main content */}
      <div className="flex-1 min-h-screen p-0">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "ads" && <Ads />}
        {activeTab === "tasks" && <Tasks />}
        {activeTab === "withdrawal" && (
         // Simple usage without any props
<WithdrawalManagement />
        )}
        {activeTab === "profile" && <Profile user={user} />}
        {activeTab === "notifier" && <TelegramNotifier />}
        {activeTab === "logout" && <Logout />} {/* ✅ fixed name */}
      </div>
    </div>
  );
};

export default App;
