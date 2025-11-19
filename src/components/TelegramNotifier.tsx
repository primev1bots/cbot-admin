import React, { useState, useEffect } from "react";
import { getDatabase, ref, get, set } from "firebase/database";
import { initializeApp } from "firebase/app";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Save, 
  Send, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  MessageSquare,
  Link,
  Settings,
  Loader2,
  Wifi,
  WifiOff,
  Rows,
  Columns
} from "lucide-react";

// ------------------- Firebase Config -------------------
const firebaseConfig = {
  apiKey: "AIzaSyC0gMm_Vx3ysXTwQwmjLdoxvH_m369U7Vs",
  authDomain: "cbot-4baae.firebaseapp.com",
  databaseURL: "https://cbot-4baae-default-rtdb.firebaseio.com",
  projectId: "cbot-4baae",
  storageBucket: "cbot-4baae.firebasestorage.app",
  messagingSenderId: "726823810353",
  appId: "1:726823810353:web:1f49dd2a2e81fd4bf8ec10",
  measurementId: "G-T316MYT6D9"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const CLOUD_NAME = "deu1ngeov";
const UPLOAD_PRESET = "ml_default";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

interface Button {
  text: string;
  url: string;
}

type ButtonLayout = 'vertical' | 'horizontal';

const TelegramNotifier: React.FC = () => {
  const [botToken, setBotToken] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [buttons, setButtons] = useState<Button[]>([
    { text: "Button 1", url: "https://example.com/1" },
    { text: "Button 2", url: "https://example.com/2" },
  ]);
  const [buttonLayout, setButtonLayout] = useState<ButtonLayout>('vertical');
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [, setConnectionStatus] = useState("checking");

  // Check backend status on component mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await fetch("https://0407ca6c4d1d.ngrok-free.app/api/health");
        if (response.ok) {
          const data = await response.json();
          setIsBackendOnline(data.status === 'healthy');
          setConnectionStatus("connected");
        } else {
          setIsBackendOnline(false);
          setConnectionStatus("error");
        }
      } catch (error) {
        setIsBackendOnline(false);
        setConnectionStatus("error");
        console.error("connection failed:", error);
      }
    };

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch bot token from Firebase on load
  useEffect(() => {
    const fetchBotToken = async () => {
      try {
        const snapshot = await get(ref(db, "botToken"));
        if (snapshot.exists()) setBotToken(snapshot.val());
      } catch (err) {
        console.error("Error fetching bot token:", err);
      }
    };
    fetchBotToken();
  }, []);

  // Save bot token to Firebase
  const saveBotToken = async () => {
    if (!botToken) return alert("Bot token cannot be empty");
    try {
      await set(ref(db, "botToken"), botToken);
      alert("Bot token updated successfully!");
    } catch (err) {
      alert("Failed to update bot token: " + err);
    }
  };

  // Handle button text/url change
  const handleButtonChange = (index: number, field: "text" | "url", value: string) => {
    const newButtons = [...buttons];
    newButtons[index][field] = value;
    setButtons(newButtons);
  };

  // Add new button
  const addButton = () => {
    setButtons([...buttons, { text: "", url: "" }]);
  };

  // Remove button
  const removeButton = (index: number) => {
    const newButtons = buttons.filter((_, i) => i !== index);
    setButtons(newButtons);
  };

  // Upload image to Cloudinary
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
      const data = await res.json();
      return data.secure_url;
    } catch (err) {
      console.error("Image upload failed:", err);
      return null;
    }
  };

  // Test bot token validity
  const testBotToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch("https://0407ca6c4d1d.ngrok-free.app/api/test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          botToken: token,
          buttonLayout: buttonLayout 
        })
      });
      
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error("Bot token test failed:", error);
      return false;
    }
  };

  // Send notification via backend
  const sendNotification = async () => {
    if (!message && !imageFile) {
      alert("Please type a message or select an image.");
      return;
    }

    if (!botToken) {
      alert("Please save your bot token first.");
      return;
    }

    // Test bot token before sending
    setIsLoading(true);
    try {
      const isTokenValid = await testBotToken(botToken);
      if (!isTokenValid) {
        alert("❌ Invalid bot token. Please check your bot token and try again.");
        setIsLoading(false);
        return;
      }
    } catch (error) {
      alert("❌ Failed to validate bot token. Please check your connection.");
      setIsLoading(false);
      return;
    }

    // Proceed with sending notification
    const imageUrl = await uploadImage();
    const payload = { 
      message, 
      imageUrl, 
      buttons: buttons.filter(btn => btn.text && btn.url), // Only include valid buttons
      botToken,
      buttonLayout
    };

    try {
      console.log("Sending notification with payload:", payload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const res = await fetch("https://0407ca6c4d1d.ngrok-free.app/api/send-notification", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Notification response:", data);

      if (data.success) {
        alert(`✅ Notification sent successfully!\n\n📊 Stats:\n• Total users: ${data.stats.totalUsers}\n• Successful: ${data.stats.successful}\n• Failed: ${data.stats.failed}\n• Layout: ${buttonLayout}`);
        
        // Reset form
        setMessage("");
        setImageFile(null);
        setButtons([
          { text: "Button 1", url: "https://example.com/1" },
          { text: "Button 2", url: "https://example.com/2" },
        ]);
        
        // Clear file input
        const fileInput = document.getElementById('image-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        alert(`❌ Failed to send notification: ${data.error}`);
      }
    } catch (err: any) {
      console.error("Full error details:", err);
      
      if (err.name === 'AbortError') {
        alert("⏰ Request timeout: Backend is taking too long to respond. Please try again.");
      } else if (err.message.includes('Failed to fetch')) {
        alert("🌐 Network error: Cannot connect to backend server. Please check:\n• Your internet connection\n• Backend server status");
      } else if (err.message.includes('Invalid bot token')) {
        alert("🔑 Invalid bot token: Please check your bot token and ensure the bot exists.");
      } else {
        alert(`🚨 Error sending notification: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-8 px-4">
      <motion.div 
        className="max-w-md mx-auto bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-800 px-6 py-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center space-x-3">
            <motion.div 
              className="bg-white/10 p-3 rounded-xl backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bot className="w-90 h-7 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">Telegram Notifier</h1>
              <p className="text-blue-200 text-sm mt-1">Broadcast messages to your subscribers</p>
            </div>
          </div>
        </motion.div>

        {/* Connection Status */}
        <motion.div 
          className={`px-4 py-3 text-center text-sm font-medium flex items-center justify-center space-x-2 ${
            isBackendOnline 
              ? 'bg-green-900/50 text-green-300' 
              : 'bg-red-900/50 text-red-300'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {isBackendOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>❌ Backend offline - check server status</span>
            </>
          )}
        </motion.div>

        <motion.div 
          className="p-6 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Bot Token Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <label className="block text-sm font-semibold text-blue-200 flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Bot Token</span>
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="Enter your bot token"
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-white placeholder-slate-400"
              />
              <motion.button 
                onClick={saveBotToken}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 font-medium flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Message Input */}
          <motion.div variants={itemVariants} className="space-y-3">
            <label className="block text-sm font-semibold text-blue-200 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Message</span>
            </label>
            <textarea
              placeholder="Type your notification message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-white placeholder-slate-400 resize-none"
            />
          </motion.div>

          {/* Image Upload */}
          <motion.div variants={itemVariants} className="space-y-3">
            <label className="block text-sm font-semibold text-blue-200 flex items-center space-x-2">
              <ImageIcon className="w-4 h-4" />
              <span>Image Attachment</span>
            </label>
            <motion.div 
              className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center transition-all duration-200 hover:border-blue-500 hover:bg-blue-900/20 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer block">
                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <span className="text-sm text-slate-300">
                  {imageFile ? imageFile.name : "Click to upload an image"}
                </span>
                {imageFile && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-green-400 mt-2"
                  >
                    ✓ Image selected
                  </motion.p>
                )}
              </label>
            </motion.div>
          </motion.div>

          {/* Buttons Section */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-blue-200 flex items-center space-x-2">
                <Link className="w-4 h-4" />
                <span>Inline Buttons</span>
              </label>
              <div className="flex items-center space-x-3">
                {/* Button Layout Selector */}
                <div className="flex bg-slate-700 rounded-lg p-1">
                  <motion.button
                    onClick={() => setButtonLayout('vertical')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                      buttonLayout === 'vertical' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-300 hover:text-white'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Rows className="w-4 h-4" />
                    <span>Vertical</span>
                  </motion.button>
                  <motion.button
                    onClick={() => setButtonLayout('horizontal')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                      buttonLayout === 'horizontal' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-300 hover:text-white'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Columns className="w-4 h-4" />
                    <span>Horizontal</span>
                  </motion.button>
                </div>

                <motion.button
                  onClick={addButton}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 text-sm font-medium flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </motion.button>
              </div>
            </div>

            {/* Layout Preview Badge */}
            <motion.div 
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                buttonLayout === 'vertical' 
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-700' 
                  : 'bg-purple-900/50 text-purple-300 border border-purple-700'
              }`}>
                {buttonLayout === 'vertical' ? 'Vertical Layout' : 'Horizontal Layout'}
              </div>
            </motion.div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              <AnimatePresence>
                {buttons.map((btn, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300 bg-slate-600 px-2 py-1 rounded">
                        Button {index + 1}
                      </span>
                      {buttons.length > 1 && (
                        <motion.button
                          onClick={() => removeButton(index)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-red-400 hover:text-red-300 transition-colors duration-200 p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Button Text"
                        value={btn.text}
                        onChange={(e) => handleButtonChange(index, "text", e.target.value)}
                        className="px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-sm text-white placeholder-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Button URL"
                        value={btn.url}
                        onChange={(e) => handleButtonChange(index, "url", e.target.value)}
                        className="px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none text-sm text-white placeholder-slate-400"
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Send Button */}
          <motion.button 
            onClick={sendNotification}
            disabled={isLoading || !isBackendOnline}
            variants={itemVariants}
            whileHover={{ scale: isLoading || !isBackendOnline ? 1 : 1.02 }}
            whileTap={{ scale: isLoading || !isBackendOnline ? 1 : 0.98 }}
            className={`w-full py-4 rounded-lg font-semibold text-white transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800 ${
              isLoading || !isBackendOnline
                ? 'bg-slate-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending...</span>
              </div>
            ) : !isBackendOnline ? (
              <div className="flex items-center justify-center space-x-2">
                <WifiOff className="w-5 h-5" />
                <span>Backend Offline</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Send className="w-5 h-5" />
                <span>Send Notification</span>
              </div>
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TelegramNotifier;