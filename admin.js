import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js';
import { getDatabase, ref, onValue, update, set, push, get, query, limitToLast } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyACrAgpR14dAu54vW45RKkcFM_wD-f2p-0",
  authDomain: "coinbase-tgwallet.firebaseapp.com",
  projectId: "coinbase-tgwallet",
  databaseURL: "https://coinbase-tgwallet-default-rtdb.firebaseio.com",
  storageBucket: "coinbase-tgwallet.firebasestorage.app",
  messagingSenderId: "441804145305",
  appId: "1:441804145305:web:1fb586667c0d648c342e08",
  measurementId: "G-374F8YD4KV",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const usersRef = ref(database, 'users');
const settingsRef = ref(database, 'settings');
const logsRef = ref(database, 'logs');
const notificationsRef = ref(database, 'notifications');    

// Currency conversion rates (aligned with dashboard.js)
const conversionRates = {
  USD: { USD: 1, USDT: 1, BTC: 0.000015, ETH: 0.00033 },
  USDT: { USD: 1, USDT: 1, BTC: 0.000015, ETH: 0.00033 },
  BTC: { USD: 66666.67, USDT: 66666.67, BTC: 1, ETH: 22 },
  ETH: { USD: 3030.30, USDT: 3030.30, BTC: 0.045, ETH: 1 }
};

// Utility Functions
window.truncateAddress = function(address) {
  if (!address || address.length < 10) return address || "N/A";
  return `${address.slice(0, 6)}...${address.slice(-5)}`;
};

function generateEthAddress() {
  const wallet = ethers.Wallet.createRandom();
  return wallet.address;
}

function formatDate(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleString() : 'N/A';
}

function downloadCSV(data, filename) {
  const csv = data.map(row => Object.values(row).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  a.click();
  window.URL.revokeObjectURL(url);
}

// Initialize Charts
const transactionChart = new Chart(document.getElementById('transaction-chart'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Transaction Volume ($)',
      data: [],
      borderColor: 'rgb(15, 124, 219)',
      backgroundColor: 'rgba(15, 124, 219, 0.2)',
      fill: true,
      tension: 0.4,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Amount ($)' } },
      x: { title: { display: true, text: 'Date' } }
    }
  }
});

const userGrowthChart = new Chart(document.getElementById('user-growth-chart'), {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'New Users',
      data: [],
      backgroundColor: 'rgb(15, 124, 219)',
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Users' } },
      x: { title: { display: true, text: 'Date' } }
    }
  }
});

