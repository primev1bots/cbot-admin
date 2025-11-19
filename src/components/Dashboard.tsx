import React, { useState, useEffect } from 'react';
import { ref, get, update, onValue, off, push, set, remove } from 'firebase/database';
import { database } from '../firebase';
import { Users, DollarSign, TrendingUp, Clock, Search, Edit, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Coins, KeyRound, Gem } from 'lucide-react';

interface UserData {
  telegramId: number;
  username: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  joinDate: string;
  adsWatchedToday: number;
  tasksCompleted: Record<string, number>;
  lastAdWatch?: string;
  referredBy?: string;
  deviceId?: string;
  isMainAccount?: boolean;
  coins: number;
  keys: number;
  diamonds: number;
}

interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  method?: string;
  accountNumber?: string;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalWithdrawn: number;
  totalEarnings: number;
  pendingWithdrawals: number;
}

interface WalletConfig {
  currency: string;
  currencySymbol: string;
  defaultMinWithdrawal: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

// Define props interface for AdminPanel
interface AdminPanelProps {
  transactions?: Transaction[];
  onUpdateTransaction?: (transactionId: string, updates: Partial<Transaction>) => void;
  walletConfig?: WalletConfig;
}

const Dashboard: React.FC<AdminPanelProps> = ({ 
  }) => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalWithdrawn: 0,
    totalEarnings: 0,
    pendingWithdrawals: 0
  });
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct'>('add');
  const [balanceDescription, setBalanceDescription] = useState('');
  
  // New state for coins, keys, diamonds management
  const [coinsAmount, setCoinsAmount] = useState('');
  const [coinsAction, setCoinsAction] = useState<'add' | 'deduct'>('add');
  const [coinsDescription, setCoinsDescription] = useState('');
  
  const [keysAmount, setKeysAmount] = useState('');
  const [keysAction, setKeysAction] = useState<'add' | 'deduct'>('add');
  const [keysDescription, setKeysDescription] = useState('');
  
  const [diamondsAmount, setDiamondsAmount] = useState('');
  const [diamondsAction, setDiamondsAction] = useState<'add' | 'deduct'>('add');
  const [diamondsDescription, setDiamondsDescription] = useState('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);

  // Load admin data
  useEffect(() => {
    loadAdminData();
    setupRealtimeListeners();

    return () => {
      cleanupListeners();
    };
  }, []);

  // Filter users based on search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => {
        const searchLower = searchTerm.toLowerCase().trim();
        
        // Search in username (handle undefined)
        const usernameMatch = user.username?.toLowerCase().includes(searchLower) || false;
        
        // Search in first name (handle undefined)
        const firstNameMatch = user.firstName?.toLowerCase().includes(searchLower) || false;
        
        // Search in last name (handle undefined)
        const lastNameMatch = user.lastName?.toLowerCase().includes(searchLower) || false;
        
        // Search in full name combination
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().trim();
        const fullNameMatch = fullName.includes(searchLower);
        
        // Search in Telegram ID
        const telegramIdMatch = user.telegramId.toString().includes(searchTerm);
        
        return usernameMatch || firstNameMatch || lastNameMatch || fullNameMatch || telegramIdMatch;
      });
      setFilteredUsers(filtered);
    }
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchTerm, users]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleUsersPerPageChange = (value: number) => {
    setUsersPerPage(value);
    setCurrentPage(1);
  };

  // Generate page numbers for pagination with ellipsis
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = window.innerWidth < 768 ? 3 : 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) pageNumbers.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  const setupRealtimeListeners = () => {
    // Users listener
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData: UserData[] = [];
        snapshot.forEach((childSnapshot) => {
          usersData.push(childSnapshot.val());
        });
        setUsers(usersData);
        calculateStats(usersData);
      }
    });

    // Transactions listener for pending withdrawals
    const transactionsRef = ref(database, 'transactions');
    onValue(transactionsRef, (snapshot) => {
      if (snapshot.exists()) {
        let pendingWithdrawals = 0;
        snapshot.forEach((childSnapshot) => {
          const transaction = childSnapshot.val();
          if (transaction.type === 'withdrawal' && transaction.status === 'pending') {
            pendingWithdrawals += transaction.amount;
          }
        });
        setStats(prev => ({ ...prev, pendingWithdrawals }));
      }
    });
  };

  const cleanupListeners = () => {
    const usersRef = ref(database, 'users');
    off(usersRef);
    
    const transactionsRef = ref(database, 'transactions');
    off(transactionsRef);
  };

  const calculateStats = (usersData: UserData[]) => {
    const totalWithdrawn = usersData.reduce((sum, user) => sum + (user.totalWithdrawn || 0), 0);
    const totalEarnings = usersData.reduce((sum, user) => sum + (user.totalEarned || 0), 0);
    
    setStats({
      totalUsers: usersData.length,
      totalWithdrawn,
      totalEarnings,
      pendingWithdrawals: stats.pendingWithdrawals
    });
  };

  const loadAdminData = async () => {
    try {
      // Load users
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (usersSnapshot.exists()) {
        const usersData: UserData[] = [];
        usersSnapshot.forEach((childSnapshot) => {
          usersData.push(childSnapshot.val());
        });
        setUsers(usersData);
        calculateStats(usersData);
      }

      // Load pending withdrawals
      const transactionsRef = ref(database, 'transactions');
      const transactionsSnapshot = await get(transactionsRef);
      
      if (transactionsSnapshot.exists()) {
        let pendingWithdrawals = 0;
        transactionsSnapshot.forEach((childSnapshot) => {
          const transaction = childSnapshot.val();
          if (transaction.type === 'withdrawal' && transaction.status === 'pending') {
            pendingWithdrawals += transaction.amount;
          }
        });
        setStats(prev => ({ ...prev, pendingWithdrawals }));
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleEditUser = async (user: UserData) => {
    setSelectedUser(user);
    setBalanceAmount('');
    setBalanceDescription('');
    setBalanceAction('add');
    
    // Reset currency fields
    setCoinsAmount('');
    setCoinsDescription('');
    setCoinsAction('add');
    
    setKeysAmount('');
    setKeysDescription('');
    setKeysAction('add');
    
    setDiamondsAmount('');
    setDiamondsDescription('');
    setDiamondsAction('add');
  };

  const handleCloseUserDetails = () => {
    setSelectedUser(null);
  };

  const handleBalanceUpdate = async () => {
    if (!selectedUser || !balanceAmount || parseFloat(balanceAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const amount = parseFloat(balanceAmount);
      const newBalance = balanceAction === 'add' 
        ? (selectedUser.balance || 0) + amount
        : Math.max(0, (selectedUser.balance || 0) - amount);

      const newTotalEarned = balanceAction === 'add'
        ? (selectedUser.totalEarned || 0) + amount
        : (selectedUser.totalEarned || 0);

      // Update user balance
      await update(ref(database, `users/${selectedUser.telegramId}`), {
        balance: newBalance,
        totalEarned: newTotalEarned
      });

      // Add transaction record
      const transaction: Omit<Transaction, 'id'> = {
        userId: selectedUser.telegramId.toString(),
        type: balanceAction === 'add' ? 'admin_add' : 'admin_deduct',
        amount: amount,
        description: balanceDescription || `Admin ${balanceAction === 'add' ? 'added' : 'deducted'} balance`,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      await set(newTransactionRef, {
        ...transaction,
        id: newTransactionRef.key
      });

      alert(`Balance ${balanceAction === 'add' ? 'added' : 'deducted'} successfully!`);
      setBalanceAmount('');
      setBalanceDescription('');
      
      // Refresh user data
      const userRef = ref(database, `users/${selectedUser.telegramId}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        setSelectedUser(userSnapshot.val());
      }

    } catch (error) {
      console.error('Error updating balance:', error);
      alert('Error updating balance. Please try again.');
    }
  };

  // Handle coins update
  const handleCoinsUpdate = async () => {
    if (!selectedUser || !coinsAmount || parseInt(coinsAmount) <= 0) {
      alert('Please enter a valid coins amount');
      return;
    }

    try {
      const amount = parseInt(coinsAmount);
      const newCoins = coinsAction === 'add' 
        ? (selectedUser.coins || 0) + amount
        : Math.max(0, (selectedUser.coins || 0) - amount);

      // Update user coins
      await update(ref(database, `users/${selectedUser.telegramId}`), {
        coins: newCoins
      });

      // Add transaction record for coins
      const transaction: Omit<Transaction, 'id'> = {
        userId: selectedUser.telegramId.toString(),
        type: coinsAction === 'add' ? 'admin_coins_add' : 'admin_coins_deduct',
        amount: amount,
        description: coinsDescription || `Admin ${coinsAction === 'add' ? 'added' : 'deducted'} ${amount} coins`,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      await set(newTransactionRef, {
        ...transaction,
        id: newTransactionRef.key
      });

      alert(`${amount} coins ${coinsAction === 'add' ? 'added' : 'deducted'} successfully!`);
      setCoinsAmount('');
      setCoinsDescription('');
      
      // Refresh user data
      const userRef = ref(database, `users/${selectedUser.telegramId}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        setSelectedUser(userSnapshot.val());
      }

    } catch (error) {
      console.error('Error updating coins:', error);
      alert('Error updating coins. Please try again.');
    }
  };

  // Handle keys update
  const handleKeysUpdate = async () => {
    if (!selectedUser || !keysAmount || parseInt(keysAmount) <= 0) {
      alert('Please enter a valid keys amount');
      return;
    }

    try {
      const amount = parseInt(keysAmount);
      const newKeys = keysAction === 'add' 
        ? (selectedUser.keys || 0) + amount
        : Math.max(0, (selectedUser.keys || 0) - amount);

      // Update user keys
      await update(ref(database, `users/${selectedUser.telegramId}`), {
        keys: newKeys
      });

      // Add transaction record for keys
      const transaction: Omit<Transaction, 'id'> = {
        userId: selectedUser.telegramId.toString(),
        type: keysAction === 'add' ? 'admin_keys_add' : 'admin_keys_deduct',
        amount: amount,
        description: keysDescription || `Admin ${keysAction === 'add' ? 'added' : 'deducted'} ${amount} keys`,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      await set(newTransactionRef, {
        ...transaction,
        id: newTransactionRef.key
      });

      alert(`${amount} keys ${keysAction === 'add' ? 'added' : 'deducted'} successfully!`);
      setKeysAmount('');
      setKeysDescription('');
      
      // Refresh user data
      const userRef = ref(database, `users/${selectedUser.telegramId}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        setSelectedUser(userSnapshot.val());
      }

    } catch (error) {
      console.error('Error updating keys:', error);
      alert('Error updating keys. Please try again.');
    }
  };

  // Handle diamonds update
  const handleDiamondsUpdate = async () => {
    if (!selectedUser || !diamondsAmount || parseInt(diamondsAmount) <= 0) {
      alert('Please enter a valid diamonds amount');
      return;
    }

    try {
      const amount = parseInt(diamondsAmount);
      const newDiamonds = diamondsAction === 'add' 
        ? (selectedUser.diamonds || 0) + amount
        : Math.max(0, (selectedUser.diamonds || 0) - amount);

      // Update user diamonds
      await update(ref(database, `users/${selectedUser.telegramId}`), {
        diamonds: newDiamonds
      });

      // Add transaction record for diamonds
      const transaction: Omit<Transaction, 'id'> = {
        userId: selectedUser.telegramId.toString(),
        type: diamondsAction === 'add' ? 'admin_diamonds_add' : 'admin_diamonds_deduct',
        amount: amount,
        description: diamondsDescription || `Admin ${diamondsAction === 'add' ? 'added' : 'deducted'} ${amount} diamonds`,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      const transactionsRef = ref(database, 'transactions');
      const newTransactionRef = push(transactionsRef);
      await set(newTransactionRef, {
        ...transaction,
        id: newTransactionRef.key
      });

      alert(`${amount} diamonds ${diamondsAction === 'add' ? 'added' : 'deducted'} successfully!`);
      setDiamondsAmount('');
      setDiamondsDescription('');
      
      // Refresh user data
      const userRef = ref(database, `users/${selectedUser.telegramId}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        setSelectedUser(userSnapshot.val());
      }

    } catch (error) {
      console.error('Error updating diamonds:', error);
      alert('Error updating diamonds. Please try again.');
    }
  };

  // Delete user function
  const handleDeleteUser = async (user: UserData) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Delete user from database
      const userRef = ref(database, `users/${userToDelete.telegramId}`);
      await remove(userRef);

      // Also delete user's transactions (optional)
      const transactionsRef = ref(database, 'transactions');
      const transactionsSnapshot = await get(transactionsRef);
      
      if (transactionsSnapshot.exists()) {
        const deletePromises: Promise<void>[] = [];
        transactionsSnapshot.forEach((childSnapshot) => {
          const transaction = childSnapshot.val();
          if (transaction.userId === userToDelete.telegramId.toString()) {
            deletePromises.push(remove(ref(database, `transactions/${childSnapshot.key}`)));
          }
        });
        
        await Promise.all(deletePromises);
      }

      alert(`User ${userToDelete.firstName} ${userToDelete.lastName} deleted successfully!`);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      
      // If we're currently viewing this user, go back to user list
      if (selectedUser && selectedUser.telegramId === userToDelete.telegramId) {
        setSelectedUser(null);
      }

    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user. Please try again.');
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Delete Confirmation Modal
  const DeleteConfirmationModal = () => {
    if (!showDeleteConfirm || !userToDelete) return null;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-red-500/50">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Delete User</h3>
            
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete <strong>{userToDelete.firstName} {userToDelete.lastName}</strong>?
            </p>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">
                <strong>Warning:</strong> This action cannot be undone. All user data including balance and transaction history will be permanently deleted.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelDeleteUser}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors border border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors border border-red-500 shadow-lg shadow-red-600/25"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Premium Pagination Component
  const Pagination = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-1">
      {/* Users per page selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400 whitespace-nowrap">
          Show:
        </label>
        <select
          value={usersPerPage}
          onChange={(e) => handleUsersPerPageChange(Number(e.target.value))}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="text-sm text-gray-400 whitespace-nowrap">
          of {filteredUsers.length} users
        </span>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {/* First Page Button - Hidden on mobile */}
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="hidden sm:flex items-center justify-center w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page Button */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNumber, index) => (
              pageNumber === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={pageNumber}
                  onClick={() => goToPage(pageNumber as number)}
                  className={`min-w-[40px] h-10 px-2 rounded-lg transition-all duration-200 ${
                    currentPage === pageNumber
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {pageNumber}
                </button>
              )
            ))}
          </div>

          {/* Next Page Button */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page Button - Hidden on mobile */}
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="hidden sm:flex items-center justify-center w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page info - Hidden on mobile */}
      <div className="hidden sm:block text-sm text-gray-400 whitespace-nowrap">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );

  // Mobile User Card Component
  const UserCard = ({ user }: { user: UserData }) => (
    <div className="bg-gray-800 rounded-xl p-4 mb-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-white text-base">
            {user.firstName} {user.lastName}
          </h3>
          <p className="text-gray-400 text-sm">@{user.username}</p>
          <p className="text-gray-400 text-xs mt-1">ID: {user.telegramId}</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleEditUser(user)}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-lg shadow-blue-600/25"
          >
            <Edit className="w-3 h-3" />
            Manage
          </button>
          <button
            onClick={() => handleDeleteUser(user)}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-lg shadow-red-600/25"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-400 text-xs">Balance</p>
          <p className="text-green-400 font-semibold">${user.balance?.toFixed(2) || '0.00'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Total Earned</p>
          <p className="text-blue-400 font-semibold">${user.totalEarned?.toFixed(2) || '0.00'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Total Withdrawn</p>
          <p className="text-orange-400 font-semibold">${user.totalWithdrawn?.toFixed(2) || '0.00'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Joined</p>
          <p className="text-gray-300 text-xs">{formatDate(user.joinDate)}</p>
        </div>
      </div>

      {/* Currency Display */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-700">
        <div className="text-center">
          <Coins className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
          <p className="text-yellow-400 font-semibold text-sm">{user.coins || 0}</p>
          <p className="text-gray-400 text-xs">Coins</p>
        </div>
        <div className="text-center">
          <KeyRound className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-amber-400 font-semibold text-sm">{user.keys || 0}</p>
          <p className="text-gray-400 text-xs">Keys</p>
        </div>
        <div className="text-center">
          <Gem className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="text-blue-400 font-semibold text-sm">{user.diamonds || 0}</p>
          <p className="text-gray-400 text-xs">Diamonds</p>
        </div>
      </div>
    </div>
  );

  // Render Users Table for Desktop
  const renderUsersTable = () => (
    <div className="bg-gray-800 rounded-xl p-6 mt-6 border border-gray-700">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, username, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          />
        </div>
      </div>

      {/* Users Info */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Chat ID</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Balance</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Coins</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Keys</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Diamonds</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Total Earned</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Total Withdrawn</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Joined On</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map((user) => (
              <tr key={user.telegramId} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-white">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-400">
                      @{user.username}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-300">
                  {user.telegramId}
                </td>
                <td className="py-3 px-4">
                  <span className="text-green-400 font-semibold">
                    ${user.balance?.toFixed(2) || '0.00'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-400 font-semibold">
                      {user.coins || 0}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-400 font-semibold">
                      {user.keys || 0}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Gem className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-semibold">
                      {user.diamonds || 0}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-blue-400 font-semibold">
                    ${user.totalEarned?.toFixed(2) || '0.00'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-orange-400 font-semibold">
                    ${user.totalWithdrawn?.toFixed(2) || '0.00'}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-300">
                  {formatDate(user.joinDate)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-lg shadow-blue-600/25"
                    >
                      <Edit className="w-4 h-4" />
                      Manage
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-lg shadow-red-600/25"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {currentUsers.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            {searchTerm ? 'No users found matching your search.' : 'No users found.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination />
    </div>
  );

  if (selectedUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCloseUserDetails}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-all duration-200 border border-gray-600"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Users</span>
                <span className="sm:hidden">Back</span>
              </button>
              <h1 className="text-xl sm:text-2xl font-bold">User Management</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteUser(selectedUser)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-lg shadow-red-600/25"
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </button>
              <div className="text-sm text-gray-400 hidden sm:block">
                User ID: {selectedUser.telegramId}
              </div>
            </div>
          </div>

          {/* User Info Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <p className="text-gray-400">@{selectedUser.username}</p>
                <p className="text-gray-400 text-sm mt-1 sm:hidden">
                  User ID: {selectedUser.telegramId}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Balance</p>
                  <p className="text-green-400 font-bold text-lg">
                    ${selectedUser.balance?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Total Earned</p>
                  <p className="text-blue-400 font-bold">
                    ${selectedUser.totalEarned?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Total Withdrawn</p>
                  <p className="text-orange-400 font-bold">
                    ${selectedUser.totalWithdrawn?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Joined</p>
                  <p className="text-gray-300">
                    {formatDate(selectedUser.joinDate)}
                  </p>
                </div>
              </div>

              {/* Currency Display */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
                <div className="text-center">
                  <Coins className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-yellow-400 font-bold text-lg">{selectedUser.coins || 0}</p>
                  <p className="text-gray-400 text-xs">Coins</p>
                </div>
                <div className="text-center">
                  <KeyRound className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-amber-400 font-bold text-lg">{selectedUser.keys || 0}</p>
                  <p className="text-gray-400 text-xs">Keys</p>
                </div>
                <div className="text-center">
                  <Gem className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-400 font-bold text-lg">{selectedUser.diamonds || 0}</p>
                  <p className="text-gray-400 text-xs">Diamonds</p>
                </div>
              </div>
            </div>

            {/* Currency Management */}
            <div className="lg:col-span-2 space-y-6">
              {/* Balance Management */}
              <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  Balance Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Action
                    </label>
                    <select
                      value={balanceAction}
                      onChange={(e) => setBalanceAction(e.target.value as 'add' | 'deduct')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      <option value="add">Add Balance</option>
                      <option value="deduct">Deduct Balance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                      step="0.01"
                      min="0.01"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={balanceDescription}
                    onChange={(e) => setBalanceDescription(e.target.value)}
                    placeholder="Enter description"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                </div>
                <button
                  onClick={handleBalanceUpdate}
                  disabled={!balanceAmount || parseFloat(balanceAmount) <= 0}
                  className={`w-full py-3 rounded-lg font-bold transition-all duration-200 ${
                    !balanceAmount || parseFloat(balanceAmount) <= 0
                      ? 'bg-gray-600 cursor-not-allowed border border-gray-500'
                      : balanceAction === 'add'
                      ? 'bg-green-600 hover:bg-green-700 border border-green-500 shadow-lg shadow-green-600/25'
                      : 'bg-red-600 hover:bg-red-700 border border-red-500 shadow-lg shadow-red-600/25'
                  }`}
                >
                  {balanceAction === 'add' ? 'Add Balance' : 'Deduct Balance'}
                </button>
              </div>

              {/* Coins Management */}
              <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  Coins Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Action
                    </label>
                    <select
                      value={coinsAction}
                      onChange={(e) => setCoinsAction(e.target.value as 'add' | 'deduct')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      <option value="add">Add Coins</option>
                      <option value="deduct">Deduct Coins</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={coinsAmount}
                      onChange={(e) => setCoinsAmount(e.target.value)}
                      placeholder="Enter coins amount"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                      min="1"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={coinsDescription}
                    onChange={(e) => setCoinsDescription(e.target.value)}
                    placeholder="Enter description"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                </div>
                <button
                  onClick={handleCoinsUpdate}
                  disabled={!coinsAmount || parseInt(coinsAmount) <= 0}
                  className={`w-full py-3 rounded-lg font-bold transition-all duration-200 ${
                    !coinsAmount || parseInt(coinsAmount) <= 0
                      ? 'bg-gray-600 cursor-not-allowed border border-gray-500'
                      : coinsAction === 'add'
                      ? 'bg-yellow-600 hover:bg-yellow-700 border border-yellow-500 shadow-lg shadow-yellow-600/25'
                      : 'bg-red-600 hover:bg-red-700 border border-red-500 shadow-lg shadow-red-600/25'
                  }`}
                >
                  {coinsAction === 'add' ? 'Add Coins' : 'Deduct Coins'}
                </button>
              </div>

              {/* Keys Management */}
              <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-500" />
                  Keys Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Action
                    </label>
                    <select
                      value={keysAction}
                      onChange={(e) => setKeysAction(e.target.value as 'add' | 'deduct')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      <option value="add">Add Keys</option>
                      <option value="deduct">Deduct Keys</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={keysAmount}
                      onChange={(e) => setKeysAmount(e.target.value)}
                      placeholder="Enter keys amount"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                      min="1"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={keysDescription}
                    onChange={(e) => setKeysDescription(e.target.value)}
                    placeholder="Enter description"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                </div>
                <button
                  onClick={handleKeysUpdate}
                  disabled={!keysAmount || parseInt(keysAmount) <= 0}
                  className={`w-full py-3 rounded-lg font-bold transition-all duration-200 ${
                    !keysAmount || parseInt(keysAmount) <= 0
                      ? 'bg-gray-600 cursor-not-allowed border border-gray-500'
                      : keysAction === 'add'
                      ? 'bg-amber-600 hover:bg-amber-700 border border-amber-500 shadow-lg shadow-amber-600/25'
                      : 'bg-red-600 hover:bg-red-700 border border-red-500 shadow-lg shadow-red-600/25'
                  }`}
                >
                  {keysAction === 'add' ? 'Add Keys' : 'Deduct Keys'}
                </button>
              </div>

              {/* Diamonds Management */}
              <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                  <Gem className="w-5 h-5 text-blue-400" />
                  Diamonds Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Action
                    </label>
                    <select
                      value={diamondsAction}
                      onChange={(e) => setDiamondsAction(e.target.value as 'add' | 'deduct')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      <option value="add">Add Diamonds</option>
                      <option value="deduct">Deduct Diamonds</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={diamondsAmount}
                      onChange={(e) => setDiamondsAmount(e.target.value)}
                      placeholder="Enter diamonds amount"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                      min="1"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={diamondsDescription}
                    onChange={(e) => setDiamondsDescription(e.target.value)}
                    placeholder="Enter description"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                </div>
                <button
                  onClick={handleDiamondsUpdate}
                  disabled={!diamondsAmount || parseInt(diamondsAmount) <= 0}
                  className={`w-full py-3 rounded-lg font-bold transition-all duration-200 ${
                    !diamondsAmount || parseInt(diamondsAmount) <= 0
                      ? 'bg-gray-600 cursor-not-allowed border border-gray-500'
                      : diamondsAction === 'add'
                      ? 'bg-blue-600 hover:bg-blue-700 border border-blue-500 shadow-lg shadow-blue-600/25'
                      : 'bg-red-600 hover:bg-red-700 border border-red-500 shadow-lg shadow-red-600/25'
                  }`}
                >
                  {diamondsAction === 'add' ? 'Add Diamonds' : 'Deduct Diamonds'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <DeleteConfirmationModal />
      </div>
    );
  }

  function renderUsersList(): React.ReactNode {
    return (
      <div className="bg-gray-800 rounded-xl p-4 mt-6 border border-gray-700">
        {/* Mobile Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users by name, username, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* List */}
        <div>
          {currentUsers.map((user) => (
            <UserCard key={user.telegramId} user={user} />
          ))}

          {currentUsers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {searchTerm ? 'No users found matching your search.' : 'No users found.'}
            </div>
          )}
        </div>

        {/* Pagination (mobile-friendly) */}
        {filteredUsers.length > 0 && <Pagination />}
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Users */}
          <div className="bg-gray-800 rounded-xl p-3 sm:p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Total Users</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 text-white">{stats.totalUsers}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-lg">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Withdrawn */}
          <div className="bg-gray-800 rounded-xl p-3 sm:p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Total Withdrawn</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 text-white">${stats.totalWithdrawn.toFixed(2)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-400" />
              </div>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="bg-gray-800 rounded-xl p-3 sm:p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Total Earnings</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 text-white">${stats.totalEarnings.toFixed(2)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Pending Withdrawals */}
          <div className="bg-gray-800 rounded-xl p-3 sm:p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Pending Withdrawals</p>
                <p className="text-lg sm:text-2xl font-bold mt-1 text-white">${stats.pendingWithdrawals.toFixed(2)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-500/20 rounded-lg">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table/List - Show table on desktop, cards on mobile */}
        <div className="hidden md:block">
          {renderUsersTable()}
        </div>
        <div className="block md:hidden">
          {renderUsersList()}
        </div>
      </div>
      <DeleteConfirmationModal />
    </div>
  );
};

export default Dashboard;