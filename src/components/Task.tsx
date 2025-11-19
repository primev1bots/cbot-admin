import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, update, remove, push, set } from 'firebase/database';

interface Task {
  currentUsers: {};
  id: string;
  name: string;
  reward: number;
  category: string;
  taskType: string;
  url?: string;
  buttonText?: string;
  telegramChannel?: string;
  checkMembership?: boolean;
  rewardType?: string;
  rewardAmount?: number;
  waitTime?: number;
}

interface GiveawaySettings {
  totalPrizePool: number;
}

const AdminPanel: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [giveawaySettings, setGiveawaySettings] = useState<GiveawaySettings>({
    totalPrizePool: 0
  });
  const [newTask, setNewTask] = useState({
    taskType: 'direct',
    name: '',
    reward: 0,
    category: 'Socials Tasks',
    url: '',
    telegramChannel: '',
    checkMembership: false,
    rewardType: 'both',
    rewardAmount: 1,
    waitTime: 20
  });

  const database = getDatabase();

  useEffect(() => {
    const tasksRef = ref(database, 'tasks');
    onValue(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const tasksData: Task[] = [];
        snapshot.forEach((childSnapshot) => {
          const taskData = childSnapshot.val();
          tasksData.push({ 
            ...taskData, 
            id: childSnapshot.key,
          });
        });
        setTasks(tasksData);
      }
    });

    // Load giveaway settings
    const settingsRef = ref(database, 'giveawaySettings');
    onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setGiveawaySettings(snapshot.val());
      }
    });
  }, [database]);

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await update(ref(database, `tasks/${taskId}`), updates);
      alert('Task updated successfully!');
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task');
    }
  };

  const updateGiveawaySettings = async (updates: Partial<GiveawaySettings>) => {
    try {
      await update(ref(database, 'giveawaySettings'), updates);
      alert('Giveaway settings updated successfully!');
    } catch (error) {
      console.error('Error updating giveaway settings:', error);
      alert('Error updating giveaway settings');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await remove(ref(database, `tasks/${taskId}`));
        alert('Task deleted successfully!');
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Error deleting task');
      }
    }
  };

  const addNewTask = async () => {
    if (!newTask.name) {
      alert('Please enter task name!');
      return;
    }

    // Validation based on task type
    if (newTask.taskType === 'direct') {
      if (newTask.rewardAmount <= 0) {
        alert('Please enter a valid reward amount!');
        return;
      }
      if (!newTask.url) {
        alert('Please enter URL for direct task!');
        return;
      }
      if (!isValidUrl(newTask.url)) {
        alert('Please enter a valid URL (e.g., https://example.com)');
        return;
      }
      if (!newTask.waitTime || newTask.waitTime < 5) {
        alert('Please enter a valid wait time (minimum 5 seconds)!');
        return;
      }
    } else if (newTask.taskType === 'regular') {
      if (newTask.reward <= 0) {
        alert('Please enter a valid diamond amount!');
        return;
      }
      if (newTask.category === 'TG Tasks' && !newTask.telegramChannel) {
        alert('Please enter Telegram channel username for TG task!');
        return;
      }
      if (newTask.category === 'Socials Tasks' && !newTask.url) {
        alert('Please enter URL for social task!');
        return;
      }
      if (newTask.url && !isValidUrl(newTask.url)) {
        alert('Please enter a valid URL (e.g., https://example.com)');
        return;
      }
    } else if (newTask.taskType === 'giveaway') {
      if (!newTask.telegramChannel) {
        alert('Please enter Telegram channel username for giveaway task!');
        return;
      }
      // No individual reward validation for giveaway tasks - they use global prize pool
    }

    // Validate Telegram channel format if provided
    if (newTask.telegramChannel && !isValidTelegramChannel(newTask.telegramChannel)) {
      alert('Please enter a valid Telegram channel username (without @)');
      return;
    }

    try {
      const tasksRef = ref(database, 'tasks');
      const newTaskRef = push(tasksRef);

      let taskData: any = {
        name: newTask.name,
        taskType: newTask.taskType,
        currentUsers: {},
      };

      // Direct Task
      if (newTask.taskType === 'direct') {
        taskData.rewardType = newTask.rewardType;
        taskData.rewardAmount = newTask.rewardAmount;
        taskData.url = newTask.url;
        taskData.waitTime = newTask.waitTime;
        taskData.category = 'Direct Task';
      }

      // Regular Task
      else if (newTask.taskType === 'regular') {
        taskData.reward = newTask.reward;
        taskData.category = newTask.category;
        
        if (newTask.category === 'Socials Tasks' && newTask.url) {
          taskData.url = newTask.url;
        }
        
        if (newTask.category === 'TG Tasks') {
          if (newTask.telegramChannel) {
            taskData.telegramChannel = newTask.telegramChannel;
          }
          taskData.checkMembership = newTask.checkMembership;
        }
      }

      // Giveaway Task
      else if (newTask.taskType === 'giveaway') {
        // Giveaway tasks don't have individual rewards - they use global prize pool
        taskData.category = 'Giveaway Task';
        if (newTask.telegramChannel) {
          taskData.telegramChannel = newTask.telegramChannel;
        }
        taskData.checkMembership = true;
      }

      await set(newTaskRef, taskData);

      // Reset form
      setNewTask({
        taskType: 'direct',
        name: '',
        reward: 0,
        category: 'Socials Tasks',
        url: '',
        telegramChannel: '',
        checkMembership: false,
        rewardType: 'both',
        rewardAmount: 1,
        waitTime: 20
      });
      setShowAddTask(false);
      alert('Task added successfully!');
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Error adding task');
    }
  };

  const isValidUrl = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

  const isValidTelegramChannel = (channel: string) => {
    const telegramRegex = /^[a-zA-Z0-9_]{5,32}$/;
    return telegramRegex.test(channel);
  };

  const taskTypeOptions = [
    'direct',
    'regular',
    'giveaway'
  ];

  const categoryOptions = [
    'Socials Tasks',
    'TG Tasks'
  ];

  const rewardTypeOptions = [
    { value: 'key', label: 'Keys' },
  ];

  const filterOptions = [
    'All',
    'Direct Task',
    'Socials Tasks',
    'TG Tasks',
    'Giveaway Task'
  ];

  // Filter tasks based on selected filter
  const filteredTasks = tasks.filter(task => {
    if (categoryFilter === 'All') return true;
    if (categoryFilter === 'Direct Task') return task.taskType === 'direct';
    if (categoryFilter === 'Socials Tasks') return task.category === 'Socials Tasks';
    if (categoryFilter === 'TG Tasks') return task.category === 'TG Tasks';
    if (categoryFilter === 'Giveaway Task') return task.taskType === 'giveaway';
    return true;
  });

  // Calculate total giveaway tasks
  const giveawayTasksCount = tasks.filter(task => task.taskType === 'giveaway').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Giveaway Settings Section */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Giveaway Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Total Prize
              </label>
              <input
                type="number"
                placeholder="Enter total prize pool"
                value={giveawaySettings.totalPrizePool}
                onChange={(e) => setGiveawaySettings({
                  ...giveawaySettings,
                  totalPrizePool: parseFloat(e.target.value) || 0
                })}
                className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                min="0"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => updateGiveawaySettings(giveawaySettings)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 w-full justify-center shadow-lg hover:shadow-green-500/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Prize Pool Settings
              </button>
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Task Management</h2>
            </div>
            
            {/* Filter and Add Task Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Category Filter */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-1">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent border-0 text-white text-sm focus:ring-0 focus:outline-none px-3 py-2"
                >
                  {filterOptions.map(option => (
                    <option key={option} value={option} className="bg-gray-800">
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowAddTask(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-green-500/20 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Task
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <div className="text-2xl font-bold text-white">{tasks.length}</div>
              <div className="text-gray-400 text-sm">Total Tasks</div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <div className="text-2xl font-bold text-blue-400">
                {tasks.filter(task => task.taskType === 'direct').length}
              </div>
              <div className="text-gray-400 text-sm">Direct Tasks</div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <div className="text-2xl font-bold text-purple-400">
                {tasks.filter(task => task.taskType === 'regular').length}
              </div>
              <div className="text-gray-400 text-sm">Regular Tasks</div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {giveawayTasksCount}
              </div>
              <div className="text-gray-400 text-sm">Giveaway Tasks</div>
            </div>
          </div>

          {/* Scrollable Tasks Container */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
            <div className="max-h-96 overflow-y-auto pr-2">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No tasks found for the selected filter</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-bold text-xl text-white">
                              {task.name}
                            </h3>
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                              task.taskType === 'direct' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                              task.taskType === 'giveaway' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                              task.category === 'TG Tasks' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                              task.category === 'Socials Tasks' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                              'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            }`}>
                              {task.taskType === 'direct' ? 'Direct Task' : 
                               task.taskType === 'giveaway' ? 'Giveaway Task' : 
                               task.category}
                            </span>
                          </div>

                          {/* Reward Display */}
                          <div className="mb-4 p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
                            <p className="text-sm font-medium text-green-300 mb-1">Reward:</p>
                            <div className="flex items-center gap-2">
                              {task.taskType === 'direct' ? (
                                  <>
                                    <span className="text-green-400 font-bold text-lg">
                                      {task.rewardType === 'coin' ? `${task.rewardAmount ?? 0} Coin${(task.rewardAmount ?? 0) > 1 ? 's' : ''}` :
                                       task.rewardType === 'key' ? `${task.rewardAmount ?? 0} Key${(task.rewardAmount ?? 0) > 1 ? 's' : ''}` :
                                       task.rewardType === 'both' ? `${task.rewardAmount ?? 0} Coin${(task.rewardAmount ?? 0) > 1 ? 's' : ''} + 1 Key` :
                                       `${task.rewardAmount ?? 0} Reward`}
                                    </span>
                                  {task.waitTime && (
                                    <span className="text-blue-300 text-sm">
                                      • Wait: {task.waitTime}s
                                    </span>
                                  )}
                                </>
                              ) : task.taskType === 'giveaway' ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-yellow-400 font-bold text-lg">
                                      Total Prize Pool: {giveawaySettings.totalPrizePool} Diamonds
                                    </span>
                                  </div>
                                  <div className="text-yellow-300 text-sm">
                                    Shared across {giveawayTasksCount} giveaway tasks
                                  </div>
                                </div>
                              ) : (
                                <span className="text-green-400 font-bold text-lg">
                                  {task.reward} Diamonds
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Direct Task Specific Info */}
                          {task.taskType === 'direct' && (
                            <div className="mb-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                              <p className="text-sm font-medium text-blue-300 mb-1">Direct Task Details:</p>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  <a 
                                    href={task.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-400 hover:text-blue-300 transition-colors break-all text-sm"
                                  >
                                    {task.url}
                                  </a>
                                </div>
                                {task.waitTime && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-blue-300 text-sm">
                                      Wait Time: {task.waitTime} seconds
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Telegram Channel Info */}
                          {task.telegramChannel && (
                            <div className="mb-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                              <p className="text-sm font-medium text-blue-300 mb-1">Telegram Channel:</p>
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                </svg>
                                <span className="text-blue-400 font-medium">@{task.telegramChannel}</span>
                                {task.checkMembership && (
                                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30">
                                    Membership Check
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Website URL for non-direct tasks */}
                          {task.url && task.taskType !== 'direct' && (
                            <div className="mb-4 p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
                              <p className="text-sm font-medium text-blue-300 mb-2">Website URL:</p>
                              <a 
                                href={task.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-400 hover:text-blue-300 transition-colors break-all text-sm font-medium flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                {task.url}
                              </a>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="bg-red-500/20 hover:bg-red-500/30 p-2.5 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-all duration-200"
                            title="Delete Task"
                          >
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Edit Button - Only for non-giveaway tasks */}
                      {task.taskType !== 'giveaway' && (
                        <div className="flex justify-end pt-4 border-t border-gray-700/50">
                          <button
                            onClick={() => {
                              if (task.taskType === 'direct') {
                                const newReward = prompt('Enter new reward amount:', task.rewardAmount?.toString() || '1');
                                const newWaitTime = prompt('Enter new wait time (seconds):', task.waitTime?.toString() || '20');
                                
                                if (newReward && !isNaN(parseFloat(newReward))) {
                                  const updates: any = { rewardAmount: parseFloat(newReward) };
                                  if (newWaitTime && !isNaN(parseInt(newWaitTime))) {
                                    updates.waitTime = parseInt(newWaitTime);
                                  }
                                  updateTask(task.id, updates);
                                }
                              } else {
                                const newReward = prompt('Enter new reward:', task.reward?.toString() || '0');
                                if (newReward && !isNaN(parseFloat(newReward))) {
                                  updateTask(task.id, { reward: parseFloat(newReward) });
                                }
                              }
                            }}
                            className="bg-blue-500/20 hover:bg-blue-500/30 px-4 py-2.5 rounded-xl border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 text-blue-300 font-medium text-sm flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Reward
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Task Modal */}
          {showAddTask && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-white">Add New Task</h3>
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-xl"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Task Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Task Type *</label>
                    <select
                      value={newTask.taskType}
                      onChange={(e) => setNewTask({ 
                        ...newTask, 
                        taskType: e.target.value,
                        category: e.target.value === 'regular' ? 'Socials Tasks' : newTask.category,
                        rewardType: e.target.value === 'direct' ? 'both' : newTask.rewardType
                      })}
                      className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                    >
                      {taskTypeOptions.map(type => (
                        <option key={type} value={type} className="bg-gray-800 capitalize">
                          {type === 'direct' ? 'Direct Task' : 
                           type === 'regular' ? 'Regular Task' : 
                           'Giveaway Task'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Task Name *</label>
                    <input
                      type="text"
                      placeholder="Enter task name"
                      value={newTask.name}
                      onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                      className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                    />
                  </div>

                  {/* Direct Task Fields */}
                  {newTask.taskType === 'direct' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-3">Reward Type</label>
                          <select
                            value={newTask.rewardType}
                            onChange={(e) => setNewTask({ ...newTask, rewardType: e.target.value })}
                            className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                          >
                            {rewardTypeOptions.map(type => (
                              <option key={type.value} value={type.value} className="bg-gray-800">
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-3">Reward Amount *</label>
                          <input
                            type="number"
                            placeholder="1"
                            value={newTask.rewardAmount}
                            onChange={(e) => setNewTask({ ...newTask, rewardAmount: parseFloat(e.target.value) || 1 })}
                            className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                            min="1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Website URL *</label>
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={newTask.url}
                          onChange={(e) => setNewTask({ ...newTask, url: e.target.value })}
                          className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Wait Time (Seconds) *</label>
                        <input
                          type="number"
                          placeholder="20"
                          value={newTask.waitTime}
                          onChange={(e) => setNewTask({ ...newTask, waitTime: parseInt(e.target.value) || 20 })}
                          className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                          min="5"
                        />
                        <p className="text-gray-400 text-xs mt-2">Minimum 5 seconds recommended</p>
                      </div>
                    </>
                  )}

                  {/* Regular Task Fields */}
                  {newTask.taskType === 'regular' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Category *</label>
                        <select
                          value={newTask.category}
                          onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                          className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                        >
                          {categoryOptions.map(category => (
                            <option key={category} value={category} className="bg-gray-800">
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Diamond Reward *</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={newTask.reward}
                          onChange={(e) => setNewTask({ ...newTask, reward: parseFloat(e.target.value) || 0 })}
                          className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                          min="1"
                        />
                      </div>

                      {/* Social Task Fields */}
                      {newTask.category === 'Socials Tasks' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-3">Website URL *</label>
                          <input
                            type="url"
                            placeholder="https://example.com"
                            value={newTask.url}
                            onChange={(e) => setNewTask({ ...newTask, url: e.target.value })}
                            className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                          />
                        </div>
                      )}

                      {/* TG Task Fields */}
                      {newTask.category === 'TG Tasks' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">Telegram Channel Username *</label>
                            <input
                              type="text"
                              placeholder="channelname (without @)"
                              value={newTask.telegramChannel}
                              onChange={(e) => setNewTask({ ...newTask, telegramChannel: e.target.value })}
                              className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                            />
                            <p className="text-gray-400 text-xs mt-2">Enter the channel username without @ symbol</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="checkMembership"
                              checked={newTask.checkMembership}
                              onChange={(e) => setNewTask({ ...newTask, checkMembership: e.target.checked })}
                              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <label htmlFor="checkMembership" className="text-sm font-medium text-gray-300">
                              Check if user is already a member
                            </label>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Giveaway Task Fields */}
                  {newTask.taskType === 'giveaway' && (
                    <>
                      <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-yellow-300 font-medium">Giveaway Task Information</p>
                        </div>
                        <p className="text-yellow-200 text-sm">
                          This giveaway task will automatically use the global Total Prize Pool of <strong>{giveawaySettings.totalPrizePool} Diamonds</strong> shared across all {giveawayTasksCount + 1} giveaway tasks.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Telegram Channel Username *</label>
                        <input
                          type="text"
                          placeholder="channelname (without @)"
                          value={newTask.telegramChannel}
                          onChange={(e) => setNewTask({ ...newTask, telegramChannel: e.target.value })}
                          className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                        />
                        <p className="text-gray-400 text-xs mt-2">Enter the channel username without @ symbol</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-4 mt-8 pt-6 border-t border-gray-700/50">
                  <button
                    onClick={addNewTask}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-8 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 flex-1 justify-center shadow-lg hover:shadow-green-500/20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Task
                  </button>
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="bg-gray-700/50 hover:bg-gray-700/70 px-8 py-4 rounded-xl font-semibold transition-all duration-200 border border-gray-600/50 flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;