const platformMetricsChart = new Chart(document.getElementById('platform-metrics-chart'), {
  type: 'pie',
  data: {
    labels: ['Deposits', 'Withdrawals', 'Fees', 'Referral Bonuses', 'Investments'],
    datasets: [{
      data: [0, 0, 0, 0, 0],
      backgroundColor: ['#0f7cdb', '#dc3545', '#28a745', '#ffd700', '#17a2b8'],
      borderColor: '#000',
      borderWidth: 1,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
  }
});

$(document).ready(function() {
  // Initialize Modals
  $("#add-user-modal, #edit-user-modal, #edit-investment-modal").iziModal({
    background: '#222',
    headerColor: '#333',
    width: '90%',
    maxWidth: 600,
    radius: 10,
    transitionIn: 'fadeInUp',
    transitionOut: 'fadeOutDown',
  });

  // Initialize DataTables with custom sorting for transactions
  const usersTable = $('#users-table').DataTable({
    pageLength: 10,
    responsive: true,
    columnDefs: [{ orderable: false, targets: [0, 10] }],
    order: [[1, 'desc']],
  });

  // Custom sorting to prioritize pending transactions
  $.fn.dataTable.ext.order['dom-status'] = function(settings, col) {
    return this.api().rows({ order: 'index' }).nodes().map(function(row) {
      const status = $(row).find('td').eq(col).text();
      return status === 'pending' ? 0 : 1; // Pending = 0 (top), others = 1
    }).toArray();
  };

  const transactionsTable = $('#transactions-table').DataTable({
    pageLength: 10,
    responsive: true,
    columnDefs: [
      { orderable: false, targets: [0, 8] },
      { width: '5%', targets: 0 },
      { orderDataType: 'dom-status', targets: 6 } // Apply custom sorting to status column
    ],
    order: [[6, 'asc'], [7, 'desc']], // Primary: status (pending first), Secondary: timestamp (desc)
  });

  const investmentsTable = $('#investments-table').DataTable({
    pageLength: 10,
    responsive: true,
    columnDefs: [{ orderable: false, targets: [6] }],
    order: [[2, 'desc']],
  });

  const notificationsTable = $('#notifications-table').DataTable({
    pageLength: 5,
    responsive: true,
    order: [[0, 'desc']],
  });

  const referrersTable = $('#referrers-table').DataTable({
    pageLength: 5,
    responsive: true,
    order: [[1, 'desc']],
  });

  const activityTable = $('#activity-table').DataTable({
    pageLength: 10,
    responsive: true,
    order: [[2, 'desc']],
  });

  const logsTable = $('#logs-table').DataTable({
    pageLength: 10,
    responsive: true,
    order: [[0, 'desc']],
  });

  // Sidebar Navigation
  $('.sidebar ul li a').on('click', function(e) {
    e.preventDefault();
    $('.sidebar ul li a').removeClass('active');
    $(this).addClass('active');
    const sectionId = $(this).attr('href').substring(1);
    $('.section').addClass('d-none');
    $(`#${sectionId}`).removeClass('d-none');
    if ($(window).width() <= 768) {
      $('#sidebar').removeClass('active').addClass('hidden');
      $('#main-content').addClass('full');
    }
  });

  // Toggle Sidebar
  $('#toggle-sidebar').on('click', function() {
    $('#sidebar').toggleClass('active hidden');
    $('#main-content').toggleClass('full');
  });

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Fetch and Display Dashboard Stats
  async function updateDashboardStats() {
    try {
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val() || {};
      let totalUsers = 0, totalBalance = 0, pendingTransactions = 0, totalInvestments = 0, unreadNotifications = 0;

      for (const uid in users) {
        totalUsers++;
        totalBalance += parseFloat(users[uid].balance || 0);
        totalInvestments += parseFloat(users[uid].investment?.amount || 0);
        const transactionsSnapshot = await get(ref(database, `users/${uid}/transactions`));
        const transactions = transactionsSnapshot.val() || {};
        for (const txId in transactions) {
          if (transactions[txId].status === 'pending') pendingTransactions++;
        }
        const notificationsSnapshot = await get(ref(database, `users/${uid}/notifications`));
        const notifications = notificationsSnapshot.val() || {};
        for (const notifId in notifications) {
          if (!notifications[notifId].read) unreadNotifications++;
        }
      }

      $('#total-users').text(totalUsers);
      $('#total-balance').text(`$${totalBalance.toFixed(2)}`);
      $('#pending-transactions').text(pendingTransactions);
      $('#total-investments').text(`$${totalInvestments.toFixed(2)}`);
      $('#unread-notifications').text(unreadNotifications);
      $('#daily-revenue').text(`$${(totalBalance * 0.01).toFixed(2)}`);

      // Update Transaction Chart
      const transactionData = {};
      for (const uid in users) {
        const transactionsSnapshot = await get(query(ref(database, `users/${uid}/transactions`), limitToLast(100)));
        const transactions = transactionsSnapshot.val() || {};
        for (const txId in transactions) {
          const tx = transactions[txId];
          const amount = parseFloat(tx.amount);
          if (tx.type !== 'Fee Payment' && !isNaN(amount) && amount > 0) {
            const date = new Date(tx.timestamp).toLocaleDateString();
            const amountInUSD = tx.currency && tx.currency !== 'USD' ? amount / (conversionRates[tx.currency]?.USD || 1) : amount;
            transactionData[date] = (transactionData[date] || 0) + amountInUSD;
          }
        }
      }
      const labels = Object.keys(transactionData).sort().slice(-7);
      const data = labels.map(date => transactionData[date] || 0);
      transactionChart.data.labels = labels;
      transactionChart.data.datasets[0].data = data;
      transactionChart.update();

      // Update User Growth Chart
      const userGrowthData = {};
      for (const uid in users) {
        const createdAt = users[uid].createdAt || new Date().toISOString();
        const date = new Date(createdAt).toLocaleDateString();
        userGrowthData[date] = (userGrowthData[date] || 0) + 1;
      }
      const growthLabels = Object.keys(userGrowthData).sort().slice(-7);
      const growthData = growthLabels.map(date => userGrowthData[date] || 0);
      userGrowthChart.data.labels = growthLabels;
      userGrowthChart.data.datasets[0].data = growthData;
      userGrowthChart.update();

      // Update Platform Metrics Chart
      const deposits = totalBalance * 0.5;
      const withdrawals = totalBalance * 0.3;
      const fees = totalBalance * 0.1;
      const referralBonuses = totalBalance * 0.05;
      const investments = totalInvestments;
      platformMetricsChart.data.datasets[0].data = [deposits, withdrawals, fees, referralBonuses, investments];
      platformMetricsChart.update();
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to update dashboard: ${error.message}`, position: "topRight" });
      console.error("Dashboard stats error:", error);
      await logAdminAction('Dashboard Stats Error', `Failed to update dashboard stats: ${error.message}`);
    }
  }

  // Fetch and Display Users
  onValue(usersRef, (snapshot) => {
    const users = snapshot.val() || {};
    usersTable.clear();
    for (const userId in users) {
      const user = users[userId];
      const displayUsername = userId === "54321" ? "@Anonymous" : user.username ? `@${user.username}` : "@N/A";
      usersTable.row.add([
        `<input type="checkbox" class="user-checkbox" data-user-id="${userId}">`,
        userId,
        displayUsername,
        user.fullName || "N/A",
        user.email || "N/A",
        `<span class="wallet-cell">${truncateAddress(user.wallet || '')}<button class="btn-copy ms-2" data-wallet="${user.wallet || ''}"><i class="fas fa-copy"></i></button></span>`,
        `$${parseFloat(user.balance || 0).toFixed(2)}`,
        user.referrals || 0,
        `$${parseFloat(user.investment?.amount || 0).toFixed(2)}`,
        user.status || 'Active',
        `
          <button class="btn-edit" data-user-id="${userId}"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn-cancel suspend-user" data-user-id="${userId}" data-status="${user.status || 'Active'}">
            <i class="fas fa-${user.status === 'Suspended' ? 'unlock' : 'ban'}"></i> ${user.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}
          </button>
        `
      ]);
    }
    usersTable.draw();
  }, { onlyOnce: false });

  // Fetch and Display Transactions
  async function updateTransactionsTable() {
    try {
      transactionsTable.clear();
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val() || {};
      for (const uid in users) {
        const transactionsSnapshot = await get(query(ref(database, `users/${uid}/transactions`), limitToLast(100)));
        const transactions = transactionsSnapshot.val() || {};
        for (const txId in transactions) {
          const tx = transactions[txId];
          const amount = parseFloat(tx.amount);
          const currency = tx.currency || 'USD';
          const formattedAmount = isNaN(amount) || amount <= 0
            ? 'Invalid Amount'
            : tx.type === 'Fee Payment' && (currency === 'BTC' || currency === 'ETH')
            ? `${amount.toFixed(6)} ${currency}`
            : `${amount.toFixed(2)} ${currency}`;
          transactionsTable.row.add([
            `<input type="checkbox" class="transaction-checkbox" data-txid="${txId}" data-uid="${uid}">`,
            uid,
            formattedAmount,
            `<span class="wallet-cell">${truncateAddress(tx.wallet || 'N/A')}<button class="btn-copy ms-2" data-wallet="${tx.wallet || ''}"><i class="fas fa-copy"></i></button></span>`,
            tx.network || 'N/A',
            tx.type || 'Unknown',
            tx.status || 'Unknown',
            formatDate(tx.timestamp),
            tx.status === 'pending'
              ? `
                <button class="btn btn-primary btn-sm approve-tx" data-txid="${txId}" data-uid="${uid}"><i class="fas fa-check"></i></button>
                <button class="btn btn-cancel btn-sm reject-tx" data-txid="${txId}" data-uid="${uid}"><i class="fas fa-times"></i></button>
              `
              : ''
          ]);
        }
      }
      transactionsTable.draw();
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to fetch transactions: ${error.message}`, position: "topRight" });
      console.error("Transactions fetch error:", error);
      await logAdminAction('Transactions Fetch Error', `Failed to fetch transactions: ${error.message}`);
    }
  }

  // Fetch and Display Investments
  async function updateInvestmentsTable() {
    try {
      investmentsTable.clear();
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val() || {};
      for (const uid in users) {
        const user = users[uid];
        if (user.investment?.amount > 0) {
          const lastClaim = user.investment.lastClaim ? new Date(user.investment.lastClaim) : null;
          const nextClaim = lastClaim ? new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000) : null;
          investmentsTable.row.add([
            uid,
            user.username || 'Anonymous',
            `$${parseFloat(user.investment.amount).toFixed(2)}`,
            formatDate(user.investment.lastClaim),
            nextClaim ? nextClaim.toLocaleString() : 'N/A',
            user.investment.autoRenew ? 'Enabled' : 'Disabled',
            `<button class="btn-edit edit-investment" data-user-id="${uid}"><i class="fas fa-edit"></i> Edit</button>`
          ]);
        }
      }
      investmentsTable.draw();
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to fetch investments: ${error.message}`, position: "topRight" });
      console.error("Investments fetch error:", error);
      await logAdminAction('Investments Fetch Error', `Failed to fetch investments: ${error.message}`);
    }
  }

  // Fetch and Display Notifications
  async function updateNotificationsTable() {
    try {
      const notificationsSnapshot = await get(notificationsRef);
      const notifications = notificationsSnapshot.val() || {};
      notificationsTable.clear();
      for (const notifId in notifications) {
        const notif = notifications[notifId];
        notificationsTable.row.add([
          formatDate(notif.timestamp),
          notif.title,
          notif.message,
          notif.target || 'All',
        ]);
      }
      notificationsTable.draw();
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to fetch notifications: ${error.message}`, position: "topRight" });
      console.error("Notifications fetch error:", error);
      await logAdminAction('Notifications Fetch Error', `Failed to fetch notifications: ${error.message}`);
    }
  }

  // Fetch and Display Top Referrers
  async function updateReferrersTable() {
    try {
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val() || {};
      const referrers = [];
      for (const uid in users) {
        const user = users[uid];
        if (user.referrals && user.referrals > 0) {
          referrers.push({
            username: user.username || 'Anonymous',
            referrals: user.referrals || 0,
            totalBonus: (user.referrals * 10).toFixed(2),
          });
        }
      }
      referrers.sort((a, b) => b.referrals - a.referrals);
      referrersTable.clear();
      referrers.slice(0, 10).forEach(referrer => {
        referrersTable.row.add([
          referrer.username,
          referrer.referrals,
          `$${referrer.totalBonus}`,
        ]);
      });
      referrersTable.draw();
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to update referrers: ${error.message}`, position: "topRight" });
      console.error("Referrers fetch error:", error);
      await logAdminAction('Referrers Fetch Error', `Failed to update referrers: ${error.message}`);
    }
  }

  // Fetch and Display User Activity
  async function updateActivityTable() {
    try {
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val() || {};
      activityTable.clear();
      for (const uid in users) {
        const user = users[uid];
        const transactionsSnapshot = await get(query(ref(database, `users/${uid}/transactions`), limitToLast(100)));
        const transactions = transactionsSnapshot.val() || {};
        const actionCount = Object.keys(transactions).length;
        activityTable.row.add([
          uid,
          user.username || 'Anonymous',
          formatDate(user.lastLogin),
          actionCount,
        ]);
      }
      activityTable.draw();
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to update activity: ${error.message}`, position: "topRight" });
      console.error("Activity fetch error:", error);
      await logAdminAction('Activity Fetch Error', `Failed to update activity: ${error.message}`);
    }
  }

  // Fetch and Display Activity Logs
  async function updateLogsTable() {
    try {
      const logsSnapshot = await get(query(logsRef, limitToLast(100)));
      const logs = logsSnapshot.val() || {};
      logsTable.clear();
      for (const logId in logs) {
        const log = logs[logId];
        logsTable.row.add([
          formatDate(log.timestamp),
          log.action,
          log.details || 'No details',
        ]);
      }
      logsTable.draw();
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to update logs: ${error.message}`, position: "topRight" });
      console.error("Logs fetch error:", error);
      await logAdminAction('Logs Fetch Error', `Failed to update logs: ${error.message}`);
    }
  }

  // Copy to Clipboard
  function copyToClipboard(text) {
    if (!text) {
      iziToast.error({ title: "Error", message: "No text to copy!", position: "topRight" });
      return Promise.reject(new Error("Empty text"));
    }
    return navigator.clipboard.writeText(text).then(() => {
      iziToast.success({ title: "Success", message: "Copied to clipboard!", position: "topRight" });
    }).catch(error => {
      iziToast.error({ title: "Error", message: `Failed to copy: ${error.message}`, position: "topRight" });
      console.error("Copy error:", error);
    });
  }

  // Log Admin Action
  async function logAdminAction(action, details) {
    try {
      const logRef = push(logsRef);
      await set(logRef, {
        action,
        details,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to log admin action:", error);
    }
  }

  // Find User by Wallet Address
  async function findUserByWallet(wallet) {
    if (!wallet) return null;
    const usersSnapshot = await get(usersRef);
    const users = usersSnapshot.val() || {};
    for (const uid in users) {
      if (users[uid].wallet && users[uid].wallet.toLowerCase() === wallet.toLowerCase()) {
        return uid;
      }
    }
    return null;
  }

  // Initialize Dashboard
  async function initializeDashboard() {
    await updateDashboardStats();
    await updateTransactionsTable();
    await updateInvestmentsTable();
    await updateNotificationsTable();
    await updateReferrersTable();
    await updateActivityTable();
    await updateLogsTable();
  }

  // Search and Filter Users
  const debouncedUserSearch = debounce(function() {
    const query = $("#search-users").val();
    const status = $("#filter-status").val();
    const currency = $("#filter-currency").val();
    usersTable.search(query).draw();
    if (status || currency) {
      usersTable.rows().every(function() {
        const data = this.data();
        const userStatus = data[9];
        const userCurrency = data[6].includes('BTC') ? 'BTC' : data[6].includes('ETH') ? 'ETH' : 'USD';
        if ((status && userStatus !== status) || (currency && userCurrency !== currency)) {
          this.nodes().to$().hide();
        } else {
          this.nodes().to$().show();
        }
      });
    }
  }, 300);

  $("#search-users, #filter-status, #filter-currency").on("input change", debouncedUserSearch);

  // Search and Filter Transactions
  const debouncedTxSearch = debounce(function() {
    const type = $("#filter-tx-type").val();
    const status = $("#filter-tx-status").val();
    transactionsTable.rows().every(function() {
      const data = this.data();
      const txType = data[5];
      const txStatus = data[6];
      if ((type && txType !== type) || (status && txStatus !== status)) {
        this.nodes().to$().hide();
      } else {
        this.nodes().to$().show();
      }
    });
  }, 300);

  $("#filter-tx-type, #filter-tx-status").on("change", debouncedTxSearch);

  // Search Investments
  const debouncedInvestmentSearch = debounce(function() {
    const query = $("#search-investments").val();
    investmentsTable.search(query).draw();
  }, 300);

  $("#search-investments").on("input", debouncedInvestmentSearch);

  // Export Users
  $("#export-users").on("click", async function() {
    try {
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val() || {};
      const csvData = [['ID', 'Username', 'Full Name', 'Email', 'Wallet', 'Balance', 'Referrals', 'Investment', 'Status']];
      for (const uid in users) {
        const user = users[uid];
        csvData.push([
          uid,
          user.username || 'Anonymous',
          user.fullName || 'N/A',
          user.email || 'N/A',
          user.wallet || 'N/A',
          parseFloat(user.balance || 0).toFixed(2),
          user.referrals || 0,
          parseFloat(user.investment?.amount || 0).toFixed(2),
          user.status || 'Active',
        ]);
      }
      downloadCSV(csvData, 'users_export.csv');
      await logAdminAction('Export Users', 'Exported user data to CSV');
      iziToast.success({ title: "Success", message: "Users exported to CSV!", position: "topRight" });
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to export users: ${error.message}`, position: "topRight" });
      console.error("Export users error:", error);
      await logAdminAction('Export Users Error', `Failed to export users: ${error.message}`);
    }
  });

  // Export Transactions
  $("#export-transactions").on("click", async function() {
    try {
      const csvData = [['User ID', 'Amount', 'Wallet', 'Network', 'Type', 'Status', 'Date']];
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val() || {};
      for (const uid in users) {
        const transactionsSnapshot = await get(query(ref(database, `users/${uid}/transactions`), limitToLast(100)));
        const transactions = transactionsSnapshot.val() || {};
        for (const txId in transactions) {
          const tx = transactions[txId];
          const amount = parseFloat(tx.amount);
          const currency = tx.currency || 'USD';
          const formattedAmount = isNaN(amount) || amount <= 0
            ? 'Invalid Amount'
            : tx.type === 'Fee Payment' && (currency === 'BTC' || currency === 'ETH')
            ? `${amount.toFixed(6)} ${currency}`
            : `${amount.toFixed(2)} ${currency}`;
          csvData.push([
            uid,
            formattedAmount,
            tx.wallet || 'N/A',
            tx.type || 'Unknown',
            tx.status || 'Unknown',
            formatDate(tx.timestamp),
          ]);
        }
      }
      downloadCSV(csvData, 'transactions_export.csv');
      await logAdminAction('Export Transactions', 'Exported transaction data to CSV');
      iziToast.success({ title: "Success", message: "Transactions exported to CSV!", position: "topRight" });
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to export transactions: ${error.message}`, position: "topRight" });
      console.error("Export transactions error:", error);
      await logAdminAction('Export Transactions Error', `Failed to export transactions: ${error.message}`);
    }
  });

  // Export Investments
  $("#export-investments").on("click", async function() {
    try {
      const csvData = [['User ID', 'Username', 'Amount', 'Last Claim', 'Next Claim', 'Auto-Renew']];
      const usersSnapshot = await get(usersRef);
      const users = usersSnapshot.val() || {};
      for (const uid in users) {
        const user = users[uid];
        if (user.investment?.amount > 0) {
          const lastClaim = user.investment.lastClaim ? new Date(user.investment.lastClaim) : null;
          const nextClaim = lastClaim ? new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000) : null;
          csvData.push([
            uid,
            user.username || 'Anonymous',
            parseFloat(user.investment.amount).toFixed(2),
            formatDate(user.investment.lastClaim),
            nextClaim ? nextClaim.toLocaleString() : 'N/A',
            user.investment.autoRenew ? 'Enabled' : 'Disabled',
          ]);
        }
      }
      downloadCSV(csvData, 'investments_export.csv');
      await logAdminAction('Export Investments', 'Exported investment data to CSV');
      iziToast.success({ title: "Success", message: "Investments exported to CSV!", position: "topRight" });
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to export investments: ${error.message}`, position: "topRight" });
      console.error("Export investments error:", error);
      await logAdminAction('Export Investments Error', `Failed to export investments: ${error.message}`);
    }
  });

  // Edit User
  $(document).on("click", ".btn-edit", function() {
    const userId = $(this).data("user-id");
    const userRef = ref(database, `users/${userId}`);
    get(userRef).then((snapshot) => {
      const user = snapshot.val();
      if (user) {
        $("#edit-user-id").val(userId);
        $("#edit-username").val(user.username || "");
        $("#edit-fullName").val(user.fullName || "");
        $("#edit-email").val(user.email || "");
        $("#edit-pin").val(user.pin || "");
        $("#edit-ssin").val(user.ssin || "");
        $("#edit-accountNumber").val(user.accountNumber || "");
        $("#edit-bankName").val(user.bankName || "");
        $("#edit-address").val(user.address || "");
        $("#edit-balance").val(user.balance || 0);
        $("#edit-referrals").val(user.referrals || 0);
        $("#edit-theme").val(user.settings?.theme || "dark");
        $("#edit-currency").val(user.settings?.currency || "USD");
        $("#edit-user-modal").iziModal("open");
      }
    }).catch(error => {
      iziToast.error({ title: "Error", message: `Failed to load user: ${error.message}`, position: "topRight" });
      console.error("Edit user load error:", error);
      logAdminAction('Edit User Load Error', `Failed to load user ${userId}: ${error.message}`);
    });
  });

  // Save User Edits
  $("#edit-user-form").on("submit", async function(e) {
    e.preventDefault();
    const submitButton = $("#submit-edit-user");
    submitButton
      .addClass("loading")
      .prop("disabled", true)
      .html('<i class="fas fa-spin-pulse fa-spinner"></i> Saving...');

    const userId = $("#edit-user-id").val();
    const userRef = ref(database, `users/${userId}`);
    const fullName = $("#edit-fullName").val().trim();
    const email = $("#edit-email").val().trim();
    const pin = $("#edit-pin").val().trim();
    const ssin = $("#edit-ssin").val().trim();
    const accountNumber = $("#edit-accountNumber").val().trim();
    const bankName = $("#edit-bankName").val().trim();
    const address = $("#edit-address").val().trim();
    const balance = parseFloat($("#edit-balance").val());
    const referrals = parseInt($("#edit-referrals").val());
    const theme = $("#edit-theme").val();
    const currency = $("#edit-currency").val();

    if (pin && !/^[0-9]{4}$|^[0-9]{6}$/.test(pin)) {
      iziToast.error({ title: "Error", message: "PIN must be 4 or 6 digits!", position: "topRight" });
      submitButton.removeClass("loading").prop("disabled", false).text("Save");
      return;
    }
    if (isNaN(balance) || balance < 0) {
      iziToast.error({ title: "Error", message: "Invalid balance!", position: "topRight" });
      submitButton.removeClass("loading").prop("disabled", false).text("Save");
      return;
    }
    if (isNaN(referrals) || referrals < 0) {
      iziToast.error({ title: "Error", message: "Invalid referrals count!", position: "topRight" });
      submitButton.removeClass("loading").prop("disabled", false).text("Save");
      return;
    }

    try {
      const snapshot = await get(userRef);
      const user = snapshot.val();
      await update(userRef, {
        fullName,
        email,
        pin,
        ssin,
        accountNumber,
        bankName,
        address,
        balance,
        referrals,
        settings: { theme, currency },
        notifications: {
          ...user.notifications,
          [`edit_${Date.now()}`]: {
            title: "Account Updated",
            message: "Your account details were updated by an admin.",
            timestamp: new Date().toISOString(),
            read: false
          }
        }
      });
      await logAdminAction('Edit User', `Updated user ${userId} (${fullName || user.username})`);
      iziToast.success({ title: "Success", message: "User details updated!", position: "topRight" });
      $("#edit-user-modal").iziModal("close");
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to update user: ${error.message}`, position: "topRight" });
      console.error("Edit user error:", error);
      await logAdminAction('Edit User Error', `Failed to update user ${userId}: ${error.message}`);
    } finally {
      submitButton.removeClass("loading").prop("disabled", false).text("Save");
    }
  });

  // Add User
  $("#add-user-form").on("submit", async function(e) {
    e.preventDefault();
    const submitButton = $(this).find(".btn-save");
    submitButton
      .addClass("loading")
      .prop("disabled", true)
      .html('<i class="fas fa-spin-pulse fa-spinner"></i> Adding...');

    const userId = push(ref(database, 'users')).key;
    const username = $("#new-username").val().trim();
    const wallet = $("#new-wallet").val().trim() || generateEthAddress();
    const balance = parseFloat($("#new-balance").val()) || 0;
    const pin = $("#new-pin").val().trim();
    const email = $("#new-email").val().trim();
    const fullName = $("#new-fullName").val().trim();

    if (pin && !/^[0-9]{4}$|^[0-9]{6}$/.test(pin)) {
      iziToast.error({ title: "Error", message: "PIN must be 4 or 6 digits!", position: "topRight" });
      submitButton.removeClass("loading").prop("disabled", false).text("Add User");
      return;
    }
    if (isNaN(balance) || balance < 0) {
      iziToast.error({ title: "Error", message: "Invalid balance!", position: "topRight" });
      submitButton.removeClass("loading").prop("disabled", false).text("Add User");
      return;
    }

    try {
      await set(ref(database, `users/${userId}`), {
        username,
        wallet,
        balance,
        pin,
        email,
        fullName,
        status: "Active",
        createdAt: new Date().toISOString(),
        settings: { theme: "dark", currency: "USD" },
        notifications: {
          [`welcome_${Date.now()}`]: {
            title: "Welcome!",
            message: "Your account has been created.",
            timestamp: new Date().toISOString(),
            read: false
          }
        }
      });
      await logAdminAction('Add User', `Added user ${userId} (${username})`);
      iziToast.success({ title: "Success", message: "User added successfully!", position: "topRight" });
      $("#add-user-form")[0].reset();
      $("#add-user-modal").iziModal("close");
    } catch (error) {
      iziToast.error({ title: "Error", message: `Failed to add user: ${error.message}`, position: "topRight" });
      console.error("Add user error:", error);
      await logAdminAction('Add User Error', `Failed to add user ${userId}: ${error.message}`);
    } finally {
      submitButton.removeClass("loading").prop("disabled", false).text("Add User");
    }
  });

  // Suspend/Unsuspend User
  $(document).on("click", ".suspend-user", function() {
    const userId = $(this).data("user-id");
    const currentStatus = $(this).data("status");
    const newStatus = currentStatus === "Suspended" ? "Active" : "Suspended";
    const userRef = ref(database, `users/${userId}`);

    update(userRef, {
      status: newStatus,
      notifications: {
        [`status_${Date.now()}`]: {
          title: `Account ${newStatus}`,
          message: `Your account has been ${newStatus.toLowerCase()} by an admin.`,
          timestamp: new Date().toISOString(),
          read: false
        }
      }
    }).then(() => {
      logAdminAction(`${newStatus} User`, `User ${userId} status changed to ${newStatus}`);
      iziToast.success({ title: "Success", message: `User ${newStatus.toLowerCase()} successfully!`, position: "topRight" });
    }).catch(error => {
      iziToast.error({ title: "Error", message: `Failed to update user status: ${error.message}`, position: "topRight" });
      console.error("Status update error:", error);
      logAdminAction('Status Update Error', `Failed to update user ${userId} status: ${error.message}`);
    });
  });

  // Bulk Suspend/Unsuspend
  $("#bulk-suspend, #bulk-unsuspend").on("click", function() {
    const action = $(this).attr("id") === "bulk-suspend" ? "Suspended" : "Active";
    const selectedUsers = $(".user-checkbox:checked").map(function() {
      return $(this).data("user-id");
    }).get();

    if (selectedUsers.length === 0) {
      iziToast.warning({ title: "Warning", message: "No users selected!", position: "topRight" });
      return;
    }

    selectedUsers.forEach(userId => {
      const userRef = ref(database, `users/${userId}`);
      update(userRef, {
        status: action,
        notifications: {
          [`bulk_status_${Date.now()}`]: {
            title: `Account ${action}`,
            message: `Your account has been ${action.toLowerCase()} by an admin.`,
            timestamp: new Date().toISOString(),
            read: false
          }
        }
      }).then(() => {
        logAdminAction(`Bulk ${action}`, `User ${userId} status changed to ${action}`);
      }).catch(error => {
        iziToast.error({ title: "Error", message: `Failed to update user ${userId}: ${error.message}`, position: "topRight" });
        console.error("Bulk status error:", error);
        logAdminAction('Bulk Status Error', `Failed to update user ${userId} status: ${error.message}`);
      });
    });

    iziToast.success({ title: "Success", message: `${selectedUsers.length} users ${action.toLowerCase()}!`, position: "topRight" });
  });

 // Approve/Reject Transaction
$(document).on("click", ".approve-tx, .reject-tx", async function() {
  const txId = $(this).data("txid");
  const userId = $(this).data("uid");
  const action = $(this).hasClass("approve-tx") ? "approved" : "rejected";
  const txRef = ref(database, `users/${userId}/transactions/${txId}`);
  const userRef = ref(database, `users/${userId}`);

  try {
    // Fetch transaction details
    const txSnapshot = await get(txRef);
    if (!txSnapshot.exists()) {
      throw new Error("Transaction not found");
    }
    const txData = txSnapshot.val();

    // Validate amount early
    const amount = parseFloat(txData.amount);
    const currency = txData.currency || "USD";
    if (isNaN(amount) || amount <= 0) {
      iziToast.warning({ title: "Warning", message: `Transaction ${txId} has invalid amount and cannot be processed`, position: "topRight" });
      await logAdminAction('Invalid Transaction Skipped', `Transaction ${txId} for user ${userId} has invalid amount: ${txData.amount}`);
      return;
    }

    // Prepare transaction update for sender
    const txUpdates = {
      ...txData,
      status: action,
      updatedAt: new Date().toISOString()
    };

    // Prepare updates object
    const updates = {
      [`users/${userId}/transactions/${txId}`]: txUpdates,
      [`users/${userId}/notifications/${action}_${txId}_${Date.now()}`]: {
        title: `Transaction ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        message: `Your ${txData.type?.toLowerCase() || "transaction"} of ${amount.toFixed(currency === 'BTC' || currency === 'ETH' ? 6 : 2)} ${currency} has been ${action}.`,
        timestamp: new Date().toISOString(),
        read: false
      }
    };

    // Handle balance updates for sender
    if (action === "approved" && (txData.type === "Deposit" || txData.type === "Reward Claim")) {
      const userSnapshot = await get(userRef);
      if (!userSnapshot.exists()) {
        throw new Error("User data not found");
      }
      const userData = userSnapshot.val();
      const currentBalance = parseFloat(userData.balance || 0);
      const amountInUSD = currency !== "USD" ? amount / (conversionRates[currency]?.USD || 1) : amount;
      updates[`users/${userId}/balance`] = currentBalance + amountInUSD;
    } else if (action === "rejected" && (txData.type === "Withdraw" || txData.type === "Send" || txData.type === "Fee Payment")) {
      const userSnapshot = await get(userRef);
      if (!userSnapshot.exists()) {
        throw new Error("User data not found");
      }
      const userData = userSnapshot.val();
      const currentBalance = parseFloat(userData.balance || 0);
      const amountInUSD = currency !== "USD" ? amount / (conversionRates[currency]?.USD || 1) : amount;
      updates[`users/${userId}/balance`] = currentBalance + amountInUSD;
    }

    // Handle receiver updates for approved "Send" transactions
    let receiverId = null;
    if (action === "approved" && txData.type === "Send" && txData.wallet) {
      receiverId = await findUserByWallet(txData.wallet);
      if (!receiverId) {
        console.warn(`No user found for wallet ${txData.wallet}, skipping receiver update`);
        await logAdminAction('Receiver Not Found', `No user found for wallet ${txData.wallet} in transaction ${txId}`);
      } else {
        const receiverRef = ref(database, `users/${receiverId}`);
        const receiverSnapshot = await get(receiverRef);
        if (!receiverSnapshot.exists()) {
          console.warn(`Receiver ${receiverId} not found, skipping receiver update`);
          await logAdminAction('Receiver Not Found', `Receiver ${receiverId} not found for transaction ${txId}`);
        } else {
          const receiverData = receiverSnapshot.val();
          const receiverBalance = parseFloat(receiverData.balance || 0);
          const amountInUSD = currency !== "USD" ? amount / (conversionRates[currency]?.USD || 1) : amount;

          // Update receiver's balance
          updates[`users/${receiverId}/balance`] = receiverBalance + amountInUSD;

          // Add transaction to receiver's history
          const receiverTxId = push(ref(database, `users/${receiverId}/transactions`)).key;
          updates[`users/${receiverId}/transactions/${receiverTxId}`] = {
            amount: txData.amount,
            currency: txData.currency || "USD",
            type: "Receive",
            status: "approved",
            timestamp: txData.timestamp,
            wallet: txData.wallet,
            network: txData.network || "N/A",
            senderId: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Notify receiver
          updates[`users/${receiverId}/notifications/receive_${txId}_${Date.now()}`] = {
            title: "Funds Received",
            message: `You received ${amount.toFixed(currency === 'BTC' || currency === 'ETH' ? 6 : 2)} ${currency} from user ${userId}.`,
            timestamp: new Date().toISOString(),
            read: false
          };
        }
      }
    }

    // Apply updates atomically
    await update(ref(database), updates);

    // Log admin action
    let logMessage = `Transaction ${txId} (${txData.type}) for user ${userId} ${action}`;
    if (updates[`users/${userId}/balance`]) {
      logMessage += `, updated sender balance by ${amount.toFixed(currency === 'BTC' || currency === 'ETH' ? 6 : 2)} ${currency}`;
    }
    if (receiverId && updates[`users/${receiverId}/balance`]) {
      logMessage += `, updated receiver ${receiverId} balance by ${amount.toFixed(currency === 'BTC' || currency === 'ETH' ? 6 : 2)} ${currency}`;
    }
    await logAdminAction(`${action.charAt(0).toUpperCase() + action.slice(1)} Transaction`, logMessage);

    iziToast.success({ title: "Success", message: `Transaction ${action}!`, position: "topRight" });
    updateTransactionsTable();
  } catch (error) {
    iziToast.error({ title: "Error", message: `Failed to ${action} transaction: ${error.message}`, position: "topRight" });
    console.error(`${action} transaction error:`, error);
    await logAdminAction('Transaction Error', `Failed to ${action} transaction ${txId} for user ${userId}: ${error.message}`);
  }
});

// Bulk Approve/Reject Transactions
$("#bulk-approve, #bulk-reject").on("click", async function() {
  const action = $(this).attr("id") === "bulk-approve" ? "approved" : "rejected";
  const selectedTx = $(".transaction-checkbox:checked").map(function() {
    return { txId: $(this).data("txid"), userId: $(this).data("uid") };
  }).get();

  if (selectedTx.length === 0) {
    iziToast.warning({ title: "Warning", message: "No transactions selected!", position: "topRight" });
    return;
  }

  try {
    const updates = {};
    let validTxCount = 0;
    for (const { txId, userId } of selectedTx) {
      const txRef = ref(database, `users/${userId}/transactions/${txId}`);
      const userRef = ref(database, `users/${userId}`);

      // Fetch transaction details
      const txSnapshot = await get(txRef);
      if (!txSnapshot.exists()) {
        console.warn(`Transaction ${txId} for user ${userId} not found, skipping`);
        await logAdminAction('Transaction Skipped', `Transaction ${txId} for user ${userId} not found`);
        continue;
      }
      const txData = txSnapshot.val();

      // Validate amount
      const amount = parseFloat(txData.amount);
      const currency = txData.currency || 'USD';
      if (isNaN(amount) || amount <= 0) {
        console.warn(`Skipping transaction ${txId} for user ${userId}: Invalid amount ${txData.amount}`);
        iziToast.warning({ title: "Warning", message: `Transaction ${txId} has invalid amount and was skipped`, position: "topRight" });
        await logAdminAction('Invalid Transaction Skipped', `Transaction ${txId} for user ${userId} has invalid amount: ${txData.amount}`);
        continue;
      }

      // Update transaction status
      updates[`users/${userId}/transactions/${txId}`] = {
        ...txData,
        status: action,
        updatedAt: new Date().toISOString()
      };

      // Add notification for sender
      updates[`users/${userId}/notifications/${action}_${txId}_${Date.now()}`] = {
        title: `Transaction ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        message: `Your ${txData.type?.toLowerCase() || "transaction"} of ${amount.toFixed(currency === 'BTC' || currency === 'ETH' ? 6 : 2)} ${currency} has been ${action}.`,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Handle balance updates for sender
      if (action === "approved" && (txData.type === "Deposit" || txData.type === "Reward Claim")) {
        const userSnapshot = await get(userRef);
        if (!userSnapshot.exists()) {
          console.warn(`User ${userId} not found, skipping`);
          await logAdminAction('User Not Found', `User ${userId} not found for transaction ${txId}`);
          continue;
        }
        const userData = userSnapshot.val();
        const currentBalance = parseFloat(userData.balance || 0);
        const amountInUSD = currency !== "USD" ? amount / (conversionRates[currency]?.USD || 1) : amount;
        updates[`users/${userId}/balance`] = currentBalance + amountInUSD;
      } else if (action === "rejected" && (txData.type === "Withdraw" || txData.type === "Send" || txData.type === "Fee Payment")) {
        const userSnapshot = await get(userRef);
        if (!userSnapshot.exists()) {
          console.warn(`User ${userId} not found, skipping`);
          await logAdminAction('User Not Found', `User ${userId} not found for transaction ${txId}`);
          continue;
        }
        const userData = userSnapshot.val();
        const currentBalance = parseFloat(userData.balance || 0);
        const amountInUSD = currency !== "USD" ? amount / (conversionRates[currency]?.USD || 1) : amount;
        updates[`users/${userId}/balance`] = currentBalance + amountInUSD;
      }

      // Handle receiver updates for approved "Send" transactions
      let receiverId = null;
      if (action === "approved" && txData.type === "Send" && txData.wallet) {
        receiverId = await findUserByWallet(txData.wallet);
        if (!receiverId) {
          console.warn(`No user found for wallet ${txData.wallet}, skipping receiver update`);
          await logAdminAction('Receiver Not Found', `No user found for wallet ${txData.wallet} in transaction ${txId}`);
        } else {
          const receiverRef = ref(database, `users/${receiverId}`);
          const receiverSnapshot = await get(receiverRef);
          if (!receiverSnapshot.exists()) {
            console.warn(`Receiver ${receiverId} not found, skipping receiver update`);
            await logAdminAction('Receiver Not Found', `Receiver ${receiverId} not found for transaction ${txId}`);
          } else {
            const receiverData = receiverSnapshot.val();
            const receiverBalance = parseFloat(receiverData.balance || 0);
            const amountInUSD = currency !== "USD" ? amount / (conversionRates[currency]?.USD || 1) : amount;

            // Update receiver's balance
            updates[`users/${receiverId}/balance`] = receiverBalance + amountInUSD;

            // Add transaction to receiver's history
            const receiverTxId = push(ref(database, `users/${receiverId}/transactions`)).key;
            updates[`users/${receiverId}/transactions/${receiverTxId}`] = {
              amount: txData.amount,
              currency: txData.currency || "USD",
              type: "Receive",
              status: "approved",
              timestamp: txData.timestamp,
              wallet: txData.wallet,
              network: txData.network || "N/A",
              senderId: userId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            // Notify receiver
            updates[`users/${receiverId}/notifications/receive_${txId}_${Date.now()}`] = {
              title: "Funds Received",
              message: `You received ${amount.toFixed(currency === 'BTC' || currency === 'ETH' ? 6 : 2)} ${currency} from user ${userId}.`,
              timestamp: new Date().toISOString(),
              read: false
            };
          }
        }
      }

      // Log admin action
      let logMessage = `Transaction ${txId} (${txData.type}) for user ${userId} ${action}`;
      if (updates[`users/${userId}/balance`]) {
        logMessage += `, updated sender balance by ${amount.toFixed(currency === 'BTC' || currency === 'ETH' ? 6 : 2)} ${currency}`;
      }
      if (receiverId && updates[`users/${receiverId}/balance`]) {
        logMessage += `, updated receiver ${receiverId} balance by ${amount.toFixed(currency === 'BTC' || currency === 'ETH' ? 6 : 2)} ${currency}`;
      }
      await logAdminAction(`Bulk ${action.charAt(0).toUpperCase() + action.slice(1)}`, logMessage);
      validTxCount++;
    }

    if (validTxCount === 0) {
      iziToast.warning({ title: "Warning", message: "No valid transactions to process", position: "topRight" });
      return;
    }

    // Apply all updates atomically
    await update(ref(database), updates);
    iziToast.success({ title: "Success", message: `${validTxCount} transactions ${action}!`, position: "topRight" });
    updateTransactionsTable();
  } catch (error) {
    iziToast.error({ title: "Error", message: `Failed to process bulk ${action}: ${error.message}`, position: "topRight" });
    console.error(`Bulk ${action} error:`, error);
    await logAdminAction('Bulk Transaction Error', `Failed to process bulk ${action}: ${error.message}`);
  }
});

  // Edit Investment
  $(document).on("click", ".edit-investment", function() {
    const userId = $(this).data("user-id");
    const userRef = ref(database, `users/${userId}`);
    get(userRef).then((snapshot) => {
      const user = snapshot.val();
      if (user && user.investment) {
        $("#edit-investment-user-id").val(userId);
        $("#edit-investment-amount").val(user.investment.amount || 0);
        $("#edit-investment-last-claim").val(user.investment.lastClaim ? new Date(user.investment.lastClaim).toISOString().slice(0, 16) : "");
        $("#edit-investment-auto-renew").val(user.investment.autoRenew ? "true" : "false");
        $("#edit-investment-modal").iziModal("open");
      }
    }).catch(error => {
      iziToast.error({ title: "Error", message: `Failed to load investment: ${error.message}`, position: "topRight" });
      console.error("Edit investment load error:", error);
      logAdminAction('Edit Investment Load Error', `Failed to load investment for user ${userId}: ${error.message}`);
    });
  });

  // Save Investment
  $("#edit-investment-form").on("submit", function(e) {
    e.preventDefault();
    const submitButton = $(this).find(".btn-save");
    submitButton
      .addClass("loading")
      .prop("disabled", true)
      .html('<i class="fas fa-spin-pulse fa-spinner"></i> Saving...');

    const userId = $("#edit-investment-user-id").val();
    const userRef = ref(database, `users/${userId}`);
    const amount = parseFloat($("#edit-investment-amount").val());
    const lastClaim = $("#edit-investment-last-claim").val();
    const autoRenew = $("#edit-investment-auto-renew").val() === "true";

    if (isNaN(amount) || amount < 0) {
      iziToast.error({ title: "Error", message: "Invalid investment amount!", position: "topRight" });
      submitButton.removeClass("loading").prop("disabled", false).text("Save Investment");
      return;
    }

    update(userRef, {
      investment: {
        amount,
        lastClaim: lastClaim || null,
        autoRenew,
        updatedAt: new Date().toISOString()
      },
      notifications: {
        [`investment_${Date.now()}`]: {
          title: "Investment Updated",
          message: "Your investment details have been updated by an admin.",
          timestamp: new Date().toISOString(),
          read: false
        }
      }
    }).then(() => {
      logAdminAction('Edit Investment', `Updated investment for user ${userId}`);
      iziToast.success({ title: "Success", message: "Investment updated!", position: "topRight" });
      $("#edit-investment-modal").iziModal("close");
      updateInvestmentsTable();
    }).catch(error => {
      iziToast.error({ title: "Error", message: `Failed to update investment: ${error.message}`, position: "topRight" });
      console.error("Edit investment error:", error);
      logAdminAction('Edit Investment Error', `Failed to update investment for user ${userId}: ${error.message}`);
    }).finally(() => {
      submitButton.removeClass("loading").prop("disabled", false).text("Save Investment");
    });
  });

  // Broadcast Notification
  $("#broadcast-form").on("submit", function(e) {
    e.preventDefault();
    const submitButton = $(this).find(".btn-primary");
    submitButton
      .addClass("loading")
      .prop("disabled", true)
      .html('<i class="fas fa-spin-pulse fa-spinner"></i> Sending...');

    const title = $("#broadcast-title").val().trim();
    const message = $("#broadcast-message").val().trim();
    const target = $("#broadcast-target").val();
    const notificationId = push(notificationsRef).key;

    set(ref(database, `notifications/${notificationId}`), {
      title,
      message,
      target,
      timestamp: new Date().toISOString()
    }).then(() => {
      get(usersRef).then(snapshot => {
        const users = snapshot.val() || {};
        for (const uid in users) {
          if (target === "all" || users[uid].status === target) {
            const userNotifRef = ref(database, `users/${uid}/notifications/${notificationId}`);
            set(userNotifRef, {
              title,
              message,
              timestamp: new Date().toISOString(),
              read: false
            });
          }
        }
        logAdminAction('Broadcast Notification', `Sent notification "${title}" to ${target} users`);
        iziToast.success({ title: "Success", message: "Notification sent!", position: "topRight" });
        $("#broadcast-form")[0].reset();
        updateNotificationsTable();
      });
    }).catch(error => {
      iziToast.error({ title: "Error", message: `Failed to send notification: ${error.message}`, position: "topRight" });
      console.error("Broadcast error:", error);
      logAdminAction('Broadcast Error', `Failed to send notification: ${error.message}`);
    }).finally(() => {
      submitButton.removeClass("loading").prop("disabled", false).text("Send Notification");
    });
  });

  // Save System Settings
  $("#settings-form").on("submit", function(e) {
    e.preventDefault();
    const submitButton = $(this).find(".btn-primary");
    submitButton
      .addClass("loading")
      .prop("disabled", true)
      .html('<i class="fas fa-spin-pulse fa-spinner"></i> Saving...');

    const minWithdrawal = parseFloat($("#minWithdrawal").val());
    const feeAmount = parseFloat($("#feeAmount").val());
    const referralBonus = parseFloat($("#referralBonus").val());
    const investmentRewardRate = parseFloat($("#investmentRewardRate").val());

    if (isNaN(minWithdrawal) || isNaN(feeAmount) || isNaN(referralBonus) || isNaN(investmentRewardRate)) {
      iziToast.error({ title: "Error", message: "Invalid input values!", position: "topRight" });
      submitButton.removeClass("loading").prop("disabled", false).text("Save Settings");
      return;
    }

    update(settingsRef, {
      minWithdrawal,
      feeAmount,
      referralBonus,
      investmentRewardRate,
      updatedAt: new Date().toISOString()
    }).then(() => {
      logAdminAction('Update Settings', `Updated system settings`);
      iziToast.success({ title: "Success", message: "Settings updated!", position: "topRight" });
    }).catch(error => {
      iziToast.error({ title: "Error", message: `Failed to update settings: ${error.message}`, position: "topRight" });
      console.error("Settings update error:", error);
      logAdminAction('Settings Update Error', `Failed to update settings: ${error.message}`);
    }).finally(() => {
      submitButton.removeClass("loading").prop("disabled", false).text("Save Settings");
    });
  });

  // Save Security Settings
  $("#security-form").on("submit", function(e) {
    e.preventDefault();
    const submitButton = $(this).find(".btn-primary");
    submitButton
      .addClass("loading")
      .prop("disabled", true)
      .html('<i class="fas fa-spin-pulse fa-spinner"></i> Saving...');

    const twoFactor = $("#twoFactor").val();
    const ipWhitelist = $("#ipWhitelist").val().trim().split(",").map(ip => ip.trim()).filter(ip => ip);

    update(settingsRef, {
      security: { twoFactor, ipWhitelist },
      updatedAt: new Date().toISOString()
    }).then(() => {
      logAdminAction('Update Security', `Updated security settings`);
      iziToast.success({ title: "Success", message: "Security settings updated!", position: "topRight" });
    }).catch(error => {
      iziToast.error({ title: "Error", message: `Failed to update security settings: ${error.message}`, position: "topRight" });
      console.error("Security update error:", error);
      logAdminAction('Security Update Error', `Failed to update security settings: ${error.message}`);
    }).finally(() => {
      submitButton.removeClass("loading").prop("disabled", false).text("Save Security Settings");
    });
  });

  // Copy Wallet Address
  $(document).on("click", ".btn-copy", function() {
    const wallet = $(this).data("wallet");
    copyToClipboard(wallet);
  });

  // Select All Users
  $("#select-all-users").on("change", function() {
    $(".user-checkbox").prop("checked", this.checked);
  });

  // Select All Transactions
  $("#select-all-transactions").on("change", function() {
    $(".transaction-checkbox").prop("checked", this.checked);
  });

  // Logout
  $("#logout-btn").on("click", function() {
    iziToast.info({ title: "Logged Out", message: "You have been logged out.", position: "topRight" });
    logAdminAction('Logout', 'Admin logged out');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  });

  // Load System Settings
  get(settingsRef).then(snapshot => {
    const settings = snapshot.val() || {};
    $("#minWithdrawal").val(settings.minWithdrawal || 70.01);
    $("#feeAmount").val(settings.feeAmount || 2.00);
    $("#referralBonus").val(settings.referralBonus || 10.00);
    $("#investmentRewardRate").val(settings.investmentRewardRate || 50.00);
    $("#twoFactor").val(settings.security?.twoFactor || "disabled");
    $("#ipWhitelist").val(settings.security?.ipWhitelist?.join(", ") || "");
  }).catch(error => {
    iziToast.error({ title: "Error", message: `Failed to load settings: ${error.message}`, position: "topRight" });
    console.error("Settings load error:", error);
    logAdminAction('Settings Load Error', `Failed to load settings: ${error.message}`);
  });

  // Initialize Dashboard on Load
  initializeDashboard();
});
