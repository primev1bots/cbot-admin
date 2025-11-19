// src/pages/Logout.tsx
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "./auth"; // ✅ used below

const Logout: React.FC = () => {
  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100">
      <div className="bg-gray p-8 rounded-xl shadow-md w-96 text-center">
        <h2 className="text-2xl font-semibold mb-6">Confirm Logout</h2>
        <p className="text-gray-700 mb-6">Are you sure you want to log out?</p>

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded mr-3"
        >
          Yes, Logout
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="bg-gray-300 hover:bg-gray-400 text-black py-2 px-6 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Logout;
