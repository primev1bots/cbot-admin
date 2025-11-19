import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';

interface AdConfig {
  reward: number;
  dailyLimit: number;
  cooldown: number;
  enabled: boolean;
}

interface AdsConfig {
  monetag: AdConfig;
  adsovio: AdConfig;
  adexora: AdConfig;
}

const AdminPanel: React.FC = () => {
  const [adsConfig, setAdsConfig] = useState<AdsConfig>({
    monetag: { reward: 0.5, dailyLimit: 5, cooldown: 60, enabled: true },
    adsovio: { reward: 0.5, dailyLimit: 5, cooldown: 60, enabled: true },
    adexora: { reward: 0.5, dailyLimit: 5, cooldown: 60, enabled: true },
  });

  const [saving, setSaving] = useState<keyof AdsConfig | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const database = getDatabase();

  // Load current configuration from Firebase
  useEffect(() => {
    const adsRef = ref(database, 'ads');
    const unsubscribe = onValue(adsRef, (snapshot) => {
      if (snapshot.exists()) {
        const configData = snapshot.val() as Partial<Record<keyof AdsConfig, Partial<AdConfig>>>;
        setAdsConfig((prev) => ({
          monetag: { ...prev.monetag, ...(configData.monetag || {}) },
          adsovio: { ...prev.adsovio, ...(configData.adsovio || {}) },
          adexora: { ...prev.adexora, ...(configData.adexora || {}) },
        }));
      }
    });

    return () => unsubscribe();
  }, [database]);

  const saveConfig = async (provider: keyof AdsConfig) => {
    setSaving(provider);
    setMessage(null);

    try {
      const adRef = ref(database, `ads/${provider}`);
      await update(adRef, adsConfig[provider]);
      setMessage({ type: 'success', text: `${providerNames[provider]} configuration saved successfully!` });
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: `Failed to save ${providerNames[provider]} configuration` });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleConfigChange = (provider: keyof AdsConfig, field: keyof AdConfig, value: any) => {
    setAdsConfig((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]:
          field === 'reward'
            ? parseFloat(value) || 0
            : field === 'dailyLimit' || field === 'cooldown'
            ? parseInt(value) || 0
            : value,
      },
    }));
  };

  const providerNames: Record<keyof AdsConfig, string> = {
    monetag: 'Monetag Ads',
    adsovio: 'Adsovio',
    adexora: 'Adexora Ads',
  };

  const providerColors: Record<keyof AdsConfig, string> = {
    monetag: 'from-green-500 to-teal-600',
    adsovio: 'from-orange-500 to-red-600',
    adexora: 'from-cyan-500 to-blue-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-3">
            Ads Configuration Panel
          </h1>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs border border-blue-500/30">
              {Object.keys(adsConfig).length} Ad Providers
            </span>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border-l-4 ${
              message.type === 'success'
                ? 'bg-green-900/50 border-green-400 text-green-200'
                : 'bg-red-900/50 border-red-400 text-red-200'
            } shadow-lg backdrop-blur-sm transition-all duration-300`}
          >
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-3 ${
                  message.type === 'success' ? 'bg-green-400 animate-pulse' : 'bg-red-400 animate-pulse'
                }`}
              ></div>
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Configuration Cards */}
        <div className="mb-8 max-h-[100vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pr-4">
            {(Object.keys(adsConfig) as Array<keyof AdsConfig>).map((provider) => (
              <div key={provider} className="group">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-2xl hover:shadow-xl transition-all duration-300 hover:border-gray-600/50 h-full flex flex-col">
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-8 rounded-full bg-gradient-to-b ${providerColors[provider]}`}></div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{providerNames[provider]}</h2>
                      </div>
                    </div>

                    <label className="flex items-center space-x-3 cursor-pointer group/toggle">
                      <span
                        className={`text-sm font-medium transition-colors ${
                          adsConfig[provider].enabled ? 'text-green-400' : 'text-gray-500'
                        }`}
                      >
                        {adsConfig[provider].enabled ? 'Active' : 'Disabled'}
                      </span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={adsConfig[provider].enabled}
                          onChange={(e) => handleConfigChange(provider, 'enabled', e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={`w-12 h-6 rounded-full transition-all duration-300 ${
                            adsConfig[provider].enabled
                              ? 'bg-green-500/80 group-hover/toggle:bg-green-500'
                              : 'bg-gray-600 group-hover/toggle:bg-gray-500'
                          }`}
                        ></div>
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                            adsConfig[provider].enabled ? 'transform translate-x-6' : ''
                          } shadow-lg`}
                        ></div>
                      </div>
                    </label>
                  </div>

                  {/* Configuration Fields */}
                  <div className="space-y-4 flex-1">
                    {/* Reward Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                        Reward Amount ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={adsConfig[provider].reward}
                        onChange={(e) => handleConfigChange(provider, 'reward', e.target.value)}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Limits Grid */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                          Daily Limit
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adsConfig[provider].dailyLimit}
                          onChange={(e) => handleConfigChange(provider, 'dailyLimit', e.target.value)}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Timing Grid */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                          Cooldown (s)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={adsConfig[provider].cooldown}
                          onChange={(e) => handleConfigChange(provider, 'cooldown', e.target.value)}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={() => saveConfig(provider)}
                    disabled={saving === provider}
                    className={`w-full mt-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 ${
                      saving === provider
                        ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                        : `bg-gradient-to-r ${providerColors[provider]} hover:shadow-lg hover:scale-[1.02] text-white`
                    }`}
                  >
                    {saving === provider ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save {providerNames[provider]}</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;