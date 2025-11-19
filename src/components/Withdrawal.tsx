// WithdrawalManagement.tsx
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, update, get } from 'firebase/database';
import { 
  CheckCircle, 
  XCircle, 
  Filter, 
  ArrowLeft, 
  AlertCircle, 
  User, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Loader, 
  MoreVertical,
  Search,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';

// Your Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Types
interface UserData {
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  joinDate: string;
  photoUrl?: string;
}

interface WithdrawalRequest {
  id: string;
  telegramId: number;
  amount: number;
  paymentMethod: string;
  accountId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  completedAt?: string;
  adminNotes?: string;
  user?: {
    firstName: string;
    lastName?: string;
    username?: string;
    photoUrl?: string;
  };
}

interface WithdrawalStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalAmount: number;
  pendingAmount: number;
}

const WithdrawalManagement: React.FC = () => {
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState<WithdrawalStats>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalAmount: 0,
    pendingAmount: 0
  });
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WithdrawalRequest | null>(null);
  const [showNotes, setShowNotes] = useState<{ [key: string]: boolean }>({});
  const [adminNote, setAdminNote] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Check mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Fetch withdrawal requests from Firebase
  useEffect(() => {
    const withdrawsRef = ref(database, 'withdraws');
    
    const handleValueChange = async (snapshot: any) => {
      if (snapshot.exists()) {
        const allWithdrawals: WithdrawalRequest[] = [];
        
        // Iterate through all user withdrawals
        snapshot.forEach((userSnapshot: any) => {
          const userId = userSnapshot.key;
          userSnapshot.forEach((withdrawalSnapshot: any) => {
            const withdrawal = withdrawalSnapshot.val();
            withdrawal.id = withdrawalSnapshot.key;
            withdrawal.telegramId = parseInt(userId);
            
            allWithdrawals.push(withdrawal);
          });
        });

        // Sort by creation date (newest first)
        const sortedWithdrawals = allWithdrawals.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Fetch user data for each withdrawal
        const withdrawalsWithUserData = await Promise.all(
          sortedWithdrawals.map(async (withdrawal) => {
            try {
              const userRef = ref(database, `users/${withdrawal.telegramId}`);
              const userSnapshot = await get(userRef);
              
              if (userSnapshot.exists()) {
                const userData = userSnapshot.val() as UserData;
                return {
                  ...withdrawal,
                  user: {
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    username: userData.username || '',
                    photoUrl: userData.photoUrl || ''
                  }
                };
              }
              return withdrawal;
            } catch (error) {
              console.error('Error fetching user data:', error);
              return withdrawal;
            }
          })
        );

        setWithdrawalRequests(withdrawalsWithUserData);
        calculateStats(withdrawalsWithUserData);
      } else {
        setWithdrawalRequests([]);
        calculateStats([]);
      }
      setLoading(false);
    };

    onValue(withdrawsRef, handleValueChange);

    return () => {
      off(withdrawsRef, 'value', handleValueChange);
    };
  }, []);

  const calculateStats = (withdrawals: WithdrawalRequest[]) => {
    const pending = withdrawals.filter(w => w.status === 'pending');
    const approved = withdrawals.filter(w => w.status === 'approved');
    const rejected = withdrawals.filter(w => w.status === 'rejected');
    
    const totalPending = pending.length;
    const totalApproved = approved.length;
    const totalRejected = rejected.length;
    const totalAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const pendingAmount = pending.reduce((sum, w) => sum + w.amount, 0);

    setStats({
      totalPending,
      totalApproved,
      totalRejected,
      totalAmount,
      pendingAmount
    });
  };

  const handleApprove = async (withdrawal: WithdrawalRequest) => {
    if (!withdrawal.telegramId) {
      alert('Error: User ID not found');
      return;
    }

    setProcessingId(withdrawal.id);
    
    try {
      const updates = {
        status: 'approved' as const,
        completedAt: new Date().toISOString(),
        adminNotes: adminNote || 'Withdrawal approved by administrator'
      };

      // Update withdrawal status in Firebase
      const withdrawalRef = ref(database, `withdraws/${withdrawal.telegramId}/${withdrawal.id}`);
      await update(withdrawalRef, updates);

      // Update user's total withdrawn amount
      const userRef = ref(database, `users/${withdrawal.telegramId}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val() as UserData;
        const newTotalWithdrawn = (userData.totalWithdrawn || 0) + withdrawal.amount;
        
        await update(userRef, {
          totalWithdrawn: newTotalWithdrawn
        });
      }

      // Update local state
      setWithdrawalRequests(prev => 
        prev.map(w => 
          w.id === withdrawal.id 
            ? { ...w, ...updates }
            : w
        )
      );

      // Reset admin note
      setAdminNote('');
      
      // Close mobile detail view if open
      if (isMobile) {
        setSelectedTransaction(null);
      }

      // Send notification to user
      await sendNotification(withdrawal.telegramId, 'approved', withdrawal.amount);

      alert('Withdrawal approved successfully!');
      
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      alert('Error approving withdrawal. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (withdrawal: WithdrawalRequest) => {
    if (!withdrawal.telegramId) {
      alert('Error: User ID not found');
      return;
    }

    setProcessingId(withdrawal.id);
    
    try {
      const updates = {
        status: 'rejected' as const,
        completedAt: new Date().toISOString(),
        adminNotes: adminNote || 'Withdrawal rejected by administrator'
      };

      // Update withdrawal status in Firebase
      const withdrawalRef = ref(database, `withdraws/${withdrawal.telegramId}/${withdrawal.id}`);
      await update(withdrawalRef, updates);

      // Refund amount to user's balance
      const userRef = ref(database, `users/${withdrawal.telegramId}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val() as UserData;
        const newBalance = (userData.balance || 0) + withdrawal.amount;
        
        await update(userRef, {
          balance: newBalance
        });
      }

      // Update local state
      setWithdrawalRequests(prev => 
        prev.map(w => 
          w.id === withdrawal.id 
            ? { ...w, ...updates }
            : w
        )
      );

      // Reset admin note
      setAdminNote('');
      
      // Close mobile detail view if open
      if (isMobile) {
        setSelectedTransaction(null);
      }

      // Send notification to user
      await sendNotification(withdrawal.telegramId, 'rejected', withdrawal.amount);

      alert('Withdrawal rejected and amount refunded to user!');
      
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      alert('Error rejecting withdrawal. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const sendNotification = async (userId: number, action: 'approved' | 'rejected', amount: number) => {
    console.log(`Notification: Withdrawal ${action} for user ${userId}, amount: ${amount}`);
    // Implement your Telegram bot notification logic here
  };

  const toggleNotes = (id: string) => {
    setShowNotes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const addAdminNote = (withdrawal: WithdrawalRequest) => {
    if (!adminNote.trim()) return;

    const updates = {
      adminNotes: adminNote
    };

    const withdrawalRef = ref(database, `withdraws/${withdrawal.telegramId}/${withdrawal.id}`);
    update(withdrawalRef, updates);

    // Update local state
    setWithdrawalRequests(prev => 
      prev.map(w => 
        w.id === withdrawal.id 
          ? { ...w, ...updates }
          : w
      )
    );

    setAdminNote('');
    alert('Admin note added successfully!');
  };

  // Filter and search logic
  const filteredRequests = withdrawalRequests.filter(withdrawal => {
    const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter;
    
    const matchesSearch = searchTerm === '' || 
      withdrawal.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.accountId.includes(searchTerm) ||
      withdrawal.telegramId.toString().includes(searchTerm);

    // Date filtering
    const withdrawalDate = new Date(withdrawal.createdAt);
    const now = new Date();
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && withdrawalDate.toDateString() === now.toDateString()) ||
      (dateFilter === 'week' && (now.getTime() - withdrawalDate.getTime()) <= 7 * 24 * 60 * 60 * 1000) ||
      (dateFilter === 'month' && withdrawalDate.getMonth() === now.getMonth() && withdrawalDate.getFullYear() === now.getFullYear());

    return matchesStatus && matchesSearch && matchesDate;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'approved': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Loader className="w-4 h-4 animate-spin" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = ['User ID', 'Name', 'Username', 'Amount', 'Payment Method', 'Account ID', 'Status', 'Created At', 'Completed At'];
    const csvData = filteredRequests.map(withdrawal => [
      withdrawal.telegramId,
      `${withdrawal.user?.firstName || ''} ${withdrawal.user?.lastName || ''}`.trim(),
      withdrawal.user?.username || '',
      withdrawal.amount,
      withdrawal.paymentMethod,
      withdrawal.accountId,
      withdrawal.status,
      withdrawal.createdAt,
      withdrawal.completedAt || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdrawals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Mobile Transaction Card Component
  const MobileTransactionCard = ({ withdrawal }: { withdrawal: WithdrawalRequest }) => (
    <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {withdrawal.user?.photoUrl ? (
            <img
              src={withdrawal.user.photoUrl}
              alt={withdrawal.user.firstName}
              className="w-10 h-10 rounded-xl border border-blue-500/30"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <User className="w-5 h-5 text-blue-400" />
            </div>
          )}
          <div>
            <div className="font-semibold text-white">
              {withdrawal.user?.firstName && withdrawal.user?.lastName 
                ? `${withdrawal.user.firstName} ${withdrawal.user.lastName}`
                : `User ${withdrawal.telegramId}`
              }
            </div>
            {withdrawal.user?.username && (
              <div className="text-sm text-blue-400">@{withdrawal.user.username}</div>
            )}
          </div>
        </div>
        <button
          onClick={() => setSelectedTransaction(withdrawal)}
          className="p-2 hover:bg-gray-700/50 rounded-xl transition-colors"
        >
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Amount and Method */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-xl text-white">
            {formatCurrency(withdrawal.amount)}
          </div>
          <div className="text-sm text-gray-400 capitalize">{withdrawal.paymentMethod}</div>
        </div>
        <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border ${getStatusColor(withdrawal.status)}`}>
          {getStatusIcon(withdrawal.status)}
          <span className="text-sm font-medium">
            {getStatusText(withdrawal.status)}
          </span>
        </div>
      </div>

      {/* Account Details */}
      <div className="flex items-center space-x-2 mb-3">
        <CreditCard className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-400 font-mono">
          {withdrawal.accountId}
        </span>
      </div>

      {/* Date */}
      <div className="flex items-center space-x-2 text-sm text-gray-400 mb-4">
        <Calendar className="w-4 h-4" />
        <span>{formatDate(withdrawal.createdAt)}</span>
      </div>

      {/* Admin Notes */}
      {withdrawal.adminNotes && (
        <div className="mb-4">
          <button
            onClick={() => toggleNotes(withdrawal.id)}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            {showNotes[withdrawal.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showNotes[withdrawal.id] ? 'Hide Notes' : 'Show Notes'}</span>
          </button>
          {showNotes[withdrawal.id] && (
            <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-yellow-300 text-sm">{withdrawal.adminNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions for pending transactions */}
      {withdrawal.status === 'pending' && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleApprove(withdrawal)}
            disabled={processingId === withdrawal.id}
            className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingId === withdrawal.id ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>{processingId === withdrawal.id ? 'Processing...' : 'Approve'}</span>
          </button>
          <button
            onClick={() => handleReject(withdrawal)}
            disabled={processingId === withdrawal.id}
            className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingId === withdrawal.id ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>{processingId === withdrawal.id ? 'Processing...' : 'Reject'}</span>
          </button>
        </div>
      )}
    </div>
  );

  // Mobile Detail View
  const MobileDetailView = ({ withdrawal }: { withdrawal: WithdrawalRequest }) => (
    <div className="fixed inset-0 bg-gray-900 z-50 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setSelectedTransaction(null)}
          className="p-3 hover:bg-gray-700/50 rounded-2xl transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white">Withdrawal Details</h2>
        <div className="w-10"></div>
      </div>

      <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 mb-6">
        {/* User Info */}
        <div className="flex items-center space-x-4 mb-6">
          {withdrawal.user?.photoUrl ? (
            <img
              src={withdrawal.user.photoUrl}
              alt={withdrawal.user.firstName}
              className="w-16 h-16 rounded-2xl border border-blue-500/30"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
              <User className="w-8 h-8 text-blue-400" />
            </div>
          )}
          <div className="flex-1">
            <div className="font-bold text-white text-lg">
              {withdrawal.user?.firstName && withdrawal.user?.lastName 
                ? `${withdrawal.user.firstName} ${withdrawal.user.lastName}`
                : `User ${withdrawal.telegramId}`
              }
            </div>
            {withdrawal.user?.username && (
              <div className="text-blue-400 text-sm">@{withdrawal.user.username}</div>
            )}
            <div className="text-gray-400 text-sm mt-1">User ID: {withdrawal.telegramId}</div>
          </div>
        </div>

        {/* Amount and Status */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Amount</div>
            <div className="font-bold text-2xl text-white">
              {formatCurrency(withdrawal.amount)}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Status</div>
            <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${getStatusColor(withdrawal.status)}`}>
              {getStatusIcon(withdrawal.status)}
              <span className="text-sm font-medium">
                {getStatusText(withdrawal.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-4">
          <div>
            <div className="text-gray-400 text-sm mb-1">Payment Method</div>
            <div className="text-white font-medium capitalize">{withdrawal.paymentMethod}</div>
          </div>
          
          <div>
            <div className="text-gray-400 text-sm mb-1">Account Number</div>
            <div className="text-white font-mono">{withdrawal.accountId}</div>
          </div>

          <div>
            <div className="text-gray-400 text-sm mb-1">Created</div>
            <div className="text-white">{formatDate(withdrawal.createdAt)}</div>
          </div>

          {withdrawal.completedAt && (
            <div>
              <div className="text-gray-400 text-sm mb-1">Processed</div>
              <div className="text-white">{formatDate(withdrawal.completedAt)}</div>
            </div>
          )}

          {withdrawal.adminNotes && (
            <div>
              <div className="text-gray-400 text-sm mb-1">Admin Notes</div>
              <div className="text-yellow-300 bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
                {withdrawal.adminNotes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Notes Input */}
      {withdrawal.status === 'pending' && (
        <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 mb-6">
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">Add Admin Note</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Enter notes for this withdrawal..."
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 resize-none"
              rows={3}
            />
          </div>
          <button
            onClick={() => addAdminNote(withdrawal)}
            disabled={!adminNote.trim()}
            className="w-full px-4 py-3 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-xl font-semibold text-sm transition-all duration-200 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Note
          </button>
        </div>
      )}

      {/* Actions */}
      {withdrawal.status === 'pending' && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleApprove(withdrawal)}
            disabled={processingId === withdrawal.id}
            className="flex-1 inline-flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingId === withdrawal.id ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <span>{processingId === withdrawal.id ? 'Processing...' : 'Approve'}</span>
          </button>
          <button
            onClick={() => handleReject(withdrawal)}
            disabled={processingId === withdrawal.id}
            className="flex-1 inline-flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingId === withdrawal.id ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{processingId === withdrawal.id ? 'Processing...' : 'Reject'}</span>
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white text-lg font-medium">Loading withdrawal requests...</div>
        </div>
      </div>
    );
  }

  // Mobile Detail View Overlay
  if (isMobile && selectedTransaction) {
    return <MobileDetailView withdrawal={selectedTransaction} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Withdrawal Management
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Manage and process user withdrawal requests
              </p>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-green-500/20 border border-green-500/50 text-green-300 rounded-xl font-semibold text-sm transition-all duration-200 hover:bg-green-500/30 hover:scale-105"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/20 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-yellow-500/20 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-yellow-400 text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Pending</div>
                <div className="text-xl sm:text-3xl font-bold text-white">{stats.totalPending}</div>
                <div className="text-gray-400 text-xs sm:text-sm mt-1">Awaiting approval</div>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-500/20 rounded-xl">
                <Loader className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400 animate-spin" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/20 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-green-500/20 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-400 text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Approved</div>
                <div className="text-xl sm:text-3xl font-bold text-white">{stats.totalApproved}</div>
                <div className="text-gray-400 text-xs sm:text-sm mt-1">Completed requests</div>
              </div>
              <div className="p-2 sm:p-3 bg-green-500/20 rounded-xl">
                <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/20 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-red-500/20 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-red-400 text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Rejected</div>
                <div className="text-xl sm:text-3xl font-bold text-white">{stats.totalRejected}</div>
                <div className="text-gray-400 text-xs sm:text-sm mt-1">Rejected requests</div>
              </div>
              <div className="p-2 sm:p-3 bg-red-500/20 rounded-xl">
                <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/20 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-blue-500/20 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-400 text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Pending Amount</div>
                <div className="text-xl sm:text-3xl font-bold text-white">
                  {formatCurrency(stats.pendingAmount)}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm mt-1">Awaiting payment</div>
              </div>
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-xl">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/20 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-purple-500/20 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-purple-400 text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Total Amount</div>
                <div className="text-xl sm:text-3xl font-bold text-white">
                  {formatCurrency(stats.totalAmount)}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm mt-1">All withdrawals</div>
              </div>
              <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-4 sm:px-6 pb-6">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/20 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-gray-700/50 shadow-lg">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, username, account ID, or user ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-xl text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-3">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full lg:w-40 bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-xl text-sm sm:text-base"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full lg:w-40 bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-xl text-sm sm:text-base"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Withdrawal Requests */}
      <div className="px-4 sm:px-6 pb-8">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/20 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-lg overflow-hidden">
          {currentItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-gray-600/50">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-400 mb-3">
                No withdrawal requests found
              </h3>
              <p className="text-gray-500 max-w-md mx-auto text-sm sm:text-base px-4">
                {statusFilter !== 'all' 
                  ? `No ${statusFilter} withdrawal requests found.`
                  : 'No withdrawal requests have been made yet.'}
              </p>
            </div>
          ) : isMobile ? (
            // Mobile View - Cards
            <div className="p-4">
              {currentItems.map((withdrawal) => (
                <MobileTransactionCard 
                  key={`${withdrawal.telegramId}-${withdrawal.id}`} 
                  withdrawal={withdrawal} 
                />
              ))}
            </div>
          ) : (
            // Desktop View - Table
            <>
              <div className="overflow-x-auto whitespace-nowrap">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700/50 bg-gray-800/30">
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        User Details
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Amount & Method
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {currentItems.map((withdrawal) => (
                      <tr 
                        key={`${withdrawal.telegramId}-${withdrawal.id}`} 
                        className="hover:bg-gray-700/20 transition-all duration-200 group"
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            {withdrawal.user?.photoUrl ? (
                              <img
                                src={withdrawal.user.photoUrl}
                                alt={withdrawal.user.firstName}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-blue-500/30"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                                <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <div className="font-semibold text-white group-hover:text-blue-300 transition-colors text-sm sm:text-base">
                                  {withdrawal.user?.firstName && withdrawal.user?.lastName 
                                    ? `${withdrawal.user.firstName} ${withdrawal.user.lastName}`
                                    : `User ${withdrawal.telegramId}`
                                  }
                                </div>
                              </div>
                              <div className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
                                User ID: {withdrawal.telegramId}
                              </div>
                              {withdrawal.user?.username && (
                                <div className="text-xs sm:text-sm text-blue-400 mt-1">
                                  @{withdrawal.user.username}
                                </div>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                                <span className="text-xs sm:text-sm text-gray-400 font-mono">
                                  {withdrawal.accountId}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="font-bold text-lg sm:text-xl text-white">
                                {formatCurrency(withdrawal.amount)}
                              </div>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-400 capitalize">
                              {withdrawal.paymentMethod}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-xl border ${getStatusColor(withdrawal.status)}`}>
                            {getStatusIcon(withdrawal.status)}
                            <span className="text-sm font-medium">
                              {getStatusText(withdrawal.status)}
                            </span>
                          </div>
                          {withdrawal.adminNotes && (
                            <button
                              onClick={() => toggleNotes(withdrawal.id)}
                              className="mt-2 flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                            >
                              {showNotes[withdrawal.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span>{showNotes[withdrawal.id] ? 'Hide Notes' : 'Show Notes'}</span>
                            </button>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(withdrawal.createdAt)}</span>
                          </div>
                          {withdrawal.completedAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              Processed: {formatDate(withdrawal.completedAt)}
                            </div>
                          )}
                          {showNotes[withdrawal.id] && withdrawal.adminNotes && (
                            <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                              <p className="text-yellow-300 text-xs">{withdrawal.adminNotes}</p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          {withdrawal.status === 'pending' && (
                            <div className="flex space-x-2 sm:space-x-3">
                              <button
                                onClick={() => handleApprove(withdrawal)}
                                disabled={processingId === withdrawal.id}
                                className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg shadow-green-500/20"
                              >
                                {processingId === withdrawal.id ? (
                                  <Loader className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                )}
                                <span>
                                  {processingId === withdrawal.id ? 'Processing...' : 'Approve'}
                                </span>
                              </button>
                              <button
                                onClick={() => handleReject(withdrawal)}
                                disabled={processingId === withdrawal.id}
                                className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg shadow-red-500/20"
                              >
                                {processingId === withdrawal.id ? (
                                  <Loader className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                )}
                                <span>
                                  {processingId === withdrawal.id ? 'Processing...' : 'Reject'}
                                </span>
                              </button>
                            </div>
                          )}
                          {withdrawal.status !== 'pending' && (
                            <span className="text-gray-500 text-xs sm:text-sm italic">
                              Already processed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center py-4 sm:py-6 border-t border-gray-700/50 bg-gray-800/30">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-700/50 border border-gray-600/50 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                    >
                      <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Prev</span>
                    </button>
                    <span className="text-gray-300 text-xs sm:text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-700/50 border border-gray-600/50 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                    >
                      <span>Next</span>
                      <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 transform rotate-180" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WithdrawalManagement;